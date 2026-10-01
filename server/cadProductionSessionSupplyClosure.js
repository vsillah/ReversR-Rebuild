const { createHash, timingSafeEqual } = require('node:crypto');
const {
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('./cadLiveOpeningGateCredentialClosure');
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
} = require('./cadProductionExecutionBindingInstallation');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  'b9b92d6832892c64c8ad4dc2889d81297d4afb9d03e93f10792e2fc8d1770036';
const APPROVED_LIVE_OPENING_REFRESH_SHA256 =
  'e4cf5425e1d4459acc24f5580e96d98ae9829cf2b298cf6861df5c5f859e79ad';
const CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256 =
  '7a14abaf5b775d1bfc2fd267b8f167181e9579d2e0ef67ee95b0b8851205ee34';
const PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256 =
  '41d5aae2186edc8035ed08d3f8f608157e0cf9957600f02dfaf10d6efe22ab13';
const CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256 =
  '8187980f0de7d36a87492d93080b59e79d82c1ec2de8d94c31f232e481c7df80';
const REVIEWED_MAIN_COMMIT = '5f839ba1a825206fa5e5a034062fdc6ed128faf6';
const REVIEWED_VERCEL_DEPLOYMENT_REFERENCE = 'dpl_CWBvTNYtxVnRBwbd4qVCkPpkjZSQ';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-mrdsp0v6j-vsillahs-projects.vercel.app';
const REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  'vercel-target:reversr-mrdsp0v6j-vsillahs-projects.vercel.app@5f839ba1a825206fa5e5a034062fdc6ed128faf6';
const REVIEWED_COMMAND_CARD_SHA256 =
  'dd61b6044fc9db2df3da8e7e9698252fd7431c2e632345c57ba91e3310aa398e';
const REVIEWED_INSTALLATION_SHA256 =
  '2aea83127d4ab7c4af9c08149863638b933965a43c90bf254e1af0463b9978f6';
const REVIEWED_DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256 =
  'ced805a319450aab99b305185f52fa4e45bfa1291fcc120a27ad00b6b9f9b7a1';
const REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256 =
  '2165440ab2035b4fa249cf960cc036b449b9eb780776c89ad5cba46b9033e359';
const REVIEWED_COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-01T15:00:00Z',
  expiresUtc: '2026-10-01T15:30:00Z',
});
const PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF =
  'rrb-ref:cad-auth-live-opening-private-session-credential-file-20261001T150000Z';

