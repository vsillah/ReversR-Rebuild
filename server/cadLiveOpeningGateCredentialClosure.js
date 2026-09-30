const { timingSafeEqual } = require('node:crypto');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  createClosedDurableAdapterService,
} = require('./cadProductionExecutionBindingInstallation');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  createCadProductionExecutionBinding,
} = require('./cadProductionExecutionBinding');
const {
  createCadProductionExecutionBindingSource,
} = require('./cadProductionExecutionBindingSource');
const {
  resolveCadProductionExecutionBindingSource,
} = require('./cadProductionExecutionBindingSourceInstall');
const {
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  createLiveOpeningExecutionArchitectureRuntime,
  createProofGate,
} = require('./cadLiveOpeningExecutionArchitectureClosure');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '3b4263b5320b2e2de90f6b67eb19a11be0dae8c433b0074a9a3e690ee681a4ee';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  '62962bf4962099816f9d4ac8fcb49ae1641757ce825d0423e3fe9315fc83b450';
const MAIN_COMMIT = 'cb54d59ac736bc765acb80ce36488aa629312349';
const PRODUCTION_DEPLOYMENT_REFERENCE = 'dpl_ARaPCuetGiJ3QVhjYe7HKPwGsHrM';
const PRODUCTION_TARGET = 'https://reversr-9yit4igr7-vsillahs-projects.vercel.app';
const COMMAND_CARD_SHA256 =
  '66e2d93402a56fc265349db4b4b6473b99b73683cc975014c388b47fa7dbe6c9';
const INSTALLATION_SHA256 =
  '8d13d28fcffbe4c75db7803aa5224554723708e53087148d7d0649d73cc810ee';
const SESSION_CREDENTIAL_DIGEST_SHA256 =
  '2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359';
const PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF =
  'rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-09-30T23:00:00Z',
  expiresUtc: '2026-09-30T23:30:00Z',
  proofNowUtc: '2026-09-30T23:05:00Z',
});

const SHA = /^[a-f0-9]{64}$/;
const DANGEROUS_PRIVATE_KEYS = Object.freeze([
  'credential',
  'credentialValue',
  'privateCredentialValue',
  'secret',
  'token',
  'uploadSession',
  'authorization',
]);

const DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  supplied: false,
  supplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  credentialDigestSha256: null,
  credentialTransport: 'bearer',
  credentialValueIncluded: false,
  credentialValueDisclosed: false,
  credentialValueStoredInSource: false,
  uploadSessionIssuanceAuthorized: false,
  supplyReceiptSha256: null,
});

const DEFAULT_LIVE_GATE_CREDENTIAL_CLOSURE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  defaultClosed: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  mainCommit: MAIN_COMMIT,
  productionDeploymentReference: PRODUCTION_DEPLOYMENT_REFERENCE,
  productionTarget: PRODUCTION_TARGET,
  commandCardSha256: COMMAND_CARD_SHA256,
  installationSha256: INSTALLATION_SHA256,
  sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
  privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
  startUtc: REVIEWED_WINDOW.startUtc,
  expiresUtc: REVIEWED_WINDOW.expiresUtc,
});

const safeSameDigest = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string'
    || !SHA.test(left) || !SHA.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
};

function validDeploymentMetadata(metadata) {
  return metadata
    && metadata.schemaVersion === 1
    && metadata.source === 'vercel-system-environment'
    && metadata.secretBearing === false
    && metadata.deploymentReference === PRODUCTION_DEPLOYMENT_REFERENCE
    && metadata.deploymentTarget === PRODUCTION_TARGET
    && metadata.projectProductionTarget === 'https://reversr.vercel.app'
    && metadata.gitCommitSha === MAIN_COMMIT
    && metadata.gitCommitRef === 'main'
    && metadata.gitRepo === 'ReversR-Rebuild'
    && metadata.gitOwner === 'vsillah'
    && metadata.vercelEnv === 'production';
}

function exactPrivateSessionCredentialSupply(supply) {
  return supply
    && typeof supply === 'object'
    && !Array.isArray(supply)
    && DANGEROUS_PRIVATE_KEYS.every(key => !Object.prototype.hasOwnProperty.call(supply, key))
    && supply.schemaVersion === 1
    && supply.sourceOnly === true
    && supply.supplied === true
    && supply.supplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && safeSameDigest(supply.credentialDigestSha256, SESSION_CREDENTIAL_DIGEST_SHA256)
    && supply.credentialTransport === 'bearer'
    && supply.credentialValueIncluded === false
    && supply.credentialValueDisclosed === false
    && supply.credentialValueStoredInSource === false
    && supply.uploadSessionIssuanceAuthorized === false
    && typeof supply.supplyReceiptSha256 === 'string'
    && SHA.test(supply.supplyReceiptSha256);
}

