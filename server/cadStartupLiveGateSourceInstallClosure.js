const {
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  createSourceOwnedDurableAdapterService,
} = require('./cadProductionExecutionBindingInstallation');
const {
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createExactGateFromSource,
  createProofPrivateSessionCredentialSupply,
} = require('./cadLiveOpeningGateCredentialClosure');
const {
  validCurrentDeploymentMetadata,
} = require('./cadLiveOpeningCredentialClosureMetadataPolicy');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '2981866f2d55a16ab1586d9c297ff58af63aa627dd09536bab40b736aed9de4b';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  '5ceafc4693650f42989cc320fb653254428565056d005b3536e3dc7489eb5c11';
const STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256 =
  'eaa74f2b5c287e7dc008b0317b1f4b297532c087e5ebc9686c47baae0ffd58fb';
const HISTORICAL_REPAIR_PACKET_SHA256 =
  '988386d4eb807cb6cbb98aa1f39253fb88f11f1b17ad18ccc1416f32c6bff38c';
const HISTORICAL_REPAIR_SOURCE_COMMIT =
  'da7a0f15bf5f0d084001cd131a1cd4a8dd1e9310';
const REPAIR_BASE_MAIN_COMMIT = 'fc3a2e20c07922f4188e4c7e2c4878b53f22f6bb';
const REPAIR_BASE_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE =
  'dpl_ArAQeKQ5Gey4fz9BP87KRYSqYo4R';
const REPAIR_BASE_PRODUCTION_HOST = 'reversr-8gns2sgrw-vsillahs-projects.vercel.app';
const REPAIR_BASE_PRODUCTION_TARGET = `https://${REPAIR_BASE_PRODUCTION_HOST}`;
const REPAIR_BASE_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  createDerivedDeploymentReference(REPAIR_BASE_PRODUCTION_HOST, REPAIR_BASE_MAIN_COMMIT);
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_DURABLE_SERVICE_REF =
  'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const REVIEWED_BOUNDED_SESSION_REF =
  'rrb-ref:cad-upload-internal-mark-test-session-v1';
const REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  'ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1';
const GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  '6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150';
const ACTIVE_WINDOW_BINDING_REPAIR_STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '1d5e73cd6104f473a2c4469d7efb9aa1b9f42775bea572bc2f776c01f6a507d0';
const ACTIVE_WINDOW_BINDING_REPAIR_APPROVED_REFRESH_SHA256 =
  '735674f9af7a72ce9be12cb73c433f54aa693f6e5aad159183b07c55110fb308';
const ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT =
  '3df734c7478c037845e8c72a9e32669de3d4093d';
const ACTIVE_WINDOW_BINDING_REPAIR_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE = '6793483139';
const ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_HOST =
  'reversr-333l201xx-vsillahs-projects.vercel.app';
const ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET =
  `https://${ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_HOST}`;
const ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  createDerivedDeploymentReference(
    ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_HOST,
    ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT,
  );
const ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256 =
  '46f806282fababa97966500a40e53ecbc48144cdf2573378b05f23cdc8c052be';
const ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256 =
  '86ab7f459736683a9e8ce85a207657fe16eba091ebe0b34b2870dd20b3d61dd3';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-01T15:00:00Z',
  expiresUtc: '2026-10-01T15:30:00Z',
  proofNowUtc: '2026-10-01T15:05:00Z',
});
const ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW = Object.freeze({
  startUtc: '2026-10-01T23:00:00Z',
  expiresUtc: '2026-10-01T23:30:00Z',
  proofNowUtc: '2026-10-01T23:05:00Z',
});
const ACTIVE_WINDOW_DURATION_MS = 30 * 60 * 1000;

const DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  stoppedPostMergeRebindRefreshDispositionSha256:
    STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256,
  historicalRepairPacketSha256: HISTORICAL_REPAIR_PACKET_SHA256,
  historicalRepairSourceCommit: HISTORICAL_REPAIR_SOURCE_COMMIT,
  repairBaseMainCommit: REPAIR_BASE_MAIN_COMMIT,
  repairBaseGithubProductionDeploymentReference:
    REPAIR_BASE_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  repairBaseProductionTarget: REPAIR_BASE_PRODUCTION_TARGET,
  activeWindowBindingRepairStoppedLiveOpeningDispositionSha256:
    ACTIVE_WINDOW_BINDING_REPAIR_STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  activeWindowBindingRepairApprovedRefreshSha256:
    ACTIVE_WINDOW_BINDING_REPAIR_APPROVED_REFRESH_SHA256,
  activeWindowBindingRepairBaseMainCommit:
    ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT,
  activeWindowBindingRepairGithubProductionDeploymentReference:
    ACTIVE_WINDOW_BINDING_REPAIR_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  activeWindowBindingRepairProductionTarget:
    ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET,
  activeWindowBindingRepairSourceOwnedDeploymentReference:
    ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  activeWindowBindingRepairPreviousCommandCardSha256:
    ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256,
  activeWindowBindingRepairPreviousInstallationSha256:
    ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256,
  mainCommit: null,
  productionDeploymentReference: null,
  sourceOwnedDeploymentReference: null,
  productionTarget: null,
  commandCardSha256: null,
  installationSha256: null,
  boundedSessionRef: REVIEWED_BOUNDED_SESSION_REF,
  sessionId: REVIEWED_BOUNDED_SESSION_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: REVIEWED_DURABLE_SERVICE_REF,
  privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  privateSupplyReceiptSha256: null,
  sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
  startUtc: null,
  expiresUtc: null,
});

const SHA = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DANGEROUS_KEYS = Object.freeze([
  'credential',
  'credentialValue',
  'privateCredentialValue',
  'secret',
  'token',
  'authorization',
  'requestBody',
]);

function validWindow(startUtc, expiresUtc) {
  if (!ISO.test(startUtc || '') || !ISO.test(expiresUtc || '')) return false;
  const start = Date.parse(startUtc);
  const expires = Date.parse(expiresUtc);
  return Number.isFinite(start) && Number.isFinite(expires)
    && expires > start
    && expires - start <= 30 * 60 * 1000;
}

function isoNoMilliseconds(ms) {
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

function createCadStartupActiveLiveOpeningWindow({
  now = Date.now,
  windowDurationMs = ACTIVE_WINDOW_DURATION_MS,
} = {}) {
  const stamp = typeof now === 'function' ? now() : now;
  if (!Number.isFinite(stamp)
    || !Number.isSafeInteger(Math.trunc(stamp))
    || windowDurationMs !== ACTIVE_WINDOW_DURATION_MS) return null;
  const start = Math.floor(stamp / ACTIVE_WINDOW_DURATION_MS) * ACTIVE_WINDOW_DURATION_MS;
  const expires = start + ACTIVE_WINDOW_DURATION_MS;
  const startUtc = isoNoMilliseconds(start);
  const expiresUtc = isoNoMilliseconds(expires);
  const proofNowUtc = isoNoMilliseconds(stamp);
  if (!validWindow(startUtc, expiresUtc)) return null;
  return Object.freeze({ startUtc, expiresUtc, proofNowUtc });
}

function sourceOwnedDeploymentReferenceFromMetadata(deploymentMetadata) {
  if (!validCurrentDeploymentMetadata(deploymentMetadata)) return null;
  return createDerivedDeploymentReference(
    deploymentMetadata.deploymentTarget.replace(/^https:\/\//, ''),
    deploymentMetadata.gitCommitSha,
  );
}

function validPrivateSupplyReceiptSha256(value) {
  return value === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
    || value === GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256;
}

function createStartupLiveGateInstallSourceFromMetadata({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  openingWindow = REVIEWED_WINDOW,
  privateSupplyReceiptSha256 = REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  enabled = true,
  explicitLiveOpeningApproved = true,
} = {}) {
  if (!validCurrentDeploymentMetadata(deploymentMetadata)
    || !validWindow(openingWindow?.startUtc, openingWindow?.expiresUtc)
    || typeof privateSupplyReceiptSha256 !== 'string'
    || !SHA.test(privateSupplyReceiptSha256)) return null;
  const sourceOwnedDeploymentReference =
    sourceOwnedDeploymentReferenceFromMetadata(deploymentMetadata);
  if (!sourceOwnedDeploymentReference) return null;
  const sourceOwnedDeploymentMetadata = Object.freeze({
    ...deploymentMetadata,
    deploymentReference: sourceOwnedDeploymentReference,
  });
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: privateSupplyReceiptSha256,
  });
  const gate = createExactGateFromSource({
    deploymentMetadata: sourceOwnedDeploymentMetadata,
    privateSessionCredentialSupply,
    openingWindow,
  });
  if (!gate) return null;
  return Object.freeze({
    ...DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    enabled: enabled === true,
    explicitLiveOpeningApproved: explicitLiveOpeningApproved === true,
    mainCommit: deploymentMetadata.gitCommitSha,
    productionDeploymentReference: sourceOwnedDeploymentReference,
    sourceOwnedDeploymentReference,
    productionTarget: deploymentMetadata.deploymentTarget,
    commandCardSha256: gate.commandCardSha256,
    installationSha256: gate.installationSha256,
    privateSupplyReceiptSha256,
    startUtc: openingWindow.startUtc,
    expiresUtc: openingWindow.expiresUtc,
  });
}

