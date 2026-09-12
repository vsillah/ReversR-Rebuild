const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBackendContract } = require('../offline/cad-convex/backend');
const { createGatewayContract } = require('../offline/cad-convex/gateway');
const { createConvexUploadSessionStore } = require('../server/convexUploadSessionStore');
const { createUploadSessionService } = require('../server/uploadSessionStore');
const { createHash } = require('node:crypto');
const key = 'a'.repeat(64), second = 'b'.repeat(64);
const principal = { userId: 'synthetic-user', shopId: 'synthetic-shop', loginSessionId: 'synthetic-login', authMethod: 'oidc' };
const record = { schemaVersion: 2, ...principal, sessionId: 'synthetic-upload', cadUploadAllowed: true,
  transport: 'bearer', issuedAt: 1000, expiresAt: 9000, status: 'active' };
const unavailable = /^Error: AUTH_UNAVAILABLE$/;

// Deterministic serialized snapshot/rollback simulator, NOT Convex OCC or durable storage.
// Only named indexes are permitted; unique() throws for corrupt duplicate rows.
function fixture({ afterWrite = () => {} } = {}) {
  let tick = 1000, serial = 0, queue = Promise.resolve();
  let tables = { cadUserAuthority: [{ _id: 'user-authority', userId: principal.userId, enabled: true, generation: 0 }],
    cadMemberships: [{ _id: 'membership', userId: principal.userId, shopId: principal.shopId, active: true, cadUploadAllowed: true, generation: 0 }],
    cadUploadSessions: [],
    library: [{ _id: principal.loginSessionId, ...principal, active: true, expiresAt: 10000 }] };
  const indexes = { cadUserAuthority: { by_userId: ['userId'] },
    cadMemberships: { by_userId_and_shopId: ['userId', 'shopId'] },
    cadUploadSessions: { by_credentialDigest: ['credentialDigest'], by_sessionId: ['sessionId'] } };
  const backend = createBackendContract({ now: () => tick,
    readExactLibrarySession: async (ctx, loginId) => structuredClone(ctx.tables.library.find(x => x._id === loginId) ?? null) });
  function transaction(fn) {
    const pending = queue.then(async () => {
      const snapshot = structuredClone(tables);
      const db = {
        query(table) { return { withIndex(index, select) {
          const keys = []; const query = { eq(k, value) { keys.push([k, value]); return query; } };
          select(query); assert.deepEqual(keys.map(x => x[0]), indexes[table][index]);
          return { async unique() {
            const rows = snapshot[table].filter(row => keys.every(([k, value]) => row[k] === value));
            if (rows.length > 1) throw new Error('duplicate');
            return structuredClone(rows[0] ?? null);
          } };
        } }; },
        async insert(table, row) { snapshot[table].push({ _id: `row-${++serial}`, ...structuredClone(row) }); afterWrite(); },
        async patch(id, patch) {
          const row = Object.values(snapshot).flat().find(r => r._id === id);
          assert.ok(row); Object.assign(row, structuredClone(patch));
        },
      };
      const result = await fn({ db, tables: snapshot });
      tables = snapshot; return result;
    });
    queue = pending.catch(() => {}); return pending;
  }
  const run = (op, p, b = principal) => transaction(ctx => backend.run(ctx, op, { deadlineAt: tick + 800, ...p }, b));
  return { now: () => tick, setTime: n => { tick = n; }, tables: () => tables, run, transaction,
    insert: (r = record, k = key) => run('insertIfAbsent', { credentialDigest: k, record: r }),
    read: (b = principal) => run('read', { credentialDigest: key }, b),
    refresh: (b = { ...principal, sessionId: record.sessionId }) => run('refreshAuthorization', { binding: b }),
    revoke: () => run('revoke', { credentialDigest: key, revokedAt: tick }),
    policy: patch => transaction(ctx => backend.changeAuthority(ctx, { userId: principal.userId, deadlineAt: tick + 800, ...patch })),
  };
}

test('digest and sessionId uniqueness, including concurrent submissions to serialized simulator', async () => {
  const f = fixture();
  assert.deepEqual(await Promise.all([f.insert(), f.insert()]), [true, false]);
  await assert.rejects(f.insert(record, second), unavailable);
  assert.equal(f.tables().cadUploadSessions.length, 1);
  f.tables().cadUploadSessions.push({ ...f.tables().cadUploadSessions[0], _id: 'corruption' });
  await assert.rejects(f.read(), unavailable);
});

test('missing, expired, logged-out, wrong-owner and wrong-method exact sessions deny', async () => {
  for (const mutate of [f => { f.tables().library.length = 0; },
    f => { f.tables().library[0].expiresAt = 1000; }, f => { f.tables().library[0].active = false; },
    f => { f.tables().library[0].userId = 'other-user'; }, f => { f.tables().library[0].authMethod = 'passkey'; }]) {
    const f = fixture(); await f.insert(); mutate(f);
    assert.equal(await f.read(), null); assert.equal(await f.refresh(), null);
    await assert.rejects(f.insert({ ...record, sessionId: 'new' }, second), unavailable);
  }
});

