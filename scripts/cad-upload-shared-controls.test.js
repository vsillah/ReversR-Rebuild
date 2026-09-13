const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { emptyState, transition, selectReconciliation } = require('../offline/cad-convex/sharedUploadControls');
const policy = (patch = {}) => ({ schemaVersion: 1, windowId: 'synthetic-window', windowStart: 100,
  windowEnd: 10000, userConcurrency: 1, shopConcurrency: 2, userAttempts: 2, shopAttempts: 3,
  leaseMs: 1000, maxReservationMicros: 100, budgetMicros: 200, currency: 'USD', ...patch });
const binding = (userId = 'user-a', shopId = 'shop-a') => ({ userId, shopId, sessionId: `session-${userId}`, loginSessionId: `login-${userId}` });
const authority = (b = binding(), patch = {}) => ({ ...b, revision: 1, expiresAt: 9000, allowed: true, active: true, ...patch });
const reserve = (key = 'attempt-a', b = binding(), reservationMicros = 100) => ({ type: 'reserve', binding: b, key, reservationMicros });
function fixture(p = policy()) {
  let state = emptyState(p);
  return { get state() { return structuredClone(state); },
    run(c, a = authority(c.binding), now = 101) {
      const before = JSON.stringify(state); const r = transition(state, c, a, now);
      assert.equal(JSON.stringify(state), before, 'pure transition must not mutate its input');
      if (r.ok) state = r.state;
      return r;
    },
  };
}
const action = (type, r, patch = {}) => ({ type, binding: binding(), key: 'attempt-a', fence: r.fence, ...patch });

test('two synthetic clients serialize competing user and shop leases with bounded attempts', async () => {
  const f = fixture();
  // Synchronous pure transitions are committed serially by this test double only.
  const [a, b] = await Promise.all([Promise.resolve().then(() => f.run(reserve())),
    Promise.resolve().then(() => f.run(reserve('attempt-b', binding('user-a', 'shop-b'))))]);
  assert.equal(a.ok, true); assert.equal(b.code, 'UPLOAD_LIMIT_REACHED');
  assert.equal(f.run(reserve('attempt-b', binding('user-b'))).ok, true);
  assert.equal(f.run(reserve('attempt-c', binding('user-c'))).code, 'UPLOAD_LIMIT_REACHED');
  assert.equal(f.run(action('cancel', a)).status, 'settled');
  const second = f.run(reserve('attempt-c')); assert.equal(second.ok, true);
  f.run(action('cancel', second, { key: 'attempt-c' }));
  assert.equal(f.run(reserve('attempt-d')).code, 'UPLOAD_LIMIT_REACHED');
  assert.equal(f.run(reserve('attempt-d', binding('user-c'))).code, 'UPLOAD_LIMIT_REACHED');
});

test('lost commit acknowledgement replays one reservation without spending or attempting twice', () => {
  const f = fixture(); const first = f.run(reserve());
  const replay = f.run(reserve());
  assert.equal(replay.changed, false); assert.equal(replay.fence, first.fence);
  assert.equal(f.state.records.length, 1); assert.equal(f.state.revision, 1);
  assert.equal(f.run(reserve('attempt-a', binding(), 99)).code, 'UPLOAD_IDEMPOTENCY_CONFLICT');
  assert.equal(f.run(reserve('attempt-a', { ...binding(), sessionId: 'other-session' })).code, 'UPLOAD_IDEMPOTENCY_CONFLICT');
  assert.equal(f.run(reserve(), authority(binding(), { allowed: false })).code, 'UPLOAD_AUTHORITY_REJECTED');
});

test('exact authority and revision are rechecked at reservation and handoff fence', () => {
  for (const patch of [{ active: false }, { allowed: false }, { expiresAt: 101 }, { loginSessionId: 'other-login' },
    { userId: 'other-user' }, { shopId: 'other-shop' }, { sessionId: 'other-session' }]) {
    const f = fixture(); assert.equal(f.run(reserve(), authority(binding(), patch)).code, 'UPLOAD_AUTHORITY_REJECTED');
    const r = f.run(reserve());
    assert.equal(f.run(action('fence', r), authority(binding(), patch)).code, 'UPLOAD_AUTHORITY_REJECTED');
  }
  const f = fixture(); const r = f.run(reserve());
  assert.equal(f.run(action('fence', r), authority(binding(), { revision: 2 })).code, 'UPLOAD_AUTHORITY_REJECTED');
  assert.equal(f.run(action('fence', r, { fence: r.fence + 1 })).code, 'UPLOAD_FENCE_REJECTED');
  assert.equal(f.run(action('fence', r)).status, 'fenced');
  assert.equal(f.run(action('fence', r)).code, 'UPLOAD_HANDOFF_ALREADY_FENCED');
});

