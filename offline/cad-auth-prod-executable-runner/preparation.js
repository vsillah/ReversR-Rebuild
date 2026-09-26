// Pure preparation and receipt rehearsal. No adapter callbacks or runtime imports.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData, preparation } = require('../cad-auth-prod-opening-prep/preparation');
const { ORDER, REQUIREMENTS } = require('../cad-auth-prod-runner/runner');
const DIGESTS = Object.freeze(['approval', 'source', 'packet', 'rollup', 'provenance', 'receipts',
  'deployment', 'route', 'cohort', 'run', 'session', 'reviewer', 'custody', 'rollback']);
const OPERATIONS = Object.freeze({ PREFLIGHT: 'verifyClosedTargetAndIndependentFence',
  CLAIM: 'compareAndSetRunTombstone', SESSION: 'verifySessionAdmissionPrechecks',
  ATTEMPT: 'compareAndSetAttemptTombstone', CLOSE: 'closeFence', REVOKE: 'revokePendingAndBoundedSession',
  TOMBSTONES: 'verifyRetainedTombstonesAndClosure', SMOKE: 'verifyClosedTargetSmoke' });
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const exactKeys = (value, keys) => value && !Array.isArray(value)
  && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
function validBinding(b) {
  if (!plainContractData(b) || !exactKeys(b, ['digests', 'startUtc', 'expiresUtc', 'maxDurationSeconds'])) return false;
  if (!exactKeys(b.digests, DIGESTS) || !DIGESTS.every(key => typeof b.digests[key] === 'string'
    && /^[a-f0-9]{64}$/.test(b.digests[key]))) return false;
  const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  return utc(b.startUtc) && utc(b.expiresUtc) && Number.isSafeInteger(b.maxDurationSeconds)
    && b.maxDurationSeconds > 0 && Date.parse(b.expiresUtc) > Date.parse(b.startUtc)
    && Date.parse(b.expiresUtc) - Date.parse(b.startUtc) <= b.maxDurationSeconds * 1000;
}
function canonicalBinding(b) {
  return { digests: Object.fromEntries(DIGESTS.map(key => [key, b.digests[key]])),
    startUtc: b.startUtc, expiresUtc: b.expiresUtc, maxDurationSeconds: b.maxDurationSeconds };
}
function boundaries() {
  return { sourceOnly: true, enabled: false, runtimeMounted: false, liveExecutionReady: false,
    executableCommandCard: null, commandCardIssuanceAuthorized: false, cleanupAuthorized: false,
    effectsExecuted: 0, ...preparation().controls };
}
function prepareCommandCard(binding) {
  try {
    if (!validBinding(binding)) throw Error();
    const b = canonicalBinding(binding), bindingSha256 = sha(b);
    return { ...boundaries(), code: 'COMMAND_CARD_PREPARATION_ONLY', bindingSha256,
      // A descriptor is not a shell command, receipt, approval or live capability.
      candidate: { kind: 'non-executable-adapter-request-plan', binding: b,
        runKey: sha({ approval: b.digests.approval, run: b.digests.run }),
        bindingSha256, maxSessions: 1, maxAttempts: 1, maxRuns: 1, retries: 0,
        operations: ORDER.map(kind => ({ kind, operation: OPERATIONS[kind],
          bindingSha256, requiredChecks: [...REQUIREMENTS[kind]],
          trustedClockRequired: true, windowRequired: ORDER.indexOf(kind) < 4 })) } };
  } catch { return { ...boundaries(), code: 'INVALID_COMMAND_CARD_PREPARATION', candidate: null }; }
}
function adapterContract() {
  return { implemented: false, mounted: false, callbacksAccepted: false,
    operations: { ...OPERATIONS },
    durableRequirements: ['atomic compare-and-set across processes and restarts',
      'unique approval/run key also rejects changed target window or packet',
      'claim and attempt unknown outcomes retain tombstones and forbid retry',
      'session and attempt counters are atomic and bounded to one',
      'server independently enforces expiry and crash closure',
      'idempotent close and revoke remain available after expiry',
      'receipt authenticity and fresh source provenance require independent verification'],
    smoke: preparation().postRollbackSmoke };
}
function createReceiptRehearsal(binding) {
  const prepared = prepareCommandCard(binding), candidate = prepared.candidate;
  let phase = 0, failed = !candidate, done = false, lastNow = -Infinity;
  let claim = false, attempt = false, smoke = false;
  const closeout = () => ({ ...boundaries(), code: failed ? 'BLOCKED_NO_RETRY' : done
    ? 'SOURCE_REHEARSAL_COMPLETE' : 'SOURCE_REHEARSAL_PENDING',
    bindingSha256: candidate?.bindingSha256 || null, acceptedSteps: phase,
    simulatedRunTombstone: claim, simulatedAttemptTombstone: attempt,
    simulatedClosureVerified: smoke, retryAllowed: false, commercialReadiness: false });
  return Object.freeze({ closeout, accept(receipt) {
    if (done || !candidate) { failed = true; smoke = false; return closeout(); }
    const kind = ORDER[phase];
    // Unknown CAS outcomes burn the simulated reservation before inspecting the receipt.
    if (kind === 'CLAIM') claim = true;
    if (kind === 'ATTEMPT') attempt = true;
    try {
      if (!plainContractData(receipt) || !receipt || !Number.isSafeInteger(receipt.nowMs)) throw Error();
      const expected = { kind, bindingSha256: candidate.bindingSha256, nowMs: receipt.nowMs,
        clockTrusted: true, checks: Object.fromEntries(REQUIREMENTS[kind].map(key => [key, true])),
        observerDeltas: { bodyReads: 0, sessionsIssued: 0, conversions: 0, sandboxDispatches: 0 },
        ...(kind === 'SMOKE' ? { cases: preparation().postRollbackSmoke.cases } : {}) };
      if (!isDeepStrictEqual(receipt, expected) || receipt.nowMs < lastNow) throw Error();
      if (phase < 4 && (failed || receipt.nowMs < Date.parse(candidate.binding.startUtc)
        || receipt.nowMs >= Date.parse(candidate.binding.expiresUtc))) throw Error();
      lastNow = receipt.nowMs;
      phase++;
      if (kind === 'SMOKE') { smoke = true; done = true; }
    } catch {
      failed = true; smoke = false;
      // Re-run ordered idempotent closure after any invalid rollback receipt.
      phase = 4;
    }
    return closeout();
  } });
}
module.exports = { DIGESTS, OPERATIONS, prepareCommandCard, adapterContract, createReceiptRehearsal };
