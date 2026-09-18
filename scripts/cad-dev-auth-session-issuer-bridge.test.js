const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const fs = require('node:fs');
const express = require('express');
const { createCadDevAuthSessionIssuerBridge: createBridge } = require('../server/cadDevAuthSessionIssuerBridge');
const { createCadDevAuthSessionIssuerRouter } = require('../server/cadDevAuthSessionIssuerRouter');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const { createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { createCadUploadSessionAdapter } = require('../utils/cadUserImportBridge');
const origin = 'https://synthetic.example.invalid';
const digest = value => createHash('sha256').update(value).digest('hex');
function request(headers = { origin, authorization: 'Bearer synthetic-login' }, method = 'POST', rawHeaders) {
  return new Proxy({ headers, method, rawHeaders }, { get(target, key) {
    if (['headers', 'method', 'rawHeaders'].includes(key)) return target[key];
    assert.fail(`Forbidden request/body access: ${String(key)}`);
  } });
}
function fixture(overrides = {}) {
  let clock = 1000, calls = 0;
  let grant = { userId: 'synthetic-user', shopId: 'synthetic-shop', loginSessionId: 'synthetic-login',
    authMethod: 'oidc', cadUploadAllowed: true, expiresAt: 91000 };
  const store = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const bridge = createBridge({ enabled: true, environment: 'development', origin, store, now: () => clock,
    resolveAuthorization: async context => {
      calls++;
      assert.ok(Object.isFrozen(context.headers));
      assert.deepEqual(Object.keys(context.headers).sort(), ['authorization', 'origin']);
      return context.headers.authorization === 'Bearer synthetic-login' ? grant : null;
    }, refreshAuthorization: async () => grant, ...overrides });
  return { bridge, store, change: value => { grant = value === null ? null : { ...grant, ...value }; },
    time: value => { clock = value; }, get calls() { return calls; } };
}
function cookieRequest(result, extra = {}) {
  return request({ origin, cookie: result.headers['Set-Cookie'].split(';')[0],
    'x-upload-csrf': result.body.session.csrfToken, ...extra });
}
async function routeHarness(t, { issuerBridge, uploadOptions } = {}) {
  let bodyReads = 0;
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
  app.use('/api/cad', createCadDevAuthSessionIssuerRouter({ issuerBridge }));
  if (uploadOptions) app.use('/api/cad', createCadUserUploadRouter(uploadOptions));
  app.use((req, res) => { bodyReads++; res.sendStatus(500); });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); assert.equal(bodyReads, 0); });
  return async ({ route = 'dev-upload-session', method = 'POST', headers = {}, body = '{SENTINEL_BODY' } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/${route}`, {
      method, headers, ...(['POST', 'PUT', 'PATCH'].includes(method) ? { body } : {}),
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const text = await response.text();
    assert.doesNotMatch(text, /SENTINEL|us1\.|synthetic-user|synthetic-shop|synthetic-login|sessionId/);
    return { status: response.status, headers: response.headers, payload: text ? JSON.parse(text) : null };
  };
}
test('synthetic issuer roundtrip matches canonical browser contract with no body access', async () => {
  const f = fixture(); let response;
  const adapter = createCadUploadSessionAdapter({ now: () => 1000, issue: async () => {
    response = await f.bridge.issueSession(request()); return response.body;
  } });
  const browser = await adapter.connect();
  assert.equal(browser.code, 'SESSION_READY'); assert.equal(browser.canSubmit, false);
  assert.equal(response.statusCode, 200); assert.equal(browser.session.expiresAt, 61000);
  assert.match(response.headers['Set-Cookie'], /^__Host-reversr-upload-session=us1\.[\w-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=60$/);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(response.body), /us1\.|synthetic-user|synthetic-shop|synthetic-login|sessionId/);
  assert.equal((await f.bridge.verifySession(cookieRequest(response))).ok, true);
});
test('default, invalid, and non-development configuration cannot call adapters', async () => {
  for (const patch of [{ enabled: false }, { enabled: 'true' }, { environment: undefined }, { environment: 'production' },
    { origin: '*' }, { origin: 'http://localhost' }, { origin: origin + '/' }, { lifetimeMs: 0 }, { lifetimeMs: 900001 },
    { store: null }, { refreshAuthorization: null }, { resolveAuthorization: null }]) {
    const f = fixture(patch);
    assert.equal((await f.bridge.issueSession(request())).body.code, 'USER_AUTH_UNAVAILABLE');
    assert.equal((await f.bridge.verifySession(request())).code, 'AUTH_UNAVAILABLE');
    assert.equal(f.calls, 0);
  }
  assert.equal((await createBridge().issueSession(request())).statusCode, 503);
});
test('production process veto holds even with explicit development configuration', async () => {
  const { spawnSync } = require('node:child_process');
  for (const key of ['NODE_ENV', 'VERCEL_ENV']) {
    const child = spawnSync(process.execPath, ['-e', `
      const { createCadDevAuthSessionIssuerBridge: create } = require('./server/cadDevAuthSessionIssuerBridge');
      const die = () => { throw Error('adapter must never run'); };
      create({enabled:true, environment:'development', origin:'${origin}',
        store:{insertIfAbsent:die,read:die,revoke:die}, resolveAuthorization:die,refreshAuthorization:die})
        .issueSession({method:'POST'}).then(r => { if(r.body.code !== 'USER_AUTH_UNAVAILABLE') process.exit(1); });
    `], { cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, [key]: 'production' }, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
  }
});
test('sessionless, forged, malformed, cross-origin and method cases never read bodies', async () => {
  const f = fixture();
  for (const [req, expected] of [[request({ origin }), 'USER_SESSION_REQUIRED'],
    [request({ origin, 'x-reversr-profile-email': 'fake@example.invalid' }), 'USER_SESSION_REQUIRED'],
    [request({ origin, authorization: 'Bearer forged' }), 'USER_SESSION_REQUIRED'],
    [request({ origin, authorization: ['bad'] }), 'USER_SESSION_REQUIRED'],
    [request({ origin: 'https://other.invalid', authorization: 'Bearer synthetic-login' }), 'ORIGIN_OR_CSRF_REJECTED'],
    [request(undefined, 'GET'), 'METHOD_NOT_ALLOWED'],
    [request(undefined, 'POST', ['Authorization','a','authorization','b']), 'USER_SESSION_REQUIRED']]) {
    const result = await f.bridge.issueSession(req);
    assert.equal(result.body.code, expected); assert.equal(result.headers['Set-Cookie'], undefined);
  }
  assert.equal((await f.bridge.verifySession(request({}))).code, 'SESSION_MISSING');
  assert.equal((await f.bridge.verifySession(request({ authorization: 'Bearer malformed' }))).code, 'SESSION_MALFORMED');
});
test('authorization denial, malformed grants and provider failures cannot produce cookies', async () => {
  for (const patch of [null, { cadUploadAllowed: false }, { loginSessionId: '' }, { expiresAt: 1000 }, { authMethod: 'profile' }]) {
    const f = fixture(); f.change(patch);
    const result = await f.bridge.issueSession(request());
    assert.equal(result.statusCode, 401); assert.equal(result.headers['Set-Cookie'], undefined);
  }
  const f = fixture({ resolveAuthorization: () => { throw Error('PRIVATE_SENTINEL'); } });
  const result = await f.bridge.issueSession(request());
  assert.equal(result.body.code, 'USER_AUTH_UNAVAILABLE'); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
});
test('store revocation, login revocation, entitlement loss, expiry and CSRF are rechecked', async () => {
  for (const [change, expected] of [
    [async (f,r) => f.store.revoke(digest(r.headers['Set-Cookie'].split(';')[0].split('=')[1]), 1001), 'SESSION_REVOKED'],
    [async f => f.change(null), 'SESSION_INVALID'],
    [async f => f.change({ loginSessionId: 'different-login' }), 'SESSION_INVALID'],
    [async f => f.change({ cadUploadAllowed: false }), 'CAD_PERMISSION_REQUIRED'],
    [async f => f.time(61000), 'SESSION_EXPIRED'],
  ]) {
    const f = fixture(), result = await f.bridge.issueSession(request());
    await change(f, result);
    assert.equal((await f.bridge.verifySession(cookieRequest(result))).code, expected);
  }
  const f = fixture(), result = await f.bridge.issueSession(request());
  assert.equal((await f.bridge.verifySession(cookieRequest(result, { 'x-upload-csrf': undefined }))).code, 'ORIGIN_OR_CSRF_REJECTED');
});
test('issuance is bounded by login expiry and refresh must validate before publishing cookie', async () => {
  const f = fixture(); f.change({ expiresAt: 31000 });
  assert.equal((await f.bridge.issueSession(request())).body.session.expiresAt, 31000);
  const denied = fixture({ refreshAuthorization: async () => null });
  const result = await denied.bridge.issueSession(request());
  assert.equal(result.body.code, 'USER_SESSION_REQUIRED'); assert.equal(result.headers['Set-Cookie'], undefined);
});
test('issued cookie reaches the actual upload router but no admission/body/conversion path opens', async () => {
  const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
  const f = fixture({ now: Date.now }); f.change({ expiresAt: Date.now() + 60000 });
  const issued = await f.bridge.issueSession(request());
  assert.equal(issued.statusCode, 200);
  const router = createCadUserUploadRouter({ sessionService: f.bridge, allowedOrigins: [origin],
    enabled: true, executor: { convert() { assert.fail('conversion'); } } });
  const layer = router.stack.find(layer => layer.route?.path === '/user-import');
  const handler = layer.route.stack.at(-1).handle;
  for (const [req, expected] of [[cookieRequest(issued), 'USER_UPLOADS_DISABLED'], [request({}), 'USER_SESSION_REQUIRED']]) {
    let payload;
    await handler(req, { status() { return this; }, json(body) { payload = body; } });
    assert.equal(payload.code, expected);
  }
});
test('mounted issuer route stays closed without explicit development adapters and reads no body', async t => {
  const requestRoute = await routeHarness(t);
  const unavailable = await requestRoute({ headers: { origin, authorization: 'Bearer synthetic-login' } });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.payload.code, 'USER_AUTH_UNAVAILABLE');
  assert.equal(unavailable.headers.get('set-cookie'), null);
  const method = await requestRoute({ method: 'GET' });
  assert.equal(method.status, 503);
  assert.equal(method.payload.code, 'USER_AUTH_UNAVAILABLE');
});
test('configured development route issues a browser session while upload admission remains closed', async t => {
  const f = fixture({ now: Date.now }); f.change({ expiresAt: Date.now() + 60000 });
  const requestRoute = await routeHarness(t, { issuerBridge: f.bridge,
    uploadOptions: { sessionService: f.bridge, allowedOrigins: [origin] } });
  const method = await requestRoute({ method: 'GET' });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  assert.equal(method.payload.code, 'METHOD_NOT_ALLOWED');
  const issued = await requestRoute({ headers: { origin, authorization: 'Bearer synthetic-login' } });
  assert.equal(issued.status, 200);
  assert.match(issued.headers.get('set-cookie'), /^__Host-reversr-upload-session=us1\.[\w-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=\d+$/);
  assert.equal(issued.payload.status, 'success');
  assert.equal(issued.payload.session.transport, 'cookie');
  assert.equal(typeof issued.payload.session.csrfToken, 'string');
  const adapter = createCadUploadSessionAdapter({ issue: async () => issued.payload, now: Date.now });
  assert.equal((await adapter.connect()).code, 'SESSION_READY');
  const upload = await requestRoute({ route: 'user-import',
    headers: { origin, cookie: issued.headers.get('set-cookie').split(';')[0],
      'x-upload-csrf': issued.payload.session.csrfToken, 'content-type': 'application/json' } });
  assert.equal(upload.status, 503);
  assert.equal(upload.payload.code, 'USER_UPLOADS_DISABLED');
});
test('issuer mount remains isolated from executors, API routes and body admission activation', () => {
  assert.match(fs.readFileSync('server/index.js', 'utf8'), /createCadDevAuthSessionIssuerRouter/);
  for (const file of fs.readdirSync('api').filter(f => f.endsWith('.js')).map(f => `api/${f}`)) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cadDevAuthSessionIssuerBridge|cadDevAuthSessionIssuerRouter/);
  }
  const source = fs.readFileSync('server/cadDevAuthSessionIssuerBridge.js', 'utf8');
  assert.deepEqual([...source.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]), ['./uploadSessionStore', './uploadSession']);
  assert.doesNotMatch(source, /\bfetch\s*\(|https?\.request|child_process|\.convert\(/);
  const router = fs.readFileSync('server/cadDevAuthSessionIssuerRouter.js', 'utf8');
  assert.doesNotMatch(router, /validateRequestBody|cadSandbox|convert\(|express\.json|express\.raw/);
  const uploadRoute = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  assert.match(uploadRoute, /const BODY_ADMISSION_AUTHORIZED = false;/);
});
test('stalled authorization is cancelled and returns a sanitized unavailable response', async () => {
  let signal;
  const f = fixture({ resolveAuthorization: (_context, options) => {
    signal = options.signal; return new Promise(() => {});
  } });
  const result = await f.bridge.issueSession(request());
  assert.equal(result.body.code, 'USER_AUTH_UNAVAILABLE');
  assert.equal(result.headers['Set-Cookie'], undefined); assert.equal(signal.aborted, true);
});
test('malformed authoritative store state and invalid clocks fail closed', async () => {
  const f = fixture();
  const result = await f.bridge.issueSession(request());
  const key = digest(result.headers['Set-Cookie'].split(';')[0].split('=')[1]);
  const record = await f.store.read(key);
  const corrupt = fixture({ store: { ...f.store, read: async () => ({ ...record, loginSessionId: '' }) } });
  assert.equal((await corrupt.bridge.verifySession(cookieRequest(result))).code, 'AUTH_UNAVAILABLE');
  for (const now of [() => NaN, () => -1, () => { throw Error('PRIVATE_CLOCK'); }]) {
    const bad = fixture({ now });
    const issued = await bad.bridge.issueSession(request());
    assert.equal(issued.body.code, 'USER_AUTH_UNAVAILABLE');
    assert.equal(issued.headers['Set-Cookie'], undefined);
  }
});
test('subsecond remaining lifetime never reports success with an expired browser cookie', async () => {
  const f = fixture(); f.change({ expiresAt: 1999 });
  const result = await f.bridge.issueSession(request());
  assert.equal(result.body.code, 'USER_AUTH_UNAVAILABLE'); assert.equal(result.headers['Set-Cookie'], undefined);
});
