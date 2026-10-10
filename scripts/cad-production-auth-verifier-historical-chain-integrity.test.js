const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  ACTIVE_CONTRACT,
  HISTORICAL_BINDINGS,
  checkHistoricalChainIntegrity,
} = require('./cad-production-auth-verifier-historical-chain-integrity');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));

test('fixed historical allowlist validates exact baseline bytes and classification', () => {
  const result = checkHistoricalChainIntegrity();
  assert.equal(result.ok, true);
  assert.equal(result.historicalBindingCount, 36);
  assert.equal(result.historicalPacketsReusable, false);
  assert.equal(result.historicalApprovalsReusable, false);
  assert.equal(result.historicalWindowsReusable, false);
  assert.equal(new Set(HISTORICAL_BINDINGS.flatMap(item => [item.packet, item.checker])).size, 72);
});

test('one-byte drift fails closed without exposing changed bytes', () => {
  const target = HISTORICAL_BINDINGS[0].packet;
  const result = checkHistoricalChainIntegrity({ readSource(file) {
    const bytes = Buffer.from(read(file));
    if (file === target) bytes[0] ^= 1;
    return bytes;
  } });
  assert.deepEqual(result.problems, ['INVALID_HISTORICAL_CHAIN_INTEGRITY']);
});

test('missing files fail closed', () => {
  const target = HISTORICAL_BINDINGS[0].checker;
  const result = checkHistoricalChainIntegrity({ readSource(file) {
    if (file === target) throw Error('synthetic missing file');
    return read(file);
  } });
  assert.equal(result.ok, false);
});

test('duplicate paths and missing allowlist entries fail closed', () => {
  const duplicate = HISTORICAL_BINDINGS.map(item => ({ ...item }));
  duplicate[1].packet = duplicate[0].packet;
  assert.equal(checkHistoricalChainIntegrity({ bindings: duplicate }).ok, false);
  assert.equal(checkHistoricalChainIntegrity({ bindings: duplicate.slice(1) }).ok, false);
});

test('attempted active reclassification fails closed', () => {
  const changed = HISTORICAL_BINDINGS.map(item => ({ ...item }));
  changed[0].classification = ACTIVE_CONTRACT.classification;
  assert.equal(checkHistoricalChainIntegrity({ bindings: changed }).ok, false);
  changed[0] = { ...HISTORICAL_BINDINGS[0], packet: ACTIVE_CONTRACT.packet };
  assert.equal(checkHistoricalChainIntegrity({ bindings: changed }).ok, false);
});

test('integrity checker has no write or regeneration mode', () => {
  const script = path.join(root, 'scripts/cad-production-auth-verifier-historical-chain-integrity.js');
  assert.equal(spawnSync(process.execPath, [script], { cwd: root }).status, 0);
  for (const args of [['--write'], ['--refresh'], ['--packet', 'elsewhere']]) {
    assert.notEqual(spawnSync(process.execPath, [script, ...args], { cwd: root }).status, 0);
  }
});
