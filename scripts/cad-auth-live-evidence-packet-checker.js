// Source-only planning contract. Fixed local reads; no collector or approval mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { CASES, checkEvidence } = require('./cad-production-verifier-evidence-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-evidence-packet.json';
const BASE = 'dc7d733cff6d94841725e721cc8e7b0da7be4cff';
const WINDOW = Object.freeze({ startsAtUtc: '2026-09-24T14:00:00Z', expiresAtUtc: '2026-09-24T14:30:00Z' });
const APPROVAL = `Approve one synthetic-only ReversR CAD Auth evidence collection attempt for cad-auth-live-evidence-v1, source ${BASE}, ${WINDOW.startsAtUtc} through ${WINDOW.expiresAtUtc}, only after the exact provider adapter, collection deployment, cohort and instrumentation receipts are reviewed and bound; no setup changes, upload-session issuance, upload bodies, conversion, Sandbox, private CAD, real users, external messages or retry.`;
const SOURCES = Object.freeze([
  'offline/cad-convex/productionVerifierCandidate.js',
  'docs/cad-production-auth-verifier-acceptance.json',
  'docs/cad-production-verifier-evidence-template.json',
  'scripts/cad-production-verifier-evidence-checker.js',
  'server/cadProductionSessionVerifierBinding.js', 'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js', 'server/uploadSessionStore.js',
  'server/uploadSession.js', 'server/cadUserUploadRouter.js', 'server/index.js',
  'api/[...path].js', 'vercel.json', 'convex/librarySession.ts', 'convex/auth.ts',
  'convex/auth.config.ts', 'convex/http.ts', 'convex/cadUploadSessionGateway.ts',
  'package.json', 'package-lock.json',
  'docs/cad-auth-live-evidence-packet.md',
  'scripts/cad-auth-live-evidence-packet-checker.js',
  'scripts/cad-auth-live-evidence-packet.test.js',
]);
// Each case specifies stimulus and observable result; category wording alone is insufficient.
const DETAILS = Object.freeze({
  'verified-user-context': ['A1 resolves and refreshes in provider-verified context.', 'Exact A/A1/shop-X identity and minimum expiry; candidate configured remains false.'],
  'service-credential-is-not-login': ['Inspect adapter trust boundary; use only a synthetic non-login service-shaped value.', 'No login grant; never use a real service secret as a test input.'],
  'sdk-issuer-audience-algorithms': ['Inspect reviewed build metadata and sanitized provider policy references.', 'Concrete adapter/SDK digests and issuer/audience/algorithm policy match; source pins alone are insufficient.'],
  'missing-owner': ['Present pre-staged synthetic session whose owner is absent.', 'No grant after fresh owner read.'],
  'deleted-session': ['Present credential for pre-staged deleted synthetic session.', 'No grant after fresh session read.'],
  'owner-mismatch': ['Use isolated pre-staged owner/session mismatch.', 'No grant; no caller-supplied identity fallback.'],
  'supplied-principal': ['Add synthetic user/principal fields to resolve context or refresh binding.', 'AUTH_UNAVAILABLE before authority can be supplied by caller.'],
  'opaque-login-reference': ['Add opaque loginSessionRef to resolve input.', 'AUTH_UNAVAILABLE; refresh does not accept this extra field either.'],
  'two-same-user-logins': ['Resolve A1 and A2 independently and refresh each exact in-memory binding.', 'Both identify A but preserve distinct A1/A2 session IDs; no upload session is issued.'],
  'cross-login-refresh': ['Refresh A1 binding using A2 provider context.', 'No grant despite same owner and shop.'],
  'cross-user-refresh': ['Refresh A1 binding using B1 provider context.', 'No grant despite shared shop membership.'],
  'method-substitution': ['Change authMethod on in-memory exact binding to a different supported method.', 'No grant; method must come from verified provider semantics.'],
  'concurrent-credential-isolation': ['Resolve A1 and A2 concurrently once, then inspect paired request traces.', 'Each result matches its own request; no shared client credential crossover.'],
  'selected-shop-membership': ['Use A1 for shop-X and select unowned shop-Y.', 'X grants only with fresh permission; Y produces no grant.'],
  'removed-membership': ['Observe pre-staged membership-removal lifecycle receipt and current denied state.', 'Resolve/refresh cannot retain prior permission; before/after transition proof is separately required.'],
  'permission-loss': ['Observe pre-staged permission-loss receipt and current denied state.', 'Resolve returns null; refresh may return cadUploadAllowed:false, which must never be consumed as authority.'],
  'shop-substitution': ['Change shop on exact binding/context to shop-Y.', 'No authority for Y; caller selection is not membership.'],
  'fresh-resolve-and-refresh': ['Compare provider read markers for one resolve and one refresh.', 'Independent fresh session/owner/membership/permission reads; cached success is insufficient.'],
  'exact-expiry': ['Use isolated test clock at session/grant expiry equality.', 'No grant at equality; never change a host or provider clock.'],
  'expiry-during-read': ['Delay isolated reader completion beyond its expiry.', 'No grant after read completion.'],
  'minimum-expiry': ['Compare session/grant deadlines from reviewed synthetic fixture.', 'Result expiry equals their minimum and is still future at completion.'],
  'invalid-timestamp': ['Inject invalid timestamp in isolated reader fault harness.', 'AUTH_UNAVAILABLE; never corrupt provider records.'],
  'clock-rollback': ['Move isolated candidate clock backwards during a read.', 'AUTH_UNAVAILABLE; no machine clock changes.'],
  'cached-query-liveness': ['Inspect provider freshness/invalidation receipt and compare two read markers.', 'Cache cannot extend expired/revoked authority; missing provider proof remains BLOCKED.'],
  'logout': ['Review before/after synthetic logout receipt and old-credential denial.', 'Old credential gives no resolve/refresh authority; no logout mutation in this read-only collection.'],
  'revocation': ['Review before/after synthetic revocation receipt and old-credential denial.', 'Revoked login gives no authority; no revocation mutation in this collection.'],
  'session-deletion': ['Review before/after synthetic deletion receipt and old-credential denial.', 'Deleted login gives no authority; no table delete in this collection.'],
  'replacement-login': ['Compare pre-staged replacement A3 with A1 binding.', 'A3 cannot inherit A1 authority; no replacement login is created in collection.'],
  'provider-cache-invalidation': ['Review provider invalidation semantics and sanitized transition timing.', 'Old cached result cannot grant after invalidation; missing transition receipt blocks acceptance.'],
  'forged-signature': ['Use synthetic invalid signature fixture.', 'No grant; cryptographic rejection observed.'],
  'unsigned-token': ['Use synthetic unsigned credential fixture.', 'No grant; algorithm none rejected.'],
  'disallowed-algorithm': ['Use synthetic credential with an unapproved algorithm.', 'No grant under the exact reviewed algorithm allowlist.'],
  'wrong-issuer': ['Use synthetic fixture naming a wrong issuer.', 'No grant; trusted issuer cannot be taken from caller.'],
  'wrong-audience': ['Use synthetic fixture naming a wrong audience.', 'No grant; audience policy enforced.'],
  'expired-token': ['Use pre-staged expired synthetic credential.', 'No grant at provider verification.'],
  'not-yet-valid-token': ['Use synthetic future-validity fixture.', 'No grant before validity; no clock changes.'],
  'malformed-token': ['Use one reviewed truncated synthetic credential.', 'No grant and no credential/error payload in evidence.'],
  'oversized-token': ['Use synthetic header above the binding 8192-character limit.', 'No provider reads and no grant; transport/header limit outcome separately recorded.'],
  'missing-token': ['Omit authorization.', 'No provider reads and no grant.'],
  'duplicate-authorization': ['Use one raw request with duplicate/conflicting Authorization headers.', 'Rejected before provider reads; record duplicate count only, never values.'],
  'unavailable-verification': ['Inject unavailable verifier/key source only in isolated fault harness.', 'AUTH_UNAVAILABLE; no provider outage or key/config mutation.'],
  'abort-before-read': ['Abort candidate operation before invoking a reader.', 'No provider read and no grant.'],
  'abort-between-reads': ['Abort after session read, before authorization.', 'No authorization read and no grant.'],
  'abort-during-authorization': ['Abort pending authorization read.', 'Bounded denial; AbortSignal propagated.'],
  'hung-reader': ['Use isolated nonblocking unresolved reader.', 'No grant; operation settles within 800 ms budget plus reviewed scheduler tolerance.'],
  'late-result': ['Release isolated delayed reader after timeout.', 'No late grant or follow-on read.'],
  'no-late-side-effects': ['Observe request/read completion and side-effect counters after cancellation.', 'All issuance/body/conversion counters zero; injected dependency behavior is not provider proof.'],
  'actual-router-bearer-normalization': ['Inspect exact deployed ingress rawHeaders and normalized header count via sanitized probes.', 'One unambiguous bearer only at candidate boundary; current upload bearer is a different upload-session credential.'],
  'cookie-rejected': ['Present synthetic cookie-only transport to isolated candidate boundary.', 'No grant; candidate has no approved cookie mode.'],
  'mixed-transport-rejected': ['Present synthetic cookie plus bearer to isolated candidate boundary.', 'No grant before provider reads.'],
  'middleware-order': ['Inspect exact deployment routing and instrumentation chain.', 'Upload route ends before generic parser; login candidate remains unmounted until separate reviewed composition.'],
  'denied-zero-bytes': ['Plan bodyless denied request through instrumented actual upload route.', 'Zero body getter/read/parser/stream-consumer calls and zero application upload bytes.'],
  'malformed-zero-bytes': ['Plan malformed synthetic header through instrumented actual route with no body.', 'Denial before all body access; no upload payload is sent.'],
  'cancelled-zero-bytes': ['Plan request cancellation in separately instrumented exact route.', 'Zero body access and zero late work; candidate double is not actual-route proof.'],
  'timed-out-zero-bytes': ['Plan timeout in separately instrumented exact route.', 'Zero body access and zero late work.'],
  'closed-after-valid-verifier': ['Compare candidate positive result with isolated actual-router closure test.', '503 USER_UPLOADS_DISABLED after valid test session; no live upload session may be minted to obtain this observation.'],
  'request-local-credentials': ['Review sanitized A1/A2 request traces.', 'Each credential is confined to its request-local adapter closure.'],
  'no-envelope-credentials': ['Audit allowlisted envelope field names only.', 'No login headers/credentials serialized into gateway envelopes; no gateway dispatch here.'],
  'no-binding-credentials': ['Audit in-memory binding field names.', 'Only user/shop/login/method/synthetic session reference; no credential persistence.'],
  'no-log-or-evidence-credentials': ['Validate allowlisted sanitized event records before writing.', 'No tokens/cookies/raw IDs/PII/private errors or raw provider responses.'],
  'sanitized-provider-failure': ['Use isolated failure sentinel and inspect output schema.', 'Only AUTH_UNAVAILABLE or documented no-grant; no exception details.'],
  'exact-candidate-deployment-test-version': ['Review immutable source/build/deployment and collector digests.', 'All match approved packet; current app deployment alone cannot attest provider adapter.'],
  'sanitized-digest-reference': ['Hash only sanitized receipt bytes after schema validation.', 'SHA-256 and opaque custody reference resolve to same reviewed bytes.'],
  'utc-execution-time': ['Compare start/end timestamps with approved window.', 'Start within window, stop by expiry; no rollover or retry.'],
  'reviewer-disposition': ['Independent captain reviews every case receipt.', 'PASS/FAIL/BLOCKED per case; any missing provider/route proof blocks acceptance.'],
});
const SETUP_CASES = new Set(['missing-owner', 'deleted-session', 'owner-mismatch', 'removed-membership', 'permission-loss', 'logout', 'revocation', 'session-deletion', 'replacement-login', 'provider-cache-invalidation']);
const SYNTHETIC_CASES = new Set(['exact-expiry', 'expiry-during-read', 'invalid-timestamp', 'clock-rollback', 'unavailable-verification', ...CASES.cancellation, 'closed-after-valid-verifier']);
const read = file => fs.readFileSync(path.join(ROOT, file));
function expectedPacket(readSource = read) {
  const evidence = JSON.parse(readSource('docs/cad-production-verifier-evidence-template.json'));
  if (!checkEvidence(evidence, { readSource }).ok) throw Error('SOURCE_INVALID');
  if (!isDeepStrictEqual(Object.values(CASES).flat().sort(), Object.keys(DETAILS).sort())) throw Error('CASE_PLAN_INVALID');
  return {
    schemaVersion: 1, packet: 'cad-auth-live-evidence-v1', sourceOnly: true,
    status: 'PLANNED_BLOCKED_NOT_EXECUTABLE', claims: evidence.claims,
    candidate: {
      acceptancePr: 383, acceptanceMerge: 'b885f1f9a569b5bfa5627858cbb1542342b7da43',
      candidatePr: 384, candidateHead: '96b465bc8f27b4b7a0b79a7ac2c932f07dfa53a8', candidateMerge: BASE,
      appDeployment: { githubId: 6613179379, commit: BASE, environment: 'Production',
        status: 'success', statusAtUtc: '2026-09-23T11:49:34Z',
        url: 'https://reversr-6ubf0dy2w-vsillahs-projects.vercel.app',
        vercelRef: 'https://vercel.com/vsillahs-projects/reversr/G5sHvxfktoKGwrretFWpQ4EvMcQ2',
        evidenceKind: 'GITHUB_METADATA_ONLY_NOT_LIVE_PROVIDER_PROOF' },
      providerAdapterCommit: null, providerDeploymentRef: null, collectionDeploymentRef: null,
      providerPolicyReceipt: null, collectorCommit: null, collectorSha256: null,
      sourceSdkPins: { convex: '1.45.0', auth: '0.0.95', authCore: '0.41.3' },
      runtimeSdkAttestation: null, candidateMountedInProductionRoute: false,
    },
    proposedWindow: { ...WINDOW, status: 'PROPOSED_NOT_AUTHORIZED', durationMinutes: 30,
      lateApprovalPolicy: 'EXPIRE_AND_REPLAN_NO_AUTOMATIC_ROLLOVER', historicalWindowReusable: false },
    approval: { exactPhrase: APPROVAL, receipt: null, approved: false, executionAuthorized: false,
      phraseAloneSufficient: false, bindFinalPacketCommitAndSha256: true },
    bounds: { maxRunAttempts: 1, maxRetries: 0, maxCandidateOperations: 256,
      maxProviderReadCalls: 2048, maxActualRouteRequests: 8, maxConcurrentOperations: 2,
      operationDeadlineMs: 800, schedulerToleranceMs: 100, maxRunMinutes: 30,
      loginCreations: 0, stateMutations: 0, uploadSessionsIssued: 0, uploadPayloadBytesSent: 0,
      uploadBodyBytesRead: 0, gatewayDispatches: 0, conversionDispatches: 0, sandboxDispatches: 0,
      newSpendUsd: 0, liveCollectorIncluded: false },
    cohort: { technicalKey: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
      collectionAlias: 'cad-auth-evidence-synthetic-v1', historicalCohortApprovalReusable: false,
      syntheticOnly: true, realUserCount: 0, owner: 'RRb Integration Captain',
      identities: ['A: member of shop-X', 'B: different user, member of shop-X'],
      logins: ['A1: first login', 'A2: simultaneous independent login', 'A3: replacement fixture', 'B1: different user login'],
      shops: ['shop-X: allowed synthetic shop', 'shop-Y: nonmember synthetic shop'],
      fixtureSlots: ['owner-absent', 'session-deleted', 'owner-mismatch', 'membership-removed', 'permission-removed', 'expired', 'revoked'],
      liveIdentityMappingReceipt: null, preexistingFixtureReceipt: null,
      setupPolicy: 'NO_CREATE_LOGIN_LOGOUT_REVOKE_DELETE_OR_MEMBERSHIP_WRITES; SEPARATE_SETUP_APPROVAL_REQUIRED',
      refreshBinding: 'IN_MEMORY_SYNTHETIC_SESSION_REFERENCE_ONLY_NEVER_ISSUED_OR_STORED',
      credentialHandling: 'REVIEWED_REQUEST_LOCAL_AUTH_CONTEXT_ONLY; NO_SECRET_FILE_ENV_OR_CREDENTIAL_EXPORT' },
    prerequisites: [
      'Reviewed concrete provider adapter and immutable provider deployment, verified issuer/audience/algorithms and auth-method mapping; source-only librarySession development password mapping is insufficient.',
      'Separately reviewed collector with immutable commit/digest, bounded calls, cancellation, zero writes/issuance and allowlisted evidence output; no executable collector exists in this packet.',
      'Existing authorized synthetic cohort and fixture/lifecycle receipts; no real-user IDs and no new login/setup mutations during collection.',
      'Separately approved actual-route instrumentation deployment, exact entrypoint/proxy/middleware hashes and stop switch; candidate is currently unmounted.',
      'Named custodian/reviewer, restricted sanitized evidence destination and redaction review receipt.',
      'Final packet commit/digest, exact source/deployment/collector/cohort receipts and fresh explicit approval before proposed window; unchanged blockers mean no-go.',
    ].map(requirement => ({ requirement, status: 'BLOCKED', receipt: null })),
    routePlan: { method: 'POST', path: '/api/cad/user-import',
      chain: ['vercel.json', 'api/[...path].js', 'server/index.js', 'server/cadUserUploadRouter.js', 'server/uploadSession.js'],
      separateServiceEnvelopePath: '/cad/upload-session-gateway',
      candidateBoundary: 'LOGIN_BEARER_IN_OFFLINE_CANDIDATE; UPLOAD_ROUTE_EXPECTS_UPLOAD_SESSION_CREDENTIAL',
      probes: ['ingress raw/normalized header counts', 'middleware entry/exit sequence', 'req.body getter',
        'req.read/resume/pipe', 'data/readable listeners', 'async iterator', 'JSON/raw/parser invocation',
        'application upload bytes consumed', 'verification/admission decision', 'issuer/gateway/conversion/Sandbox invocation'],
      safety: 'Passive counters or fail-before-delegation traps; never attach data listeners or consume bytes to measure zero. No payload sent.',
      positiveRouteProof: 'BLOCKED_SEPARATE_COMPOSITION; OFFLINE_VALID_TEST_SESSION_IS_SYNTHETIC_ONLY',
      emptyRequestLimit: 'Zero-byte request alone cannot prove absence of reads for nonempty payloads; instrument attempts and retain body-admission gate.',
      actualRouteInstrumented: false, observedBodyBytes: null, requiredBodyBytes: 0 },
    cases: Object.entries(CASES).flatMap(([category, ids]) => ids.map(id => ({
      category, id, paths: ['provider', 'review'].includes(category) ? ['inspection'] : ['resolve', 'refresh'],
      evidenceClass: SETUP_CASES.has(id) ? 'BLOCKED_SEPARATE_FIXTURE_OR_TRANSITION_RECEIPT'
        : SYNTHETIC_CASES.has(id) ? 'SYNTHETIC_FAULT_ONLY_PROVIDER_PROOF_STILL_REQUIRED'
          : ['body', 'transport'].includes(category) ? 'BLOCKED_ACTUAL_ROUTE_INSTRUMENTATION'
            : category === 'review' || id === 'sdk-issuer-audience-algorithms' ? 'SANITIZED_RECEIPT_INSPECTION' : 'PLANNED_PROVIDER_OBSERVATION',
      stimulus: DETAILS[id][0], expected: DETAILS[id][1], status: 'NOT_COLLECTED', observed: null, receipt: null,
    }))),
    receiptTemplate: { schemaVersion: 1, runRef: null, category: null, caseId: null, path: null,
      evidenceClass: null, candidateCommit: null, providerAdapterCommit: null, deploymentRef: null,
      collectorCommit: null, collectorSha256: null, approvedPacketCommit: null, approvedPacketSha256: null,
      cohortReceiptRef: null, identityAlias: null, loginAlias: null, shopAlias: null,
      startedAtUtc: null, endedAtUtc: null, expectedCode: null, observedCode: null,
      providerReadCount: null, bodyAccessAttemptCount: null, uploadBodyBytes: null,
      uploadSessionsIssued: null, sideEffects: null, elapsedMs: null, deadlineMs: null,
      evidenceRef: null, evidenceSha256: null, reviewer: null, disposition: 'NOT_COLLECTED' },
    custody: { custodian: 'RRb Integration Captain', reviewer: null, destinationReceipt: null,
      rawCaptureAllowed: false, publicReceiptPublicationAllowed: false,
      projection: 'ALLOWLIST_ENUMS_ALIASES_COUNTS_TIMES_AND_SOURCE_REFS_ONLY',
      forbidden: ['tokens', 'cookies', 'secret/env values', 'raw provider replies', 'raw headers', 'raw user/session/shop IDs', 'PII', 'CAD', 'private exceptions', 'credential hashes'],
      digest: 'SHA256_OF_SANITIZED_BYTES_ONLY',
      retention: 'Review within 7 days; retain sanitized summary/digests, delete temporary sanitized detail after review under approved custody policy; never persist raw data.',
      completedReceipts: 'SEPARATE_RESTRICTED_ARTIFACT; NEVER_FILL_PENDING_PR383_PR384_OR_THIS_PLAN' },
    stopConditions: ['missing or drifted source/deployment/approval/cohort/instrumentation receipt',
      'window expiry, wall-clock rollback, budget/call/deadline overrun',
      'unexpected credential/user, real-user exposure or unsanitized evidence',
      'any mutation, upload-session issuance, body-access attempt, body byte, gateway/conversion/Sandbox dispatch',
      'provider failure, unclassified outcome, grant after cancellation, blocked prerequisite or failed case'],
    stopProcedure: ['Stop dispatch immediately and abort in-flight reads; do not retry or complete remaining cases.',
      'Discard request-local credentials and in-memory bindings; record sanitized stop code and partial counts only.',
      'Keep runtime and body gates closed; do not flip env flags, revoke sessions, deploy or change provider settings as rollback.',
      'If separately approved instrumentation was installed, only its separately approved custodian rollback may restore it; attach that receipt or mark BLOCKED.',
      'Captain review required before any new proposal; no implicit second run.'],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, createHash('sha256').update(readSource(file)).digest('hex')])),
  };
}
function checkPacket(packet, { readSource = read, now = Date.now() } = {}) {
  let valid = false;
  try { valid = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* No private diagnostics. */ }
  const start = Date.parse(WINDOW.startsAtUtc), end = Date.parse(WINDOW.expiresAtUtc);
  const windowState = !Number.isSafeInteger(now) || now < 0 ? 'INVALID_CLOCK'
    : now < start ? 'FUTURE_PROPOSAL' : now < end ? 'PROPOSED_WINDOW_OPEN_NOT_AUTHORIZED' : 'EXPIRED_REPLAN_REQUIRED';
  return { ok: valid, sourcePlanValid: valid, windowState, readyForLiveCollection: false,
    liveCollectionAuthorized: false, productionVerifierAccepted: false, providerEvidenceCollected: false,
    uploadSessionIssuanceEnabled: false, bodyAdmissionAuthorized: false, runtimeActivationAuthorized: false,
    problems: valid ? [] : ['INVALID_SOURCE_ONLY_COLLECTION_PLAN'] };
}
if (require.main === module) {
  let packet;
  try { packet = JSON.parse(read(PACKET)); } catch { /* Closed result. */ }
  const result = checkPacket(packet);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { PACKET, SOURCES, WINDOW, APPROVAL, expectedPacket, checkPacket };
