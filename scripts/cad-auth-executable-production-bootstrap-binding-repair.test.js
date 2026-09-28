const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const {
  PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
  PREVIOUS_DIGEST_REFRESH_SHA256,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_SHA256,
  PREVIOUS_PRODUCTION_DEPLOYMENT_REF,
  BOUNDED_SESSION_REF,
  INTERNAL_COHORT_REF,
  exactLiveOpeningApprovalPhrase,
  bootstrapBindingRepairPreparation,
  checkBootstrapBindingRepairPreparation,
} = require('../offline/cad-auth-executable-production-bootstrap-binding-repair/preparation');
const {
  PACKET,
  SOURCES,
  checkPacket,
} = require('./cad-auth-executable-production-bootstrap-binding-repair-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  for (const [field, expected] of Object.entries(bootstrapBindingRepairPreparation().controls)) {
    assert.equal(result[field], expected, field);
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|\/Users\/|\.local\//);
}

test('bootstrap repair packet is historical after execution binding and rollback repair', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, false);
  closed(result);
  assert.equal(p.parent.executableCommandCardRebind.sha256, PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256);
  assert.equal(p.preparation.historicalBindings.previousDigestRefreshSha256, PREVIOUS_DIGEST_REFRESH_SHA256);
  assert.equal(p.preparation.historicalBindings.previousExecutableCommandCardSha256, PREVIOUS_EXECUTABLE_COMMAND_CARD_SHA256);
  assert.equal(p.preparation.historicalBindings.previousProductionDeploymentReference, PREVIOUS_PRODUCTION_DEPLOYMENT_REF);
  assert.equal(p.preparation.historicalBindings.previousDeploymentMustNotBeReusedAfterThisMerge, true);
  assert.equal(p.preparation.nextGate.liveOpeningAuthorizedByThisGate, false);
});

test('route and bootstrap source expose explicit binding path without changing fail-closed default', () => {
  const route = read('server/cadUserUploadRouter.js').toString();
  const bootstrap = read('server/cadLiveOpeningExecutableRuntimeBootstrap.js').toString();
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /liveOpeningExecutableRuntime/);
  assert.match(route, /executableRuntime: liveOpeningExecutableRuntime/);
  assert.ok(route.indexOf('decision = await admissionSwitch.decide') < route.indexOf('bodyGateDecision = routeBodyGate'));
  assert.ok(route.indexOf('bodyGateDecision = routeBodyGate') < route.indexOf('validateRequestBody\\(req\\)'.replace(/\\/g, '')));
  assert.match(bootstrap, /commandCardBytes/);
  assert.match(bootstrap, /commandCardSha256/);
  assert.match(bootstrap, /currentDeploymentReference/);
  assert.match(bootstrap, /adapter/);
  assert.match(bootstrap, /now/);
  assert.doesNotMatch(route + bootstrap, /process\.env\.[A-Z0-9_]*BODY_ADMISSION|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
});

test('next live approval phrase is complete except post-merge values this gate cannot know', () => {
  const phrase = exactLiveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256));
  assert.match(phrase, new RegExp(PREVIOUS_DIGEST_REFRESH_SHA256));
  assert.match(phrase, new RegExp(BOUNDED_SESSION_REF));
  assert.match(phrase, new RegExp(INTERNAL_COHORT_REF));
  for (const unresolved of bootstrapBindingRepairPreparation().nextGate.unresolvedFields) {
    assert.match(phrase, new RegExp(`<${unresolved}>`));
  }
  assert.equal(bootstrapBindingRepairPreparation().nextGate.requiresFreshPostMergeProductionDeploymentRebind, true);
  assert.equal(bootstrapBindingRepairPreparation().nextGate.requiresFreshExecutableCommandCardSha256, true);
});

test('every leaf is immutable and sanitized failure stays closed', () => {
  const original = bootstrapBindingRepairPreparation();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkBootstrapBindingRepairPreparation(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkBootstrapBindingRepairPreparation(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('source drift, missing files and hostile inputs fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(p, { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
  let calls = 0;
  const hook = () => { calls += 1; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker refuses live execution, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-executable-production-bootstrap-binding-repair-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});