const SHA = /^[a-f0-9]{64}$/;
const TOKEN = /^us1\.[A-Za-z0-9_-]{43}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const FORBIDDEN_KEYS = Object.freeze([
  'credential',
  'credentialValue',
  'privateCredentialValue',
  'secret',
  'token',
  'authorization',
  'requestBody',
  'body',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeSameSha(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string'
    || !SHA.test(left) || !SHA.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function validUtcWindow(window) {
  if (!window || typeof window !== 'object' || Array.isArray(window)) return false;
  if (!ISO.test(window.startUtc || '') || !ISO.test(window.expiresUtc || '')) return false;
  const start = Date.parse(window.startUtc);
  const expires = Date.parse(window.expiresUtc);
  return Number.isFinite(start)
    && Number.isFinite(expires)
    && expires > start
    && expires - start <= 30 * 60 * 1000;
}

function noPrivateFields(value) {
  return !!(value && typeof value === 'object' && !Array.isArray(value)
    && FORBIDDEN_KEYS.every(key => !Object.prototype.hasOwnProperty.call(value, key)));
}

const DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  roadmap: '5/6 complete',
  status: 'PRODUCTION_SESSION_SUPPLY_CLOSURE_DEFAULT_CLOSED',
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  approvedLiveOpeningRefreshSha256: APPROVED_LIVE_OPENING_REFRESH_SHA256,
  credentialSupplyStopDispositionSha256: CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256,
  privateCredentialReadStopDispositionSha256:
    PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256,
  credentialDerivationStopDispositionSha256:
    CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  vercelDeploymentReference: REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
  sourceOwnedDeploymentReference: REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  productionTarget: REVIEWED_PRODUCTION_TARGET,
  commandCardSha256: REVIEWED_COMMAND_CARD_SHA256,
  installationSha256: REVIEWED_INSTALLATION_SHA256,
  boundedSessionRef: BOUNDED_SESSION_REF,
  sessionId: BOUNDED_SESSION_REF,
  cohortRef: REVIEWED_COHORT_REF,
  durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
  durableServiceRef: DURABLE_SERVICE_REF,
  sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
  digestBoundSessionCredentialPreconditionSha256:
    REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256,
  privateSessionCredentialSupplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  privateCredentialFileRef: PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF,
  privateSupplyReceiptSha256: REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  reviewedWindow: REVIEWED_WINDOW,
  acceptedSupplyModes: Object.freeze([
    'existing-private-bearer-value-matching-approved-digest',
    'future-private-random-bearer-generation-and-source-rebind',
  ]),
  rejectedSupplyModes: Object.freeze([
    'derive-private-bearer-from-sha256-digest',
    'embed-private-bearer-in-public-source',
    'read-request-body-or-private-cad-to-discover-credential',
    'issue-production-upload-session-without-separate-live-credential-supply-gate',
    'substitute-dev-upload-session-issuer',
    'substitute-provider-runtime-secret-or-env-change',
  ]),
});

function createSanitizedCredentialProof({
  credentialSha256,
  supplyRef = PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  supplyReceiptSha256 = REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  credentialShape = 'us1-bearer',
  credentialValueIncluded = false,
  credentialValueDisclosed = false,
  credentialValueStoredInSource = false,
  uploadSessionIssuanceAuthorized = false,
  generatedForNewSourceRebind = false,
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    supplyRef,
    supplyReceiptSha256,
    credentialShape,
    credentialSha256,
    credentialValueIncluded: credentialValueIncluded === true,
    credentialValueDisclosed: credentialValueDisclosed === true,
    credentialValueStoredInSource: credentialValueStoredInSource === true,
    uploadSessionIssuanceAuthorized: uploadSessionIssuanceAuthorized === true,
    generatedForNewSourceRebind: generatedForNewSourceRebind === true,
  });
}

function createRejectedCredentialDerivationProof({
  digestSha256 = SESSION_CREDENTIAL_DIGEST_SHA256,
} = {}) {
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    digestSha256,
    derivationAttempted: false,
    credentialRecoverableFromDigest: false,
    credentialGenerated: false,
    credentialValueIncluded: false,
    uploadSessionIssued: false,
    code: 'CREDENTIAL_DIGEST_PREIMAGE_NOT_DERIVABLE',
  });
}

function validSanitizedCredentialProof(proof, {
  acceptedDigest = SESSION_CREDENTIAL_DIGEST_SHA256,
} = {}) {
  return noPrivateFields(proof)
    && proof.schemaVersion === 1
    && proof.sourceOnly === true
    && proof.supplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && proof.supplyReceiptSha256 === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
    && proof.credentialShape === 'us1-bearer'
    && safeSameSha(proof.credentialSha256, acceptedDigest)
    && proof.credentialValueIncluded === false
    && proof.credentialValueDisclosed === false
    && proof.credentialValueStoredInSource === false
    && proof.uploadSessionIssuanceAuthorized === false;
}

