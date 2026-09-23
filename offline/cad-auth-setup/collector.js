// Pure in-memory rehearsal. Accepts data, never a provider/request/executor callback.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const plan = JSON.parse(JSON.stringify(require('../../docs/cad-auth-live-evidence-plan.json')));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const ZERO = Object.freeze(['applicationBodyBytesRead', 'bodyGetterAttempts', 'readAttempts',
  'parserInvocations', 'lateGrants', 'providerWrites', 'setupChanges', 'uploadSessionIssuances',
  'conversionDispatches', 'sandboxDispatches', 'privateCadFiles', 'realUsers', 'externalMessages', 'purchases']);
const schedule = Object.freeze(plan.cases.flatMap(c => c.paths.flatMap(path =>
  (c.requiresSeparateLifecycleSetup ? ['before', 'after'] : ['single']).map(phase =>
    Object.freeze({ caseId: c.id, path, phase, observationType: c.observationType })))));
// Includes the paired lifecycle phases once per resolve/refresh path (148 operations).
function getSchedule() { return clone(schedule); }
function fixtureFor(slot) {
  if (!schedule.some(row => isDeepStrictEqual(row, slot))) throw Error('INVALID_SCHEDULE_SLOT');
  return { ...slot, mode: 'SYNTHETIC_REHEARSAL', syntheticAlias: 'U1/L1',
    elapsedMs: 1, readerInvocations: 0, providerHttpRequests: 0,
    expectedCode: 'SIMULATED_EXPECTATION_MET', observedCode: 'SIMULATED_EXPECTATION_MET',
    ...Object.fromEntries(ZERO.map(key => [key, 0])) };
}
function validateReceipt(receipt, slot) {
  try {
    const shape = fixtureFor(slot);
    if (!receipt || !isDeepStrictEqual(Reflect.ownKeys(receipt).sort(), Object.keys(shape).sort())) return false;
    const descriptors = Object.getOwnPropertyDescriptors(receipt);
    if (Object.values(descriptors).some(d => !Object.hasOwn(d, 'value'))) return false;
    const numeric = ['elapsedMs', 'readerInvocations', 'providerHttpRequests'];
    for (const key of numeric) {
      if (!Number.isSafeInteger(receipt[key]) || receipt[key] < 0) return false;
      shape[key] = receipt[key];
    }
    if (receipt.elapsedMs >= plan.limits.maxOperationBudgetMs || receipt.readerInvocations > 2
      || receipt.providerHttpRequests !== 0) return false;
    if (!['U1/L1', 'U1/L2', 'U2/L3'].includes(receipt.syntheticAlias)) return false;
    shape.syntheticAlias = receipt.syntheticAlias;
    return isDeepStrictEqual(receipt, shape);
  } catch { return false; }
}
function createCollector() {
  let used = false;
  return Object.freeze({
    sourceOnly: true, liveCollectionAuthorized: false,
    collect(receipts) {
      if (used) return { ok: false, code: 'RETRY_FORBIDDEN', liveEvidence: false };
      used = true; // Invalid or interrupted input consumes this rehearsal instance too.
      const accepted = [];
      let readers = 0;
      try {
        if (!Array.isArray(receipts) || receipts.length !== schedule.length
          || receipts.length > plan.limits.maxLogicalOperations) throw Error();
        for (let i = 0; i < schedule.length; i++) {
          const entry = Object.getOwnPropertyDescriptor(receipts, String(i));
          if (!entry || !Object.hasOwn(entry, 'value')) throw Error();
          const receipt = entry.value;
          if (!validateReceipt(receipt, schedule[i])) throw Error();
          const snapshot = Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(receipt))
            .map(([key, descriptor]) => [key, descriptor.value]));
          readers += snapshot.readerInvocations;
          if (readers > plan.limits.maxReaderInvocations) throw Error();
          // Hash only the closed allowlist AFTER validation; never retain caller objects.
          accepted.push({ ...snapshot, sanitizedEvidenceSha256: digest(snapshot) });
        }
        return { ok: true, code: 'SOURCE_REHEARSAL_COMPLETE', liveEvidence: false,
          productionVerifierAccepted: false, receiptPublicationAllowed: false,
          scheduleSha256: digest(schedule), receipts: accepted };
      } catch {
        // No exception payload or unvalidated receipt is returned.
        return { ok: false, code: 'STOP_INVALID_OR_PARTIAL_EVIDENCE', liveEvidence: false,
          acceptedCount: accepted.length, retryAllowed: false };
      }
    },
  });
}
module.exports = { ZERO, getSchedule, fixtureFor, validateReceipt, createCollector, digest };
