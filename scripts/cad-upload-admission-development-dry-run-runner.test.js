const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner.json');
const {
  executeUploadAdmissionDevelopmentDryRun,
  inspectUploadAdmissionDevelopmentDryRunRunner,
} = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner');

const root = path.resolve(__dirname, '..');

test('runner binds the accepted 04:45Z dry-run window with all risky authorities closed', () => {
  const inspected = inspectUploadAdmissionDevelopmentDryRunRunner(config);
  assert.equal(inspected.structureValid, true);
  assert.equal(config.acceptedWindow.startUtc, '2026-09-16T04:45:00Z');
  assert.equal(config.acceptedWindow.expiresUtc, '2026-09-16T05:00:00Z');
  assert.equal(config.runBounds.maxAttempts, 1);
  assert.equal(config.runBounds.automaticRetry, false);
  assert.equal(config.runBounds.secondRun, false);
  assert.equal(config.runBounds.bodyAdmissionAuthorized, false);
  assert.equal(config.runBounds.cadUploadActivationAuthorized, false);
  assert.equal(config.runBounds.cadConversionAuthorized, false);
  assert.equal(config.runBounds.sandboxDispatchAuthorized, false);
  assert.ok(Object.values(config.authorityPreservedByThisPacket).every(value => value === false));
});

test('runner executes one local dry-run inside the accepted window', async () => {
  const result = await executeUploadAdmissionDevelopmentDryRun({
    config,
    now: () => Date.parse('2026-09-16T04:45:05Z'),
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_DEVELOPMENT_DRY_RUN_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.counts.disabledRouteChecks, 2);
  assert.equal(result.counts.syntheticReservations, 1);
  assert.equal(result.counts.revocationsWithoutDeletion, 1);
  assert.equal(result.counts.uploadBodiesRead, 0);
  assert.equal(result.flags.cadUploadActivationAuthorized, false);
  assert.equal(result.flags.cadConversionAuthorized, false);
  assert.equal(result.flags.sandboxDispatchAuthorized, false);
  assert.equal(result.evidence.recordsCadBytes, false);
});

test('runner blocks outside the accepted window and never retries', async () => {
  const before = await executeUploadAdmissionDevelopmentDryRun({
    config,
    now: () => Date.parse('2026-09-16T04:44:59Z'),
  });
  const after = await executeUploadAdmissionDevelopmentDryRun({
    config,
    now: () => Date.parse('2026-09-16T05:00:00Z'),
  });
  assert.equal(before.code, 'WINDOW_NOT_OPEN');
  assert.equal(after.code, 'WINDOW_EXPIRED');
  assert.equal(before.runCompleted, false);
  assert.equal(after.runCompleted, false);
});

test('runner source and CLI stay local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner.js'), 'utf8');
  const cli = fs.readFileSync(path.join(root, 'scripts/run-cad-upload-admission-development-dry-run.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser|console\./);
  assert.doesNotMatch(cli, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser/);
});

test('mounted upload route remains fail-closed and isolated from dry-run runner', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentDryRunRunner|run-cad-upload-admission-development-dry-run/);
});
