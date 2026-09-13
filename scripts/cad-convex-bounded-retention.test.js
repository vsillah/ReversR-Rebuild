const { test } = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../offline/cad-convex/boundedRetentionPolicy.json');
const { inspectRetentionFixture: inspect } = require('../offline/cad-convex/boundedRetentionPolicy');
const { createSyntheticRemovalBoundary } = require('../offline/cad-convex/syntheticRemovalBoundary');
const now = Date.parse('2026-09-13T10:00:00.000Z');
function fixture() {
  return { testOnly: true, runRef: 'fixture:run', sourceSha: policy.baseCommit,
    destinationRef: 'fixture:destination', custodianRef: 'fixture:custodian', reviewRef: 'fixture:review',
    dispositionRef: 'fixture:disposition', lockoutEvidenceRef: 'fixture:lockout',
    createdAtUtc: '2026-09-13T09:00:00.000Z', reviewAtUtc: '2026-09-14T08:00:00.000Z',
    expiresAtUtc: '2026-09-14T09:00:00.000Z', slots: [0, 1].map(i => ({
      ownershipRef: `fixture:ownership-${i}`, counts: { ...policy.retainedCapsPerIdentity },
      selectors: Object.fromEntries(Object.entries(policy.retainedCapsPerIdentity).map(([table, count]) =>
        [table, Array.from({ length: count }, (_, n) => `fixture:${table.toLowerCase()}-${i}-${n}`)])),
    })) };
}
test('four to six retained rows are fixture residue, never cleanup or admission', () => {
  assert.deepEqual(policy.retainedCapsPerIdentity, { users: 1, authAccounts: 1, authSessions: 0,
    authRefreshTokens: 0, authVerificationCodes: 0, authVerifiers: 0, authRateLimits: 1,
    cadUserAuthority: 0, cadMemberships: 0, cadUploadSessions: 0 });
  assert.equal(policy.retainedCapTotal, 6);
  assert.equal(policy.maxRetentionHours, 24);
  assert.equal(policy.activeGraphCapPerIdentity, 20);
  const m = fixture();
  assert.deepEqual(inspect(m, now), { packetValid: true, code: 'FIXTURE_RETAINED_NOT_REMOVED',
    retainedRecords: 6, liveReady: false, retentionOverride: false, cleanupVerified: false });
  for (const slot of m.slots) { slot.counts.authRateLimits = 0; slot.selectors.authRateLimits = []; }
  assert.equal(inspect(m, now).retainedRecords, 4);
  const gate = createSyntheticRemovalBoundary({ testOnly: true, mode: 'bounded-retention', ...inspect(m, now) });
  assert.throws(() => gate.requireProvisioning(), /REMOVAL_UNAVAILABLE/);
});
test('all ten tables enforce exact terminal caps including forbidden session and CAD residue', () => {
  for (const table of Object.keys(policy.retainedCapsPerIdentity)) {
    const m = fixture(); m.slots[0].counts[table]++;
    assert.equal(inspect(m, now).code, 'RETAINED_CAP_EXCEEDED', table);
  }
  for (const bad of [-1, 0.5, NaN, '1']) {
    const m = fixture(); m.slots[0].counts.users = bad;
    assert.equal(inspect(m, now).packetValid, false);
  }
});
test('missing, unknown and duplicate ownership selectors stop planning', () => {
  const changes = [m => delete m.slots[0].counts.authVerifiers,
    m => m.slots[0].counts.extraTable = 0,
    m => m.slots[0].selectors.users = [],
    m => m.slots[1].selectors.users = [...m.slots[0].selectors.users],
    m => m.slots[1].ownershipRef = m.slots[0].ownershipRef,
    m => m.slots[0].selectors.users = ['wildcard:*'],
    m => m.slots.pop(), m => m.slots[0].counts.users = 0];
  for (const change of changes) { const m = fixture(); change(m); assert.equal(inspect(m, now).packetValid, false); }
});
test('missing custody, expiry, source, review, disposition or lockout evidence denies', () => {
  for (const key of ['custodianRef', 'expiresAtUtc', 'sourceSha', 'reviewRef', 'dispositionRef', 'lockoutEvidenceRef', 'destinationRef', 'runRef']) {
    const m = fixture(); m[key] = null;
    assert.equal(inspect(m, now).packetValid, false, key);
  }
});
test('absolute UTC and exclusive review/expiry deadlines; no extension or clock rollback', () => {
  for (const time of [Date.parse('2026-09-13T08:59:59.000Z'), Date.parse(fixture().reviewAtUtc), Date.parse(fixture().expiresAtUtc), NaN])
    assert.equal(inspect(fixture(), time).packetValid, false);
  for (const expiry of ['2026-09-14T09:00:01.000Z', '2026-09-14T09:00:00-04:00', '2026-02-30T09:00:00.000Z']) {
    const m = fixture(); m.expiresAtUtc = expiry; assert.equal(inspect(m, now).packetValid, false);
  }
});
test('forged activation and extra private payloads are rejected without echoing input', () => {
  for (const key of ['enabled', 'approved', 'liveReady', 'retentionOverride', 'password', 'token']) {
    const m = fixture(); m[key] = 'PRIVATE_SENTINEL';
    const result = inspect(m, now);
    assert.equal(result.packetValid, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
  for (const value of [null, {}, [], { testOnly: false }]) assert.equal(inspect(value, now).packetValid, false);
  for (const key of ['enabled', 'approved', 'liveReady', 'retentionOverride']) assert.equal(policy[key], false);
  assert.ok(Object.values(policy.gates).every(value => value === false));
});
