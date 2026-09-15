const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  packet,
} = require('../offline/cad-convex/boundedDevQualificationExecutor');
const {
  FAILURE_CLASSES,
  classifyConvexCliTransportFailure,
  classifyStoppedEarlierWindowTransportDiagnostic,
} = require('../offline/cad-convex/boundedDevQualificationTransport');

test('Convex CLI transport failures are classified without leaking raw output', () => {
  const privatePath = '/U' + 'sers/example/private.env';
  const privateToken = 'sk_' + 'live_' + 'abcdefghijklmnopqrstuvwxyz';
  const result = classifyConvexCliTransportFailure({
    operation: 'seed-synthetic-metadata',
    method: 'initialize',
    functionName: 'cadDurableEngine.js:initialize',
    exitCode: 1,
    errorCode: 'ECONNRESET',
    stderr: `fetch failed while reading ${privatePath} with ${privateToken}`,
  });
  assert.equal(result.transportFailureClass, 'CLI_NETWORK_UNAVAILABLE');
  assert.equal(result.engineCode, 'OUTCOME_UNKNOWN');
  assert.equal(result.commitState, 'UNRECONCILED');
  assert.equal(result.rawOutputIncluded, false);
  assert.equal(result.redactionApplied, true);
  assert.equal(result.privatePatternObserved, true);
  assert.equal(result.automaticRetry, false);
  assert.equal(result.secondRun, false);
  assert.equal(result.liveRunAuthorized, false);
  assert.equal(result.uploadsEnabled, false);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(privatePath));
  assert.ok(!serialized.includes(privateToken));
});

test('transport classifier distinguishes timeout, parse and function-reference classes', () => {
  assert.equal(classifyConvexCliTransportFailure({
    method: 'initialize',
    timedOut: true,
  }).transportFailureClass, 'CLI_TIMEOUT');
  assert.equal(classifyConvexCliTransportFailure({
    method: 'readExact',
    parseError: true,
  }).transportFailureClass, 'CLI_OUTPUT_PARSE_FAILED');
  assert.equal(classifyConvexCliTransportFailure({
    method: 'readExact',
    functionCode: 'ENGINE_INVALID',
  }).transportFailureClass, 'CLI_FUNCTION_ERROR');
  assert.ok(FAILURE_CLASSES.includes('CLI_MUTATION_NO_COMMIT_OBSERVED'));
});

test('stopped earlier-window diagnostic binds accepted evidence and no-commit reconciliation', () => {
  const evidence = packet.acceptedRebuiltSuccessorEvidence;
  const result = classifyStoppedEarlierWindowTransportDiagnostic({
    projectionSha256: evidence.projectionSha256,
    acceptanceReceiptSha256: evidence.acceptanceReceiptSha256,
    privateRestrictedRegisterDigest: evidence.privateRestrictedRegisterDigest,
    restrictedCommandSetDigest: evidence.restrictedCommandSetDigest,
    commandCardProjectionDigest: evidence.commandCardProjectionDigest,
    stoppedRunEvidenceSha256: '3f1f56199597d332cc68883122e2d705f50d74bf4813ae416264256a69ff54d7',
    stoppedRunReceiptSha256: '43f095fd42f7e7716a8aea37b7fcf61667af4d2a4e00a948606801205c548f52',
    initiatedLogicalOperations: 1,
    cli: {
      operation: 'seed-synthetic-metadata',
      method: 'initialize',
      functionName: 'cadDurableEngine.js:initialize',
      exitCode: 1,
    },
    reconciliation: {
      classification: 'NO_LEDGER_FOUND',
      ledgerFound: false,
      exactMatches: 0,
    },
  });
  assert.equal(result.mode, 'earlier-window-transport-diagnostic-hardening');
  assert.equal(result.acceptedEvidenceMatches, true);
  assert.equal(result.acceptedProjectionSha256, '1dbdf153921a1676c8870827fd619706e1a6bd143835a6cb623be13590dae566');
  assert.equal(result.acceptanceReceiptSha256, '898bf16b7078730123aa9f1416d21dcfd1e5f07a2272ac15024563a6dbb498e8');
  assert.equal(result.privateRestrictedRegisterDigest, 'd2018ce44048a32a495a0c6095c4fafdffe375766dd0f9a4aafc5806e6ebb237');
  assert.equal(result.transportFailureClass, 'CLI_MUTATION_NO_COMMIT_OBSERVED');
  assert.equal(result.commitState, 'NO_COMMIT_OBSERVED');
  assert.equal(result.nextGate, 'FRESH_WINDOW_EVIDENCE_REQUIRED');
  assert.equal(result.automaticRetry, false);
  assert.equal(result.secondRun, false);
  assert.equal(result.noDeleteRollbackPreserved, true);
  assert.equal(result.uploadsEnabled, false);
  assert.equal(result.conversionEnabled, false);
});

test('transport hardening source stays offline and source-only', () => {
  const source = fs.readFileSync('offline/cad-convex/boundedDevQualificationTransport.js', 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
