// Pure source-only transaction model. No store, transport, body reader or executor.
// A future adapter must supply a serializable snapshot and current authority in the
// SAME transaction, and commit state via revision CAS. This is not that adapter.
const SCHEMA_VERSION = 1;
const MAX_RECORDS = 256;
const id = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const integer = v => Number.isSafeInteger(v) && v >= 0;
const positive = v => integer(v) && v > 0;
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const bindingKeys = ['userId', 'shopId', 'sessionId', 'loginSessionId'];
const bindingValid = b => exact(b, bindingKeys) && bindingKeys.every(k => id(b[k]));
const sameBinding = (a, b) => bindingKeys.every(k => a[k] === b[k]);
const held = r => r.status !== 'settled';
const deny = code => ({ ok: false, code });
function validPolicy(p) {
  return exact(p, ['schemaVersion', 'windowId', 'windowStart', 'windowEnd', 'userConcurrency', 'shopConcurrency',
    'userAttempts', 'shopAttempts', 'leaseMs', 'maxReservationMicros', 'budgetMicros', 'currency'])
    && p.schemaVersion === SCHEMA_VERSION && id(p.windowId) && integer(p.windowStart) && positive(p.windowEnd)
    && p.windowEnd > p.windowStart && p.windowEnd - p.windowStart <= 86400000
    && ['userConcurrency', 'shopConcurrency', 'userAttempts', 'shopAttempts'].every(k => positive(p[k]) && p[k] <= MAX_RECORDS)
    && positive(p.leaseMs) && p.leaseMs <= 60000 && positive(p.maxReservationMicros)
    && positive(p.budgetMicros) && p.maxReservationMicros <= p.budgetMicros && p.currency === 'USD';
}
function emptyState(policy) {
  if (!validPolicy(policy)) throw Error('UPLOAD_CONTROLS_INVALID');
  return { schemaVersion: SCHEMA_VERSION, revision: 0, lastNow: policy.windowStart,
    policy: { ...policy }, records: [] };
}
function validState(s) {
  if (!exact(s, ['schemaVersion', 'revision', 'lastNow', 'policy', 'records']) || s.schemaVersion !== SCHEMA_VERSION
    || !integer(s.revision) || !integer(s.lastNow) || !validPolicy(s.policy)
    || !Array.isArray(s.records) || s.records.length > MAX_RECORDS) return false;
  const keys = new Set(), fences = new Set();
  if (s.lastNow < s.policy.windowStart) return false;
  const rowsValid = s.records.every(r => {
    if (!exact(r, ['binding', 'key', 'reservationMicros', 'actualMicros', 'authorityRevision', 'fence',
      'createdAt', 'expiresAt', 'status', 'outcome']) || !bindingValid(r.binding) || !id(r.key)
      || !positive(r.reservationMicros) || r.reservationMicros > s.policy.maxReservationMicros
      || !integer(r.actualMicros) || r.actualMicros > r.reservationMicros || !integer(r.authorityRevision)
      || !positive(r.fence) || r.fence > s.revision || !integer(r.createdAt) || !integer(r.expiresAt)
      || r.createdAt < s.policy.windowStart || r.createdAt > s.lastNow || r.createdAt >= s.policy.windowEnd || r.expiresAt <= r.createdAt
      || r.expiresAt > s.policy.windowEnd || r.expiresAt - r.createdAt > s.policy.leaseMs
      || !['reserved', 'fenced', 'unknown', 'settled'].includes(r.status)
      || !(r.status === 'settled' ? ['not-started', 'completed', 'failed'].includes(r.outcome) : r.outcome === null)
      || (r.status !== 'settled' && r.actualMicros !== 0)
      || (r.outcome === 'not-started' && r.actualMicros !== 0)) return false;
    const key = JSON.stringify([r.binding.userId, r.binding.shopId, r.key]);
    if (keys.has(key) || fences.has(r.fence)) return false;
    keys.add(key); fences.add(r.fence); return true;
  });
  if (!rowsValid) return false;
  const used = s.records.reduce((sum, r) => sum + (held(r) ? r.reservationMicros : r.actualMicros), 0);
  if (!integer(used) || used > s.policy.budgetMicros) return false;
  for (const [field, concurrency, attempts] of [['userId', 'userConcurrency', 'userAttempts'], ['shopId', 'shopConcurrency', 'shopAttempts']]) {
    const counts = new Map();
    for (const r of s.records) {
      const count = counts.get(r.binding[field]) || { held: 0, attempts: 0 };
      count.attempts++; if (held(r)) count.held++;
      if (count.held > s.policy[concurrency] || count.attempts > s.policy[attempts]) return false;
      counts.set(r.binding[field], count);
    }
  }
  return true;
}
function authorized(a, binding, now) {
  return exact(a, [...bindingKeys, 'revision', 'expiresAt', 'allowed', 'active'])
    && bindingKeys.every(k => id(a[k])) && sameBinding(a, binding) && integer(a.revision)
    && integer(a.expiresAt) && a.expiresAt > now && a.allowed === true && a.active === true;
}
function result(record, state, changed) {
  // Never return binding, metadata, input or adapter diagnostics to callers.
  return { ok: true, code: 'SOURCE_ONLY_CONTROLLED', status: record.status,
    fence: record.fence, changed, state };
}
/** Input is trusted internal metadata, never a request body. Authority must be read
 * transactionally, not taken from a request or a previously verified principal.
 * Reconciliation is a privileged, separately authorized evidence operation.
 */
