const { createHash } = require('node:crypto');
const {
  createCadLiveOpeningExecutableRuntimeBootstrap,
} = require('./cadLiveOpeningExecutableRuntimeBootstrap');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  createClosedDurableAdapterService,
} = require('./cadProductionExecutionBindingInstallation');
const {
  createCadProductionRuntimeInstallCurrentBinding,
} = require('./cadProductionRuntimeInstallCurrentBinding');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  resolveCadProductionExecutionBindingSource,
} = require('./cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('./cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('./cadProductionExecutionBinding');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  'b76e6905da7b5280773c91be57d7d1c19d75436a38e231f088d6a035ec455ef1';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  '7c116ee03e31704f6a7e474bbc798b74c78ad9d22e386c54e5f24bc177bf917c';
const REVIEWED_MAIN_COMMIT =
  '4b3a7ba11f7c7923f102d1c8c5781fb1864afb18';
const REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT = '6765609019';
const REVIEWED_VERCEL_DEPLOYMENT = 'dpl_xDYQQL53YYtwD2ibRNjTdTnqLsLv';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-1o9k6ee2i-vsillahs-projects.vercel.app';
const REVIEWED_FAIL_CLOSED_SMOKE = Object.freeze({
  status: 401,
  code: 'USER_SESSION_REQUIRED',
  observedAtUtc: '2026-09-30T17:19:29Z',
});
const REVIEWED_COMMAND_CARD_SHA256 =
  'c0aeb4afd461dcd976264211408c14c6f5f18c6917892183a1a323d69f14bd46';
const REVIEWED_INSTALLATION_SHA256 =
  '068eb93f043762003460adaa42b52a26078eeef79fbc1bac383ace0a7723d3f9';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-09-30T18:30:00Z',
  expiresUtc: '2026-09-30T19:00:00Z',
  proofNowUtc: '2026-09-30T18:35:00Z',
});

const REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const sha = value => createHash('sha256').update(value).digest('hex');

const REVIEWED_DEPLOYMENT_ENV = Object.freeze({
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_DEPLOYMENT_ID: REVIEWED_VERCEL_DEPLOYMENT,
  VERCEL_URL: 'reversr-1o9k6ee2i-vsillahs-projects.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
  VERCEL_GIT_REPO_OWNER: 'vsillah',
});

const REVIEWED_LIVE_GATE_SOURCE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  githubProductionDeployment: REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  vercelDeployment: REVIEWED_VERCEL_DEPLOYMENT,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
  failClosedSmoke: REVIEWED_FAIL_CLOSED_SMOKE,
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
  commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
  installationSha256: REVIEWED_INSTALLATION_SHA256,
  openingWindow: REVIEWED_WINDOW,
  enabledOnlyByExplicitLiveGate: true,
  productionDefaultStillFailClosed: true,
});

const REVIEWED_SESSION_CREDENTIAL_PRECONDITION = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  credentialValueIncluded: false,
  uploadSessionIssuanceAuthorized: false,
  runtimeInstallationAuthorized: false,
  runtimeActivationAuthorized: false,
  requiredVerifier: 'server/uploadSession.js#createUploadSessionVerifier',
  requiredLookupSource: 'server-owned-upload-session-lookup',
  credentialDigestOnly: true,
  exactBoundedSessionRef: BOUNDED_SESSION_REF,
  exactSessionId: BOUNDED_SESSION_REF,
  exactCohortRef: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
  exactDurableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  acceptedTransports: Object.freeze(['bearer', 'cookie-with-csrf']),
  requiredRecord: Object.freeze({
    schemaVersion: 1,
    status: 'active',
    cadUploadAllowed: true,
    authMethodOneOf: Object.freeze(['password', 'passkey', 'oidc']),
  }),
  stopIfCredentialMissingOrUnverified: true,
});

function validDeploymentMetadata(metadata) {
  return metadata
    && metadata.schemaVersion === 1
    && metadata.source === 'vercel-system-environment'
    && metadata.secretBearing === false
    && metadata.deploymentReference === REVIEWED_VERCEL_DEPLOYMENT
    && metadata.deploymentTarget === REVIEWED_PRODUCTION_TARGET
    && metadata.projectProductionTarget === 'https://reversr.vercel.app'
    && metadata.gitCommitSha === REVIEWED_MAIN_COMMIT
    && metadata.gitCommitRef === 'main'
    && metadata.gitRepo === 'ReversR-Rebuild'
    && metadata.gitOwner === 'vsillah'
    && metadata.vercelEnv === 'production';
}

