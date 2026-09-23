// Offline source validation and non-executable review-card generation only.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkCard } = require('./cad-auth-sealed-evidence-card-checker');
const { getSchedule, digest } = require('../offline/cad-auth-setup/collector');
const { expectedManifest } = require('../offline/cad-auth-setup/manifests');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-sealed-setup.json';
const MANIFESTS = ['provider-policy', 'immutable-target', 'synthetic-cohort', 'custody-reviewer', 'approval-window']
  .map(name => `offline/cad-auth-setup/${name}.json`);
const SOURCES = Object.freeze([
  PARENT, ...MANIFESTS, 'offline/cad-auth-setup/manifests.js',
  'offline/cad-auth-setup/providerAdapter.js', 'offline/cad-auth-setup/providerAdapter.d.ts',
  'offline/cad-auth-setup/bodyInstrumentation.js', 'offline/cad-auth-setup/collector.js',
  'scripts/cad-auth-sealed-setup-checker.js', 'scripts/cad-auth-sealed-setup.test.js',
  'docs/cad-auth-sealed-setup.md', 'docs/cad-auth-sealed-setup-stop-runbook.md',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedSetup(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkCard(parent, { readSource }).ok) throw Error('INVALID_PARENT_CARD');
  const bindings = Object.fromEntries(MANIFESTS.map(file => {
    const manifest = JSON.parse(readSource(file));
    if (!isDeepStrictEqual(manifest, expectedManifest(path.basename(file)))) {
      throw Error('LIVE_BINDING_NOT_ALLOWED');
    }
    return [file, manifest];
  }));
  const schedule = getSchedule();
  if (schedule.length > parent.proposedSealedFields.limits.maxLogicalOperations) throw Error('SCHEDULE_LIMIT');
  return {
    schemaVersion: 1, packet: 'cad-auth-sealed-setup-v1', sourceOnly: true,
    status: 'SOURCE_IMPLEMENTED_LIVE_BINDINGS_BLOCKED',
    parentCard: { packet: parent.packet, sha256: hash(readSource(PARENT)) },
    // Copy only the parent's already closed card. No arguments can enable sealing.
    card: parent.card,
    claims: parent.claims,
    sourceArtifacts: {
      providerAdapterInterface: 'offline/cad-auth-setup/providerAdapter.d.ts',
      disabledProviderAdapter: 'offline/cad-auth-setup/providerAdapter.js',
      collectorAndReceiptValidator: 'offline/cad-auth-setup/collector.js',
      unmountedBodyGuard: 'offline/cad-auth-setup/bodyInstrumentation.js',
      rollbackAndStopRunbook: 'docs/cad-auth-sealed-setup-stop-runbook.md',
      reviewCardGenerator: 'scripts/cad-auth-sealed-setup-checker.js',
    },
    bindingManifests: bindings,
    schedule, caseCount: parent.proposedSealedFields.caseCount,
    logicalOperations: schedule.length, caseScheduleSha256: digest(schedule),
    limits: parent.proposedSealedFields.limits,
    limitsSha256: digest(parent.proposedSealedFields.limits),
    stopConditions: parent.proposedSealedFields.stopConditions,
    remainingGates: Object.keys(parent.prerequisites),
    completion: { sourceImplementationPresent: true, liveCollectionRun: false,
      actualRouteObserved: false, providerEvidenceCollected: false, cardSealed: false,
      productionVerifierAccepted: false, runtimeActivationAuthorized: false },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, hash(readSource(file))])),
  };
}
function checkSetup(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedSetup(readSource)); } catch { /* sanitized closed result */ }
  return { ok, sourceOnly: true, sealed: false, executable: false, liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false, problems: ok ? [] : ['INVALID_SOURCE_ONLY_SETUP'] };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--write-review-card') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedSetup(), null, 2) + '\n');
    } else if (args.length) throw Error('UNSUPPORTED_MODE');
    const result = checkSetup(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_SETUP_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, MANIFESTS, expectedSetup, checkSetup };