test('same user with another live login cannot read, refresh, issue or revoke this binding', async () => {
  const f = fixture(); await f.insert();
  const other = { ...principal, loginSessionId: 'second-login' };
  f.tables().library.push({ ...other, _id: other.loginSessionId, active: true, expiresAt: 10000 });
  assert.equal(await f.read(other), null);
  assert.equal(await f.refresh({ ...other, sessionId: record.sessionId }), null);
  assert.equal(await f.run('revoke', { credentialDigest: key, revokedAt: 1000 }, other), false);
  await assert.rejects(f.run('insertIfAbsent', { credentialDigest: second, record }, other), unavailable);
  assert.equal(await f.run('insertIfAbsent', { credentialDigest: second,
    record: { ...record, ...other, sessionId: 'upload-two' } }, other), true);
  f.tables().library = f.tables().library.filter(x => x._id !== principal.loginSessionId);
  assert.equal(await f.read(), null);
  assert.ok(await f.run('read', { credentialDigest: second }, other));
});

test('user disable and membership revoke/regrant never revive old uploads; new issue captures generations', async () => {
  for (const [deny, grant] of [[{ enabled: false }, { enabled: true }],
    [{ shopId: principal.shopId, active: false, cadUploadAllowed: true }, { shopId: principal.shopId, active: true, cadUploadAllowed: true }],
    [{ shopId: principal.shopId, active: true, cadUploadAllowed: false }, { shopId: principal.shopId, active: true, cadUploadAllowed: true }]]) {
    const f = fixture(); await f.insert(); await f.policy(deny);
    assert.equal(await f.read(), null);
    assert.equal(await f.run('resolveAuthorization', { shopId: principal.shopId }), null);
    await f.policy(grant);
    assert.equal(await f.read(), null); assert.equal(await f.refresh(), null);
    assert.equal(await f.insert({ ...record, sessionId: 'fresh-upload' }, second), true);
    assert.ok(await f.run('read', { credentialDigest: second }));
  }
});

test('absent authority and generation overflow fail closed without resetting rows', async () => {
  const f = fixture(); await f.insert();
  f.tables().cadUserAuthority[0].generation = Number.MAX_SAFE_INTEGER;
  await assert.rejects(f.policy({ enabled: false }), unavailable);
  assert.equal(f.tables().cadUserAuthority[0].enabled, true);
  assert.equal(await f.read(), null);
  f.tables().cadMemberships.length = 0;
  assert.equal(await f.read(), null);
});

test('refresh independently re-reads after revoke; repeated revoke preserves first time', async () => {
  const f = fixture(); await f.insert(); assert.ok(await f.read());
  assert.equal(await f.revoke(), true); f.setTime(1100);
  assert.equal(await f.refresh(), null); assert.equal(await f.read(), null);
  assert.equal(await f.revoke(), true);
  assert.equal(f.tables().cadUploadSessions[0].revokedAt, 1000);
  assert.equal(await f.run('revoke', { credentialDigest: second, revokedAt: 1100 }), false);
  assert.equal(await f.insert(), false);
});

test('expiry, malformed payloads, caller epochs, denied issuance and secret fields rejected', async () => {
  const f = fixture();
  for (const patch of [{ issuedAt: 1001 }, { expiresAt: 10001 }, { expiresAt: 1000 },
    { expiresAt: 901001 }, { cadUploadAllowed: false }, { userGeneration: 0 },
    { credential: 'synthetic-secret' }, { transport: 'cookie' }, { csrfDigest: key }, { schemaVersion: 1 }]) {
    await assert.rejects(f.insert({ ...record, ...patch }), unavailable);
  }
  await f.insert(); f.setTime(9000); assert.equal(await f.read(), null);
  assert.equal(await f.refresh(), null);
});

test('secret-free detached record and grant projections; cookie digest preserved', async () => {
  const f = fixture(); await f.insert({ ...record, transport: 'cookie', csrfDigest: second });
  f.tables().cadUploadSessions[0].providerToken = 'synthetic-private';
  const r = await f.read();
  assert.deepEqual(r, { ...record, transport: 'cookie', csrfDigest: second });
  r.userId = 'mutated'; assert.equal((await f.read()).userId, principal.userId);
  assert.deepEqual(await f.refresh(), { ...principal, cadUploadAllowed: true, expiresAt: 9000 });
  assert.equal(JSON.stringify(await f.read()).includes('synthetic-private'), false);
});

function gateway(f, overrides = {}) {
  return createGatewayContract({ now: f.now, authenticateService: async () => true,
    verifyExactLogin: async () => principal, invokeInternal: (op, p, b) => f.run(op, p, b), ...overrides });
}

