// Pure source-only contract. No runner, adapters, credentials, sessions or body IO.
const { isDeepStrictEqual, types } = require('node:util');

// This contract includes ordered arrays; the older plainData helper excludes them.
// Inspect descriptors before values so accessors, proxies and serializers cannot run.
function plainContractData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || types.isProxy(value) || depth > 24 || seen.has(value)) return false;
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) return false;
  seen.add(value);
  const keys = Reflect.ownKeys(value);
  if (array && keys.length !== value.length + 1) return false;
  for (const key of keys) {
    if (array && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || (array && !/^(0|[1-9][0-9]*)$/.test(key))
      || !descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')
      || !plainContractData(descriptor.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}
const { uploadAdmissionReadinessRollup, productionUploadAdmissionPhraseTemplate } =
  require('../cad-auth-upload-admission-readiness-rollup/preparation');

const BASE_COMMIT = '4e3f2cd74ca20cddb9badc8203b5fb4fb3245120';
const ROLLUP_SHA256 = '9c85cdef9841a16f8400e1ba960c16cbbc3e83e6d63130324287266733dc204b';
const CLOSED_SOURCES = Object.freeze({
  'server/cadUserUploadRouter.js': 'a763ba4e7ec736b8aec56491fe5e66c9482383f4caaa62cfac8f5dde6a3887ad',
  'server/cadInternalProductionAdmissionSwitch.js': '70b3ab68d9aa43aa33959a3d62c31013f09878a161790838d089543261338ba9',
  'server/cadUploadAdmissionRuntimeBridge.js': '6e23ccf8310bc1b745927cf091ab69ce60a7f6619f34ea27b0013539c2485fc2',
});

function preparation() {
  const rollup = uploadAdmissionReadinessRollup();
  return {
    schemaVersion: 1,
    packet: 'cad-auth-production-opening-preparation-v1',
    sourceOnly: true,
    status: 'PREPARATION_ONLY_LIVE_GATE_REQUIRED',
    baseCommit: BASE_COMMIT,
    rollupSha256: ROLLUP_SHA256,
    target: rollup.productionUploadAdmissionTarget,
    controls: { ...rollup.controls, sourceOnlyUploadAdmissionReadinessRollupAuthorized: false,
      sourceOnlyOpeningPreparationAuthorized: true },
    runnerDesign: {
      implemented: false, enabled: false, runtimeMounted: false,
      executableCommandCard: null,
      legacyDevelopmentRunnerIsAuthority: false,
      maxConcurrentSessions: 1, maxUploadAttempts: 1, maxRuns: 1, retries: 0,
      sequence: [
        'VERIFY_FRESH_EXPLICIT_LIVE_GATE_AND_IMMUTABLE_TARGET',
        'VERIFY_ALL_PREFLIGHT_RECEIPTS_AND_CLOSED_BASELINE',
        'ARM_INDEPENDENT_EXPIRY_AND_ROLLBACK_FENCE',
        'ATOMICALLY_CONSUME_UNIQUE_RUN_BEFORE_ANY_EFFECT',
        'RECHECK_WINDOW_COHORT_SESSION_AND_ADMISSION_FENCE',
        'ALLOW_ONLY_SEPARATELY_AUTHORIZED_SINGLE_ADMISSION',
        'CLOSE_FENCE_REVOKE_SESSION_AND_PRESERVE_CONSUMED_RUN',
        'VERIFY_POST_ROLLBACK_FAIL_CLOSED_SMOKE',
        'SANITIZED_CLOSEOUT_OR_BLOCKED_UNKNOWN_NO_RETRY',
      ],
      window: { startUtc: null, expiresUtc: null, maxDurationSeconds: null,
        startInclusive: true, expiryExclusive: true,
        trustedClockRequired: true, clockUncertaintyStops: true,
        recheckBeforeEveryEffect: true, rejectStaleOrReplayedApproval: true },
      consumedRun: { durableAtomicCompareAndSetRequired: true,
        keyBindsApprovalTargetCohortWindowAndPacket: true,
        consumeBeforeSessionIssuanceOrOpening: true,
        unknownConsumeOutcomeStops: true, neverReleaseForRetry: true,
        freshProductionRunIdRequired: true },
    },
    preflight: {
      required: [
        'Fresh explicit approval binds this packet digest and reviewed source commit',
        'Revalidate rollup, provenance, eight receipt categories and all source digests',
        'Bind immutable production deployment and exact route; reject changed target',
        'Resolve finite UTC start, expiry and maximum duration; reject old development windows',
        'Bind fresh production run id, cohort, reviewer and restricted custody by sanitized refs',
        'Verify durable atomic consumed-run ledger and one-session one-attempt counters',
        'Verify independently enforced expiry fence and rollback capability before opening',
        'Verify installed body observer and late-grant observer are target-bound and healthy',
        'Verify baseline denial with zero body reads, conversions and Sandbox dispatches',
        'Verify provider/config readiness without changing configuration; stop if credentials are needed',
      ],
      sessionAdmission: [
        'Issuance requires separate explicit live authority; this packet never issues a session',
        'Authenticate principal, bind user/shop/session to exact internal cohort and target',
        'Require CAD permission, exact allowed origin and CSRF; reject revoked or expired sessions',
        'Session expiry cannot exceed window expiry; no late or second grant',
        'Atomic admission fence binds session, consumed run, target, window and one upload attempt',
        'Consume attempt before body read; failed or unknown attempt is never reusable',
        'Validate approved payload class and bounded size/type without conversion or Sandbox dispatch',
        'Reject non-cohort, duplicate, concurrent, early and expired requests before body access',
      ],
      allRequired: true, missingUnknownOrStaleStops: true,
    },
    rollback: {
      triggers: ['completion', 'expiry', 'failing check', 'failing smoke', 'unknown outcome',
        'digest or target drift', 'observer unavailable', 'late grant', 'clock uncertainty',
        'unexpected body read', 'unapproved session or attempt', 'credential or provider change needed'],
      order: ['close admission fence first', 'revoke bounded session and pending grants',
        'preserve consumed run and attempt tombstones', 'verify target closure and late-grant denial',
        'run post-rollback fail-closed smoke', 'publish sanitized status only'],
      independentExpiryRequired: true, processCrashMustFailClosed: true,
      idempotentClosureRequired: true, reopeningForSmokeForbidden: true,
      unknownClosureBlocksCleanup: true, retryOrSecondRunForbidden: true,
    },
    postRollbackSmoke: {
      liveRunAuthorizedNow: false,
      targetMustMatchApprovedDeployment: true,
      cases: [
        { case: 'missing invalid expired or revoked session', expected: '401 USER_SESSION_REQUIRED' },
        { case: 'non-CAD principal', expected: '403 USER_UPLOAD_FORBIDDEN' },
        { case: 'invalid origin or CSRF', expected: '403 ORIGIN_OR_CSRF_REJECTED' },
        { case: 'valid permitted pre-existing synthetic session after closure', expected: '503 USER_UPLOADS_DISABLED' },
        { case: 'late grant duplicate attempt or concurrent run', expected: 'DENIED_BEFORE_BODY_READ' },
      ],
      requireExistingSeparatelyAuthorizedFixture: true,
      noSessionIssuanceForSmoke: true,
      observerDeltas: { bodyReads: 0, sessionsIssued: 0, conversions: 0, sandboxDispatches: 0 },
      responsesAloneProveClosure: false,
      missingFixtureOrObserverResult: 'BLOCKED_NO_CLEANUP_NO_RETRY',
      evidence: 'Sanitized target refs, digests, counts and statuses only; never bodies or credentials',
    },
    futureGate: {
      authorized: false, commandCardIssuanceAuthorized: false,
      exactPhraseTemplate: productionUploadAdmissionPhraseTemplate()
        + ' Bind opening preparation <openingPacketSha256> at reviewed commit <openingSourceCommit>, immutable target <targetRef>, fresh production run <productionRunRef>, maximum duration <maxDurationSeconds> seconds, and rollback/smoke contract <rollbackContractSha256>. Session issuance, runtime activation, and request-body admission/read each require explicit separate authorization.',
      phraseFields: { rollupPacketSha256: null, rollupSourceCommit: null, startUtc: null,
        expiresUtc: null, openingPacketSha256: null, openingSourceCommit: null,
        targetRef: null, productionRunRef: null, maxDurationSeconds: null, rollbackContractSha256: null },
      filledTemplateIsNotExecutionAuthority: true,
      freshHumanGateAndReviewedRuntimeImplementationRequired: true,
    },
  };
}

function checkPreparation(input) {
  let ok = false;
  try { ok = input !== null && typeof input === 'object' && !Array.isArray(input) && plainContractData(input) && isDeepStrictEqual(input, preparation()); } catch { /* sanitized */ }
  return { ok, code: ok ? 'SOURCE_ONLY_OPENING_PREPARATION_VALID' : 'INVALID_OPENING_PREPARATION',
    liveExecutionReady: false, ...preparation().controls };
}
module.exports = { BASE_COMMIT, ROLLUP_SHA256, CLOSED_SOURCES, plainContractData, preparation, checkPreparation };
