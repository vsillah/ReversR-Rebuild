const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { MAX_LIFETIME_MS, createUploadSessionService, createInMemoryUploadSessionStoreForTests,
  uploadSessionService } = require('../server/uploadSessionStore');
const { createUploadSessionVerifier, verifyUploadSession } = require('../server/uploadSession');
const hash = value => createHash('sha256').update(value).digest('hex');
const context = Object.freeze({ loginHandle: 'synthetic-server-handle' });
function setup(overrides = {}) {
  const state = { now: 1000, grant: { loginSessionId: 'login-test', userId: 'user-test', shopId: 'shop-test', authMethod: 'passkey',
    cadUploadAllowed: true, expiresAt: 1000 + MAX_LIFETIME_MS }, reads: 0, refreshes: 0 };
  const backing = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const store = { ...backing, read: async (...args) => { state.reads++; return backing.read(...args); } };
  const options = { store, now: () => state.now,
    resolveAuthorization: async supplied => supplied === context ? state.grant : null,
    refreshAuthorization: async () => { state.refreshes++; return state.grant; }, ...overrides };
  const service = createUploadSessionService(options);
  const verify = createUploadSessionVerifier({ lookupSession: service.lookupSession,
    allowedOrigins: ['https://app.test'], now: options.now });
  return { state, store, options, service, verify };
}
function request(credential, extra = {}) {
  return new Proxy({ headers: { authorization: `Bearer ${credential}`, ...extra } }, {
    get(target, key) {
      if (key === 'headers' || key === 'rawHeaders') return target[key];
      throw new Error('Body/stream/query access forbidden');
    },
  });
}
async function expectCode(result, code) { assert.deepEqual(await result, { ok: false, code }); }

