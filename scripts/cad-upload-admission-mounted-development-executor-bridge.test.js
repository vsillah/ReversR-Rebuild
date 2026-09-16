const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridge = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.json');
const windowPacket = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json');
const readiness = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
const docsSummary = require('../docs/cad-upload-admission-mounted-development-executor-bridge.json');
const { inspectUploadAdmissionMountedDevelopmentExecutorBridge } =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge');
const { executeUploadAdmissionMountedDevelopmentWindow } =
  require('./run-cad-upload-admission-mounted-development-window');

const root = path.resolve(__dirname, '..');

test('executor bridge binds the accepted mounted-development window and readiness packet', () => {
  const result = inspectUploadAdmissionMountedDevelopmentExecutorBridge(bridge, windowPacket, readiness);
  assert.equal(result.structureValid, true);
  assert.equal(result.windowBound, true);
  assert.equal(result.readinessBound, true);
  assert.equal(result.bridgeValid, true);
  assert.equal(result.readyForMountedDevelopmentRun, true);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
  assert.equal(bridge.acceptedWindow.runRef, 'rrb-ref:cad-upload-admission-mounted-development-1800z');
  assert.equal(bridge.acceptedWindow.windowMergeCommit, '816c773a128a3d44ba26ce54227fa45be1db8d1b');
});

test('mounted-development runner blocks outside the accepted window and succeeds in simulated window', async () => {
  const before = await executeUploadAdmissionMountedDevelopmentWindow({
    now: () => Date.parse('2026-09-16T17:59:59Z'),
    writeEvidence: false,
  });
  assert.equal(before.decision, 'BLOCKED');
  assert.equal(before.code, 'WINDOW_NOT_OPEN');
  assert.equal(before.unknownOutcome, false);

  const result = await executeUploadAdmissionMountedDevelopmentWindow({
    now: () => Date.parse('2026-09-16T18:00:05Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.bodyAdmissionValidated, true);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.counts.mountedRouteDisabledChecks, 2);
  assert.equal(result.counts.mountedDevelopmentBodyValidationChecks, 1);
  assert.equal(result.counts.conversionDispatches, 0);
  assert.equal(result.counts.sandboxDispatches, 0);
  assert.equal(result.counts.storeMutations, 0);

  const after = await executeUploadAdmissionMountedDevelopmentWindow({
    now: () => Date.parse('2026-09-16T18:15:00Z'),
    writeEvidence: false,
  });
  assert.equal(after.decision, 'BLOCKED');
  assert.equal(after.code, 'WINDOW_EXPIRED');
});

test('tracked route remains source-closed and isolated from executor bridge source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route,
    /uploadAdmissionMountedDevelopmentExecutorBridge|run-cad-upload-admission-mounted-development-window/);
});

test('bounds and authorities stay closed by this source-only bridge', () => {
  const result = inspectUploadAdmissionMountedDevelopmentExecutorBridge(bridge, windowPacket, readiness);
  assert.equal(result.boundsValid, true);
  assert.equal(result.expectedResultValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(bridge.runBounds.maxAttempts, 1);
  assert.equal(bridge.runBounds.automaticRetry, false);
  assert.equal(bridge.runBounds.secondRun, false);
  assert.equal(bridge.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(bridge.runBounds.cadConversionAuthorized, false);
  assert.equal(bridge.runBounds.sandboxDispatchAuthorized, false);
  for (const [gate, value] of Object.entries(bridge.authorityPreservedByThisPacket)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('docs summary points to one bounded future run without live authority', () => {
  assert.equal(docsSummary.source, 'offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.json');
  assert.equal(docsSummary.runner, 'scripts/run-cad-upload-admission-mounted-development-window.js');
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.match(docsSummary.nextSafeAction, /one bounded development-only mounted upload-admission run/);
});
