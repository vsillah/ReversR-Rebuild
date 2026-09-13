const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectDevWiring, createDevQualificationForTests } = require('../offline/cad-convex/devWiring');
const manifest = require('../offline/cad-convex/devWiring.json');
const copy = () => structuredClone(manifest);
const request = (n = 'a') => ({ nonce: 'fixture-' + n,
  sourceCommit: manifest.rollback.disabledCommit, email: manifest.cohort[0] });
const snapshot = r => ({ ...r, userId: 'fixture-user-a', sessionId: 'fixture-session-a',
  sessionOwnerId: 'fixture-user-a', method: 'password', provenance: 'exact-session-fixture',
  active: true, issuedAt: 1000, expiresAt: 61000, outcome: 'known-read-only' });
function runner(readSnapshot = async r => snapshot(r), now = () => 1000, m = copy()) {
  return createDevQualificationForTests({ testOnly: true, manifest: m, readSnapshot, now });
}
test('strict destination, environment, cohort, disable and rollback contract', () => {
  assert.equal(inspectDevWiring(copy()).packetValid, true);
  for (const mutate of [
    m => { m.target.type = 'production'; }, m => { m.target.deployment = 'other'; },
    m => { m.target.clientOrigin = m.target.issuerOrigin; },
    m => { m.environment.JWT_PRIVATE_KEY = 'accidental-secret'; },
    m => { m.environment.NEXT_PUBLIC_CONVEX_URL = 'anything'; },
    m => { m.cohort = ['real@example.com']; }, m => { m.cohort.push(m.cohort[0]); },
    m => { m.cohort = []; }, m => { m.cohort = Array.from({length:9}, (_,i) => `cad-test-${i}@auth-test.invalid`); },
    m => { m.rollback.disabledCommit = 'f'.repeat(40); },
    m => { m.provisioning.flow = 'signUp'; }, m => { m.provisioning.password = 'secret'; },
    m => { m.transport = 'cookie'; }, m => { m.limits.expenseUsd = 1; },
    ...Object.keys(manifest.gates).map(k => m => { m.gates[k] = true; }),
  ]) {
    const m = copy(); mutate(m);
    const result = inspectDevWiring(m);
    assert.equal(result.packetValid, false);
    assert.equal(result.liveAuthReady, false);
    assert.ok(!JSON.stringify(result).includes('secret'));
    assert.throws(() => runner(undefined, undefined, m), /AUTH_UNAVAILABLE/);
  }
  for (const input of [null, {}, [], 'secret']) assert.equal(inspectDevWiring(input).packetValid, false);
});
test('qualified local snapshot never grants live auth or upload permission', async () => {
  const run = runner();
  assert.deepEqual(await run.qualify(request()), { code: 'SYNTHETIC_SNAPSHOT_QUALIFIED',
    qualified: true, liveAuthReady: false, uploadsEnabled: false });
  run.stop(); assert.equal((await run.qualify(request('b'))).qualified, false);
});
test('replay and unknown commit halt before fixture access', async () => {
  for (const unknown of [false, true]) {
    let calls = 0;
    const run = runner(async r => { calls++; return snapshot(r); });
    const r = request();
    if (unknown) r.sourceCommit = 'unknown';
    else assert.equal((await run.qualify(r)).qualified, true);
    assert.equal((await run.qualify(r)).qualified, false);
    assert.equal((await run.qualify(request('b'))).qualified, false);
    assert.equal(calls, unknown ? 0 : 1);
  }
});
test('exact session provenance, owner, time and known outcome required', async () => {
  for (const patch of [{method:'oidc'}, {provenance:'email'}, {sessionOwnerId:'other'},
    {active:false}, {issuedAt:1001}, {expiresAt:1000}, {expiresAt:61001},
    {outcome:'unknown-commit'}, {email:'cad-test-other@auth-test.invalid'},
    {nonce:'fixture-other'}, {sessionId:''}, {secret:'accidental-secret'}]) {
    let calls = 0;
    const run = runner(async r => { calls++; return {...snapshot(r), ...patch}; });
    assert.equal((await run.qualify(request())).qualified, false);
    assert.equal((await run.qualify(request('b'))).qualified, false);
    assert.equal(calls, 1);
  }
});
test('errors are sanitized and cannot be retried', async () => {
  const run = runner(async () => { throw new Error('accidental-secret'); });
  assert.equal(JSON.stringify(await run.qualify(request())).includes('secret'), false);
  assert.equal((await run.qualify(request('b'))).qualified, false);
});
test('concurrent admission halts both operations', async () => {
  let release;
  const run = runner(r => new Promise(resolve => { release = () => resolve(snapshot(r)); }));
  const first = run.qualify(request());
  assert.equal((await run.qualify(request('b'))).qualified, false);
  release(); assert.equal((await first).qualified, false);
});
test('operation and clock budgets deny; manifest mutation cannot expand cohort', async () => {
  const run = runner();
  for (let i = 0; i < 8; i++) assert.equal((await run.qualify(request(String(i)))).qualified, true);
  assert.equal((await run.qualify(request('ninth'))).qualified, false);
  for (const time of [999, 301000, NaN]) {
    let clock = 1000;
    const timed = runner(undefined, () => clock); clock = time;
    assert.equal((await timed.qualify(request())).qualified, false);
  }
  const m = copy(); const isolated = runner(undefined, undefined, m);
  m.cohort.push('cad-test-other@auth-test.invalid');
  assert.equal((await isolated.qualify({...request(), email:m.cohort[1]})).qualified, false);
});
