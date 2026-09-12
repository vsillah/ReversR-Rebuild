// Local transport tests only: these do not simulate or prove Convex transactions.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createConvexUploadSessionStore, OPERATION_BUDGET_MS } = require('../server/convexUploadSessionStore');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const key = 'a'.repeat(64);
const record = { schemaVersion: 2, userId: 'synthetic-user', shopId: 'synthetic-shop',
  sessionId: 'synthetic-upload', loginSessionId: 'synthetic-login', authMethod: 'oidc',
  cadUploadAllowed: true, transport: 'bearer', issuedAt: 1000, expiresAt: 9000, status: 'active' };
const hash = value => createHash('sha256').update(value).digest('hex');
const unavailable = /^Error: AUTH_UNAVAILABLE$/;

test('explicit injection only; incomplete configuration and raw credentials fail closed', async () => {
  await assert.rejects(createConvexUploadSessionStore().read(key), unavailable);
  let calls = 0;
  const store = createConvexUploadSessionStore({ call: async () => { calls++; return true; } });
  await assert.rejects(store.insertIfAbsent('us1.synthetic', record), unavailable);
  for (const patch of [{ schemaVersion: 1 }, { loginSessionId: '' }, { expiresAt: Infinity },
    { expiresAt: 901001 }, { cadUploadAllowed: 1 }, { status: 'revoked' }, { transport: 'cookie' }]) {
    await assert.rejects(store.insertIfAbsent(key, { ...record, ...patch }), unavailable);
  }
  assert.equal(calls, 0);
});

test('digest-only whitelist, operation deadline, detached results and no positive cache', async () => {
  const calls = [];
  let saved;
  const store = createConvexUploadSessionStore({ now: () => 1000, call: async (op, args, options) => {
    calls.push({ op, args });
    assert.equal(options.signal.aborted, false);
    assert.equal(args.deadlineAt, 1000 + OPERATION_BUDGET_MS);
    if (op === 'insertIfAbsent') { saved = args.record; return true; }
    if (op === 'revoke') { saved = { ...saved, status: 'revoked' }; return true; }
    return { ...saved, credential: 'PRIVATE', _id: 'metadata' };
  } });
  assert.equal(await store.insertIfAbsent(key, { ...record, credential: 'PRIVATE', providerToken: 'PRIVATE' }), true);
  assert.deepEqual(saved, record);
  const first = await store.read(key);
  assert.deepEqual(first, record);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(await store.revoke(key, 1000), true);
  assert.equal((await store.read(key)).status, 'revoked');
  assert.deepEqual(calls.map(c => c.op), ['insertIfAbsent', 'read', 'revoke', 'read']);
  assert.equal(JSON.stringify(calls).includes('PRIVATE'), false);
});

test('strict acknowledgements, explicit missing result and sanitized transport failures', async () => {
  for (const result of [undefined, 1, { ok: true }, 'true']) {
    const store = createConvexUploadSessionStore({ call: async () => result });
    await assert.rejects(store.insertIfAbsent(key, record), unavailable);
    await assert.rejects(store.revoke(key, 1000), unavailable);
    await assert.rejects(store.read(key), unavailable);
  }
  const absent = createConvexUploadSessionStore({ call: async op => op === 'read' ? null : false });
  assert.equal(await absent.read(key), null);
  assert.equal(await absent.insertIfAbsent(key, record), false);
  assert.equal(await absent.revoke(key, 1000), false);
  await assert.rejects(createConvexUploadSessionStore({ call: async () => { throw new Error('PRIVATE'); } }).read(key), unavailable);
});

test('abort before call and while pending; late commit yields no acknowledgement or retry', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  const pre = createConvexUploadSessionStore({ call: async () => { calls++; return true; } });
  await assert.rejects(pre.read(key, { signal: controller.signal }), unavailable);
  assert.equal(calls, 0);
  const pending = new AbortController();
  let finish;
  const store = createConvexUploadSessionStore({ call: async () => {
    calls++;
    pending.abort();
    return new Promise(resolve => { finish = resolve; });
  } });
  await assert.rejects(store.insertIfAbsent(key, record, { signal: pending.signal }), unavailable);
  finish(true);
  assert.equal(calls, 1);
});

test('800 ms budget stops waiting even when transport ignores signal', async () => {
  const store = createConvexUploadSessionStore({ call: () => new Promise(() => {}) });
  await assert.rejects(store.read(key), unavailable);
});

test('late acknowledgement and invalid/retrograde clock are denied', async () => {
  for (const later of [1800, 999, NaN]) {
    let clock = 1000;
    const store = createConvexUploadSessionStore({ now: () => clock, call: async () => { clock = later; return true; } });
    await assert.rejects(store.insertIfAbsent(key, record), unavailable);
  }
});

test('service integration preserves exact login binding and uncertain-commit denial', async () => {
  const memory = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  let loseAck = false;
  let attempts = 0;
  let lastKey;
  const store = createConvexUploadSessionStore({ now: () => 1000, call: async (op, args, options) => {
    if (op === 'read') return memory.read(args.credentialDigest, options);
    if (op === 'revoke') return memory.revoke(args.credentialDigest, args.revokedAt, options);
    attempts++;
    lastKey = args.credentialDigest;
    const result = await memory.insertIfAbsent(lastKey, args.record, options);
    if (loseAck) throw new Error('PRIVATE_COMMIT_ACK');
    return result;
  } });
  let login = record.loginSessionId;
  const grant = () => ({ ...record, loginSessionId: login });
  const service = createUploadSessionService({ store, now: () => 1000,
    resolveAuthorization: async () => grant(), refreshAuthorization: async () => grant() });
  const issued = await service.issueSession({});
  assert.equal(issued.ok, true);
  assert.equal((await service.lookupSession(hash(issued.credential))).cadUploadAllowed, true);
  login = 'different-login';
  assert.equal(await service.lookupSession(hash(issued.credential)), null);
  loseAck = true;
  assert.deepEqual(await service.issueSession({}), { ok: false, code: 'AUTH_UNAVAILABLE' });
  assert.equal(attempts, 2);
  assert.equal((await memory.read(lastKey)).status, 'active');
});
