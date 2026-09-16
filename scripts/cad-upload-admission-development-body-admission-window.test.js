const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const windowPacket = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.json');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json');
const bodyPacket = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
const docSummary = require('../docs/cad-upload-admission-development-body-admission-window.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionWindow } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow');
const { executeUploadAdmissionDevelopmentBodyAdmissionWindow } =
  require('./run-cad-upload-admission-development-body-admission-window');

const root = path.resolve(__dirname, '..');

test('body-admission window packet validates accepted executor and exact future window', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionWindow(windowPacket, executor, bodyPacket);
  assert.equal(result.structureValid, true);
  assert.equal(result.executorAccepted, true);
  assert.equal(result.bodyPacketAccepted, true);
  assert.equal(result.windowValid, true);
  assert.equal(result.boundsValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForAutopilotDevelopmentBodyAdmissionRun, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
});

test('window and evidence destination are bound to the 16:30Z run', () => {
  assert.equal(windowPacket.acceptedWindow.runRef,
    'rrb-ref:cad-upload-admission-development-body-admission-1630z');
  assert.equal(windowPacket.acceptedWindow.startUtc, '2026-09-16T16:30:00Z');
  assert.equal(windowPacket.acceptedWindow.expiresUtc, '2026-09-16T16:45:00Z');
  assert.equal(windowPacket.acceptedWindow.maxRunSeconds, 900);
  assert.equal(windowPacket.acceptedWindow.scheduleIfMoreThanFiveMinutesAway, true);
  assert.equal(windowPacket.acceptedWindow.evidenceRoot,
    '.local/cad-convex/upload-admission-development-body-admission-1630z');
  assert.equal(windowPacket.sanitizedEvidenceDestination.root, windowPacket.acceptedWindow.evidenceRoot);
  assert.equal(windowPacket.sanitizedEvidenceDestination.directoryMode, '700');
  assert.equal(windowPacket.sanitizedEvidenceDestination.fileMode, '600');
});

test('run bounds preserve disabled production route and no retry behavior', () => {
  assert.equal(windowPacket.runBounds.developmentProject, 'reversr-cad-auth-dev');
  assert.equal(windowPacket.runBounds.developmentDeployment, 'majestic-alligator-31');
  assert.equal(windowPacket.runBounds.maxAttempts, 1);
  assert.equal(windowPacket.runBounds.automaticRetry, false);
  assert.equal(windowPacket.runBounds.secondRun, false);
  assert.equal(windowPacket.runBounds.stopOnUnknownOutcome, true);
  assert.equal(windowPacket.runBounds.deleteRetainedState, false);
  assert.equal(windowPacket.runBounds.isolatedRouteBodyAdmissionDuringWindow, true);
  assert.equal(windowPacket.runBounds.mountedProductionBodyAdmissionAuthorized, false);
  assert.equal(windowPacket.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(windowPacket.runBounds.cadConversionAuthorized, false);
  assert.equal(windowPacket.runBounds.sandboxDispatchAuthorized, false);
});

test('window runner blocks before the accepted window and can execute in simulated window', async () => {
  const before = await executeUploadAdmissionDevelopmentBodyAdmissionWindow({
    now: () => Date.parse('2026-09-16T16:29:59Z'),
    writeEvidence: false,
  });
  assert.equal(before.decision, 'BLOCKED');
  assert.equal(before.code, 'WINDOW_NOT_OPEN');
  assert.equal(before.unknownOutcome, false);

  const result = await executeUploadAdmissionDevelopmentBodyAdmissionWindow({
    now: () => Date.parse('2026-09-16T16:30:05Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.bodyAdmissionValidated, true);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.counts.mountedRouteDisabledChecks, 2);
  assert.equal(result.counts.isolatedRouteBodyValidationChecks, 1);
  assert.equal(result.counts.conversionDispatches, 0);
  assert.equal(result.counts.sandboxDispatches, 0);
  assert.equal(result.counts.storeMutations, 0);

  const after = await executeUploadAdmissionDevelopmentBodyAdmissionWindow({
    now: () => Date.parse('2026-09-16T16:45:00Z'),
    writeEvidence: false,
  });
  assert.equal(after.decision, 'BLOCKED');
  assert.equal(after.code, 'WINDOW_EXPIRED');
});

test('authority remains closed by this source-only window packet', () => {
  assert.equal(windowPacket.authorityPreservedByThisPacket.liveDevelopmentRunAuthorizedNow, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.cadUploadActivationAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.productionUploadActivationAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.mountedProductionBodyAdmissionAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.cadConversionAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.sandboxDispatchAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.privateCadAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.retryAuthorized, false);
  assert.equal(windowPacket.authorityPreservedByThisPacket.secondRunAuthorized, false);
  assert.ok(Object.values(windowPacket.authorityPreservedByThisPacket).every(value => value === false));
});

test('mounted route remains isolated from body-admission window source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentBodyAdmissionWindow|cad-upload-admission-development-body-admission-window/);
});

test('docs summary points to one bounded run and not production activation', () => {
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.json');
  assert.equal(docSummary.windowStartUtc, '2026-09-16T16:30:00Z');
  assert.equal(docSummary.windowEndUtc, '2026-09-16T16:45:00Z');
  assert.equal(docSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docSummary.productionUploadActivationAuthorized, false);
  assert.match(docSummary.nextSafeAction, /one bounded development-only body-admission execution/);
});
