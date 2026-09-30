const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { METHODS, reviewBindingInput, createDurableAdapterCandidate } = require('../offline/cad-auth-durable-adapter-rejection-prep/candidate');
const schema = require('../offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json');
const { expectedPacket, checkPacket } = require('./cad-auth-durable-adapter-rejection-prep-checker');
// Synthetic unit data only; never exported into manifests or installation source.
function fixture(rule = schema) {
  if (Object.hasOwn(rule, 'const')) return rule.const;
  if (rule.type === 'object') return Object.fromEntries(Object.entries(rule.properties).map(([key, child]) => [key, fixture(child)]));
  return rule.maxLength === 64 ? 'a'.repeat(64) : 'synthetic-unit-only';
}
function review(input) { return reviewBindingInput(JSON.stringify(input)); }
function remainsClosed(result) {
  for (const [key, value] of Object.entries(result)) {
    if (key.endsWith('Authorized') || ['enabled', 'runtimeActivated', 'commandCardIssued'].includes(key)) assert.equal(value, false, key);
  }
  assert.equal(result.effectsExecuted, 0);
}
test('missing binding stays unresolved; malformed and unsafe values are rejected without echo', () => {
  assert.equal(reviewBindingInput().code, 'STOPPED_SOURCE_INPUTS_UNRESOLVED');
  for (const input of [null, [], {}, true, 'private-input-marker', { enabled: true }]) {
    const result = review(input);
    assert.equal(result.code, 'BINDING_INPUT_REJECTED');
    assert.ok(!JSON.stringify(result).includes('private-input-marker'));
    remainsClosed(result);
  }
  assert.equal(reviewBindingInput('{').code, 'BINDING_INPUT_REJECTED');
  assert.equal(reviewBindingInput('x'.repeat(16385)).code, 'BINDING_INPUT_REJECTED');
});
test('every required field, extra field, stale deployment and provenance mismatch reject', () => {
  for (const key of schema.required) {
    const input = fixture(); delete input[key];
    assert.equal(review(input).code, 'BINDING_INPUT_REJECTED', key);
  }
  for (const key of schema.properties.provenance.required) {
    const input = fixture(); delete input.provenance[key];
    assert.equal(review(input).code, 'BINDING_INPUT_REJECTED', key);
  }
  for (const mutate of [x => { x.enabled = true; }, x => { x.provenance.secret = 'never-echo'; },
    x => { x.productionDeploymentReference = 'dpl_stale'; },
    x => { x.provenance.productionDeploymentReference = 'dpl_stale'; },
    x => { x.sessionId = 'PENDING_SESSION_ID'; }, x => { x.durableEvidenceSha256 = 'bad'; },
    x => { x.provenance.sourceCommit = 'b'.repeat(40); }]) {
    const input = fixture(); mutate(input);
    assert.equal(review(input).code, 'BINDING_INPUT_REJECTED');
  }
  for (const key of ['sessionId', 'durableEvidenceSha256']) {
    const input = fixture(); input.provenance[key] = key === 'sessionId' ? 'other-session' : 'b'.repeat(64);
    assert.equal(review(input).code, 'BINDING_INPUT_REJECTED');
  }
});
test('structural validity grants no authenticity or installation authority', () => {
  const result = review(fixture());
  assert.equal(result.code, 'BINDING_SHAPE_VALID_REQUIRES_SEPARATE_AUTHENTICITY_AND_CURRENT_TARGET_REVIEW');
  remainsClosed(result);
});
test('all candidate operations reject even with hostile enable options and arguments', async () => {
  const hostile = new Proxy({}, { get() { throw Error('arguments must not be inspected'); } });
  const adapter = createDurableAdapterCandidate(hostile);
  assert.ok(Object.isFrozen(adapter));
  assert.deepEqual(Object.keys(adapter), METHODS);
  for (const name of METHODS) await assert.rejects(adapter[name](hostile), /^Error: SOURCE_ONLY_DURABLE_ADAPTER_RUNTIME_INSTALLATION_REJECTED$/);
  const runtime = fs.readFileSync(path.join(__dirname, '../server/cadLiveOpeningExecutableRuntimeWiring.js'), 'utf8');
  const cleanup = runtime.match(/const CLEANUP_EFFECTS = Object.freeze\(\[([\s\S]*?)\]\)/)[1];
  const methods = runtime.match(/const METHODS = Object.freeze\(\[([\s\S]*?)\]\)/)[1].replace('...CLEANUP_EFFECTS', cleanup);
  assert.deepEqual([...methods.matchAll(/'([^']+)'/g)].map(match => match[1]), METHODS);
});
test('manifest detects source drift and authority widening', () => {
  const packet = expectedPacket();
  assert.equal(checkPacket(packet).ok, true);
  for (const key of ['enabled', 'runtimeInstallationAuthorized', 'runtimeMounted', 'durableAdapterQualified']) {
    assert.equal(checkPacket({ ...packet, [key]: true }).ok, false);
  }
  assert.equal(checkPacket({ ...packet, suppliedBinding: fixture() }).ok, false);
  assert.equal(checkPacket(packet, () => Buffer.from('drift')).ok, false);
  assert.equal(checkPacket(null).ok, false);
});
