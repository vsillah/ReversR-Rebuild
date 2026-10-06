const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const express = require('express');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const { createSandboxRouter } = require('../server/cadSandboxRouter');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');

async function fixture(t, options = {}) {
  let conversions = 0, bodyReads = 0;
  const app = express();
  app.use((req, res, next) => {
    const on = req.on;
    req.on = function (event, ...args) {
      if (event === 'data' || event === 'readable') { bodyReads++; throw Error('SENTINEL_BODY'); }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', { get() { bodyReads++; throw Error('SENTINEL_BODY'); } });
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter(options));
  app.use('/api/cad', createSandboxRouter({ env: {
    CAD_IMPORT_EXECUTOR: 'sandbox', VERCEL: '1', CAD_SANDBOX_LIVE_QUALIFIED: 'true', CAD_SANDBOX_ACCESS_TOKEN: 't'.repeat(40),
  }, executor: { convert() { conversions++; throw Error('unexpected conversion'); } } }));
  app.use((req, res) => { bodyReads++; res.sendStatus(500); });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); assert.equal(conversions, 0); assert.equal(bodyReads, 0); });
  return async (headers = {}, method = 'POST', route = 'user-import') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/${route}`, {
      method, headers, ...(['POST', 'PUT', 'PATCH'].includes(method) ? { body: '{SENTINEL_BODY' } : {}),
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const text = await response.text();
    assert.doesNotMatch(text, /SENTINEL|us1\.|user-1|shop-1/);
    return { status: response.status, headers: response.headers, payload: text ? JSON.parse(text) : null };
  };
}
async function service() {
  let grant = { loginSessionId: 'login-test', userId: 'user-1', shopId: 'shop-1', authMethod: 'password', cadUploadAllowed: true, expiresAt: Date.now() + 60000 };
  const sessionService = createUploadSessionService({ store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async () => grant, refreshAuthorization: async () => grant });
  const issued = await sessionService.issueSession(null);
  assert.equal(issued.ok, true);
  return { sessionService, headers: { authorization: `Bearer ${issued.credential}` }, change: update => { grant = { ...grant, ...update }; } };
}
test('mounted default rejects missing/profile/operator credentials and unavailable store', async t => {
  const request = await fixture(t);
  for (const headers of [{}, { 'x-reversr-profile-email': 'SENTINEL', 'x-reversr-client-id': 'trusted' }, { authorization: `Bearer ${'t'.repeat(40)}` }]) {
    const result = await request(headers);
    assert.equal(result.status, 401); assert.equal(result.payload.code, 'USER_SESSION_REQUIRED');
  }
  const synthetic = await service();
  assert.equal((await request(synthetic.headers)).payload.code, 'USER_AUTH_UNAVAILABLE');
});
test('valid sessions stay disabled; current permission and identity binding remain authoritative', async t => {
  const synthetic = await service();
  const request = await fixture(t, { ...synthetic, enabled: true, bodyAdmissionAuthorized: true, executor: { convert() { throw Error('SENTINEL'); } } });
  const result = await request({ ...synthetic.headers, 'content-type': 'application/json', 'x-reversr-profile-email': 'SENTINEL' });
  assert.equal(result.status, 503); assert.equal(result.payload.code, 'USER_UPLOADS_DISABLED');
  assert.deepEqual(Object.keys(result.payload).sort(), ['code', 'message', 'schemaVersion', 'status']);
  synthetic.change({ shopId: 'other-shop' });
  assert.equal((await request(synthetic.headers)).payload.code, 'USER_SESSION_REQUIRED');
  synthetic.change({ shopId: 'shop-1', cadUploadAllowed: false });
  assert.equal((await request(synthetic.headers)).payload.code, 'USER_UPLOAD_FORBIDDEN');
});
test('methods, sanitized CORS errors and preflight never reach parsing', async t => {
  const request = await fixture(t, { corsOrigins: ['https://approved.example'] });
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD']) {
    const result = await request({}, method); assert.equal(result.status, 405);
    assert.equal(result.headers.get('allow'), 'POST, OPTIONS');
  }
  const denied = await request({ origin: 'https://SENTINEL.example' });
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const preflight = await request({ origin: 'https://approved.example', 'access-control-request-method': 'POST' }, 'OPTIONS');
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://approved.example');
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-Upload-CSRF/);
});
test('operator import remains operator-only with the user scaffold mounted', async t => {
  const synthetic = await service(); const request = await fixture(t, synthetic);
  for (const headers of [{}, synthetic.headers]) {
    const result = await request(headers, 'POST', 'import'); assert.equal(result.status, 401);
  }
  const result = await request({ authorization: `Bearer ${'t'.repeat(40)}` }, 'POST', 'import');
  assert.equal(result.status, 415);
});
test('cookie CSRF validation precedes the disabled response', async t => {
  const synthetic = await service();
  const issued = await synthetic.sessionService.issueSession(null, { transport: 'cookie' });
  const request = await fixture(t, { ...synthetic, allowedOrigins: ['https://approved.example'] });
  const headers = { cookie: `__Host-reversr-upload-session=${issued.credential}`, origin: 'https://approved.example' };
  assert.equal((await request(headers)).payload.code, 'ORIGIN_OR_CSRF_REJECTED');
  assert.equal((await request({ ...headers, 'x-upload-csrf': issued.csrf })).payload.code, 'USER_UPLOADS_DISABLED');
});

// Execute the actual commercial helpers with isolated synthetic JSON and env.
// Never import the live commercial module: it captures provider configuration.
async function commercialAccount({ env = {}, headers = {}, body = {}, grants = {}, identity = null, expectedStatus = 200 } = {}) {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const storePath = '/synthetic-commercial/store.json';
  // No disk writes: model the local lock and atomic-replacement contract in memory.
  const files = new Map([[storePath, JSON.stringify({ commercialAccessGrants: grants })]]);
  const missing = () => Object.assign(Error('Synthetic file missing'), { code: 'ENOENT' });
  const routes = new Map();
  const source = fs.readFileSync(path.join(__dirname, '../server/commercialization.js'), 'utf8');
  const context = { module: { exports: {} }, Buffer, structuredClone,
    process: { env: { NODE_ENV: 'test', COMMERCIAL_STORE_MODE: 'local', COMMERCIAL_STORE_FILE: storePath, ...env } },
    require(id) {
      if (id === 'fs/promises') return {
        async readFile(file) { if (!files.has(file)) throw missing(); return files.get(file); },
        async mkdir() {},
        async open(file, flags) {
          assert.equal(flags, 'wx');
          assert.ok(file === `${storePath}.lock` || (file.startsWith(`${storePath}.`) && file.endsWith('.tmp')));
          if (files.has(file)) throw Object.assign(Error('Synthetic file exists'), { code: 'EEXIST' });
          files.set(file, '');
          return { async writeFile(value) { files.set(file, value); }, async sync() {}, async close() {} };
        },
        async rename(from, to) {
          assert.equal(to, storePath);
          if (!files.has(from)) throw missing();
          files.set(to, files.get(from)); files.delete(from);
        },
        async unlink(file) { if (!files.delete(file)) throw missing(); },
        async rm(file) { files.delete(file); },
      };
      if (['os', 'path', 'crypto', 'async_hooks'].includes(id)) return require(`node:${id}`);
      throw Error(`Unexpected commercial dependency: ${id}`);
    },
  };
  // Stripe's constructor remains forbidden even if the source starts calling it.
  const safeRequire = context.require;
  context.require = id => id === 'stripe' ? class { constructor() { throw Error('Provider forbidden'); } } : safeRequire(id);
  vm.runInNewContext(source, context);
  const app = { locals: {} };
  for (const method of ['get', 'post', 'delete']) app[method] = (route, handler) => routes.set(`${method} ${route}`, handler);
  context.module.exports.registerCommercialRoutes(app, {
    // Reviewed synthetic principal, independent of every caller-controlled field.
    resolveIdentity: async () => identity,
  });
  let response, status = 200;
  await routes.get('get /api/me')({ app, get: key => headers[key], body }, {
    json(value) { response = JSON.parse(JSON.stringify(value)); },
    status(value) { status = value; return this; },
  });
  assert.equal(status, expectedStatus);
  assert.equal(files.has(`${storePath}.lock`), false, 'local transaction releases its lock');
  if (expectedStatus === 200) {
    assert.equal(response.status, 'ok');
    assert.ok(JSON.parse(files.get(storePath)).users[response.profile.id], 'actual helper persisted the isolated account');
  } else {
    assert.equal(response.status, 'error');
    assert.equal(JSON.parse(files.get(storePath)).users, undefined, 'denial does not create accounts');
  }
  return response;
}

test('real commercial accounts, tester grants and password grants never authorize upload issuance or admission', async t => {
  const { pbkdf2Sync, createHash } = require('node:crypto');
  const { uploadSessionService } = require('../server/uploadSessionStore');
  const profileHeaders = { 'x-reversr-client-id': 'synthetic-client',
    'x-reversr-profile-email': 'tester@example.invalid',
    'x-reversr-profile-name': 'Synthetic Tester', 'x-reversr-shop-name': 'Synthetic Shop' };
  const password = 'synthetic-password';
  const salt = 'synthetic-salt';
  const identity = { issuer: 'synthetic-reviewed-issuer', subject: 'synthetic-user',
    email: 'tester@example.invalid', emailVerified: true };
  const verifiedId = `user_${createHash('sha256').update(JSON.stringify([identity.issuer, identity.subject])).digest('hex').slice(0, 24)}`;
  const inviteGrants = { invite: { grantId: 'invite', clientId: verifiedId,
    active: true, createdByInviteId: 'synthetic-invite', mustResetPassword: false } };
  const passwordGrants = { password: { grantId: 'password', email: identity.email, active: true,
    mustResetPassword: false, passwordSalt: salt,
    passwordHash: pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex') } };
  const passwordHeaders = { ...profileHeaders, 'x-reversr-access-password': password };
  const testerEnv = { COMMERCIAL_TESTER_EMAILS: identity.email };
  const adminEnv = { COMMERCIAL_SUPER_ADMIN_EMAILS: identity.email, COMMERCIAL_SUPER_ADMIN_PASSWORD: password };
  const cases = [
    { label: 'guest headers', headers: profileHeaders },
    { label: 'guest body', body: { profile: { email: 'body@example.invalid', name: 'Body Profile', shopName: 'Body Shop' } } },
    { label: 'ordinary verified account', identity, headers: profileHeaders },
    { label: 'spoofed tester email', headers: profileHeaders, env: testerEnv },
    { label: 'spoofed tester name', identity, headers: profileHeaders, env: { COMMERCIAL_TESTER_PROFILE_NAMES: 'Synthetic Tester' } },
    { label: 'unverified tester email', identity: { ...identity, emailVerified: false }, headers: profileHeaders, env: testerEnv },
    { label: 'verified tester email', identity, headers: profileHeaders, env: testerEnv, role: 'tester' },
    { label: 'spoofed invite identity', headers: { ...profileHeaders, 'x-reversr-client-id': verifiedId }, grants: inviteGrants },
    { label: 'verified invite', identity, headers: profileHeaders, grants: inviteGrants, role: 'tester' },
    { label: 'spoofed password grant', headers: passwordHeaders, grants: passwordGrants },
    { label: 'verified password grant', identity, headers: passwordHeaders, grants: passwordGrants, role: 'tester' },
    { label: 'spoofed super-admin email', headers: passwordHeaders, env: adminEnv },
    { label: 'verified super-admin', identity, headers: passwordHeaders, env: adminEnv, role: 'super_admin' },
  ];
  const request = await fixture(t);
  const token = `us1.${Buffer.alloc(32, 7).toString('base64url')}`;
  for (const candidate of cases) {
    const account = await commercialAccount(candidate);
    assert.equal(account.access?.role || null, candidate.role || null, candidate.label);
    assert.equal(account.billing.planId, candidate.role ? 'tester' : 'free', candidate.label);
    assert.equal(account.profile.id.startsWith(candidate.identity ? 'user_' : 'guest_'), true, candidate.label);
    for (const claimed of [account, { ...account, userId: account.profile.id, shopId: account.shop.id,
      authMethod: 'password', cadUploadAllowed: true, verified: true, expiresAt: Date.now() + 60000 }]) {
      assert.deepEqual(await uploadSessionService.issueSession(claimed), { ok: false, code: 'AUTH_UNAVAILABLE' });
    }
    const absent = await request(candidate.headers || {});
    assert.equal(absent.status, 401);
    assert.equal(absent.payload.code, 'USER_SESSION_REQUIRED');
    const supplied = await request({ ...candidate.headers, authorization: `Bearer ${token}` });
    assert.equal(supplied.status, 503);
    assert.equal(supplied.payload.code, 'USER_AUTH_UNAVAILABLE');
  }
});


test('commercial VM honors default and hosted store denial before any account can affect CAD access', async () => {
  for (const env of [
    { COMMERCIAL_STORE_MODE: undefined },
    { COMMERCIAL_STORE_FILE: undefined },
    { NODE_ENV: 'production' },
    { VERCEL: '1' },
    { VERCEL_ENV: 'preview' },
  ]) {
    const response = await commercialAccount({ env, expectedStatus: 503 });
    const { uploadSessionService } = require('../server/uploadSessionStore');
    assert.deepEqual(await uploadSessionService.issueSession(response), { ok: false, code: 'AUTH_UNAVAILABLE' });
  }
});
