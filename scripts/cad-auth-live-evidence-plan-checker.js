// Source-only plan validator. No collector, provider client, env reader or runtime gate.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { CASES, checkEvidence } = require('./cad-production-verifier-evidence-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-plan.json';
const CANDIDATE = 'dc7d733cff6d94841725e721cc8e7b0da7be4cff';
const WINDOW = Object.freeze({ startsAtUtc: '2026-09-24T15:00:00Z', expiresAtUtc: '2026-09-24T15:30:00Z' });
const APPROVAL_PHRASE = 'Approve one read-only synthetic CAD Auth evidence collection for plan cad-auth-live-evidence-plan-v1, candidate dc7d733cff6d94841725e721cc8e7b0da7be4cff, during 2026-09-24T15:00:00Z through 2026-09-24T15:30:00Z, only after the Captain seals and reviews the exact provider, collector, instrumentation, target deployment and synthetic cohort references. No setup changes, upload sessions, upload-body reads, activation or retries.';
const SOURCES = Object.freeze([
  'docs/cad-production-auth-verifier-acceptance.json',
  'docs/cad-production-verifier-evidence-template.json',
  'offline/cad-convex/productionVerifierCandidate.js',
  'server/cadProductionSessionVerifierBinding.js',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'server/uploadSession.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
  'server/index.js', 'api/[...path].js', 'vercel.json', 'package-lock.json',
  'scripts/cad-auth-live-evidence-plan-checker.js',
  'scripts/cad-auth-live-evidence-plan.test.js',
  'docs/cad-auth-live-evidence-plan.md',
]);
// One explicit expected observation for every case in the PR #384 template.
const EXPECTED = Object.freeze({
  'verified-user-context': 'Resolve and refresh return only the exact live U1/L1/S1 permission grant; configured remains false.',
  'service-credential-is-not-login': 'A service credential yields no user grant; no fallback to gateway authority.',
  'sdk-issuer-audience-algorithms': 'Review pinned deployed SDK and issuer/audience/algorithm policy references; compare package-lock, never publish values.',
  'missing-owner': 'Provider-confirmed missing owner yields no grant.',
  'deleted-session': 'Provider-confirmed deleted exact session yields no grant.',
  'owner-mismatch': 'Session owner differs from verified subject: no grant.',
  'supplied-principal': 'Caller-supplied user/principal fields never provide authority; invalid issue context is rejected.',
  'opaque-login-reference': 'Resolve rejects opaque loginSessionRef; refresh accepts only provider-derived exact binding fields.',
  'two-same-user-logins': 'U1/L1 and U1/L2 resolve independently; matching refresh succeeds without merging login identity.',
  'cross-login-refresh': 'L2 refresh of L1 binding yields no grant; matching-user comparison is insufficient.',
  'cross-user-refresh': 'U2 credential refresh of U1 binding yields no grant.',
  'method-substitution': 'Credential verified method mismatching the exact refresh binding yields no grant.',
  'concurrent-credential-isolation': 'One paired U1/L1 and U2/L3 observation preserves each request identity without crossover.',
  'selected-shop-membership': 'S1 is granted only from fresh member permission; client selection alone grants nothing.',
  'removed-membership': 'Provider-confirmed removed S1 membership yields no resolve or usable refresh grant.',
  'permission-loss': 'Resolve denies; refresh may return cadUploadAllowed=false, which the downstream verifier must deny.',
  'shop-substitution': 'S2 selection with no matching membership yields no grant.',
  'fresh-resolve-and-refresh': 'Both paths freshly read exact session/owner and membership; cache receipts cannot substitute for reads.',
  'exact-expiry': 'At the exact expiry boundary neither path yields a grant.',
  'expiry-during-read': 'Expiry between session and permission reads yields no grant.',
  'minimum-expiry': 'Successful grant expires at min(session expiry, permission expiry).',
  'invalid-timestamp': 'Noninteger, negative or invalid provider timestamps yield no grant.',
  'clock-rollback': 'Rollback during operation yields AUTH_UNAVAILABLE; no late grant.',
  'cached-query-liveness': 'Previously valid cached token/query cannot extend dead session authority.',
  'logout': 'Correlated pre-logout live and post-logout denied observations on both paths; no logout mutation in this collection.',
  'revocation': 'Correlated pre-revocation live and post-revocation denied observations; no revocation mutation in this collection.',
  'session-deletion': 'Correlated pre-deletion live and post-deletion denied observations; no deletion mutation in this collection.',
  'replacement-login': 'Replacement login cannot refresh old binding; no replacement mutation in this collection.',
  'provider-cache-invalidation': 'Review provider invalidation/cache semantics plus before/after denial receipts; signed stale token alone fails.',
  'forged-signature': 'Invalid signature yields no grant and no provider payload logging.',
  'unsigned-token': 'Unsigned credential yields no grant.',
  'disallowed-algorithm': 'Credential with unapproved algorithm yields no grant.',
  'wrong-issuer': 'Credential from unapproved issuer yields no grant.',
  'wrong-audience': 'Credential for unapproved audience yields no grant.',
  'expired-token': 'Expired credential yields no grant.',
  'not-yet-valid-token': 'Credential before its valid-from time yields no grant.',
  'malformed-token': 'Malformed or truncated bearer yields no grant.',
  'oversized-token': 'Authorization over 8192 characters is rejected before provider reads.',
  'missing-token': 'Missing bearer yields no grant before provider reads.',
  'duplicate-authorization': 'Duplicate/conflicting raw Authorization headers yield no grant; capture actual normalization evidence.',
  'unavailable-verification': 'Isolated verification failure yields only sanitized denial; no fallback or provider outage injection.',
  'abort-before-read': 'Already aborted signal yields AUTH_UNAVAILABLE before reader invocation.',
  'abort-between-reads': 'Abort after session read prevents authorization read and any grant.',
  'abort-during-authorization': 'Abort during authorization yields AUTH_UNAVAILABLE and propagated cancellation.',
  'hung-reader': 'Isolated nonblocking stalled reader loses authority within 800 ms budget; remote provider is not disrupted.',
  'late-result': 'Result after abort/deadline yields no late grant.',
  'no-late-side-effects': 'Read-only provider audit and settled observer show no write or late grant after terminal cancellation.',
  'actual-router-bearer-normalization': 'Inspect actual entrypoint header normalization; login candidate and upload-session route remain distinct.',
  'cookie-rejected': 'Candidate cookie-only request yields no grant; cookie support remains unapproved.',
  'mixed-transport-rejected': 'Candidate cookie plus bearer yields no grant regardless of transport label.',
  'middleware-order': 'Earliest entrypoint instrumentation precedes parser and verifier; hosted pre-handler buffering is accounted for separately.',
  'denied-zero-bytes': 'Denied actual-route request has zero application upload-body reads and no parser/getter/stream-read attempts.',
  'malformed-zero-bytes': 'Malformed actual-route credential is denied with zero application upload-body reads.',
  'cancelled-zero-bytes': 'Cancelled actual-route request has zero application upload-body reads and no late work.',
  'timed-out-zero-bytes': 'Timed-out actual-route request has zero application upload-body reads and no late work.',
  'closed-after-valid-verifier': 'Even valid verifier authority leaves BODY_ADMISSION_AUTHORIZED=false; actual upload-route positive path is blocked without separate session authority.',
  'request-local-credentials': 'Each request retains bearer only in its ephemeral closure; no shared credential cache.',
  'no-envelope-credentials': 'Gateway envelopes contain no login credentials; no live gateway issue/refresh dispatch is needed.',
  'no-binding-credentials': 'Synthetic exact-binding object contains identity aliases in evidence, never login credentials.',
  'no-log-or-evidence-credentials': 'Allowlisted evidence and reviewed logging exclude credentials, raw headers and provider account records.',
  'sanitized-provider-failure': 'Reader exception becomes AUTH_UNAVAILABLE with no exception payload captured.',
  'exact-candidate-deployment-test-version': 'Each future receipt binds candidate, provider adapter, collector, instrumentation and exact immutable deployment refs.',
  'sanitized-digest-reference': 'Restricted sanitized artifact reference and SHA-256 digest verified before any public projection.',
  'utc-execution-time': 'Each future receipt timestamp falls within separately approved fresh window, including before/after phases.',
  'reviewer-disposition': 'Independent reviewer disposition remains separate from observation and cannot enable runtime authority.',
});
const INSPECTIONS = new Set(['sdk-issuer-audience-algorithms', 'provider-cache-invalidation', 'no-envelope-credentials', 'no-binding-credentials', 'no-log-or-evidence-credentials', 'exact-candidate-deployment-test-version', 'sanitized-digest-reference', 'utc-execution-time', 'reviewer-disposition']);
const LIFECYCLE = new Set(['logout', 'revocation', 'session-deletion', 'replacement-login', 'provider-cache-invalidation', 'removed-membership', 'permission-loss', 'deleted-session', 'missing-owner']);
const FAULTS = new Set(['invalid-timestamp', 'clock-rollback', 'abort-before-read', 'abort-between-reads', 'abort-during-authorization', 'hung-reader', 'late-result', 'no-late-side-effects', 'unavailable-verification', 'sanitized-provider-failure']);
const read = file => fs.readFileSync(path.join(ROOT, file));
function expectedPlan(readSource = read) {
  const prior = JSON.parse(readSource('docs/cad-production-verifier-evidence-template.json'));
  if (!checkEvidence(prior, { readSource }).ok) throw Error('SOURCE_INVALID');
  if (!isDeepStrictEqual(Object.values(CASES).flat().sort(), Object.keys(EXPECTED).sort())) throw Error('CASE_COVERAGE_INVALID');
  return {
    schemaVersion: 1, packet: 'cad-auth-live-evidence-plan-v1', sourceOnly: true,
    status: 'BLOCKED_BEFORE_LIVE_COLLECTION', claims: prior.claims,
    candidate: { acceptancePr: 383, acceptanceMerge: 'b885f1f9a569b5bfa5627858cbb1542342b7da43',
      harnessPr: 384, sourceCommit: CANDIDATE, configured: false,
      concreteProviderAdapterCommit: null, collectorCommit: null, instrumentationCommit: null,
      sdkVersionsFromSource: { convex: '1.45.0', auth: '0.0.95', authCore: '0.41.3' },
      deployedProviderVersionsVerified: false },
    deployment: { role: 'SOURCE_DEPLOYMENT_REFERENCE_ONLY', githubDeploymentId: 6613179379,
      commit: CANDIDATE, environment: 'Production', githubStatus: 'success', statusAtUtc: '2026-09-23T11:49:34Z',
      vercelRef: 'G5sHvxfktoKGwrretFWpQ4EvMcQ2',
      immutableUrl: 'https://reversr-6ubf0dy2w-vsillahs-projects.vercel.app',
      metadataObservedOnUtc: '2026-09-23',
      appContacted: false, provesProviderWiring: false, collectionTargetRef: null },
    approval: { requiredPhrase: APPROVAL_PHRASE, received: false, receipt: null,
      sealedCommandCardRef: null, sealedCommandCardSha256: null, historicalApprovalReusable: false,
      historicalWindowReusable: false, proposal: { ...WINDOW, durationMinutes: 30, approved: false },
      expiredProposalAction: 'RESEAL_AND_REQUEST_NEW_EXACT_WINDOW_NO_AUTOMATIC_ROLLOVER' },
    limits: { maxRuns: 1, maxAttemptsPerCasePathPhase: 1, retries: 0, maxOperationBudgetMs: 800,
      concurrentCasePairs: 1, maxLogicalOperations: 160, maxReaderInvocations: 320,
      maxProviderHttpRequests: 640, sdkRetries: 0, providerWrites: 0, setupChanges: 0, uploadSessionIssuances: 0,
      applicationUploadBodyReads: 0, conversionDispatches: 0, sandboxDispatches: 0,
      privateCadFiles: 0, realUsers: 0, externalMessages: 0, purchases: 0 },
    cohort: { ref: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1', actualMappingRef: null,
      syntheticOnly: true, creationAuthorized: false, credentialCustody: 'OPERATOR_EXISTING_AUTH_CONTEXT_ONLY_NO_SECRET_EXPORT',
      aliases: { users: ['U1', 'U2'], logins: ['U1/L1', 'U1/L2', 'U2/L3'], shops: ['S1', 'S2'],
        baseline: 'U1/L1 and U1/L2 current S1 membership with CAD permission; U2/L3 distinct owner; S2 unauthorized for U1.' },
      lifecycleSetup: 'SEPARATE_APPROVAL_REQUIRED_FOR_ALL_IDENTITY_SESSION_MEMBERSHIP_MUTATIONS',
      lifecycleEvidence: 'Correlated before/after observations required; static dead credentials alone cannot prove transition or cache invalidation.' },
    prerequisites: Object.fromEntries(['providerAdapter', 'providerPolicyAndVersions', 'immutableCollectionTarget',
      'reviewedCollectorAndReceiptValidator', 'actualRouteInstrumentation', 'syntheticMappingAndLifecycleReceipts',
      'restrictedCustodyAndReviewer', 'sealedCommandCard', 'freshExplicitApproval']
      .map(key => [key, { status: 'BLOCKED', evidenceRef: null }])),
    cases: Object.entries(CASES).flatMap(([category, ids]) => ids.map(id => ({
      category, id, paths: ['resolve', 'refresh'], expected: EXPECTED[id],
      observationType: INSPECTIONS.has(id) ? 'INSPECTION' : category === 'body' || category === 'transport' ? 'ACTUAL_ROUTE_OR_ENTRYPOINT' : FAULTS.has(id) ? 'ISOLATED_FAULT_WITH_PROVIDER_PROOF_SEPARATE' : 'PROVIDER_READ',
      requiresSeparateLifecycleSetup: LIFECYCLE.has(id),
      status: 'NOT_COLLECTED', observed: null, receiptRef: null,
    }))),
    route: { path: 'POST /api/cad/user-import', entrypoint: 'api/[...path].js -> server/index.js',
      uploadCredentialType: 'UPLOAD_SESSION_BEARER_NOT_LOGIN_BEARER',
      candidateMounted: false, instrumentationInstalled: false, bodyAdmissionAuthorized: false,
      requestBodyBytesToSend: 0, requiredApplicationBytesRead: 0, observedApplicationBytesRead: null,
      observedBodyGetterAttempts: null, observedReadAttempts: null, observedParserInvocations: null,
      platformBufferingEvidence: null, positiveUploadSessionRouteCase: 'BLOCKED_NO_SESSION_ISSUANCE_AUTHORITY',
      emptyBodyLimit: 'Empty requests alone cannot prove nonempty stream admission order. Instrumentation and entrypoint/platform review remain required.' },
    evidenceTemplate: { status: 'NOT_COLLECTED', runRef: null, caseId: null, path: null, phase: null,
      candidateCommit: null, providerAdapterCommit: null, collectorCommit: null, instrumentationCommit: null,
      deploymentRef: null, syntheticMappingRef: null, startedAtUtc: null, endedAtUtc: null,
      elapsedMs: null, expectedCode: null, observedCode: null, disposition: null,
      applicationBodyBytesRead: null, bodyGetterAttempts: null, readAttempts: null, parserInvocations: null,
      lateGrants: null, providerWrites: null, sourceOfObservation: null,
      sanitizedEvidenceRef: null, sanitizedEvidenceSha256: null, reviewerRef: null },
    custody: { locationRef: null, custodianRef: null, independentReviewerRef: null,
      rawCredentialCaptureAllowed: false, rawAccountCaptureAllowed: false, publicReceiptPublicationAllowed: false,
      policy: 'RESTRICTED_ALLOWLIST_AT_CAPTURE_SHA256_AFTER_SANITIZATION_REVIEWED_PUBLIC_PROJECTION_ONLY',
      forbidden: ['tokens', 'cookies', 'rawHeaders', 'secrets', 'accountRecords', 'privateCad', 'rawProviderExceptions'],
      retainDays: 7, deletion: 'Custodian confirms receipt review and approved retention expiry; delete restricted working artifacts without publishing paths.' },
    stopConditions: ['MISSING_PREREQUISITE', 'WINDOW_EXPIRED_OR_NOT_STARTED', 'SOURCE_OR_TARGET_DRIFT',
      'IDENTITY_OUTSIDE_COHORT', 'CREDENTIAL_OR_ACCOUNT_LEAK', 'ANY_BODY_ACCESS_OR_PARSER_INVOCATION',
      'ISSUANCE_OR_WRITE_ATTEMPT', 'UNEXPECTED_AUTHORITY', 'DEADLINE_OR_CANCELLATION_FAILURE',
      'UNKNOWN_OUTCOME_OR_INTERRUPTION', 'CASE_FAILURE', 'RETRY_REQUEST'],
    stopAction: 'Abort collector and pending reads; consume the one attempt; retain only sanitized partial evidence; no retry, automatic rollback, provider change or deployment change. Escalate required remediation for separate approval.',
    completion: { providerEvidenceCollected: false, productionVerifierAccepted: false,
      liveCollectionAuthorized: false, runtimeActivationAuthorized: false, commercialReadinessClaim: false },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, createHash('sha256').update(readSource(file)).digest('hex')])),
  };
}
function checkPlan(packet, { readSource = read, now = Date.now() } = {}) {
  let valid = false;
  try { valid = isDeepStrictEqual(packet, expectedPlan(readSource)); } catch { /* Never echo untrusted input. */ }
  return { ok: valid, sourcePlanValid: valid,
    proposalWindowStillFuture: valid && Number.isFinite(now) && now < Date.parse(WINDOW.startsAtUtc),
    liveCollectionAuthorized: false, executable: false, productionVerifierAccepted: false,
    uploadSessionIssuanceEnabled: false, bodyAdmissionAuthorized: false, runtimeActivationAuthorized: false,
    problems: valid ? [] : ['INVALID_SOURCE_ONLY_LIVE_EVIDENCE_PLAN'] };
}
if (require.main === module) {
  let packet;
  try { packet = JSON.parse(read(PACKET)); } catch { /* Closed result. */ }
  const result = checkPlan(packet);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { PACKET, SOURCES, WINDOW, APPROVAL_PHRASE, expectedPlan, checkPlan };
