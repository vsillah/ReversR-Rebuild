// Fixed public source allowlist only; never read private evidence or runtime inputs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const { PRODUCTION_BINDING_INSTALLATION } =
  require('../server/cadProductionExecutionBindingInstallation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-production-binding-source-install.json';
const SOURCES = Object.freeze([
  '.github/workflows/release-local-ci.yml',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'scripts/cad-auth-prod-runtime-mount-fixture.js',
  'scripts/cad-auth-production-binding-source-install.test.js',
  'scripts/cad-auth-production-binding-source-install-checker.js',
  'scripts/cad-auth-production-execution-binding-finalization.test.js',
  'docs/cad-auth-production-execution-binding-finalization.json',
  'docs/cad-auth-production-binding-source-install.md',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function installationProjection(installation = PRODUCTION_BINDING_INSTALLATION) {
  const manifest = installation.manifest || {};
  const liveGate = installation.liveGate || {};
  const durableAdapter = installation.durableAdapter || {};
  const service = durableAdapter.service || {};
  return {
    enabled: installation.enabled === true,
    manifest: {
      schemaVersion: manifest.schemaVersion,
      commandCardBytesSha256: sha(manifest.commandCardBytes || ''),
      commandCardSha256: manifest.commandCardSha256,
      currentDeploymentReference: manifest.currentDeploymentReference,
      boundedSessionRef: manifest.boundedSessionRef,
      sessionId: manifest.sessionId,
      durableEvidenceSha256: manifest.durableEvidenceSha256,
      durableServiceRef: manifest.durableServiceRef,
    },
    liveGate: {
      explicitLiveOpeningApproved: liveGate.explicitLiveOpeningApproved === true,
      installationSha256: liveGate.installationSha256,
    },
    durableAdapter: {
      serviceRef: durableAdapter.serviceRef,
      evidenceSha256: durableAdapter.evidenceSha256,
      methodNames: METHODS.filter(name => typeof service[name] === 'function'),
    },
  };
}
function expectedPacket(readSource = read) {
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-production-binding-source-install-v1',
    sourceOnly: true,
    baseCommit: '6504ede193b84fb0a710bf7a2e0d2258cd52137f',
    roadmap: '5/6 complete',
    status: 'SOURCE_INSTALL_PATH_PROVEN_DEFAULT_CLOSED',
    installation: installationProjection(),
    installPathProven: true,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    commandCardIssued: false,
    runtimeActivated: false,
    durableAdapterQualified: false,
    effectsExecuted: 0,
    nextApprovalPhraseAvailable: false,
    unresolved: ['postMergeDeployment', 'currentFailClosedSmoke', 'durableAdapterEvidence',
      'exactBoundedSession', 'freshUtcWindow', 'explicitLiveOpeningEnablement',
      'currentProductionCommandCardBytesAndSha256', 'currentProductionInstallationSha256'],
    stopConditions: ['failingChecks', 'failingSmoke', 'unknownOutcome', 'staleDeploymentBinding',
      'missingDurableAdapterEvidence', 'missingExactBoundedSessionBinding', 'privateDataLeakageRisk',
      'runtimeCredentialsOrProviderConfigurationNeeded'],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, code: ok ? 'SOURCE_INSTALL_PACKET_VALID_DEFAULT_CLOSED' : 'SOURCE_INSTALL_PACKET_BLOCKED',
    effectsExecuted: 0, liveOpeningAuthorized: false, nextApprovalPhraseAvailable: false };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_MODE');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.log(JSON.stringify(checkPacket(null))); process.exitCode = 1; }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
