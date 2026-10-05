// Run via commercial-credit-gate-smoke.js: its child receives a clean environment.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const express = require('express');
const Stripe = require('stripe');
const net = require('node:net');
const tls = require('node:tls');

// No external sockets, even if a provider mock accidentally misses a method.
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = typeof first === 'object' ? first : { host: args[1] };
  const host = options.host || options.hostname;
  if (host !== '127.0.0.1') throw new Error('Outbound connection denied');
  return originalConnect.apply(this, args);
};
tls.connect = () => { throw new Error('Outbound TLS denied'); };

let directory, storeFile, server, base, commercial, provider;
let state = {}, calls = [], failRename = false, providerFailure = false;
const identities = new Map();
const realRename = fs.rename;
const readStore = async () => JSON.parse(await fs.readFile(storeFile, 'utf8'));
const writeStore = async store => fs.writeFile(storeFile, JSON.stringify(store));
const headers = (subject, extra = {}) => ({
  'content-type': 'application/json',
  ...(subject ? { authorization: `Bearer local-fixture-${subject}` } : {}),
  ...extra,
});
const request = async (url, subject, body, extra = {}) => {
  const response = await fetch(`${base}${url}`, {
    signal: AbortSignal.timeout(4000),
    method: body === undefined ? 'GET' : 'POST', headers: headers(subject, extra),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};
const account = async subject => (await request('/api/me', subject)).body;
const charge = (subject, key, body = { input: 'public-fixture' }, extra = {}) => request('/test/charge/analyze', subject, body, {
  ...(key ? { 'x-reversr-idempotency-key': key } : {}), ...extra,
});
const seedSubscription = async (subject, subscriptionId = `sub_${subject}`) => {
  const me = await account(subject);
  const store = await readStore();
  Object.assign(store.shops[me.shop.id], { stripeCustomerId: `cus_${subject}`, stripeSubscriptionId: subscriptionId });
  await writeStore(store);
  state[subscriptionId] = {
    id: subscriptionId, customer: `cus_${subject}`, status: 'active',
    items: { data: [{ price: { id: 'price_synthetic_pro' }, current_period_end: 2000000000 }] },
  };
  return me;
};
const webhook = async (id, type, object, { invalid = false, created = 1000 } = {}) => {
  const payload = JSON.stringify({ id, type, created, data: { object } });
  const signature = provider.webhooks.generateTestHeaderString({ payload, secret: 'whsec_synthetic_only' });
  const response = await fetch(`${base}/api/billing/webhook`, {
    signal: AbortSignal.timeout(4000),
    method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': invalid ? 'bad' : signature }, body: payload,
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'reversr-commercial-readiness-'));
  storeFile = path.join(directory, 'store.json');
  Object.assign(process.env, {
    NODE_ENV: 'test', COMMERCIAL_STORE_MODE: 'local', COMMERCIAL_STORE_FILE: storeFile,
    STRIPE_SECRET_KEY: 'sk_test_synthetic_only', STRIPE_WEBHOOK_SECRET: 'whsec_synthetic_only',
    STRIPE_PRICE_PRO_SHOP: 'price_synthetic_pro', STRIPE_PRICE_TEAM: 'price_synthetic_team',
    BILLING_RETURN_URL: 'https://local.invalid/account', COMMERCIAL_TESTER_PROFILE_NAMES: 'test3r',
    COMMERCIAL_TESTER_EMAILS: 'tester@synthetic.invalid',
  });
  provider = new Stripe('sk_test_synthetic_only', { apiVersion: '2026-02-25.clover' });
  provider.subscriptions.retrieve = async id => {
    calls.push(['retrieve', id]);
    if (providerFailure || !state[id]) throw new Error('Synthetic provider unavailable');
    return structuredClone(state[id]);
  };
  provider.customers.create = async (params, options) => {
    calls.push(['customer', params, options]); return { id: `cus_created_${params.metadata.reversrShopId}` };
  };
  provider.checkout.sessions.create = async (params, options) => { calls.push(['checkout', params, options]); return { id: 'cs_synthetic', url: 'https://local.invalid/checkout' }; };
  provider.billingPortal.sessions.create = async params => { calls.push(['portal', params]); return { url: 'https://local.invalid/portal' }; };
  const realLoad = Module._load;
  Module._load = function (name, ...args) {
    if (name === 'stripe') return function () { return provider; };
    return realLoad.call(this, name, ...args);
  };
  try { commercial = require('../server/commercialization'); } finally { Module._load = realLoad; }
  fs.rename = async (...args) => {
    if (failRename === true || (typeof failRename === 'function' && failRename(JSON.parse(await fs.readFile(args[0], 'utf8'))))) throw Object.assign(new Error('Synthetic disk full'), { code: 'ENOSPC' });
    return realRename(...args);
  };
  const app = express();
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), commercial.handleStripeWebhook);
  app.use(express.json());
  commercial.registerCommercialRoutes(app, {
    // In-memory synthetic token lookup, explicitly NOT a production auth adapter.
    resolveIdentity: async req => {
      const token = req.get('authorization') || '';
      const match = /^Bearer local-fixture-([a-z0-9-]+)$/.exec(token);
      return match ? identities.get(match[1]) || { issuer: 'local-fixture', subject: match[1], email: `${match[1]}@synthetic.invalid`, emailVerified: true } : null;
    },
    requireAdmin: (req, res) => { if (req.get('authorization') === 'Bearer fixture-admin') return true; res.status(401).json({ error: 'Admin required' }); return false; },
  });
  app.post('/test/charge/:feature', async (req, res) => {
    const result = await commercial.chargeCommercialCredits(req, res, req.params.feature);
    if (result.ok) res.json(result);
  });
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  fs.rename = realRename;
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test('paid account cannot be selected by client/email/name/body spoofing', async () => {
  const a = await seedSubscription('a');
  assert.equal((await webhook('evt_a', 'customer.subscription.updated', state.sub_a)).status, 200);
  assert.equal((await account('a')).billing.planId, 'pro_shop');
  for (const route of ['/api/me', '/api/usage', '/api/entitlements', '/api/commercial/profile']) {
    const response = await request(route, null, route.endsWith('/profile') ? { profile: { email: 'a@synthetic.invalid', clientId: a.profile.id } } : undefined, {
      'x-reversr-client-id': a.profile.id, 'x-reversr-profile-email': 'a@synthetic.invalid',
      'x-reversr-profile-name': 'test3r', 'x-reversr-shop-name': 'test3r',
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.billing?.planId || response.body.entitlements?.planId || 'free', 'free');
    assert.equal(response.body.usage?.unlimitedCredits || false, false);
  }
  const b = await request('/api/me', 'b', undefined, { 'x-reversr-client-id': a.profile.id, 'x-reversr-profile-email': 'a@synthetic.invalid' });
  assert.notEqual(b.body.shop.id, a.shop.id);
  assert.equal(b.body.billing.planId, 'free');
  assert.equal((await account('a')).profile.email, 'a@synthetic.invalid');
});

test('guest cannot claim tester access, invite lookup or billing through headers', async () => {
  const spoof = { 'x-reversr-profile-email': 'tester@synthetic.invalid', 'x-reversr-profile-name': 'test3r' };
  assert.equal((await request('/api/me', null, undefined, spoof)).body.billing.planId, 'free');
  for (const route of ['/api/commercial/tester-invites/lookup', '/api/commercial/tester-invites/redeem', '/api/commercial/access/activate', '/api/billing/checkout-session', '/api/billing/portal-session', '/api/billing/google-play/subscription']) {
    const count = calls.length;
    assert.equal((await request(route, null, { planId: 'pro_shop' }, spoof)).status, 401);
    assert.equal(calls.length, count);
  }
  assert.equal((await request('/api/me', 'name-only', undefined, { 'x-reversr-profile-name': 'test3r' })).body.billing.planId, 'free');
});

test('duplicate key charges once; cross-shop key charges independently without leaking events', async () => {
  const first = await charge('credit-a', 'same-key');
  const repeat = await charge('credit-a', 'same-key');
  const other = await charge('credit-b', 'same-key');
  assert.equal(first.status, 200);
  assert.equal(repeat.body.usage.usedCredits, 1);
  assert.equal(other.body.usage.usedCredits, 1);
  assert.notEqual(other.body.event.userId, first.body.event.userId);
  assert.notEqual(other.body.event.id, first.body.event.id);
  assert.equal((await charge('credit-a', 'same-key', { input: 'different' })).status, 409);
});

test('simultaneous duplicates charge once and absent keys represent separate operations', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => charge('duplicates', 'one')));
  assert.ok(results.every(r => r.status === 200 && r.body.usage.usedCredits === 1));
  await charge('duplicates');
  await charge('duplicates');
  assert.equal((await account('duplicates')).usage.usedCredits, 3);
});

