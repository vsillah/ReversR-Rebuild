const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  PRIOR_LIVE_OPENING_REFRESH_SHA256,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_VERCEL_DEPLOYMENT,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createLiveOpeningExecutionArchitectureRuntime,
  createProofGate,
} = require('../server/cadLiveOpeningExecutionArchitectureClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-execution-architecture-closure.json';
const PROOF_CREDENTIAL_DIGEST_SHA256 =
  '2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359';
const PROOF_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: REVIEWED_VERCEL_DEPLOYMENT,
  VERCEL_URL: REVIEWED_PRODUCTION_TARGET.replace('https://', ''),
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'server/index.js',
  'scripts/cad-auth-live-opening-execution-architecture-closure-checker.js',
  'scripts/cad-auth-live-opening-execution-architecture-closure.test.js',
  'docs/cad-auth-live-opening-execution-architecture-closure.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function durableService(calls = []) {
  return Object.fromEntries(METHODS.map(name => [name, async () => {
    calls.push(name);
    throw Error('UNEXPECTED_EFFECT');
  }]));
}

function defaultClosedProof() {
  const runtime = createLiveOpeningExecutionArchitectureRuntime();
  return {
    defaultGateEnabled: DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE.enabled === true,
    defaultGateExplicitLiveOpeningApproved:
      DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE.explicitLiveOpeningApproved === true,
    architectureSourceExecutable: runtime.sourceExecutable === true,
    architectureSessionServiceNonNull: runtime.sessionServiceNonNull === true,
    defaultResolveIsNull: resolveCadProductionExecutionBindingSource() === null,
    defaultSourceIsNull: createCadProductionExecutionBindingSource() === null,
    defaultExecutionBindingEnabled: createCadProductionExecutionBinding().enabled === true,
  };
}

