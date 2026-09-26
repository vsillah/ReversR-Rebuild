const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DIGESTS, prepareCommandCard, createReceiptRehearsal } = require('../offline/cad-auth-prod-executable-runner/preparation');
const { ORDER, REQUIREMENTS } = require('../offline/cad-auth-prod-runner/runner');
const { preparation, CLOSED_SOURCES } = require('../offline/cad-auth-prod-opening-prep/preparation');
const { createHash } = require('node:crypto');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-executable-runner-checker');
const binding = () => ({ digests: Object.fromEntries(DIGESTS.map(key => [key, createHash('sha256').update(key).digest('hex')])),
  startUtc: '2030-01-01T00:00:00.000Z', expiresUtc: '2030-01-01T00:01:00.000Z', maxDurationSeconds: 60 });
const start = Date.parse(binding().startUtc), expiry = Date.parse(binding().expiresUtc);
function receipt(kind, nowMs = start) {
  return { kind, nowMs, bindingSha256: prepareCommandCard(binding()).bindingSha256, clockTrusted: true,
    checks: Object.fromEntries(REQUIREMENTS[kind].map(key => [key, true])),
    observerDeltas: { bodyReads: 0, sessionsIssued: 0, conversions: 0, sandboxDispatches: 0 },
    ...(kind === 'SMOKE' ? { cases: preparation().postRollbackSmoke.cases } : {}) };
}
const advance = (runner, count) => ORDER.slice(0, count).forEach(kind => runner.accept(receipt(kind)));
function closed(result) {
  for (const key of ['enabled', 'runtimeMounted', 'liveExecutionReady', 'commandCardIssuanceAuthorized', 'cleanupAuthorized']) assert.equal(result[key], false);
  assert.equal(result.executableCommandCard, null); assert.equal(result.effectsExecuted, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}
test('candidate is canonical, non-executable and rejects changed binding replay key evasion', () => {
  const b = binding(), first = prepareCommandCard(b); closed(first);
  assert.equal(first.candidate.operations.length, 8);
  b.digests = Object.fromEntries(Object.entries(b.digests).reverse());
  assert.deepEqual(prepareCommandCard(b), first);
  for (const key of DIGESTS.filter(key => !['approval', 'run'].includes(key))) {
    const next = binding(); next.digests[key] = 'f'.repeat(64);
    const prepared = prepareCommandCard(next);
    assert.equal(prepared.candidate.runKey, first.candidate.runKey);
    assert.notEqual(prepared.bindingSha256, first.bindingSha256);
  }
  const next = binding(); next.startUtc = '2030-01-01T00:00:01.000Z';
  assert.equal(prepareCommandCard(next).candidate.runKey, first.candidate.runKey);
});
test('malformed schemas and active input never invoke code or expose input', () => {
  let calls = 0; const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'digests', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.x = cycle;
  const invalid = [null, [], accessor, proxy, cycle, { ...binding(), enabled: true },
    { ...binding(), adapter: hook }, { ...binding(), maxDurationSeconds: 59 },
    { ...binding(), startUtc: '2030-02-30T00:00:00.000Z' },
    { ...binding(), expiresUtc: binding().startUtc }, { ...binding(), maxDurationSeconds: Infinity }];
  for (const key of DIGESTS) { const b = binding(); b.digests[key] = 'PRIVATE_SENTINEL'; invalid.push(b); }
  for (const value of invalid) {
    const result = prepareCommandCard(value); closed(result); assert.equal(result.candidate, null);
    closed(createReceiptRehearsal(value).accept(proxy));
  }
  assert.equal(calls, 0);
});
test('complete rehearsal stays closed, snapshots input and denies repeat', () => {
  const b = binding(), runner = createReceiptRehearsal(b); b.digests.run = 'f'.repeat(64);
  for (const kind of ORDER) { const result = runner.accept(receipt(kind)); closed(result); assert.notEqual(result.code, 'BLOCKED_NO_RETRY'); }
  assert.equal(runner.closeout().simulatedClosureVerified, true);
  assert.equal(runner.closeout().code, 'SOURCE_REHEARSAL_COMPLETE');
  assert.equal(runner.accept(receipt('PREFLIGHT')).code, 'BLOCKED_NO_RETRY');
});
test('all prechecks, bindings, observers and clocks must match before each transition', () => {
  for (let i = 0; i < ORDER.length; i++) {
    const kind = ORDER[i];
    const mutations = [r => { r.bindingSha256 = 'f'.repeat(64); }, r => { r.clockTrusted = false; },
      r => { r.nowMs = start - 1; }, r => { r.extra = 'PRIVATE_SENTINEL'; }];
    for (const key of REQUIREMENTS[kind]) for (const value of [false, null, undefined, 'unknown']) mutations.push(r => { r.checks[key] = value; });
    for (const key of Object.keys(receipt(kind).observerDeltas)) mutations.push(r => { r.observerDeltas[key] = 1; });
    if (i < 4) mutations.push(r => { r.nowMs = expiry; });
    for (const mutate of mutations) {
      const runner = createReceiptRehearsal(binding()); advance(runner, i);
      const r = receipt(kind); mutate(r);
      const result = runner.accept(r); closed(result); assert.equal(result.code, 'BLOCKED_NO_RETRY', kind);
      assert.equal(result.simulatedClosureVerified, false);
    }
  }
});
test('unknown CAS keeps tombstones; closure can complete after expiry without retry', () => {
  for (const i of [1, 3]) {
    const runner = createReceiptRehearsal(binding()); advance(runner, i);
    const result = runner.accept(null); assert.equal(result.simulatedRunTombstone, true);
    if (i === 3) assert.equal(result.simulatedAttemptTombstone, true);
    for (const kind of ORDER.slice(4)) closed(runner.accept(receipt(kind, expiry + 1)));
    assert.equal(runner.closeout().simulatedClosureVerified, true);
    assert.equal(runner.closeout().code, 'BLOCKED_NO_RETRY');
  }
});
test('rollback failures restart closure and every smoke case is mandatory', () => {
  for (let i = 4; i < 8; i++) {
    const runner = createReceiptRehearsal(binding()); advance(runner, i);
    assert.equal(runner.accept(null).acceptedSteps, 4);
    assert.equal(runner.accept(receipt('SESSION')).acceptedSteps, 4);
    for (const kind of ORDER.slice(4)) runner.accept(receipt(kind, expiry));
    assert.equal(runner.closeout().simulatedClosureVerified, true);
  }
  for (let i = 0; i < receipt('SMOKE').cases.length; i++) {
    const runner = createReceiptRehearsal(binding()); advance(runner, 7);
    const r = receipt('SMOKE'); r.cases[i].expected = '200';
    assert.equal(runner.accept(r).simulatedClosureVerified, false);
  }
});
test('source packet is transitively bound and drift fails closed', () => {
  const packet = JSON.parse(fs.readFileSync(PACKET)); assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) assert.equal(checkPacket(packet, { readSource(file) {
    return file === source ? Buffer.from('drift') : fs.readFileSync(file);
  } }).ok, false, source);
});
test('CLI never accepts execution, authority or private paths', () => {
  for (const args of [[], ['--execute'], ['--live'], ['--activate'], ['--approval', 'PRIVATE_SENTINEL'], ['--write', '--execute']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-prod-executable-runner-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, args.length ? 1 : 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL|\/Users\//);
  }
});
test('production closed sources unchanged; preparation has no IO or runtime importers', () => {
  for (const [file, digest] of Object.entries(CLOSED_SOURCES)) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), digest);
  assert.doesNotMatch(fs.readFileSync('offline/cad-auth-prod-executable-runner/preparation.js', 'utf8'),
    /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|setTimeout|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const file = path.join(dir, e.name); return e.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins'])
    for (const file of walk(dir)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cad-auth-prod-executable-runner/, file);
});
