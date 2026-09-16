const crypto = require('node:crypto');

const REQUIRED_BINDINGS = Object.freeze({
  executionPacket: 'offline/cad-convex/uploadAdmissionExecutionPacket.json',
  routeGate: 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED',
  routeSource: 'server/cadUserUploadRouter.js',
  admissionValidator: 'server/cadUserUploadAdmission.js',
  fixtureMatrix: 'scripts/fixtures/cad-public-matrix.json#fixtures.cube',
  runnerCli: 'scripts/run-cad-upload-admission-executor-gate.js',
});

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function allFalse(value) {
  return Object.values(value || {}).every(entry => entry === false);
}

function inspectUploadAdmissionExecutorGate(gate, packet) {
  const sourceBindings = gate.sourceBindings || {};
  const window = gate.acceptedWindow || {};
  const packetWindow = packet.futureRunWindow || {};
  const fixture = gate.publicFixtureMaterialization || {};
  const isolatedRoute = gate.isolatedRouteGate || {};
  const evidence = gate.sanitizedEvidenceDestination || {};
  const bounds = gate.runBounds || {};

  const structureValid = gate.schemaVersion === 1
    && gate.mode === 'source-only-cad-upload-admission-executor-gate'
    && gate.sourceOnly === true;

  const sourceBindingsValid = Object.entries(REQUIRED_BINDINGS).every(
    ([key, value]) => sourceBindings[key] === value,
  );

  const windowBound = window.runRef === packetWindow.runRef
    && window.startUtc === packetWindow.startUtc
    && window.expiresUtc === packetWindow.expiresUtc
    && window.maxRunSeconds === packetWindow.maxRunSeconds
    && window.scheduleIfMoreThanFiveMinutesAway === true;

  const fixtureBound = fixture.package === 'occt-import-js'
    && fixture.packagePath === 'node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs'
    && fixture.sha256 === packet.publicSyntheticFixture?.sha256
    && fixture.bytes === packet.publicSyntheticFixture?.bytes
    && fixture.privateCad === false;

  const isolatedRouteBound = isolatedRoute.usesVmInstrumentedCopy === true
    && isolatedRoute.mountedProductionRouteModified === false
    && isolatedRoute.literalFalseMustRemain === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && isolatedRoute.expectedTerminalCode === 'USER_UPLOADS_DISABLED';

  const evidenceBound = evidence.root === packet.sanitizedEvidenceDestination?.root
    && evidence.gitIgnoredRequired === true
    && evidence.directoryMode === '700'
    && evidence.fileMode === '600'
    && evidence.recordsContentBase64 === false
    && evidence.recordsRawCredential === false
    && evidence.recordsPrivateCad === false;

  const boundsClosed = bounds.maxAttempts === 1
    && bounds.automaticRetry === false
    && bounds.secondRun === false
    && bounds.developmentOnly === true
    && bounds.maxAllInCostUsd === 50
    && bounds.stopBeforeConversion === true
    && bounds.stopBeforeSandbox === true
    && bounds.privateCadAllowed === false
    && bounds.realUsersAllowed === false
    && allFalse(gate.authorityPreserved);

  return Object.freeze({
    structureValid,
    sourceBindingsValid,
    windowBound,
    fixtureBound,
    isolatedRouteBound,
    evidenceBound,
    boundsClosed,
  });
}

function summarizeExecutorResult(result = {}) {
  return Object.freeze({
    runCompleted: result.runCompleted === true,
    unknownOutcome: result.unknownOutcome === true,
    terminalCode: result.terminalCode,
    uploadBodyValidated: result.uploadBodyValidated === true,
    conversionDispatches: result.counts?.conversionDispatches || 0,
    sandboxDispatches: result.counts?.sandboxDispatches || 0,
    privateCadUsed: result.privateCadUsed === true,
  });
}

module.exports = {
  REQUIRED_BINDINGS,
  inspectUploadAdmissionExecutorGate,
  sha256,
  summarizeExecutorResult,
};
