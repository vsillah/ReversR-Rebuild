const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ORDER, REQUIREMENTS, fixturePlan, expectedEvent, createDryRunner, dryRun } = require('../offline/cad-auth-prod-runner/runner');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-runner-checker');
const plan = fixturePlan();
const start = Date.parse(plan.startUtc), expiry = Date.parse(plan.expiresUtc);
const event = (kind, now = start) => expectedEvent(plan, kind, now);
function advance(runner, until) { for (const kind of ORDER.slice(0, until)) runner.step(event(kind)); }
function closed(result) {
  assert.equal(result.enabled, false); assert.equal(result.liveExecutionReady, false);
  assert.equal(result.effectsExecuted, 0);
  if ('cleanupAuthorized' in result) assert.equal(result.cleanupAuthorized, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}
test('complete synthetic sequence proves simulation only and cannot repeat', () => {
  const runner = createDryRunner(plan);
  for (const kind of ORDER) { const r = runner.step(event(kind)); closed(r); assert.equal(r.stopped, false); }
  assert.equal(runner.status().simulatedSmokeVerified, true);
  assert.equal(runner.status().simulatedRunConsumed, true);
  assert.equal(runner.status().simulatedAttemptConsumed, true);
  assert.equal(runner.step(event('PREFLIGHT')).code, 'BLOCKED_NO_RETRY');
  assert.equal(dryRun().simulatedSmokeVerified, true);
});
test('each forward step enforces inclusive start, exclusive expiry and monotonic trusted time', () => {
  for (let i = 0; i < 4; i++) {
    for (const now of [start - 1, expiry, expiry + 1, NaN, Infinity]) {
      const runner = createDryRunner(plan); advance(runner, i);
      assert.equal(runner.step(event(ORDER[i], now)).code, 'BLOCKED_NO_RETRY');
    }
    const runner = createDryRunner(plan); advance(runner, i);
    assert.equal(runner.step(event(ORDER[i], expiry - 1)).code, 'SIMULATED_STEP_ACCEPTED');
  }
  const runner = createDryRunner(plan);
  runner.step(event('PREFLIGHT', start + 10));
  assert.equal(runner.step(event('CLAIM', start + 9)).code, 'BLOCKED_NO_RETRY');
});
test('every preflight session admission rollback and smoke requirement fails closed', () => {
  for (let i = 0; i < ORDER.length; i++) {
    for (const key of REQUIREMENTS[ORDER[i]]) {
      for (const value of [false, null, 'unknown', undefined]) {
        const runner = createDryRunner(plan); advance(runner, i);
        const next = event(ORDER[i]); next.checks[key] = value;
        const result = runner.step(next);
        assert.equal(result.code, 'BLOCKED_NO_RETRY', ORDER[i] + '.' + key); closed(result);
        assert.equal(result.simulatedCleanupReady, false);
      }
    }
    for (const key of Object.keys(plan)) {
      const runner = createDryRunner(plan); advance(runner, i);
      const next = event(ORDER[i]); next.binding[key] = 'PRIVATE_SENTINEL';
      assert.equal(runner.step(next).code, 'BLOCKED_NO_RETRY');
    }
    for (const key of ['bodyReads', 'sessionsIssued', 'conversions', 'sandboxDispatches']) {
      const runner = createDryRunner(plan); advance(runner, i);
      const next = event(ORDER[i]); next.observerDeltas[key] = 1;
      assert.equal(runner.step(next).code, 'BLOCKED_NO_RETRY');
    }
  }
});
test('unknown claim and attempt outcomes retain tombstones, permit only ordered closure after expiry', () => {
  for (const stage of [1, 3]) {
    const runner = createDryRunner(plan); advance(runner, stage);
    const next = event(ORDER[stage]); next.checks[Object.keys(next.checks)[0]] = null;
    const failed = runner.step(next);
    assert.equal(failed.simulatedRunConsumed, true);
    if (stage === 3) assert.equal(failed.simulatedAttemptConsumed, true);
    for (const kind of ORDER.slice(4)) assert.equal(runner.step(event(kind, expiry + 1)).stopped, true);
    assert.equal(runner.status().simulatedSmokeVerified, true);
    assert.equal(runner.step(event('CLAIM')).code, 'BLOCKED_NO_RETRY');
  }
});
test('out of order steps and every altered smoke case block cleanup', () => {
  for (let i = 0; i < ORDER.length; i++) {
    const runner = createDryRunner(plan); advance(runner, i);
    assert.equal(runner.step(event(ORDER[(i + 1) % ORDER.length])).code, 'BLOCKED_NO_RETRY');
  }
  for (let i = 0; i < event('SMOKE').cases.length; i++) {
    const runner = createDryRunner(plan); advance(runner, 7);
    const next = event('SMOKE'); next.cases[i].expected = '200';
    assert.equal(runner.step(next).simulatedCleanupReady, false);
  }
});
test('malformed plans, accessors and proxies never invoke user code or leak input', () => {
  let calls = 0; const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'mode', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.self = cycle;
  for (const value of [null, accessor, proxy, cycle, { ...plan, enabled: true }, { ...plan, execute: true },
    { ...plan, mode: 'live' }, { ...plan, runRef: 'production' }, { ...plan, maxDurationSeconds: 59 },
    { ...plan, expiresUtc: plan.startUtc }, { ...plan, startUtc: '2030-02-30T00:00:00.000Z' }]) {
    const runner = createDryRunner(value); assert.equal(runner.status().code, 'INVALID_SYNTHETIC_PLAN'); closed(runner.status());
  }
  for (const value of [accessor, proxy, cycle]) {
    const runner = createDryRunner(plan); closed(runner.step(value));
    assert.equal(checkPacket(value, { readSource: hook }).ok, false);
  }
  assert.equal(calls, 0);
});
test('caller mutation cannot change captured plan; untrusted clocks fail', () => {
  const mutable = fixturePlan(), runner = createDryRunner(mutable); mutable.enabled = true;
  assert.equal(runner.step(event('PREFLIGHT')).code, 'SIMULATED_STEP_ACCEPTED');
  const next = event('CLAIM'); next.clockTrusted = false;
  assert.equal(runner.step(next).code, 'BLOCKED_NO_RETRY');
});
test('packet pins parent and all runner sources; drift and missing sources fail', () => {
  const packet = JSON.parse(fs.readFileSync(PACKET)); assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) {
    for (const missing of [true, false]) {
      assert.equal(checkPacket(packet, { readSource(file) {
        if (file === source) { if (missing) throw Error('PRIVATE_SENTINEL'); return Buffer.from('drift'); }
        return fs.readFileSync(file);
      } }).ok, false, source);
    }
  }
  packet.enabled = true; assert.equal(checkPacket(packet).ok, false);
});
test('CLI accepts only fixed local checks and dry run, refuses live options and paths', () => {
  for (const args of [[], ['--dry-run'], ['--execute'], ['--activate'], ['--approval', 'PRIVATE_SENTINEL'],
    ['--dry-run', '--execute'], ['PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-prod-runner-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(run.status, args.length === 0 || args.length === 1 && args[0] === '--dry-run' ? 0 : 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//); closed(JSON.parse(run.stdout));
  }
});
test('runner has no IO or runtime importers', () => {
  assert.doesNotMatch(fs.readFileSync('offline/cad-auth-prod-runner/runner.js', 'utf8'),
    /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|setTimeout|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cad-auth-prod-runner/, file);
  }
});
