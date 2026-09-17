const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const closeout = require('../offline/cad-convex/uploadConversionSandboxRunCloseout.json');
const correction = require('../offline/cad-convex/uploadConversionSandboxAuthCorrection.json');
const { inspectUploadConversionSandboxRunCloseout } =
  require('../offline/cad-convex/uploadConversionSandboxRunCloseout');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fileSha = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');

test('closeout accepts the single successful public-synthetic conversion', () => {
  const result = inspectUploadConversionSandboxRunCloseout(closeout, correction);
  assert.equal(result.structureValid, true);
  assert.equal(result.correctionBound, true);
  assert.equal(result.runValid, true);
  assert.equal(result.conversionValid, true);
  assert.equal(result.sandboxValid, true);
  assert.equal(result.evidenceValid, true);
  assert.equal(result.countsValid, true);
  assert.equal(result.costBounded, true);
  assert.equal(result.smokeValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.developmentPublicSyntheticConversionQualified, true);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
});

test('closeout binds the merged auth correction and unchanged route', () => {
  assert.equal(fileSha(closeout.sourceBindings.authCorrectionPacket),
    closeout.sourceBindings.authCorrectionPacketSha256);
  assert.equal(fileSha(closeout.sourceBindings.runner), closeout.sourceBindings.runnerSha256);
  assert.equal(fileSha(closeout.sourceBindings.route), closeout.sourceBindings.routeSha256);
  const route = read(closeout.sourceBindings.route);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('source-safe closeout has no provider execution path', () => {
  const source = read('offline/cad-convex/uploadConversionSandboxRunCloseout.js');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
  assert.equal(closeout.run.automaticRetry, false);
  assert.equal(closeout.run.secondRun, false);
  assert.equal(closeout.operationCounts.storeMutations, 0);
});
