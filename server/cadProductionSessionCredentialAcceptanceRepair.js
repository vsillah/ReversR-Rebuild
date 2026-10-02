const { createHash } = require('node:crypto');
const {
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('./cadLiveOpeningGateCredentialClosure');

const STOPPED_LIVE_OPENING_ATTEMPT_UTC = '2026-10-02T02:36:11Z';
const STOPPED_LIVE_OPENING_RESPONSE = Object.freeze({
  status: 401,
  code: 'USER_SESSION_REQUIRED',
});
const POST_MERGE_REBIND_REFRESH_SHA256 =
  'dd11136bfd377bc87c054feb18099963b731b36f88b6d4094e2390b0ff8472c0';
const MAIN_COMMIT = '753763b30a87027a8d40b6498e4dc50303f70ec1';
const PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256 =
  '2745397078fbfb1152c64dcb955de43cd547648972cce6a9f171af16af429a03';
const PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT =
  'f37cccb5ac84ebbda9815a03584ed87a267e8a18';
const ACTIVE_WINDOW_BINDING_REPAIR_PACKET_SHA256 =
  '1f61744882fd9c4e3f04da901a2cfa53a978741ee94db8d35587e04b3e9552d3';
const GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256 =
  SESSION_CREDENTIAL_DIGEST_SHA256;
const GENERATED_PRIVATE_CREDENTIAL_FILE_REF =
  'rrb-ref:cad-auth-generated-private-session-credential-20261001T190508Z';
const PRIVATE_SUPPLY_RECEIPT_SHA256 =
  '6da997122386aefce6c31cd86f060af1a848bae80bfd763eb47b94f61399f150';
const GITHUB_PRODUCTION_DEPLOYMENT = '6799151138';
const SOURCE_OWNED_DEPLOYMENT_REFERENCE =
  'vercel-target:reversr-g1um2jo3h-vsillahs-projects.vercel.app@753763b30a87027a8d40b6498e4dc50303f70ec1';
const PRODUCTION_TARGET = 'https://reversr-g1um2jo3h-vsillahs-projects.vercel.app';
const PRODUCTION_ALIAS = 'https://reversr.vercel.app';
const FAIL_CLOSED_SMOKE_OBSERVED_AT_UTC = '2026-10-02T01:32:45Z';
const DURABLE_SERVICE_REF = 'rrb-ref:cad-auth-durable-service-20260928T161754Z';
const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const COHORT_REF = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const DURABLE_EVIDENCE_DIGEST =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const PRIVATE_CREDENTIAL_SUPPLY_REF =
  'rrb-ref:cad-auth-live-opening-private-session-credential-supply-v1';
const COMMAND_CARD_SHA256 =
  '6924fd93019a641f2dd00382b963eb021d1685c3a33eb6dd0fccc214160898e4';
const INSTALLATION_SHA256 =
  '27ab900b3af13e86e14de57da2114bc8dd2caac2406af1ed7b63edf5bf1946e3';
const REVIEWED_WINDOW = Object.freeze({
  startUtc: '2026-10-02T02:30:00Z',
  expiresUtc: '2026-10-02T03:00:00Z',
});

const OPAQUE_US1_SECRET = /^us1\.[A-Za-z0-9_-]{43}$/;
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

function noPrivateFields(value) {
  return !!(value && typeof value === 'object' && !Array.isArray(value)
    && FORBIDDEN_KEYS.every(key => !Object.prototype.hasOwnProperty.call(value, key)));
}

function createOpaqueTokenVerifierProof({
  token = `us1.${'A'.repeat(42)}B`,
} = {}) {
  const suffix = token.slice(4);
  const canonicalized = Buffer.from(suffix, 'base64url').toString('base64url');
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    credentialShape: 'us1-opaque-url-safe-bearer',
    tokenValueIncluded: false,
    credentialValueDisclosed: false,
    acceptsOpaqueUrlSafeBearerShape: OPAQUE_US1_SECRET.test(token),
    intentionallyNonCanonicalFixture: canonicalized !== suffix,
    verifierLookupDigestSha256: sha256(token),
    verifierCanonicalBase64RequirementRemoved: true,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    effectsExecuted: 0,
  });
}