test('gateway denies unverified service/login, arbitrary operations and client principal overrides', async () => {
  const f = fixture(); const p = { credentialDigest: key, deadlineAt: 1800 };
  await assert.rejects(createGatewayContract()('read', p), unavailable);
  await assert.rejects(gateway(f, { authenticateService: async () => false })('read', p), unavailable);
  assert.equal(await gateway(f, { verifyExactLogin: async () => null })('read', p), null);
  for (const op of ['changeAuthority', '__proto__', 'constructor', 'delete'])
    await assert.rejects(gateway(f)(op, p), unavailable);
  await assert.rejects(gateway(f)('read', { ...p, principal }), unavailable);
  await assert.rejects(gateway(f, { invokeInternal: async () => ({ ...record, providerToken: 'synthetic' }) })('read', p), unavailable);
});

test('expired deadline does not write; gateway clamps budget and denies late/unknown acknowledgement', async () => {
  const f = fixture();
  await assert.rejects(f.run('insertIfAbsent', { credentialDigest: key, record, deadlineAt: 1000 }), unavailable);
  assert.equal(f.tables().cadUploadSessions.length, 0);
  let calls = 0;
  const call = gateway(f, { invokeInternal: async (op, p, b) => {
    calls++; assert.equal(p.deadlineAt, 1800);
    const result = await f.run(op, p, b); f.setTime(1800); return result;
  } });
  await assert.rejects(call('insertIfAbsent', { credentialDigest: key, record, deadlineAt: 999999 }), unavailable);
  assert.equal(calls, 1); assert.equal(f.tables().cadUploadSessions.length, 1);
});

test('gateway bounds hung auth and aborts before dispatch without automatic retries', async () => {
  const f = fixture(); let calls = 0;
  const call = gateway(f, { authenticateService: () => new Promise(() => {}), invokeInternal: async () => { calls++; } });
  await assert.rejects(call('read', { credentialDigest: key, deadlineAt: 1010 }), unavailable);
  const c = new AbortController(); c.abort();
  await assert.rejects(gateway(f)('read', { credentialDigest: key, deadlineAt: 1800 }, { signal: c.signal }), unavailable);
  assert.equal(calls, 0);
});

test('service through gateway issues digest-only rows and returns no credential on lost commit acknowledgement', async () => {
  const f = fixture(); let loseAck = false, inserts = 0;
  const call = gateway(f, { invokeInternal: async (op, p, b) => {
    const result = await f.run(op, p, b);
    if (op === 'insertIfAbsent') { inserts++; if (loseAck) throw new Error('synthetic-provider-detail'); }
    return result;
  } });
  const service = createUploadSessionService({ now: f.now,
    store: createConvexUploadSessionStore({ call, now: f.now }),
    resolveAuthorization: (_, options) => call('resolveAuthorization', { shopId: principal.shopId, deadlineAt: f.now() + 800 }, options),
    refreshAuthorization: (binding, options) => call('refreshAuthorization', { binding, deadlineAt: f.now() + 800 }, options) });
  const issued = await service.issueSession({}); assert.equal(issued.ok, true);
  const hash = createHash('sha256').update(issued.credential).digest('hex');
  assert.ok(await service.lookupSession(hash));
  assert.equal(JSON.stringify(f.tables()).includes(issued.credential), false);
  loseAck = true;
  assert.deepEqual(await service.issueSession({}), { ok: false, code: 'AUTH_UNAVAILABLE' });
  assert.equal(inserts, 2); assert.equal(f.tables().cadUploadSessions.length, 2);
});


test('deadline crossed during simulated mutation rolls back; logout ordered before issuance denies', async () => {
  const f = fixture({ afterWrite: () => f.setTime(1800) });
  await assert.rejects(f.insert(), unavailable);
  assert.equal(f.tables().cadUploadSessions.length, 0);
  const g = fixture();
  await g.transaction(async ctx => { ctx.tables.library.length = 0; });
  await assert.rejects(g.insert(), unavailable);
  assert.equal(g.tables().cadUploadSessions.length, 0);
});

test('wrong shop, malformed authority, corrupt session index and invalid revoke clock deny', async () => {
  const f = fixture(); await f.insert();
  assert.equal(await f.run('resolveAuthorization', { shopId: 'other-shop' }), null);
  assert.equal(await f.read({ ...principal, shopId: 'other-shop' }), null);
  await assert.rejects(f.run('revoke', { credentialDigest: key, revokedAt: 1001 }), unavailable);
  assert.equal((await f.read()).status, 'active');
  f.tables().cadUploadSessions.push({ ...f.tables().cadUploadSessions[0], _id: 'duplicate-session', credentialDigest: second });
  await assert.rejects(f.refresh(), unavailable);
  f.tables().cadUserAuthority[0].generation = -1;
  await assert.rejects(f.read(), unavailable);
});
