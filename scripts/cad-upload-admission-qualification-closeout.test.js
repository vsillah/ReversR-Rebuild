const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const closeout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const { inspectUploadAdmissionQualificationCloseout } =
  require('../offline/cad-convex/uploadAdmissionQualificationCloseout');

const root = path.resolve(__dirname, '..');

test('qualification closeout records successful executor-gate run and evidence hashes', () => {
  const result = inspectUploadAdmissionQualificationCloseout(closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.hashesValid, true);
  assert.equal(result.fixtureValid, true);
  assert.equal(result.resultValid, true);
  assert.equal(closeout.result.decision, 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED');
  assert.equal(closeout.result.runCompleted, true);
  assert.equal(closeout.result.unknownOutcome, false);
  assert.equal(closeout.evidence.sanitizedEvidenceSha256,
    'cb4619a7b0c34731047f6493a4c74d5e1ffb3cf598c1a7a6117e0525318f9ffd');
  assert.equal(closeout.evidence.sanitizedReceiptSha256,
    '176440f7c579ff709dcd8ca30ea3dad41200d7c01658a10064ccfeafc66024b4');
});

test('qualification result preserves disabled production upload admission', () => {
  const result = inspectUploadAdmissionQualificationCloseout(closeout);
  const router = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.equal(result.preflightClosed, true);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.equal(closeout.result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(closeout.result.mountedRouteDisabledChecks, 2);
  assert.equal(closeout.result.isolatedRouteBodyValidationChecks, 1);
  assert.equal(closeout.result.uploadBodyValidated, true);
});

test('qualification closeout records no conversion, Sandbox, store mutation or retry', () => {
  const result = inspectUploadAdmissionQualificationCloseout(closeout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.schedulerClosed, true);
  assert.equal(closeout.result.conversionDispatches, 0);
  assert.equal(closeout.result.sandboxDispatches, 0);
  assert.equal(closeout.result.storeMutations, 0);
  assert.equal(closeout.scheduler.automaticRetry, false);
  assert.equal(closeout.scheduler.secondRun, false);
});

test('closeout documents remaining gates without authorizing activation', () => {
  assert.deepEqual(closeout.remainingGatesBeforeActivation, [
    'source-reviewed development upload activation decision packet with exact rollback',
    'development-only admission activation using synthetic or public fixture only',
    'post-admission reconciliation with no unknown outcome',
    'separate conversion and Sandbox qualification packet',
    'manual production activation gate',
  ]);
  assert.equal(closeout.nextSafeAction.type, 'source-only-readiness');
  assert.match(closeout.nextSafeAction.stopBefore, /production upload activation/);
  assert.match(closeout.nextSafeAction.stopBefore, /CAD conversion/);
});

test('closeout source remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionQualificationCloseout.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
