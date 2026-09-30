const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_FAIL_CLOSED_SMOKE,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_LIVE_GATE_SOURCE,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SESSION_CREDENTIAL_PRECONDITION,
  REVIEWED_VERCEL_DEPLOYMENT,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  bindingSummary,
  proofFromReviewedSource,
} = require('../server/cadLiveOpeningExecutabilityBlockerClosure');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-executability-blocker-closure.json';
const SOURCES = Object.freeze([
  'server/cadLiveOpeningExecutabilityBlockerClosure.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadUserUploadRouter.js',
  'server/uploadSession.js',
  'scripts/cad-auth-live-opening-executability-blocker-closure-checker.js',
  'scripts/cad-auth-live-opening-executability-blocker-closure.test.js',
  'docs/cad-auth-live-opening-executability-blocker-closure.md',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const shaJson = value => sha(JSON.stringify(value));

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function expectedPacket(readSource = read) {
  const summary = bindingSummary();
  const proof = proofFromReviewedSource();
  return {
    schemaVersion: 1,
    artifact: 'cad-auth-live-opening-executability-blocker-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: 'LIVE_OPENING_EXECUTABILITY_BLOCKERS_CLOSED_SOURCE_ONLY_DEFAULT_CLOSED',
    stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
    approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
    mainCommit: REVIEWED_MAIN_COMMIT,
    githubProductionDeployment: REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
    vercelDeployment: REVIEWED_VERCEL_DEPLOYMENT,
    productionTarget: REVIEWED_PRODUCTION_TARGET,
    failClosedSmoke: REVIEWED_FAIL_CLOSED_SMOKE,
    commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
    installationSha256: REVIEWED_INSTALLATION_SHA256,
    durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
    openingWindow: {
      startUtc: REVIEWED_WINDOW.startUtc,
      expiresUtc: REVIEWED_WINDOW.expiresUtc,
      proofNowUtc: REVIEWED_WINDOW.proofNowUtc,
    },
    reviewedLiveGateSourceSha256: shaJson(REVIEWED_LIVE_GATE_SOURCE),
    reviewedSessionCredentialPreconditionSha256:
      shaJson(REVIEWED_SESSION_CREDENTIAL_PRECONDITION),
    sourceModuleSummary: summary,
    reviewedProof: proof,
    blockersClosed: {
      defaultProductionBindingSourceGate: proof.liveGateSourceAccepted === true
        && proof.resolvedSourceNonNull === true
        && proof.executionBindingEnabled === true
        && proof.runtimeMountDefaultClosed === true,
      exactSessionCredentialPrecondition: proof.sessionCredentialPreconditionAccepted === true,
      routeRequiresCredentialBeforeRuntime: true,
      requestBodyGateRequiresRuntimeBeforeBodyRead: true,
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
      requiresSourceOwnedSessionCredentialSupplyOrVerification: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge live-opening executability blocker closure deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to live-opening executability blocker closure packet SHA-256 <closurePacketSha256> at source commit <closureSourceCommit>, stopped live-opening disposition SHA-256 b76e6905da7b5280773c91be57d7d1c19d75436a38e231f088d6a035ec455ef1, approved live-opening refresh SHA-256 7c116ee03e31704f6a7e474bbc798b74c78ad9d22e386c54e5f24bc177bf917c, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed source can resolve the reviewed default binding source path and exact source-owned session credential precondition without runtime activation; recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, fresh UTC opening window, and exact later live-opening approval phrase only if both executability blockers remain closed from reviewed source. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private evidence reads, durable-service live qualification, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved digest, private-data leakage risk, unknown outcome, unresolved command-card binding, missing executable default binding source path, missing exact session credential precondition, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    },
    stopConditions: [
      'failingChecks',
      'failingSmoke',
      'unknownOutcome',
      'staleDeploymentBinding',
      'missingExecutableDefaultBindingSourcePath',
      'missingExactSessionCredentialPrecondition',
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
      ? 'LIVE_OPENING_EXECUTABILITY_BLOCKER_CLOSURE_PACKET_VALID_DEFAULT_CLOSED'
      : 'LIVE_OPENING_EXECUTABILITY_BLOCKER_CLOSURE_PACKET_BLOCKED',
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
  SOURCES,
  checkPacket,
  expectedPacket,
  sourceBindings,
};
