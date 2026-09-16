const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.json');
const plan = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunPlan.json');
const { buildUploadAdmissionDevelopmentDryRunEvidencePreview } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor');

const root = path.resolve(__dirname, '..');

test('executor preview validates the dry-run plan without executing live work', async () => {
  const preview = await buildUploadAdmissionDevelopmentDryRunEvidencePreview(executor, plan);
  assert.equal(preview.structureValid, true);
  assert.equal(preview.decision, 'DEVELOPMENT_DRY_RUN_EXECUTOR_PREVIEW_READY');
  assert.equal(preview.developmentDryRunExecuted, false);
  assert.equal(preview.liveRunAuthorizedNow, false);
  assert.equal(preview.developmentStoreMutationAuthorizedNow, false);
  assert.equal(preview.bodyAdmissionAuthorized, false);
  assert.equal(preview.sourceOnlyPreviewPasses, true);
  assert.equal(preview.sanitizedEvidenceTemplateReady, true);
});

test('executor manifest preserves all safety authorities closed', () => {
  assert.equal(executor.mode, 'source-only-cad-upload-admission-development-dry-run-executor');
  assert.equal(executor.executorCapabilities.sourceOnlyPreview, true);
  assert.equal(executor.executorCapabilities.liveDevelopmentRun, false);
  assert.equal(executor.executorCapabilities.developmentStoreMutationAuthorizedNow, false);
  assert.equal(executor.executorCapabilities.bodyAdmissionAuthorized, false);
  assert.equal(executor.executorCapabilities.cadUploadActivationAuthorized, false);
  assert.equal(executor.executorCapabilities.cadConversionAuthorized, false);
  assert.equal(executor.executorCapabilities.sandboxDispatchAuthorized, false);
  assert.ok(Object.values(executor.authorityPreserved).every(value => value === false));
});

test('executor guards remain one-attempt, no-retry, no-delete and capped', () => {
  assert.equal(executor.runGuards.maxAttempts, 1);
  assert.equal(executor.runGuards.automaticRetry, false);
  assert.equal(executor.runGuards.secondRun, false);
  assert.equal(executor.runGuards.stopOnUnknownOutcome, true);
  assert.equal(executor.runGuards.deleteRetainedState, false);
  assert.equal(executor.runGuards.allInPlanningCapUsd, 50);
  assert.equal(executor.runGuards.backupCustodian, 'Amina');
});

test('sanitized evidence template cannot record private values or CAD bytes', () => {
  assert.equal(executor.sanitizedEvidenceTemplate.recordsPrivateValues, false);
  assert.equal(executor.sanitizedEvidenceTemplate.recordsCadBytes, false);
  assert.equal(executor.sanitizedEvidenceTemplate.recordsRawCredential, false);
  assert.equal(executor.sanitizedEvidenceTemplate.recordsPrivateCad, false);
  assert.equal(executor.sanitizedEvidenceTemplate.recordsOnlyRefsAndDigests, true);
  assert.equal(executor.sanitizedEvidenceTemplate.modeLockedOutputRequired, true);
  assert.equal(executor.sanitizedEvidenceTemplate.gitIgnoredOutputRequired, true);
});

test('mounted route remains isolated from dry-run executor source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentDryRunExecutor|cad-upload-admission-development-dry-run-executor/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('executor source remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentDryRunExecutor.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