const REPAIR_BASE_DEPLOYMENT_METADATA = Object.freeze({
  schemaVersion: 1,
  source: 'vercel-system-environment',
  deploymentReference: REPAIR_BASE_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  deploymentTarget: REPAIR_BASE_PRODUCTION_TARGET,
  projectProductionTarget: 'https://reversr.vercel.app',
  gitCommitSha: REPAIR_BASE_MAIN_COMMIT,
  gitCommitRef: 'main',
  gitRepo: 'ReversR-Rebuild',
  gitOwner: 'vsillah',
  vercelEnv: 'production',
  secretBearing: false,
});

const REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE =
  createStartupLiveGateInstallSourceFromMetadata({
    deploymentMetadata: REPAIR_BASE_DEPLOYMENT_METADATA,
    openingWindow: REVIEWED_WINDOW,
  });
const REVIEWED_MAIN_COMMIT = REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.mainCommit;
const REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE =
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.productionDeploymentReference;
const REVIEWED_PRODUCTION_TARGET = REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.productionTarget;
const REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.sourceOwnedDeploymentReference;
const REVIEWED_COMMAND_CARD_SHA256 = REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.commandCardSha256;
const REVIEWED_INSTALLATION_SHA256 = REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE.installationSha256;

function exactStartupLiveGateInstallSource(source) {
  return source && typeof source === 'object' && !Array.isArray(source)
    && DANGEROUS_KEYS.every(key => !Object.prototype.hasOwnProperty.call(source, key))
    && source.schemaVersion === 1
    && source.sourceOnly === true
    && source.enabled === true
    && source.explicitLiveOpeningApproved === true
    && source.stoppedLiveOpeningDispositionSha256 === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && source.approvedLiveOpeningRefreshSha256 === APPROVED_LIVE_OPENING_REFRESH_SHA256
    && source.stoppedPostMergeRebindRefreshDispositionSha256
      === STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256
    && source.historicalRepairPacketSha256 === HISTORICAL_REPAIR_PACKET_SHA256
    && source.historicalRepairSourceCommit === HISTORICAL_REPAIR_SOURCE_COMMIT
    && source.repairBaseMainCommit === REPAIR_BASE_MAIN_COMMIT
    && source.repairBaseGithubProductionDeploymentReference
      === REPAIR_BASE_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE
    && source.repairBaseProductionTarget === REPAIR_BASE_PRODUCTION_TARGET
    && source.activeWindowBindingRepairStoppedLiveOpeningDispositionSha256
      === ACTIVE_WINDOW_BINDING_REPAIR_STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && source.activeWindowBindingRepairApprovedRefreshSha256
      === ACTIVE_WINDOW_BINDING_REPAIR_APPROVED_REFRESH_SHA256
    && source.activeWindowBindingRepairBaseMainCommit
      === ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT
    && source.activeWindowBindingRepairGithubProductionDeploymentReference
      === ACTIVE_WINDOW_BINDING_REPAIR_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE
    && source.activeWindowBindingRepairProductionTarget
      === ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET
    && source.activeWindowBindingRepairSourceOwnedDeploymentReference
      === ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE
    && source.activeWindowBindingRepairPreviousCommandCardSha256
      === ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256
    && source.activeWindowBindingRepairPreviousInstallationSha256
      === ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256
    && typeof source.mainCommit === 'string'
    && /^[a-f0-9]{40}$/.test(source.mainCommit)
    && typeof source.productionDeploymentReference === 'string'
    && source.productionDeploymentReference === source.sourceOwnedDeploymentReference
    && typeof source.productionTarget === 'string'
    && /^https:\/\/reversr-[a-z0-9]+-vsillahs-projects\.vercel\.app$/.test(source.productionTarget)
    && source.sourceOwnedDeploymentReference
      === createDerivedDeploymentReference(
        source.productionTarget.replace(/^https:\/\//, ''),
        source.mainCommit,
      )
    && SHA.test(source.commandCardSha256 || '')
    && SHA.test(source.installationSha256 || '')
    && source.boundedSessionRef === REVIEWED_BOUNDED_SESSION_REF
    && source.sessionId === REVIEWED_BOUNDED_SESSION_REF
    && source.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && source.durableServiceRef === REVIEWED_DURABLE_SERVICE_REF
    && source.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && validPrivateSupplyReceiptSha256(source.privateSupplyReceiptSha256)
    && source.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && SHA.test(source.privateSupplyReceiptSha256)
    && validWindow(source.startUtc, source.expiresUtc);
}

function normalizeStartupDeploymentMetadata(metadata, source) {
  if (!validCurrentDeploymentMetadata(metadata)
    || !exactStartupLiveGateInstallSource(source)
    || metadata.gitCommitSha !== source.mainCommit
    || metadata.deploymentTarget !== source.productionTarget
    || sourceOwnedDeploymentReferenceFromMetadata(metadata)
      !== source.sourceOwnedDeploymentReference) return null;
  return Object.freeze({
    ...metadata,
    deploymentReference: source.sourceOwnedDeploymentReference,
  });
}

function disabledStartupClosure({
  deploymentMetadataAccepted = false,
  startupLiveGateInstallSourceAccepted = false,
  sourceOwnedDeploymentReference = null,
} = {}) {
  const closure = createCadLiveOpeningGateCredentialClosure({
    privateSessionCredentialSupply: DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  });
  return Object.freeze({
    ...closure,
    deploymentMetadataAccepted,
    startupLiveGateInstallSourceAccepted,
    startupLiveGateInstallAccepted: false,
    sourceOwnedDeploymentReference,
  });
}

function createCadStartupLiveGateSourceInstallClosure({
  source,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createSourceOwnedDurableAdapterService({
    durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  }),
  now = Date.now,
} = {}) {
  const activeOpeningWindow = createCadStartupActiveLiveOpeningWindow({ now });
  const startupSource = source || createStartupLiveGateInstallSourceFromMetadata({
    deploymentMetadata,
    openingWindow: activeOpeningWindow,
    privateSupplyReceiptSha256: GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  });
  const sourceAccepted = exactStartupLiveGateInstallSource(startupSource);
  const normalizedDeploymentMetadata = sourceAccepted
    ? normalizeStartupDeploymentMetadata(deploymentMetadata, startupSource)
    : null;
  const deploymentMetadataAccepted = normalizedDeploymentMetadata !== null;
  if (!sourceAccepted || !deploymentMetadataAccepted || typeof now !== 'function') {
    return disabledStartupClosure({
      deploymentMetadataAccepted,
      startupLiveGateInstallSourceAccepted: sourceAccepted,
      sourceOwnedDeploymentReference: startupSource?.sourceOwnedDeploymentReference || null,
    });
  }
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: startupSource.privateSupplyReceiptSha256,
  });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: normalizedDeploymentMetadata,
    privateSessionCredentialSupply,
    durableService,
    openingWindow: {
      startUtc: startupSource.startUtc,
      expiresUtc: startupSource.expiresUtc,
    },
    now,
  });
  const installation = closure.runtime?.installation || null;
  const accepted = closure.sourceExecutable === true
    && closure.privateCredentialSupplyAccepted === true
    && closure.privateCredentialValueIncluded === false
    && closure.sessionServiceNonNull === true
    && closure.executableRuntime?.enabled === true
    && installation?.manifest?.commandCardSha256 === startupSource.commandCardSha256
    && installation?.manifest?.currentDeploymentReference
      === startupSource.sourceOwnedDeploymentReference
    && installation?.manifest?.boundedSessionRef === startupSource.boundedSessionRef
    && installation?.manifest?.sessionId === startupSource.sessionId
    && installation?.manifest?.durableEvidenceSha256 === startupSource.durableEvidenceSha256
    && installation?.manifest?.durableServiceRef === startupSource.durableServiceRef
    && installation?.liveGate?.installationSha256 === startupSource.installationSha256;
  if (!accepted) {
    return disabledStartupClosure({
      deploymentMetadataAccepted,
      startupLiveGateInstallSourceAccepted: sourceAccepted,
      sourceOwnedDeploymentReference: startupSource.sourceOwnedDeploymentReference,
    });
  }
  return Object.freeze({
    ...closure,
    deploymentMetadataAccepted: true,
    startupLiveGateInstallSourceAccepted: true,
    startupLiveGateInstallAccepted: true,
    startupLiveGateInstallSource: startupSource,
    sourceOwnedDeploymentReference: startupSource.sourceOwnedDeploymentReference,
  });
}

