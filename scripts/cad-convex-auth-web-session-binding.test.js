const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createUploadSessionVerifier } = require('../server/uploadSession');
const { createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { CONVEX_AUTHORITY_MODEL } = require('../server/convexUploadSessionStore');
const { UPLOAD_COOKIE, WEB_SESSION_LIFETIME_MS,
  createCadConvexAuthWebSessionBinding } = require('../server/cadConvexAuthWebSessionBinding');

const ORIGIN = 'https://app.reversr.test';
const hash = value => createHash('sha256').update(value).digest('hex');

function request({ duplicateCookie = false, duplicateOrigin = false, authorization = false } = {}) {
  const cookie = '__Host-convex-auth=synthetic-login-cookie';
  const headers = { cookie, origin: ORIGIN, ...(authorization ? { authorization: 'Bearer synthetic' } : {}) };
  const rawHeaders = ['Cookie', cookie, 'Origin', ORIGIN];
  if (duplicateCookie) rawHeaders.push('cookie', cookie);
  if (duplicateOrigin) rawHeaders.push('origin', ORIGIN);
  if (authorization) rawHeaders.push('Authorization', headers.authorization);
  return new Proxy({ headers, rawHeaders }, {
    get(target, key) {
      if (key === 'headers' || key === 'rawHeaders') return target[key];
      throw new Error('BODY_STREAM_QUERY_ACCESS_FORBIDDEN');
    },
  });
}

function setup(overrides = {}) {
  const state = {
    now: 1_000,
    login: { userId: 'user-a', loginSessionId: 'login-a', authMethod: 'passkey',
      active: true, expiresAt: 1_000 + WEB_SESSION_LIFETIME_MS + 5_000 },
    userEnabled: true,
    membershipActive: true,
    cadUploadAllowed: true,
    userGeneration: 1,
    membershipGeneration: 1,
    currentReads: 0,
    exactReads: 0,
    authorizationReads: 0,
  };
  const base = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const generations = new Map();
  const store = Object.freeze({
    authorityModel: CONVEX_AUTHORITY_MODEL,
    async insertIfAbsent(key, record, options) {
      const written = await base.insertIfAbsent(key, record, options);
      if (written) generations.set(key, Object.freeze({ user: state.userGeneration,
        membership: state.membershipGeneration }));
      return written;
    },
    async read(key, options) {
      const record = await base.read(key, options);
      const saved = generations.get(key);
      if (record && (!saved || saved.user !== state.userGeneration
        || saved.membership !== state.membershipGeneration)) return null;
      return record;
    },
    revoke: (...args) => base.revoke(...args),
  });
  const options = {
    enabled: true,
    request: request(),
    allowedOrigins: [ORIGIN],
    store,
    now: () => state.now,
    async readCurrentConvexAuthSession(headers, { signal }) {
      state.currentReads += 1;
      signal?.throwIfAborted();
      assert.equal(Object.isFrozen(headers), true);
      assert.deepEqual(headers, { cookie: '__Host-convex-auth=synthetic-login-cookie', origin: ORIGIN });
      return state.login;
    },
    async readConvexAuthSessionById(loginSessionId, { signal }) {
      state.exactReads += 1;
      signal?.throwIfAborted();
      return state.login?.loginSessionId === loginSessionId ? state.login : null;
    },
    async readCadAuthorization(identity, { signal }) {
      state.authorizationReads += 1;
      signal?.throwIfAborted();
      if (!state.login || identity.userId !== state.login.userId
        || identity.loginSessionId !== state.login.loginSessionId) return null;
      return { userId: identity.userId, loginSessionId: identity.loginSessionId,
        shopId: identity.shopId, userEnabled: state.userEnabled,
        membershipActive: state.membershipActive, cadUploadAllowed: state.cadUploadAllowed,
        userGeneration: state.userGeneration, membershipGeneration: state.membershipGeneration,
        expiresAt: state.login.expiresAt };
    },
    ...overrides,
  };
  const binding = createCadConvexAuthWebSessionBinding(options);
  return { state, store, options, binding };
}

function credentialFrom(setCookie) {
  const first = setCookie.split(';', 1)[0];
  assert.ok(first.startsWith(`${UPLOAD_COOKIE}=`));
  return first.slice(`${UPLOAD_COOKIE}=`.length);
}

function uploadRequest(credential, csrfToken, extraRaw = []) {
  const cookie = `${UPLOAD_COOKIE}=${credential}`;
  return { headers: { cookie, origin: ORIGIN, 'x-upload-csrf': csrfToken },
    rawHeaders: ['Cookie', cookie, 'Origin', ORIGIN, 'X-Upload-CSRF', csrfToken, ...extraRaw] };
}

test('default is inert, unrouted and does not inspect request or dependencies', async () => {
  const binding = createCadConvexAuthWebSessionBinding({
    request: { get headers() { throw new Error('REQUEST_READ'); } },
    store: new Proxy({}, { get() { throw new Error('STORE_READ'); } }),
  });
  assert.equal(binding.configured, false);
  assert.equal(binding.reviewConfigured, false);
  assert.equal(binding.issuanceRouted, false);
  assert.equal(binding.transport, 'cookie');
  assert.deepEqual(await binding.issueCookieSession({ shopId: 'shop-a' }), {
    ok: false, code: 'AUTH_UNAVAILABLE',
  });
});

test('web issue produces a fixed secure cookie and remains capped by login expiry', async () => {
  const f = setup();
  f.state.login.expiresAt = f.state.now + 120_000;
  const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
  assert.equal(issued.ok, true);
  assert.equal(issued.code, 'COOKIE_SESSION_PREPARED');
  assert.equal(issued.expiresAt, f.state.login.expiresAt);
  assert.match(issued.setCookie, /^__Host-reversr-upload-session=us1\.[A-Za-z0-9_-]{43}; Max-Age=120; Path=\/; Secure; HttpOnly; SameSite=Strict$/);
  assert.match(issued.csrfToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal('credential' in issued, false);
  assert.equal('sessionId' in issued, false);
  assert.equal(f.state.currentReads, 1);
  assert.equal(f.state.authorizationReads, 1);
  assert.deepEqual(await f.binding.issueCookieSession({ shopId: 'shop-a' }), {
    ok: false, code: 'ISSUE_ALREADY_ATTEMPTED',
  });
  assert.match(f.binding.clearCookieHeader,
    /^__Host-reversr-upload-session=; Max-Age=0; Path=\/; Secure; HttpOnly; SameSite=Strict$/);
});

test('cookie verification re-reads exact login and authorization with no positive cache', async () => {
  const f = setup();
  const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
  const credential = credentialFrom(issued.setCookie);
  const verify = createUploadSessionVerifier({ lookupSession: f.binding.lookupSession,
    allowedOrigins: [ORIGIN], now: () => f.state.now });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const verified = await verify(uploadRequest(credential, issued.csrfToken));
    assert.equal(verified.ok, true);
    assert.equal(verified.principal.userId, 'user-a');
    assert.equal(verified.principal.shopId, 'shop-a');
    assert.equal(verified.principal.transport, 'cookie');
  }
  assert.equal(f.state.exactReads, 2);
  assert.equal(f.state.authorizationReads, 3);
});

test('logout, deletion, expiry, disablement, membership and permission loss deny refresh', async () => {
  const changes = [
    state => { state.login = null; },
    state => { state.login.active = false; },
    state => { state.now = state.login.expiresAt; },
    state => { state.userEnabled = false; },
    state => { state.membershipActive = false; },
    state => { state.cadUploadAllowed = false; },
  ];
  for (const change of changes) {
    const f = setup();
    const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
    const credential = credentialFrom(issued.setCookie);
    assert.ok(await f.binding.lookupSession(hash(credential)));
    change(f.state);
    assert.equal(await f.binding.lookupSession(hash(credential)), null);
  }
});

test('user or membership generation changes invalidate across service instances', async () => {
  for (const field of ['userGeneration', 'membershipGeneration']) {
    const f = setup();
    const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
    const credential = credentialFrom(issued.setCookie);
    const other = createCadConvexAuthWebSessionBinding({ ...f.options, request: request() });
    assert.ok(await other.lookupSession(hash(credential)));
    f.state[field] += 1;
    assert.equal(await other.lookupSession(hash(credential)), null);
  }
});

test('explicit revocation is immediate across instances and cannot be revived', async () => {
  const f = setup();
  const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
  const credential = credentialFrom(issued.setCookie);
  const key = hash(credential);
  const other = createCadConvexAuthWebSessionBinding({ ...f.options, request: request() });
  assert.ok(await other.lookupSession(key));
  assert.deepEqual(await f.binding.revokeSession(key), { ok: true });
  assert.equal(await other.lookupSession(key), null);
  f.state.userGeneration += 1;
  assert.equal(await other.lookupSession(key), null);
});

test('cross-user, login and shop substitution fail closed', async () => {
  const variants = [
    { readCadAuthorization: async identity => ({ ...identity, shopId: 'other-shop', userEnabled: true,
      membershipActive: true, cadUploadAllowed: true, userGeneration: 1, membershipGeneration: 1,
      expiresAt: 10_000 }) },
    { readCadAuthorization: async identity => ({ ...identity, userId: 'other-user', shopId: identity.shopId,
      userEnabled: true, membershipActive: true, cadUploadAllowed: true, userGeneration: 1,
      membershipGeneration: 1, expiresAt: 10_000 }) },
    { readCurrentConvexAuthSession: async () => ({ userId: 'user-a', loginSessionId: 'login-b',
      authMethod: 'passkey', active: true, expiresAt: 10_000 }),
      readCadAuthorization: async identity => ({ ...identity, loginSessionId: 'login-a', shopId: identity.shopId,
        userEnabled: true, membershipActive: true, cadUploadAllowed: true, userGeneration: 1,
        membershipGeneration: 1, expiresAt: 10_000 }) },
  ];
  for (const override of variants) {
    const f = setup(override);
    assert.deepEqual(await f.binding.issueCookieSession({ shopId: 'shop-a' }), {
      ok: false, code: 'AUTH_UNAVAILABLE',
    });
  }
});

test('duplicate cookie/origin headers, bearer input and unapproved origins deny before reads', async () => {
  for (const badRequest of [request({ duplicateCookie: true }), request({ duplicateOrigin: true }),
    request({ authorization: true }), { headers: { cookie: 'a', origin: 'https://other.test' } }]) {
    let reads = 0;
    const f = setup({ request: badRequest, readCurrentConvexAuthSession: async () => { reads += 1; return null; } });
    assert.equal(f.binding.reviewConfigured, false);
    assert.deepEqual(await f.binding.issueCookieSession({ shopId: 'shop-a' }), {
      ok: false, code: 'AUTH_UNAVAILABLE',
    });
    assert.equal(reads, 0);
  }
});

test('upload cookie requires exact Origin, CSRF and unambiguous relevant headers', async () => {
  const f = setup();
  const issued = await f.binding.issueCookieSession({ shopId: 'shop-a' });
  const credential = credentialFrom(issued.setCookie);
  const verify = createUploadSessionVerifier({ lookupSession: f.binding.lookupSession,
    allowedOrigins: [ORIGIN], now: () => f.state.now });
  assert.equal((await verify(uploadRequest(credential, issued.csrfToken))).ok, true);
  assert.equal((await verify({ headers: { cookie: `${UPLOAD_COOKIE}=${credential}`,
    origin: 'https://other.test', 'x-upload-csrf': issued.csrfToken } })).code, 'ORIGIN_OR_CSRF_REJECTED');
  assert.equal((await verify({ headers: { cookie: `${UPLOAD_COOKIE}=${credential}`,
    origin: ORIGIN, 'x-upload-csrf': 'wrong' } })).code, 'ORIGIN_OR_CSRF_REJECTED');
  const duplicate = uploadRequest(credential, issued.csrfToken,
    ['Cookie', `${UPLOAD_COOKIE}=${credential}`]);
  assert.equal((await verify(duplicate)).code, 'SESSION_MALFORMED');
});

test('caller cancellation and bounded timeout stop issuance without persistence', async () => {
  let cancellationSignal;
  let markEntered;
  const entered = new Promise(resolve => { markEntered = resolve; });
  const cancelled = setup({ readCurrentConvexAuthSession: async (_headers, { signal }) => {
    cancellationSignal = signal;
    markEntered();
    return new Promise(() => {});
  } });
  const controller = new AbortController();
  const pending = cancelled.binding.issueCookieSession({ shopId: 'shop-a' }, { signal: controller.signal });
  await entered;
  controller.abort();
  assert.deepEqual(await pending, { ok: false, code: 'AUTH_UNAVAILABLE' });
  assert.equal(cancellationSignal.aborted, true);

  let timeoutSignal;
  const timed = setup({ readCurrentConvexAuthSession: async (_headers, { signal }) => {
    timeoutSignal = signal;
    return new Promise(() => {});
  } });
  assert.deepEqual(await timed.binding.issueCookieSession({ shopId: 'shop-a' }), {
    ok: false, code: 'AUTH_UNAVAILABLE',
  });
  assert.equal(timeoutSignal.aborted, true);
});

test('private dependency failures are sanitized and never logged', async () => {
  const calls = [];
  const original = { error: console.error, log: console.log, warn: console.warn };
  console.error = (...args) => calls.push(args);
  console.log = (...args) => calls.push(args);
  console.warn = (...args) => calls.push(args);
  try {
    const f = setup({ readCurrentConvexAuthSession: async () => {
      throw new Error('private-cookie-and-user-detail');
    } });
    assert.deepEqual(await f.binding.issueCookieSession({ shopId: 'shop-a' }), {
      ok: false, code: 'AUTH_UNAVAILABLE',
    });
    assert.equal(calls.length, 0);
  } finally {
    console.error = original.error;
    console.log = original.log;
    console.warn = original.warn;
  }
});

test('source remains unrouted and body admission remains closed', () => {
  const fs = require('node:fs');
  const index = fs.readFileSync(require.resolve('../server/index'), 'utf8');
  const router = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.doesNotMatch(index, /cadConvexAuthWebSessionBinding/);
  assert.doesNotMatch(router, /cadConvexAuthWebSessionBinding/);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(router, /BODY_ADMISSION_AUTHORIZED = true/);
});
