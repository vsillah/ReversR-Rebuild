const {
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
  PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createProofPrivateSessionCredentialSupply,
} = require('./cadLiveOpeningGateCredentialClosure');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');
const {
  DURABLE_SERVICE_REF,
  BOUNDED_SESSION_REF,
  createSourceOwnedDurableAdapterService,
} = require('./cadProductionExecutionBindingInstallation');
const {
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  createCadStartupLiveGateSourceInstallClosure,
  createStartupLiveGateInstallSourceFromMetadata,
  exactStartupLiveGateInstallSource,
} = require('./cadStartupLiveGateSourceInstallClosure');

const POST_MERGE_REBIND_REFRESH_SHA256 =
  '16d5520a28f8c57d7328eab5f9be3174bd8f94c17bacda75aa0a035e520632b5';
const PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256 =
  '26533055c57d5ea7243463baa698edf22d457382242e3931efe863c037acf30f';
const PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT =
  '59373f240ab8cba74dc4005e9f39556253e5f7d3';
const REVIEWED_MAIN_COMMIT =
  'b613888df285a5291fe176142116ff9a5162093a';
const REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE = '6791773894';
const REVIEWED_VERCEL_DEPLOYMENT_REFERENCE =
  'dpl_AurXmnR3TUZyd6CnintDQgqGdT6s';
const REVIEWED_PRODUCTION_TARGET =
  'https://reversr-hpbhbtfo6-vsillahs-projects.vercel.app';
const REVIEWED_PRODUCTION_ALIAS = 'https://reversr.vercel.app';
const REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  'vercel-target:reversr-hpbhbtfo6-vsillahs-projects.vercel.app@b613888df285a5291fe176142116ff9a5162093a';
const REVIEWED_COMMAND_CARD_SHA256 =
  'f77255907ba85e4091974b484af5275bfee3ce47f5cdee4e532c388accad51dc';
const REVIEWED_INSTALLATION_SHA256 =
  '4ef051c3f9bfa14b668afa0811e0213b6f59f3c3c45356a2e3a54bc77dc444e4';
const REVIEWED_FAIL_CLOSED_SMOKE = Object.freeze({
  status: 401,
  code: 'USER_SESSION_REQUIRED',
  observedAtUtc: '2026-10-01T18:15:01Z',
});
const GENERATED_PRIVATE_CREDENTIAL_FILE_REF =
  'rrb-ref:cad-auth-generated-private-session-credential-20261001T190508Z';
const GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256 =
  '6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150';
const GENERATED_PRIVATE_CREDENTIAL_BYTES = 47;
const GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES = 48;
const GENERATED_PRIVATE_CREDENTIAL_CREATED_AT_UTC = '2026-10-01T19:05:08Z';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-01T20:00:00Z',
  expiresUtc: '2026-10-01T20:30:00Z',
  proofNowUtc: '2026-10-01T20:05:00Z',
});

const SHA = /^[a-f0-9]{64}$/;
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

function noPrivateFields(value) {
  return !!(value && typeof value === 'object' && !Array.isArray(value)
    && FORBIDDEN_KEYS.every(key => !Object.prototype.hasOwnProperty.call(value, key)));
}

function proofDeploymentEnvironment() {
  return Object.freeze({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    VERCEL_DEPLOYMENT_ID: REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
    VERCEL_URL: REVIEWED_PRODUCTION_TARGET.replace('https://', ''),
    VERCEL_PROJECT_PRODUCTION_URL: REVIEWED_PRODUCTION_ALIAS.replace('https://', ''),
    VERCEL_GIT_COMMIT_SHA: REVIEWED_MAIN_COMMIT,
    VERCEL_GIT_COMMIT_REF: 'main',
    VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
    VERCEL_GIT_REPO_OWNER: 'vsillah',
  });
}

function createGeneratedCredentialProof() {
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    privateLocalOnly: true,
    generatedExactlyOnce: true,
    credentialShape: 'us1-bearer',
    credentialSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
    previousCredentialSha256: PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
    privateCredentialFileRef: GENERATED_PRIVATE_CREDENTIAL_FILE_REF,
    privateCredentialFileSha256: GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
    credentialBytes: GENERATED_PRIVATE_CREDENTIAL_BYTES,
    fileBytes: GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES,
    generatedAtUtc: GENERATED_PRIVATE_CREDENTIAL_CREATED_AT_UTC,
    credentialValueIncluded: false,
    credentialValueDisclosed: false,
    credentialValueStoredInSource: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeActivated: false,
    effectsExecuted: 0,
  });
}

