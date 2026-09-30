// Source-only checker. It never reads private evidence, runtime credentials,
// request bodies, provider configuration or deployment state.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  APPROVED_RUNTIME_INSTALLATION_SOURCE,
  PRODUCTION_BINDING_INSTALLATION,
  createApprovedProductionBindingInstallation,
} = require('../server/cadProductionExecutionBindingInstallation');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-runtime-install-enable.json';
const PROOF_NOW_UTC = '2026-09-30T03:35:00Z';
const SOURCES = Object.freeze([
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'scripts/cad-auth-runtime-install-enable.test.js',
  'scripts/cad-auth-runtime-install-enable-checker.js',
  'docs/cad-auth-runtime-install-enable.md',
  'docs/cad-auth-production-binding-source-install.json',
  'docs/cad-auth-session-evidence-schema-rebind.json',
  'docs/cad-auth-durable-adapter-rejection-prep.json',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function defaultClosedProof() {
  return {
    productionBindingInstallationEnabled: PRODUCTION_BINDING_INSTALLATION.enabled === true,
    defaultResolveIsNull: resolveCadProductionExecutionBindingSource() === null,
    defaultSourceIsNull: createCadProductionExecutionBindingSource() === null,
    defaultExecutionBindingEnabled: createCadProductionExecutionBinding().enabled === true,
  };
}

function approvedGateProof() {
  const installation = createApprovedProductionBindingInstallation({
    enabled: true,
    explicitLiveOpeningApproved: true,
  });
  const resolved = resolveCadProductionExecutionBindingSource(
    installation,
    () => Date.parse(PROOF_NOW_UTC),
  );
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  return {
    proofNowUtc: PROOF_NOW_UTC,
    approvedInstallationEnabled: installation.enabled === true,
    explicitLiveOpeningApproved: installation.liveGate.explicitLiveOpeningApproved === true,
    commandCardSha256: installation.manifest.commandCardSha256,
    installationSha256: installation.liveGate.installationSha256,
    resolvedSourceNonNull: resolved !== null,
    executionSourceNonNull: source !== null,
    executionBindingEnabled: binding.enabled === true,
    effectsExecuted: 0,
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const approvedProof = approvedGateProof();
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-runtime-install-enable-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'RUNTIME_INSTALLATION_ENABLEMENT_SOURCE_OWNED_DEFAULT_CLOSED',
    stoppedLiveOpeningDispositionSha256:
      APPROVED_RUNTIME_INSTALLATION_SOURCE.stoppedLiveOpeningDispositionSha256,
    approvedLiveOpeningRefreshSha256:
      APPROVED_RUNTIME_INSTALLATION_SOURCE.approvedLiveOpeningRefreshSha256,
    mainCommit: APPROVED_RUNTIME_INSTALLATION_SOURCE.approvedMainCommit,
    productionDeploymentReference:
      APPROVED_RUNTIME_INSTALLATION_SOURCE.productionDeploymentReference,
    productionTarget: APPROVED_RUNTIME_INSTALLATION_SOURCE.productionTarget,
    failClosedSmoke: APPROVED_RUNTIME_INSTALLATION_SOURCE.failClosedSmoke,
    commandCardSha256: APPROVED_RUNTIME_INSTALLATION_SOURCE.commandCardSha256,
    installationSha256: APPROVED_RUNTIME_INSTALLATION_SOURCE.installationSha256,
    boundedSessionRef: APPROVED_RUNTIME_INSTALLATION_SOURCE.boundedSessionRef,
    durableEvidenceSha256: APPROVED_RUNTIME_INSTALLATION_SOURCE.durableEvidenceSha256,
    durableServiceRef: APPROVED_RUNTIME_INSTALLATION_SOURCE.durableServiceRef,
    openingWindow: {
      startUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.startUtc,
      expiresUtc: APPROVED_RUNTIME_INSTALLATION_SOURCE.expiresUtc,
    },
    defaultProof,
    approvedGateProof: approvedProof,
    installPathProven:
      defaultProof.productionBindingInstallationEnabled === false
      && defaultProof.defaultResolveIsNull === true
      && defaultProof.defaultSourceIsNull === true
      && defaultProof.defaultExecutionBindingEnabled === false
      && approvedProof.resolvedSourceNonNull === true
      && approvedProof.executionSourceNonNull === true
      && approvedProof.executionBindingEnabled === true
      && approvedProof.commandCardSha256 === APPROVED_RUNTIME_INSTALLATION_SOURCE.commandCardSha256
      && approvedProof.installationSha256 === APPROVED_RUNTIME_INSTALLATION_SOURCE.installationSha256,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    commandCardIssuedForLiveExecution: false,
    runtimeActivated: false,
    uploadAdmissionActivated: false,
    durableServiceLiveQualified: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: {
      requiresPostMergeDeploymentRebind: true,
      requiresProductionFailClosedSmoke: true,
      requiresFreshUtcWindow: true,
      requiresExactCommandCardSha256: true,
      requiresExactInstallationSha256: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge runtime-install enablement deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to runtime-install enablement packet SHA-256 <runtimeInstallEnablementPacketSha256> at source commit <runtimeInstallEnablementSourceCommit>, stopped live-opening disposition SHA-256 7320eb5443265dee745e84a936486ae0ca01fbafeded09875c5a960723ba7003, approved live-opening refresh SHA-256 e0b3e097b8ed9c10b993109d220e757497cba7c216dfae77bd9f96dd1f418768, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: recompute only the current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, fresh UTC opening window, and exact later live-opening approval phrase against the verified production deployment, returning the live-opening phrase only if runtime installation remains source-owned, default production remains fail-closed, durable adapter evidence is sufficient, and all exact bindings resolve without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation, runtime activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing durable adapter evidence, missing exact bounded session binding, missing installation SHA-256, runtime installation not proven source-owned, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'missingDurableAdapterEvidence',
      'missingExactBoundedSessionBinding',
      'privateDataLeakageRisk',
      'runtimeInstallationNotProvenSourceOwned',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try {
    ok = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    ok = false;
  }
  return {
    ok,
    code: ok
      ? 'RUNTIME_INSTALL_ENABLEMENT_PACKET_VALID_DEFAULT_CLOSED'
      : 'RUNTIME_INSTALL_ENABLEMENT_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) {
      throw Error('INVALID_MODE');
    }
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  PROOF_NOW_UTC,
  SOURCES,
  approvedGateProof,
  defaultClosedProof,
  expectedPacket,
  checkPacket,
};
