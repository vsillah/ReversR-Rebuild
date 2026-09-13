const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLockoutPrivateFixture: create, inspectRollbackFixture: rollback, entryPoints } = require('../offline/cad-convex/lockoutPrivateAdapters');
const policy = require('../offline/cad-convex/boundedRetentionPolicy.json');
const binding = { runRef: 'fixture:run', sourceSha: '80474b111d358f98788f363672973207ffee854d',
  projectRef: 'fixture:project', destinationRef: 'fixture:release', operatorRef: 'fixture:operator', custodianRef: 'fixture:custodian' };
const startAt = Date.parse('2026-09-13T09:00:00.000Z'), reviewAt = startAt + 82800000, expiresAt = startAt + 86400000;
const make = () => create({ testOnly: true, binding, startAt, reviewAt, expiresAt });
const intent = slot => ({ slot, passwordAccountRef: `fixture:password-account-${slot}`, operationRef: `fixture:op-${slot}`, absenceRef: `fixture:absent-${slot}`, collisionRef: `fixture:collision-${slot}` });
const receipt = slot => ({ slot, sequence: slot + 1, operationRef: `fixture:op-${slot}`, userRef: `fixture:user-${slot}`,
  accountRef: `fixture:account-${slot}`, passwordAccountRef: `fixture:password-account-${slot}`, provider: 'password',
  ownershipRef: `fixture:owner-${slot}`, rateLimitRef: `fixture:rate-${slot}`, verifiers: [], uploadRefs: [] });