test('concurrent debits with one credit left permit exactly one operation', async () => {
  for (let i = 0; i < 4; i++) assert.equal((await charge('exhaustion', `key-${i}`)).status, 200);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => charge('exhaustion', `last-${i}`)));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 402).length, 7);
  assert.equal((await account('exhaustion')).usage.usedCredits, 5);
});

test('period and feature scope do not reuse a previous debit', async () => {
  const first = await charge('period', 'reused');
  const store = await readStore();
  const event = store.usageEvents[first.body.event.id];
  event.periodKey = 'old-period';
  // Move the persisted event to the correctly scoped historical key.
  const crypto = require('node:crypto');
  const oldKey = crypto.createHash('sha256').update(JSON.stringify([event.shopId, event.feature, event.period, event.periodKey, 'standard', 'reused'])).digest('hex').slice(0, 24);
  delete store.usageEvents[event.id];
  store.usageEvents[oldKey] = { ...event, id: oldKey };
  await writeStore(store);
  assert.equal((await charge('period', 'reused')).body.usage.usedCredits, 1);
  // Use a temporary positive-cost fixture for the otherwise free feature.
  commercial.CREDIT_COSTS['technical-spec'] = 1;
  try {
    const spec = await request('/test/charge/technical-spec', 'period', { input: 'public-fixture' }, { 'x-reversr-idempotency-key': 'reused' });
    assert.equal(spec.body.usage.usedCredits, 2);
    assert.notEqual(spec.body.event.id, first.body.event.id);
  } finally { commercial.CREDIT_COSTS['technical-spec'] = 0; }
});