function transition(snapshot, command, authority, now) {
  if (!validState(snapshot) || !integer(now) || now < snapshot.lastNow || !command
    || !bindingValid(command.binding) || !id(command.key)) return deny('UPLOAD_CONTROLS_INVALID');
  const shapes = {
    reserve: ['type', 'binding', 'key', 'reservationMicros'],
    fence: ['type', 'binding', 'key', 'fence'],
    unknown: ['type', 'binding', 'key', 'fence'],
    cancel: ['type', 'binding', 'key', 'fence'],
    reconcile: ['type', 'binding', 'key', 'fence', 'outcome', 'actualMicros'],
  };
  if (!shapes[command.type] || !exact(command, shapes[command.type])) return deny('UPLOAD_CONTROLS_INVALID');
  const p = snapshot.policy;
  const existing = snapshot.records.find(r => r.key === command.key
    && r.binding.userId === command.binding.userId && r.binding.shopId === command.binding.shopId);
  if (existing && !sameBinding(existing.binding, command.binding)) return deny('UPLOAD_IDEMPOTENCY_CONFLICT');
  if (['reserve', 'fence'].includes(command.type) && !authorized(authority, command.binding, now))
    return deny('UPLOAD_AUTHORITY_REJECTED');
  if (command.type === 'reserve') {
    if (!positive(command.reservationMicros) || command.reservationMicros > p.maxReservationMicros)
      return deny('UPLOAD_COST_REJECTED');
    if (existing) return existing.reservationMicros === command.reservationMicros
      ? result(existing, snapshot, false) : deny('UPLOAD_IDEMPOTENCY_CONFLICT');
    if (now < p.windowStart || now >= p.windowEnd) return deny('UPLOAD_WINDOW_CLOSED');
    if (snapshot.records.length >= MAX_RECORDS) return deny('UPLOAD_LEDGER_FULL');
    const user = snapshot.records.filter(r => r.binding.userId === command.binding.userId);
    const shop = snapshot.records.filter(r => r.binding.shopId === command.binding.shopId);
    // Expiry alone never frees uncertain capacity or money.
    if (user.filter(held).length >= p.userConcurrency || shop.filter(held).length >= p.shopConcurrency
      || user.length >= p.userAttempts || shop.length >= p.shopAttempts) return deny('UPLOAD_LIMIT_REACHED');
    const used = snapshot.records.reduce((sum, r) => sum + (held(r) ? r.reservationMicros : r.actualMicros), 0);
    if (!integer(used) || command.reservationMicros > p.budgetMicros - used) return deny('UPLOAD_COST_REJECTED');
  } else {
    if (!existing) return deny('UPLOAD_RESERVATION_MISSING');
    if (!positive(command.fence) || command.fence !== existing.fence) return deny('UPLOAD_FENCE_REJECTED');
    if (command.type === 'fence') {
      if (now >= existing.expiresAt || existing.authorityRevision !== authority.revision)
        return deny('UPLOAD_AUTHORITY_REJECTED');
      // Replay cannot authorize a second handoff. The future outbox consumer must
      // deduplicate this fence; an unknown outcome can only be reconciled.
      if (existing.status !== 'reserved') return deny('UPLOAD_HANDOFF_ALREADY_FENCED');
    }
    if (command.type === 'reconcile') {
      if (!['not-started', 'completed', 'failed'].includes(command.outcome) || !integer(command.actualMicros)
        || command.actualMicros > existing.reservationMicros || (command.outcome === 'not-started' && command.actualMicros !== 0)
        || (existing.status === 'reserved' && command.outcome !== 'not-started')) return deny('UPLOAD_RECONCILIATION_REJECTED');
      if (existing.status === 'settled') return existing.outcome === command.outcome && existing.actualMicros === command.actualMicros
        ? result(existing, snapshot, false) : deny('UPLOAD_RECONCILIATION_CONFLICT');
    } else if (['cancel', 'unknown'].includes(command.type)) {
      if (existing.status === 'settled' || existing.status === 'unknown') return result(existing, snapshot, false);
      if (command.type === 'unknown' && existing.status !== 'fenced') return deny('UPLOAD_FENCE_REJECTED');
    }
  }
  if (snapshot.revision >= Number.MAX_SAFE_INTEGER) return deny('UPLOAD_CONTROLS_INVALID');
  const state = structuredClone(snapshot);
  state.revision++; state.lastNow = now;
  let record = existing && state.records.find(r => r.fence === existing.fence);
  if (command.type === 'reserve') {
    record = { binding: { ...command.binding }, key: command.key, reservationMicros: command.reservationMicros,
      actualMicros: 0, authorityRevision: authority.revision, fence: state.revision,
      createdAt: now, expiresAt: Math.min(now + p.leaseMs, p.windowEnd, authority.expiresAt), status: 'reserved', outcome: null };
    state.records.push(record);
  } else if (command.type === 'fence') record.status = 'fenced';
  else if (command.type === 'reconcile') Object.assign(record, { status: 'settled', outcome: command.outcome, actualMicros: command.actualMicros });
  else if (command.type === 'cancel' && record.status === 'reserved')
    Object.assign(record, { status: 'settled', outcome: 'not-started', actualMicros: 0 });
  else record.status = 'unknown';
  return result(record, state, true);
}
function selectReconciliation(state, now, limit = 32) {
  if (!validState(state) || !integer(now) || now < state.lastNow || !positive(limit) || limit > 32)
    return deny('UPLOAD_CONTROLS_INVALID');
  return { ok: true, selectors: state.records.filter(r => held(r) && (r.status === 'unknown' || r.expiresAt <= now))
    .slice(0, limit).map(r => ({ binding: { ...r.binding }, key: r.key, fence: r.fence })) };
}
module.exports = { SCHEMA_VERSION, MAX_RECORDS, emptyState, transition, selectReconciliation };
