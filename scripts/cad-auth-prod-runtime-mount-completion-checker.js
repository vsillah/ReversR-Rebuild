// Fixed public source files only. No live runner, credentials or arbitrary paths.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const { CLOSED_CONTROLS, BOUNDED_SESSION_REF, INTERNAL_COHORT_REF } = require('../offline/cad-auth-executable-production-bootstrap-binding-repair/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-runtime-mount-completion.json';
const PARENT = 'docs/cad-auth-executable-production-bootstrap-binding-repair.json';
const PARENT_SHA = 'ed60db97a2cfc0c8ce37a417347a7c19f67adbcbeb4388dd327dd5183860dd77';
const SOURCES = Object.freeze([
  PARENT, 'api/[...path].js', 'server/index.js', 'server/cadUserUploadRouter.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js', 'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'offline/cad-auth-prod-opening-prep/preparation.js',
  'offline/cad-auth-executable-production-bootstrap-binding-repair/preparation.js',
  'scripts/cad-auth-prod-runtime-mount-fixture.js',
  'scripts/cad-auth-prod-runtime-mount-completion.test.js',
  'scripts/cad-auth-prod-runtime-mount-completion-checker.js',
  'docs/cad-auth-prod-runtime-mount-completion.md',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function approvalPhrase() {
  return `I approve one bounded internal production upload-admission opening for ReversR CAD user-import, bound to runtime mount completion packet <runtimeMountPacketSha256> at source commit <runtimeMountSourceCommit>, fresh post-merge digest refresh <postMergeDigestRefreshSha256>, immutable current production deployment <currentProductionDeploymentReference>, exact executable command-card SHA-256 <executableCommandCardSha256>, durable adapter evidence SHA-256 <durableEvidenceSha256>, bounded session ref ${BOUNDED_SESSION_REF} with exact session ID <exactSessionId>, cohort ${INTERNAL_COHORT_REF}, against https://reversr.vercel.app POST /api/cad/user-import from <startUtc> inclusive to <expiresUtc> exclusive (at most 30 minutes). Issue and use one bounded executable command card for admission-only body validation of public, synthetic, or explicitly authorized internal tester CAD; one session and one attempt; atomic durable run and attempt claims; independent expiry before every effect; rollback armed before opening; immediate rollback after the window; revoke session and late grants; post-rollback fail-closed smoke. Stop on failed checks, stale deployment, missing session or durable evidence, failed smoke, or unknown outcome. No session issuance, conversion, Sandbox dispatch, private CAD, external messages, provider/env/resource/billing changes, retry, second live run, real-user commercialization, or commercial-readiness claim.`;
}
function expectedPacket(readSource = read) {
  if (sha(readSource(PARENT)) !== PARENT_SHA) throw Error('PARENT_BINDING_MISMATCH');
  return {
    schemaVersion: 1, packet: 'cad-auth-prod-runtime-mount-completion-v1', sourceOnly: true,
    status: 'SOURCE_ONLY_RUNTIME_MOUNT_COMPLETE_PRODUCTION_CLOSED',
    baseMainCommit: '9197f09e3d9966672f362ae17dcbf6439e6e232a',
    parent: { path: PARENT, sha256: PARENT_SHA, validationMode: 'historical-digest-only' },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    controls: CLOSED_CONTROLS,
    boundedSessionRef: BOUNDED_SESSION_REF,
    durableEvidenceStatus: 'NOT_COLLECTED_SYNTHETIC_RECEIPTS_ARE_NOT_LIVE_EVIDENCE',
    deploymentStatus: 'FRESH_POST_MERGE_IMMUTABLE_REBIND_REQUIRED',
    exactSessionStatus: 'UNRESOLVED_LIVE_GATE_MUST_BIND_EXACT_ID',
    nextLiveOpeningApprovalPhrase: approvalPhrase(),
  };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = Boolean(input && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource))); } catch {}
  return { ...CLOSED_CONTROLS, ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RUNTIME_MOUNT_PACKET_VALID' : 'RUNTIME_MOUNT_PACKET_BLOCKED' };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.log(JSON.stringify({ ...CLOSED_CONTROLS, ok: false, code: 'RUNTIME_MOUNT_CHECKER_BLOCKED' })); process.exitCode = 1; }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket, approvalPhrase };
