const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const net = require('node:net');
const tls = require('node:tls');
// Run only with a clean environment. Every non-loopback network attempt fails.
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const value = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof value !== 'object' || value.host !== '127.0.0.1') throw Error('Outbound socket forbidden');
  return connect.apply(this, args);
};
tls.connect = () => { throw Error('Outbound TLS forbidden'); };
const originalFetch = global.fetch;
let calls = [], server, base;
global.fetch = async (url, options) => {
  if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
  assert.equal(String(url), 'https://commercial-synthetic.convex.cloud/api/mutation');
  const token = new Headers(options.headers).get('authorization');
  const body = JSON.parse(options.body);
  calls.push({ token, path: body.path });
  // Deliberately overlap requests; use the actual SDK's serialized auth header.
  await new Promise(resolve => setTimeout(resolve, token === 'Bearer synthetic-a' ? 20 : 1));
  if (token === 'Bearer invalid' || body.path === 'accounts:authorizeWorkflow') {
    return Response.json({ status: 'error', errorMessage: token === 'Bearer invalid' ? 'LOGIN_REQUIRED' : 'WORKFLOW_POLICY_PENDING' });
  }
  const id = token === 'Bearer synthetic-a' ? 'a' : 'b';
  return Response.json({ status: 'success', value: { userId: id, shopId: `shop-${id}`, owner: true, name: id,
    email: 'same@synthetic.invalid', emailVerified: false, shopName: id, planId: 'free', subscriptionStatus: 'none',
    currentPeriodEnd: 0, hasStripeCustomer: false, usedCredits: 0, limit: 5, period: 'week', periodKey: 'week_synthetic',
    resetAt: 2000000000000, sessionExpiresAt: 2000000000000 } });
};
before(async () => {
  Object.assign(process.env, { COMMERCIAL_BACKEND: 'convex', COMMERCIAL_CONVEX_URL: 'https://commercial-synthetic.convex.cloud', COMMERCIAL_CONVEX_ISSUER: 'https://commercial-synthetic.convex.site' });
  const { registerCommercialRoutes, chargeCommercialCredits } = require('../server/commercialization');
  const app = express(); app.use(express.json()); registerCommercialRoutes(app);
  app.post('/test/charge', async (req, res) => { const result = await chargeCommercialCredits(req, res, 'analyze'); if (result.ok) res.json(result); });
  server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { global.fetch = originalFetch; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const request = async (token, route = '/api/me', body) => {
  const response = await fetch(`${base}${route}`, { method: body ? 'POST' : 'GET', headers: { authorization: token ? `Bearer ${token}` : '', 'content-type': 'application/json', 'x-reversr-client-id': 'spoofed' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
};
test('actual registered factory keeps concurrent SDK tokens isolated without injected identity', async () => {
  const [a, b] = await Promise.all([request('synthetic-a'), request('synthetic-b')]);
  assert.equal(a.body.profile.id, 'a'); assert.equal(b.body.profile.id, 'b');
  assert.notEqual(a.body.shop.id, b.body.shop.id);
  assert.deepEqual(calls.map(c => c.token).sort(), ['Bearer synthetic-a', 'Bearer synthetic-b']);
});
test('guest, invalid token, missing config and unknown selector deny without local fallback', async () => {
  assert.equal((await request(null)).status, 401);
  assert.equal((await request('invalid')).status, 401);
  const count = calls.length;
  process.env.COMMERCIAL_CONVEX_ISSUER = 'https://wrong.convex.site';
  assert.equal((await request('synthetic-a')).status, 503);
  process.env.COMMERCIAL_CONVEX_ISSUER = 'https://commercial-synthetic.convex.site';
  process.env.COMMERCIAL_BACKEND = 'unknown';
  assert.equal((await request('synthetic-a')).status, 503);
  process.env.COMMERCIAL_BACKEND = 'convex';
  assert.equal(calls.length, count);
});
test('workflow, admin, support and native paths remain explicitly unavailable', async () => {
  assert.equal((await request('synthetic-a', '/test/charge', {})).status, 503);
  for (const route of ['/api/support/issues', '/api/admin/commercial/credit-config', '/api/billing/google-play/subscription']) {
    assert.equal((await request('synthetic-a', route, {})).status, 503);
  }
});
