const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { APPROVAL, REQUIRED_LIVE_BINDINGS, evaluateReadOnlyCollectionGate }
  = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { PACKET, SOURCES, checkBinding } = require('./cad-auth-live-collector-binding-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
const baseInput = () => ({
  nowUtc: '2026-09-24T13:23:52Z',
  mainCommit: APPROVAL.mergeCommit,
  originMainCommit: APPROVAL.mergeCommit,
  sealedCardSha256: APPROVAL.sealedCardSha256,
  reviewedPacketSha256: APPROVAL.reviewedPacketSha256,
  scheduleSha256: APPROVAL.scheduleSha256,
  limitsSha256: APPROVAL.limitsSha256,
  sourcePreparationValid: true,
  packetExecutable: false,
  packetLiveCollectionAuthorized: false,
  packetBodyAdmissionAuthorized: false,
  packetRuntimeActivationAuthorized: false,
});

test('binding packet validates while every live gate stays closed', () => {
  const result = checkBinding(packet());
  assert.equal(result.ok, true);
  for (const key of ['executable', 'liveCollectionAuthorized', 'runtimeActivationAuthorized',
    'bodyAdmissionAuthorized', 'uploadSessionIssuanceEnabled']) {
    assert.equal(result[key], false);
  }
  assert.equal(packet().guardedPrecheck.sampleStop.stopCode, 'MISSING_PREREQUISITE');
  assert.equal(packet().nextGate.liveEvidenceCanRunNow, false);
});

test('guard stops outside the exact UTC window and on any source drift', () => {
  assert.equal(evaluateReadOnlyCollectionGate({ ...baseInput(), nowUtc: '2026-09-24T12:59:59Z' }).stopCode,
    'WINDOW_EXPIRED_OR_NOT_STARTED');
  assert.equal(evaluateReadOnlyCollectionGate({ ...baseInput(), nowUtc: '2026-09-24T13:30:00Z' }).stopCode,
    'WINDOW_EXPIRED_OR_NOT_STARTED');
  for (const key of ['mainCommit', 'originMainCommit', 'sealedCardSha256', 'reviewedPacketSha256',
    'scheduleSha256', 'limitsSha256']) {
    const input = baseInput(); input[key] = 'drift';
    const result = evaluateReadOnlyCollectionGate(input);
    assert.equal(result.stopCode, 'SOURCE_OR_TARGET_DRIFT');
    assert.equal(result.liveEvidenceCollected, false);
  }
  for (const key of ['sourcePreparationValid', 'packetExecutable', 'packetLiveCollectionAuthorized',
    'packetBodyAdmissionAuthorized', 'packetRuntimeActivationAuthorized']) {
    const input = baseInput(); input[key] = key === 'sourcePreparationValid' ? false : true;
    assert.equal(evaluateReadOnlyCollectionGate(input).stopCode, 'SOURCE_OR_TARGET_DRIFT');
  }
});

test('guard reports missing bindings without authorizing collection even when all names are present', () => {
  const missing = evaluateReadOnlyCollectionGate(baseInput());
  assert.equal(missing.stopCode, 'MISSING_PREREQUISITE');
  assert.deepEqual(missing.missingBindings, REQUIRED_LIVE_BINDINGS);
  const allPresent = { ...baseInput() };
  for (const name of REQUIRED_LIVE_BINDINGS) allPresent[name] = true;
  const ready = evaluateReadOnlyCollectionGate(allPresent);
  assert.equal(ready.stopCode, 'LIVE_COLLECTOR_STILL_NOT_AUTHORIZED');
  assert.equal(ready.liveEvidenceCollected, false);
  assert.equal(ready.uploadSessionsIssued, 0);
});

test('private, accessor, malformed and promoted inputs fail closed without echoing private values', () => {
  const poison = { ...baseInput() };
  Object.defineProperty(poison, 'sealedCardSha256', { enumerable: true, get() { throw Error('PRIVATE_SENTINEL'); } });
  for (const input of [poison, null, [], 'PRIVATE_SENTINEL']) {
    const result = evaluateReadOnlyCollectionGate(input);
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
  }
  for (const mutate of [
    p => { p.guardedPrecheck.liveCollectionAuthorized = true; },
    p => { p.guardedPrecheck.liveCollectorCommandLine = 'node live.js'; },
    p => { p.requiredLiveBindings.concreteProviderRuntimeBinding.accepted = true; },
    p => { p.nextGate.liveEvidenceCanRunNow = true; },
    p => { p.approval.consumedStopCode = 'SUCCESS'; },
  ]) {
    const p = packet(); mutate(p);
    assert.equal(checkBinding(p).ok, false);
  }
});

test('source drift and forbidden CLI modes fail closed', () => {
  for (const file of SOURCES) {
    assert.equal(checkBinding(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) }).ok, false);
  }
  for (const arg of ['--live', '--collect', '--retry', '--seal', '--write=/tmp/private.json']) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-live-collector-binding-checker.js', arg], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE|secret|token/i);
  }
});

test('new guarded source remains offline and unmounted from runtime routes', () => {
  const source = read('offline/cad-auth-live-collector-binding/guardedCollector.js').toString();
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  for (const file of ['server/index.js', 'api/[...path].js', 'server/cadUserUploadRouter.js',
    'server/cadUploadSessionGatewayService.js', 'server/cadProductionSessionVerifierBinding.js']) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-live-collector-binding/);
  }
});
