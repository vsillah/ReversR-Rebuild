const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const closeout = JSON.parse(fs.readFileSync(
  'docs/cad-dev-upload-session-successful-closeout.json',
  'utf8',
));
const markdown = fs.readFileSync(
  'docs/cad-dev-upload-session-successful-closeout.md',
  'utf8',
);

test('upload-session closeout binds accepted 0100Z evidence and source commits', () => {
  assert.equal(closeout.mode, 'source-only-cad-dev-upload-session-successful-closeout');
  assert.equal(closeout.status, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.developmentDeployment, 'majestic-alligator-31');
  assert.equal(closeout.mergedMainCommit, '8b5cb3e0db84a0df6b37f8557da8c32303e82024');
  assert.equal(closeout.sourcePr, 256);
  assert.equal(closeout.rebindCommit, 'cc76c360de89eb2a58c3ae692d55ecdbb391ee08');
  assert.equal(closeout.authenticatedRunnerRepairCommit, '61ce3c4ba12bc4ebb01b1999ad49ce012cfcc48d');
  assert.equal(closeout.runRef, 'cad-dev-upload-session-0100z');
  assert.deepEqual(closeout.acceptedEvidence, {
    key: 'acceptedUploadSession0100ZEvidence',
    projectionSha256: '3f405f0eafa4e3834b99d9ee69547402a0690e79e705dacd13a764b8e4b7e640',
    acceptanceReceiptSha256: 'd6a09751cece8326d6a242686ca310fa9b4a3abace455dcbd23e739b9223f930',
    privateRestrictedRegisterDigest: 'a491d8ac48374942ecb2662b88e148cf4d42e45bac048cfdc92e50c3eb262dce',
    runKeySha256: 'de725ce29a1fd499836d47717c015517cfd36855b0b6622dc2e751ee2448d644',
  });
});

test('run evidence records exactly one completed development upload-session qualification', () => {
  assert.equal(closeout.runResult.decision, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.evidenceWritten, true);
  assert.equal(closeout.runResult.automaticRetry, false);
  assert.equal(closeout.runResult.secondRun, false);
  assert.equal(closeout.runResult.cadUploadsDisabled, true);
  assert.equal(closeout.runResult.bodyAdmissionAuthorized, false);
  assert.equal(closeout.runResult.conversionAllowed, false);
  assert.equal(closeout.runResult.privateCadUsed, false);
  assert.equal(closeout.runResult.productionTouched, false);
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    'e5c7113e47d9d7bda63ea95cbf69577a9bedbc70d8f87d075b31353d8dbb4866');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    'ff03025c824c928f962e88a67487aefd86c608d094032972f739064a0e5bb825');
  assert.equal(closeout.sanitizedRunEvidence.gitIgnored, true);
  assert.equal(closeout.sanitizedRunEvidence.modeLocked, true);
  assert.equal(closeout.sanitizedRunEvidence.privatePatternLeakObserved, false);
});

test('operation counts and bridge outcome preserve no-delete and fail-closed controls', () => {
  assert.deepEqual(closeout.operationCounts, {
    signIns: 1,
    exactSessionReads: 1,
    syntheticAuthorityProvisions: 1,
    bridgeActions: 1,
    uploadSessionInserts: 1,
    uploadSessionReads: 2,
    uploadSessionRevocations: 1,
    syntheticAuthorityRevocations: 1,
    signOuts: 1,
  });
  assert.equal(closeout.observedBridgeOutcome.retainedUploadSession, true);
  assert.equal(closeout.observedBridgeOutcome.syntheticAuthorityProvisioned, true);
  assert.equal(closeout.observedBridgeOutcome.syntheticAuthorityRevoked, true);
  assert.equal(closeout.observedBridgeOutcome.authorityRowsRetained, true);
  assert.equal(closeout.observedBridgeOutcome.readBeforeRevoke, true);
  assert.equal(closeout.observedBridgeOutcome.readAfterRevokeBlocked, true);
  assert.equal(closeout.observedBridgeOutcome.userIdObserved, true);
  assert.equal(closeout.observedBridgeOutcome.loginSessionIdObserved, true);
  assert.equal(closeout.observedBridgeOutcome.rawCredentialRecorded, false);
  assert.equal(closeout.observedBridgeOutcome.rawPasswordRecorded, false);
});

test('scheduler closeout avoided duplicate execution', () => {
  assert.equal(closeout.schedulerCloseout.oneShotAutomationId, 'cad-upload-session-0100z-qualification-run');
  assert.equal(closeout.schedulerCloseout.schedulerEvidenceObservedBeforeFallback, false);
  assert.equal(closeout.schedulerCloseout.schedulerDeletedBeforeManualFallback, true);
  assert.equal(closeout.schedulerCloseout.duplicateRunAvoided, true);
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
  assert.match(markdown, /No retry or second run was performed/);
  assert.match(markdown, /raw password recorded: false/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});