test('issue and verify bind server identity; only credential digests reach persistence', async () => {
  const f = setup();
  const issued = await f.service.issueSession(context);
  assert.equal(issued.ok, true);
  assert.match(issued.credential, /^us1\.[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(issued.credential.slice(4), 'base64url').length, 32);
  const record = await f.store.read(hash(issued.credential));
  assert.equal(JSON.stringify(record).includes(issued.credential), false);
  assert.equal(record.userId, 'user-test');
  assert.equal(record.shopId, 'shop-test');
  assert.equal(record.authMethod, 'passkey');
  assert.equal(record.expiresAt - record.issuedAt, MAX_LIFETIME_MS);
  const verified = await f.verify(request(issued.credential));
  assert.equal(verified.ok, true);
  assert.equal(verified.principal.sessionId, issued.sessionId);
  record.status = 'revoked';
  assert.equal((await f.verify(request(issued.credential))).ok, true, 'reads are detached copies');
  const second = await f.service.issueSession(context);
  assert.notEqual(second.credential, issued.credential);
  assert.notEqual(second.sessionId, issued.sessionId);
  await expectCode(f.verify(request(`us1.${randomBytes(32).toString('base64url')}`)), 'SESSION_INVALID');
});

test('no profile, operator, body, or claimed principal bypass; defaults remain disabled', async () => {
  const f = setup();
  const forged = { headers: { 'x-reversr-client-id': 'user-test', 'x-reversr-profile-email': 'test@example.invalid',
    'x-reversr-profile-name': 'user-test', 'x-reversr-shop-name': 'shop-test',
    'x-reversr-access-password': 'synthetic', 'x-cad-sandbox-access-token': 'synthetic' },
    ...f.state.grant, verified: true };
  await expectCode(f.service.issueSession(forged), 'AUTHORIZATION_REQUIRED');
  assert.equal(f.state.reads, 0);
  await expectCode(f.verify(forged), 'SESSION_MISSING');
  await expectCode(uploadSessionService.issueSession(context), 'AUTH_UNAVAILABLE');
  await expectCode(uploadSessionService.revokeSession(hash('synthetic')), 'AUTH_UNAVAILABLE');
  await assert.rejects(uploadSessionService.lookupSession(hash('synthetic')), /^Error: AUTH_UNAVAILABLE$/);
  await expectCode(verifyUploadSession(request('synthetic')), 'AUTH_UNAVAILABLE');
  for (const options of [{}, { store: f.store }, { ...f.options, refreshAuthorization: null }]) {
    await expectCode(createUploadSessionService(options).issueSession(context), 'AUTH_UNAVAILABLE');
  }
  assert.throws(() => createInMemoryUploadSessionStoreForTests(), /TEST_STORE_OPT_IN_REQUIRED/);
});

test('lifetime is bounded and capped by login expiry; exact expiry denies', async () => {
  const f = setup();
  for (const lifetimeMs of [0, -1, 0.5, Infinity, MAX_LIFETIME_MS + 1]) {
    await expectCode(f.service.issueSession(context, { lifetimeMs }), 'ISSUE_INVALID');
  }
  await expectCode(f.service.issueSession(context, { transport: 'query' }), 'ISSUE_INVALID');
  f.state.grant.expiresAt = 1100;
  const issued = await f.service.issueSession(context);
  assert.equal(issued.expiresAt, 1100);
  f.state.now = 1100;
  await expectCode(f.verify(request(issued.credential)), 'SESSION_EXPIRED');
  await expectCode(f.service.issueSession(context), 'AUTHORIZATION_REQUIRED');
  f.state.now = NaN;
  await expectCode(f.service.issueSession(context), 'AUTH_UNAVAILABLE');
});

test('revocation is immediate across service instances sharing a store; no positive cache', async () => {
  const f = setup();
  const other = createUploadSessionService(f.options);
  const issued = await f.service.issueSession(context);
  assert.equal((await f.verify(request(issued.credential))).ok, true);
  assert.equal((await f.verify(request(issued.credential))).ok, true);
  assert.equal(f.state.reads, 2);
  assert.equal(f.state.refreshes, 2);
  assert.deepEqual(await other.revokeSession(hash(issued.credential)), { ok: true });
  assert.deepEqual(await other.revokeSession(hash(issued.credential)), { ok: true });
  await expectCode(f.verify(request(issued.credential)), 'SESSION_REVOKED');
  assert.equal(f.state.reads, 3);
  await expectCode(other.revokeSession(hash('unknown')), 'SESSION_INVALID');
  assert.equal(await other.lookupSession('invalid-digest'), null);
});

test('fresh permission, membership and login state deny without stale grants', async () => {
  for (const change of [grant => { grant.cadUploadAllowed = false; }, grant => { grant.shopId = 'other'; },
    grant => { grant.userId = 'other'; }, grant => { grant.authMethod = 'oidc'; },
    grant => { grant.expiresAt = 1000; }]) {
    const f = setup();
    const issued = await f.service.issueSession(context);
    assert.equal((await f.verify(request(issued.credential))).ok, true);
    change(f.state.grant);
    assert.equal((await f.verify(request(issued.credential))).ok, false);
  }
  const f = setup();
  f.state.grant.cadUploadAllowed = false;
  const issued = await f.service.issueSession(context);
  await expectCode(f.verify(request(issued.credential)), 'CAD_PERMISSION_REQUIRED');
  f.state.grant.cadUploadAllowed = true;
  await expectCode(f.verify(request(issued.credential)), 'CAD_PERMISSION_REQUIRED');
  f.state.grant = null;
  await expectCode(f.verify(request(issued.credential)), 'SESSION_INVALID');
});

test('cookie CSRF is independent, digest-only and transport-bound', async () => {
  const f = setup();
  const issued = await f.service.issueSession(context, { transport: 'cookie' });
  const record = await f.store.read(hash(issued.credential));
  assert.equal(record.csrfDigest, hash(issued.csrf));
  assert.notEqual(issued.csrf, issued.credential.slice(4));
  assert.equal(JSON.stringify(record).includes(issued.csrf), false);
  const headers = { cookie: `__Host-reversr-upload-session=${issued.credential}`,
    origin: 'https://app.test', 'x-upload-csrf': issued.csrf };
  assert.equal((await f.verify(request(issued.credential, { ...headers, authorization: undefined }))).ok, true);
  await expectCode(f.verify(request(issued.credential)), 'SESSION_INVALID');
  await expectCode(f.verify({ headers: { ...headers, 'x-upload-csrf': randomBytes(32).toString('base64url') } }), 'ORIGIN_OR_CSRF_REJECTED');
  await expectCode(f.verify({ headers: { ...headers, origin: 'https://other.test' } }), 'ORIGIN_OR_CSRF_REJECTED');
  const bearer = await f.service.issueSession(context);
  await expectCode(f.verify({ headers: { ...headers, cookie: `__Host-reversr-upload-session=${bearer.credential}` } }), 'SESSION_INVALID');
});

test('storage is insert-only, strips extras and honors cancellation', async () => {
  const f = setup();
  const issued = await f.service.issueSession(context);
  const key = hash(issued.credential);
  assert.equal(await f.store.insertIfAbsent(key, {}), false);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.service.lookupSession(key, { signal: controller.signal }), /AUTH_UNAVAILABLE/);
  await assert.rejects(f.store.revoke(key, 1000, { signal: controller.signal }));
  assert.equal((await f.verify(request(issued.credential))).ok, true);
  const record = await f.store.read(key);
  await f.store.insertIfAbsent(hash('extra-test'), { ...record, credential: issued.credential, nested: { secret: 'synthetic' } });
  assert.equal(JSON.stringify(await f.store.read(hash('extra-test'))).includes(issued.credential), false);
});

