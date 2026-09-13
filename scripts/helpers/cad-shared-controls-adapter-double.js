// Synthetic memory-only contract double. No durable store or runtime adapter.
const { transition, selectReconciliation } = require('../../offline/cad-convex/sharedUploadControls');
const clone = value => JSON.parse(JSON.stringify(value));
function createDouble(initial, initialAuthority) {
  let state = clone(initial), authority = clone(initialAuthority), authorityEpoch = 0;
  return {
    snapshot: () => clone(state),
    restart: () => createDouble(clone(state), clone(authority)),
    changeAuthority(patch) { authority = { ...authority, ...patch }; authorityEpoch++; },
    prepare(command, now) {
      return { revision: state.revision, authorityEpoch,
        windowId: state.policy.windowId, proposal: transition(clone(state), command, clone(authority), now) };
    },
    commit(prepared) {
      if (prepared.windowId !== state.policy.windowId || prepared.revision !== state.revision
        || prepared.authorityEpoch !== authorityEpoch) return { ok: false, code: 'CONFLICT' };
      if (prepared.proposal.ok && prepared.proposal.changed) state = clone(prepared.proposal.state);
      return prepared.proposal;
    },
    run(command, now, beforeCommit = () => {}, maxAttempts = 3) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const prepared = this.prepare(command, now);
        beforeCommit(attempt, this);
        const result = this.commit(prepared);
        if (result.code !== 'CONFLICT') return result;
      }
      return { ok: false, code: 'RETRY_EXHAUSTED' };
    },
    // Cursor uses a captured high-water fence and revisits from zero each sweep.
    // This illustrates pagination only; it does not implement custody or claims.
    page(now, cursor = { after: 0, through: state.revision }, limit = 32) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 32
        || !Number.isSafeInteger(cursor.after) || !Number.isSafeInteger(cursor.through)
        || cursor.after < 0 || cursor.through < cursor.after || cursor.through > state.revision)
        return { ok: false, code: 'INVALID_CURSOR' };
      const valid = selectReconciliation(state, now, 1);
      if (!valid.ok) return valid;
      const eligible = state.records.filter(r => r.fence > cursor.after && r.fence <= cursor.through
        && r.status !== 'settled' && (r.status === 'unknown' || r.expiresAt <= now))
        .sort((a, b) => a.fence - b.fence);
      const rows = eligible.slice(0, limit);
      return { ok: true, selectors: rows.map(r => ({ windowId: state.policy.windowId,
        binding: clone(r.binding), key: r.key, fence: r.fence })),
      next: eligible.length > limit ? { after: rows.at(-1).fence, through: cursor.through } : null };
    },
  };
}
module.exports = { createDouble };
