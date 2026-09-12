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
  let grant = { userId: 'user-1', shopId: 'shop-1', authMethod: 'password', cadUploadAllowed: true, expiresAt: Date.now() + 60000 };
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
  const request = await fixture(t, synthetic);
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
