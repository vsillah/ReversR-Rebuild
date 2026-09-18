const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const closeout = JSON.parse(fs.readFileSync(
  'docs/cad-browser-session-local-run-closeout.json',
  'utf8',
));
const markdown = fs.readFileSync(
  'docs/cad-browser-session-local-run-closeout.md',
  'utf8',
);

test('browser session closeout binds the merged local executor run', () => {
  assert.equal(closeout.mode, 'source-only-cad-browser-session-local-run-closeout');
  assert.equal(closeout.status, 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.mergedMainCommit, '45ed2802c221a29a38a0eb496631a8ca1278a62e');
  assert.equal(closeout.sourcePr, 319);
  assert.equal(closeout.executorRebindCommit, 'a48d5d3bd0caac6760fb865dc440870be3795d10');
  assert.equal(closeout.runId, 'cad-browser-session-local-executor-1100z');
  assert.deepEqual(closeout.window, {
    startUtc: '2026-09-18T11:00:00Z',
    endUtc: '2026-09-18T11:05:00Z',
    maxRunSeconds: 300,
  });
});

test('accepted binding and sanitized evidence hashes are source safe', () => {
  assert.equal(closeout.acceptedBinding.bindingSha256,
    'e81b3ae65857f23184ed1e29c84d91d18991373478dc9a4ad25bab1af9b43c55');
  assert.equal(closeout.acceptedBinding.acceptanceReceiptSha256,
    'ac5fd76db667463fd462ca7556063d4b9bbab914fdb4c946e623a9e2653a6c4c');
  assert.equal(closeout.acceptedBinding.tlsMaterialCommitted, false);
  assert.equal(closeout.acceptedBinding.trustStoreMutationAllowed, false);
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    'bc1df3f9e7f602c1ed4e827594ea4e448b234549ff0d5de703bc3b799d0e31df');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '394be079dd41f16f3b8948d7841aa1c8cc9e8dad285e0b4503d0a45706a34092');
  assert.equal(closeout.sanitizedRunEvidence.gitIgnored, true);
  assert.equal(closeout.sanitizedRunEvidence.directoryMode, '0700');
  assert.equal(closeout.sanitizedRunEvidence.fileMode, '0600');
  assert.equal(closeout.sanitizedRunEvidence.privatePatternLeakObserved, false);
});

test('run evidence records exactly one completed browser session qualification', () => {
  assert.equal(closeout.runResult.decision, 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.evidenceWritten, true);
  assert.equal(closeout.runResult.automaticRetry, false);
  assert.equal(closeout.runResult.secondRun, false);
  assert.equal(closeout.runResult.cadUploadsDisabled, true);
  assert.equal(closeout.runResult.bodyAdmissionAuthorized, false);
  assert.equal(closeout.runResult.conversionAllowed, false);
  assert.equal(closeout.runResult.sandboxDispatchAllowed, false);
  assert.equal(closeout.runResult.privateCadUsed, false);
  assert.equal(closeout.runResult.realUsersUsed, false);
  assert.equal(closeout.runResult.productionTouched, false);
  assert.equal(closeout.runResult.browserCookiesObserved, true);
});

test('operation counts preserve bodyless disabled-route controls', () => {
  assert.deepEqual(closeout.operationCounts, {
    issuerRequests: 1,
    disabledUploadRequests: 1,
    resolveAuthorizationCalls: 1,
    bodyReads: 0,
  });
});

test('host sandbox note is bounded and not treated as a qualification retry', () => {
  assert.equal(closeout.hostExecutionNote.sandboxListenAttemptFailedBeforeRun, true);
  assert.match(closeout.hostExecutionNote.sandboxListenError, /listen EPERM/);
  assert.equal(closeout.hostExecutionNote.evidenceWrittenBeforeEscalatedInvocation, false);
  assert.equal(closeout.hostExecutionNote.sameBindingAndReceiptUsedAfterEscalation, true);
  assert.equal(closeout.hostExecutionNote.executorCompletedInsideAcceptedWindow, true);
  assert.equal(closeout.authorityPreserved.retryAuthorized, false);
  assert.equal(closeout.authorityPreserved.secondRunAuthorized, false);
});

test('closeout grants no activation, provider, mutation, production or external-message authority', () => {
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
  assert.match(markdown, /No qualification retry or second browser\/session run was performed/);
  assert.match(markdown, /bodyReads`: 0/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
});
