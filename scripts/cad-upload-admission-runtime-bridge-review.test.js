const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const review = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeReview.json');
const bridgeManifest = require('../offline/cad-convex/uploadAdmissionGuardedRouteBridge.json');
const qualificationWindow = require('../docs/cad-upload-admission-qualification-window.json');
const {
  inspectUploadAdmissionRuntimeBridgeReview,
} = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeReview');

const root = path.resolve(__dirname, '..');
const routeSource = () => fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');

test('runtime bridge review preserves closed route and source-only authority', () => {
  const result = inspectUploadAdmissionRuntimeBridgeReview(review, routeSource());
  assert.equal(result.structureValid, true);
  assert.equal(result.authorityClosed, true);
  assert.equal(result.requirementsClosed, true);
  assert.equal(result.currentRouteStillClosed, true);
  assert.equal(result.readyForSourceOnlyBridgeFollowUp, true);
  assert.equal(result.readyForLiveRun, false);
  assert.equal(result.readyForUploadActivation, false);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
});

test('runtime bridge review binds the guarded bridge and closed qualification window', () => {
  assert.equal(review.sourceBindings.guardedBridgeModel, 'offline/cad-convex/uploadAdmissionGuardedRouteBridge.js');
  assert.equal(review.sourceBindings.guardedBridgeManifest, 'offline/cad-convex/uploadAdmissionGuardedRouteBridge.json');
  assert.equal(review.sourceBindings.qualificationWindow, 'docs/cad-upload-admission-qualification-window.json');
  assert.equal(review.sourceBindings.routeGate, 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED');
  assert.equal(bridgeManifest.enabled, false);
  assert.equal(bridgeManifest.runtimeMounted, false);
  assert.equal(bridgeManifest.bodyAdmissionAuthorized, false);
  assert.equal(bridgeManifest.nextSafeAction.branch, 'codex/cad-upload-admission-runtime-bridge-review');
  assert.equal(qualificationWindow.bodyAdmissionAuthorized, false);
  assert.equal(qualificationWindow.runtimeBridgeAvailableNow, false);
  assert.equal(qualificationWindow.qualificationBounds.allInPlanningCapUsd, 50);
});

test('runtime introduction requirements keep activation impossible in this packet', () => {
  assert.equal(review.runtimeBridgeCanBeIntroducedSafely, true);
  assert.equal(review.runtimeBridgeImplementedNow, false);
  assert.equal(review.runtimeBridgeMountedNow, false);
  assert.equal(review.bodyAdmissionAuthorized, false);
  assert.equal(review.reviewDecision.decision, 'SOURCE_ONLY_RUNTIME_BRIDGE_ALLOWED_AS_DISABLED_DEFAULT_FOLLOW_UP');
  assert.equal(review.nextSafeAction.branch, 'codex/cad-upload-admission-runtime-bridge-source');
  for (const [key, value] of Object.entries(review.runtimeIntroductionRequirements)) {
    assert.equal(value, true, key);
  }
  for (const [key, value] of Object.entries(review.authorityPreserved)) {
    assert.equal(value, false, key);
  }
});

test('server route has no runtime bridge import or body admission opening', () => {
  const source = routeSource();
  assert.match(source, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(source, /if \(!BODY_ADMISSION_AUTHORIZED\) return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(source, /uploadAdmissionGuardedRouteBridge|uploadAdmissionRuntimeBridge/);
  assert.doesNotMatch(source, /process\.env\.[A-Z0-9_]*BODY_ADMISSION|BODY_ADMISSION_AUTHORIZED\s*=\s*req\./);
});

test('runtime review source remains offline and cannot reach providers or stores', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionRuntimeBridgeReview.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
