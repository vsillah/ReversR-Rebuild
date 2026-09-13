// Executable internal-function contract, NOT registered/deployable Convex functions.
// run() MUST execute inside a single query/mutation snapshot. Never call over CRUD RPCs.
const v = require('./validators');
const unique = (db, table, index, fields) => db.query(table).withIndex(index,
  q => Object.entries(fields).reduce((r, [k, value]) => r.eq(k, value), q)).unique();
const same = (a, b) => v.bindingFields.every(k => a[k] === b[k]);
const project = row => v.record(Object.fromEntries([...v.recordFields, 'csrfDigest']
  .filter(k => row[k] !== undefined).map(k => [k, row[k]])));

function createBackendContract({ readExactLibrarySession, now = Date.now } = {}) {
  function clock(deadlineAt) {
    const n = now();
    if (!v.time(n) || !v.time(deadlineAt) || deadlineAt <= n || deadlineAt - n > 800) v.fail();
    return n;
  }
  async function authority(ctx, b, deadlineAt) {
    v.binding(b);
    const n = clock(deadlineAt);
    if (typeof readExactLibrarySession !== 'function') v.fail();
    // Adapter must point-read the current library session AND owner within ctx's snapshot.
    // No custom login table, JWT decoding or client-provided liveness flag is sufficient.
    // deadlineAt is validated by clock above; the reader evaluates this deterministic
    // horizon, never wall time. Gateway freshness remains a separate requirement.
    const login = await readExactLibrarySession(ctx, b.loginSessionId, deadlineAt);
    if (login === null) return null;
    if (!login || !v.id(login.userId) || !v.id(login.loginSessionId) || !v.method(login.authMethod)
      || !v.time(login.expiresAt) || typeof login.active !== 'boolean') v.fail();
    if (!login.active || login.expiresAt <= n || login.userId !== b.userId
      || login.loginSessionId !== b.loginSessionId || login.authMethod !== b.authMethod) return null;
    const user = await unique(ctx.db, 'cadUserAuthority', 'by_userId', { userId: b.userId });
    const member = await unique(ctx.db, 'cadMemberships', 'by_userId_and_shopId',
      { userId: b.userId, shopId: b.shopId });
    if (!user || !member) return null;
    if (!v.time(user.generation) || !v.time(member.generation) || typeof user.enabled !== 'boolean'
      || typeof member.active !== 'boolean' || typeof member.cadUploadAllowed !== 'boolean') v.fail();
    if (!user.enabled || !member.active || !member.cadUploadAllowed) return null;
    if (login.expiresAt <= clock(deadlineAt)) return null;
    return { user, member, grant: { ...b, cadUploadAllowed: true, expiresAt: login.expiresAt } };
  }
  async function live(ctx, row, principal, deadlineAt) {
    if (!row) return null;
    const r = project(row);
    if (!same(r, principal) || r.status !== 'active' || !r.cadUploadAllowed
      || r.issuedAt > clock(deadlineAt) || r.expiresAt <= clock(deadlineAt)) return null;
    const a = await authority(ctx, principal, deadlineAt);
    if (!a || row.userGeneration !== a.user.generation
      || row.membershipGeneration !== a.member.generation || r.expiresAt <= clock(deadlineAt)) return null;
    return { record: r, grant: { ...a.grant, expiresAt: Math.min(r.expiresAt, a.grant.expiresAt) } };
  }
  return Object.freeze({
    async run(ctx, op, input, principal) {
      try {
        const p = v.payload(op, input);
        const b = v.binding(principal);
        const n = clock(p.deadlineAt);
        let out;
        if (op === 'resolveAuthorization') {
          out = p.shopId === b.shopId ? (await authority(ctx, b, p.deadlineAt))?.grant ?? null : null;
        } else if (op === 'refreshAuthorization') {
          if (!same(p.binding, b)) out = null;
          else out = (await live(ctx, await unique(ctx.db, 'cadUploadSessions', 'by_sessionId',
            { sessionId: p.binding.sessionId }), b, p.deadlineAt))?.grant ?? null;
        } else if (op === 'read') {
          out = (await live(ctx, await unique(ctx.db, 'cadUploadSessions', 'by_credentialDigest',
            { credentialDigest: p.credentialDigest }), b, p.deadlineAt))?.record ?? null;
        } else if (op === 'insertIfAbsent') {
          const r = p.record;
          if (!same(r, b) || r.status !== 'active' || !r.cadUploadAllowed
            || r.issuedAt > n || r.expiresAt <= n) v.fail();
          const a = await authority(ctx, b, p.deadlineAt);
          if (!a || r.expiresAt > a.grant.expiresAt) v.fail();
          const existing = await unique(ctx.db, 'cadUploadSessions', 'by_credentialDigest',
            { credentialDigest: p.credentialDigest });
          // .unique() detects corrupt duplicates; check both indexes before any insertion.
          const session = await unique(ctx.db, 'cadUploadSessions', 'by_sessionId', { sessionId: r.sessionId });
          if (existing) out = false;
          else {
            if (session) v.fail();
            if (r.expiresAt <= clock(p.deadlineAt)) v.fail();
            await ctx.db.insert('cadUploadSessions', { ...r, credentialDigest: p.credentialDigest,
              userGeneration: a.user.generation, membershipGeneration: a.member.generation });
            out = true;
          }
        } else if (op === 'revoke') {
          if (p.revokedAt > n || n - p.revokedAt > 800) v.fail();
          const row = await unique(ctx.db, 'cadUploadSessions', 'by_credentialDigest',
            { credentialDigest: p.credentialDigest });
          if (!row || !same(project(row), b)) out = false;
          else {
            // Revocation may reduce authority even after logout/permission loss.
            if (row.status !== 'revoked') {
              clock(p.deadlineAt);
              await ctx.db.patch(row._id, { status: 'revoked', revokedAt: n });
            }
            out = true;
          }
        }
        clock(p.deadlineAt); // rollback required if this throws inside a mutation.
        return v.result(op, out);
      } catch { v.fail(); }
    },
    // Privileged internal policy hook ONLY. Not exposed through the gateway allowlist.
    // Existing persistent authority rows are provisioned by a later reviewed owner workflow.
    async changeAuthority(ctx, { userId, shopId, enabled, active, cadUploadAllowed, deadlineAt }) {
      try {
        clock(deadlineAt);
        if (!v.id(userId)) v.fail();
        const membership = shopId !== undefined;
        if (membership ? (!v.id(shopId) || typeof active !== 'boolean' || typeof cadUploadAllowed !== 'boolean'
          || enabled !== undefined) : (typeof enabled !== 'boolean' || active !== undefined || cadUploadAllowed !== undefined)) v.fail();
        const row = membership
          ? await unique(ctx.db, 'cadMemberships', 'by_userId_and_shopId', { userId, shopId })
          : await unique(ctx.db, 'cadUserAuthority', 'by_userId', { userId });
        if (!row || !v.time(row.generation) || row.generation === Number.MAX_SAFE_INTEGER) v.fail();
        // Increment on every policy write, including regrant. Never reset/delete these rows.
        clock(deadlineAt);
        await ctx.db.patch(row._id, { ...(membership ? { active, cadUploadAllowed } : { enabled }),
          generation: row.generation + 1 });
        clock(deadlineAt);
        return true;
      } catch { v.fail(); }
    },
  });
}
module.exports = { createBackendContract };
