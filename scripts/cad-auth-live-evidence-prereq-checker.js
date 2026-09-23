// Fixed repository source review only: no live receipt, request, provider or command input.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkSetup } = require('./cad-auth-sealed-setup-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-prerequisites.json';
const RUNTIME_SOURCES = Object.freeze(['api/[...path].js', 'server/index.js',
  'server/cadUserUploadRouter.js', 'server/cadUserUploadAdmission.js',
  'server/cadDevAuthSessionIssuerRouter.js', 'server/cadUploadSessionGatewayService.js',
  'server/cadProductionSessionVerifierBinding.js', 'server/cadExactSessionBridge.js',
  'server/uploadSession.js', 'server/cadInternalProductionAdmissionSwitch.js']);
const SOURCES = Object.freeze([PARENT, ...RUNTIME_SOURCES,
  'offline/cad-convex/productionVerifierCandidate.js',
  'offline/cad-auth-sealed-setup/providerAdapter.js',
  'offline/cad-auth-sealed-setup/providerAdapter.d.ts',
  'offline/cad-auth-sealed-setup/routeInstrumentation.js',
  'offline/cad-auth-sealed-setup/receiptCollector.js', 'package.json', 'package-lock.json',
  'docs/cad-auth-live-evidence-prerequisites.md',
  'scripts/cad-auth-live-evidence-prereq-checker.js',
  'scripts/cad-auth-live-evidence-prereq.test.js']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = file => `source-only:${file}`;
const review = () => ({ status: 'MISSING_LIVE_REVIEW', reviewerRef: null, receiptRef: null, accepted: false });

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkSetup(parent, { readSource }).ok) throw Error('INVALID_PARENT');
  const pkg = JSON.parse(readSource('package.json'));
  const lock = JSON.parse(readSource('package-lock.json'));
  const pinned = { '@convex-dev/auth': '0.0.95', '@auth/core': '0.41.3', convex: '1.45.0' };
  for (const [name, version] of Object.entries(pinned)) {
    if (pkg.dependencies[name] !== version || lock.packages[`node_modules/${name}`].version !== version) {
      throw Error('SDK_SOURCE_DRIFT');
    }
  }
  return {
    schemaVersion: 1, packet: 'cad-auth-live-evidence-prerequisites-v1',
    baselineCommit: '52267efd8dd449bd2aabcd682ce06abc5e61c1cf', sourceOnly: true,
    status: 'SOURCE_BOUND_LIVE_PREREQUISITES_MISSING', parentSetupSha256: sha(readSource(PARENT)),
    card: { sealed: false, executable: false, commandLine: null, dryRunCommandLine: null,
      approvalPhrase: null, approvalReceiptRef: null, startsAtUtc: null, expiresAtUtc: null },
    claims: { ...parent.claims, liveCollectionAuthorized: false, runtimeActivationAuthorized: false,
      providerPolicyAccepted: false, actualRouteProven: false, commercialReadiness: false },
    manifests: {
      providerPolicy: {
        adapterRef: source('offline/cad-auth-sealed-setup/providerAdapter.js'),
        candidateRef: source('offline/cad-convex/productionVerifierCandidate.js'),
        exactBindingRef: source('server/cadProductionSessionVerifierBinding.js'),
        packageLockRef: source('package-lock.json'), sourceSdkVersions: pinned,
        deployedSdkVersions: null, providerImplementationRef: null, issuerPolicyRef: null,
        audiencePolicyRef: null, algorithmAllowlistRef: null, signingKeyPolicyRef: null,
        cacheInvalidationPolicyRef: null, httpReservationTransportRef: null,
        requirements: ['CRYPTOGRAPHIC_ISSUER_AUDIENCE_ALGORITHM_VERIFICATION',
          'FRESH_EXACT_SESSION_OWNER_METHOD_ON_EVERY_RESOLVE_AND_REFRESH',
          'FRESH_SHOP_MEMBERSHIP_AND_CAD_PERMISSION_NO_JWT_PERMISSION_FALLBACK',
          'REQUEST_LOCAL_BEARER_ONLY_NO_COOKIE_OR_SERVICE_CREDENTIAL_FALLBACK',
          'NO_PRINCIPAL_CACHE_OR_CROSS_LOGIN_REUSE',
          'RESERVE_EVERY_HTTP_REQUEST_INCLUDING_KEYS_AND_METADATA_BEFORE_DISPATCH',
          'SDK_RETRIES_DISABLED_DEADLINE_AND_CANCELLATION_REQUIRED'],
        configured: false, review: review(),
      },
      routeBodyInstrumentation: {
        entrypointRef: source('api/[...path].js'), appRef: source('server/index.js'),
        routeRef: source('server/cadUserUploadRouter.js'),
        guardRef: source('offline/cad-auth-sealed-setup/routeInstrumentation.js'),
        proposedOrder: ['PLATFORM_BUFFERING_REVIEW', 'ENTRY_BEFORE_ANY_MIDDLEWARE',
          'GUARD_ALL_BODY_ACCESS_FORMS', 'ROUTE_METHOD_AND_ORIGIN', 'SESSION_VERIFIER',
          'SOURCE_CLOSED_ADMISSION_DENIAL', 'NO_BODY_READ_OR_PARSER'],
        coveredAttempts: ['bodyGetterAttempts', 'readAttempts', 'parserInvocations',
          'streamSubscriptions', 'pipeAttempts', 'iteratorAttempts'],
        requirements: ['REVIEW_ISSUER_AND_USER_IMPORT_MOUNTS_BEFORE_GENERAL_PARSERS',
          'REVIEW_CORS_PREFLIGHT_AND_EARLY_DENIAL_PATHS',
          'COUNT_AND_STOP_BEFORE_ACCESS_NEVER_FORWARD_REQUEST_OR_BODY_TO_COLLECTOR',
          'SEPARATE_APPLICATION_ZERO_BYTES_FROM_HOST_BUFFERING_PROOF'],
        installationReceiptRef: null, platformBufferingReviewRef: null,
        actualRouteCounterReceiptRef: null, installed: false, bodyAdmissionAuthorized: false,
        requestInputAccepted: false, review: review(),
      },
      immutableTarget: {
        sourceBaselineRef: 'source-only:git:52267efd8dd449bd2aabcd682ce06abc5e61c1cf',
        deploymentUrl: null, deploymentCommit: null, deploymentProviderRef: null,
        sourceMapDigest: null, targetAttestationRef: null,
        requirements: ['MATCH_DEPLOYED_BYTES_TO_REVIEWED_SOURCE_DIGESTS',
          'PIN_PROVIDER_DEPLOYMENT_ID_AND_COMMIT', 'REJECT_TARGET_DRIFT_BEFORE_EACH_OBSERVATION'],
        mutableAliasAllowed: false, historicalDeploymentReusable: false, review: review(),
      },
      restrictedSyntheticCohort: {
        aliases: ['U1/L1', 'U1/L2', 'U2/L3'], cohortRef: null, restrictedAliasMapRef: null,
        lifecycleSetupReceiptRef: null, noRealUserReceiptRef: null, teardownReceiptRef: null,
        scheduleSha256: parent.proposedSchedule.scheduleSha256,
        requirements: ['TWO_SEPARATE_LOGINS_FOR_U1_AND_SEPARATE_U2',
          'BIND_EVERY_LIFECYCLE_CASE_TO_BEFORE_AND_AFTER_RECEIPTS',
          'PROVE_SYNTHETIC_OWNERSHIP_AND_RESTRICTED_SHOP_SCOPE',
          'REVIEW_SESSION_DELETE_EXPIRY_REVOCATION_AND_PERMISSION_REMOVAL_SEPARATELY',
          'KEEP_ALIAS_MAPPING_OUT_OF_PUBLIC_PACKET', 'SETUP_AND_TEARDOWN_NEED_SEPARATE_AUTHORITY'],
        creationAuthorized: false, mutationAuthorized: false, teardownAuthorized: false, review: review(),
      },
      custodyReviewer: {
        custodianRef: null, independentReviewerRef: null, restrictedStoreRef: null,
        retentionDeletionRef: null, reviewerDispositionRef: null, retentionDays: 7,
        requirements: ['CUSTODIAN_AND_REVIEWER_DISTINCT', 'RESTRICT_ACCESS_TO_APPROVED_ROLES',
          'HASH_SANITIZED_RECEIPTS_AND_KEEP_DISPOSITION_SEPARATE',
          'REVIEWER_BINDS_TARGET_SOURCE_SCHEDULE_LIMITS_AND_PARTIAL_EVIDENCE',
          'CUSTODIAN_CONFIRMS_DELETION_AFTER_RETENTION', 'NO_PRIVATE_OR_RAW_AUTH_FIELDS'],
        publicProjectionAllowed: false, rawCredentialsAllowed: false, review: review(),
      },
      lateGrantObserver: {
        candidateRef: source('offline/cad-convex/productionVerifierCandidate.js'),
        runbookRef: source('docs/cad-auth-sealed-setup-stop-runbook.md'),
        observerImplementationRef: null, durableConsumedRunLedgerRef: null,
        partialEvidencePolicyRef: null, remediationEscalationRef: null,
        requirements: ['OBSERVE_ALL_PENDING_SETTLEMENTS_AFTER_STOP_WITHIN_ORIGINAL_BUDGET',
          'NO_GRANT_PUBLICATION_OR_SIDE_EFFECT_AFTER_DEADLINE_CANCEL_OR_STOP',
          'UNOBSERVABLE_SETTLEMENT_IS_UNKNOWN_AND_TERMINAL',
          'UNKNOWN_FAILURE_INTERRUPTION_CONSUME_ATTEMPT_AND_RUN',
          'CANCEL_PENDING_READS_PREVENT_NEW_DISPATCH_PRESERVE_SANITIZED_PARTIAL_RECEIPTS',
          'NO_EXTRA_DIAGNOSTIC_CALL_NO_RESUME_NO_WINDOW_ROLLOVER'],
        outcome: 'NOT_COLLECTED', authorizedRuns: 0, retriesAllowed: false,
        secondRunAllowed: false, observerInstalled: false, review: review(),
      },
    },
    remainingGates: parent.remainingGates,
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

// Reject accessors and non-JSON objects without consulting their values/toJSON.
// This checker is a local JSON validator, never a handler for live request objects.
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
function checkPrerequisites(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, sourcePrerequisitesValid: ok, livePrerequisitesSatisfied: false,
    sealed: false, executable: false, liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false, uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false, retryAuthorized: false, commercialReadiness: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_PREREQUISITES'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPrerequisites(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_PREREQUISITES_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, RUNTIME_SOURCES, expectedPacket, checkPrerequisites };
