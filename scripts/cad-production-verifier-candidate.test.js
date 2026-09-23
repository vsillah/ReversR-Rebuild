const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createProductionVerifierCandidate: createCandidate } = require('../offline/cad-convex/productionVerifierCandidate');
const { INTERNAL_MARK_TEST_COHORT } = require('../server/cadExactSessionBridge');
const session = { userId: 'user-a', loginSessionId: 'login-a', authMethod: 'oidc', active: true, expiresAt: 5000 };
const grant = { ...session, shopId: 'shop-a', cadUploadAllowed: true, expiresAt: 4000 };
const context = { schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-a', shopId: 'shop-a' };
const exact = { userId: 'user-a', loginSessionId: 'login-a', authMethod: 'oidc', shopId: 'shop-a', sessionId: 'synthetic-upload-reference' };
const request = () => ({ headers: { authorization: 'Bearer synthetic-login' },
  get body() { throw Error('BODY_READ'); }, on() { throw Error('STREAM_READ'); },
  get user() { throw Error('PRINCIPAL_READ'); } });
const options = overrides => ({ reviewEnabled: true, request: request(), now: () => 1000,
  readAuthenticatedSession: async () => session, readAuthorization: async () => grant, ...overrides });
const denied = promise => assert.rejects(promise, /^Error: AUTH_UNAVAILABLE$/);
const turn = () => new Promise(resolve => setImmediate(resolve));

test('default and invalid budgets are inert and do not inspect request', async () => {
  for (const overrides of [{ reviewEnabled: false }, { budgetMs: 0 }, { budgetMs: 801 },
    { budgetMs: NaN }, { readAuthenticatedSession: undefined }]) {
    const candidate = createCandidate(options({ ...overrides, request: { get headers() { throw Error('READ'); } } }));
    assert.equal(candidate.configured, false);
    assert.equal(candidate.reviewConfigured, false);
    assert.equal(await candidate.resolveAuthorization(context), null);
  }
  assert.equal(await createCandidate().refreshAuthorization(exact), null);
});

test('synthetic grant stays inert, minimum expiry and request snapshot are preserved', async () => {
  const req = request();
  let signal;
  const candidate = createCandidate(options({ request: req, readAuthenticatedSession: async (headers, opts) => {
    assert.equal(headers.authorization, 'Bearer synthetic-login');
    assert.equal(opts.deadlineAt, 1800);
    signal = opts.signal;
    return session;
  } }));
  req.headers.authorization = 'Bearer changed';
  const result = await candidate.resolveAuthorization(context);
  assert.equal(result.expiresAt, 4000);
  assert.equal(result.userId, 'user-a');
  assert.equal(signal.aborted, true);
  assert.equal(candidate.configured, false);
  for (const key of ['productionVerifierAccepted', 'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized']) assert.equal(candidate[key], false);
  assert.deepEqual(Object.keys(result).sort(), ['userId', 'shopId', 'loginSessionId', 'authMethod', 'cadUploadAllowed', 'expiresAt'].sort());
});

test('resolve and refresh re-read lifecycle and membership; exact login cannot be replaced', async () => {
  let login = session, permission = grant, reads = 0;
  const candidate = createCandidate(options({ readAuthenticatedSession: async () => { reads++; return login; },
    readAuthorization: async () => permission }));
  await candidate.resolveAuthorization(context);
  await candidate.refreshAuthorization(exact);
  permission = { ...grant, cadUploadAllowed: false };
  assert.equal(await candidate.resolveAuthorization(context), null);
  assert.equal((await candidate.refreshAuthorization(exact)).cadUploadAllowed, false);
  permission = null;
  await denied(candidate.refreshAuthorization(exact));
  permission = grant;
  login = { ...session, loginSessionId: 'login-b' };
  await denied(candidate.refreshAuthorization(exact));
  login = null;
  await denied(candidate.resolveAuthorization(context));
  assert.equal(reads, 7);
});

test('both operations reject substituted identity, shop, expiry, caller claims and provider errors', async () => {
  for (const method of ['resolveAuthorization', 'refreshAuthorization']) {
    const input = method === 'resolveAuthorization' ? context : exact;
    for (const overrides of [
      ...['userId', 'loginSessionId', 'shopId', 'authMethod'].map(key => ({ readAuthorization: async () => ({ ...grant, [key]: 'other' }) })),
      { readAuthenticatedSession: async () => ({ ...session, active: false }) },
      { readAuthenticatedSession: async () => ({ ...session, expiresAt: 1000 }) },
      { readAuthorization: async () => { throw Error('private-provider-detail'); } },
    ]) await denied(createCandidate(options(overrides))[method](input));
    await denied(createCandidate(options())[method]({ ...input, principal: session }));
  }
});

test('ambiguous transport is closed before dependencies', async () => {
  for (const req of [{ headers: {} }, { headers: { authorization: 'Bearer synthetic', cookie: 'synthetic' } },
    { headers: { authorization: 'Bearer synthetic' }, rawHeaders: ['Authorization', 'Bearer synthetic', 'Authorization', 'Bearer synthetic'] }]) {
    let reads = 0;
    const candidate = createCandidate(options({ request: req, readAuthenticatedSession: async () => { reads++; return session; } }));
    assert.equal(await candidate.resolveAuthorization(context), null);
    assert.equal(reads, 0);
  }
});

test('abort before and between reads prevents further work', async () => {
  for (const preAbort of [true, false]) {
    const controller = new AbortController();
    let authReads = 0, grantReads = 0;
    if (preAbort) controller.abort();
    const candidate = createCandidate(options({ readAuthenticatedSession: async () => {
      authReads++; controller.abort(); return session;
    }, readAuthorization: async () => { grantReads++; return grant; } }));
    await denied(candidate.resolveAuthorization(context, { signal: controller.signal }));
    assert.equal(authReads, preAbort ? 0 : 1);
    assert.equal(grantReads, 0);
  }
});

test('hung readers time out on both paths; late results never start another read or grant', async () => {
  for (const method of ['resolveAuthorization', 'refreshAuthorization']) {
    for (const hungAt of ['session', 'authorization']) {
      let release, retainedSignal, authorizationReads = 0;
      const hung = (_, opts) => { retainedSignal = opts.signal; return new Promise(resolve => { release = resolve; }); };
      const candidate = createCandidate(options({ budgetMs: 20,
        readAuthenticatedSession: hungAt === 'session' ? hung : async () => session,
        readAuthorization: (...args) => { authorizationReads++; return hungAt === 'authorization' ? hung(...args) : grant; },
      }));
      await denied(candidate[method](method === 'resolveAuthorization' ? context : exact));
      assert.equal(retainedSignal.aborted, true);
      release(hungAt === 'session' ? session : grant);
      await turn();
      assert.equal(authorizationReads, hungAt === 'session' ? 0 : 1);
    }
  }
});

test('abort during a hung authorization read completes without waiting for dependency', async () => {
  const controller = new AbortController();
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const candidate = createCandidate(options({ readAuthorization: async () => { entered(); return new Promise(() => {}); } }));
  const pending = candidate.refreshAuthorization(exact, { signal: controller.signal });
  const rejection = denied(pending);
  await started;
  controller.abort();
  await rejection;
});

test('clock rollback, invalid time and exact deadline after async read are closed', async () => {
  for (const endTime of [999, NaN, 1800, 5000]) {
    let clock = 1000, grants = 0;
    const candidate = createCandidate(options({ now: () => clock,
      readAuthenticatedSession: async () => { clock = endTime; return session; },
      readAuthorization: async () => { grants++; return grant; } }));
    await denied(candidate.resolveAuthorization(context));
    assert.equal(grants, 0);
  }
});

test('concurrent request candidates preserve distinct same-user logins', async () => {
  const make = id => createCandidate(options({ request: { headers: { authorization: `Bearer synthetic-${id}` } },
    readAuthenticatedSession: async headers => { await turn(); return { ...session, loginSessionId: headers.authorization.endsWith('-a') ? 'login-a' : 'login-b' }; },
    readAuthorization: async identity => ({ ...grant, loginSessionId: identity.loginSessionId }) }));
  const [a, b] = await Promise.all([make('a').resolveAuthorization(context), make('b').resolveAuthorization(context)]);
  assert.equal(a.loginSessionId, 'login-a');
  assert.equal(b.loginSessionId, 'login-b');
  await denied(make('b').refreshAuthorization(exact));
});