function validClosureSource(source) {
  return noPrivateFields(source)
    && source.schemaVersion === 1
    && source.sourceOnly === true
    && source.enabled === false
    && source.explicitLiveOpeningApproved === false
    && source.stoppedLiveOpeningDispositionSha256
      === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && source.approvedLiveOpeningRefreshSha256 === APPROVED_LIVE_OPENING_REFRESH_SHA256
    && source.credentialSupplyStopDispositionSha256
      === CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256
    && source.privateCredentialReadStopDispositionSha256
      === PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256
    && source.credentialDerivationStopDispositionSha256
      === CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256
    && source.mainCommit === REVIEWED_MAIN_COMMIT
    && source.vercelDeploymentReference === REVIEWED_VERCEL_DEPLOYMENT_REFERENCE
    && source.sourceOwnedDeploymentReference === REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE
    && source.productionTarget === REVIEWED_PRODUCTION_TARGET
    && source.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
    && source.installationSha256 === REVIEWED_INSTALLATION_SHA256
    && source.boundedSessionRef === BOUNDED_SESSION_REF
    && source.sessionId === BOUNDED_SESSION_REF
    && source.cohortRef === REVIEWED_COHORT_REF
    && source.durableEvidenceSha256 === REVIEWED_DURABLE_EVIDENCE_SHA256
    && source.durableServiceRef === DURABLE_SERVICE_REF
    && source.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && source.digestBoundSessionCredentialPreconditionSha256
      === REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256
    && source.privateSessionCredentialSupplyRef === PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF
    && source.privateCredentialFileRef === PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF
    && source.privateSupplyReceiptSha256 === REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256
    && validUtcWindow(source.reviewedWindow)
    && Array.isArray(source.acceptedSupplyModes)
    && source.acceptedSupplyModes.includes('existing-private-bearer-value-matching-approved-digest')
    && source.acceptedSupplyModes.includes('future-private-random-bearer-generation-and-source-rebind')
    && Array.isArray(source.rejectedSupplyModes)
    && source.rejectedSupplyModes.includes('derive-private-bearer-from-sha256-digest')
    && source.rejectedSupplyModes.includes('embed-private-bearer-in-public-source')
    && source.rejectedSupplyModes.includes('issue-production-upload-session-without-separate-live-credential-supply-gate');
}

function createProductionSessionSupplyClosure({
  source = DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
  credentialProof = null,
} = {}) {
  const sourceAccepted = validClosureSource(source);
  const rejectedDerivationProof = createRejectedCredentialDerivationProof({
    digestSha256: source?.sessionCredentialDigestSha256,
  });
  const existingDigestSupplyAccepted = sourceAccepted
    && validSanitizedCredentialProof(credentialProof, {
      acceptedDigest: source.sessionCredentialDigestSha256,
    });
  const futurePrivateGenerationRebindRequired = sourceAccepted
    && !existingDigestSupplyAccepted;
  return Object.freeze({
    roadmap: '5/6 complete',
    sourceOnly: true,
    defaultClosed: true,
    sourceAccepted,
    credentialDerivationRejected:
      rejectedDerivationProof.credentialRecoverableFromDigest === false
      && rejectedDerivationProof.credentialGenerated === false,
    existingDigestSupplyAccepted,
    futurePrivateGenerationRebindRequired,
    sourceCredentialShapeAccepted: TOKEN.test('us1.'.padEnd(47, 'A')),
    credentialValueIncluded: false,
    credentialValueDisclosed: false,
    credentialValueStoredInSource: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    executableCommandCardIssuedForLiveExecution: false,
    runtimeActivated: false,
    effectsExecuted: 0,
    acceptedSupplyModes: sourceAccepted ? source.acceptedSupplyModes : Object.freeze([]),
    rejectedSupplyModes: sourceAccepted ? source.rejectedSupplyModes : Object.freeze([]),
    rejectedDerivationProof,
  });
}

module.exports = {
  APPROVED_LIVE_OPENING_REFRESH_SHA256,
  CREDENTIAL_DERIVATION_STOP_DISPOSITION_SHA256,
  CREDENTIAL_SUPPLY_STOP_DISPOSITION_SHA256,
  DEFAULT_PRODUCTION_SESSION_SUPPLY_CLOSURE,
  PRIVATE_CREDENTIAL_PLACEHOLDER_PATH_REF,
  PRIVATE_CREDENTIAL_READ_STOP_DISPOSITION_SHA256,
  REVIEWED_COHORT_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DIGEST_BOUND_SESSION_CREDENTIAL_PRECONDITION_SHA256,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
  REVIEWED_WINDOW,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createProductionSessionSupplyClosure,
  createRejectedCredentialDerivationProof,
  createSanitizedCredentialProof,
  sha256,
  validClosureSource,
  validSanitizedCredentialProof,
};
