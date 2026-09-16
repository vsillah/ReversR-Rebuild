const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const plan = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.json');
const runtimeSource = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json');
const closeout = require('../docs/cad-dev-upload-session-successful-closeout.json');
const { inspectUploadAdmissionDevelopmentDryRunPlan } = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan');

const root = path.resolve(__dirname, '..');

test('development dry-run plan is source-only and not accepted for live execution', async () => {
  const result = await inspectUploadAdmissionDevelopmentDryRunPlan(plan);
  assert.equal(result.structureValid, true);
  assert.equal(result.sourceOnlyPreviewPasses, true);
  assert.equal(result.previewCode, 'SOURCE_ONLY_CONTROLLED');
  assert.equal(result.readyForLiveRun, false);
  assert.equal(result.readyForUploadActivation, false);
  assert.equal(result.readyForSourceExecutorFollowUp, true);
});

test('plan binds validated upload-session closeout and runtime bridge source', () => {
  assert.equal(plan.sourceBindings.runtimeBridgeSource, 'server/cadUploadAdmissionRuntimeBridge.js');
  assert.equal(plan.sourceBindings.runtimeBridgeSourceManifest, 'offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json');
  assert.equal(plan.sourceBindings.uploadSessionCloseout, 'docs/cad-dev-upload-session-successful-closeout.json');
  assert.equal(runtimeSource.nextSafeAction.branch, 'codex/cad-upload-admission-development-dry-run-plan');
  assert.equal(closeout.runResult.decision, 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.cadUploadsDisabled, true);
  assert.equal(closeout.runResult.bodyAdmissionAuthorized, false);
});

test('plan preserves cap, one-attempt and no-delete rollback custody', () => {
  assert.equal(plan.costAndUsage.allInPlanningCapUsd, 50);
  assert.equal(plan.costAndUsage.currency, 'USD');
  assert.equal(plan.syntheticDryRun.maxAttempts, 1);
  assert.equal(plan.syntheticDryRun.automaticRetry, false);
  assert.equal(plan.syntheticDryRun.secondRun, false);
  assert.equal(plan.syntheticDryRun.stopOnUnknownOutcome, true);
  assert.equal(plan.rollbackAndCustody.deleteRetainedState, false);
  assert.equal(plan.rollbackAndCustody.backupCustodian, 'Amina');
  assert.equal(plan.rollbackAndCustody.rollbackTarget, 'USER_UPLOADS_DISABLED');
});

test('plan authorizes no live mutation or activation', () => {
  assert.equal(plan.syntheticDryRun.acceptedNow, false);
  assert.equal(plan.syntheticDryRun.liveRunAuthorizedNow, false);
  assert.equal(plan.syntheticDryRun.developmentStoreMutationAuthorizedNow, false);
  assert.equal(plan.syntheticDryRun.bodyAdmissionAuthorized, false);
  assert.equal(plan.previewExpectation.storeMutationAuthorized, false);
  assert.ok(Object.values(plan.authorityPreserved).every(value => value === false));
});

test('mounted route remains isolated from the development dry-run plan', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentDryRunPlan|cad-upload-admission-development-dry-run-plan/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('dry-run plan inspector remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
