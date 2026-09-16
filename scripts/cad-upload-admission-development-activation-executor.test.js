const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationExecutor.json');
const decision = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision.json');
const { inspectUploadAdmissionDevelopmentActivationExecutor } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationExecutor');
const { executeUploadAdmissionDevelopmentActivationPreview } =
  require('./run-cad-upload-admission-development-activation-executor');

const root = path.resolve(__dirname, '..');

test('development activation executor manifest binds decision packet and remains source-only', () => {
  const result = inspectUploadAdmissionDevelopmentActivationExecutor(manifest, decision);
  assert.equal(result.structureValid, true);
  assert.equal(result.bindingsValid, true);
  assert.equal(result.boundsClosed, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(manifest.liveRunAuthorizedByThisPacket, false);
});

test('development activation preview executes without authorizing admission or body reads', async () => {
  const result = await executeUploadAdmissionDevelopmentActivationPreview({
    now: () => Date.parse('2026-09-16T11:25:00Z'),
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_DEVELOPMENT_ACTIVATION_EXECUTOR_PREVIEWED');
  assert.equal(result.code, 'SOURCE_ONLY_DEVELOPMENT_ACTIVATION_PREVIEW');
  assert.equal(result.previewCompleted, true);
  assert.equal(result.activationExecuted, false);
  assert.equal(result.liveRunStarted, false);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.runtimeMounted, false);
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal(result.admissionAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.storeMutationAuthorized, false);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.deepEqual(result.counts, {
    uploadBodiesRead: 0,
    conversionDispatches: 0,
    sandboxDispatches: 0,
    storeMutations: 0,
  });
});

test('preview rejects missing accepted qualification closeout', async () => {
  const result = await executeUploadAdmissionDevelopmentActivationPreview({
    qualificationCloseout: { result: { decision: 'NOT_ACCEPTED' } },
  });
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.code, 'QUALIFICATION_CLOSEOUT_NOT_ACCEPTED');
  assert.equal(result.unknownOutcome, false);
});

test('mounted route remains disabled and does not import preview runner', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /run-cad-upload-admission-development-activation-executor|uploadAdmissionDevelopmentActivationExecutor/);
});

test('executor source stays provider-free and secret-free', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/run-cad-upload-admission-development-activation-executor.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser|console\.|sendgrid|twilio|slack/i);
});
