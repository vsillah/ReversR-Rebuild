// Pure offline contract model; fixture receipts are assertions, never live evidence.
const { inspectRetentionFixture } = require('./boundedRetentionPolicy');
const ref = v => typeof v === 'string' && /^fixture:[a-z0-9-]{1,64}$/.test(v);
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).sort().join('|') === keys.slice().sort().join('|');
const steps = ['denyAdmission', 'captureSelectors', 'drainAdmissions', 'revokeAllSessions',
  'reconcileDescendants', 'probeDenials', 'inventoryRetained'];
function inspectRetainedTerminalFixture(packet, now) {
  const result = (code, accepted = false, retainedRecords) => ({ code, packetValid: accepted,
    state: accepted ? 'FIXTURE_RETAINED_PENDING_DISPOSITION' : 'FIXTURE_BLOCKED_RECONCILIATION_REQUIRED',
    ...(accepted ? { retainedRecords } : {}), liveReady: false, retentionOverride: false,
    cleanupVerified: false, deleted: false });
  if (!exact(packet, ['retention', 'receipts'])) return result('PACKET_SHAPE_REQUIRED');
  const inventory = inspectRetentionFixture(packet.retention, now);
  if (!inventory.packetValid) return result(inventory.code);
  const m = packet.retention, receipts = packet.receipts;
  if (!Array.isArray(receipts) || receipts.length !== steps.length) return result('SEQUENCE_REQUIRED');
  let lastTime = Date.parse(m.createdAtUtc); const operations = new Set();
  let selectors;
  for (let i = 0; i < steps.length; i++) {
    const r = receipts[i];
    if (!exact(r, ['step', 'sequence', 'operationRef', 'runRef', 'sourceSha', 'destinationRef',
      'atUtc', 'outcome', 'sessionSelectorRefs', 'evidenceRef'])) return result('RECEIPT_SHAPE_REQUIRED');
    if (r.step !== steps[i] || r.sequence !== i + 1 || r.outcome !== 'fixture-confirmed'
      || !ref(r.operationRef) || operations.has(r.operationRef) || !ref(r.evidenceRef)) return result('SEQUENCE_REQUIRED');
    operations.add(r.operationRef);
    if (['runRef', 'sourceSha', 'destinationRef'].some(k => r[k] !== m[k])) return result('BINDING_MISMATCH');
    const time = Date.parse(r.atUtc);
    if (typeof r.atUtc !== 'string' || !Number.isFinite(time) || new Date(time).toISOString() !== r.atUtc
      || time < lastTime || time > now) return result('RECEIPT_TIME_INVALID');
    lastTime = time;
    // Two cohort slots; preserved selectors are never inferred from terminal zero counts.
    if (!Array.isArray(r.sessionSelectorRefs) || r.sessionSelectorRefs.length !== 2
      || r.sessionSelectorRefs.some(a => !Array.isArray(a) || a.length > 20 || a.some(x => !ref(x))))
      return result('SESSION_SELECTORS_REQUIRED');
    const flat = r.sessionSelectorRefs.flat();
    if (new Set(flat).size !== flat.length) return result('SESSION_SELECTORS_REQUIRED');
    if (i === 0 && flat.length) return result('SESSION_SELECTORS_REQUIRED');
    if (i === 1) selectors = JSON.stringify(r.sessionSelectorRefs);
    if (i > 1 && JSON.stringify(r.sessionSelectorRefs) !== selectors) return result('SELECTOR_DRIFT');
  }
  return result('FIXTURE_RETAINED_NOT_REMOVED', true, inventory.retainedRecords);
}
module.exports = { inspectRetainedTerminalFixture };