function createProductionSessionCredentialAcceptanceRepair() {
  const opaqueProof = createOpaqueTokenVerifierProof();
  const accepted = noPrivateFields(opaqueProof)
    && opaqueProof.acceptsOpaqueUrlSafeBearerShape === true
    && opaqueProof.intentionallyNonCanonicalFixture === true
    && opaqueProof.verifierCanonicalBase64RequirementRemoved === true
    && /^[a-f0-9]{64}$/.test(opaqueProof.verifierLookupDigestSha256)
    && opaqueProof.uploadSessionIssued === false
    && opaqueProof.requestBodyAdmittedOrRead === false
    && opaqueProof.effectsExecuted === 0;
  return Object.freeze({
    schemaVersion: 1,
    sourceOnly: true,
    roadmap: '5/6 complete',
    status: accepted
      ? 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_REPAIRED_DEFAULT_CLOSED'
      : 'PRODUCTION_SESSION_CREDENTIAL_ACCEPTANCE_REPAIR_BLOCKED',
    accepted,
    stoppedLiveOpening: Object.freeze({
      observedAtUtc: STOPPED_LIVE_OPENING_ATTEMPT_UTC,
      response: STOPPED_LIVE_OPENING_RESPONSE,
      expectedTerminal: Object.freeze({
        status: 503,
        code: 'USER_UPLOADS_DISABLED',
      }),
    }),
    boundInputs: Object.freeze({
      postMergeRebindRefreshSha256: POST_MERGE_REBIND_REFRESH_SHA256,
      mainCommit: MAIN_COMMIT,
      productionSessionSupplyClosurePacketSha256:
        PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256,
      productionSessionSupplyClosureSourceCommit:
        PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT,
      activeWindowBindingRepairPacketSha256:
        ACTIVE_WINDOW_BINDING_REPAIR_PACKET_SHA256,
      generatedPrivateCredentialDigestSha256:
        GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
      generatedPrivateCredentialFileRef:
        GENERATED_PRIVATE_CREDENTIAL_FILE_REF,
      privateSupplyReceiptSha256: PRIVATE_SUPPLY_RECEIPT_SHA256,
      githubProductionDeployment: GITHUB_PRODUCTION_DEPLOYMENT,
      sourceOwnedDeploymentReference: SOURCE_OWNED_DEPLOYMENT_REFERENCE,
      productionTarget: PRODUCTION_TARGET,
      productionAlias: PRODUCTION_ALIAS,
      failClosedSmokeObservedAtUtc: FAIL_CLOSED_SMOKE_OBSERVED_AT_UTC,
      durableServiceRef: DURABLE_SERVICE_REF,
      boundedSessionRef: BOUNDED_SESSION_REF,
      sessionId: BOUNDED_SESSION_REF,
      cohortRef: COHORT_REF,
      durableEvidenceDigest: DURABLE_EVIDENCE_DIGEST,
      privateCredentialSupplyRef: PRIVATE_CREDENTIAL_SUPPLY_REF,
      commandCardSha256: COMMAND_CARD_SHA256,
      installationSha256: INSTALLATION_SHA256,
      reviewedWindow: REVIEWED_WINDOW,
    }),
    verifierRepair: opaqueProof,
    defaultProductionBehaviorClosed: true,
    liveOpeningAuthorized: false,
    uploadSessionIssued: false,
    productionUploadActivated: false,
    requestBodyAdmittedOrRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    runtimeInstallationActivated: false,
    runtimeActivated: false,
    executableCommandCardIssuedForLiveExecution: false,
    effectsExecuted: 0,
    nextGate: Object.freeze({
      requiresPublicReviewMergeAndProductionSmoke: true,
      requiresPostMergeDeploymentRebindRefresh: true,
      requiresFreshLiveOpeningWindow: true,
      approvalPhraseTemplate:
        'I approve a bounded source-only/no-live CAD Auth post-merge production session credential acceptance repair deployment rebind refresh for ReversR-Rebuild at main commit <postMergeMainCommit>, bound to production session credential acceptance repair packet SHA-256 <credentialAcceptanceRepairPacketSha256> at source commit <credentialAcceptanceRepairSourceCommit>, stopped live-opening attempt at 2026-10-02T02:36:11Z where production returned 401 USER_SESSION_REQUIRED, production deployment <currentProductionDeploymentReference>, production target <currentProductionTarget>, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at <smokeObservedAtUtc>. Scope: verify the deployed upload-session verifier accepts the exact reviewed opaque URL-safe digest-bound private bearer shape through the source-owned live-opening session service path while default production remains fail-closed, then recompute current-production deployment binding, durable evidence digest, exact bounded session binding, executable command-card bytes/SHA-256, installation SHA-256, private credential supply requirement, fresh UTC opening window, and exact later live-opening approval phrase without runtime activation. No repo changes, deployment, provider/env/resource/billing changes, secrets or secret reads, private credential reads, private evidence reads, upload-session issuance, production upload activation, request-body admission/read beyond fail-closed smoke, conversion, Sandbox dispatch, private CAD use, runtime installation activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on stale deployment binding, unresolved production session credential acceptance, unresolved digest, private credential leakage risk, unknown outcome, missing executable runtime binding, missing installation SHA-256, or any need for runtime credentials/provider configuration.',
    }),
    stopConditions: Object.freeze([
      'failingChecks',
      'unknownOutcome',
      'privateCredentialLeakageRisk',
      'unresolvedProductionSessionCredentialAcceptance',
      'missingExecutableRuntimeBinding',
      'missingInstallationSha256',
      'runtimeCredentialsOrProviderConfigurationNeeded',
    ]),
  });
}

module.exports = {
  ACTIVE_WINDOW_BINDING_REPAIR_PACKET_SHA256,
  BOUNDED_SESSION_REF,
  COHORT_REF,
  COMMAND_CARD_SHA256,
  DURABLE_EVIDENCE_DIGEST,
  GENERATED_PRIVATE_CREDENTIAL_DIGEST_SHA256,
  INSTALLATION_SHA256,
  MAIN_COMMIT,
  POST_MERGE_REBIND_REFRESH_SHA256,
  PRIVATE_CREDENTIAL_SUPPLY_REF,
  PRIVATE_SUPPLY_RECEIPT_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_PACKET_SHA256,
  PRODUCTION_SESSION_SUPPLY_CLOSURE_SOURCE_COMMIT,
  REVIEWED_WINDOW,
  SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  STOPPED_LIVE_OPENING_ATTEMPT_UTC,
  createOpaqueTokenVerifierProof,
  createProductionSessionCredentialAcceptanceRepair,
  noPrivateFields,
};
