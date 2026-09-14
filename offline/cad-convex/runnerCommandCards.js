// Pure offline inspection. Never resolves references, invokes adapters or grants authority.
const { createHash } = require('node:crypto');
const template = require('./runnerCommandCards.json');
const { isDeepStrictEqual: same } = require('node:util');
const MAX_BYTES = 65536;
const digest = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const shape = (value, expected) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && same(Object.keys(value).sort(), Object.keys(expected).sort());
function generateCommandCards() { return clone(template); }
function inspectCommandCards(bytes) {
  const errors = new Set(); let missingCount = 0, packet;
  const result = () => ({ structureValid: errors.size === 0,
    fieldsComplete: errors.size === 0 && missingCount === 0,
    decision: 'LIVE_RUN_BLOCKED', executable: false, liveRunAuthorized: false,
    uploadsEnabled: false, liveQualified: false, publicationAuthorized: false,
    packetSha256: errors.size === 0 ? digest(bytes) : null,
    missingCount, errors: [...errors], blockers: ['RESTRICTED_COMMAND_BYTES_AND_RECEIPTS_REQUIRE_INDEPENDENT_REVIEW',
      'DURABLE_ADAPTER_AND_LIVE_RUNNER_UNQUALIFIED', 'SEPARATE_EXPLICIT_LIVE_APPROVAL_REQUIRED'] });
  try {
    if (typeof bytes !== 'string' || Buffer.byteLength(bytes, 'utf8') > MAX_BYTES) throw Error();
    packet = JSON.parse(bytes);
  } catch { errors.add('INPUT_INVALID'); return result(); }
  if (!shape(packet, template)) { errors.add('PACKET_SHAPE_INVALID'); return result(); }
  for (const key of Object.keys(template).filter(k => !['fields', 'cards'].includes(k)))
    if (!same(packet[key], template[key])) errors.add('IMMUTABLE_CONTRACT_CHANGED');
  function fields(value, expected) {
    if (!shape(value, expected)) { errors.add('FIELDS_SHAPE_INVALID'); return; }
    for (const [key, v] of Object.entries(value)) {
      if (v === null) { missingCount++; continue; }
      const valid = key === 'timeoutMs' ? Number.isSafeInteger(v) && v > 0 && v <= 1800000 :
        typeof v === 'string' && (key.endsWith('Ref') ? /^rrb-ref:[a-z0-9-]{1,80}$/.test(v) :
          key.endsWith('Commit') ? /^[a-f0-9]{40}$/.test(v) : /^[a-f0-9]{64}$/.test(v));
      if (!valid) errors.add('FIELD_VALUE_INVALID');
    }
  }
  fields(packet.fields, template.fields);
  if (!Array.isArray(packet.cards) || packet.cards.length !== 5) {
    errors.add('CARD_INVENTORY_INVALID'); return result();
  }
  const totals = template.operationMatrix.map(() => [0, 0]);
  packet.cards.forEach((card, i) => {
    const expected = template.cards[i];
    if (!shape(card, expected)) { errors.add('CARD_SHAPE_INVALID'); return; }
    for (const key of ['id', 'effect', 'executable', 'stopCounterpart'])
      if (!same(card[key], expected[key])) errors.add('CARD_POLICY_CHANGED');
    fields(card.fields, expected.fields);
    if (!Array.isArray(card.allocation) || card.allocation.length !== expected.allocation.length) {
      errors.add('ALLOCATION_SHAPE_INVALID'); return;
    }
    card.allocation.forEach((row, n) => {
      if (!shape(row, expected.allocation[n]) || row.operation !== expected.allocation[n].operation) {
        errors.add('ALLOCATION_ROW_INVALID'); return;
      }
      const cap = template.operationMatrix[n];
      if (!Number.isSafeInteger(row.logicalCommands) || row.logicalCommands < 0 || row.logicalCommands > cap.maxLogicalCommands ||
          !Number.isSafeInteger(row.transactionAttempts) || row.transactionAttempts < 0 || row.transactionAttempts > cap.maxTransactionAttempts ||
          (cap.maxTransactionAttempts > 0 && (row.transactionAttempts < row.logicalCommands || row.transactionAttempts > row.logicalCommands * 3))) {
        errors.add('ALLOCATION_LIMIT_INVALID'); return;
      }
      if (card.id === 'C3' && !['read-exact-selector', 'read-authority-dependencies',
        'mark-unknown', 'claim-cas', 'settle-from-independent-synthetic-receipt', 'scan-bounded-page'].includes(row.operation) &&
        (row.logicalCommands !== 0 || row.transactionAttempts !== 0)) errors.add('RECONCILIATION_EFFECT_FORBIDDEN');
      totals[n][0] += row.logicalCommands; totals[n][1] += row.transactionAttempts;
    });
  });
  totals.forEach(([logical, attempts], i) => {
    const cap = template.operationMatrix[i];
    if (logical > cap.maxLogicalCommands || attempts > cap.maxTransactionAttempts) errors.add('SHARED_ROW_LIMIT_EXCEEDED');
    if (logical !== cap.maxLogicalCommands || attempts !== cap.maxTransactionAttempts) missingCount++;
  });
  return result();
}
// Decision table only: caller-supplied synthetic observations, no clock or I/O.
function inspectOutcome(value) {
  const expected = { outcome: '', attempt: 0, remainingMs: 0, windowOpen: false, bindingMatches: false, budgetAvailable: false };
  const stopped = { action: 'STOP_ALL_REMOTE_PRESERVE_CUSTODY', retainHolds: true, retainLeases: true, redispatch: false, liveRunAuthorized: false };
  if (!shape(value, expected) || !['COMMITTED', 'ABORTED', 'CONFLICT', 'UNKNOWN'].includes(value.outcome) ||
      !Number.isSafeInteger(value.attempt) || value.attempt < 1 || value.attempt > 3 ||
      !Number.isSafeInteger(value.remainingMs) || value.remainingMs < 0 || value.remainingMs > 5000 ||
      !['windowOpen', 'bindingMatches', 'budgetAvailable'].every(k => typeof value[k] === 'boolean') ||
      !value.windowOpen || !value.bindingMatches || !value.budgetAvailable || value.remainingMs === 0) return stopped;
  if (value.outcome === 'UNKNOWN') return { ...stopped, action: 'STOP_NEW_WORK_REVIEW_BOUNDED_ORIGINAL_SELECTOR_LOOKUP' };
  const backoff = [100, 250][value.attempt - 1];
  if (value.outcome === 'CONFLICT' && backoff !== undefined && value.remainingMs > backoff)
    return { ...stopped, action: 'REVIEW_CONFLICT_RETRY_WITH_FRESH_READS', backoffMs: backoff };
  if (['COMMITTED', 'ABORTED'].includes(value.outcome)) return { ...stopped, action: 'REQUIRE_INDEPENDENT_TERMINAL_RECEIPT' };
  return stopped;
}
module.exports = { MAX_BYTES, generateCommandCards, inspectCommandCards, inspectOutcome };