function createSessionCredentialDigestRebind({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(proofDeploymentEnvironment()),
  openingWindow = REVIEWED_WINDOW,
  privateSupplyReceiptSha256 = GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
} = {}) {
  const generatedCredentialProof = createGeneratedCredentialProof();
  const startupSource = createStartupLiveGateInstallSourceFromMetadata({
    deploymentMetadata,
    openingWindow,
    privateSupplyReceiptSha256,
  });
  const startupSourceAccepted = exactStartupLiveGateInstallSource(startupSource);
  const closure = createCadStartupLiveGateSourceInstallClosure({
    source: startupSource,
    deploymentMetadata,
    durableService: createSourceOwnedDurableAdapterService({
      durableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256,
    }),
    now: () => Date.parse(openingWindow.proofNowUtc),
  });
  const sessionSupply = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: privateSupplyReceiptSha256,
  });
  const accepted = noPrivateFields(generatedCredentialProof)
    && generatedCredentialProof.credentialSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && generatedCredentialProof.previousCredentialSha256
      === PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256
    && generatedCredentialProof.credentialSha256
      !== generatedCredentialProof.previousCredentialSha256
    && SHA.test(generatedCredentialProof.privateCredentialFileSha256)
    && generatedCredentialProof.credentialBytes === GENERATED_PRIVATE_CREDENTIAL_BYTES
    && generatedCredentialProof.fileBytes === GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES
    && sessionSupply.credentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && sessionSupply.credentialValueIncluded === false
    && startupSourceAccepted === true
    && startupSource.commandCardSha256 === REVIEWED_COMMAND_CARD_SHA256
    && startupSource.installationSha256 === REVIEWED_INSTALLATION_SHA256
    && startupSource.sessionCredentialDigestSha256 === SESSION_CREDENTIAL_DIGEST_SHA256
    && closure.deploymentMetadataAccepted === true
    && closure.privateCredentialSupplyAccepted === true
    && closure.startupLiveGateInstallAccepted === true
    && closure.sourceExecutable === true
    && closure.privateCredentialValueIncluded === false
    && closure.uploadSessionIssued === false
    && closure.requestBodyAdmittedOrRead === false
    && closure.effectsExecuted === 0;
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: accepted
      ? 'SESSION_CREDENTIAL_DIGEST_REBOUND_PRIVATE_VALUE_GENERATED_DEFAULT_CLOSED'
      : 'SESSION_CREDENTIAL_DIGEST_REBIND_BLOCKED',
    accepted,
    generatedCredentialProof,
    startupSourceAccepted,
    deploymentMetadataAccepted: closure.deploymentMetadataAccepted === true,
    privateCredentialSupplyAccepted: closure.privateCredentialSupplyAccepted === true,
    startupLiveGateInstallAccepted: closure.startupLiveGateInstallAccepted === true,
    sourceExecutable: closure.sourceExecutable === true,
    sessionServiceNonNull: closure.sessionServiceNonNull === true,
    executableRuntimeEnabled: closure.executableRuntime?.enabled === true,
    commandCardSha256: startupSource?.commandCardSha256 || null,
    installationSha256: startupSource?.installationSha256 || null,
    sessionCredentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
    privateSupplyReceiptSha256,
    sourceOwnedDeploymentReference: startupSource?.sourceOwnedDeploymentReference || null,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    effectsExecuted: 0,
  });
}

module.exports = {
  GENERATED_PRIVATE_CREDENTIAL_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_CREATED_AT_UTC,
  GENERATED_PRIVATE_CREDENTIAL_FILE_BYTES,
  GENERATED_PRIVATE_CREDENTIAL_FILE_REF,
  GENERATED_PRIVATE_CREDENTIAL_FILE_SHA256,
  POST_MERGE_REBIND_REFRESH_SHA256,
  PREVIOUS_SESSION_CREDENTIAL_DIGEST_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_FAIL_CLOSED_SMOKE,
  REVIEWED_GITHUB_PRODUCTION_DEPLOYMENT_REFERENCE,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  REVIEWED_PRODUCTION_ALIAS,
  REVIEWED_PRODUCTION_TARGET,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_VERCEL_DEPLOYMENT_REFERENCE,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createGeneratedCredentialProof,
  createSessionCredentialDigestRebind,
  noPrivateFields,
  proofDeploymentEnvironment,
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF,
};