function createCadStartupLiveGateSessionService({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata,
  durableService,
  now = Date.now,
  fallbackSessionService,
} = {}) {
  const readDeploymentMetadata = typeof deploymentMetadata === 'function'
    ? deploymentMetadata
    : () => deploymentMetadata;
  const fallback = fallbackSessionService
    && typeof fallbackSessionService.lookupSession === 'function'
    ? fallbackSessionService
    : null;
  return Object.freeze({
    async issueSession() {
      return Object.freeze({ ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
    },
    async lookupSession(key, options = {}) {
      options.signal?.throwIfAborted?.();
      let record = null;
      try {
        const closure = createCadStartupLiveGateSourceInstallClosure({
          deploymentMetadata: readDeploymentMetadata(),
          durableService,
          now,
        });
        if (closure.startupLiveGateInstallAccepted === true
          && closure.sessionService
          && typeof closure.sessionService.lookupSession === 'function') {
          record = await closure.sessionService.lookupSession(key, options);
        }
      } catch {
        record = null;
      }
      if (record) return record;
      return fallback ? fallback.lookupSession(key, options) : null;
    },
    async revokeSession() {
      return Object.freeze({ ok: false, code: 'UPLOAD_SESSION_REVOCATION_NOT_AUTHORIZED' });
    },
  });
}

module.exports = {
  ACTIVE_WINDOW_BINDING_REPAIR_APPROVED_REFRESH_SHA256,
  ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT,
  ACTIVE_WINDOW_BINDING_REPAIR_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256,
  ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256,
  ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET,
  ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW,
  ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  ACTIVE_WINDOW_BINDING_REPAIR_STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  ACTIVE_WINDOW_DURATION_MS,
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_DURABLE_SERVICE_REF,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  HISTORICAL_REPAIR_PACKET_SHA256,
  HISTORICAL_REPAIR_SOURCE_COMMIT,
  REPAIR_BASE_DEPLOYMENT_METADATA,
  REPAIR_BASE_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  REPAIR_BASE_MAIN_COMMIT,
  REPAIR_BASE_PRODUCTION_TARGET,
  REPAIR_BASE_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256,
  createCadStartupLiveGateSourceInstallClosure,
  createCadStartupActiveLiveOpeningWindow,
  createCadStartupLiveGateSessionService,
  createStartupLiveGateInstallSourceFromMetadata,
  exactStartupLiveGateInstallSource,
  normalizeStartupDeploymentMetadata,
  sourceOwnedDeploymentReferenceFromMetadata,
  validPrivateSupplyReceiptSha256,
};
