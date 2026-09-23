// Offline replay of sanitized synthetic receipts only. No live runner or I/O.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const plan = require('../../docs/cad-auth-live-evidence-plan.json');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const schedule = plan.cases.flatMap(c => c.paths.flatMap(path =>
  (c.requiresSeparateLifecycleSetup ? ['before', 'after']
    : c.id === 'concurrent-credential-isolation' ? ['pair-u1', 'pair-u2'] : ['single'])
    .map(phase => ({ caseId: c.id, path, phase, observationType: c.observationType,
      expected: c.expected, lifecycleReceiptRequired: c.requiresSeparateLifecycleSetup }))));
const scheduleSha256 = digest(schedule);
const limitsSha256 = digest(plan.limits);
const COUNTERS = Object.freeze(['readerInvocations', 'providerHttpRequests',
  'providerWrites', 'setupChanges', 'uploadSessionIssuances', 'applicationUploadBodyReads',
  'bodyGetterAttempts', 'readAttempts', 'parserInvocations', 'conversionDispatches',
  'sandboxDispatches', 'privateCadFiles', 'realUsers', 'externalMessages', 'purchases', 'lateGrants']);
const FIELDS = Object.freeze(['caseId', 'path', 'phase', 'observationType', 'provenance',
  'candidateCommit', 'scheduleSha256', 'limitsSha256', 'fixtureTarget', 'syntheticAlias',
  'startedAtMs', 'endedAtMs', 'durationMs', 'observedCode', 'disposition', 'counters']);
const CODES = Object.freeze(['GRANT', 'DENIED', 'AUTH_UNAVAILABLE', 'USER_UPLOADS_DISABLED',
  'INSPECTED', 'FAULT_OBSERVED', 'UNKNOWN']);
// Accept only inert JSON data. Reject getters without executing them; never echo rejected input.
function inert(value, depth = 0) {
  if (depth > 8) return false;
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Reflect.ownKeys(value).every(key => {
    const d = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && d.enumerable && 'value' in d && inert(d.value, depth + 1);
  });
}
function validateReceipt(receipt, entry, window) {
  try {
    if (!inert(receipt) || !isDeepStrictEqual(Object.keys(receipt).sort(), [...FIELDS].sort())) return false;
    if (!entry || !['caseId', 'path', 'phase', 'observationType'].every(k => receipt[k] === entry[k])) return false;
    if (receipt.provenance !== 'LOCAL_SYNTHETIC_ONLY' || receipt.fixtureTarget !== 'offline-fixture'
      || receipt.candidateCommit !== plan.candidate.sourceCommit
      || receipt.scheduleSha256 !== scheduleSha256 || receipt.limitsSha256 !== limitsSha256
      || !['U1/L1', 'U1/L2', 'U2/L3'].includes(receipt.syntheticAlias)) return false;
    if (entry.phase === 'pair-u1' && receipt.syntheticAlias !== 'U1/L1'
      || entry.phase === 'pair-u2' && receipt.syntheticAlias !== 'U2/L3') return false;
    if (![receipt.startedAtMs, receipt.endedAtMs, receipt.durationMs].every(n => Number.isSafeInteger(n) && n >= 0)
      || receipt.startedAtMs < window.startsAtMs || receipt.endedAtMs >= window.expiresAtMs
      || receipt.endedAtMs < receipt.startedAtMs || receipt.durationMs > plan.limits.maxOperationBudgetMs
      || receipt.endedAtMs - receipt.startedAtMs > plan.limits.maxOperationBudgetMs) return false;
    if (!CODES.includes(receipt.observedCode) || !['UNREVIEWED', 'FAIL', 'UNKNOWN'].includes(receipt.disposition)) return false;
    if (!isDeepStrictEqual(Object.keys(receipt.counters).sort(), [...COUNTERS].sort())) return false;
    return COUNTERS.every(k => Number.isSafeInteger(receipt.counters[k]) && receipt.counters[k] >= 0
      && receipt.counters[k] <= (k === 'readerInvocations' ? 2 : k === 'providerHttpRequests' ? 4 : 0));
  } catch { return false; }
}
function createReceiptCollector({ startsAtMs = 0, expiresAtMs = 1800000 } = {}) {
  if (!Number.isSafeInteger(startsAtMs) || startsAtMs < 0 || !Number.isSafeInteger(expiresAtMs)
    || expiresAtMs <= startsAtMs || expiresAtMs - startsAtMs > 1800000) throw Error('INVALID_SYNTHETIC_WINDOW');
  const window = { startsAtMs, expiresAtMs };
  let index = 0, stopped = false, readers = 0, requests = 0, lastEnd = startsAtMs;
  const receipts = [];
  const status = () => ({ sourceOnly: true, executable: false, liveEvidence: false,
    stopped, receiptCount: receipts.length, complete: index === schedule.length && !stopped,
    reviewed: false, providerAccepted: false });
  return Object.freeze({
    ingest(receipt) {
      if (stopped) return { ...status(), ok: false, code: 'COLLECTOR_STOPPED' };
      const valid = validateReceipt(receipt, schedule[index], window);
      if (!valid || index >= plan.limits.maxLogicalOperations || receipt.startedAtMs < lastEnd
        || readers + receipt.counters.readerInvocations > plan.limits.maxReaderInvocations
        || requests + receipt.counters.providerHttpRequests > plan.limits.maxProviderHttpRequests) {
        stopped = true;
        return { ...status(), ok: false, code: 'RECEIPT_REJECTED' };
      }
      const copy = clone(receipt);
      receipts.push({ receipt: copy, sanitizedEvidenceSha256: digest(copy) });
      readers += copy.counters.readerInvocations; requests += copy.counters.providerHttpRequests;
      lastEnd = copy.endedAtMs; index++;
      if (copy.disposition !== 'UNREVIEWED' || copy.observedCode === 'UNKNOWN') stopped = true;
      return { ...status(), ok: !stopped, code: stopped ? 'OBSERVATION_STOP' : 'SYNTHETIC_RECORDED' };
    },
    stop() { stopped = true; return status(); },
    snapshot() { return { ...status(), receipts: clone(receipts) }; },
  });
}
module.exports = { getSchedule: () => clone(schedule), scheduleSha256, limitsSha256,
  COUNTERS, validateReceipt, createReceiptCollector };