test('failed atomic write denies operation, preserves file and permits retry', async () => {
  await account('write-failure');
  const before = await fs.readFile(storeFile, 'utf8');
  failRename = true;
  try { assert.equal((await charge('write-failure', 'retry')).status, 503); }
  finally { failRename = false; }
  assert.equal(await fs.readFile(storeFile, 'utf8'), before);
  assert.equal((await charge('write-failure', 'retry')).body.usage.usedCredits, 1);
  assert.ok(!(await fs.readdir(directory)).some(name => name.endsWith('.tmp')));
});

test('corrupt store and competing process lock fail closed without resetting credits', async () => {
  const before = await fs.readFile(storeFile, 'utf8');
  await fs.writeFile(storeFile, '{corrupt');
  assert.equal((await charge('corrupt', 'one')).status, 503);
  assert.equal(await fs.readFile(storeFile, 'utf8'), '{corrupt');
  await fs.writeFile(storeFile, before);
  await fs.writeFile(`${storeFile}.lock`, 'synthetic competing process');
  assert.equal((await charge('locked', 'one')).status, 503);
  assert.equal(await fs.readFile(storeFile, 'utf8'), before);
  await fs.unlink(`${storeFile}.lock`);
});

test('invalid webhook signature performs no provider lookup or store mutation', async () => {
  const before = await fs.readFile(storeFile, 'utf8');
  const count = calls.length;
  assert.equal((await webhook('evt_invalid', 'customer.subscription.updated', state.sub_a, { invalid: true })).status, 400);
  assert.equal(calls.length, count);
  assert.equal(await fs.readFile(storeFile, 'utf8'), before);
});

