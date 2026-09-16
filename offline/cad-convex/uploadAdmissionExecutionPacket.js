const crypto = require('node:crypto');

const REQUIRED_BINDINGS = Object.freeze({
  qualificationGate: 'offline/cad-convex/uploadAdmissionQualificationGate.json',
  uploadSessionCloseout: 'docs/cad-dev-upload-session-successful-closeout.json',
  dryRunCloseout: 'docs/cad-upload-admission-development-dry-run-closeout.json',
  activationRunManifest: 'docs/cad-upload-activation-run-manifest.json',
  routeGate: 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED',
  runtimeBridge: 'server/cadUploadAdmissionRuntimeBridge.js',
  publicFixtureMatrix: 'scripts/fixtures/cad-public-matrix.json#fixtures.cube',
});

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function allFalse(value) {
  return Object.values(value || {}).every(entry => entry === false);
}

function isIso(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function commandHashesValid(commands = {}) {
  return Object.values(commands).every(command => (
    command
    && typeof command.template === 'string'
    && command.sha256 === sha256(command.template)
  ));
}

function inspectUploadAdmissionExecutionPacket(packet) {
  const window = packet.futureRunWindow || {};
  const fixture = packet.publicSyntheticFixture || {};
  const sources = packet.sourceBindings || {};
  const deployment = packet.deploymentBinding || {};
  const routeGate = packet.routeGate || {};
  const boundaries = packet.boundaries || {};

  const sourceBindingsValid = Object.entries(REQUIRED_BINDINGS).every(
    ([key, value]) => sources[key] === value,
  );

  const futureWindowBound = isIso(window.startUtc)
    && isIso(window.expiresUtc)
    && Date.parse(window.startUtc) < Date.parse(window.expiresUtc)
    && window.maxRunSeconds === 900
    && window.scheduleIfMoreThanFiveMinutesAway === true;

  const deploymentBound = deployment.mergeCommit === packet.baseMainCommit
    && deployment.productionSmokeCommit === packet.baseMainCommit
    && deployment.productionHost === 'https://reversr.vercel.app'
    && deployment.vercelDeploymentId === 'dpl_D5ZNojZHqwhzh3wvq7SsxAUqDKkc';

  const fixtureBound = fixture.ref === REQUIRED_BINDINGS.publicFixtureMatrix
    && fixture.sha256 === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && fixture.bytes === 11562
    && fixture.privateCad === false
    && fixture.conversionAuthorized === false
    && fixture.sandboxDispatchAuthorized === false;

  const routeRemainsClosed = routeGate.literal === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && routeGate.bodyAdmissionAuthorizedNow === false
    && routeGate.opensBodyParserNow === false;

  const commandsBound = commandHashesValid(packet.commandManifest);

  const sanitizedEvidenceBound = packet.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet.sanitizedEvidenceDestination?.fileMode === '600'
    && packet.sanitizedEvidenceDestination?.privatePatternLeakAllowed === false;

  const boundariesClosed = packet.sourceOnly === true
    && packet.liveRunAuthorizedByThisPacket === false
    && packet.bodyAdmissionExecutableNow === false
    && boundaries.stopBeforeConversion === true
    && boundaries.stopBeforeSandbox === true
    && boundaries.privateCadAllowed === false
    && boundaries.realUsersAllowed === false
    && boundaries.maxAttempts === 1
    && boundaries.automaticRetry === false
    && boundaries.secondRun === false
    && boundaries.maxAllInCostUsd === 50
    && allFalse(packet.authorityPreserved);

  const blockersPreserved = Array.isArray(packet.blockingBeforeExecution)
    && packet.blockingBeforeExecution.includes('separate reviewed bounded body-admission executor or route gate remains required')
    && packet.blockingBeforeExecution.includes('exact future run receipt hash is not accepted until after execution')
    && packet.blockingBeforeExecution.includes('conversion and Sandbox dispatch remain separate later gates');

  return Object.freeze({
    structureValid: packet.schemaVersion === 1
      && packet.mode === 'source-only-cad-upload-admission-execution-packet',
    sourceBindingsValid,
    futureWindowBound,
    deploymentBound,
    fixtureBound,
    routeRemainsClosed,
    commandsBound,
    sanitizedEvidenceBound,
    boundariesClosed,
    blockersPreserved,
  });
}

module.exports = {
  REQUIRED_BINDINGS,
  inspectUploadAdmissionExecutionPacket,
  sha256,
};
