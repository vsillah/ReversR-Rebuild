const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const {
  PACKET,
  SOURCES,
  MAIN_COMMIT,
  PROJECTION_SHA,
  PRODUCTION_DEPLOYMENT_ID,
  PRODUCTION_DEPLOYMENT_TARGET,
  FAIL_CLOSED_SMOKE,
  openingWindow,
  durableEvidenceDigest,
  commandCardDraft,
  commandCardBytes,
  commandCardSha256,
  liveOpeningApprovalPhrase,
  checkPacket,
  approvalPhrase,
  checkApprovalPhrase,
} = require('./cad-auth-final-live-opening-rebind-prep-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

test('historical final rebind prep is stale after production execution binding finalization', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'FINAL_LIVE_OPENING_REBIND_PREP_BLOCKED');
  assert.equal(result.effectsExecuted, 0);
  assert.equal(p.sourceCommit, MAIN_COMMIT);
  assert.equal(p.parentPackets.durableQualificationProjectionPacketSha256, PROJECTION_SHA);
  assert.equal(p.productionDeployment.id, PRODUCTION_DEPLOYMENT_ID);
  assert.equal(p.productionDeployment.target, PRODUCTION_DEPLOYMENT_TARGET);
  assert.deepEqual(p.failClosedSmoke, FAIL_CLOSED_SMOKE);
  assert.equal(p.finalOpeningBindings.durableEvidenceSha256, durableEvidenceDigest());
  assert.equal(p.finalOpeningBindings.commandCardSha256, commandCardSha256());
  assert.equal(p.finalOpeningBindings.commandCardIssuedByThisGate, false);
  assert.equal(p.finalOpeningBindings.runtimeActivationAuthorizedByThisGate, false);
  assert.equal(p.finalOpeningBindings.requestBodyAdmissionReadAuthorizedByThisGate, false);
  assert.equal(p.controls.effectsExecuted, 0);
});

test('resolved command card digest is deterministic but not issued by this gate', () => {
  const card = commandCardDraft();
  assert.equal(commandCardBytes(), JSON.stringify(card));
  assert.equal(createHash('sha256').update(commandCardBytes()).digest('hex'), commandCardSha256());
  assert.equal(card.productionDeploymentTarget, PRODUCTION_DEPLOYMENT_TARGET);
  assert.equal(card.failClosedSmoke.status, 401);
  assert.equal(card.requestBodyAdmissionReadAuthorized, true);
  assert.equal(packet().finalOpeningBindings.requestBodyAdmissionReadAuthorizedByThisGate, false);
});

test('opening window is finite and must be repeated in later approval', () => {
  const window = openingWindow();
  assert.equal(Date.parse(window.expiresUtc) - Date.parse(window.startUtc), 30 * 60 * 1000);
  assert.equal(window.currentGateDoesNotOpenWindow, true);
  assert.equal(window.laterApprovalMustRepeatWindow, true);
  assert.equal(packet().nextLiveOpeningGate.authorized, false);
});

test('live approval phrase is populated except packet identity placeholders', () => {
  const phrase = liveOpeningApprovalPhrase();
  assert.match(phrase, /one bounded internal production upload-admission opening/);
  assert.match(phrase, new RegExp(PROJECTION_SHA));
  assert.match(phrase, new RegExp(PRODUCTION_DEPLOYMENT_ID));
  assert.match(phrase, new RegExp(commandCardSha256()));
  assert.match(phrase, /starting 2026-09-29T18:00:00Z and expiring 2026-09-29T18:30:00Z/);
  assert.match(phrase, /one concurrent session/);
  assert.match(phrase, /one upload attempt/);
  assert.match(phrase, /post-rollback fail-closed smoke/);
  assert.match(phrase, /<finalLiveOpeningRebindPrepPacketSha256>/);
  assert.match(phrase, /<finalLiveOpeningRebindPrepSourceCommit>/);
});

test('all source drift and missing sources block', () => {
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkPacket(packet(), { readSource(file) {
        assert.ok(SOURCES.includes(file));
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
      assert.equal(result.effectsExecuted, 0);
    }
  }
});

test('mutations, private fields and hostile inputs fail closed', () => {
  const walk = (value, keys = []) => {
    for (const key of Object.keys(value)) {
      const route = [...keys, key];
      const mutate = fn => {
        const p = packet();
        const parent = route.slice(0, -1).reduce((acc, part) => acc[part], p);
        fn(parent, key);
        const result = checkPacket(p);
        assert.equal(result.ok, false, route.join('.'));
        assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
      };
      mutate((v, k) => { delete v[k]; });
      if (value[key] && typeof value[key] === 'object') {
        mutate((v, k) => { v[k].privateValue = 'PRIVATE_SENTINEL'; });
        walk(value[key], route);
      } else {
        mutate((v, k) => { v[k] = v[k] === true ? false : 'PRIVATE_SENTINEL'; });
      }
    }
  };
  walk(packet());
  for (const input of [null, [], 'PRIVATE_SENTINEL', { privatePath: 'ABSOLUTE_PRIVATE_SOURCE' }]) {
    const result = checkPacket(input);
    assert.equal(result.ok, false);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\//);
  }
});

test('approval phrase is unavailable for stale final rebind prep', () => {
  const bytes = read(PACKET);
  assert.ok(createHash('sha256').update(bytes).digest('hex'));
  assert.ok(commandCardSha256());
  assert.throws(() => approvalPhrase(bytes), /^Error: FINAL_LIVE_OPENING_REBIND_PREP_BLOCKED$/);
  assert.equal(checkApprovalPhrase(bytes, 'PRIVATE_SENTINEL'), false);
});

test('CLI blocks stale source-only packet and rejects live/private modes', () => {
  const script = 'scripts/cad-auth-final-live-opening-rebind-prep-checker.js';
  const ok = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(ok.status, 1);
  assert.equal(JSON.parse(ok.stdout).ok, false);
  assert.equal(JSON.parse(ok.stdout).effectsExecuted, 0);
  for (const args of [['--live'], ['--activate'], ['--issue-command-card'], ['--read-private'],
    ['--upload-session'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    assert.equal(JSON.parse(run.stdout).effectsExecuted, 0);
  }
});
