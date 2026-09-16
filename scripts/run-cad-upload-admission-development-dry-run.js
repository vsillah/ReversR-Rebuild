#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner.json');
const { executeUploadAdmissionDevelopmentDryRun, inspectUploadAdmissionDevelopmentDryRunRunner } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentDryRunRunner');

const root = path.resolve(__dirname, '..');
const destination = path.join(root, config.sanitizedEvidenceDestination.root);
const evidencePath = path.join(destination, config.sanitizedEvidenceDestination.evidence);
const receiptPath = path.join(destination, config.sanitizedEvidenceDestination.receipt);
const sha = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

function writeJson600(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function emit(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

async function main() {
  const inspected = inspectUploadAdmissionDevelopmentDryRunRunner(config);
  if (!inspected.structureValid) {
    emit({ status: 'BLOCKED', code: 'RUNNER_CONFIG_INVALID' }, 2);
    return;
  }
  if (process.argv.includes('--preflight')) {
    emit({
      status: 'READY_WAITING_FOR_WINDOW',
      windowStartUtc: config.acceptedWindow.startUtc,
      windowEndUtc: config.acceptedWindow.expiresUtc,
      uploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    });
    return;
  }
  if (fs.existsSync(receiptPath)) {
    emit({ status: 'BLOCKED', code: 'RUN_ALREADY_RECORDED', receiptPath: path.relative(root, receiptPath) }, 2);
    return;
  }
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const result = await executeUploadAdmissionDevelopmentDryRun({ config });
  if (result.runCompleted !== true || result.unknownOutcome !== false) {
    writeJson600(path.join(destination, 'blocked-result.json'), result);
    emit({ status: 'BLOCKED', code: result.code || result.decision, resultPath: path.relative(root, path.join(destination, 'blocked-result.json')) }, 2);
    return;
  }
  writeJson600(evidencePath, result);
  const evidenceBytes = fs.readFileSync(evidencePath, 'utf8');
  const receipt = {
    schemaVersion: 1,
    mode: 'cad-upload-admission-development-dry-run-receipt',
    status: result.decision,
    runCompleted: true,
    unknownOutcome: false,
    evidenceSha256: sha(evidenceBytes),
    evidencePath: path.relative(root, evidencePath),
    runRef: config.acceptedWindow.runRef,
    mainCommit: 'ad06d66430d45cc24bfd5fad7501e2a04e0e68a4',
    production: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
    automaticRetry: false,
    secondRun: false,
    completedAtUtc: new Date().toISOString(),
  };
  writeJson600(receiptPath, receipt);
  emit({
    status: result.decision,
    runCompleted: true,
    unknownOutcome: false,
    evidenceSha256: receipt.evidenceSha256,
    evidencePath: receipt.evidencePath,
    receiptPath: path.relative(root, receiptPath),
    counts: result.counts,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    automaticRetry: false,
    secondRun: false,
  });
}

main().catch(error => {
  emit({ status: 'BLOCKED', code: 'CAD_UPLOAD_ADMISSION_DRY_RUN_FAILED', message: error.message }, 1);
});
