const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createCadProductionSessionVerifierBinding: createBinding } = require('../server/cadProductionSessionVerifierBinding');
const { createCadUploadSessionGatewayService, ENV_NAMES, INTERNAL_MARK_TEST_COHORT } = require('../server/cadUploadSessionGatewayService');
const session = Object.freeze({ userId: 'user-a', loginSessionId: 'login-a', authMethod: 'password', active: true, expiresAt: 5000 });
const grant = Object.freeze({ ...session, shopId: 'shop-a', cadUploadAllowed: true, expiresAt: 9000 });
const context = Object.freeze({ schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-a', shopId: 'shop-a' });
const binding = Object.freeze({ userId: session.userId, loginSessionId: session.loginSessionId, authMethod: session.authMethod, shopId: 'shop-a', sessionId: 'upload-a' });
const request = () => ({ headers: { authorization: 'Bearer synthetic-login' },
  get body() { throw new Error('BODY_READ'); }, get user() { throw new Error('PRINCIPAL_READ'); },
  on() { throw new Error('STREAM_READ'); } });
const options = extra => ({ reviewEnabled: true, request: request(), now: () => 1000,
  readAuthenticatedSession: async () => session, readAuthorization: async () => grant, ...extra });

test('default and missing dependencies are inert without inspecting the request', async () => {
  for (const opts of [{}, { reviewEnabled: true }, { readAuthenticatedSession: async () => session }]) {
    const result = createBinding({ ...opts, request: { get headers() { throw Error('READ'); } } });
    assert.equal(result.configured, false);
    assert.equal(result.reviewConfigured, false);
    assert.equal(await result.resolveAuthorization(context), null);
  }
});

test('request-local snapshot verifies identity separately and projects only matching authority', async () => {
  const req = request();
  const result = createBinding(options({ request: req,
    readAuthenticatedSession: async headers => {
      assert.deepEqual(headers, { authorization: 'Bearer synthetic-login' });
      assert.equal(Object.isFrozen(headers), true);
      return session;
    },
    readAuthorization: async identity => {
      assert.deepEqual(identity, { userId: 'user-a', loginSessionId: 'login-a', authMethod: 'password', shopId: 'shop-a', cohort: INTERNAL_MARK_TEST_COHORT });
      return { ...grant, privateSentinel: 'excluded' };
    } }));
  req.headers.authorization = 'Bearer substituted-login';
  assert.equal(result.reviewConfigured, true);
  assert.equal(result.productionVerifierAccepted, false);
  const projected = await result.resolveAuthorization(context);
  assert.deepEqual(projected, { userId: 'user-a', loginSessionId: 'login-a', authMethod: 'password', shopId: 'shop-a', cadUploadAllowed: true, expiresAt: 5000 });
  assert.equal(Object.isFrozen(projected), true);
});

test('ambiguous or missing credentials deny before verifier calls or body access', async () => {
  for (const req of [
    { headers: {} }, { headers: { authorization: ['Bearer a'] } },
    { headers: { authorization: 'Bearer a\r\n' } },
    { headers: { authorization: 'Bearer a', cookie: 'synthetic' } },
    { headers: { authorization: 'Bearer a' }, rawHeaders: ['Authorization', 'Bearer a', 'authorization', 'Bearer a'] },
    { headers: { authorization: 'Bearer a' }, rawHeaders: ['Authorization', 'Bearer b'] },
    { headers: { authorization: 'Bearer a' }, rawHeaders: [] },
  ]) {
    const result = createBinding(options({ request: req, readAuthenticatedSession: async () => { throw Error('CALLED'); } }));
    assert.equal(result.reviewConfigured, false);
    assert.equal(await result.resolveAuthorization(context), null);
  }
});

test('caller claims and unmapped login references cannot provide authority', async () => {
  const result = createBinding(options());
  for (const extra of [{ userId: 'user-a' }, { principal: session }, { body: {} }, { loginSessionRef: 'login-a' }]) {
    await assert.rejects(result.resolveAuthorization({ ...context, ...extra }), /^Error: AUTH_UNAVAILABLE$/);
  }
});

test('identity substitution, revoked sessions, stale grants and verifier failure are closed', async () => {
  for (const extra of [
    { readAuthenticatedSession: async () => null },
    { readAuthenticatedSession: async () => ({ ...session, active: false }) },
    { readAuthenticatedSession: async () => ({ ...session, expiresAt: 1000 }) },
    { readAuthorization: async () => null },
    ...['userId', 'loginSessionId', 'authMethod', 'shopId'].map(key => ({ readAuthorization: async () => ({ ...grant, [key]: 'other' }) })),
    { readAuthorization: async () => ({ ...grant, expiresAt: 1000 }) },
    { readAuthenticatedSession: async () => { throw Error('private-error'); } },
  ]) {
    await assert.rejects(createBinding(options(extra)).resolveAuthorization(context), /^Error: AUTH_UNAVAILABLE$/);
  }
  assert.equal(await createBinding(options({ readAuthorization: async () => ({ ...grant, cadUploadAllowed: false }) })).resolveAuthorization(context), null);
});

test('refresh re-verifies exact login and preserves current permission loss', async () => {
  let reads = 0;
  let current = session;
  const result = createBinding(options({ readAuthenticatedSession: async () => { reads++; return current; },
    readAuthorization: async () => ({ ...grant, cadUploadAllowed: false }) }));
  assert.equal((await result.refreshAuthorization(binding)).cadUploadAllowed, false);
  current = { ...session, loginSessionId: 'login-b' };
  await assert.rejects(result.refreshAuthorization(binding), /^Error: AUTH_UNAVAILABLE$/);
  assert.equal(reads, 2);
});

test('cancellation after authentication prevents authorization lookup', async () => {
  const controller = new AbortController();
  let calls = 0;
  const result = createBinding(options({ readAuthenticatedSession: async () => { controller.abort(); return session; },
    readAuthorization: async () => { calls++; return grant; } }));
  await assert.rejects(result.resolveAuthorization(context, { signal: controller.signal }), /^Error: AUTH_UNAVAILABLE$/);
  assert.equal(calls, 0);
});

test('review binding cannot enable gateway issuance even with complete synthetic runtime config', async () => {
  let calls = 0;
  const result = createCadUploadSessionGatewayService({
    env: { [ENV_NAMES.url]: 'https://convex.example.test/cad/upload-session-gateway',
      [ENV_NAMES.token]: 's'.repeat(48), [ENV_NAMES.audience]: INTERNAL_MARK_TEST_COHORT },
    exactSessionBridge: createBinding(options()), now: () => 1000,
    fetchImpl: async () => { calls++; throw Error('NETWORK_FORBIDDEN'); },
  });
  assert.equal(result.gateway.issuanceEnabled, false);
  assert.equal((await result.sessionService.issueSession(context)).ok, false);
  assert.equal(calls, 0);
});

test('expiry during authorization read, clock rollback, and late cancellation deny', async () => {
  for (const finalTime of [5000, 999, NaN]) {
    let clock = 1000;
    const result = createBinding(options({ now: () => clock, readAuthorization: async () => { clock = finalTime; return grant; } }));
    await assert.rejects(result.resolveAuthorization(context), /^Error: AUTH_UNAVAILABLE$/);
  }
  const controller = new AbortController();
  const result = createBinding(options({ readAuthorization: async () => { controller.abort(); return grant; } }));
  await assert.rejects(result.resolveAuthorization(context, { signal: controller.signal }), /^Error: AUTH_UNAVAILABLE$/);
});

test('separate request closures cannot substitute another authenticated login', async () => {
  const readAuthenticatedSession = async headers => headers.authorization === 'Bearer synthetic-login' ? session
    : { ...session, userId: 'user-b', loginSessionId: 'login-b' };
  const first = createBinding(options({ readAuthenticatedSession }));
  const second = createBinding(options({ request: { headers: { authorization: 'Bearer synthetic-other' } }, readAuthenticatedSession }));
  const [a, b] = await Promise.allSettled([first.resolveAuthorization(context), second.resolveAuthorization(context)]);
  assert.equal(a.status, 'fulfilled');
  assert.equal(a.value.userId, 'user-a');
  assert.equal(b.status, 'rejected');
  assert.equal(b.reason.message, 'AUTH_UNAVAILABLE');
});
