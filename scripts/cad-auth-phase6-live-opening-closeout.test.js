const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const checker = require('./cad-auth-phase6-live-opening-closeout-checker');

test('phase 6 closeout records expected terminal and default-closed rollback', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.phase6Closed, true);
  assert.equal(packet.status, 'PHASE_6_BOUNDED_ADMISSION_PATH_VALIDATED_DEFAULT_CLOSED');
  assert.equal(packet.liveOpeningResult.credentialDigestVerified, true);
  assert.equal(packet.liveOpeningResult.response.status, 503);
  assert.equal(packet.liveOpeningResult.response.code, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.liveOpeningResult.expectedTerminalReached, true);
  assert.equal(packet.rollbackAndPostSmoke.postRollbackFailClosedSmoke.status, 401);
  assert.equal(
    packet.rollbackAndPostSmoke.postRollbackFailClosedSmoke.code,
    'USER_SESSION_REQUIRED',
  );
  assert.equal(packet.rollbackAndPostSmoke.productionDefaultClosedAfterAttempt, true);
});

test('phase 6 closeout records one attempt, no retry, no private value disclosure', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.liveOpeningResult.uploadAttemptCount, 1);
  assert.equal(packet.liveOpeningResult.retryCount, 0);
  assert.equal(packet.liveOpeningResult.secondLiveRun, false);
  assert.equal(packet.liveOpeningResult.credentialValuePrinted, false);
  assert.equal(packet.liveOpeningResult.credentialValueCommitted, false);
  assert.equal(packet.liveOpeningResult.credentialValueDisclosed, false);
  assert.equal(packet.liveOpeningResult.requestBodyContentRecorded, false);
});

test('phase 6 closeout preserves all downstream gates closed', () => {
  const packet = checker.expectedPacket();
  assert.equal(packet.unauthorizedEffects.providerEnvResourceBillingChanged, false);
  assert.equal(packet.unauthorizedEffects.uploadSessionIssued, false);
  assert.equal(packet.unauthorizedEffects.productionUploadActivated, false);
  assert.equal(packet.unauthorizedEffects.conversionRun, false);
  assert.equal(packet.unauthorizedEffects.sandboxDispatched, false);
  assert.equal(packet.unauthorizedEffects.privateCadUsed, false);
  assert.equal(packet.unauthorizedEffects.runtimeActivated, false);
  assert.equal(packet.unauthorizedEffects.realUserCommercializationClaimed, false);
  assert.equal(packet.unauthorizedEffects.commercialReadinessClaimed, false);
  assert.equal(packet.remainingWork.nextRoadmapPhaseRequiredForProductionUploadActivation, true);
  assert.equal(packet.remainingWork.uploadActivationStillClosed, true);
});

test('checker detects drift and validates deterministic packet', () => {
  const packet = checker.expectedPacket();
  const result = checker.checkPacket(packet);
  assert.equal(result.ok, true);
  assert.equal(result.phase6Closed, true);
  assert.equal(result.terminalReached, true);
  assert.equal(result.postRollbackFailClosed, true);
  assert.equal(
    checker.checkPacket({
      ...packet,
      liveOpeningResult: {
        ...packet.liveOpeningResult,
        retryCount: 1,
      },
    }).ok,
    false,
  );
});

test('checker CLI validates the committed packet', () => {
  const result = spawnSync(process.execPath, [
    'scripts/cad-auth-phase6-live-opening-closeout-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.code, 'CAD_AUTH_PHASE6_LIVE_OPENING_CLOSEOUT_VALID_DEFAULT_CLOSED');
  assert.equal(parsed.phase6Closed, true);
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);
});
