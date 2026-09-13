const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectRetainedTerminalFixture: inspect } = require('../offline/cad-convex/retainedTerminalState');
const policy = require('../offline/cad-convex/boundedRetentionPolicy.json');
const readiness = require('../offline/cad-convex/lockoutReadiness.json');
const { createSyntheticRemovalBoundary } = require('../offline/cad-convex/syntheticRemovalBoundary');
const now = Date.parse('2026-09-13T10:00:00.000Z');
function fixture() {
  const retention = { testOnly: true, runRef: 'fixture:run', sourceSha: readiness.baseCommit,
    destinationRef: 'fixture:destination', custodianRef: 'fixture:custodian', reviewRef: 'fixture:review',
    dispositionRef: 'fixture:disposition', lockoutEvidenceRef: 'fixture:lockout',
    createdAtUtc: '2026-09-13T09:00:00.000Z', reviewAtUtc: '2026-09-14T08:00:00.000Z',
    expiresAtUtc: '2026-09-14T09:00:00.000Z', slots: [0, 1].map(i => ({
      ownershipRef: `fixture:owner-${i}`, counts: { ...policy.retainedCapsPerIdentity },
      selectors: Object.fromEntries(Object.entries(policy.retainedCapsPerIdentity).map(([table, count]) =>
        [table, Array.from({ length: count }, () => `fixture:${table.toLowerCase()}-${i}`)])),
    })) };
  return { retention, receipts: ['denyAdmission', 'captureSelectors', 'drainAdmissions', 'revokeAllSessions',
    'reconcileDescendants', 'probeDenials', 'inventoryRetained'].map((step, i) => ({
    step, sequence: i + 1, operationRef: `fixture:op-${i}`, runRef: retention.runRef,
    sourceSha: retention.sourceSha, destinationRef: retention.destinationRef,
    atUtc: `2026-09-13T09:0${i}:00.000Z`, outcome: 'fixture-confirmed',
    sessionSelectorRefs: i === 0 ? [[], []] : [['fixture:session-a'], ['fixture:session-b']],
    evidenceRef: `fixture:evidence-${i}`,
  })) };
}
test('retained receipt preserves residue and cannot satisfy removal or provisioning', () => {
  const r = inspect(fixture(), now);
  assert.equal(r.state, 'FIXTURE_RETAINED_PENDING_DISPOSITION'); assert.equal(r.retainedRecords, 6);
  for (const key of ['liveReady', 'retentionOverride', 'cleanupVerified', 'deleted']) assert.equal(r[key], false);
  assert.throws(() => createSyntheticRemovalBoundary({ testOnly: true, ...r }).requireProvisioning(), /REMOVAL_UNAVAILABLE/);
  const f = fixture(); for (const s of f.retention.slots) { s.counts.authRateLimits = 0; s.selectors.authRateLimits = []; }
  assert.equal(inspect(f, now).retainedRecords, 4);
});
test('every missing, reordered, duplicate, failed or unknown operation blocks acceptance', () => {
  for (let i = 0; i < 7; i++) {
    for (const alter of [f => f.receipts.splice(i, 1), f => f.receipts[i].sequence++,
      f => f.receipts[i].outcome = 'timeout', f => f.receipts[i].outcome = 'failed',
      f => f.receipts[i].step = 'remove']) {
      const f = fixture(); alter(f); assert.equal(inspect(f, now).packetValid, false);
    }
  }
  const f = fixture(); f.receipts[1].operationRef = f.receipts[0].operationRef;
  assert.equal(inspect(f, now).packetValid, false);
});
test('receipt source, destination and run must agree, and selectors survive revocation', () => {
  for (const key of ['sourceSha', 'destinationRef', 'runRef']) {
    const f = fixture(); f.receipts[4][key] = 'fixture:other';
    assert.equal(inspect(f, now).code, 'BINDING_MISMATCH');
  }
  for (const selectors of [[[], []], [['fixture:session-a'], ['fixture:session-a']],
    [['wildcard:*'], []], [[], [], []], [Array(21).fill('fixture:session'), []]]) {
    const f = fixture(); f.receipts[4].sessionSelectorRefs = selectors;
    assert.equal(inspect(f, now).packetValid, false);
  }
});
test('review, expiry, clock reversal, future receipts and forbidden residue fail closed', () => {
  const f = fixture();
  for (const t of [Date.parse(f.retention.reviewAtUtc), Date.parse(f.retention.expiresAtUtc), now - 7200000])
    assert.equal(inspect(f, t).packetValid, false);
  for (const t of ['2026-09-13T08:00:00.000Z', '2026-09-13T11:00:00.000Z', 'invalid']) {
    const x = fixture(); x.receipts[3].atUtc = t; assert.equal(inspect(x, now).packetValid, false);
  }
  for (const table of Object.keys(policy.retainedCapsPerIdentity)) {
    const x = fixture(); x.retention.slots[0].counts[table]++; assert.equal(inspect(x, now).packetValid, false);
  }
});
test('unknown fields and claimed activation are rejected without echoing payloads', () => {
  for (const key of ['approved', 'liveReady', 'cleanupVerified', 'password']) {
    const f = fixture(); f.receipts[3][key] = 'PRIVATE_SENTINEL';
    const r = inspect(f, now); assert.equal(r.packetValid, false); assert.doesNotMatch(JSON.stringify(r), /PRIVATE_SENTINEL/);
  }
  for (const value of [null, [], {}, { retention: null, receipts: [] }]) assert.equal(inspect(value, now).packetValid, false);
  assert.ok(Object.values(readiness.gates).every(v => v === false));
});