test('store/auth errors and malformed records fail closed without private diagnostics', async () => {
  const f = setup();
  const issued = await f.service.issueSession(context);
  for (const operation of ['insertIfAbsent', 'read', 'revoke']) {
    const service = createUploadSessionService({ ...f.options, store: { ...f.store,
      [operation]: async () => { throw new Error('synthetic-private-detail'); } } });
    if (operation === 'insertIfAbsent') await expectCode(service.issueSession(context), 'AUTH_UNAVAILABLE');
    if (operation === 'read') await assert.rejects(service.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/);
    if (operation === 'revoke') await expectCode(service.revokeSession(hash(issued.credential)), 'AUTH_UNAVAILABLE');
  }
  const badRefresh = createUploadSessionService({ ...f.options, refreshAuthorization: async () => ({}) });
  await assert.rejects(badRefresh.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/);
  const badRecord = createUploadSessionService({ ...f.options, store: { ...f.store, read: async () => ({}) } });
  await assert.rejects(badRecord.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/);
  const collision = createUploadSessionService({ ...f.options, store: { ...f.store, insertIfAbsent: async () => false } });
  await expectCode(collision.issueSession(context), 'AUTH_UNAVAILABLE');
});

test('stalled issuer and lookup are bounded and abort upstream work', async () => {
  let issueSignal, lookupSignal;
  const f = setup({ resolveAuthorization: async (_, { signal }) => { issueSignal = signal; return new Promise(() => {}); } });
  const g = setup({ refreshAuthorization: async (_, { signal }) => { lookupSignal = signal; return new Promise(() => {}); } });
  const issued = await g.service.issueSession(context);
  await Promise.all([
    expectCode(f.service.issueSession(context), 'AUTH_UNAVAILABLE'),
    assert.rejects(g.service.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/),
  ]);
  assert.equal(issueSignal.aborted, true);
  assert.equal(lookupSignal.aborted, true);
});

test('partial auth and local JSON-shaped storage cannot configure the service', async () => {
  const f = setup();
  let calls = 0;
  const forbidden = async () => { calls++; throw Error('SENTINEL_UNTRUSTED_DEPENDENCY'); };
  const auth = { resolveAuthorization: forbidden, refreshAuthorization: forbidden };
  for (const options of [
    { ...auth },
    { ...auth, store: { loadStore: forbidden, saveStore: forbidden } },
    { ...auth, store: { insertIfAbsent: forbidden, read: forbidden } },
    { store: f.store, resolveAuthorization: forbidden },
    { store: f.store, refreshAuthorization: forbidden },
  ]) {
    const service = createUploadSessionService(options);
    const opaque = new Proxy({}, { get() { throw Error('SENTINEL_CONTEXT_READ'); } });
    await expectCode(service.issueSession(opaque), 'AUTH_UNAVAILABLE');
    await expectCode(service.revokeSession(hash('synthetic')), 'AUTH_UNAVAILABLE');
    await assert.rejects(service.lookupSession(hash('synthetic')), /^Error: AUTH_UNAVAILABLE$/);
  }
  assert.equal(calls, 0, 'incomplete configuration must fail before calling any dependency');
});

