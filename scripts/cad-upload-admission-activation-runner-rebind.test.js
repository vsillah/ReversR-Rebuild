const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rebind = require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind.json');
const rollover = require('../offline/cad-convex/uploadAdmissionActivationWindowRollover.json');
const refresh = require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json');
const closeout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-activation-runner-rebind.json');
const { inspectUploadAdmissionActivationRunnerRebind } =
  require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind');
const { compatibilityBridge, compatibilityWindow, executeUploadActivationExactWindow } =
  require('./run-cad-upload-activation-exact-window');

const root = path.resolve(__dirname, '..');

test('activation runner rebind binds the PR 292 rollover window and accepted evidence', () => {
  const result = inspectUploadAdmissionActivationRunnerRebind(rebind, rollover, refresh, closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.rolloverWindowBound, true);
  assert.equal(result.refreshBound, true);
  assert.equal(result.closeoutBound, true);
  assert.equal(result.runnerValid, true);
  assert.equal(result.readyForWindowExecution, true);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
  assert.equal(rebind.acceptedRollover.sourcePr, 292);
  assert.equal(rebind.acceptedRollover.rolloverMergeCommit,
    '11f45049f1ce138c887482d5d68d25d9642e7284');
});

test('compatibility config maps the reviewed mounted harness to the 22:30Z rollover window', () => {
  const bridge = compatibilityBridge();
  const windowPacket = compatibilityWindow();
  assert.equal(bridge.acceptedWindow.runRef, 'rrb-ref:cad-upload-activation-window-rollover-2230z');
  assert.equal(bridge.acceptedWindow.startUtc, '2026-09-16T22:30:00Z');
  assert.equal(bridge.acceptedWindow.expiresUtc, '2026-09-16T23:00:00Z');
  assert.equal(windowPacket.acceptedWindow.runRef, bridge.acceptedWindow.runRef);
  assert.equal(windowPacket.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-activation-window-rollover-2230z');
  assert.equal(bridge.executorCapabilities.trackedRouteModified, false);
});

test('runner blocks outside the accepted window and succeeds in simulated window', async () => {
  const before = await executeUploadActivationExactWindow({
    now: () => Date.parse('2026-09-16T22:29:59Z'),
    writeEvidence: false,
  });
  assert.equal(before.decision, 'BLOCKED');
  assert.equal(before.code, 'WINDOW_NOT_OPEN');
  assert.equal(before.unknownOutcome, false);

  const result = await executeUploadActivationExactWindow({
    now: () => Date.parse('2026-09-16T22:30:05Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.runRef, 'rrb-ref:cad-upload-activation-window-rollover-2230z');
  assert.equal(result.bodyAdmissionValidated, true);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.counts.mountedRouteDisabledChecks, 2);
  assert.equal(result.counts.mountedDevelopmentBodyValidationChecks, 1);
  assert.equal(result.counts.conversionDispatches, 0);
  assert.equal(result.counts.sandboxDispatches, 0);
  assert.equal(result.counts.storeMutations, 0);

  const after = await executeUploadActivationExactWindow({
    now: () => Date.parse('2026-09-16T23:00:00Z'),
    writeEvidence: false,
  });
  assert.equal(after.decision, 'BLOCKED');
  assert.equal(after.code, 'WINDOW_EXPIRED');
});

test('tracked route remains source-closed and isolated from activation runner source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route,
    /uploadAdmissionActivationRunnerRebind|run-cad-upload-activation-exact-window/);
});

test('bounds and authorities stay closed by this source-only rebind', () => {
  const result = inspectUploadAdmissionActivationRunnerRebind(rebind, rollover, refresh, closeout);
  assert.equal(result.boundsValid, true);
  assert.equal(result.expectedResultValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(rebind.runBounds.maxAttempts, 1);
  assert.equal(rebind.runBounds.automaticRetry, false);
  assert.equal(rebind.runBounds.secondRun, false);
  assert.equal(rebind.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(rebind.runBounds.cadConversionAuthorized, false);
  assert.equal(rebind.runBounds.sandboxDispatchAuthorized, false);
  for (const [gate, value] of Object.entries(rebind.authorityPreservedByThisPacket)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('docs summary points to one future bounded development run without production authority', () => {
  const markdown = fs.readFileSync(
    path.join(root, 'docs/cad-upload-admission-activation-runner-rebind.md'),
    'utf8',
  );
  assert.equal(docsSummary.source, 'offline/cad-convex/uploadAdmissionActivationRunnerRebind.json');
  assert.equal(docsSummary.runner, 'scripts/run-cad-upload-activation-exact-window.js');
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.match(docsSummary.nextSafeAction, /one bounded development-only synthetic upload activation run/);
  assert.match(markdown, /No live run happened/i);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
});