function createProofPrivateSessionCredentialSupply({
  supplyReceiptSha256 = 'f'.repeat(64),
} = {}) {
  return Object.freeze({
    ...DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
    supplied: true,
    credentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
    supplyReceiptSha256,
  });
}

function createExactGateFromSource({
  deploymentMetadata,
  privateSessionCredentialSupply,
} = {}) {
  if (!validDeploymentMetadata(deploymentMetadata)
    || !exactPrivateSessionCredentialSupply(privateSessionCredentialSupply)) {
    return null;
  }
  const gate = createProofGate({
    deploymentMetadata,
    sessionCredentialDigestSha256: privateSessionCredentialSupply.credentialDigestSha256,
    startUtc: REVIEWED_WINDOW.startUtc,
    expiresUtc: REVIEWED_WINDOW.expiresUtc,
  });
  if (!gate
    || gate.commandCardSha256 !== COMMAND_CARD_SHA256
    || gate.installationSha256 !== INSTALLATION_SHA256
    || gate.mainCommit !== MAIN_COMMIT
    || gate.currentDeploymentReference !== PRODUCTION_DEPLOYMENT_REFERENCE
    || gate.productionTarget !== PRODUCTION_TARGET
    || gate.boundedSessionRef !== BOUNDED_SESSION_REF
    || gate.sessionId !== BOUNDED_SESSION_REF
    || gate.durableEvidenceSha256 !== REVIEWED_DURABLE_EVIDENCE_SHA256
    || gate.durableServiceRef !== DURABLE_SERVICE_REF) return null;
  return gate;
}

function disabledClosureResult({
  deploymentMetadataAccepted = false,
  privateCredentialSupplyAccepted = false,
} = {}) {
  return Object.freeze({
    roadmap: '5/6 complete',
    defaultClosed: true,
    deploymentMetadataAccepted,
    privateCredentialSupplyAccepted,
    gateNonNull: false,
    installationNonNull: false,
    sessionServiceNonNull: false,
    sourceExecutable: false,
    runtime: null,
    sessionService: null,
    executableRuntime: createCadProductionExecutionBinding(),
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    privateCredentialValueIncluded: false,
    effectsExecuted: 0,
  });
}

function createCadLiveOpeningGateCredentialClosure({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  privateSessionCredentialSupply = DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  durableService = createClosedDurableAdapterService(),
  now = Date.now,
} = {}) {
  const deploymentMetadataAccepted = validDeploymentMetadata(deploymentMetadata);
  const privateCredentialSupplyAccepted =
    exactPrivateSessionCredentialSupply(privateSessionCredentialSupply);
  const gate = createExactGateFromSource({
    deploymentMetadata,
    privateSessionCredentialSupply,
  });
  if (!gate || typeof now !== 'function') {
    return disabledClosureResult({ deploymentMetadataAccepted, privateCredentialSupplyAccepted });
  }
  const runtime = createLiveOpeningExecutionArchitectureRuntime({
    gate,
    deploymentMetadata,
    durableService,
    now,
  });
  const resolved = runtime.installation
    ? resolveCadProductionExecutionBindingSource(runtime.installation, now)
    : null;
  const source = createCadProductionExecutionBindingSource(resolved);
  const executableRuntime = createCadProductionExecutionBinding(source);
  const sourceExecutable = runtime.sourceExecutable === true
    && runtime.sessionServiceNonNull === true
    && executableRuntime.enabled === true;
  return Object.freeze({
    roadmap: '5/6 complete',
    defaultClosed: true,
    deploymentMetadataAccepted,
    privateCredentialSupplyAccepted,
    gateNonNull: true,
    installationNonNull: runtime.installationNonNull === true,
    sessionServiceNonNull: runtime.sessionServiceNonNull === true,
    sourceExecutable,
    runtime,
    sessionService: runtime.sessionService,
    executableRuntime: sourceExecutable ? executableRuntime : createCadProductionExecutionBinding(),
    liveOpeningAuthorized: false,
    runtimeActivated: false,
    uploadSessionIssued: false,
    requestBodyAdmittedOrRead: false,
    privateCredentialValueIncluded: false,
    effectsExecuted: 0,
  });
}

module.exports = {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  COMMAND_CARD_SHA256,
  DEFAULT_LIVE_GATE_CREDENTIAL_CLOSURE,
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  INSTALLATION_SHA256,
  MAIN_COMMIT,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  PRODUCTION_DEPLOYMENT_REFERENCE,
  PRODUCTION_TARGET,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createExactGateFromSource,
  createProofPrivateSessionCredentialSupply,
  exactPrivateSessionCredentialSupply,
};
