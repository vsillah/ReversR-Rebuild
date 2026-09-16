const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const closeout = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunCloseout.json');
const { inspectUploadAdmissionDevelopmentDryRunCloseout } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunCloseout');

const root = path.resolve(__dirname, '..');

test('dry-run closeout records successful execution and evidence hashes', () => {
  const result = inspectUploadAdmissionDevelopmentDryRunCloseout(closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.hashesValid, true);
  assert.equal(result.resultValid, true);
  assert.equal(closeout.result.runCompleted, true);
  assert.equal(closeout.result.unknownOutcome, false);
  assert.equal(closeout.evidence.sanitizedEvidenceSha256,
    '78d5817a5d886b1b0646356bfa5c1fe53d6de9584f93e27e2c6ceb21dfc6064b');
  assert.equal(closeout.evidence.sanitizedReceiptSha256,
    '0d8f48293e6fab39727b7cfb10985480352c06e9e46f534fd6f2c3c02bc32968');
});

test('stale receipt commit caveat is captured without authorizing a rerun', () => {
  const result = inspectUploadAdmissionDevelopmentDryRunCloseout(closeout);
  assert.equal(result.caveatRecorded, true);
  assert.equal(closeout.receiptCaveat.receiptMainCommit,
    'ad06d66430d45cc24bfd5fad7501e2a04e0e68a4');
  assert.equal(closeout.receiptCaveat.verifiedRuntimeMainCommit,
    '2319c1288217b78bdfeae028a62ab29e45fd635a');
  assert.equal(closeout.receiptCaveat.requiresRerun, false);
  assert.equal(result.rerunAuthorized, false);
});

test('runner receipt source stamp is corrected for future receipts', () => {
  const runner = fs.readFileSync(path.join(root, 'scripts/run-cad-upload-admission-development-dry-run.js'), 'utf8');
  assert.match(runner, /mainCommit: '2319c1288217b78bdfeae028a62ab29e45fd635a'/);
  assert.doesNotMatch(runner, /mainCommit: 'ad06d66430d45cc24bfd5fad7501e2a04e0e68a4'/);
});

test('closeout preserves all risky authorities closed', () => {
  const result = inspectUploadAdmissionDevelopmentDryRunCloseout(closeout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.uploadActivationAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
  assert.equal(closeout.authorityPreservedByCloseout.secondRunAuthorized, false);
});

test('closeout source remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentDryRunCloseout.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
