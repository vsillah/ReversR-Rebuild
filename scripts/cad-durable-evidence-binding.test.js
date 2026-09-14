const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { BINDINGS, WITNESSES, MAX_BYTES, inspectSyntheticEvidence: inspect } = require('../offline/cad-convex/durableEvidenceBinding');
const { blocked, createDurableAdapter, METHODS } = require('../offline/cad-convex/durableAdapter');
const { runCard } = require('../offline/cad-convex/liveRunner');
const { fixture } = require('./helpers/cad-durable-evidence-fixture');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function check(receipt, expected, code) {
  const result = inspect(receipt, expected);
  assert.equal(result.code, code);
  for (const [k, v] of Object.entries(blocked())) assert.equal(result[k], v);
  assert.equal(result.independentEvidenceVerified, false);
  assert.equal(result.syntheticBindingsMatch, code === 'SYNTHETIC_BINDINGS_MATCH');
  assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'));
  return result;
}
function altered(change) {
  const f = fixture(), r = JSON.parse(f.receiptBytes), e = JSON.parse(f.expectedBytes);
  change(r, e);
  const bytes = JSON.stringify(r); e.receiptSha256 = hash(bytes);
  return [bytes, JSON.stringify(e)];
}
test('deterministic memory commit binds state and full synthetic cost hold; competing CAS cannot partially write', () => {
  const f = fixture(); assert.deepEqual(f, fixture());
  assert.equal(f.committed.ok, true); assert.equal(f.conflict.code, 'CONFLICT');
  assert.equal(f.denied.code, 'UPLOAD_COST_REJECTED');
  assert.deepEqual(f.afterConflict, f.afterState); assert.deepEqual(f.afterDenied, f.afterState);
  assert.equal(f.afterState.revision, f.beforeState.revision + 1);
  assert.equal(f.afterState.records.length, 1); assert.equal(f.afterState.records[0].reservationMicros, 100);
  check(f.receiptBytes, f.expectedBytes, 'SYNTHETIC_BINDINGS_MATCH');
});
test('every source, engine, scope and matrix binding rejects substitution even with a rehashed receipt', () => {
  for (const k of BINDINGS) check(...altered(r => { r.bindings[k] = hash('other-' + k); }), 'CONTEXT_UNBOUND');
});
test('exact receipt bytes and independently supplied witnesses reject drift', () => {
  const f = fixture(); check(f.receiptBytes + '\n', f.expectedBytes, 'RECEIPT_BYTES_UNBOUND');
  for (const k of WITNESSES) {
    check(...altered(r => { r.witnesses[k] = hash('other-' + k); }), 'WITNESS_UNBOUND');
    check(...altered((r, e) => { e.witnessBytes[k] += '\n'; }), 'WITNESS_UNBOUND');
  }
});
test('schema, terminal revision and authority escalation are rejected', () => {
  for (const change of [r => { r.liveQualified = true; }, r => { r.mode = 'live'; },
    r => { r.outcome = 'UNKNOWN'; }, r => { r.afterRevision = r.beforeRevision; },
    r => { r.beforeRevision = -1; }, r => { r.afterRevision = Number.MAX_SAFE_INTEGER + 1; },
    r => { r.extra = 'PRIVATE_SENTINEL'; }, r => { delete r.bindings.runDigest; },
    r => { r.witnesses.extra = hash('extra'); }]) check(...altered(change), 'INPUT_INVALID');
});
test('abort requires unchanged revision and exact unchanged state witnesses', () => {
  check(...altered(r => { r.outcome = 'ABORTED'; r.afterRevision = r.beforeRevision; }), 'ABORT_CHANGED_STATE');
  check(...altered((r, e) => {
    r.outcome = 'ABORTED'; r.afterRevision = r.beforeRevision;
    e.witnessBytes.afterState = e.witnessBytes.beforeState;
    r.witnesses.afterState = hash(e.witnessBytes.afterState);
  }), 'SYNTHETIC_BINDINGS_MATCH');
});
test('missing, malformed, oversized and non-string input never echoes private material', () => {
  const f = fixture();
  for (const bad of [undefined, null, {}, 'null', '{', 'PRIVATE_SENTINEL', 'x'.repeat(MAX_BYTES + 1), 'é'.repeat(MAX_BYTES)]) {
    check(bad, f.expectedBytes, 'INPUT_INVALID'); check(f.receiptBytes, bad, 'INPUT_INVALID');
  }
  for (const k of ['bindings', 'witnessBytes', 'receiptSha256']) {
    const e = JSON.parse(f.expectedBytes); delete e[k]; check(f.receiptBytes, JSON.stringify(e), 'INPUT_INVALID');
  }
});
test('synthetic success never qualifies live requirements or changes public adapter and runner gates', () => {
  const prerequisites = require('../offline/cad-convex/durableEvidencePrerequisites.json');
  const requirements = require('../offline/cad-convex/sharedControlsAdapterQualification.json').requirements;
  assert.equal(prerequisites.liveQualified, false); assert.equal(prerequisites.executable, false);
  assert.deepEqual(prerequisites.requirements.map(r => r.id), requirements.map(r => r.id));
  for (const r of prerequisites.requirements) {
    assert.equal(r.liveQualified, false); assert.equal(r.liveEvidenceRef, null);
    assert.ok(['PENDING', 'SEPARATELY_BLOCKED'].includes(r.disposition));
    assert.ok(r.requiredEvidence.length > 40);
  }
  const f = fixture(); check(f.receiptBytes, f.expectedBytes, 'SYNTHETIC_BINDINGS_MATCH');
  const adapter = createDurableAdapter();
  for (const method of METHODS) assert.deepEqual(adapter[method](f), blocked());
  for (const card of ['C1', 'C2', 'C3', 'C4'])
    for (const [k, v] of Object.entries(blocked())) assert.equal(runCard(card)[k], v);
});
