// Local source-only integrity check. No live commands, arbitrary inputs or credentials.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const { runtimeMountCompletionPreparation, exactLiveOpeningApprovalPhrase } =
  require('../offline/cad-auth-prod-runtime-mount-completion/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-execution-gap-closure.json';
const PARENT = 'docs/cad-auth-prod-runtime-mount-completion.json';
const PARENT_SHA = '87b9f0e23ac1b6017f7bc8cf5cff3ab6967220398ad33798f7ed6e81fab4ecae';
const SOURCES = Object.freeze([PARENT, 'server/index.js',
  'server/cadProductionExecutionBinding.js', 'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js', 'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js', 'scripts/cad-auth-prod-runtime-mount-fixture.js',
  'scripts/cad-auth-prod-runtime-mount-completion.test.js',
  'scripts/cad-auth-executable-production-bootstrap-binding-repair.test.js',
  'scripts/cad-auth-live-opening-execution-gap-closure.test.js',
  'scripts/cad-auth-live-opening-execution-gap-closure-checker.js',
  'docs/cad-auth-live-opening-execution-gap-closure.md']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function approvalPhrase() {
  return exactLiveOpeningApprovalPhrase({ runtimeMountCompletionPacketSha256: PARENT_SHA,
    runtimeMountCompletionSourceCommit: '8d33cae7d0f352954ae6c0ef4c8115dc633c8d9f' }) +
    ' This approval additionally binds execution-gap closure packet <executionGapClosurePacketSha256>' +
    ' at source commit <executionGapClosureSourceCommit> and independently qualified durable service' +
    ' <durableServiceReference>; its session-ref mapping, atomic global run and attempt claims,' +
    ' crash-safe expiry and revocation, rollback-first controls, and post-rollback smoke must be verified before opening.';
}
function expectedPacket(readSource = read) {
  if (sha(readSource(PARENT)) !== PARENT_SHA) throw Error('HISTORICAL_PARENT_CHANGED');
  return { schemaVersion: 1, packet: 'cad-auth-live-opening-execution-gap-closure-v1',
    sourceOnly: true, status: 'SOURCE_WIRING_VALIDATED_PRODUCTION_DISABLED',
    baseMainCommit: '8d33cae7d0f352954ae6c0ef4c8115dc633c8d9f',
    historicalParentSha256: PARENT_SHA,
    liveDurableServiceQualified: false, executableCommandCardIssued: false,
    productionExecutionBinding: null, controls: runtimeMountCompletionPreparation().controls,
    approvalPhraseTemplate: approvalPhrase(),
    runtimeAdmissionBlocked: true,
    runtimeBlocker: 'CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED',
    liveDurabilityVerified: false,
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])) };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = !!input && typeof input === 'object' && !Array.isArray(input)
    && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...runtimeMountCompletionPreparation().controls, ok,
    code: ok ? 'SOURCE_WIRING_VALIDATED_PRODUCTION_DISABLED' : 'EXECUTION_GAP_PACKET_BLOCKED' };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, approvalPhrase, expectedPacket, checkPacket };
