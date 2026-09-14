// Pure synthetic receipt projection inspector. Hash equality is not authenticity.
const { createHash } = require('node:crypto');
const { blocked } = require('./durableAdapter');
const MAX_BYTES = 65536;
const BINDINGS = Object.freeze(['resourceBindingDigest', 'namespaceDigest', 'runDigest',
  'ledgerDigest', 'windowDigest', 'fenceDigest', 'selectorDigest', 'engineContractDigest',
  'schemaDigest', 'indexDigest', 'adapterSourceDigest', 'runnerSourceDigest',
  'adapterContractDigest', 'outputContractDigest', 'operationMatrixDigest']);
const WITNESSES = Object.freeze(['command', 'authorityReadSet', 'beforeState', 'afterState']);
const KEYS = ['schemaVersion', 'mode', 'liveQualified', 'bindings', 'witnesses',
  'outcome', 'beforeRevision', 'afterRevision'];
const hash = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
const sized = value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= MAX_BYTES;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function exact(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function projection(value) {
  return exact(value, KEYS) && value.schemaVersion === 1
    && value.mode === 'synthetic-memory-receipt' && value.liveQualified === false
    && exact(value.bindings, BINDINGS) && BINDINGS.every(k => digest(value.bindings[k]))
    && exact(value.witnesses, WITNESSES) && WITNESSES.every(k => digest(value.witnesses[k]))
    && ['COMMITTED', 'ABORTED'].includes(value.outcome)
    && Number.isSafeInteger(value.beforeRevision) && value.beforeRevision >= 0
    && Number.isSafeInteger(value.afterRevision) && value.afterRevision >= 0
    && (value.outcome === 'COMMITTED' ? value.afterRevision === value.beforeRevision + 1
      : value.afterRevision === value.beforeRevision);
}
// Expected bytes are supplied independently by the offline caller, not extracted
// from the candidate receipt. They are synthetic witnesses, never trusted receipts.
function inspectSyntheticEvidence(receiptBytes, expectedBytes) {
  const result = (code, matches = false) => Object.freeze({ ...blocked(),
    mode: 'offline-synthetic-evidence-binding', syntheticBindingsMatch: matches,
    independentEvidenceVerified: false, code });
  try {
    if (!sized(receiptBytes) || !sized(expectedBytes)) return result('INPUT_INVALID');
    const receipt = JSON.parse(receiptBytes), expected = JSON.parse(expectedBytes);
    if (!projection(receipt) || !exact(expected, ['bindings', 'witnessBytes', 'receiptSha256'])
      || !exact(expected.bindings, BINDINGS) || !BINDINGS.every(k => digest(expected.bindings[k]))
      || !exact(expected.witnessBytes, WITNESSES) || !WITNESSES.every(k => sized(expected.witnessBytes[k]))
      || !digest(expected.receiptSha256)) return result('INPUT_INVALID');
    if (hash(receiptBytes) !== expected.receiptSha256) return result('RECEIPT_BYTES_UNBOUND');
    if (BINDINGS.some(k => receipt.bindings[k] !== expected.bindings[k])) return result('CONTEXT_UNBOUND');
    if (WITNESSES.some(k => receipt.witnesses[k] !== hash(expected.witnessBytes[k]))) return result('WITNESS_UNBOUND');
    // For a synthetic abort the entire observed state must be byte-identical.
    if (receipt.outcome === 'ABORTED' && expected.witnessBytes.beforeState !== expected.witnessBytes.afterState)
      return result('ABORT_CHANGED_STATE');
    return result('SYNTHETIC_BINDINGS_MATCH', true);
  } catch {
    return result('INPUT_INVALID');
  }
}
module.exports = { BINDINGS, WITNESSES, MAX_BYTES, inspectSyntheticEvidence };
