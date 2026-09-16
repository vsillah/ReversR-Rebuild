const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acceptance = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.json');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.json');
const plan = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.json');
const { inspectUploadAdmissionDevelopmentDryRunAcceptance } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance');

const root = path.resolve(__dirname, '..');

test('acceptance packet validates executor preview and exact future window', async () => {
  const result = await inspectUploadAdmissionDevelopmentDryRunAcceptance(acceptance, executor, plan);
  assert.equal(result.structureValid, true);
  assert.equal(result.executorPreviewAccepted, true);
  assert.equal(result.windowValid, true);
  assert.equal(result.boundsValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForAutopilotDevelopmentRun, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
});

test('run bounds preserve disabled upload and no retry behavior', () => {
  assert.equal(acceptance.runBounds.developmentDeployment, 'majestic-alligator-31');
  assert.equal(acceptance.runBounds.project, 'reversr-cad-auth-dev');
  assert.equal(acceptance.runBounds.maxAttempts, 1);
  assert.equal(acceptance.runBounds.automaticRetry, false);
  assert.equal(acceptance.runBounds.secondRun, false);
  assert.equal(acceptance.runBounds.stopOnUnknownOutcome, true);
  assert.equal(acceptance.runBounds.deleteRetainedState, false);
  assert.equal(acceptance.runBounds.bodyAdmissionAuthorized, false);
  assert.equal(acceptance.runBounds.cadUploadActivationAuthorized, false);
  assert.equal(acceptance.runBounds.cadConversionAuthorized, false);
  assert.equal(acceptance.runBounds.sandboxDispatchAuthorized, false);
});

test('sanitized evidence destination is ignored local state only', () => {
  assert.equal(acceptance.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-admission-development-dry-run-0415z');
  assert.equal(acceptance.sanitizedEvidenceDestination.gitIgnoredRequired, true);
  assert.equal(acceptance.sanitizedEvidenceDestination.directoryMode, '700');
  assert.equal(acceptance.sanitizedEvidenceDestination.fileMode, '600');
  assert.equal(acceptance.custody.backupCustodian, 'Amina');
  assert.equal(acceptance.custody.rollbackTarget, 'USER_UPLOADS_DISABLED');
});

test('authority remains closed by this source-only acceptance packet', () => {
  assert.equal(acceptance.authorityPreservedByThisPacket.liveDevelopmentRunAuthorizedNow, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.cadUploadActivationAuthorized, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.cadConversionAuthorized, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.sandboxDispatchAuthorized, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.privateCadAuthorized, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.retryAuthorized, false);
  assert.equal(acceptance.authorityPreservedByThisPacket.secondRunAuthorized, false);
  assert.ok(Object.values(acceptance.authorityPreservedByThisPacket).every(value => value === false));
});

test('mounted route remains isolated from dry-run acceptance source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentDryRunAcceptance|cad-upload-admission-development-dry-run-acceptance/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('acceptance inspector remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentDryRunAcceptance.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
