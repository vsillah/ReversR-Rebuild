const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const checker = require('./cad-auth-controlled-internal-upload-activation-decision-checker');

test('controlled internal upload activation decision is source-only and default-closed', () => {
  const packet = checker.expectedPacket();

  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.status, 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_DECISION_READY_SOURCE_ONLY');
  assert.equal(packet.phase6Closeout.packetSha256, 'c6ce99d3ff91e9f2ec7caee42165bca7035fbdef9d8f626b961058c6d3cf018c');
  assert.equal(packet.phase6Closeout.boundedLiveOpeningTerminal.code, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.currentProductionDefaults.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentProductionDefaults.expectedCredentialedDisabledTerminal, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.controlledInternalActivationDecision.productionUploadActivationAuthorizedNow, false);
  assert.equal(packet.controlledInternalActivationDecision.routeBodyReadAuthorizedNow, false);
  assert.equal(checker.routeStillClosed(), true);
});

test('phase 7 decision allows only a later bounded internal body-validation gate', () => {
  const packet = checker.expectedPacket();
  const scope = packet.controlledInternalActivationDecision.eligibleBodyValidationScope;

  assert.equal(packet.controlledInternalActivationDecision.phase, '7.1-controlled-internal-upload-activation-decision');
  assert.equal(scope.route, 'POST /api/cad/user-import');
  assert.equal(scope.cohortRef, 'rrb-ref:cad-upload-internal-mark-test-cohort-v1');
  assert.equal(scope.uploadAttempts, 1);
  assert.equal(scope.concurrentSessions, 1);
  assert.equal(scope.retries, 0);
  assert.equal(scope.secondLiveRun, false);
  assert.equal(scope.allowedCadProvenance, 'public-synthetic-or-explicitly-authorized-internal-tester-only');
  assert.equal(scope.requestContentRecordingAuthorized, false);
  assert.equal(scope.bodyBytesRetentionAuthorized, false);
  assert.equal(scope.conversionDispatchAuthorized, false);
  assert.equal(scope.sandboxDispatchAuthorized, false);
  assert.equal(scope.privateCadAuthorized, false);
  assert.equal(scope.realUsersAuthorized, false);
});

test('validator envelope matches current IGES-only admission validator', () => {
  const packet = checker.expectedPacket();
  const validator = packet.controlledInternalActivationDecision.validatorEnvelope;
  const admissionSource = fs.readFileSync('server/cadUserUploadAdmission.js', 'utf8');
  const workerContract = fs.readFileSync('server/cadWorkerContract.js', 'utf8');

  assert.equal(validator.currentValidator, 'server/cadUserUploadAdmission.js');
  assert.equal(validator.acceptedContainer, 'application/json');
  assert.deepEqual(validator.requiredPayloadKeys, ['contentBase64', 'fileName', 'mimeType']);
  assert.deepEqual(validator.acceptedMimeTypes, ['model/iges', 'application/iges', 'application/octet-stream']);
  assert.deepEqual(validator.acceptedFileExtensions, ['igs', 'iges']);
  assert.equal(validator.sourceLimitBytes, 262144);
  assert.equal(validator.requestLimitBytes, 393216);
  assert.equal(validator.stepStpAuthorized, false);
  assert.equal(validator.externalReferencesAuthorized, false);
  assert.match(admissionSource, /Object\.keys\(body\)\.sort\(\)\.join\(','\) !== 'contentBase64,fileName,mimeType'/);
  assert.match(workerContract, /LIMITS = Object\.freeze\(\{ inputBytes: 256 \* 1024, jsonBytes: 384 \* 1024/);
  assert.match(workerContract, /!\s*\/\\\.\(igs\|iges\)\$\/i\.test\(body\.fileName\)/);
});

test('productization remains a separate future decision', () => {
  const packet = checker.expectedPacket();

  assert.equal(packet.productizationDecision.phase7IsLastBeforeProductization, false);
  assert.match(packet.productizationDecision.rationale, /productization still requires separate conversion/);
  assert.ok(packet.productizationDecision.explicitFutureGates.includes('conversion and Sandbox dispatch qualification'));
  assert.ok(packet.productizationDecision.explicitFutureGates.includes('commercial-readiness decision'));
  assert.equal(packet.phase7NonGoals.productionUploadActivation, false);
  assert.equal(packet.phase7NonGoals.requestBodyAdmissionOrRead, false);
  assert.equal(packet.phase7NonGoals.privateCredentialRead, false);
  assert.equal(packet.phase7NonGoals.conversion, false);
  assert.equal(packet.phase7NonGoals.sandboxDispatch, false);
  assert.equal(packet.phase7NonGoals.realUserCommercialization, false);
  assert.equal(packet.phase7NonGoals.commercialReadinessClaim, false);
});

test('checker detects unsafe drift and validates deterministic packet', () => {
  const packet = checker.expectedPacket();
  const result = checker.checkPacket(packet);

  assert.equal(result.ok, true);
  assert.equal(result.routeStillClosed, true);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.requestBodyAdmissionOrReadAuthorized, false);
  assert.equal(result.phase7IsProductization, false);
  assert.equal(
    checker.checkPacket({
      ...packet,
      authorizes: {
        ...packet.authorizes,
        productionUploadActivation: true,
      },
    }).ok,
    false,
  );
});

test('checker CLI validates the committed decision packet', () => {
  const result = spawnSync(process.execPath, [
    'scripts/cad-auth-controlled-internal-upload-activation-decision-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.code, 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_DECISION_VALID_SOURCE_ONLY');
  assert.equal(parsed.sourceOnly, true);
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);
});