test('duplicate webhook ID commits once and Clover reads item period end', async () => {
  const count = calls.length;
  assert.equal((await webhook('evt_a', 'customer.subscription.updated', { id: 'sub_a', status: 'canceled' })).status, 200);
  assert.equal(calls.length, count);
  const me = await account('a');
  assert.equal(me.billing.currentPeriodEnd, new Date(2000000000 * 1000).toISOString());
  assert.equal(me.billing.planId, 'pro_shop');
});

test('out-of-order and same-second snapshots reconcile current provider status', async () => {
  state.sub_a.status = 'canceled';
  assert.equal((await webhook('evt_cancel', 'customer.subscription.deleted', state.sub_a, { created: 1000 })).status, 200);
  assert.equal((await account('a')).billing.planId, 'free');
  assert.equal((await webhook('evt_late_active', 'customer.subscription.updated', { ...state.sub_a, status: 'active' }, { created: 999 })).status, 200);
  assert.equal((await account('a')).billing.planId, 'free');
  assert.equal((await webhook('evt_same_second', 'customer.subscription.updated', { ...state.sub_a, status: 'active' }, { created: 1000 })).status, 200);
  assert.equal((await account('a')).billing.planId, 'free');
});

test('scheduled cancellation retains active access; payment failure revokes and payment recovery restores', async () => {
  await seedSubscription('lifecycle');
  state.sub_lifecycle.cancel_at_period_end = true;
  await webhook('evt_scheduled', 'customer.subscription.updated', state.sub_lifecycle);
  assert.equal((await account('lifecycle')).billing.planId, 'pro_shop');
  state.sub_lifecycle.status = 'past_due';
  const invoice = { id: 'in_synthetic', customer: 'cus_lifecycle', parent: { subscription_details: { subscription: 'sub_lifecycle' } } };
  assert.equal((await webhook('evt_failure', 'invoice.payment_failed', invoice)).status, 200);
  assert.equal((await account('lifecycle')).billing.planId, 'free');
  state.sub_lifecycle.status = 'active';
  assert.equal((await webhook('evt_recovery', 'invoice.paid', invoice)).status, 200);
  assert.equal((await account('lifecycle')).billing.planId, 'pro_shop');
  // A late failure notification must not overwrite a recovered subscription.
  await webhook('evt_late_failure', 'invoice.payment_failed', invoice, { created: 1 });
  assert.equal((await account('lifecycle')).billing.planId, 'pro_shop');
});

test('webhook persistence/provider errors remain retryable with no processed receipt', async () => {
  state.sub_lifecycle.status = 'past_due';
  failRename = true;
  try { assert.equal((await webhook('evt_disk', 'customer.subscription.updated', state.sub_lifecycle)).status, 503); }
  finally { failRename = false; }
  assert.equal((await readStore()).stripeEvents.evt_disk, undefined);
  assert.equal((await account('lifecycle')).billing.planId, 'pro_shop');
  assert.equal((await webhook('evt_disk', 'customer.subscription.updated', state.sub_lifecycle)).status, 200);
  providerFailure = true;
  try { assert.equal((await webhook('evt_provider', 'customer.subscription.updated', state.sub_lifecycle)).status, 503); }
  finally { providerFailure = false; }
  assert.equal((await readStore()).stripeEvents.evt_provider, undefined);
});

