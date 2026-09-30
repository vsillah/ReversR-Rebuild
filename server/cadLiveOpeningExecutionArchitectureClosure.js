const { createHash } = require('node:crypto');
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

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '1dfc2189e4639ebcf0838fbfedf383122a6142865d99f9eeb4d85e22a3dd463b';
const PRIOR_LIVE_OPENING_REFRESH_SHA256 =
  '57e1e2e4de63fb9c668767959df8ab800e367fc11a84ef3e70f16afae028d9e2';
const REVIEWED_MAIN_COMMIT =
  '132b3fd03ac403d1c58d11273a22198befe82efd';
const REVIEWED_VERCEL_DEPLOYMENT = 'dpl_HJceEhTfsKTFHL1qds7PJBwceEgS';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-5e1c00vgn-vsillahs-projects.vercel.app';
const REVIEWED_COMMAND_CARD_SHA256 =
  '22da640e696105416daf9ff23154fafba418ddf8e389fa296d2bdab928bdf84e';
const REVIEWED_INSTALLATION_SHA256 =
  '8f68f4a8d8ddb11e0074628d017e0a7a698bdad215e597dc4462b56549286134';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-09-30T21:00:00Z',
  expiresUtc: '2026-09-30T21:30:00Z',
  proofNowUtc: '2026-09-30T21:05:00Z',
});

const DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  priorLiveOpeningRefreshSha256: PRIOR_LIVE_OPENING_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  currentDeploymentReference: REVIEWED_VERCEL_DEPLOYMENT,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  cohortRef: REVIEWED_COHORT_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
  commandCardSha256: null,
  installationSha256: null,
  sessionCredentialDigestSha256: null,
  sessionTransport: 'bearer',
  startUtc: null,
  expiresUtc: null,
});

const SHA = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const sha = value => createHash('sha256').update(value).digest('hex');
const isSha = value => typeof value === 'string' && SHA.test(value);
const isIso = value => typeof value === 'string' && ISO.test(value)
  && new Date(value).toISOString().replace('.000Z', 'Z') === value;

function validWindow(startUtc, expiresUtc) {
  if (!isIso(startUtc) || !isIso(expiresUtc)) return false;
  const start = Date.parse(startUtc);
  const expires = Date.parse(expiresUtc);
  return Number.isFinite(start) && Number.isFinite(expires)
    && expires > start
    && expires - start <= 30 * 60 * 1000;
}

function exactGate(gate) {
  return gate && typeof gate === 'object' && !Array.isArray(gate)
    && gate.schemaVersion === 1
    && gate.sourceOnly === true
    && gate.enabled === true
    && gate.explicitLiveOpeningApproved === true
    && gate.stoppedLiveOpeningDispositionSha256 === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && gate.priorLiveOpeningRefreshSha256 === PRIOR_LIVE_OPENING_REFRESH_SHA256
    && gate.mainCommit === REVIEWED_MAIN_COMMIT
    && gate.currentDeploymentReference === REVIEWED_VERCEL_DEPLOYMENT
    && gate.productionTarget === REVIEWED_PRODUCTION_TARGET
    && gate.boundedSessionRef === BOUNDED_SESSION_REF
    && gate.sessionId === BOUNDED_SESSION_REF
    && gate.cohortRef === REVIEWED_COHORT_REF
    && gate.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && gate.durableServiceRef === DURABLE_SERVICE_REF
    && gate.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
    && gate.installationSha256 === REVIEWED_INSTALLATION_SHA256
    && isSha(gate.sessionCredentialDigestSha256)
    && gate.sessionTransport === 'bearer'
    && validWindow(gate.startUtc, gate.expiresUtc)
    && !Object.prototype.hasOwnProperty.call(gate, 'credential')
    && !Object.prototype.hasOwnProperty.call(gate, 'token')
    && !Object.prototype.hasOwnProperty.call(gate, 'secret');
}

function validDeploymentMetadata(metadata, gate) {
  return metadata
    && metadata.schemaVersion === 1
    && metadata.source === 'vercel-system-environment'
    && metadata.secretBearing === false
    && metadata.deploymentReference === gate.currentDeploymentReference
    && metadata.deploymentTarget === gate.productionTarget
    && metadata.projectProductionTarget === 'https://reversr.vercel.app'
    && metadata.gitCommitSha === gate.mainCommit
    && metadata.gitCommitRef === 'main'
    && metadata.gitRepo === 'ReversR-Rebuild'
    && metadata.gitOwner === 'vsillah'
    && metadata.vercelEnv === 'production';
}

