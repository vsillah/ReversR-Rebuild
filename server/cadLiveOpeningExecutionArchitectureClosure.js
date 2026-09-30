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

const STOPPED_REBIND_REFRESH_DISPOSITION_SHA256 =
  'e56c49ce604785639e5c26f32ad5eeb3feb6de62d1b86981098c555743906eb1';
const LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_SHA256 =
  'ba7a5080df17f5a280dc3bfc8b2f013a36795a4b8fab169ede024711bb3e3865';
const PRODUCTION_SOURCE_INSTALL_VALIDATION_REPAIR_PACKET_SHA256 =
  '39c2610bdcc6a5c90ea20fdd98d00ee2c93cec4c4eb5e230576231039e6dc5bd';
const REVIEWED_MAIN_COMMIT = 'c3dca67a292cd082f08ba0f6e382009d81b5b586';
const REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT = '6770063484';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-905t8gphz-vsillahs-projects.vercel.app';
const REVIEWED_FAIL_CLOSED_SMOKE = Object.freeze({
  status: 401,
  code: 'USER_SESSION_REQUIRED',
  observedAtUtc: '2026-09-30T21:04:32Z',
});
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-09-30T21:30:00Z',
  expiresUtc: '2026-09-30T22:00:00Z',
  proofNowUtc: '2026-09-30T21:35:00Z',
});

const DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedRebindRefreshDispositionSha256: STOPPED_REBIND_REFRESH_DISPOSITION_SHA256,
  architectureClosurePacketSha256: LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_SHA256,
  sourceInstallValidationRepairPacketSha256:
    PRODUCTION_SOURCE_INSTALL_VALIDATION_REPAIR_PACKET_SHA256,
  mainCommit: null,
  currentDeploymentReference: null,
  productionTarget: null,
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
    && gate.stoppedRebindRefreshDispositionSha256 === STOPPED_REBIND_REFRESH_DISPOSITION_SHA256
    && gate.architectureClosurePacketSha256
      === LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_SHA256
    && gate.sourceInstallValidationRepairPacketSha256
      === PRODUCTION_SOURCE_INSTALL_VALIDATION_REPAIR_PACKET_SHA256
    && typeof gate.mainCommit === 'string'
    && typeof gate.currentDeploymentReference === 'string'
    && typeof gate.productionTarget === 'string'
    && gate.boundedSessionRef === BOUNDED_SESSION_REF
    && gate.sessionId === BOUNDED_SESSION_REF
    && gate.cohortRef === REVIEWED_COHORT_REF
    && gate.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && gate.durableServiceRef === DURABLE_SERVICE_REF
    && isSha(gate.commandCardSha256)
    && isSha(gate.installationSha256)
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
      && installation.manifest?.commandCardSha256 === gate.commandCardSha256
      && installation.liveGate?.installationSha256 === gate.installationSha256,
    installation,
    sessionService,
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    effectsExecuted: 0,
  });
}

function createProofGate({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  sessionCredentialDigestSha256,
  startUtc = REVIEWED_WINDOW.startUtc,
  expiresUtc = REVIEWED_WINDOW.expiresUtc,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  const prepared = createCadProductionRuntimeInstallCurrentBinding({
    deploymentMetadata,
    startUtc,
    expiresUtc,
    enabled: true,
    explicitLiveOpeningApproved: true,
    durableService,
  });
  const installation = prepared.ok === true ? prepared.installation : null;
  return Object.freeze({
    ...DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
    enabled: true,
    explicitLiveOpeningApproved: true,
    mainCommit: deploymentMetadata?.gitCommitSha || null,
    currentDeploymentReference: deploymentMetadata?.deploymentReference || null,
    productionTarget: deploymentMetadata?.deploymentTarget || null,
    commandCardSha256: installation?.manifest?.commandCardSha256 || null,
    installationSha256: installation?.liveGate?.installationSha256 || null,
    sessionCredentialDigestSha256,
    startUtc,
    expiresUtc,
  });
}

function proofCredentialDigest(token) {
  return sha(token);
}

module.exports = {
  DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  LIVE_OPENING_EXECUTION_ARCHITECTURE_CLOSURE_PACKET_SHA256,
  PRODUCTION_SOURCE_INSTALL_VALIDATION_REPAIR_PACKET_SHA256,
  REVIEWED_COHORT_REF,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_FAIL_CLOSED_SMOKE,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_WINDOW,
  STOPPED_REBIND_REFRESH_DISPOSITION_SHA256,
  createLiveOpeningExecutionArchitectureRuntime,
  createProofGate,
  createSourceOwnedLiveOpeningExecutionArchitectureInstallation,
  createSourceOwnedLiveOpeningSessionService,
  exactGate,
  proofCredentialDigest,
};