test('unbound or mismatched subscription never grants another customer access', async () => {
  state.sub_stranger = { ...state.sub_a, id: 'sub_stranger', customer: 'cus_a', status: 'active' };
  assert.equal((await webhook('evt_stranger', 'customer.subscription.updated', state.sub_stranger)).status, 503);
  assert.equal((await account('a')).billing.planId, 'free');
  state.sub_unknown = { ...state.sub_a, id: 'sub_unknown', customer: 'cus_unknown' };
  assert.equal((await webhook('evt_unknown', 'customer.subscription.updated', state.sub_unknown)).status, 503);
});

test('checkout and portal use authenticated account and fixed return URLs', async () => {
  const me = await account('checkout');
  const response = await request('/api/billing/checkout-session', 'checkout', { planId: 'pro_shop', successUrl: 'https://evil.invalid', cancelUrl: 'https://evil.invalid' });
  assert.equal(response.status, 200);
  const checkout = calls.filter(c => c[0] === 'checkout').at(-1)[1];
  assert.equal(checkout.metadata.reversrUserId, me.profile.id);
  assert.equal(checkout.line_items[0].price, 'price_synthetic_pro');
  assert.equal(checkout.success_url, 'https://local.invalid/account?checkout=success');
  assert.equal(checkout.cancel_url, 'https://local.invalid/account?checkout=cancelled');
  assert.equal((await request('/api/billing/portal-session', 'checkout', { returnUrl: 'https://evil.invalid' })).status, 200);
  assert.equal(calls.filter(c => c[0] === 'portal').at(-1)[1].return_url, 'https://local.invalid/account');
  const count = calls.length;
  assert.equal((await request('/api/billing/portal-session', 'no-customer', {})).status, 409);
  assert.equal(calls.length, count);
  assert.equal((await request('/api/billing/checkout-session', 'lifecycle', { planId: 'pro_shop' })).status, 409);
});

test('missing price/webhook configuration and Google Play ownership path deny before provider activity', async () => {
  const count = calls.length;
  delete process.env.STRIPE_PRICE_PRO_SHOP;
  try { assert.equal((await request('/api/billing/checkout-session', 'config', { planId: 'pro_shop' })).status, 503); }
  finally { process.env.STRIPE_PRICE_PRO_SHOP = 'price_synthetic_pro'; }
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try { assert.equal((await webhook('evt_no_secret', 'customer.subscription.updated', state.sub_a)).status, 503); }
  finally { process.env.STRIPE_WEBHOOK_SECRET = 'whsec_synthetic_only'; }
  assert.equal((await request('/api/billing/google-play/subscription', 'config', { purchaseToken: 'synthetic', productId: 'synthetic' })).status, 503);
  assert.equal(calls.length, count);
});

test('production and absent local mode deny account, debit and billing', async () => {
  const count = calls.length;
  for (const mode of ['production', 'missing-mode']) {
    if (mode === 'production') process.env.NODE_ENV = 'production';
    else delete process.env.COMMERCIAL_STORE_MODE;
    try {
      assert.equal((await request('/api/me', 'a')).status, 503);
      assert.equal((await charge('a', 'denied')).status, 503);
      assert.equal((await request('/api/billing/checkout-session', 'a', { planId: 'pro_shop' })).status, 503);
    } finally { process.env.NODE_ENV = 'test'; process.env.COMMERCIAL_STORE_MODE = 'local'; }
  }
  assert.equal(calls.length, count);
});

test('new process reloads account, credits and webhook receipts from the local file', async () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'fixtures/commercial-restart-check.js'), storeFile], {
    encoding: 'utf8', env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NODE_ENV: 'test', COMMERCIAL_STORE_MODE: 'local', COMMERCIAL_STORE_FILE: storeFile },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /restart persistence passed/);
});


