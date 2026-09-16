const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const exactWindow = require('../offline/cad-convex/uploadAdmissionActivationExactWindow.json');
const refresh = require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json');
const closeout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-activation-exact-window.json');
const { inspectUploadAdmissionActivationExactWindow } =
  require('../offline/cad-convex/uploadAdmissionActivationExactWindow');

const root = path.resolve(__dirname, '..');

test('activation exact window binds PR 289 decision refresh and mounted closeout', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.refreshBound, true);
  assert.equal(result.closeoutBound, true);
  assert.equal(result.readyForSourceOnlyRunnerRebind, true);
  assert.equal(exactWindow.acceptedDecisionRefresh.sourcePr, 289);
  assert.equal(exactWindow.acceptedDecisionRefresh.decisionRefreshMergeCommit,
    'fbd8628efc52d9ec0df55f106c1b5ce0c6487cd5');
  assert.equal(exactWindow.acceptedMountedDevelopmentCloseout.evidenceSha256,
    'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75');
  assert.equal(exactWindow.acceptedMountedDevelopmentCloseout.receiptSha256,
    '915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a');
});

test('window and evidence destination are bound to the 20:30Z run', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.windowValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(exactWindow.acceptedWindow.runRef,
    'rrb-ref:cad-upload-activation-exact-window-2030z');
  assert.equal(exactWindow.acceptedWindow.startUtc, '2026-09-16T20:30:00Z');
  assert.equal(exactWindow.acceptedWindow.expiresUtc, '2026-09-16T20:45:00Z');
  assert.equal(exactWindow.acceptedWindow.maxRunSeconds, 900);
  assert.equal(exactWindow.acceptedWindow.scheduleIfMoreThanFiveMinutesAway, true);
  assert.equal(exactWindow.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-activation-exact-window-2030z');
});

test('runner rebind remains required before live development execution', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.runnerDispositionValid, true);
  assert.equal(exactWindow.runnerDisposition.existingMountedRunnerBoundToExpiredWindow, true);
  assert.equal(exactWindow.runnerDisposition.sourceOnlyRunnerRebindRequiredBeforeLiveRun, true);
  assert.equal(exactWindow.runnerDisposition.liveRunAuthorizedByThisPacket, false);
  assert.equal(exactWindow.nextSafeAction.branch, 'codex/cad-upload-activation-runner-rebind');
});

test('route gate stays source-closed and requires pre/post checks', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.routeGateValid, true);
  assert.equal(exactWindow.routeGate.requiredDisabledLiteral, 'const BODY_ADMISSION_AUTHORIZED = false;');
  assert.equal(exactWindow.routeGate.sourcePacketMayFlipLiteral, false);
  assert.equal(exactWindow.routeGate.preFlightDisabledCheckRequired, true);
  assert.equal(exactWindow.routeGate.postRunDisabledOrRollbackCheckRequired, true);
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route,
    /uploadAdmissionActivationExactWindow|cad-upload-admission-activation-exact-window/);
});

test('run bounds preserve one attempt, no retry and no conversion or Sandbox', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.boundsValid, true);
  assert.equal(exactWindow.runBounds.developmentProject, 'reversr-cad-auth-dev');
  assert.equal(exactWindow.runBounds.developmentDeployment, 'majestic-alligator-31');
  assert.equal(exactWindow.runBounds.maxAttempts, 1);
  assert.equal(exactWindow.runBounds.automaticRetry, false);
  assert.equal(exactWindow.runBounds.secondRun, false);
  assert.equal(exactWindow.runBounds.stopOnUnknownOutcome, true);
  assert.equal(exactWindow.runBounds.allInPlanningCapUsd, 50);
  assert.equal(exactWindow.runBounds.developmentUploadActivationAuthorizedNow, false);
  assert.equal(exactWindow.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(exactWindow.runBounds.cadConversionAuthorized, false);
  assert.equal(exactWindow.runBounds.sandboxDispatchAuthorized, false);
  assert.equal(exactWindow.runBounds.privateCadAuthorized, false);
  assert.equal(exactWindow.runBounds.realUsersAuthorized, false);
});

test('all authority flags remain closed by the exact-window packet', () => {
  const result = inspectUploadAdmissionActivationExactWindow(exactWindow, refresh, closeout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
  for (const [gate, value] of Object.entries(exactWindow.authorityPreservedByThisPacket)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('docs summary and markdown do not authorize live execution by themselves', () => {
  const markdown = fs.readFileSync(
    path.join(root, 'docs/cad-upload-admission-activation-exact-window.md'),
    'utf8',
  );
  assert.equal(docsSummary.source, 'offline/cad-convex/uploadAdmissionActivationExactWindow.json');
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.sourceOnlyRunnerRebindRequiredBeforeLiveRun, true);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.match(docsSummary.nextSafeAction, /source-only upload activation runner rebind/);
  assert.match(markdown, /does not authorize live execution by itself/i);
  assert.match(markdown, /source-only runner\s+rebind must be reviewed and merged/i);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
});

test('activation exact window inspector remains local and provider-free', () => {
  const source = fs.readFileSync(
    path.join(root, 'offline/cad-convex/uploadAdmissionActivationExactWindow.js'),
    'utf8',
  );
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
