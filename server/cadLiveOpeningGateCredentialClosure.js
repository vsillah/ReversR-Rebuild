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

const {
  CURRENT_DEPLOYMENT_METADATA_POLICY,
  validCurrentDeploymentMetadata,
} = require('./cadLiveOpeningCredentialClosureMetadataPolicy');

// Historical receipt coordinates are retained in bound provenance only.
// Current executable bindings are derived from validated server metadata below.
const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '3b4263b5320b2e2de90f6b67eb19a11be0dae8c433b0074a9a3e690ee681a4ee';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  '62962bf4962099816f9d4ac8fcb49ae1641757ce825d0423e3fe9315fc83b450';
const STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256 =
  '2b47414dda01f46bea2a83d9b5b9b332393f0f53f657ee2db9986af728c092fd';
const HISTORICAL_CREDENTIAL_CLOSURE_PACKET_SHA256 =
  '57675e09d0bd717a4ce6e372e4f49a3c9c494b4dabb29194c3a973a9405584e8';
const HISTORICAL_CREDENTIAL_CLOSURE_SOURCE_COMMIT =
  '4f25f2f1ab3df8964c9aeaba0dafb0216b226637';
const REPAIR_BASE_MAIN_COMMIT = '56a29e337ceb459c66f83d7f5207b7ba74f65686';
const APPROVED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE = '6772517435';
const APPROVED_PRODUCTION_TARGET =
  'https://reversr-a261m8i6x-vsillahs-projects.vercel.app';
const APPROVED_FAIL_CLOSED_SMOKE = Object.freeze({
  status: 401,
  code: 'USER_SESSION_REQUIRED',
  observedNoLaterThanUtc: '2026-09-30T23:39:21Z',
});
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
  stoppedPostMergeRebindRefreshDispositionSha256:
    STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256,
  historicalCredentialClosurePacketSha256: HISTORICAL_CREDENTIAL_CLOSURE_PACKET_SHA256,
  historicalCredentialClosureSourceCommit: HISTORICAL_CREDENTIAL_CLOSURE_SOURCE_COMMIT,
  repairBaseMainCommit: REPAIR_BASE_MAIN_COMMIT,
  approvedGithubProductionDeploymentReference: APPROVED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  approvedProductionTarget: APPROVED_PRODUCTION_TARGET,
  approvedFailClosedSmoke: APPROVED_FAIL_CLOSED_SMOKE,
  currentDeploymentMetadataPolicy: CURRENT_DEPLOYMENT_METADATA_POLICY,
  mainCommit: null,
  productionDeploymentReference: null,
  productionTarget: null,
  commandCardSha256: null,
  installationSha256: null,
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

function exactPrivateSessionCredentialSupply(supply) {
  return supply
    && typeof supply === 'object'
    && !Array.isArray(supply)
    && Object.keys(supply).length === Object.keys(DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY).length
    && Object.keys(supply).every(key => Object.prototype.hasOwnProperty.call(DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY, key))
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

// No rolling window: only an explicit source-owned reviewed window can replace
// the historical default. This factory prepares bindings; it grants no live authority.
function validOpeningWindow(window) {
  const iso = value => typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().replace('.000Z', 'Z') === value;
  return iso(window.startUtc) && iso(window.expiresUtc)
    && Date.parse(window.expiresUtc) > Date.parse(window.startUtc)
    && Date.parse(window.expiresUtc) - Date.parse(window.startUtc) <= 30 * 60 * 1000;
}

function createExactGateFromSource({
  deploymentMetadata,
  privateSessionCredentialSupply,
  openingWindow = REVIEWED_WINDOW,
} = {}) {
  if (!validCurrentDeploymentMetadata(deploymentMetadata)
    || !exactPrivateSessionCredentialSupply(privateSessionCredentialSupply)) {
    return null;
  }
  if (!openingWindow || !validOpeningWindow(openingWindow)) return null;
  const gate = createProofGate({
    deploymentMetadata,
    sessionCredentialDigestSha256: privateSessionCredentialSupply.credentialDigestSha256,
    startUtc: openingWindow.startUtc,
    expiresUtc: openingWindow.expiresUtc,
  });
  if (!gate
    || !SHA.test(gate.commandCardSha256 || '')
    || !SHA.test(gate.installationSha256 || '')
    || gate.mainCommit !== deploymentMetadata.gitCommitSha
    || gate.currentDeploymentReference !== deploymentMetadata.deploymentReference
    || gate.productionTarget !== deploymentMetadata.deploymentTarget
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
  openingWindow = REVIEWED_WINDOW,
  now = Date.now,
} = {}) {
  const deploymentMetadataAccepted = validCurrentDeploymentMetadata(deploymentMetadata);
  const privateCredentialSupplyAccepted =
    exactPrivateSessionCredentialSupply(privateSessionCredentialSupply);
  const gate = createExactGateFromSource({
    deploymentMetadata,
    privateSessionCredentialSupply,
    openingWindow,
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
  APPROVED_FAIL_CLOSED_SMOKE,
  APPROVED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  APPROVED_PRODUCTION_TARGET,
  CURRENT_DEPLOYMENT_METADATA_POLICY,
  DEFAULT_LIVE_GATE_CREDENTIAL_CLOSURE,
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  HISTORICAL_CREDENTIAL_CLOSURE_PACKET_SHA256,
  HISTORICAL_CREDENTIAL_CLOSURE_SOURCE_COMMIT,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  REPAIR_BASE_MAIN_COMMIT,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  STOPPED_POST_MERGE_REBIND_REFRESH_DISPOSITION_SHA256,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createExactGateFromSource,
  createProofPrivateSessionCredentialSupply,
  exactPrivateSessionCredentialSupply,
  validCurrentDeploymentMetadata,
};