function reviewSessionCredentialPrecondition(
  precondition = REVIEWED_SESSION_CREDENTIAL_PRECONDITION,
) {
  const accepted = precondition
    && typeof precondition === 'object'
    && !Array.isArray(precondition)
    && precondition.schemaVersion === 1
    && precondition.sourceOnly === true
    && precondition.credentialValueIncluded === false
    && precondition.uploadSessionIssuanceAuthorized === false
    && precondition.runtimeInstallationAuthorized === false
    && precondition.runtimeActivationAuthorized === false
    && precondition.requiredVerifier === 'server/uploadSession.js#createUploadSessionVerifier'
    && precondition.requiredLookupSource === 'server-owned-upload-session-lookup'
    && precondition.credentialDigestOnly === true
    && precondition.exactBoundedSessionRef === BOUNDED_SESSION_REF
    && precondition.exactSessionId === BOUNDED_SESSION_REF
    && precondition.exactDurableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && Array.isArray(precondition.acceptedTransports)
    && precondition.acceptedTransports.includes('bearer')
    && precondition.acceptedTransports.includes('cookie-with-csrf')
    && precondition.requiredRecord
    && precondition.requiredRecord.schemaVersion === 1
    && precondition.requiredRecord.status === 'active'
    && precondition.requiredRecord.cadUploadAllowed === true
    && Array.isArray(precondition.requiredRecord.authMethodOneOf)
    && precondition.requiredRecord.authMethodOneOf.includes('password')
    && precondition.requiredRecord.authMethodOneOf.includes('passkey')
    && precondition.requiredRecord.authMethodOneOf.includes('oidc')
    && precondition.stopIfCredentialMissingOrUnverified === true
    && !Object.prototype.hasOwnProperty.call(precondition, 'credential')
    && !Object.prototype.hasOwnProperty.call(precondition, 'token')
    && !Object.prototype.hasOwnProperty.call(precondition, 'secret');
  return Object.freeze({
    accepted: accepted === true,
    code: accepted
      ? 'SESSION_CREDENTIAL_PRECONDITION_SOURCE_OWNED'
      : 'SESSION_CREDENTIAL_PRECONDITION_UNRESOLVED',
    exactBoundedSessionRef: accepted ? precondition.exactBoundedSessionRef : null,
    credentialValueIncluded: precondition?.credentialValueIncluded === true,
    uploadSessionIssuanceAuthorized: false,
    effectsExecuted: 0,
  });
}

