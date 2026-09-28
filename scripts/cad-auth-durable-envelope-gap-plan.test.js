const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkPacket, approvalPhrase } = require('./cad-auth-durable-envelope-gap-plan-checker');
const root = path.resolve(__dirname, '..');
const readSource = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(readSource(PACKET));
test('source plan stays unqualified with no evidence or runtime authority', () => {
  const p = packet();
  assert.equal(checkPacket(p).ok, true);
  assert.equal(p.evidenceEnvelopeSupplied, false);
  assert.equal(p.evidenceEnvelopeDigest, null);
  assert.equal(p.privateReviewAuthorized, false);
  assert.equal(p.dispositionBindingProvenance, 'CALLER_SUPPLIED_DIGEST_NOT_READ_OR_VERIFIED');
  for (const [key, value] of Object.entries(p.controls)) {
    assert.equal(value, key === 'productionExecutionBinding' ? null : key === 'effectsExecuted' ? 0 : false, key);
  }
});
test('every control and authority mutation, missing field and extra field blocks', () => {
  for (const key of Object.keys(packet().controls)) {
    const p = packet(); p.controls[key] = true;
    assert.equal(checkPacket(p).ok, false, key);
  }
  for (const key of Object.keys(packet())) {
    const p = packet(); delete p[key];
    assert.equal(checkPacket(p).ok, false, key);
  }
  for (const change of [{ evidenceEnvelopeSupplied: true }, { privateReviewAuthorized: true },
    { evidenceEnvelopeDigest: 'a'.repeat(64) }, { referenceMappingDispositionSha256: 'b'.repeat(64) },
    { sourceEvidenceSetReference: 'rrb-ref:other' }, { durableServiceReference: 'rrb-ref:other' }, { extra: true }]) {
    assert.equal(checkPacket({ ...packet(), ...change }).ok, false);
  }
});
test('all direct source drift and predecessor runtime source drift block', () => {
  for (const source of [...SOURCES, 'server/cadProductionExecutionBinding.js']) {
    assert.equal(checkPacket(packet(), { readSource: file => file === source
      ? Buffer.concat([readSource(file), Buffer.from('\ndrift')]) : readSource(file) }).ok, false, source);
  }
});
test('reads are constrained to explicit repository source closure, never opaque refs', () => {
  const reads = [];
  assert.equal(checkPacket(packet(), { readSource: file => { reads.push(file); return readSource(file); } }).ok, true);
  for (const file of reads) {
    assert.match(file, /^(docs|scripts|server|offline)\/[A-Za-z0-9._/-]+$/);
    assert.equal(file.includes('..'), false);
  }
  assert.equal(reads.some(file => file.includes('reference-mapping')), false);
});
test('supply phrase binds exact packet bytes and conveys no private review or live authority', () => {
  const bytes = readSource(PACKET);
  const phrase = approvalPhrase(bytes);
  assert.ok(phrase.includes(createHash('sha256').update(bytes).digest('hex')));
  for (const key of ['qualificationPlanPacketSha256', 'referencePrepPacketSha256', 'referenceMappingDispositionSha256', 'sourceEvidenceSetReference', 'durableServiceReference']) assert.ok(phrase.includes(packet()[key]));
  assert.doesNotMatch(phrase, /<[^>]+>/);
  assert.match(phrase, /no Codex private evidence reads/);
  assert.match(phrase, /separate exact-inventory\/digest-bound approval/);
  assert.match(phrase, /Keep liveDurableServiceQualified false and productionExecutionBinding null/);
  assert.throws(() => approvalPhrase(Buffer.from(JSON.stringify({ ...packet(), privateReviewAuthorized: true }))));
});
test('hostile inputs are rejected without getters or private data disclosure', () => {
  let calls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'controls', { enumerable: true, get() { calls++; throw Error('PRIVATE_SENTINEL'); } });
  for (const input of [hostile, null, [], 'PRIVATE_SENTINEL', { controls: {} }]) {
    const result = checkPacket(input);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }
  assert.equal(calls, 0);
});
test('CLI rejects paths and execution or write arguments before evidence ingestion', () => {
  for (const arg of ['--write', '--execute', '--read-private', '--activate', '--issue-command-card', '/private/PRIVATE_SENTINEL']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-durable-envelope-gap-plan-checker.js', arg], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
  }
});
