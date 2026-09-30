const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  APPROVED_REFRESH_SHA256,
  DURABLE_EVIDENCE_SHA256,
  RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT,
  RUNTIME_INSTALL_ENABLEMENT_PACKET_SHA256,
  RUNTIME_INSTALL_ENABLEMENT_SOURCE_COMMIT,
  SCHEMA_REBIND_PACKET_SHA256,
  SESSION_EVIDENCE_SOURCE_RECORD_SHA256,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadProductionRuntimeInstallCurrentBinding,
} = require('../server/cadProductionRuntimeInstallCurrentBinding');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  PRODUCTION_BINDING_INSTALLATION,
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
const PACKET = 'docs/cad-auth-runtime-install-current-binding.json';
const PROOF_WINDOW = Object.freeze({
  startUtc: '2026-09-30T16:00:00Z',
  expiresUtc: '2026-09-30T16:30:00Z',
  proofNowUtc: '2026-09-30T16:05:00Z',
});
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: 'dpl_SourceOwnedCurrentBindingProof000000',
  VERCEL_URL: 'reversr-current-binding-proof-vsillahs-projects.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'scripts/cad-auth-runtime-install-current-binding-checker.js',
  'scripts/cad-auth-runtime-install-current-binding.test.js',
  'docs/cad-auth-runtime-install-current-binding.md',
  'docs/cad-auth-runtime-install-enable.json',
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

function installableCurrentBindingProof() {
  const metadata = readCadProductionCurrentDeploymentMetadata(PROOF_ENV);
  const calls = [];
  const durableService = Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
  const prepared = createCadProductionRuntimeInstallCurrentBinding({
    deploymentMetadata: metadata,
    startUtc: PROOF_WINDOW.startUtc,
    expiresUtc: PROOF_WINDOW.expiresUtc,
    enabled: true,
    explicitLiveOpeningApproved: true,
    durableService,
  });
  const resolved = prepared.ok
    ? resolveCadProductionExecutionBindingSource(
      prepared.installation,
      () => Date.parse(PROOF_WINDOW.proofNowUtc),
    )
    : null;
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  return {
    proofNowUtc: PROOF_WINDOW.proofNowUtc,
    proofDeploymentReference: metadata?.deploymentReference || null,
    proofDeploymentTarget: metadata?.deploymentTarget || null,
    metadataAccepted: metadata !== null,
    preparedOk: prepared.ok === true,
    installationEnabled: prepared.installation?.enabled === true,
    explicitLiveOpeningApproved: prepared.installation?.liveGate?.explicitLiveOpeningApproved === true,
    commandCardSha256: prepared.installation?.manifest?.commandCardSha256 || null,
    installationSha256: prepared.installation?.liveGate?.installationSha256 || null,
    resolvedSourceNonNull: resolved !== null,
    executionSourceNonNull: source !== null,
    executionBindingEnabled: binding.enabled === true,
    effectsExecuted: calls.length,
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const currentBindingProof = installableCurrentBindingProof();
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-runtime-install-current-binding-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'CURRENT_DEPLOYMENT_RUNTIME_INSTALL_SOURCE_PREPARED_DEFAULT_CLOSED',
    purpose: 'break the stale deployment-binding loop without opening production admission',
    boundInputs: {
      approvedRefreshSha256: APPROVED_REFRESH_SHA256,
      runtimeInstallEnablementPacketSha256: RUNTIME_INSTALL_ENABLEMENT_PACKET_SHA256,
      runtimeInstallEnablementSourceCommit: RUNTIME_INSTALL_ENABLEMENT_SOURCE_COMMIT,
      runtimeInstallEnablementMergeCommit: RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT,
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      schemaRebindPacketSha256: SCHEMA_REBIND_PACKET_SHA256,
      sessionEvidenceSourceRecordSha256: SESSION_EVIDENCE_SOURCE_RECORD_SHA256,
      durableEvidenceSha256: DURABLE_EVIDENCE_SHA256,
      boundedSessionRef: BOUNDED_SESSION_REF,
      durableServiceRef: DURABLE_SERVICE_REF,
    },
    deploymentMetadataPolicy: {
      source: 'allowlisted Vercel system environment only',
      requiredVercelEnv: 'production',
      requiredGitOwner: 'vsillah',
      requiredGitRepo: 'ReversR-Rebuild',
      requiredGitRef: 'main',
      requiredProjectProductionTarget: 'https://reversr.vercel.app',
      acceptsSecrets: false,
      acceptsProviderConfig: false,
      acceptsRequestInput: false,
      acceptsPrivateEvidence: false,
    },
    proofWindow: PROOF_WINDOW,
    defaultProof,
    currentBindingProof,
    installPathProven:
      defaultProof.productionBindingInstallationEnabled === false
      && defaultProof.defaultResolveIsNull === true
      && defaultProof.defaultSourceIsNull === true
      && defaultProof.defaultExecutionBindingEnabled === false
      && currentBindingProof.metadataAccepted === true
      && currentBindingProof.preparedOk === true
      && currentBindingProof.resolvedSourceNonNull === true
      && currentBindingProof.executionSourceNonNull === true
      && currentBindingProof.executionBindingEnabled === true
      && currentBindingProof.effectsExecuted === 0,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    runtimeInstallationActivated: false,
    uploadAdmissionActivated: false,
    commandCardIssuedForLiveExecution: false,
    durableServiceLiveQualified: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: {
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresCurrentDeploymentMetadataVerification: true,
      requiresFreshUtcWindow: true,
      requiresExactCommandCardSha256: true,
      requiresExactInstallationSha256: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge current-deployment runtime-install binding refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to runtime-install current-binding packet SHA-256 <currentBindingPacketSha256> at source commit <currentBindingSourceCommit>, runtime-install enablement packet SHA-256 17127be86910f4148f2140ba549abfdd2b9e984b5af2993d9934f5228ea2ed2f, approved live-opening refresh SHA-256 763069e9536e5239307c7785c482316569cdc21054060565b20a52369077da76, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed source can derive a source-owned installable binding from allowlisted current production deployment metadata, recompute durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, fresh UTC opening window, and exact later live-opening approval phrase without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on missing current deployment metadata, stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing durable adapter evidence, missing exact bounded session binding, missing installation SHA-256, runtime installation not proven source-owned, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'missingCurrentDeploymentMetadata',
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
      ? 'RUNTIME_INSTALL_CURRENT_BINDING_PACKET_VALID_DEFAULT_CLOSED'
      : 'RUNTIME_INSTALL_CURRENT_BINDING_PACKET_BLOCKED',
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
  PROOF_ENV,
  PROOF_WINDOW,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  installableCurrentBindingProof,
};
