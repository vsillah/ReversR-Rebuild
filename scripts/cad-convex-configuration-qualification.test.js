const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { inspectConfigurationQualification: inspect } = require('../offline/cad-convex/configurationQualification');
const template = require('../offline/cad-convex/configurationQualification.json');
const copy = () => structuredClone(template);
function complete() {
  const p = copy();
  for (const row of p.checks) row.evidence = { kind: 'synthetic-only', checkId: row.id,
    sourceCommit: p.sourceCommit, deployment: p.wiring.target.deployment,
    observedAtMs: 1000, outcome: 'pass' };
  return p;
}
function closed(r) {
  assert.equal(r.liveAuthReady, false);
  assert.equal(r.configurationAuthorized, false);
  assert.equal(r.uploadsEnabled, false);
}
test('pending packet lists every unresolved check and cannot claim qualification', () => {
  const r = inspect(copy(), 1000); closed(r);
  assert.equal(r.code, 'CONFIGURATION_EVIDENCE_PENDING');
  assert.equal(r.syntheticEvidenceComplete, false);
  assert.deepEqual(r.pending, template.checks.map(c => c.id));
});
test('even complete synthetic evidence gives no live configuration or upload authority', () => {
  const p = complete(); const r = inspect(p, 1000); closed(r);
  assert.equal(r.syntheticEvidenceComplete, true);
  assert.equal(r.code, 'SYNTHETIC_CONFIGURATION_COMPLETE');
  p.checks[0].evidence.outcome = 'fail';
  assert.equal(r.syntheticEvidenceComplete, true); // Detached projection.
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.pending));
});
test('missing or failed prerequisites cannot be hidden by passing key presence', () => {
  for (let i = 0; i < template.checks.length; i++) {
    for (const missing of [false, true]) {
      const p = complete();
      if (missing) p.checks[i].evidence = null;
      else p.checks[i].evidence.outcome = 'fail';
      const r = inspect(p, 1000); closed(r);
      assert.equal(r.syntheticEvidenceComplete, false);
      assert.deepEqual(missing ? r.pending : r.failed, [p.checks[i].id]);
    }
  }
});
test('rejects mixed destination, receipt reuse, scope drift, activation and secret-bearing input', () => {
  const mutations = [
    p => p.sourceCommit = 'f'.repeat(40), p => p.mode = 'live',
    p => p.wiring.target.type = 'production', p => p.wiring.target.deployment = 'other',
    p => p.wiring.target.clientOrigin = p.wiring.target.issuerOrigin,
    p => p.wiring.gates.providers = true, p => p.wiring.gates.uploads = true,
    p => p.checks[0].id = 'SECRET_SENTINEL', p => p.checks.pop(),
    p => p.checks.push(p.checks[0]), p => p.checks[1] = p.checks[0],
    p => p.checks[1].scope = 'client-public',
    p => p.checks[1].value = 'SECRET_SENTINEL',
    p => p.checks[1].evidence.value = 'SECRET_SENTINEL',
    p => p.checks[1].evidence = p.checks[0].evidence,
    p => p.checks[0].evidence.kind = 'live',
    p => p.checks[0].evidence.sourceCommit = 'f'.repeat(40),
    p => p.checks[0].evidence.deployment = 'production',
    p => p.checks[0].evidence.outcome = 'unknown',
    p => p.checks[0].evidence.observedAtMs = 1001,
    p => p.checks[0].evidence.observedAtMs = -1,
    p => p.checks[0].evidence.observedAtMs = NaN,
  ];
  for (const change of mutations) {
    const p = complete(); change(p); const r = inspect(p, 1000); closed(r);
    assert.equal(r.packetValid, false); assert.equal(r.syntheticEvidenceComplete, false);
    assert.doesNotMatch(JSON.stringify(r), /SECRET_SENTINEL/);
  }
});
test('stale receipts expire at five minutes and malformed inputs return sanitized denial', () => {
  assert.equal(inspect(complete(), 300999).syntheticEvidenceComplete, true);
  assert.equal(inspect(complete(), 301000).packetValid, false);
  for (const clock of [undefined, null, -1, NaN, Infinity, 1.1]) {
    assert.equal(inspect(complete(), clock).packetValid, false);
  }
  for (const p of [null, [], {}, 'SECRET_SENTINEL', new Proxy({}, {
    ownKeys() { throw Error('SECRET_SENTINEL'); },
  })]) {
    const r = inspect(p, 1000); closed(r);
    assert.equal(r.packetValid, false); assert.doesNotMatch(JSON.stringify(r), /SECRET_SENTINEL/);
  }
});
test('qualification runs without environment access, network or provider SDK', () => {
  const source = fs.readFileSync(require.resolve('../offline/cad-convex/configurationQualification'), 'utf8');
  let forbidden = 0;
  const deny = () => { forbidden++; throw Error('Forbidden capability'); };
  const sandbox = { module: { exports: {} }, process: new Proxy({}, { get: deny }),
    fetch: deny, require(id) { if (id === './devWiring') return require('../offline/cad-convex/devWiring'); return deny(); } };
  vm.runInNewContext(source, sandbox);
  const r = sandbox.module.exports.inspectConfigurationQualification(complete(), 1000);
  assert.equal(r.syntheticEvidenceComplete, true); closed(r); assert.equal(forbidden, 0);
});