function createSourceOwnedLiveOpeningExecutionArchitectureInstallation({
  gate = DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createClosedDurableAdapterService(),
} = {}) {
  try {
    if (!exactGate(gate) || !validDeploymentMetadata(deploymentMetadata, gate)) return null;
    const prepared = createCadProductionRuntimeInstallCurrentBinding({
      deploymentMetadata,
      startUtc: gate.startUtc,
      expiresUtc: gate.expiresUtc,
      enabled: true,
      explicitLiveOpeningApproved: true,
      durableService,
    });
    if (!prepared || prepared.ok !== true) return null;
    const installation = prepared.installation;
    if (!installation
      || installation.manifest?.commandCardSha256 !== gate.commandCardSha256
      || installation.manifest?.currentDeploymentReference !== gate.currentDeploymentReference
      || installation.manifest?.boundedSessionRef !== gate.boundedSessionRef
      || installation.manifest?.sessionId !== gate.sessionId
      || installation.manifest?.durableEvidenceSha256 !== gate.durableEvidenceSha256
      || installation.liveGate?.installationSha256 !== gate.installationSha256) return null;
    return installation;
  } catch {
    return null;
  }
}

function createSourceOwnedLiveOpeningSessionService({
  gate = DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  now = Date.now,
} = {}) {
  try {
    if (!exactGate(gate) || typeof now !== 'function') return null;
    const expiresAt = Date.parse(gate.expiresUtc);
    if (!Number.isSafeInteger(expiresAt)) return null;
    const record = Object.freeze({
      schemaVersion: 1,
      userId: 'source-owned-internal-tester',
      shopId: 'source-owned-internal-shop',
      sessionId: gate.sessionId,
      authMethod: 'password',
      status: 'active',
      transport: gate.sessionTransport,
      expiresAt,
      cadUploadAllowed: true,
    });
    return Object.freeze({
      async issueSession() {
        return Object.freeze({ ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
      },
      async lookupSession(key) {
        const stamp = now();
        if (!Number.isSafeInteger(stamp)
          || stamp < Date.parse(gate.startUtc)
          || stamp >= expiresAt
          || key !== gate.sessionCredentialDigestSha256) return null;
        return record;
      },
      async revokeSession() {
        return Object.freeze({ ok: false, code: 'UPLOAD_SESSION_REVOCATION_NOT_AUTHORIZED' });
      },
    });
  } catch {
    return null;
  }
}

function createLiveOpeningExecutionArchitectureRuntime({
  gate = DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createClosedDurableAdapterService(),
  now = Date.now,
} = {}) {
  const installation = createSourceOwnedLiveOpeningExecutionArchitectureInstallation({
    gate,
    deploymentMetadata,
    durableService,
  });
  const sessionService = createSourceOwnedLiveOpeningSessionService({ gate, now });
  return Object.freeze({
    roadmap: '5/6 complete',
    defaultClosed: true,
    gateAccepted: exactGate(gate),
    deploymentAccepted: exactGate(gate) && validDeploymentMetadata(deploymentMetadata, gate),
    installationNonNull: installation !== null,
    sessionServiceNonNull: sessionService !== null,
    sourceExecutable:
      installation !== null
      && sessionService !== null
      && gate.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
      && gate.installationSha256 === REVIEWED_INSTALLATION_SHA256,
    installation,
    sessionService,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    effectsExecuted: 0,
  });
}

function createProofGate({ sessionCredentialDigestSha256 } = {}) {
  return Object.freeze({
    ...DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
    enabled: true,
    explicitLiveOpeningApproved: true,
    commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
    installationSha256: REVIEWED_INSTALLATION_SHA256,
    sessionCredentialDigestSha256,
    startUtc: REVIEWED_WINDOW.startUtc,
    expiresUtc: REVIEWED_WINDOW.expiresUtc,
  });
}

function proofCredentialDigest(token) {
  return sha(token);
}

module.exports = {
  DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  PRIOR_LIVE_OPENING_REFRESH_SHA256,
  REVIEWED_COHORT_REF,
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
  createSourceOwnedLiveOpeningExecutionArchitectureInstallation,
  createSourceOwnedLiveOpeningSessionService,
  exactGate,
  proofCredentialDigest,
};
