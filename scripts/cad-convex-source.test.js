const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/cad-convex-source-loader');
const { fixture, principal, record, key } = require('./helpers/cad-convex-fixture');
const { FUNCTIONS, createInternalDispatcher } = require('../offline/cad-convex/sessionAdapter');
const second = 'b'.repeat(64);
function sourceFixture(options = {}) {
  const f = fixture(options);
  const source = loadSource({ now: f.now, readExactLibrarySession: async (ctx, id) =>
    structuredClone(ctx.tables.library.find(row => row._id === id) ?? null) });
  const run = (op, args, binding = principal) => f.transaction(ctx => source.cad[op].invoke(ctx,
    { deadlineAt: f.now() + 800, ...args, ...(op === 'changeAuthority' ? {} : { principal: binding }) }));
  return { ...f, ...source, run, insert: (r = record, digest = key) => run('insertIfAbsent', { record: r, credentialDigest: digest }),
    read: () => run('read', { credentialDigest: key }),
    policy: args => run('changeAuthority', { userId: principal.userId, ...args }),
    refresh: () => run('refreshAuthorization', { binding: { ...principal, sessionId: record.sessionId } }) };
}
test('actual source registrations match fixed gateway mapping; policy stays internal-only', async () => {
  const f = sourceFixture();
  assert.deepEqual(Object.keys(f.cad).sort(), [...Object.keys(FUNCTIONS), 'changeAuthority'].sort());
  const references = {};
  for (const [op, mapping] of Object.entries(FUNCTIONS)) {
    assert.equal(mapping.name, `cad:${op}`); assert.equal(f.cad[op].kind, mapping.kind);
    references[op] = f.cad[op];
  }
  assert.equal(f.cad.changeAuthority.kind, 'mutation');
  const dispatch = createInternalDispatcher({ references,
    runQuery: (ref, args) => f.transaction(ctx => ref.invoke(ctx, args)),
    runMutation: (ref, args) => f.transaction(ctx => ref.invoke(ctx, args)) });
  assert.equal(await dispatch('insertIfAbsent', { record, credentialDigest: key, deadlineAt: 1800 }, principal), true);
  assert.deepEqual(await dispatch('read', { credentialDigest: key, deadlineAt: 1800 }, principal), record);
  await assert.rejects(dispatch('changeAuthority', { deadlineAt: 1800 }, principal), /AUTH_UNAVAILABLE/);
});
test('source schema preserves every bounded read index and library ID boundary', () => {
  const { schema } = loadSource();
  assert.deepEqual(Object.keys(schema).sort(), ['cadMemberships', 'cadUploadSessions', 'cadUserAuthority']);
  for (const [table, indexes] of Object.entries({ cadUserAuthority: { by_userId: ['userId'] },
    cadMemberships: { by_userId_and_shopId: ['userId', 'shopId'] },
    cadUploadSessions: { by_credentialDigest: ['credentialDigest'], by_sessionId: ['sessionId'], by_expiresAt: ['expiresAt'] } })) {
    assert.equal(JSON.stringify(schema[table].indexes), JSON.stringify(indexes));
    assert.equal(schema[table].fields.userId.table, 'users');
  }
  assert.equal(schema.cadUploadSessions.fields.loginSessionId.table, 'authSessions');
});
test('unmodified provider boundary fails closed before authority reads or issuance', async () => {
  const f = fixture(); const { cad } = loadSource({ now: f.now });
  await assert.rejects(f.transaction(ctx => cad.resolveAuthorization.invoke(ctx,
    { principal, shopId: principal.shopId, deadlineAt: 1800 })), /AUTH_UNAVAILABLE/);
  await assert.rejects(f.transaction(ctx => cad.insertIfAbsent.invoke(ctx,
    { principal, record, credentialDigest: key, deadlineAt: 1800 })), /AUTH_UNAVAILABLE/);
  assert.equal(f.tables().cadUploadSessions.length, 0);
});
test('source handlers reject duplicate digest/session and corrupt indexes', async () => {
  const f = sourceFixture();
  assert.deepEqual(await Promise.all([f.insert(), f.insert()]), [true, false]);
  await assert.rejects(f.insert(record, second), /AUTH_UNAVAILABLE/);
  f.tables().cadUploadSessions.push({ ...f.tables().cadUploadSessions[0], _id: 'duplicate' });
  await assert.rejects(f.read(), /AUTH_UNAVAILABLE/);
  await assert.rejects(f.refresh(), /AUTH_UNAVAILABLE/);
});
test('all policy deny/regrant paths permanently invalidate prior generations', async () => {
  for (const [deny, grant] of [[{ enabled: false }, { enabled: true }],
    [{ shopId: principal.shopId, active: false, cadUploadAllowed: true }, { shopId: principal.shopId, active: true, cadUploadAllowed: true }],
    [{ shopId: principal.shopId, active: true, cadUploadAllowed: false }, { shopId: principal.shopId, active: true, cadUploadAllowed: true }]]) {
    const f = sourceFixture(); await f.insert(); await f.policy(deny);
    assert.equal(await f.read(), null); await f.policy(grant);
    assert.equal(await f.read(), null); assert.equal(await f.refresh(), null);
    assert.equal(await f.insert({ ...record, sessionId: 'new-upload' }, second), true);
    const rows = f.tables().cadUploadSessions;
    assert.equal(rows[1][deny.shopId ? 'membershipGeneration' : 'userGeneration'], 2);
  }
});
test('generation overflow and deadline crossed during write roll back', async () => {
  const f = sourceFixture(); f.tables().cadUserAuthority[0].generation = Number.MAX_SAFE_INTEGER;
  await assert.rejects(f.policy({ enabled: false }), /AUTH_UNAVAILABLE/);
  assert.equal(f.tables().cadUserAuthority[0].enabled, true);
  const g = sourceFixture({ afterWrite: () => g.setTime(1800) });
  await assert.rejects(g.insert(), /AUTH_UNAVAILABLE/);
  assert.equal(g.tables().cadUploadSessions.length, 0);
});
test('source revoke is irreversible, refresh fresh, and return fields are projected', async () => {
  const f = sourceFixture(); const cookie = { ...record, transport: 'cookie', csrfDigest: second };
  await f.insert(cookie);
  f.tables().cadUploadSessions[0].providerToken = 'synthetic-private';
  assert.deepEqual(await f.read(), cookie);
  assert.equal(await f.run('revoke', { credentialDigest: key, revokedAt: 1000 }), true);
  f.setTime(1100);
  assert.equal(await f.run('revoke', { credentialDigest: key, revokedAt: 1100 }), true);
  assert.equal(f.tables().cadUploadSessions[0].revokedAt, 1000);
  assert.equal(await f.refresh(), null); assert.equal(await f.read(), null);
  assert.equal(await f.insert(cookie), false);
});
test('source validates secrets, digest, unsafe epochs, and exact library session state', async () => {
  const f = sourceFixture();
  for (const field of ['filename', 'base64', 'credential', 'providerToken', 'userGeneration'])
    await assert.rejects(f.insert({ ...record, [field]: 'synthetic' }));
  await assert.rejects(f.insert(record, 'synthetic-raw-credential'), /AUTH_UNAVAILABLE/);
  await assert.rejects(f.insert({ ...record, issuedAt: Number.NaN }), /AUTH_UNAVAILABLE/);
  await f.insert();
  for (const patch of [{ active: false }, { expiresAt: 1000 }, { userId: 'another-user' }, { authMethod: 'passkey' }]) {
    const original = { ...f.tables().library[0] }; Object.assign(f.tables().library[0], patch);
    assert.equal(await f.read(), null); assert.equal(await f.refresh(), null);
    f.tables().library[0] = original;
  }
  assert.equal(await f.run('read', { credentialDigest: key }, { ...principal, loginSessionId: 'other-login' }), null);
  f.tables().library.length = 0; assert.equal(await f.read(), null);
});
