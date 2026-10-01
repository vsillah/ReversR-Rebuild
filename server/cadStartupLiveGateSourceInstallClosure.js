const {
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const { createClosedDurableAdapterService } = require('./cadProductionExecutionBindingInstallation');
const {
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createProofPrivateSessionCredentialSupply,
} = require('./cadLiveOpeningGateCredentialClosure');
const {
  validCurrentDeploymentMetadata,
} = require('./cadLiveOpeningCredentialClosureMetadataPolicy');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  'ae64570f5b101235fa1f2aa56a020d3d0a694e21f718267e8f4a2f1f5a5df40e';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  'c6373fa18ebc2d5d93e852aef50c721f17164b88bbca7d5e5b9f4e76e1d9ea2e';
const REVIEWED_MAIN_COMMIT = '82dd2cb8af66edf2b4926efa1cd2213e5de770e8';
const REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE = 'dpl_Fmr2h4sZRgujHQarkgxvqvcueiW9';
const REVIEWED_PRODUCTION_HOST = 'reversr-htg38n648-vsillahs-projects.vercel.app';
const REVIEWED_PRODUCTION_TARGET = `https://${REVIEWED_PRODUCTION_HOST}`;
const REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  createDerivedDeploymentReference(REVIEWED_PRODUCTION_HOST, REVIEWED_MAIN_COMMIT);
const REVIEWED_COMMAND_CARD_SHA256 =
  '22d7af21abf6576cc5bae8c4a287e82b7d4eaf56c4a264418f48ff0baf9f4f0f';
const REVIEWED_INSTALLATION_SHA256 =
  '7a49f15dadb27e9c8a8c32422aae67b7d7fd7ea2764fd81242e4efce269f0cf5';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_DURABLE_SERVICE_REF =
  'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const REVIEWED_BOUNDED_SESSION_REF =
  'rrb-ref:cad-upload-internal-mark-test-session-v1';
const REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  'ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-01T05:00:00Z',
  expiresUtc: '2026-10-01T05:30:00Z',
  proofNowUtc: '2026-10-01T05:05:00Z',
});

const DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  productionDeploymentReference: REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  sourceOwnedDeploymentReference: REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
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

const REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE = Object.freeze({
  ...DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  enabled: true,
  explicitLiveOpeningApproved: true,
  commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
  installationSha256: REVIEWED_INSTALLATION_SHA256,
  privateSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  startUtc: REVIEWED_WINDOW.startUtc,
  expiresUtc: REVIEWED_WINDOW.expiresUtc,
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

function exactStartupLiveGateInstallSource(source) {
  return source && typeof source === 'object' && !Array.isArray(source)
    && DANGEROUS_KEYS.every(key => !Object.prototype.hasOwnProperty.call(source, key))
    && source.schemaVersion === 1
    && source.sourceOnly === true
    && source.enabled === true
    && source.explicitLiveOpeningApproved === true
    && source.stoppedLiveOpeningDispositionSha256 === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && source.approvedLiveOpeningRefreshSha256 === APPROVED_LIVE_OPENING_REFRESH_SHA256
    && source.mainCommit === REVIEWED_MAIN_COMMIT
    && source.productionDeploymentReference === REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE
    && source.sourceOwnedDeploymentReference === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE
    && source.productionTarget === REVIEWED_PRODUCTION_TARGET
    && source.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
    && source.installationSha256 === REVIEWED_INSTALLATION_SHA256
    && source.boundedSessionRef === REVIEWED_BOUNDED_SESSION_REF
    && source.sessionId === REVIEWED_BOUNDED_SESSION_REF
    && source.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && source.durableServiceRef === REVIEWED_DURABLE_SERVICE_REF
    && source.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && source.privateSupplyReceiptSha256 === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
    && source.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && SHA.test(source.privateSupplyReceiptSha256)
    && validWindow(source.startUtc, source.expiresUtc);
}

function normalizeStartupDeploymentMetadata(metadata, source) {
  if (!validCurrentDeploymentMetadata(metadata)
    || !exactStartupLiveGateInstallSource(source)
    || metadata.gitCommitSha !== source.mainCommit
    || metadata.deploymentTarget !== source.productionTarget) return null;
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
  source = DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createClosedDurableAdapterService(),
  now = Date.now,
} = {}) {
  const sourceAccepted = exactStartupLiveGateInstallSource(source);
  const normalizedDeploymentMetadata = sourceAccepted
    ? normalizeStartupDeploymentMetadata(deploymentMetadata, source)
    : null;
  const deploymentMetadataAccepted = normalizedDeploymentMetadata !== null;
  if (!sourceAccepted || !deploymentMetadataAccepted || typeof now !== 'function') {
    return disabledStartupClosure({
      deploymentMetadataAccepted,
      startupLiveGateInstallSourceAccepted: sourceAccepted,
      sourceOwnedDeploymentReference: source?.sourceOwnedDeploymentReference || null,
    });
  }
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: source.privateSupplyReceiptSha256,
  });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: normalizedDeploymentMetadata,
    privateSessionCredentialSupply,
    durableService,
    openingWindow: {
      startUtc: source.startUtc,
      expiresUtc: source.expiresUtc,
    },
    now,
  });
  const installation = closure.runtime?.installation || null;
  const accepted = closure.sourceExecutable === true
    && closure.privateCredentialSupplyAccepted === true
    && closure.privateCredentialValueIncluded === false
    && closure.sessionServiceNonNull === true
    && closure.executableRuntime?.enabled === true
    && installation?.manifest?.commandCardSha256 === source.commandCardSha256
    && installation?.manifest?.currentDeploymentReference === source.sourceOwnedDeploymentReference
    && installation?.manifest?.boundedSessionRef === source.boundedSessionRef
    && installation?.manifest?.sessionId === source.sessionId
    && installation?.manifest?.durableEvidenceSha256 === source.durableEvidenceSha256
    && installation?.manifest?.durableServiceRef === source.durableServiceRef
    && installation?.liveGate?.installationSha256 === source.installationSha256;
  if (!accepted) {
    return disabledStartupClosure({
      deploymentMetadataAccepted,
      startupLiveGateInstallSourceAccepted: sourceAccepted,
      sourceOwnedDeploymentReference: source.sourceOwnedDeploymentReference,
    });
  }
  return Object.freeze({
    ...closure,
    deploymentMetadataAccepted: true,
    startupLiveGateInstallSourceAccepted: true,
    startupLiveGateInstallAccepted: true,
    sourceOwnedDeploymentReference: source.sourceOwnedDeploymentReference,
  });
}

module.exports = {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
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
  createCadStartupLiveGateSourceInstallClosure,
  exactStartupLiveGateInstallSource,
  normalizeStartupDeploymentMetadata,
};
