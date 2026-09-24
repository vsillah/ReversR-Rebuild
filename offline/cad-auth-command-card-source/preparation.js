// Offline data contract only. No runtime adapter or command execution capability.
const { isDeepStrictEqual, types } = require('node:util');
const { REQUIRED_LIVE_BINDINGS } = require('../cad-auth-live-collector-binding/guardedCollector');

const MERGE_COMMIT = '8c69d2c845dd2dd5d733280ef983b6c4a9248213';
const RECEIPT_FIELDS = Object.freeze({
  concreteProviderRuntimeBinding: ['adapterSourceSha256', 'installedRuntimeReceiptRef', 'providerBindingReceiptRef'],
  executableCollectorCommand: ['reviewedCollectorSourceSha256', 'disabledCardDigest', 'commandReviewReceiptRef'],
  restrictedSyntheticCohortReceipt: ['restrictedCohortReceiptRef', 'syntheticOwnershipReceiptRef'],
  custodyReviewerReceipt: ['custodianReceiptRef', 'independentReviewerReceiptRef', 'restrictedStoreReceiptRef'],
  durableConsumedRunLedger: ['ledgerReceiptRef', 'atomicConsumeReceiptRef', 'stopAndUnknownConsumeReceiptRef'],
  installedRouteBodyObserver: ['installedObserverReceiptRef', 'earliestBoundaryReceiptRef', 'platformBufferingReceiptRef'],
  lateGrantObserver: ['installedObserverReceiptRef', 'lateGrantDenialReceiptRef'],
  immutableTargetRecheckReceipt: ['candidateCommit', 'immutableDeploymentRef', 'sourceDigestReceiptRef', 'recheckedAtUtc'],
});

// Reject proxies before reflection; descriptors prevent invoking getters or toJSON.
function plainData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || types.isProxy(value) || depth > 24 || seen.has(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor || !descriptor.enumerable
      || !Object.hasOwn(descriptor, 'value') || !plainData(descriptor.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}

function disabledPreparation() {
  return {
    executable: false, executableCommandCardIssued: false, liveCollectorCommandLine: null,
    liveCollectionAuthorized: false, runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false, uploadSessionIssuanceEnabled: false,
    retryOrSecondRunAuthorized: false, evidenceAccepted: false, commercialReadinessClaimed: false,
    authorizedRuns: 0,
    futureHumanGate: { required: true, approvalReceiptRef: null, exactPhrase: null,
      previousWindowReusable: false, automaticallyPromotable: false },
    runtimeBindingReceipts: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(name => [name, {
      status: 'MISSING_PREREQUISITE', reviewed: false, accepted: false,
      receiptRef: null, receiptSha256: null, boundMergeCommit: MERGE_COMMIT,
      evidence: Object.fromEntries(RECEIPT_FIELDS[name].map(field => [field, null])),
    }])),
  };
}

function checkDisabledPreparation(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, disabledPreparation()); } catch { /* sanitized */ }
  return { ok, executable: false, liveCollectionAuthorized: false,
    liveCollectorCommandLine: null, code: ok ? 'DISABLED_PREPARATION_ONLY' : 'INVALID_DISABLED_PREPARATION' };
}
module.exports = { MERGE_COMMIT, RECEIPT_FIELDS, plainData, disabledPreparation, checkDisabledPreparation };