function owned() {
  const a = make();
  for (const slot of [0, 1]) { a.pendingBeforeDispatch(binding, startAt, intent(slot)); a.postWriteOwnership(binding, startAt, receipt(slot)); }
  return a;
}
function fenced() {
  const a = owned(); a.denyAdmission(binding, startAt, 1);
  a.captureSelectors(binding, startAt, [['fixture:session-a'], ['fixture:session-b']]);
  a.drainAdmissions(binding, startAt, { epoch: 1, inFlight: 0, evidenceRef: 'fixture:drain' }); return a;
}
function responses(a, slot = 0) {
  return a.reconciliationPlan(binding, startAt, slot).queries.map(query => ({ query, rows: [], complete: true, backendReads: 1 }));
}
function terminal() {
  const retention = { testOnly: true, runRef: binding.runRef, sourceSha: binding.sourceSha, destinationRef: binding.destinationRef,
    custodianRef: binding.custodianRef, reviewRef: 'fixture:review', dispositionRef: 'fixture:disposition', lockoutEvidenceRef: 'fixture:lockout',
    createdAtUtc: new Date(startAt).toISOString(), reviewAtUtc: new Date(reviewAt).toISOString(), expiresAtUtc: new Date(expiresAt).toISOString(),
    slots: [0, 1].map(slot => ({ ownershipRef: receipt(slot).ownershipRef, counts: { ...policy.retainedCapsPerIdentity },
      selectors: Object.fromEntries(Object.keys(policy.retainedCapsPerIdentity).map(table => [table,
        table === 'users' ? [receipt(slot).userRef] : table === 'authAccounts' ? [receipt(slot).accountRef]
          : table === 'authRateLimits' ? [receipt(slot).rateLimitRef] : []])) })) };
  return { retention, receipts: ['denyAdmission', 'captureSelectors', 'drainAdmissions', 'revokeAllSessions', 'reconcileDescendants',
    'probeDenials', 'inventoryRetained'].map((step, i) => ({ step, sequence: i + 1, operationRef: `fixture:terminal-${i}`,
    runRef: binding.runRef, sourceSha: binding.sourceSha, destinationRef: binding.destinationRef, atUtc: new Date(startAt).toISOString(),
    outcome: 'fixture-confirmed', sessionSelectorRefs: i === 0 ? [[], []] : [['fixture:session-a'], ['fixture:session-b']], evidenceRef: `fixture:evidence-${i}` })) };
}
test('pending intent precedes ownership; returned values cannot mutate private state', () => {
  const a = make(); assert.throws(() => a.postWriteOwnership(binding, startAt, receipt(0)), /PENDING_OPERATION_REQUIRED/);
  const dispatch = a.pendingBeforeDispatch(binding, startAt, intent(0)); dispatch.sequence = 99;
  assert.equal(a.status().pending.sequence, 1);
  assert.throws(() => a.pendingBeforeDispatch(binding, startAt, intent(1)), /PENDING_OPERATION_REQUIRED/);
  a.postWriteOwnership(binding, startAt, receipt(0)); assert.equal(a.status().pending, null);
});
test('lost response freezes original operation without replay or selector erasure', () => {
  const a = make(); a.pendingBeforeDispatch(binding, startAt, intent(0)); a.unknownOutcome(binding, startAt);
  assert.equal(a.status().pending.operationRef, 'fixture:op-0');
  assert.throws(() => a.pendingBeforeDispatch(binding, startAt, intent(1)), /RECONCILIATION_REQUIRED/);
  assert.throws(() => a.postWriteOwnership(binding, startAt, receipt(0)), /RECONCILIATION_REQUIRED/);
  assert.equal(a.status().deleted, false);
});
test('every binding dimension and custody boundary is checked', () => {
  for (const key of Object.keys(binding)) {
    const a = make(); assert.throws(() => a.pendingBeforeDispatch({ ...binding, [key]: 'fixture:wrong' }, startAt, intent(0)), /BINDING_MISMATCH/);
  }
  for (const at of [startAt - 1, reviewAt, expiresAt, NaN]) {
    const a = make(); assert.throws(() => a.pendingBeforeDispatch(binding, at, intent(0)), /CUSTODY_WINDOW_INVALID/);
  }
  const a = make(); a.pendingBeforeDispatch(binding, startAt + 1, intent(0));
  assert.throws(() => a.postWriteOwnership(binding, startAt, receipt(0)), /CUSTODY_WINDOW_INVALID/);
  assert.throws(() => create({ testOnly: false, binding, startAt, reviewAt, expiresAt }), /BINDING_REQUIRED/);
});
test('wrong provider, operation, source ownership or overlapping cohort stops receipt acceptance', () => {
  for (const change of [{ sequence: 2 }, { operationRef: 'fixture:other' }, { slot: 1 }, { provider: 'other' }, { password: 'PRIVATE_SENTINEL' }]) {
    const a = make(); a.pendingBeforeDispatch(binding, startAt, intent(0));
    assert.throws(() => a.postWriteOwnership(binding, startAt, { ...receipt(0), ...change }), /OWNERSHIP_MISMATCH/);
    assert.equal(a.status().state, 'FIXTURE_BLOCKED_RECONCILIATION_REQUIRED');
    assert.doesNotMatch(JSON.stringify(a.status()), /PRIVATE_SENTINEL/);
  }
  const a = make(); a.pendingBeforeDispatch(binding, startAt, intent(0)); a.postWriteOwnership(binding, startAt, receipt(0));
  a.pendingBeforeDispatch(binding, startAt, intent(1));
  assert.throws(() => a.postWriteOwnership(binding, startAt, { ...receipt(1), rateLimitRef: receipt(0).rateLimitRef }), /OWNERSHIP_COLLISION/);
});
test('all Auth entry points, extra parameters, stale epoch and noncohort receive generic denial', () => {
  for (const a of [make(), owned(), fenced()]) for (const entryPoint of [...entryPoints, 'direct-unknown']) {
    for (const change of [{}, { slot: 2 }, { epoch: -1 }, { password: 'PRIVATE_SENTINEL' }]) {
      const r = a.admission(binding, startAt, { entryPoint, slot: 0, epoch: 1, ...change });
      assert.equal(r.allowed, false); assert.equal(r.code, 'AUTH_UNAVAILABLE'); assert.equal(r.executable, false);
      assert.doesNotMatch(JSON.stringify(r), /PRIVATE_SENTINEL/);
    }
  }
  assert.equal(make().admission(null, NaN, null).allowed, false);
});
test('fence precedes capture and epoch-matched drain; later epochs preserve old session selectors', () => {
  const a = owned(); assert.throws(() => a.captureSelectors(binding, startAt, [[], []]), /FENCE_SEQUENCE_INVALID/);
  a.denyAdmission(binding, startAt, 1);
  assert.throws(() => a.denyAdmission(binding, startAt, 1), /FENCE_EPOCH_INVALID/);
  a.captureSelectors(binding, startAt, [['fixture:session-a'], []]);
  for (const r of [{ epoch: 0, inFlight: 0 }, { epoch: 1, inFlight: 1 }])
    assert.throws(() => a.drainAdmissions(binding, startAt, { ...r, evidenceRef: 'fixture:drain' }), /ADMISSION_DRAIN_REQUIRED/);
  a.denyAdmission(binding, startAt, 2);
  assert.throws(() => a.captureSelectors(binding, startAt, [[], []]), /SELECTOR_DRIFT/);
});
test('query plan preserves session descendant prefix and exact account and rate-limit selectors', () => {
  const a = fenced(), plan = a.reconciliationPlan(binding, startAt, 0);
  assert.ok(plan.queries.every(q => q.take === 21)); assert.equal(plan.maxBackendReads, plan.maxOperations * 21);
  assert.deepEqual(plan.queries.find(q => q.table === 'authRefreshTokens').equal, { sessionId: 'fixture:session-a' });
  assert.deepEqual(plan.queries.find(q => q.table === 'authRateLimits').equal, { identifier: receipt(0).passwordAccountRef });
  assert.equal(plan.queries.filter(q => q.table === 'authAccounts').length, 2);
  plan.queries[0].equal.id = 'fixture:wrong'; assert.equal(a.reconciliationPlan(binding, startAt, 0).queries[0].equal.id, receipt(0).userRef);
});
test('bounded reconciliation rejects timeout, missing query, overflow, broad selector, fanout and unknown rows', () => {
  for (const alter of [r => r.pop(), r => r[0].complete = false, r => r[0].backendReads = 22,
    r => r[0].query.equal.id = '*', r => r[0].rows = Array(21).fill({}),
    r => { r[0].rows = [{ id: 'fixture:wrong', ownershipRef: 'fixture:owner-0' }]; }]) {
    const a = fenced(), r = responses(a); alter(r); assert.equal(a.inspectReconciliation(binding, startAt, 0, r).packetValid, false);
    assert.throws(() => a.inspectRetained(binding, startAt, terminal()), /RECONCILIATION_REQUIRED/);
  }
  const a = fenced(); const r = a.inspectReconciliation(binding, startAt, 0, responses(a));
  assert.equal(r.packetValid, true); assert.equal(r.terminalReady, false);
});
test('unregistered session and rate-limit provenance are rejected with exact codes', () => {
  for (const [table, code] of [['authSessions', 'SELECTOR_DRIFT'], ['authRateLimits', 'RATE_LIMIT_PROVENANCE_REQUIRED']]) {
    const a = fenced(), r = responses(a), q = r.find(r => r.query.table === table);
    q.rows = [{ id: 'fixture:unknown', ...q.query.equal, ownershipRef: receipt(0).ownershipRef }];
    assert.equal(a.inspectReconciliation(binding, startAt, 0, r).code, code);
  }
});
test('registered verifier signature linkage and upload point reads are exact and private', () => {
  const a = make(); for (const slot of [0, 1]) {
    a.pendingBeforeDispatch(binding, startAt, intent(slot));
    a.postWriteOwnership(binding, startAt, { ...receipt(slot), verifiers: [{ id: `fixture:verifier-${slot}`, signatureRef: `fixture:signature-${slot}` }], uploadRefs: [`fixture:upload-${slot}`] });
  }
  a.denyAdmission(binding, startAt, 1); a.captureSelectors(binding, startAt, [[], []]);
  a.drainAdmissions(binding, startAt, { epoch: 1, inFlight: 0, evidenceRef: 'fixture:drain' });
  const p = a.reconciliationPlan(binding, startAt, 0);
  assert.deepEqual(p.queries.find(q => q.table === 'authVerifiers').equal, { id: 'fixture:verifier-0', signatureRef: 'fixture:signature-0' });
  assert.deepEqual(p.queries.find(q => q.table === 'cadUploadSessions').equal, { id: 'fixture:upload-0' });
});
test('retained terminal binds ownership, custody and selectors and never claims removal', () => {
  const a = fenced(), r = a.inspectRetained(binding, startAt, terminal());
  assert.equal(r.packetValid, true); assert.equal(r.retainedRecords, 6);
  for (const key of ['liveReady', 'retentionOverride', 'cleanupVerified', 'deleted']) assert.equal(r[key], false);
  for (const alter of [p => p.retention.slots[0].selectors.users[0] = 'fixture:other',
    p => p.retention.slots[0].selectors.authRateLimits[0] = 'fixture:unknown',
    p => p.retention.custodianRef = 'fixture:other', p => p.receipts.slice(1).forEach(r => r.sessionSelectorRefs = [[], []])]) {
    const p = terminal(); alter(p); assert.equal(a.inspectRetained(binding, startAt, p).packetValid, false);
  }
});
test('rollback requires closed Password, every entry point and fence/epoch/custody/schema compatibility', () => {
  const c = { testOnly: true, readsRetainedVersion: 1, enforcesFence: true, enforcesEpoch: true,
    enforcesCustody: true, entryPoints: [...entryPoints], passwordEnabled: false }, f = { version: 1, epoch: 1, denied: true };
  assert.equal(rollback(c, f).packetValid, true);
  for (const change of [{ readsRetainedVersion: 0 }, { enforcesFence: false }, { enforcesEpoch: false }, { enforcesCustody: false },
    { passwordEnabled: true }, { entryPoints: entryPoints.slice(1) }]) assert.equal(rollback({ ...c, ...change }, f).code, 'UNSAFE_ROLLBACK');
  assert.equal(rollback(c, null).code, 'UNSAFE_ROLLBACK');
});

