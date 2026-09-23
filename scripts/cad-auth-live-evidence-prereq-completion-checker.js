// Fixed source-review completion packet only. No live provider, request or command input.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkPrerequisites } = require('./cad-auth-live-evidence-prereq-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-prereq-completion.json';
const PARENT_MERGE = 'aa263e6458f902e9d6bfd337d12e6dbeb48bccb9';
const RUNTIME_SOURCES = Object.freeze(['api/[...path].js', 'server/index.js',
  'server/cadUserUploadRouter.js', 'server/cadUserUploadAdmission.js',
  'server/cadProductionSessionVerifierBinding.js', 'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js', 'server/uploadSession.js']);
const SOURCES = Object.freeze([PARENT, ...RUNTIME_SOURCES,
  'offline/cad-convex/productionVerifierCandidate.js',
  'offline/cad-auth-sealed-setup/providerAdapter.js',
  'offline/cad-auth-sealed-setup/providerAdapter.d.ts',
  'offline/cad-auth-sealed-setup/receiptCollector.js',
  'offline/cad-auth-sealed-setup/routeInstrumentation.js',
  'docs/cad-auth-live-evidence-prereq-completion.md',
  'scripts/cad-auth-live-evidence-prereq-completion-checker.js',
  'scripts/cad-auth-live-evidence-prereq-completion.test.js',
  'package.json', 'package-lock.json', 'vercel.json']);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = file => `source-only:${file}`;
