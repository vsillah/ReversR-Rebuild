const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkPacket, approvalPhrase, checkApprovalPhrase } = require('./cad-auth-durable-service-qualification-review-projection-checker');
const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(readSource(PACKET));

test('accepted disposition is projected with exact bindings and closed controls', () => {
  const p = packet();
  assert.equal(checkPacket(p).ok, true);
  assert.equal(p.privateQualificationReviewSha256, '5e064d6edb779def902dbf43f970593d23ea771acf72bbea2ada9f88173a0e43');
  assert.equal(p.qualificationReviewReceiptSha256, '6fe6679616bbde8bf2a16f1fed9cd3ab662713112958eaed97efb7e6e0fb41ea');
  assert.equal(p.qualificationReviewPlanPacketSha256, '6a6628713c38cf43e0c62dfa8ef16dcd5b0c58e61164ab7f5bdd33d39c30ed55');
  assert.equal(p.repairedInventoryReviewSha256, '3e18bdf6c31901ea172997c0ea155ba101676af9a1c60a4db827c12d6c79f181');
  assert.equal(p.repairedInventoryReviewReceiptSha256, '02657eeff430a73599fc4c2d74fe0f97f10bcb1d6b7c4e039535fe00f8cf44ff');
  assert.equal(p.sourceEvidenceSetReference, 'rrb-ref:cad-auth-durable-service-source-evidence-set-20260928T161754Z');
  assert.equal(p.durableServiceReference, 'rrb-ref:cad-auth-durable-service-20260928T161754Z');
  assert.deepEqual(p.acceptedReview, {
    status: 'PRIVATE_QUALIFICATION_REVIEW_ACCEPTED_SOURCE_ONLY_LIVE_UNQUALIFIED',
    acceptedArtifactKindCount: 9, requiredArtifactKindCount: 9,
    acceptedDurableCapabilityCount: 13, requiredDurableCapabilityCount: 13,
    blockers: 0, closedControlStatus: 'CLOSED', durableServiceQualified: false,
    liveDurableServiceQualified: false, productionExecutionBinding: null,
  });
  for (const [key, value] of Object.entries(p.controls)) {
    assert.equal(value, key === 'productionExecutionBinding' ? null : key === 'effectsExecuted' ? 0 : false, key);
  }
});

test('every leaf mutation and every missing or additional field fails closed', () => {
  const walk = (value, keys = []) => {
    for (const key of Object.keys(value)) {
      const route = [...keys, key];
      const change = fn => {
        const p = packet();
        const parent = route.slice(0, -1).reduce((v, k) => v[k], p);
        fn(parent, key);
        assert.equal(checkPacket(p).ok, false, route.join('.'));
      };
      change((v, k) => { delete v[k]; });
      if (value[key] && typeof value[key] === 'object') {
        change((v, k) => { v[k].privateValue = 'PRIVATE_SENTINEL'; });
        walk(value[key], route);
      } else change((v, k) => { v[k] = v[k] === true ? false : 'PRIVATE_SENTINEL'; });
    }
  };
  walk(packet());
  assert.equal(checkPacket({ ...packet(), privatePath: 'PRIVATE_SENTINEL' }).ok, false);
});

test('all source drift and missing sources block; reads stay in the fixed public manifest', () => {
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      assert.equal(checkPacket(packet(), { readSource: file => {
        assert.ok(SOURCES.includes(file));
        if (file === source) {
          if (missing) throw Error('PRIVATE_SENTINEL');
          return Buffer.concat([readSource(file), Buffer.from('\ndrift')]);
        }
        return readSource(file);
      } }).ok, false, source);
    }
  }
  const reads = new Set();
  assert.equal(checkPacket(packet(), { readSource: file => {
    assert.match(file, /^(docs|scripts|offline|server)\//);
    assert.doesNotMatch(file, /\.\.|\.local|rrb-ref:|^\//);
    reads.add(file); return readSource(file);
  } }).ok, true);
  assert.deepEqual([...reads].sort(), [...SOURCES].sort());
});

test('approval is byte-digest-bound and accepts only the exact publication phrase', () => {
  const bytes = readSource(PACKET);
  const phrase = approvalPhrase(bytes);
  assert.ok(phrase.includes(createHash('sha256').update(bytes).digest('hex')));
  assert.ok(phrase.startsWith('I approve public push of branch codex/cad-auth-durable-qualification-projection and creation of one draft PR'));
  assert.match(phrase, /Keep durableServiceQualified false, liveDurableServiceQualified false, productionExecutionBinding null/);
  assert.equal(checkApprovalPhrase(bytes, phrase), true);
  for (const wrong of [phrase + ' ', phrase.replace('draft PR', 'PR'), phrase.replace('No private', 'Allow private'), '', null]) {
    assert.equal(checkApprovalPhrase(bytes, wrong), false);
  }
  assert.equal(checkApprovalPhrase(Buffer.concat([bytes, Buffer.from('\n')]), phrase), false);
  assert.throws(() => approvalPhrase(Buffer.from('{PRIVATE_SENTINEL')), /^Error: QUALIFICATION_REVIEW_PROJECTION_BLOCKED$/);
});

test('hostile accessors and private error data are never returned', () => {
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', { enumerable: true, get() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  for (const input of [hostile, null, [], 'PRIVATE_SENTINEL', { ...packet(), privateCadPayloads: 'PRIVATE_SENTINEL' }]) {
    const result = checkPacket(input);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
  assert.equal(calls, 0);
});

test('CLI validates offline and rejects live/private modes without echoing arguments', () => {
  const script = 'scripts/cad-auth-durable-service-qualification-review-projection-checker.js';
  const valid = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(valid.status, 0);
  assert.equal(JSON.parse(valid.stdout).ok, true);
  for (const args of [['--read-private'], ['--qualify'], ['--activate'], ['--push'], ['--issue-command-card'], ['/private/PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
  }
});