test('issuer/subject tuples and same-email accounts cannot alias; unverified email cannot grant tester', async () => {
  identities.set('alias-one', { issuer: 'issuer:a', subject: 'b', email: 'same@synthetic.invalid', emailVerified: true });
  identities.set('alias-two', { issuer: 'issuer', subject: 'a:b', email: 'same@synthetic.invalid', emailVerified: true });
  const one = await account('alias-one');
  const two = await account('alias-two');
  assert.notEqual(one.profile.id, two.profile.id);
  assert.notEqual(one.shop.id, two.shop.id);
  identities.set('unverified-mail', { issuer: 'local-fixture', subject: 'unverified', email: 'tester@synthetic.invalid' });
  assert.equal((await account('unverified-mail')).billing.planId, 'free');
});

test('hosted platform flags deny paid and zero-cost features despite explicit local config', async () => {
  for (const flag of ['VERCEL', 'VERCEL_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'K_SERVICE']) {
    process.env[flag] = 'synthetic-host';
    try {
      assert.equal((await request('/api/me', 'a')).status, 503);
      for (const feature of Object.keys(commercial.CREDIT_COSTS)) {
        assert.equal((await request(`/test/charge/${feature}`, 'a', {})).status, 503, `${flag}/${feature}`);
      }
      assert.equal((await webhook('evt_hosted', 'customer.subscription.updated', state.sub_a)).status, 503);
    } finally { delete process.env[flag]; }
  }
  delete process.env.COMMERCIAL_STORE_MODE;
  try {
    for (const feature of Object.keys(commercial.CREDIT_COSTS)) {
      assert.equal((await request(`/test/charge/${feature}`, 'a', {})).status, 503);
    }
  } finally { process.env.COMMERCIAL_STORE_MODE = 'local'; }
  assert.equal((await request('/test/charge/generate-bom', null, {})).body.credits, 0);
});

test('failure on final debit commit grants no work and retry consumes one credit', async () => {
  const me = await account('final-write');
  failRename = store => Object.values(store.usageEvents).some(event => event.userId === me.profile.id);
  try { assert.equal((await charge('final-write', 'one')).status, 503); }
  finally { failRename = false; }
  assert.equal((await account('final-write')).usage.usedCredits, 0);
  assert.equal((await charge('final-write', 'one')).body.usage.usedCredits, 1);
});

test('fully canceled account re-subscribes only through its saved checkout intent', async () => {
  const me = await seedSubscription('resubscribe');
  state.sub_resubscribe.status = 'canceled';
  await webhook('evt_resub_cancel', 'customer.subscription.deleted', state.sub_resubscribe);
  assert.equal((await account('resubscribe')).billing.planId, 'free');
  assert.equal((await request('/api/billing/checkout-session', 'resubscribe', { planId: 'team' })).status, 200);
  const checkout = calls.filter(c => c[0] === 'checkout').at(-1);
  await request('/api/billing/checkout-session', 'resubscribe', { planId: 'team' });
  assert.equal(calls.filter(c => c[0] === 'checkout').at(-1)[2].idempotencyKey, checkout[2].idempotencyKey);
  assert.equal((await request('/api/billing/checkout-session', 'resubscribe', { planId: 'pro_shop' })).status, 409);
  state.sub_replacement = {
    ...state.sub_resubscribe, id: 'sub_replacement', status: 'active',
    metadata: { ...checkout[1].subscription_data.metadata, reversrCheckoutIntent: 'wrong' },
    items: { data: [{ price: { id: 'price_synthetic_team' }, current_period_end: 2000000000 }] },
  };
  assert.equal((await webhook('evt_bad_intent', 'customer.subscription.created', state.sub_replacement)).status, 503);
  assert.equal((await account('resubscribe')).billing.planId, 'free');
  state.sub_replacement.metadata = checkout[1].subscription_data.metadata;
  assert.equal(state.sub_replacement.metadata.reversrShopId, me.shop.id);
  assert.equal((await webhook('evt_good_intent', 'checkout.session.completed', { subscription: 'sub_replacement' })).status, 200);
  assert.equal((await account('resubscribe')).billing.planId, 'team');
  await webhook('evt_old_cancel', 'customer.subscription.deleted', state.sub_resubscribe);
  assert.equal((await account('resubscribe')).billing.planId, 'team');
});

test('verified local tester can activate and reset a password; forged guest cannot', async () => {
  const me = await account('password');
  const adminHeaders = { authorization: 'Bearer fixture-admin' };
  const grant = await request('/api/admin/commercial/access-grants', null, { clientId: me.profile.id, startingPassword: 'SyntheticStart123' }, adminHeaders);
  assert.equal(grant.status, 200);
  assert.equal((await request('/api/commercial/access/activate', 'password', { accessPassword: 'SyntheticStart123' })).body.account.access.requiresPasswordReset, true);
  assert.equal((await request('/test/charge/analyze', 'password', {}, { 'x-reversr-access-password': 'SyntheticStart123' })).status, 403);
  assert.equal((await request('/test/charge/generate-bom', 'password', {}, { 'x-reversr-access-password': 'SyntheticStart123' })).status, 403);
  const reset = await request('/api/commercial/access/reset-password', 'password', { currentPassword: 'SyntheticStart123', newPassword: 'SyntheticReset123' });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.account.access.requiresPasswordReset, false);
  assert.equal((await request('/api/commercial/access/activate', 'password', { accessPassword: 'SyntheticStart123' })).status, 401);
  assert.equal((await request('/api/commercial/access/activate', 'password', { accessPassword: 'SyntheticReset123' })).body.account.billing.planId, 'tester');
  assert.equal((await request('/test/charge/analyze', 'password', {}, { 'x-reversr-access-password': 'SyntheticReset123' })).body.usage.unlimitedCredits, true);
  assert.equal((await request('/api/commercial/access/activate', null, { accessPassword: 'SyntheticReset123' }, { 'x-reversr-client-id': me.profile.id })).status, 401);
});

