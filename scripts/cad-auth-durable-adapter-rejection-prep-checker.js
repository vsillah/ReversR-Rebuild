// Fixed source allowlist only. Never loads runtime/provider or private evidence.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { closed, APPROVAL_PHRASE } = require('../offline/cad-auth-durable-adapter-rejection-prep/candidate');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-adapter-rejection-prep.json';
const SOURCES = Object.freeze([
  'offline/cad-auth-durable-adapter-rejection-prep/candidate.js',
  'offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json',
  'scripts/cad-auth-durable-adapter-rejection-prep-checker.js',
  'scripts/cad-auth-durable-adapter-rejection-prep.test.js',
  'docs/cad-auth-durable-adapter-rejection-prep.md',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  return { schemaVersion: 1, artifact: 'cad-auth-durable-adapter-rejection-prep-v1',
    ...closed('SOURCE_RECORD_BOUND_SCHEMA_REBIND_REVIEWED_RUNTIME_CLOSED'), roadmap: '5/6 complete; Step 6 preparation only',
    baseCommit: 'f0d459a522c7c70b394411ae580b1bddf6a9d41d',
    productionDeploymentReference: '6748245138',
    deploymentFreshnessVerified: true,
    sourceRecordPacketSha256: '0d8b2c06fb2ad7f32f126909c3cbe20b9baa95f0aaa6f1d89ed892bc5820a14d',
    sourceRecordSha256: '81178504968fffa01d265b9b9541dda78935133f71f174bf0d667a79a5ca8ce5',
    sessionInputStopTask: '01a0eea2-7b7d-7d30-adbf-c07784cf237a',
    sourceInputStopTask: '01a0ee9f-28aa-7d71-b170-4ae4236148d0',
    runtimeInstallStopSha256: 'd706fd784052b72ab48d7fc0dfebaf3369251b8490c6925e5d26c4487b367540',
    candidateModule: SOURCES[0], candidateExport: 'createDurableAdapterCandidate',
    bindingSchema: SOURCES[1], suppliedBinding: null,
    unresolved: ['runtimeInstallation', 'liveDurableServiceQualification', 'productionExecutionBinding', 'explicitLiveOpeningGate'],
    resolvedForSourceOnlyReview: [
      'exactExistingSessionId',
      'boundedSessionRef',
      'durableEvidenceSha256',
      'approvedNonSecretSourceRecordSha256',
      'currentDeploymentVerification',
    ],
    durableAdapterQualified: false, runtimeMounted: false,
    nextApprovalPhrase: APPROVAL_PHRASE,
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])) };
}
function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, ...closed(ok ? 'SOURCE_ONLY_REJECTION_PREPARATION_VALID' : 'SOURCE_ONLY_REJECTION_PREPARATION_BLOCKED') };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error();
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.log(JSON.stringify(checkPacket(null))); process.exitCode = 1; }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
