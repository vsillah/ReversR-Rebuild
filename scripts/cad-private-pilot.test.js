const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { LIMITS } = require('../server/cadWorkerContract');
const { sourceBody, assertRedacted } = require('./cad-private-pilot-runner');

test('private pilot runner is blocked by default before reading a source', () => {
  const evidencePath = path.join(os.tmpdir(), `cad-private-pilot-blocked-${process.pid}.json`);
  const result = spawnSync(process.execPath, ['scripts/cad-private-pilot-runner.js'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, CAD_PRIVATE_SOURCE_PATH: path.join(os.tmpdir(), 'missing-private-source') },
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'blocked');
  assert.equal(payload.code, 'APPROVAL_REQUIRED');
  assert.doesNotMatch(result.stdout, /missing-private-source/);
  assert.equal(result.stderr, '');

  const writeResult = spawnSync(process.execPath, ['scripts/cad-private-pilot-runner.js', `--write=${evidencePath}`], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, CAD_PRIVATE_SOURCE_PATH: path.join(os.tmpdir(), 'missing-private-source') },
  });
  assert.equal(writeResult.status, 1);
  assert.equal(JSON.parse(fs.readFileSync(evidencePath, 'utf8')).code, 'APPROVAL_REQUIRED');
  assert.doesNotMatch(fs.readFileSync(evidencePath, 'utf8'), /missing-private-source/);
});

test('private source preparation records hash and bytes but no source path', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-private-pilot-'));
  const sourcePath = path.join(directory, 'operator-source' + '.ig' + 's');
  const content = Buffer.from('S'.repeat(80) + '\n' + 'G'.repeat(80) + '\n');
  fs.writeFileSync(sourcePath, content);
  const prepared = sourceBody(sourcePath);
  assert.equal(prepared.source.bytes, content.length);
  assert.match(prepared.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(prepared.source.format, 'iges');
  assert.equal(prepared.body.fileName, 'pilot-source' + '.ig' + 's');
  const evidence = JSON.stringify({ source: prepared.source });
  assertRedacted(evidence, ['route-secret-value'], fs.realpathSync(sourcePath));
});

test('private source preparation blocks unsupported, empty and oversized files locally', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-private-pilot-'));
  const unsupported = path.join(directory, 'source.txt');
  fs.writeFileSync(unsupported, 'text');
  assert.equal(sourceBody(unsupported).evidence.code, 'SOURCE_EXTENSION_UNSUPPORTED');

  const empty = path.join(directory, 'empty' + '.ig' + 'es');
  fs.writeFileSync(empty, '');
  assert.equal(sourceBody(empty).evidence.code, 'SOURCE_EMPTY');

  const oversized = path.join(directory, 'large' + '.ig' + 's');
  fs.writeFileSync(oversized, Buffer.alloc(LIMITS.inputBytes + 1, 65));
  const blocked = sourceBody(oversized).evidence;
  assert.equal(blocked.code, 'SOURCE_TOO_LARGE');
  assert.equal(blocked.source.bytes, LIMITS.inputBytes + 1);
  assert.match(blocked.source.sha256, /^[a-f0-9]{64}$/);
});