function sourceOwnedArchitectureProof() {
  const calls = [];
  const metadata = readCadProductionCurrentDeploymentMetadata(PROOF_ENV);
  const gate = createProofGate({
    sessionCredentialDigestSha256: PROOF_CREDENTIAL_DIGEST_SHA256,
  });
  const runtime = createLiveOpeningExecutionArchitectureRuntime({
    gate,
    deploymentMetadata: metadata,
    durableService: durableService(calls),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const resolved = runtime.installation
    ? resolveCadProductionExecutionBindingSource(
      runtime.installation,
      () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    )
    : null;
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  return {
    proofNowUtc: REVIEWED_WINDOW.proofNowUtc,
    metadataAccepted: metadata !== null,
    proofDeploymentReference: metadata?.deploymentReference || null,
    proofDeploymentTarget: metadata?.deploymentTarget || null,
    proofCredentialDigestSha256: PROOF_CREDENTIAL_DIGEST_SHA256,
    proofCredentialValueIncluded: false,
    gateAccepted: runtime.gateAccepted === true,
    deploymentAccepted: runtime.deploymentAccepted === true,
    installationNonNull: runtime.installationNonNull === true,
    sessionServiceNonNull: runtime.sessionServiceNonNull === true,
    sourceExecutable: runtime.sourceExecutable === true,
    commandCardSha256: runtime.installation?.manifest?.commandCardSha256 || null,
    installationSha256: runtime.installation?.liveGate?.installationSha256 || null,
    resolvedSourceNonNull: resolved !== null,
    executionSourceNonNull: source !== null,
    executionBindingEnabled: binding.enabled === true,
    effectsExecuted: calls.length,
  };
}

function expectedPacket(readSource = read) {
  const defaultProof = defaultClosedProof();
  const architectureProof = sourceOwnedArchitectureProof();
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-live-opening-execution-architecture-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSED_SOURCE_ONLY',
    purpose: 'close the Step 6 executability gap without activating production upload admission',
    boundInputs: {
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      priorLiveOpeningRefreshSha256: PRIOR_LIVE_OPENING_REFRESH_SHA256,
      mainCommit: REVIEWED_MAIN_COMMIT,
      productionDeployment: REVIEWED_VERCEL_DEPLOYMENT,
      productionTarget: REVIEWED_PRODUCTION_TARGET,
      commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
      installationSha256: REVIEWED_INSTALLATION_SHA256,
      durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
    },
    openingWindow: REVIEWED_WINDOW,
    defaultGate: DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
    defaultClosedProof: defaultProof,
    sourceOwnedArchitectureProof: architectureProof,
    executableSourcePathProven:
      defaultProof.defaultGateEnabled === false
      && defaultProof.defaultGateExplicitLiveOpeningApproved === false
      && defaultProof.defaultResolveIsNull === true
      && defaultProof.defaultSourceIsNull === true
      && defaultProof.defaultExecutionBindingEnabled === false
      && architectureProof.metadataAccepted === true
      && architectureProof.gateAccepted === true
      && architectureProof.deploymentAccepted === true
      && architectureProof.installationNonNull === true
      && architectureProof.sessionServiceNonNull === true
      && architectureProof.sourceExecutable === true
      && architectureProof.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && architectureProof.installationSha256 === REVIEWED_INSTALLATION_SHA256
      && architectureProof.resolvedSourceNonNull === true
      && architectureProof.executionSourceNonNull === true
      && architectureProof.executionBindingEnabled === true
      && architectureProof.effectsExecuted === 0,
    sessionCredentialPrecondition: {
      sourceOwnedDigestOnly: true,
      credentialValueIncluded: false,
      uploadSessionIssuanceAuthorized: false,
      exactBoundedSessionRef: DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE.boundedSessionRef,
      exactSessionId: DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE.sessionId,
      requiredLookupSource: 'server-owned-digest-bound-upload-session-lookup',
      requiredTransport: 'bearer',
    },
    productionPathWiring: {
      indexSelectsSourceOwnedSessionServiceWhenExactGatePresent: true,
      executionBindingResolverIncludesLiveOpeningArchitectureSource: true,
      userImportRouteStillRequiresSessionBeforeRuntimeGate: true,
      routeBodyGateStillRequiresExecutableRuntimeBeforeBodyRead: true,
    },
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    durableServiceLiveQualified: false,
    privateEvidenceRead: false,
    effectsExecuted: 0,
    nextGate: {
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebind: true,
      requiresFreshUtcWindow: true,
      requiresExactCommandCardSha256: true,
      requiresExactInstallationSha256: true,
      requiresExactDigestBoundSessionCredentialSupply: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge live-opening execution architecture deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to live-opening execution architecture closure packet SHA-256 <architectureClosurePacketSha256> at source commit <architectureClosureSourceCommit>, stopped live-opening disposition SHA-256 1dfc2189e4639ebcf0838fbfedf383122a6142865d99f9eeb4d85e22a3dd463b, prior live-opening refresh SHA-256 57e1e2e4de63fb9c668767959df8ab800e367fc11a84ef3e70f16afae028d9e2, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed server-owned production path can resolve the exact live-opening value source and digest-bound session credential precondition from reviewed source while default production remains fail-closed; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, fresh UTC opening window, and exact later live-opening approval phrase only if the default deployed path can resolve a non-null executable binding and session credential precondition under the approved gate without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing executable default binding source path, missing exact digest-bound session credential precondition, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'missingExecutableDefaultBindingSourcePath',
      'missingExactDigestBoundSessionCredentialPrecondition',
      'privateDataLeakageRisk',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ],
    sourceBindings: sourceBindings(readSource),
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
      ? 'LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_VALID_DEFAULT_CLOSED'
      : 'LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_BLOCKED',
    effectsExecuted: 0,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
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
  PROOF_CREDENTIAL_DIGEST_SHA256,
  PROOF_ENV,
  SOURCES,
  checkPacket,
  defaultClosedProof,
  expectedPacket,
  sourceBindings,
  sourceOwnedArchitectureProof,
};