function createReviewedProductionBindingInstallation({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(REVIEWED_DEPLOYMENT_ENV),
  liveGateSource = REVIEWED_LIVE_GATE_SOURCE,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  try {
    if (!validDeploymentMetadata(deploymentMetadata)) return null;
    if (!liveGateSource || liveGateSource.schemaVersion !== 1
      || liveGateSource.sourceOnly !== true
      || liveGateSource.stoppedLiveOpeningDispositionSha256
        !== STOPPED_LIVE_OPENING_DISPOSITION_SHA256
      || liveGateSource.approvedLiveOpeningRefreshSha256 !== APPROVED_LIVE_OPENING_REFRESH_SHA256
      || liveGateSource.mainCommit !== REVIEWED_MAIN_COMMIT
      || liveGateSource.vercelDeployment !== REVIEWED_VERCEL_DEPLOYMENT
      || liveGateSource.commandCardSha256 !== REVIEWED_COMMAND_CARD_SHA256
      || liveGateSource.installationSha256 !== REVIEWED_INSTALLATION_SHA256
      || liveGateSource.boundedSessionRef !== BOUNDED_SESSION_REF
      || liveGateSource.sessionId !== BOUNDED_SESSION_REF
      || liveGateSource.durableEvidenceSha256 !== REVIEWED_DURABLE_EVIDENCE_SHA256
      || liveGateSource.durableServiceRef !== DURABLE_SERVICE_REF) return null;
    const prepared = createCadProductionRuntimeInstallCurrentBinding({
      deploymentMetadata,
      startUtc: liveGateSource.openingWindow?.startUtc,
      expiresUtc: liveGateSource.openingWindow?.expiresUtc,
      enabled: true,
      explicitLiveOpeningApproved: true,
      durableService,
    });
    if (prepared.ok !== true) return null;
    const installation = prepared.installation;
    if (!installation
      || installation.manifest.commandCardSha256 !== REVIEWED_COMMAND_CARD_SHA256
      || installation.liveGate.installationSha256 !== REVIEWED_INSTALLATION_SHA256
      || installation.manifest.currentDeploymentReference !== REVIEWED_VERCEL_DEPLOYMENT
      || installation.manifest.sessionId !== BOUNDED_SESSION_REF
      || installation.manifest.durableEvidenceSha256 !== REVIEWED_DURABLE_EVIDENCE_SHA256) {
      return null;
    }
    return installation;
  } catch {
    return null;
  }
}

function proofFromReviewedSource({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(REVIEWED_DEPLOYMENT_ENV),
  sessionCredentialPrecondition = REVIEWED_SESSION_CREDENTIAL_PRECONDITION,
  durableService = createClosedDurableAdapterService(),
  now = () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
} = {}) {
  const session = reviewSessionCredentialPrecondition(sessionCredentialPrecondition);
  const installation = createReviewedProductionBindingInstallation({
    deploymentMetadata,
    durableService,
  });
  const resolved = installation
    ? resolveCadProductionExecutionBindingSource(installation, now)
    : null;
  const source = createCadProductionExecutionBindingSource(resolved);
  const binding = createCadProductionExecutionBinding(source);
  const runtimeMount = createCadLiveOpeningExecutableRuntimeBootstrap({
    executableRuntime: binding,
  });
  return Object.freeze({
    roadmap: '5/6 complete',
    metadataAccepted: validDeploymentMetadata(deploymentMetadata),
    defaultProductionBehaviorClosed: true,
    liveGateSourceAccepted: installation !== null,
    commandCardSha256: installation?.manifest?.commandCardSha256 || null,
    installationSha256: installation?.liveGate?.installationSha256 || null,
    resolvedSourceNonNull: resolved !== null,
    executionSourceNonNull: source !== null,
    executionBindingEnabled: binding.enabled === true,
    executableRuntimeMounted: runtimeMount.executableRuntimeWiringMounted === true,
    runtimeMountDefaultClosed: runtimeMount.defaultClosed === true,
    sessionCredentialPreconditionAccepted: session.accepted,
    exactBoundedSessionRef: session.exactBoundedSessionRef,
    executablePathProven:
      validDeploymentMetadata(deploymentMetadata)
      && installation !== null
      && resolved !== null
      && source !== null
      && binding.enabled === true
      && runtimeMount.executableRuntimeWiringMounted === true
      && runtimeMount.defaultClosed === true
      && session.accepted === true,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    effectsExecuted: 0,
  });
}

function createDigestBoundSessionRecord({
  sessionId = BOUNDED_SESSION_REF,
  transport = 'bearer',
  now = Date.parse(REVIEWED_WINDOW.proofNowUtc),
  expiresAt = Date.parse(REVIEWED_WINDOW.expiresUtc),
} = {}) {
  if (!ID.test(sessionId) || !['bearer', 'cookie'].includes(transport)) return null;
  return Object.freeze({
    schemaVersion: 1,
    userId: 'synthetic-source-owned-user',
    shopId: 'synthetic-source-owned-shop',
    sessionId,
    authMethod: 'password',
    status: 'active',
    transport,
    expiresAt: Math.max(expiresAt, now + 1000),
    cadUploadAllowed: true,
  });
}

function bindingSummary() {
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(REVIEWED_DEPLOYMENT_ENV);
  const proof = proofFromReviewedSource({ deploymentMetadata });
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-live-opening-executability-blocker-closure-v1',
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: proof.executablePathProven
      ? 'LIVE_OPENING_EXECUTABILITY_BLOCKERS_CLOSED_SOURCE_ONLY_DEFAULT_CLOSED'
      : 'LIVE_OPENING_EXECUTABILITY_BLOCKERS_UNRESOLVED',
    reviewedLiveGateSourceSha256: sha(JSON.stringify(REVIEWED_LIVE_GATE_SOURCE)),
    reviewedSessionCredentialPreconditionSha256:
      sha(JSON.stringify(REVIEWED_SESSION_CREDENTIAL_PRECONDITION)),
    proof,
  });
}

module.exports = {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DEPLOYMENT_ENV,
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
  createDigestBoundSessionRecord,
  createReviewedProductionBindingInstallation,
  proofFromReviewedSource,
  reviewSessionCredentialPrecondition,
};