test('verified invite lookup/redemption is account bound and guest recovery cannot disclose codes', async () => {
  const invite = await request('/api/admin/commercial/tester-invites', null, { email: 'invite@synthetic.invalid', platform: 'both' }, { authorization: 'Bearer fixture-admin' });
  assert.equal(invite.status, 200);
  const lookup = await request('/api/commercial/tester-invites/lookup', 'invite', { email: 'invite@synthetic.invalid' });
  assert.equal(lookup.status, 200);
  assert.equal((await request('/api/commercial/tester-invites/lookup', 'other', { email: 'invite@synthetic.invalid' })).status, 403);
  const redeem = await request('/api/commercial/tester-invites/redeem', 'invite', { token: invite.body.invite.activationCode });
  assert.equal(redeem.status, 200);
  assert.equal((await account('invite')).billing.planId, 'tester');
  assert.equal((await request('/api/commercial/tester-invites/redeem', 'other', { token: invite.body.invite.activationCode })).status, 409);
});

test('registered production-shaped app without resolver never trusts synthetic bearer or customer headers', async () => {
  const app = express();
  app.use(express.json());
  commercial.registerCommercialRoutes(app);
  const listener = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  try {
    const response = await fetch(`http://127.0.0.1:${listener.address().port}/api/billing/checkout-session`, {
      method: 'POST', headers: headers('a', { 'x-reversr-client-id': (await account('a')).profile.id }), body: JSON.stringify({ planId: 'pro_shop' }),
    });
    assert.equal(response.status, 401);
    const me = await fetch(`http://127.0.0.1:${listener.address().port}/api/me`, { headers: headers('a') }).then(r => r.json());
    assert.equal(me.billing.planId, 'free');
  } finally { listener.closeAllConnections(); await new Promise(resolve => listener.close(resolve)); }
});