test('unknown post-write response retains bounded original-account reconciliation and prohibits replay', () => {
  const a = make(); a.pendingBeforeDispatch(binding, startAt, intent(0)); a.unknownOutcome(binding, startAt);
  const p = a.pendingReconciliationPlan(binding, startAt);
  assert.equal(p.query.equal.accountId, receipt(0).passwordAccountRef);
  assert.equal(p.pending.sequence, 1); assert.equal(p.maxBackendReads, 21);
  assert.equal(p.ownershipEstablished, false); assert.equal(p.replayAllowed, false);
});
test('failed capture does not partially modify selectors and duplicate rows cannot hide overflow', () => {
  const a = owned(); a.denyAdmission(binding, startAt, 1);
  assert.throws(() => a.captureSelectors(binding, startAt, [['fixture:new-session'], [receipt(0).userRef]]), /INVENTORY_OVERFLOW/);
  a.captureSelectors(binding, startAt, [[], []]);
  const b = fenced(), r = responses(b), q = r.find(r => r.query.table === 'users');
  q.rows = Array(2).fill({ id: receipt(0).userRef, ownershipRef: receipt(0).ownershipRef }); q.backendReads = 2;
  assert.equal(b.inspectReconciliation(binding, startAt, 0, r).code, 'INVENTORY_DRIFT');
});
