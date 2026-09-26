// Source-only durable transaction proposal model. No store, runtime or effects.
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../cad-auth-prod-opening-prep/preparation');
const { CLOSED_FLAGS, prepareDurableCommandCardDraft } = require('./preparation');

const OPERATIONS = Object.freeze(['CLAIM_RUN', 'CLAIM_SESSION', 'CLAIM_ATTEMPT', 'ROLLBACK', 'CRASH_CLOSE']);
const REQUEST_KEYS = Object.freeze([
  'operation',
  'expectedRevision',
  'nowMs',
  'clockTrusted',
  'ownerAlive',
  'ownerLeaseExpiresMs',
  'outcomeKnown',
]);
const flags = (values = {}) => Object.freeze({ ...CLOSED_FLAGS, ...values });
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const integer = value => Number.isSafeInteger(value) && value >= 0;

function initialDurableRecord(binding) {
  const prepared = prepareDurableCommandCardDraft(binding);
  if (!prepared.draft) return null;
  return {
    bindingSha256: prepared.bindingSha256,
    runLedgerKey: prepared.draft.binding.runLedgerKey,
    attemptLedgerKey: prepared.draft.binding.attemptLedgerKey,
    revision: 0,
    runClaimed: false,
    sessionClaimed: false,
    attemptClaimed: false,
    closed: false,
    revoked: false,
    lastNowMs: 0,
  };
}

function validRecord(record, binding) {
  const initial = initialDurableRecord(binding);
  return initial !== null
    && plainContractData(record)
    && exact(record, Object.keys(initial))
    && ['bindingSha256', 'runLedgerKey', 'attemptLedgerKey'].every(key => record[key] === initial[key])
    && integer(record.revision)
    && record.revision < Number.MAX_SAFE_INTEGER
    && integer(record.lastNowMs)
    && ['runClaimed', 'sessionClaimed', 'attemptClaimed', 'closed', 'revoked'].every(key => typeof record[key] === 'boolean')
    && (!record.sessionClaimed || record.runClaimed)
    && (!record.attemptClaimed || record.sessionClaimed)
    && record.closed === record.revoked;
}

function deny() {
  return flags({ code: 'BLOCKED_NO_RETRY', proposedRecord: null, mustClose: true, admissionAllowed: false });
}

function eligible(binding, record, request) {
  const start = Date.parse(binding.startUtc);
  const expires = Date.parse(binding.expiresUtc);
  return request.clockTrusted === true
    && request.ownerAlive === true
    && request.outcomeKnown === true
    && integer(request.nowMs)
    && integer(request.ownerLeaseExpiresMs)
    && request.nowMs >= record.lastNowMs
    && request.nowMs >= start
    && request.nowMs < expires
    && request.nowMs < request.ownerLeaseExpiresMs
    && request.ownerLeaseExpiresMs <= expires;
}

function proposeDurableTransition(binding, record, request) {
  try {
    const initial = initialDurableRecord(binding);
    if (!initial || !plainContractData(request) || !exact(request, REQUEST_KEYS)
      || !OPERATIONS.includes(request.operation)) return deny();
    if (record !== null && !validRecord(record, binding)) return deny();
    const current = record === null ? initial : structuredClone(record);
    if (!integer(request.expectedRevision) || request.expectedRevision !== current.revision) return deny();
    const next = structuredClone(current);
    if (integer(request.nowMs) && request.nowMs >= current.lastNowMs) next.lastNowMs = request.nowMs;
    const rollback = ['ROLLBACK', 'CRASH_CLOSE'].includes(request.operation);
    if (rollback && current.closed) {
      return flags({ code: 'ROLLBACK_ALREADY_PREPARED', proposedRecord: current, mustClose: true, admissionAllowed: false });
    }
    let accepted = false;
    if (!rollback && !current.closed && eligible(binding, current, request)) {
      if (request.operation === 'CLAIM_RUN' && !current.runClaimed) {
        next.runClaimed = accepted = true;
      } else if (request.operation === 'CLAIM_SESSION' && current.runClaimed && !current.sessionClaimed) {
        next.sessionClaimed = accepted = true;
      } else if (request.operation === 'CLAIM_ATTEMPT' && current.sessionClaimed && !current.attemptClaimed) {
        next.attemptClaimed = accepted = true;
      }
    }
    if (!accepted) {
      next.closed = true;
      next.revoked = true;
    }
    next.revision++;
    return flags({
      code: accepted ? 'TRANSACTION_PREPARED' : rollback ? 'ROLLBACK_PREPARED' : 'BLOCKED_NO_RETRY',
      proposedRecord: next,
      mustClose: !accepted,
      admissionAllowed: false,
    });
  } catch {
    return deny();
  }
}

function checkIndependentFence(binding, record, observation) {
  try {
    const initial = initialDurableRecord(binding);
    const eligibleForSimulation = initial !== null
      && validRecord(record, binding)
      && plainContractData(observation)
      && exact(observation, ['nowMs', 'clockTrusted', 'ownerAlive', 'ownerLeaseExpiresMs'])
      && eligible(binding, record, { ...observation, outcomeKnown: true, operation: 'CLAIM_ATTEMPT', expectedRevision: record.revision })
      && record.runClaimed
      && record.sessionClaimed
      && !record.closed;
    return flags({ code: 'FENCE_CHECK_SOURCE_ONLY', admissionAllowed: false,
      simulatedEligible: !!eligibleForSimulation, mustClose: !eligibleForSimulation });
  } catch {
    return flags({ code: 'FENCE_CHECK_SOURCE_ONLY', admissionAllowed: false, simulatedEligible: false, mustClose: true });
  }
}

module.exports = {
  OPERATIONS,
  initialDurableRecord,
  proposeDurableTransition,
  checkIndependentFence,
};