test('unknown outcomes retain money and capacity across expiry, retries and cancellation', () => {
  const f = fixture(); const r = f.run(reserve()); f.run(action('fence', r));
  assert.equal(f.run(action('unknown', r)).status, 'unknown');
  assert.equal(f.run(action('cancel', r)).status, 'unknown');
  assert.equal(f.run(reserve(), undefined, 2000).changed, false);
  assert.equal(f.run(reserve('attempt-b'), undefined, 2000).code, 'UPLOAD_LIMIT_REACHED');
  const selection = selectReconciliation(f.state, 2000);
  assert.deepEqual(selection.selectors, [{ binding: binding(), key: 'attempt-a', fence: r.fence }]);
  const reconcile = action('reconcile', r, { outcome: 'completed', actualMicros: 80 });
  assert.equal(f.run(reconcile, null, 2000).status, 'settled');
  assert.equal(f.run(reconcile, null, 2000).changed, false);
  assert.equal(f.run({ ...reconcile, actualMicros: 0 }, null, 2000).code, 'UPLOAD_RECONCILIATION_CONFLICT');
  assert.equal(selectReconciliation(f.state, 2000).selectors.length, 0);
});

test('all-in integer reservations cannot overspend global budget and settlement refunds only unused hold', () => {
  const f = fixture(policy({ budgetMicros: 150 })); const r = f.run(reserve());
  assert.equal(f.run(reserve('attempt-b', binding('user-b'))).code, 'UPLOAD_COST_REJECTED');
  f.run(action('fence', r));
  assert.equal(f.run(action('reconcile', r, { outcome: 'failed', actualMicros: 101 })).code, 'UPLOAD_RECONCILIATION_REJECTED');
  f.run(action('reconcile', r, { outcome: 'failed', actualMicros: 60 }));
  assert.equal(f.run(reserve('attempt-b', binding('user-b'))).code, 'UPLOAD_COST_REJECTED');
  assert.equal(f.run(reserve('attempt-b', binding('user-b'), 90)).ok, true);
  for (const amount of [0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    assert.equal(f.run(reserve('invalid', binding('user-c'), amount)).code, 'UPLOAD_COST_REJECTED');
});

test('cancellation before fence settles zero; after fence requires reconciliation', () => {
  for (const fenced of [false, true]) {
    const f = fixture(); const r = f.run(reserve()); if (fenced) f.run(action('fence', r));
    assert.equal(f.run(action('cancel', r)).status, fenced ? 'unknown' : 'settled');
    assert.equal(f.run(action('cancel', r)).changed, false);
    assert.equal(f.run(action('fence', r)).code, 'UPLOAD_HANDOFF_ALREADY_FENCED');
  }
  const f = fixture(); const r = f.run(reserve());
  assert.equal(f.run(action('reconcile', r, { outcome: 'completed', actualMicros: 0 })).code, 'UPLOAD_RECONCILIATION_REJECTED');
  assert.equal(f.run(action('reconcile', r, { outcome: 'not-started', actualMicros: 0 })).status, 'settled');
});

test('expiry selects bounded reconciliation without auto-release or stale worker authority', () => {
  const f = fixture(); const r = f.run(reserve());
  assert.equal(selectReconciliation(f.state, 1100).selectors.length, 0);
  assert.equal(selectReconciliation(f.state, 1101, 1).selectors.length, 1);
  assert.equal(f.run(action('fence', r), undefined, 1101).code, 'UPLOAD_AUTHORITY_REJECTED');
  assert.equal(f.run(reserve('attempt-b'), undefined, 1101).code, 'UPLOAD_LIMIT_REACHED');
  assert.equal(f.run(reserve('attempt-b', binding('user-b')), undefined, 10000).code, 'UPLOAD_AUTHORITY_REJECTED');
  assert.equal(f.run(reserve('attempt-b', binding('user-b')), authority(binding('user-b'), { expiresAt: 20000 }), 10000).code, 'UPLOAD_WINDOW_CLOSED');
  assert.equal(selectReconciliation(f.state, 1101, 33).ok, false);
});

test('rollback rejects unsupported or malformed records; no unknown fields or unsafe clock', () => {
  const f = fixture(); const r = f.run(reserve());
  for (const patch of [{ schemaVersion: 2 }, { lastNow: Infinity }, { records: [{}] }, { secret: 'SENTINEL' }])
    assert.equal(transition({ ...f.state, ...patch }, reserve(), authority(), 101).code, 'UPLOAD_CONTROLS_INVALID');
  assert.equal(f.run({ ...reserve(), fileName: 'SENTINEL' }).code, 'UPLOAD_CONTROLS_INVALID');
  assert.equal(f.run(reserve(), undefined, 100).code, 'UPLOAD_CONTROLS_INVALID');
  const restored = JSON.parse(JSON.stringify(f.state));
  assert.equal(transition(restored, reserve(), authority(), 102).changed, false);
  assert.equal(transition(restored, action('cancel', r), null, 102).status, 'settled');
  assert.throws(() => emptyState(policy({ currency: 'EUR' })), /UPLOAD_CONTROLS_INVALID/);
});

test('offline manifest and runtime isolation keep every live gate closed', () => {
  const m = require('../offline/cad-convex/sharedUploadControls.json');
  assert.equal(m.enabled, false); assert.equal(m.liveReady, false);
  assert.ok(Object.values(m.gates).every(v => v === false));
  const model = fs.readFileSync(require.resolve('../offline/cad-convex/sharedUploadControls'), 'utf8');
  assert.doesNotMatch(model, /require\s*\(|process\.env|fetch\s*\(|console\.|\.dispatch\(|\.convert\(/);
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /sharedUploadControls|cadSandboxExecutor/);
  assert.equal(m.rollback.deleteUnresolvedRecords, false);
});

test('stale snapshot CAS loses, retries read current limits and revocation', () => {
  // Deliberately let both clients prepare from revision zero; only one may commit.
  let persisted = emptyState(policy());
  const snapshot = structuredClone(persisted);
  const a = transition(snapshot, reserve(), authority(), 101);
  const b = transition(snapshot, reserve('attempt-b'), authority(), 101);
  const commit = (expected, proposal) => {
    if (persisted.revision !== expected || !proposal.ok) return false;
    persisted = proposal.state; return true;
  };
  assert.equal(commit(snapshot.revision, a), true);
  assert.equal(commit(snapshot.revision, b), false);
  assert.equal(transition(persisted, reserve('attempt-b'), authority(), 102).code, 'UPLOAD_LIMIT_REACHED');
  assert.equal(transition(persisted, action('fence', a), authority(binding(), { revision: 2, active: false }), 102).code,
    'UPLOAD_AUTHORITY_REJECTED');
  // The real adapter must include authority changes in its conflict set too.
});

test('ledger hard ceiling, unique fences and aggregate invariants fail closed', () => {
  const f = fixture(policy({ userConcurrency: 256, shopConcurrency: 256, userAttempts: 256,
    shopAttempts: 256, budgetMicros: 25600 }));
  for (let i = 0; i < 256; i++) assert.equal(f.run(reserve(`attempt-${i}`)).ok, true);
  assert.equal(f.run(reserve('overflow', binding('other', 'elsewhere'))).code, 'UPLOAD_LEDGER_FULL');
  assert.equal(selectReconciliation(f.state, 2000).selectors.length, 32);
  const corrupted = f.state; corrupted.records[1].fence = corrupted.records[0].fence;
  assert.equal(transition(corrupted, reserve(), authority(), 102).code, 'UPLOAD_CONTROLS_INVALID');
  const overBudget = f.state; overBudget.policy.budgetMicros = 100;
  assert.equal(selectReconciliation(overBudget, 2000).code, 'UPLOAD_CONTROLS_INVALID');
});
