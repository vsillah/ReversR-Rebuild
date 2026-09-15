const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const closeout = JSON.parse(fs.readFileSync(
  'docs/cad-dev-auth-session-run-closeout.json',
  'utf8',
));
const rebind = JSON.parse(fs.readFileSync(
  'docs/cad-dev-auth-session-immediate-rebind.json',
  'utf8',
));
const markdown = fs.readFileSync('docs/cad-dev-auth-session-run-closeout.md', 'utf8');
const binding = fs.readFileSync('convex/cadDevAuthQualificationBinding.ts', 'utf8');

test('Auth/session closeout binds the completed immediate-rebind development run', () => {
  assert.equal(closeout.mode, 'source-only-cad-dev-auth-session-run-closeout');
  assert.equal(closeout.status, 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.developmentDeployment, 'majestic-alligator-31');
  assert.equal(closeout.mergedMainCommit, 'e4fed4ceadc20f193978ce7255889805f11da954');
  assert.equal(closeout.executorRebindCommit, '384ecff361d82e3b945f5550b8557c315b45d1a0');
  assert.equal(closeout.sourcePr, 244);
  assert.equal(closeout.runId, rebind.runId);
  assert.equal(closeout.window.startUtc, rebind.window.startUtc);
  assert.equal(closeout.window.endUtc, rebind.window.endUtc);
  assert.deepEqual(closeout.acceptedEvidence, {
    projectionSha256: rebind.acceptedProjectionSha256,
    acceptanceReceiptSha256: rebind.acceptanceReceiptSha256,
    privateRegisterSha256: rebind.privateRegisterSha256,
    runKeySha256: rebind.runKeySha256,
  });
});

test('run evidence records completed state without upload, conversion, retry or production authority', () => {
  assert.equal(closeout.runResult.decision, 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.evidenceWritten, true);
  assert.equal(closeout.runResult.automaticRetry, false);
  assert.equal(closeout.runResult.secondRun, false);
  assert.equal(closeout.runResult.cadUploadAllowed, false);
  assert.equal(closeout.runResult.conversionAllowed, false);
  assert.equal(closeout.runResult.privateCadUsed, false);
  assert.equal(closeout.runResult.productionTouched, false);
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    '7cbb352cdefd3d190e30db67cd22c31a3712f5728addfc5024e37511ba161203');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '55f4b45bd74bc051ba8217f2b4946736bc27f5993c064a8e3ca8aa6bcbbd7ee0');
  assert.equal(closeout.sanitizedRunEvidence.gitIgnored, true);
  assert.equal(closeout.sanitizedRunEvidence.modeLocked, true);
  assert.equal(closeout.sanitizedRunEvidence.privatePatternLeakObserved, false);
});

test('operation counts match the bounded synthetic Auth/session sequence', () => {
  assert.equal(closeout.operationCounts.provisioned, 2);
  assert.equal(closeout.operationCounts.signIns, 2);
  assert.equal(closeout.operationCounts.exactSessionReads, 4);
  assert.equal(closeout.operationCounts.signOuts, 1);
  assert.equal(closeout.operationCounts.revocations, 1);
  assert.equal(closeout.operationCounts.userIdsObserved, 2);
  assert.equal(closeout.operationCounts.sessionIdsObserved, 2);
});

test('post-run binding is disabled and the executable run tuple is cleared', () => {
  assert.equal(closeout.postRunBindingDisposition.bindingDisabled, true);
  assert.equal(closeout.postRunBindingDisposition.runTupleCleared, true);
  assert.equal(closeout.postRunBindingDisposition.futureRunsRequireNewSourceRebind, true);
  assert.match(binding, /enabled: false/);
  assert.match(binding, /mode: 'cad-dev-auth-session-disabled-post-run-closeout'/);
  for (const field of [
    'runId',
    'runKeySha256',
    'acceptedProjectionSha256',
    'acceptanceReceiptSha256',
    'windowStartMs',
    'windowEndMs',
  ]) {
    assert.match(binding, new RegExp(`${field}: null`));
  }
  assert.doesNotMatch(binding, new RegExp(rebind.runKeySha256));
  assert.match(binding, /deleteUsersOrAccounts: false/);
  assert.match(binding, /retainUsersAndAccounts: true/);
});

test('closeout grants no activation, provider, mutation, retry or external-message authority', () => {
  for (const [gate, value] of Object.entries(closeout.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('development-only synthetic CAD upload qualification with disabled-gate evidence'));
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('separate production CAD upload activation approval'));
  assert.match(markdown, /does not\s+prove user-facing CAD upload readiness/i);
  assert.match(markdown, /future runs require a\s+new reviewed source rebind/i);
  assert.doesNotMatch(markdown + JSON.stringify(closeout), /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});