test('login reference is required at issue and in stored records; legacy records fail closed', async () => {
  for (const loginSessionId of [undefined, '', {}, 'bad handle']) {
    const f = setup();
    f.state.grant.loginSessionId = loginSessionId;
    let writes = 0;
    const service = createUploadSessionService({ ...f.options, store: { ...f.store,
      insertIfAbsent: async () => { writes++; return true; } } });
    await expectCode(service.issueSession(context), 'AUTHORIZATION_REQUIRED');
    assert.equal(writes, 0);
  }
  const f = setup();
  const issued = await f.service.issueSession(context);
  const key = hash(issued.credential);
  const record = await f.store.read(key);
  assert.equal(record.schemaVersion, 2);
  assert.equal(record.loginSessionId, 'login-test');
  for (const invalid of [{ ...record, schemaVersion: 1 }, { ...record, loginSessionId: undefined }]) {
    const service = createUploadSessionService({ ...f.options, store: { ...f.store, read: async () => invalid } });
    await assert.rejects(service.lookupSession(key), /^Error: AUTH_UNAVAILABLE$/);
  }
  assert.equal('loginSessionId' in issued, false);
  assert.equal('loginSessionId' in await f.service.lookupSession(key), false);
  assert.equal('loginSessionId' in (await f.verify(request(issued.credential))).principal, false);
});

test('two logins for one user remain isolated; logout and replacement login cannot revive a session', async () => {
  const f = setup();
  const grants = new Map(['login-a', 'login-b'].map(loginSessionId =>
    [loginSessionId, { ...f.state.grant, loginSessionId }]));
  const bindings = [];
  const options = { ...f.options,
    resolveAuthorization: async handle => grants.get(handle) ?? null,
    refreshAuthorization: async binding => { bindings.push(binding); return grants.get(binding.loginSessionId) ?? null; } };
  const first = createUploadSessionService(options);
  const second = createUploadSessionService(options);
  const a = await first.issueSession('login-a');
  const b = await second.issueSession('login-b');
  assert.equal((await second.lookupSession(hash(a.credential))).userId, 'user-test');
  assert.deepEqual(Object.keys(bindings[0]).sort(), ['authMethod', 'loginSessionId', 'sessionId', 'shopId', 'userId']);
  assert.equal(Object.isFrozen(bindings[0]), true);
  assert.equal(bindings[0].loginSessionId, 'login-a');
  grants.delete('login-a');
  assert.equal(await second.lookupSession(hash(a.credential)), null);
  assert.equal((await first.lookupSession(hash(b.credential))).userId, 'user-test');
  const wrongLogin = createUploadSessionService({ ...options, refreshAuthorization: async () => grants.get('login-b') });
  assert.equal(await wrongLogin.lookupSession(hash(a.credential)), null);
  const missingLogin = createUploadSessionService({ ...options,
    refreshAuthorization: async () => ({ ...grants.get('login-b'), loginSessionId: undefined }) });
  await assert.rejects(missingLogin.lookupSession(hash(b.credential)), /^Error: AUTH_UNAVAILABLE$/);
});

test('acknowledgement contract rejects ambiguous writes and revoked digests cannot be reinserted', async () => {
  const f = setup();
  for (const response of [undefined, null, 1, 'true', { ok: true }]) {
    const service = createUploadSessionService({ ...f.options, store: { ...f.store,
      insertIfAbsent: async () => response, revoke: async () => response } });
    await expectCode(service.issueSession(context), 'AUTH_UNAVAILABLE');
    await expectCode(service.revokeSession(hash('synthetic')), 'AUTH_UNAVAILABLE');
  }
  const issued = await f.service.issueSession(context);
  const key = hash(issued.credential);
  const original = await f.store.read(key);
  await f.service.revokeSession(key);
  assert.equal(await f.store.insertIfAbsent(key, original), false);
  assert.equal((await f.store.read(key)).status, 'revoked');
});

test('cancellation before a delayed insert commits leaves no record or credential', async () => {
  const f = setup();
  let attemptedKey, savedSignal;
  const service = createUploadSessionService({ ...f.options, store: { ...f.store,
    insertIfAbsent: async (key, record, { signal }) => {
      attemptedKey = key; savedSignal = signal;
      await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
      return f.store.insertIfAbsent(key, record, { signal });
    } } });
  await expectCode(service.issueSession(context), 'AUTH_UNAVAILABLE');
  assert.equal(savedSignal.aborted, true);
  assert.equal(await f.store.read(attemptedKey), null);
});
