const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../offline/cad-convex/uploadConversionSandboxAuthCorrection.json');
const { inspectUploadConversionSandboxAuthCorrection } =
  require('../offline/cad-convex/uploadConversionSandboxAuthCorrection');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fileSha = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');

test('packet records the stopped run and closes all authority', () => {
  const result = inspectUploadConversionSandboxAuthCorrection(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.stoppedRunBound, true);
  assert.equal(result.reconciliationValid, true);
  assert.equal(result.correctionValid, true);
  assert.equal(result.freshRunBoundsValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForSourcePublication, true);
  assert.equal(result.freshLiveRunAuthorizedByThisPacket, false);
  assert.equal(result.stoppedRunRetryAuthorized, false);
});

test('source hashes bind the corrected runner and unchanged execution boundary', () => {
  for (const [sourceKey, hashKey] of [
    ['readinessPacket', 'readinessPacketSha256'],
    ['runner', 'runnerSha256'],
    ['executor', 'executorSha256'],
    ['config', 'configSha256'],
    ['route', 'routeSha256'],
  ]) {
    assert.equal(fileSha(packet.sourceBindings[sourceKey]), packet.sourceBindings[hashKey]);
  }
});

test('runner does not read or forward a raw CLI token', () => {
  const source = read('scripts/run-cad-upload-conversion-sandbox-qualification.js');
  assert.doesNotMatch(source, /DEFAULT_AUTH_PATH|VERCEL_AUTH_JSON/);
  assert.doesNotMatch(source, /readJson\([^\n]*auth\.json/);
  assert.match(source, /createExecutor\(\{ env: \{\}, onStage \}\)/);
  assert.match(source, /SANDBOX_AUTHORIZATION_FAILED/);
  assert.match(source, /Sandbox\.list/);
});

test('route remains fail-closed and isolated from the correction packet', () => {
  const route = read('server/cadUserUploadRouter.js');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /uploadConversionSandboxAuthCorrection/);
});

test('source-safe packet contains no executable provider access', () => {
  const source = read('offline/cad-convex/uploadConversionSandboxAuthCorrection.js');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
});
