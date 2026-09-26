// Offline state machine only. No runtime adapters or effect callbacks exist.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData, preparation } = require('../cad-auth-prod-opening-prep/preparation');
const ORDER = Object.freeze(['PREFLIGHT', 'CLAIM', 'SESSION', 'ATTEMPT', 'CLOSE', 'REVOKE', 'TOMBSTONES', 'SMOKE']);
const REQUIREMENTS = Object.freeze({
  PREFLIGHT: Object.freeze(['freshApproval', 'sourceDigests', 'rollupAndProvenance', 'eightReceiptCategories',
    'immutableDeploymentAndRoute', 'closedBaseline', 'durableAtomicLedger', 'oneSessionOneAttemptCounters',
    'independentExpiryFence', 'crashFailsClosed', 'idempotentRollback', 'bodyObserver', 'lateGrantObserver',
    'providerReadyWithoutCredentialsOrChanges', 'restrictedCustodyAndReviewer']),
  CLAIM: Object.freeze(['atomicClaimConfirmed']),
  SESSION: Object.freeze(['authenticated', 'cadPermission', 'cohortUserShopMatch', 'originAllowed', 'csrfValid',
    'notRevoked', 'notExpired', 'expiryWithinWindow', 'noLateOrSecondGrant', 'sessionFenceMatchesRun',
    'approvedPayloadClassAndBoundedMetadata', 'separateSessionAuthority', 'separateActivationAuthority', 'separateBodyAuthority']),
  ATTEMPT: Object.freeze(['atomicAttemptConfirmed', 'noDuplicateOrConcurrentAttempt', 'admissionFenceMatchesSession']),
  CLOSE: Object.freeze(['fenceClosed', 'independentExpiryStillEnforced']),
  REVOKE: Object.freeze(['boundedSessionRevoked', 'pendingAndLateGrantsDenied']),
  TOMBSTONES: Object.freeze(['runPreserved', 'attemptPreserved', 'targetClosureConfirmed']),
  SMOKE: Object.freeze(['existingSeparatelyAuthorizedFixture', 'observerHealthy', 'targetMatches', 'noReopening']),
});
function fixturePlan() {
  return { mode: 'synthetic-dry-run', enabled: false, sourceCommit: 'a'.repeat(40), packetSha256: 'b'.repeat(64),
    approvalRef: 'synthetic-approval', targetRef: 'synthetic-deployment-route', cohortRef: 'synthetic-cohort',
    runRef: 'synthetic-fresh-run', sessionRef: 'synthetic-existing-session', reviewerRef: 'synthetic-reviewer',
    startUtc: '2030-01-01T00:00:00.000Z', expiresUtc: '2030-01-01T00:01:00.000Z', maxDurationSeconds: 60 };
}
function validPlan(plan) {
  if (!plainContractData(plan) || !plan || Array.isArray(plan)) return false;
  const shape = fixturePlan();
  if (!isDeepStrictEqual(Object.keys(plan).sort(), Object.keys(shape).sort())) return false;
  if (plan.mode !== shape.mode || plan.enabled !== false || !/^[a-f0-9]{40}$/.test(plan.sourceCommit)
    || !/^[a-f0-9]{64}$/.test(plan.packetSha256)) return false;
  for (const key of ['approvalRef', 'targetRef', 'cohortRef', 'runRef', 'sessionRef', 'reviewerRef']) {
    if (typeof plan[key] !== 'string' || !/^synthetic-[a-z0-9-]{1,64}$/.test(plan[key])) return false;
  }
  const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  return utc(plan.startUtc) && utc(plan.expiresUtc) && Number.isSafeInteger(plan.maxDurationSeconds)
    && plan.maxDurationSeconds > 0 && Date.parse(plan.expiresUtc) > Date.parse(plan.startUtc)
    && Date.parse(plan.expiresUtc) - Date.parse(plan.startUtc) <= plan.maxDurationSeconds * 1000;
}
function expectedEvent(plan, kind, nowMs) {
  return { kind, nowMs, clockTrusted: true, binding: structuredClone(plan),
    checks: Object.fromEntries(REQUIREMENTS[kind].map(key => [key, true])),
    observerDeltas: { bodyReads: 0, sessionsIssued: 0, conversions: 0, sandboxDispatches: 0 },
    ...(kind === 'SMOKE' ? { cases: preparation().postRollbackSmoke.cases } : {}) };
}
function createDryRunner(input) {
  let plan = null;
  try { if (validPlan(input)) plan = structuredClone(input); } catch { /* sanitized */ }
  let phase = 0, stopped = !plan, closed = true, consumed = false, attemptConsumed = false;
  let smokeVerified = false, lastNow = -Infinity;
  const result = code => Object.freeze({ code, sourceOnly: true, enabled: false, runtimeMounted: false,
    liveExecutionReady: false, liveExecutionAuthorized: false, cleanupAuthorized: false,
    ...preparation().controls, simulatedPhase: ORDER[phase] || 'DONE', stopped,
    simulatedFenceClosed: closed, simulatedRunConsumed: consumed,
    simulatedAttemptConsumed: attemptConsumed, simulatedSmokeVerified: smokeVerified,
    simulatedCleanupReady: smokeVerified, effectsExecuted: 0 });
  function fail() {
    stopped = true; smokeVerified = false;
    // No reopening after failure. Closure must still be demonstrated in order.
    if (phase < 4) phase = 4;
    return result('BLOCKED_NO_RETRY');
  }
  return Object.freeze({
    status: () => result(plan ? 'SOURCE_ONLY_DISABLED' : 'INVALID_SYNTHETIC_PLAN'),
    step(event) {
      try {
        if (!plan || !plainContractData(event) || !event || phase >= ORDER.length) return fail();
        const kind = ORDER[phase];
        if (!Number.isSafeInteger(event.nowMs) || event.nowMs < lastNow
          || !isDeepStrictEqual(event, expectedEvent(plan, kind, event.nowMs))) {
          // Any attempted claim, even an unknown outcome, burns the local tombstone.
          if (kind === 'CLAIM') consumed = true;
          if (kind === 'ATTEMPT') attemptConsumed = true;
          return fail();
        }
        lastNow = event.nowMs;
        if (phase < 4 && (stopped || event.nowMs < Date.parse(plan.startUtc)
          || event.nowMs >= Date.parse(plan.expiresUtc))) return fail();
        if (kind === 'CLAIM') consumed = true;
        if (kind === 'SESSION') { if (!consumed) return fail(); closed = false; }
        if (kind === 'ATTEMPT') { if (!consumed || closed) return fail(); attemptConsumed = true; }
        if (kind === 'CLOSE') closed = true;
        if (kind === 'SMOKE') { if (!closed) return fail(); smokeVerified = true; }
        phase++;
        return result(kind === 'SMOKE' ? 'SIMULATED_CLOSURE_VERIFIED' : 'SIMULATED_STEP_ACCEPTED');
      } catch { return fail(); }
    },
  });
}
function dryRun() {
  const plan = fixturePlan();
  const runner = createDryRunner(plan);
  for (const kind of ORDER) runner.step(expectedEvent(plan, kind, Date.parse(plan.startUtc)));
  return runner.status();
}
module.exports = { ORDER, REQUIREMENTS, fixturePlan, expectedEvent, createDryRunner, dryRun };