test('file-outbox invite conceals code in API and persists only verified recipient access', async () => {
  process.env.TESTER_INVITE_EMAIL_FILE = path.join(directory, 'outbox.json');
  try {
    const invite = await request('/api/admin/commercial/tester-invites', null, { email: 'outbox@synthetic.invalid' }, { authorization: 'Bearer fixture-admin' });
    assert.equal(invite.status, 200);
    assert.equal(invite.body.invite.emailDelivery.provider, 'file');
    assert.equal(invite.body.invite.activationCode, '');
    const outbox = JSON.parse(await fs.readFile(process.env.TESTER_INVITE_EMAIL_FILE, 'utf8'));
    assert.equal(outbox.emails.length, 1);
    assert.equal(outbox.emails[0].to, 'outbox@synthetic.invalid');
    const lookup = await request('/api/commercial/tester-invites/lookup', 'outbox', { email: 'outbox@synthetic.invalid' });
    assert.equal(lookup.body.invite.activationCode, '');
    const redeem = await request('/api/commercial/tester-invites/redeem', 'outbox', { token: outbox.emails[0].activationCode });
    assert.equal(redeem.status, 200);
    assert.equal((await account('outbox')).billing.planId, 'tester');
    identities.set('outbox-other', { issuer: 'local-fixture', subject: 'outbox-other', email: 'outbox@synthetic.invalid', emailVerified: true });
    assert.equal((await account('outbox-other')).billing.planId, 'free');
    assert.equal((await request('/api/commercial/tester-invites/redeem', 'outbox-other', { token: outbox.emails[0].activationCode })).status, 409);
  } finally { delete process.env.TESTER_INVITE_EMAIL_FILE; }
});

test('expired unresolved checkout stops before Stripe idempotency retention could permit duplicate billing', async () => {
  const me = await account('stale-checkout');
  const store = await readStore();
  Object.assign(store.shops[me.shop.id], { pendingCheckoutIntent: 'synthetic-old', pendingCheckoutPlan: 'pro_shop', pendingCheckoutStartedAt: '2020-01-01T00:00:00.000Z' });
  await writeStore(store);
  const count = calls.length;
  assert.equal((await request('/api/billing/checkout-session', 'stale-checkout', { planId: 'pro_shop' })).status, 409);
  assert.equal(calls.length, count);
});


test('catalog prices, free limits and no-cost follow-on operations remain unchanged', async () => {
  const me = await account('catalog');
  assert.equal(me.usage.remainingCredits, 5);
  assert.equal(me.usage.period, 'week');
  assert.ok(Number.isFinite(Date.parse(me.usage.resetAt)));
  assert.equal(me.plans.find(plan => plan.id === 'pro_shop').priceMonthly, 49);
  assert.equal(me.plans.find(plan => plan.id === 'pro_shop').monthlyCredits, 100);
  assert.equal(me.plans.find(plan => plan.id === 'team').priceMonthly, 149);
  assert.equal(me.plans.find(plan => plan.id === 'team').monthlyCredits, 500);
  for (const [feature, cost] of Object.entries(commercial.CREDIT_COSTS)) {
    if (cost === 0) assert.equal((await request(`/test/charge/${feature}`, 'catalog', {})).body.credits, 0);
  }
  assert.equal((await account('catalog')).usage.usedCredits, 0);
});

test('verified super-admin password permits local invite administration and spoofed email does not', async () => {
  process.env.COMMERCIAL_SUPER_ADMIN_EMAILS = 'super-admin@synthetic.invalid';
  process.env.COMMERCIAL_SUPER_ADMIN_PASSWORD = 'SyntheticAdmin123';
  try {
    const auth = { 'x-reversr-access-password': 'SyntheticAdmin123' };
    assert.equal((await request('/api/admin/commercial/tester-invites', 'super-admin', { email: 'super-invite@synthetic.invalid' }, auth)).status, 200);
    assert.equal((await request('/api/admin/commercial/tester-invites', null, { email: 'blocked@synthetic.invalid' }, { ...auth, 'x-reversr-profile-email': 'super-admin@synthetic.invalid' })).status, 401);
  } finally { delete process.env.COMMERCIAL_SUPER_ADMIN_EMAILS; delete process.env.COMMERCIAL_SUPER_ADMIN_PASSWORD; }
});
