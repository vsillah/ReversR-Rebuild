// Fixed synthetic memory-only reservation scenario, with no input or driver.
const { createHash } = require('node:crypto');
const { emptyState } = require('../../offline/cad-convex/sharedUploadControls');
const { createDouble } = require('./cad-shared-controls-adapter-double');
const { BINDINGS, WITNESSES } = require('../../offline/cad-convex/durableEvidenceBinding');
const hash = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
function fixture() {
  const binding = { userId: 'synthetic-user', shopId: 'synthetic-shop',
    sessionId: 'synthetic-session', loginSessionId: 'synthetic-login' };
  const authority = { ...binding, revision: 1, active: true, allowed: true, expiresAt: 10000 };
  const policy = { schemaVersion: 1, windowId: 'synthetic-window', windowStart: 100,
    windowEnd: 9000, userConcurrency: 2, shopConcurrency: 2, userAttempts: 2,
    shopAttempts: 2, leaseMs: 1000, maxReservationMicros: 100, budgetMicros: 100, currency: 'USD' };
  const command = { type: 'reserve', binding, key: 'synthetic-attempt', reservationMicros: 100 };
  const model = createDouble(emptyState(policy), authority);
  const beforeState = model.snapshot();
  const pending = model.prepare(command, 101);
  const competing = model.prepare({ ...command, key: 'synthetic-second' }, 101);
  const committed = model.commit(pending);
  const afterState = model.snapshot();
  const conflict = model.commit(competing);
  const afterConflict = model.snapshot();
  const denied = model.run({ ...command, key: 'synthetic-second' }, 102);
  const bindings = Object.fromEntries(BINDINGS.map(k => [k, hash('synthetic-' + k)]));
  const witnessBytes = { command: JSON.stringify(command),
    authorityReadSet: JSON.stringify({ authority, missingRows: ['synthetic-revocation'] }),
    beforeState: JSON.stringify(beforeState), afterState: JSON.stringify(afterState) };
  const receipt = { schemaVersion: 1, mode: 'synthetic-memory-receipt', liveQualified: false,
    bindings, witnesses: Object.fromEntries(WITNESSES.map(k => [k, hash(witnessBytes[k])])),
    outcome: 'COMMITTED', beforeRevision: beforeState.revision, afterRevision: afterState.revision };
  const receiptBytes = JSON.stringify(receipt);
  return { receiptBytes, expectedBytes: JSON.stringify({ bindings, witnessBytes, receiptSha256: hash(receiptBytes) }),
    committed, conflict, denied, beforeState, afterState, afterConflict, afterDenied: model.snapshot() };
}
module.exports = { fixture };
