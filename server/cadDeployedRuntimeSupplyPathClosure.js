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

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '49a3e56d788ebfc5195225e3a6a8874b07187403a7acbe4811652bcb17a0778f';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  'fb3b8e86e6334931840651ca044c81635e18922dfbae153a918aeecf31f6cb35';
const REVIEWED_MAIN_COMMIT = '363501f667b1421a3d40d3fc50fb1eac880dae0e';
const REVIEWED_PRODUCTION_HOST = 'reversr-8mzd86ytj-vsillahs-projects.vercel.app';
const REVIEWED_PRODUCTION_TARGET = `https://${REVIEWED_PRODUCTION_HOST}`;
const REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT = '6774037135';
const REVIEWED_COMMAND_CARD_SHA256 =
  'c7b7c61a7b131b5824195c6a89ff2001184b89aa40d26b3f4c83b8d83152e608';
const REVIEWED_INSTALLATION_SHA256 =
  '0bc156e717eb8455c5a7482ec5c1b13f98bdcf7dc8bea9206558f36395cb3e03';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_BOUNDED_SESSION_REF =
  'rrb-ref:cad-upload-internal-mark-test-session-v1';
const REVIEWED_DURABLE_SERVICE_REF =
  'rrb-ref:cad-auth-durable-service-20260928T161754Z';
// Digest of the non-secret receipt label:
// cad-auth-deployed-runtime-supply-path-closure-private-supply-receipt-v1
const REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  'ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1';
const REVIEWED_DEPLOYMENT_REFERENCE =
  createDerivedDeploymentReference(REVIEWED_PRODUCTION_HOST, REVIEWED_MAIN_COMMIT);
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-01T04:00:00Z',
  expiresUtc: '2026-10-01T04:30:00Z',
  proofNowUtc: '2026-10-01T04:05:00Z',
});

const DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  githubProductionDeploymentReference: REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  currentDeploymentReference: null,
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

const REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE = Object.freeze({
  ...DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  enabled: true,
  explicitLiveOpeningApproved: true,
  currentDeploymentReference: REVIEWED_DEPLOYMENT_REFERENCE,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
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

function exactGate(gate) {
  return gate && typeof gate === 'object' && !Array.isArray(gate)
    && DANGEROUS_KEYS.every(key => !Object.prototype.hasOwnProperty.call(gate, key))
    && gate.schemaVersion === 1
    && gate.sourceOnly === true
    && gate.enabled === true
    && gate.explicitLiveOpeningApproved === true
    && gate.stoppedLiveOpeningDispositionSha256 === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && gate.approvedLiveOpeningRefreshSha256 === APPROVED_LIVE_OPENING_REFRESH_SHA256
    && gate.mainCommit === REVIEWED_MAIN_COMMIT
    && gate.githubProductionDeploymentReference === REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT
    && gate.currentDeploymentReference === REVIEWED_DEPLOYMENT_REFERENCE
    && gate.productionTarget === REVIEWED_PRODUCTION_TARGET
    && gate.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
    && gate.installationSha256 === REVIEWED_INSTALLATION_SHA256
    && gate.boundedSessionRef === REVIEWED_BOUNDED_SESSION_REF
    && gate.sessionId === REVIEWED_BOUNDED_SESSION_REF
    && gate.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && gate.durableServiceRef === REVIEWED_DURABLE_SERVICE_REF
    && gate.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && gate.privateSupplyReceiptSha256 === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
    && gate.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && SHA.test(gate.privateSupplyReceiptSha256)
    && validWindow(gate.startUtc, gate.expiresUtc);
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

function disabledClosure({
  deploymentMetadata,
  deployedRuntimeSupplyPathGateAccepted = false,
  deployedRuntimeSupplyPathMetadataAccepted = false,
} = {}) {
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata,
    privateSessionCredentialSupply: DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  });
  return Object.freeze({
    ...closure,
    deployedRuntimeSupplyPathGateAccepted,
    deployedRuntimeSupplyPathMetadataAccepted,
    deployedRuntimeSupplyPathAccepted: false,
  });
}

function createCadDeployedRuntimeSupplyPathClosure({
  gate = DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createClosedDurableAdapterService(),
  now = Date.now,
} = {}) {
  const gateAccepted = exactGate(gate);
  const metadataAccepted = gateAccepted && validDeploymentMetadata(deploymentMetadata, gate);
  if (!gateAccepted || !metadataAccepted || typeof now !== 'function') {
    return disabledClosure({
      deploymentMetadata,
      deployedRuntimeSupplyPathGateAccepted: gateAccepted,
      deployedRuntimeSupplyPathMetadataAccepted: metadataAccepted,
    });
  }
  const privateSessionCredentialSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: gate.privateSupplyReceiptSha256,
  });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata,
    privateSessionCredentialSupply,
    durableService,
    openingWindow: {
      startUtc: gate.startUtc,
      expiresUtc: gate.expiresUtc,
    },
    now,
  });
  const installation = closure.runtime?.installation || null;
  const accepted = closure.sourceExecutable === true
    && closure.privateCredentialSupplyAccepted === true
    && closure.privateCredentialValueIncluded === false
    && closure.sessionServiceNonNull === true
    && closure.executableRuntime?.enabled === true
    && installation?.manifest?.commandCardSha256 === gate.commandCardSha256
    && installation?.manifest?.currentDeploymentReference === gate.currentDeploymentReference
    && installation?.manifest?.boundedSessionRef === gate.boundedSessionRef
    && installation?.manifest?.sessionId === gate.sessionId
    && installation?.manifest?.durableEvidenceSha256 === gate.durableEvidenceSha256
    && installation?.manifest?.durableServiceRef === gate.durableServiceRef
    && installation?.liveGate?.installationSha256 === gate.installationSha256;
  if (!accepted) {
    return disabledClosure({
      deploymentMetadata,
      deployedRuntimeSupplyPathGateAccepted: gateAccepted,
      deployedRuntimeSupplyPathMetadataAccepted: metadataAccepted,
    });
  }
  return Object.freeze({
    ...closure,
    deployedRuntimeSupplyPathGateAccepted: true,
    deployedRuntimeSupplyPathMetadataAccepted: true,
    deployedRuntimeSupplyPathAccepted: true,
  });
}

module.exports = {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  DEFAULT_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  REVIEWED_DEPLOYMENT_REFERENCE,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_DURABLE_SERVICE_REF,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadDeployedRuntimeSupplyPathClosure,
  exactGate,
  validDeploymentMetadata,
};