const missingReview = status => Object.freeze({
  status, reviewerRef: null, receiptRef: null, accepted: false,
});

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkPrerequisites(parent, { readSource }).ok) throw Error('INVALID_PARENT');
  const pkg = JSON.parse(readSource('package.json'));
  const lock = JSON.parse(readSource('package-lock.json'));
  const sourceSdkVersions = { '@convex-dev/auth': '0.0.95', '@auth/core': '0.41.3', convex: '1.45.0' };
  for (const [name, version] of Object.entries(sourceSdkVersions)) {
    if (pkg.dependencies[name] !== version || lock.packages[`node_modules/${name}`].version !== version) {
      throw Error('SDK_SOURCE_DRIFT');
    }
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-evidence-prereq-completion-v1',
    sourceOnly: true,
    status: 'SOURCE_DETAILS_BOUND_LIVE_EVIDENCE_STILL_BLOCKED',
    parent: { packet: parent.packet, mergeCommit: PARENT_MERGE, sha256: sha(readSource(PARENT)) },
    claims: {
      ...parent.claims,
      providerPolicyAccepted: false,
      actualRouteProven: false,
      livePrerequisitesSatisfied: false,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      bodyAdmissionAuthorized: false,
      providerEnvResourceBillingChanges: false,
      secretReads: false,
      executableCommandCardIssued: false,
      commercialReadiness: false,
    },
    completion: {
      sourceProviderPolicyAdapterDetails: true,
      sourceRouteBodyInstallationReview: true,
      sourceImmutableTargetReviewManifest: true,
      sourceRestrictedSyntheticCohortLifecycleManifest: true,
      sourceCustodyReviewerDispositionManifest: true,
      sourceLateGrantObserverDesign: true,
      liveEvidenceReady: false,
      sealed: false,
      executable: false,
    },
    card: {
      sealed: false, executable: false, commandLine: null, dryRunCommandLine: null,
      approvalPhrase: null, approvalReceiptRef: null, startsAtUtc: null, expiresAtUtc: null,
    },
    manifests: {
      providerPolicyAdapterDetails: {
        disabledAdapterRef: source('offline/cad-auth-sealed-setup/providerAdapter.js'),
        adapterInterfaceRef: source('offline/cad-auth-sealed-setup/providerAdapter.d.ts'),
        candidateRef: source('offline/cad-convex/productionVerifierCandidate.js'),
        exactBindingRef: source('server/cadProductionSessionVerifierBinding.js'),
        sourceSdkVersions,
        concreteProviderImplementationRef: null,
        deployedSdkReceiptRef: null,
        issuerAudienceAlgorithmPolicyRef: null,
        signingKeyRotationPolicyRef: null,
        cacheInvalidationPolicyRef: null,
        httpReservationTransportRef: null,
        sourceRequirements: [
          'REQUEST_LOCAL_BEARER_PRINCIPAL_ONLY',
          'NO_COOKIE_SERVICE_CREDENTIAL_OR_JWT_PERMISSION_FALLBACK',
          'FRESH_SESSION_OWNER_AND_METHOD_ON_RESOLVE_AND_REFRESH',
          'FRESH_SHOP_MEMBERSHIP_AND_CAD_PERMISSION_AFTER_IDENTITY_BINDING',
          'EVERY_PROVIDER_HTTP_CALL_REQUIRES_RESERVATION_DEADLINE_AND_CANCELLATION',
          'DISABLE_OR_WRAP_SDK_RETRIES_BEFORE_LIVE_PROVIDER_TESTS',
          'KEY_METADATA_AND_DISCOVERY_CALLS_COUNT_AGAINST_BUDGET',
        ],
        sourceReviewed: true,
        liveProviderBound: false,
        providerCallsAuthorized: false,
        review: missingReview('SOURCE_DETAIL_REVIEWED_LIVE_PROVIDER_REVIEW_MISSING'),
      },
      routeBodyInstallationReview: {
        entrypointRef: source('api/[...path].js'),
        appRef: source('server/index.js'),
        routeRef: source('server/cadUserUploadRouter.js'),
        guardRef: source('offline/cad-auth-sealed-setup/routeInstrumentation.js'),
        sourceOrdering: [
          'API_HANDLER_DELEGATES_TO_EXPRESS_APP',
          'DEV_ISSUER_AND_USER_IMPORT_ROUTERS_MOUNT_BEFORE_GENERAL_JSON_PARSER',
          'USER_IMPORT_ROUTE_CHECKS_METHOD_ORIGIN_AND_SESSION_BEFORE_ADMISSION',
          'SOURCE_CLOSED_BODY_ADMISSION_DENIES_BEFORE_VALIDATE_REQUEST_BODY',
          'GENERAL_JSON_PARSER_REMAINS_AFTER_CAD_USER_IMPORT_ROUTE',
        ],
        forbiddenBeforeAdmission: ['bodyGetterAttempts', 'readAttempts', 'parserInvocations',
          'streamSubscriptions', 'pipeAttempts', 'iteratorAttempts', 'rawHeadersCapture'],
        sourceReviewed: true,
        installedRuntimeGuard: false,
        actualRouteCounterReceiptRef: null,
        platformBufferingReviewRef: null,
        requestBodyReadAuthorized: false,
        review: missingReview('SOURCE_ORDER_REVIEWED_LIVE_ROUTE_RECEIPT_MISSING'),
      },
      immutableDeploymentTargetReviewManifest: {
        targetPolicy: 'PIN_EXACT_DEPLOYMENT_ID_COMMIT_AND_SOURCE_DIGESTS_BEFORE_ANY_LIVE_OBSERVATION',
        productionAliasRef: null,
        deploymentUrl: null,
        deploymentCommit: null,
        deploymentProviderRef: null,
        sourceMapDigest: null,
        targetAttestationRef: null,
        sourceBaselineCommit: PARENT_MERGE,
        reviewedSourceBindingSha256: sha(Buffer.from(SOURCES.map(file => `${file}:${sha(readSource(file))}`).join('\n'))),
        mutableAliasAllowed: false,
        historicalDeploymentReusable: false,
        liveTargetBound: false,
        review: missingReview('SOURCE_TARGET_MANIFEST_REVIEWED_IMMUTABLE_DEPLOYMENT_MISSING'),
      },
      restrictedSyntheticCohortLifecycle: {
        cohort: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
        aliases: ['U1/L1', 'U1/L2', 'U2/L3'],
        restrictedAliasMapRef: null,
        syntheticOwnershipReceiptRef: null,
        lifecycleCases: [
          { caseId: 'U1_L1_VALID_THEN_REVOKED', beforeReceiptRef: null, afterReceiptRef: null },
          { caseId: 'U1_L2_SEPARATE_LOGIN_SUBSTITUTION_DENIED', beforeReceiptRef: null, afterReceiptRef: null },
          { caseId: 'U2_L3_DIFFERENT_USER_DENIED', beforeReceiptRef: null, afterReceiptRef: null },
          { caseId: 'EXPIRED_OR_DELETED_SESSION_DENIED', beforeReceiptRef: null, afterReceiptRef: null },
          { caseId: 'PERMISSION_REMOVAL_DENIED', beforeReceiptRef: null, afterReceiptRef: null },
        ],
        setupAuthorized: false,
        mutationAuthorized: false,
        teardownAuthorized: false,
        realUserEnrollmentAllowed: false,
        rawIdentityPublicProjectionAllowed: false,
        review: missingReview('SOURCE_COHORT_LIFECYCLE_REVIEWED_RESTRICTED_RECEIPTS_MISSING'),
      },
      custodyReviewerDisposition: {
        custodianRef: null,
        independentReviewerRef: null,
        distinctRolesRequired: true,
        restrictedStoreRef: null,
        retentionDays: 7,
        deletionReceiptRef: null,
        reviewerDispositionRef: null,
        sanitizedReceiptFields: ['caseId', 'phase', 'candidateCommit', 'deploymentRef',
          'syntheticAlias', 'expectedDisposition', 'observedDisposition', 'sanitizedEvidenceSha256'],
        restrictedFieldsOnly: ['operatorAccountRef', 'providerAccountRef', 'loginSessionRef',
          'membershipRef', 'rawProviderResponseRef', 'rawNetworkTraceRef'],
        forbiddenEverywhere: ['tokens', 'cookies', 'rawHeaders', 'secretValues', 'privateCad',
          'rawExceptionPayloads', 'requestBody', 'providerCredentials'],
        publicProjectionAllowed: false,
        rawCredentialCaptureAllowed: false,
        review: missingReview('SOURCE_CUSTODY_REVIEWED_CUSTODIAN_AND_REVIEWER_MISSING'),
      },
      lateGrantObserverDesign: {
        candidateRef: source('offline/cad-convex/productionVerifierCandidate.js'),
        stopRunbookRef: source('docs/cad-auth-sealed-setup-stop-runbook.md'),
        observerImplementationRef: null,
        durableConsumedRunLedgerRef: null,
        partialEvidencePolicyRef: null,
        remediationEscalationRef: null,
        stateMachine: ['NOT_STARTED', 'STOP_REQUESTED', 'PENDING_SETTLEMENT_OBSERVED',
          'SANITIZED_PARTIAL_RECEIPT_RECORDED', 'TERMINAL_CONSUMED'],
        terminalUnknownConsumesRun: true,
        noGrantPublicationAfterStop: true,
        noDiagnosticCallsAfterStop: true,
        authorizedRuns: 0,
        retriesAllowed: false,
        secondRunAllowed: false,
        observerInstalled: false,
        review: missingReview('SOURCE_OBSERVER_DESIGN_REVIEWED_LIVE_OBSERVER_MISSING'),
      },
    },
    remainingGates: ['CONCRETE_PROVIDER_IMPLEMENTATION_AND_POLICY_REVIEW',
      'LIVE_ROUTE_COUNTER_AND_PLATFORM_BUFFERING_RECEIPTS', 'IMMUTABLE_PRODUCTION_TARGET_BINDING',
      'RESTRICTED_SYNTHETIC_COHORT_SETUP_TEARDOWN_RECEIPTS', 'CUSTODIAN_AND_REVIEWER_ASSIGNMENT',
      'LATE_GRANT_OBSERVER_IMPLEMENTATION_AND_LEDGER', 'SEALED_COMMAND_CARD_AND_FRESH_WINDOW'],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function plainData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || depth > 32 || seen.has(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype && proto !== null) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return false;
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !Object.hasOwn(d, 'value')) return false;
    if (!d.enumerable && !(Array.isArray(value) && key === 'length')) return false;
    if (!plainData(d.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}

function checkCompletion(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return {
    ok,
    sourceCompletionValid: ok,
    livePrerequisitesSatisfied: false,
    sealed: false,
    executable: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false,
    providerEnvResourceBillingChanges: false,
    executableCommandCardIssued: false,
    retryAuthorized: false,
    commercialReadiness: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_PREREQ_COMPLETION'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkCompletion(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_PREREQ_COMPLETION_BLOCKED' }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, RUNTIME_SOURCES, expectedPacket, checkCompletion };
