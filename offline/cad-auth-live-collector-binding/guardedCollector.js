// Source-only fail-closed binding guard. No provider calls, env reads, request reads or I/O.
const APPROVAL = Object.freeze({
  acceptancePacket: 'cad-auth-live-evidence-acceptance-v1',
  reviewedPacketSha256: '826ed6507787f3173643d281ad868e50175327fc067b56cb11c2c8cdf89052ba',
  sealedCardSha256: '977e11fb8403f04667280d75409dcdbefe71103f8f04245d675b8a272e245c04',
  candidateCommit: '0d5ae30935f399c7f3e08b7fd05b8f12dc10489d',
  immutableDeployment: 'dpl_S2p5mUfjMnCHy9etD23Un4gNT4iy',
  scheduleSha256: '30e28bf2b79861cd2dd686a3cb0c1f9523f21dc6346b87ef6387b0abbf051066',
  limitsSha256: 'ee1e5288f47391fa58df7d737d5ae7fe0ec0bfa681efa0c79c5bc2aed2d699b4',
  startsAtUtc: '2026-09-24T13:00:00Z',
  expiresAtUtc: '2026-09-24T13:30:00Z',
  mergeCommit: 'c8b274968c7c711253d0ae73a2f15b7c8ab6049e',
});

const REQUIRED_LIVE_BINDINGS = Object.freeze([
  'concreteProviderRuntimeBinding',
  'executableCollectorCommand',
  'restrictedSyntheticCohortReceipt',
  'custodyReviewerReceipt',
  'durableConsumedRunLedger',
  'installedRouteBodyObserver',
  'lateGrantObserver',
  'immutableTargetRecheckReceipt',
]);

const ZERO_ACTIONS = Object.freeze({
  liveEvidenceCollected: false,
  uploadSessionsIssued: 0,
  requestBodyReads: 0,
  providerEnvResourceBillingChanges: 0,
  secretReads: 0,
  activationPerformed: false,
  retryOrSecondRunPerformed: false,
  privateCadUsed: false,
  externalMessagesSent: false,
  commercialReadinessClaimed: false,
});

function isPlainData(value, depth = 0) {
  if (depth > 8) return false;
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Reflect.ownKeys(value).every(key => {
    const desc = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && desc && desc.enumerable && Object.hasOwn(desc, 'value')
      && isPlainData(desc.value, depth + 1);
  });
}

function ms(utc) {
  if (typeof utc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(utc)) return NaN;
  return Date.parse(utc);
}

function evaluateReadOnlyCollectionGate(input = {}) {
  if (!input || typeof input !== 'object') {
    return { ok: false, stopCode: 'INVALID_PRECHECK_INPUT', ...ZERO_ACTIONS };
  }
  if (!isPlainData(input)) return { ok: false, stopCode: 'INVALID_PRECHECK_INPUT', ...ZERO_ACTIONS };
  const nowMs = ms(input.nowUtc);
  const startMs = ms(APPROVAL.startsAtUtc);
  const expiryMs = ms(APPROVAL.expiresAtUtc);
  const missingBindings = REQUIRED_LIVE_BINDINGS.filter(name => input[name] !== true);
  const base = {
    approvedWindow: { startsAtUtc: APPROVAL.startsAtUtc, expiresAtUtc: APPROVAL.expiresAtUtc },
    mergeCommit: APPROVAL.mergeCommit,
    sealedCardSha256: APPROVAL.sealedCardSha256,
    missingBindings,
    ...ZERO_ACTIONS,
  };
  if (!Number.isFinite(nowMs) || nowMs < startMs || nowMs >= expiryMs) {
    return { ok: false, stopCode: 'WINDOW_EXPIRED_OR_NOT_STARTED', ...base };
  }
  if (input.mainCommit !== APPROVAL.mergeCommit || input.originMainCommit !== APPROVAL.mergeCommit
    || input.sealedCardSha256 !== APPROVAL.sealedCardSha256
    || input.reviewedPacketSha256 !== APPROVAL.reviewedPacketSha256
    || input.scheduleSha256 !== APPROVAL.scheduleSha256
    || input.limitsSha256 !== APPROVAL.limitsSha256) {
    return { ok: false, stopCode: 'SOURCE_OR_TARGET_DRIFT', ...base };
  }
  if (input.sourcePreparationValid !== true || input.packetExecutable !== false
    || input.packetLiveCollectionAuthorized !== false || input.packetBodyAdmissionAuthorized !== false
    || input.packetRuntimeActivationAuthorized !== false) {
    return { ok: false, stopCode: 'SOURCE_OR_TARGET_DRIFT', ...base };
  }
  if (missingBindings.length > 0) return { ok: false, stopCode: 'MISSING_PREREQUISITE', ...base };
  return {
    ok: false,
    stopCode: 'LIVE_COLLECTOR_STILL_NOT_AUTHORIZED',
    missingBindings: [],
    reason: 'All reviewed bindings must feed a separately sealed executable command card before collection.',
    ...ZERO_ACTIONS,
  };
}

module.exports = { APPROVAL, REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS, evaluateReadOnlyCollectionGate };
