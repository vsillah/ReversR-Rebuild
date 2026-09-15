const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const closeout = JSON.parse(fs.readFileSync(
  'docs/cad-successful-bounded-dev-qualification-closeout.json',
  'utf8',
));
const markdown = fs.readFileSync(
  'docs/cad-successful-bounded-dev-qualification-closeout.md',
  'utf8',
);
const { packet } = require('../offline/cad-convex/boundedDevQualificationExecutor');

test('successful bounded dev qualification closeout binds accepted fresh-window-1030 evidence', () => {
  assert.equal(closeout.mode, 'source-only-successful-bounded-development-qualification-closeout');
  assert.equal(closeout.status, 'DEVELOPMENT_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.developmentDeployment, 'majestic-alligator-31');
  assert.equal(closeout.mergedMainCommit, '0d5d145803d3af5d1a0a09691162692cd7379f2d');
  assert.equal(closeout.executorRebindCommit, '4d4879e64aa610c2ab60daf6d2f05ae5bcc1fa2b');
  assert.equal(closeout.sourcePr, 224);
  assert.equal(closeout.runRef, packet.acceptedFreshWindow1030Evidence.runRef);
  assert.deepEqual(closeout.acceptedEvidence, {
    key: 'acceptedFreshWindow1030Evidence',
    projectionSha256: packet.acceptedFreshWindow1030Evidence.projectionSha256,
    acceptanceReceiptSha256: packet.acceptedFreshWindow1030Evidence.acceptanceReceiptSha256,
    privateRestrictedRegisterDigest: packet.acceptedFreshWindow1030Evidence.privateRestrictedRegisterDigest,
    restrictedCommandSetDigest: packet.acceptedFreshWindow1030Evidence.restrictedCommandSetDigest,
    commandCardProjectionDigest: packet.acceptedFreshWindow1030Evidence.commandCardProjectionDigest,
  });
});

test('run evidence records completed state without retry, second run, upload or conversion authority', () => {
  assert.equal(closeout.runResult.decision, 'DEVELOPMENT_QUALIFICATION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.evidenceWritten, true);
  assert.equal(closeout.runResult.automaticRetry, false);
  assert.equal(closeout.runResult.secondRun, false);
  assert.equal(closeout.runResult.uploadsEnabled, false);
  assert.equal(closeout.runResult.conversionEnabled, false);
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    '55e0c54f6e385a5faf622f6c601437bb7044f5c4b0916b3c61cbf3fd3b77dddd');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '678ee8a908b227954cd6a80a112cafcd95ba2bd100ca1e66e8105a9d124d71fd');
  assert.equal(closeout.sanitizedRunEvidence.gitIgnored, true);
  assert.equal(closeout.sanitizedRunEvidence.modeLocked, true);
  assert.equal(closeout.sanitizedRunEvidence.privatePatternLeakObserved, false);
});

test('operation counts, disabled routes and reconciliation limitation stay source-safe', () => {
  assert.equal(closeout.operationCounts['seed-synthetic-metadata'], 2);
  assert.equal(closeout.operationCounts['authority-revoke-or-delete-synthetic'], 1);
  assert.equal(closeout.observedEngineCodes.at(-1), 'RUN_STOPPED');
  assert.deepEqual(closeout.disabledRouteChecks.map(check => check.code),
    ['USER_SESSION_REQUIRED', 'USER_SESSION_REQUIRED']);
  assert.ok(closeout.disabledRouteChecks.every(check => check.status === 401 && check.bodySubscribed === false));
  assert.equal(closeout.postRunReconciliation.localEvidenceAccepted, true);
  assert.equal(closeout.postRunReconciliation.queryOnlyAttempted, true);
  assert.equal(closeout.postRunReconciliation.mutationAttempted, false);
  assert.equal(closeout.postRunReconciliation.readAuthorityCode, 'ENGINE_INVALID');
  assert.equal(closeout.postRunReconciliation.readExactCode, 'ENGINE_INVALID');
  assert.equal(closeout.postRunReconciliation.remoteReadConclusion, 'READ_ONLY_RECONCILIATION_INCONCLUSIVE');
});

test('closeout grants no activation, provider, mutation, production or cleanup authority', () => {
  for (const [gate, value] of Object.entries(closeout.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('separate CAD upload activation approval'));
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('separate CAD conversion/Sandbox dispatch approval'));
  assert.match(closeout.futureApprovalPhrases.publication, /No merge, deployment, live tests/);
  assert.match(closeout.futureApprovalPhrases.merge, /do not enable CAD uploads/);
});

test('markdown summary does not claim upload, conversion or production readiness', () => {
  assert.match(markdown, /It does not prove user-facing CAD upload readiness/);
  assert.match(markdown, /remote post-window read reconciliation remains inconclusive/);
  assert.match(markdown, /No mutation, retry, second run, production access/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});
