const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const windowPacket = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationWindow.json');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationExecutor.json');
const decision = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision.json');
const closeout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const { inspectUploadAdmissionDevelopmentActivationWindow } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationWindow');

const root = path.resolve(__dirname, '..');

test('activation window packet validates accepted executor preview and exact future window', () => {
  const result = inspectUploadAdmissionDevelopmentActivationWindow(windowPacket, executor, decision, closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.executorPreviewAccepted, true);
  assert.equal(result.decisionAccepted, true);
  assert.equal(result.closeoutAccepted, true);
  assert.equal(result.windowValid, true);
  assert.equal(result.boundsValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForAutopilotDevelopmentPreview, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
});

test('run bounds preserve disabled upload and no retry behavior', () => {
  assert.equal(windowPacket.runBounds.developmentProject, 'reversr-cad-auth-dev');
  assert.equal(windowPacket.runBounds.developmentDeployment, 'majestic-alligator-31');
  assert.equal(windowPacket.runBounds.maxAttempts, 1);
  assert.equal(windowPacket.runBounds.automaticRetry, false);
  assert.equal(windowPacket.runBounds.secondRun, false);
  assert.equal(windowPacket.runBounds.stopOnUnknownOutcome, true);
  assert.equal(windowPacket.runBounds.deleteRetainedState, false);
  assert.equal(windowPacket.runBounds.bodyAdmissionAuthorized, false);
  assert.equal(windowPacket.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(windowPacket.runBounds.cadConversionAuthorized, false);
  assert.equal(windowPacket.runBounds.sandboxDispatchAuthorized, false);
});

test('sanitized evidence destination is ignored local state only', () => {
  assert.equal(windowPacket.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-admission-development-activation-1215z');
  assert.equal(windowPacket.sanitizedEvidenceDestination.gitIgnoredRequired, true);
  assert.equal(windowPacket.sanitizedEvidenceDestination.directoryMode, '700');
  assert.equal(windowPacket.sanitizedEvidenceDestination.fileMode, '600');
  assert.equal(windowPacket.custody.backupCustodian, 'Amina');
  assert.equal(windowPacket.custody.testerReviewer, 'Mark');
  assert.equal(windowPacket.custody.rollbackTarget, 'USER_UPLOADS_DISABLED');
});

test('authority remains closed by this source-only activation window packet', () => {
  assert.equal(windowPacket.authorityPreservedByThisPacket.liveDevelopmentRunAuthorizedNow, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.cadUploadActivationAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.productionUploadActivationAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.cadConversionAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.sandboxDispatchAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.privateCadAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.retryAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.secondRunAuthorized, false);
  assert.ok(Object.values(windowPacket.authorityPreservedByThisPacket).every(value => value === false));
});

test('mounted route remains isolated from activation window source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentActivationWindow|cad-upload-admission-development-activation-window/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('activation window inspector remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentActivationWindow.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
