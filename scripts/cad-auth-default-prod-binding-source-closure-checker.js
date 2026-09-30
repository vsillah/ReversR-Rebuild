const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256,
  DEFAULT_PRODUCTION_BINDING_SOURCE_GATE,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createSourceOwnedDefaultProductionBindingInstallation,
} = require('../server/cadProductionDefaultBindingSourceClosure');
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
const PACKET = 'docs/cad-auth-default-prod-binding-source-closure.json';
const PROOF_WINDOW = Object.freeze({
  startUtc: '2026-09-30T16:30:00Z',
  expiresUtc: '2026-09-30T17:00:00Z',
  proofNowUtc: '2026-09-30T16:35:00Z',
});
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: 'dpl_AxC7B2LLpTodw8BjqGMZQeUE5Qwr',
  VERCEL_URL: 'reversr-7bbqaev3n-vsillahs-projects.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const PROOF_GATE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: true,
  explicitLiveOpeningApproved: true,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  currentDeploymentRuntimeInstallRefreshSha256:
    CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
  installationSha256: REVIEWED_INSTALLATION_SHA256,
  startUtc: PROOF_WINDOW.startUtc,
  expiresUtc: PROOF_WINDOW.expiresUtc,
});
const SOURCES = Object.freeze([
  'server/cadProductionDefaultBindingSourceClosure.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js',
  'server/index.js',
  'scripts/cad-auth-default-prod-binding-source-closure-checker.js',
  'scripts/cad-auth-default-prod-binding-source-closure.test.js',
  'docs/cad-auth-default-prod-binding-source-closure.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function defaultClosedProof() {
  return {
    defaultGateEnabled: DEFAULT_PRODUCTION_BINDING_SOURCE_GATE.enabled === true,
    defaultGateExplicitLiveOpeningApproved:
      DEFAULT_PRODUCTION_BINDING_SOURCE_GATE.explicitLiveOpeningApproved === true,
    sourceOwnedDefaultInstallationIsNull:
      createSourceOwnedDefaultProductionBindingInstallation() === null,
    defaultResolveIsNull: resolveCadProductionExecutionBindingSource() === null,
    defaultSourceIsNull: createCadProductionExecutionBindingSource() === null,
    defaultExecutionBindingEnabled:
      createCadProductionExecutionBinding().enabled === true,
  };
}

function service(calls = []) {
  return Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
}

function sourceOwnedGateProof() {
  const calls = [];
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(PROOF_ENV);
  const installation = createSourceOwnedDefaultProductionBindingInstallation({
    gate: PROOF_GATE,
    deploymentMetadata,
    durableService: service(calls),
  });
  const resolved = installation
    ? resolveCadProductionExecutionBindingSource(
      installation,
      () => Date.parse(PROOF_WINDOW.proofNowUtc),
    )
    : null;
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  return {
    proofNowUtc: PROOF_WINDOW.proofNowUtc,
    metadataAccepted: deploymentMetadata !== null,
    proofDeploymentReference: deploymentMetadata?.deploymentReference || null,
    proofDeploymentTarget: deploymentMetadata?.deploymentTarget || null,
    sourceOwnedInstallationNonNull: installation !== null,
    commandCardSha256: installation?.manifest?.commandCardSha256 || null,
    installationSha256: installation?.liveGate?.installationSha256 || null,
    resolvedSourceNonNull: resolved !== null,
    executionSourceNonNull: source !== null,
    executionBindingEnabled: binding.enabled === true,
    effectsExecuted: calls.length,
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const proof = sourceOwnedGateProof();
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-default-production-execution-binding-source-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'DEFAULT_PRODUCTION_EXECUTION_BINDING_SOURCE_CLOSED_AND_PROVABLE',
    boundInputs: {
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      currentDeploymentRuntimeInstallRefreshSha256:
        CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256,
      mainCommit: REVIEWED_MAIN_COMMIT,
      commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
      installationSha256: REVIEWED_INSTALLATION_SHA256,
    },
    defaultGate: DEFAULT_PRODUCTION_BINDING_SOURCE_GATE,
    proofWindow: PROOF_WINDOW,
    defaultProof,
    sourceOwnedGateProof: proof,
    installPathProven:
      defaultProof.defaultGateEnabled === false
      && defaultProof.defaultGateExplicitLiveOpeningApproved === false
      && defaultProof.sourceOwnedDefaultInstallationIsNull === true
      && defaultProof.defaultResolveIsNull === true
      && defaultProof.defaultSourceIsNull === true
      && defaultProof.defaultExecutionBindingEnabled === false
      && proof.metadataAccepted === true
      && proof.sourceOwnedInstallationNonNull === true
      && proof.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && proof.installationSha256 === REVIEWED_INSTALLATION_SHA256
      && proof.resolvedSourceNonNull === true
      && proof.executionSourceNonNull === true
      && proof.executionBindingEnabled === true
      && proof.effectsExecuted === 0,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadAdmissionActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    commandCardIssuedForLiveExecution: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    effectsExecuted: 0,
    nextGate: {
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeCurrentDeploymentRebind: true,
      requiresFreshUtcWindow: true,
      requiresExactCommandCardSha256: true,
      requiresExactInstallationSha256: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge default production execution-binding source closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to default production execution-binding source closure packet SHA-256 <closurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 b082aeeff9b8e1a69e55ad45aa17a73d3fc8068fccd3ece247d8f31109a15b9b, current-deployment runtime-install binding refresh SHA-256 aa411d79aefb67f24e1f0fa0225b9dc828f4491c856d2bb10327e5593d13e3f6, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed default createCadProductionExecutionBinding path can resolve a non-null source-owned production binding only under exact reviewed current-deployment metadata, exact command-card bytes/SHA-256, installation SHA-256, bounded session ref, durable evidence digest, durable service adapter, one-session/one-attempt fence, independent expiry checks, rollback-first controls, and post-rollback fail-closed smoke; recompute durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, fresh UTC opening window, and exact later live-opening approval phrase without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing durable adapter evidence, missing exact bounded session binding, missing installation SHA-256, default production execution binding still resolving null under exact source-owned proof, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'missingDurableAdapterEvidence',
      'missingExactBoundedSessionBinding',
      'privateDataLeakageRisk',
      'defaultProductionExecutionBindingStillResolvingNullUnderExactSourceOwnedProof',
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
      ? 'DEFAULT_PROD_BINDING_SOURCE_CLOSURE_PACKET_VALID_DEFAULT_CLOSED'
      : 'DEFAULT_PROD_BINDING_SOURCE_CLOSURE_PACKET_BLOCKED',
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
  PROOF_GATE,
  PROOF_WINDOW,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  sourceOwnedGateProof,
};
