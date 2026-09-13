const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { emptyState } = require('../offline/cad-convex/sharedUploadControls');
const { createDouble } = require('./helpers/cad-shared-controls-adapter-double');
const binding = { userId: 'synthetic-user', shopId: 'synthetic-shop', sessionId: 'synthetic-session', loginSessionId: 'synthetic-login' };
const authority = { ...binding, revision: 1, active: true, allowed: true, expiresAt: 10000 };
const policy = { schemaVersion: 1, windowId: 'synthetic-window', windowStart: 100, windowEnd: 9000,
  userConcurrency: 64, shopConcurrency: 64, userAttempts: 64, shopAttempts: 64,
  leaseMs: 1000, maxReservationMicros: 100, budgetMicros: 6400, currency: 'USD' };
const reserve = (key = 'synthetic-attempt') => ({ type: 'reserve', binding, key, reservationMicros: 100 });
const action = (type, fence, patch = {}) => ({ type, binding, key: 'synthetic-attempt', fence, ...patch });
const fixture = patch => createDouble(emptyState({ ...policy, ...patch }), authority);

test('CAS rejects competing snapshots and fresh retry observes exhausted global budget', () => {
  const d = fixture({ budgetMicros: 100 });
  const a = d.prepare(reserve(), 101), b = d.prepare(reserve('second'), 101);
  assert.equal(d.commit(a).ok, true);
  assert.equal(d.commit(b).code, 'CONFLICT');
  assert.equal(d.run(reserve('second'), 102).code, 'UPLOAD_COST_REJECTED');
  assert.equal(d.snapshot().revision, 1);
});
test('authority-only revocation conflicts with reserve and fence even without ledger change', () => {
  for (const type of ['reserve', 'fence']) {
    const d = fixture();
    const command = type === 'reserve' ? reserve() : action('fence', d.run(reserve(), 101).fence);
    const p = d.prepare(command, 102), revision = d.snapshot().revision;
    d.changeAuthority({ active: false, revision: 2 });
    assert.equal(d.snapshot().revision, revision);
    assert.equal(d.commit(p).code, 'CONFLICT');
    assert.equal(d.run(command, 103).code, 'UPLOAD_AUTHORITY_REJECTED');
  }
});
test('bounded conflicts never report admission and denial is reevaluated after authority changes', () => {
  const d = fixture();
  assert.equal(d.run(reserve(), 101, (_, store) => store.changeAuthority({ revision: 2 })).code, 'RETRY_EXHAUSTED');
  assert.equal(d.snapshot().records.length, 0);
  d.changeAuthority({ active: false });
  const denied = d.prepare(reserve(), 102);
  d.changeAuthority({ active: true });
  assert.equal(d.commit(denied).code, 'CONFLICT');
  assert.equal(d.run(reserve(), 103).ok, true);
});
test('serialized restart after lost acknowledgement preserves idempotency and cost hold', () => {
  let d = fixture({ budgetMicros: 100 }); const r = d.run(reserve(), 101);
  d = d.restart();
  assert.equal(d.run(reserve(), 102).changed, false);
  assert.equal(d.run(reserve(), 102).fence, r.fence);
  assert.equal(d.run({ ...reserve(), reservationMicros: 99 }, 102).code, 'UPLOAD_IDEMPOTENCY_CONFLICT');
  d.run(action('fence', r.fence), 103);
  d = d.restart(); // Lost handoff acknowledgement: no redispatch, no release.
  assert.equal(d.run(action('fence', r.fence), 104).code, 'UPLOAD_HANDOFF_ALREADY_FENCED');
  d.run(action('unknown', r.fence), 104);
  d = d.restart();
  assert.equal(d.run(reserve('second'), 2000).code, 'UPLOAD_COST_REJECTED');
  assert.equal(d.page(2000).selectors.length, 1);
  assert.equal(d.snapshot().records[0].reservationMicros, 100);
});
test('terminal evidence replay settles once; conflicting cost cannot refund a second time', () => {
  let d = fixture(); const r = d.run(reserve(), 101); d.run(action('fence', r.fence), 102);
  const evidence = action('reconcile', r.fence, { outcome: 'completed', actualMicros: 80 });
  assert.equal(d.run(evidence, 103).ok, true); d = d.restart();
  const revision = d.snapshot().revision;
  assert.equal(d.run(evidence, 104).changed, false);
  assert.equal(d.run({ ...evidence, actualMicros: 0 }, 104).code, 'UPLOAD_RECONCILIATION_CONFLICT');
  assert.equal(d.snapshot().revision, revision);
  assert.equal(d.snapshot().records[0].actualMicros, 80);
});
test('bounded selectors reach beyond first page, retain window identity, and revisit unresolved work', () => {
  let d = fixture(); for (let i = 0; i < 40; i++) d.run(reserve(`attempt-${i}`), 101);
  const first = d.page(2000); assert.equal(first.selectors.length, 32);
  d = d.restart(); const second = d.page(2000, first.next);
  assert.equal(second.selectors.length, 8); assert.equal(second.next, null);
  const selectors = [...first.selectors, ...second.selectors];
  assert.equal(new Set(selectors.map(s => s.fence)).size, 40);
  assert.ok(selectors.every(s => s.windowId === policy.windowId));
  assert.deepEqual(d.page(2000).selectors, first.selectors);
  assert.equal(d.page(2000, { after: -1, through: 40 }).code, 'INVALID_CURSOR');
});
test('clock rollback, unsupported schema and expired window fail closed while retaining holds', () => {
  const d = fixture(); const r = d.run(reserve(), 101); const before = d.snapshot();
  assert.equal(d.run(reserve('second'), 100).code, 'UPLOAD_CONTROLS_INVALID');
  assert.equal(d.run(reserve('second'), 9000).code, 'UPLOAD_WINDOW_CLOSED');
  assert.deepEqual(d.snapshot(), before);
  const corrupt = createDouble({ ...before, schemaVersion: 2 }, authority);
  assert.equal(corrupt.run(reserve(), 102).code, 'UPLOAD_CONTROLS_INVALID');
  assert.deepEqual(corrupt.snapshot().records, before.records);
  assert.equal(d.page(9000).selectors[0].fence, r.fence);
});
test('review packet is offline, live evidence unset, and mounted route remains disabled', () => {
  const packet = require('../offline/cad-convex/sharedControlsAdapterQualification.json');
  assert.equal(packet.enabled, false); assert.equal(packet.liveQualified, false);
  assert.ok(packet.requirements.length >= 10);
  for (const requirement of packet.requirements) {
    assert.equal(requirement.liveEvidenceRef, null);
    assert.equal(requirement.qualified, false);
    assert.ok(requirement.acceptance.length > 30);
  }
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /sharedControlsAdapterQualification|cad-shared-controls-adapter-double/);
});
