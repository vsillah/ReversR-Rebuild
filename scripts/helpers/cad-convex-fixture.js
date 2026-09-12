const assert = require('node:assert/strict');
const { createBackendContract } = require('../../offline/cad-convex/backend');
const key = 'a'.repeat(64), second = 'b'.repeat(64);
const principal = { userId: 'synthetic-user', shopId: 'synthetic-shop', loginSessionId: 'synthetic-login', authMethod: 'oidc' };
const record = { schemaVersion: 2, ...principal, sessionId: 'synthetic-upload', cadUploadAllowed: true,
  transport: 'bearer', issuedAt: 1000, expiresAt: 9000, status: 'active' };
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

module.exports = { fixture, principal, record, key };
