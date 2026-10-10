#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DISPOSITION_SHA256 = 'd56fe330b73e176566d0b75be59b2492dc20fe27b841eac428183ce5938d8705';
const BASE_COMMIT = '0ba409d5843d4c65cbfcf3abea6f902396d2951f';
const TARGET = Object.freeze({
  teamSlug: 'vambah-sillah',
  projectSlug: 'reversr-cad-auth-dev',
  deploymentName: 'majestic-alligator-31',
  deploymentType: 'development',
  cloudUrl: 'https://majestic-alligator-31.convex.cloud',
});
const CONTROLLED_UPLOAD_TABLES = Object.freeze([
  'cadControlledUploadAttempts',
  'cadControlledUploadEvidence',
  'cadControlledUploadGrants',
  'cadControlledUploadHostPrincipals',
  'cadControlledUploadReceipts',
  'cadControlledUploadScopes',
  'cadControlledUploadSessionTombstones',
]);
const EMPTY_TABLE_NOTICE = 'There are no documents in this table.';
const OCCUPANCY_DIAGNOSTICS = Object.freeze({
  NONE: 'NONE',
  EMPTY_NOTICE_ACCEPTED: 'EMPTY_NOTICE_ACCEPTED',
  EXECUTABLE_FAILURE: 'EXECUTABLE_FAILURE',
  ARGUMENT_REJECTED: 'ARGUMENT_REJECTED',
  TARGET_OR_AUTH_REJECTED: 'TARGET_OR_AUTH_REJECTED',
  PROCESS_EXIT_FAILURE: 'PROCESS_EXIT_FAILURE',
  STDERR_PRESENT: 'STDERR_PRESENT',
  RESPONSE_SHAPE_INVALID: 'RESPONSE_SHAPE_INVALID',
  JSON_INVALID: 'JSON_INVALID',
});

const fail = code => { throw new Error(code); };
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function resolvePrivateArtifact(relativePath, label) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) fail(`${label}_PATH_INVALID`);
  const resolved = path.resolve(ROOT, relativePath);
  const privateRoot = path.join(ROOT, '.local', 'cad-convex') + path.sep;
  if (!resolved.startsWith(privateRoot)) fail(`${label}_PATH_INVALID`);
  return resolved;
}

function readPrivateArtifact(relativePath, expectedSha256, label) {
  if (!isSha256(expectedSha256)) fail(`${label}_SHA_INVALID`);
  const resolved = resolvePrivateArtifact(relativePath, label);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) fail(`${label}_SYMLINK_FORBIDDEN`);
  if (!stat.isFile() || (stat.mode & 0o777) !== 0o600) fail(`${label}_MODE_INVALID`);
  const bytes = fs.readFileSync(resolved);
  if (sha256(bytes) !== expectedSha256) fail(`${label}_SHA_MISMATCH`);
  return { resolved, bytes };
}

function assertExactTarget(target, label = 'TARGET') {
  if (!target
    || !require('node:util').isDeepStrictEqual(Object.keys(target).sort(), Object.keys(TARGET).sort())
    || Object.keys(TARGET).some(key => target[key] !== TARGET[key])) fail(`${label}_MISMATCH`);
}

function runChecked(command, args, { cwd = ROOT, spawn = spawnSync } = {}) {
  const result = spawn(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim().slice(0, 500);
    fail(`PREFLIGHT_FAILED:${command}:${detail}`);
  }
  return result;
}

function runOfflinePreflight(options = {}) {
  runChecked('npm', ['run', 'typecheck', '--', '--pretty', 'false'], options);
  runChecked('npm', ['run', 'cad:convex:codegen:check'], options);
  return Object.freeze({
    status: 'OFFLINE_PREFLIGHT_PASSED',
    providerRequests: 0,
    checks: [
      'npm run typecheck -- --pretty false',
      'npm run cad:convex:codegen:check',
    ],
    deploymentCommand: [
      'npx', '--no-install', 'convex', 'dev', '--once',
      '--env-file', '<approved-env-file>',
      '--typecheck', 'disable', '--codegen', 'disable', '--tail-logs', 'disable',
    ].join(' '),
  });
}

function validateApproval(approval, { sourceCommit }) {
  if (!approval || approval.schemaVersion !== 1
    || approval.mode !== 'cad-convex-development-deployment-one-use-approval'
    || approval.status !== 'APPROVED_FOR_ONE_DEVELOPMENT_DEPLOYMENT') fail('APPROVAL_INVALID');
  assertExactTarget(approval.target, 'APPROVAL_TARGET');
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)
    || approval.sourceCommit !== sourceCommit
    || approval.baseCommit !== BASE_COMMIT) {
    fail('APPROVAL_SOURCE_MISMATCH');
  }
  if (approval.dispositionSha256 !== DISPOSITION_SHA256
    || approval.priorAttemptConsumed !== true || approval.freshApproval !== true) {
    fail('APPROVAL_PREDECESSOR_GATE_INVALID');
  }
  if (!approval.limits || approval.limits.attempts !== 1
    || approval.limits.retry !== false || approval.limits.secondRun !== false) {
    fail('APPROVAL_LIMITS_INVALID');
  }
  if (!approval.rollback || approval.rollback.ready !== true
    || approval.rollback.first !== true || approval.rollback.noDelete !== true) {
    fail('ROLLBACK_GATE_INVALID');
  }
  return approval;
}

function validateRollbackReceipt(approval) {
  const artifact = readPrivateArtifact(
    approval.rollback.receiptPath,
    approval.rollback.receiptSha256,
    'ROLLBACK_RECEIPT',
  );
  const receipt = JSON.parse(artifact.bytes.toString('utf8'));
  assertExactTarget(receipt.target, 'ROLLBACK_TARGET');
  if (receipt.schemaVersion !== 1
    || receipt.mode !== 'cad-convex-development-rollback-readiness-receipt'
    || receipt.status !== 'ROLLBACK_READY'
    || receipt.ready !== true
    || receipt.noDelete !== true
    || receipt.retainedWorktreeUntouched !== true) fail('ROLLBACK_RECEIPT_INVALID');
  return artifact;
}

function assertCleanApprovedSource(sourceCommit, options = {}) {
  const head = runChecked('git', ['rev-parse', 'HEAD'], options).stdout.trim();
  if (head !== sourceCommit) fail('SOURCE_COMMIT_MISMATCH');
  const status = runChecked('git', ['status', '--porcelain', '--untracked-files=no'], options).stdout.trim();
  if (status) fail('SOURCE_TREE_NOT_CLEAN');
}

function assertApprovedLineage(sourceCommit, options = {}) {
  runChecked('git', ['merge-base', '--is-ancestor', BASE_COMMIT, sourceCommit], options);
}

function buildDeploymentArgs(envFile) {
  return [
    '--no-install', 'convex', 'dev', '--once',
    '--env-file', envFile,
    '--typecheck', 'disable',
    '--codegen', 'disable',
    '--tail-logs', 'disable',
  ];
}

function buildOccupancyArgs(table) {
  if (!CONTROLLED_UPLOAD_TABLES.includes(table)) fail('OCCUPANCY_TABLE_INVALID');
  return [
    '--no-install', 'convex', 'data', table,
    '--deployment', TARGET.deploymentName,
    '--limit', '1',
    '--format', 'jsonArray',
  ];
}

function classifyProcessFailure(stderr) {
  const message = typeof stderr === 'string' ? stderr : '';
  if (/unknown option|too many arguments|invalid argument|expected argument/i.test(message)) {
    return OCCUPANCY_DIAGNOSTICS.ARGUMENT_REJECTED;
  }
  if (/not logged in|authenticat|unauthori[sz]ed|forbidden|access denied|deployment[^\n]*(not found|missing)|no project configured/i.test(message)) {
    return OCCUPANCY_DIAGNOSTICS.TARGET_OR_AUTH_REJECTED;
  }
  return OCCUPANCY_DIAGNOSTICS.PROCESS_EXIT_FAILURE;
}

function occupancyClassification(status, diagnostic) {
  return Object.freeze({ status, diagnostic });
}

function classifyOccupancyResult(result) {
  if (!result || result.error) {
    return occupancyClassification('UNKNOWN', OCCUPANCY_DIAGNOSTICS.EXECUTABLE_FAILURE);
  }
  if (result.status !== 0) {
    return occupancyClassification('UNKNOWN', classifyProcessFailure(result.stderr));
  }
  if (typeof result.stdout !== 'string') {
    return occupancyClassification('UNKNOWN', OCCUPANCY_DIAGNOSTICS.RESPONSE_SHAPE_INVALID);
  }
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
  if (stderr === EMPTY_TABLE_NOTICE && result.stdout.trim() === '') {
    return occupancyClassification('EMPTY', OCCUPANCY_DIAGNOSTICS.EMPTY_NOTICE_ACCEPTED);
  }
  if (stderr !== '') {
    return occupancyClassification('UNKNOWN', OCCUPANCY_DIAGNOSTICS.STDERR_PRESENT);
  }
  try {
    const rows = JSON.parse(result.stdout);
    if (!Array.isArray(rows) || rows.length > 1) {
      return occupancyClassification('UNKNOWN', OCCUPANCY_DIAGNOSTICS.RESPONSE_SHAPE_INVALID);
    }
    return occupancyClassification(rows.length === 0 ? 'EMPTY' : 'NONEMPTY', OCCUPANCY_DIAGNOSTICS.NONE);
  } catch {
    return occupancyClassification('UNKNOWN', OCCUPANCY_DIAGNOSTICS.JSON_INVALID);
  }
}

function inspectControlledUploadOccupancy({ spawn = spawnSync } = {}) {
  const findings = [];
  for (const table of CONTROLLED_UPLOAD_TABLES) {
    let result;
    try {
      result = spawn('npx', buildOccupancyArgs(table), {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 256 * 1024,
      });
    } catch {
      result = { status: null, stdout: '', stderr: '' };
    }
    const classification = classifyOccupancyResult(result);
    findings.push(Object.freeze({ table, ...classification }));
    if (classification.status !== 'EMPTY') break;
  }
  return Object.freeze(findings);
}

function writeAttemptLedger(file, value, flag = 'wx') {
  const body = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(file, body, { flag, mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function executeApprovedOnce({ approvalPath, approvalSha256, spawn = spawnSync, now = Date.now }) {
  const approvalArtifact = readPrivateArtifact(approvalPath, approvalSha256, 'APPROVAL');
  const approval = JSON.parse(approvalArtifact.bytes.toString('utf8'));
  validateApproval(approval, { sourceCommit: approval.sourceCommit });
  validateRollbackReceipt(approval);
  const envArtifact = readPrivateArtifact(approval.envFile.path, approval.envFile.sha256, 'ENV_FILE');
  const attemptLedger = resolvePrivateArtifact(approval.attemptLedgerPath, 'ATTEMPT_LEDGER');
  assertCleanApprovedSource(approval.sourceCommit, { spawn });
  assertApprovedLineage(approval.sourceCommit, { spawn });
  runOfflinePreflight({ spawn });

  if (fs.existsSync(attemptLedger)) fail('ATTEMPT_ALREADY_CONSUMED');
  const consumedAtUtc = new Date(now()).toISOString();
  writeAttemptLedger(attemptLedger, {
    schemaVersion: 1,
    mode: 'cad-convex-development-deployment-attempt-ledger',
    status: 'CONSUMED_BEFORE_PROVIDER_REQUEST',
    consumedAtUtc,
    sourceCommit: approval.sourceCommit,
    target: TARGET,
    approvalSha256,
    retry: false,
    secondRun: false,
  });

  const incidentalEnv = path.join(ROOT, '.env.local');
  if (fs.existsSync(incidentalEnv)) fail('INCIDENTAL_ENV_ALREADY_PRESENT');
  const args = buildDeploymentArgs(path.relative(ROOT, envArtifact.resolved));
  let result;
  try {
    result = spawn('npx', args, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
  } finally {
    if (fs.existsSync(incidentalEnv)) fs.unlinkSync(incidentalEnv);
  }
  const outcome = result.error ? 'UNKNOWN_ERROR' : result.status === 0 ? 'COMPLETED' : 'STOPPED_NO_RETRY';
  writeAttemptLedger(attemptLedger, {
    schemaVersion: 1,
    mode: 'cad-convex-development-deployment-attempt-ledger',
    status: outcome,
    consumedAtUtc,
    completedAtUtc: new Date(now()).toISOString(),
    sourceCommit: approval.sourceCommit,
    target: TARGET,
    approvalSha256,
    exitCode: Number.isInteger(result.status) ? result.status : null,
    retry: false,
    secondRun: false,
  }, 'w');
  if (result.error) throw result.error;
  if (result.status !== 0) fail('DEPLOYMENT_STOPPED_NO_RETRY');
  return { status: outcome, exitCode: result.status, args };
}

function usage() {
  return [
    'Usage:',
    '  node scripts/cad-convex-development-deploy-preflight.js --preflight',
    '  node scripts/cad-convex-development-deploy-preflight.js --occupancy-check',
    '  node scripts/cad-convex-development-deploy-preflight.js --execute-approved-once <.local approval.json> --approval-sha256 <sha256>',
    '',
    'Preflight is offline. Occupancy checking requires separate exact live-read approval.',
    'Deployment execution requires a fresh exact one-use approval and rollback-readiness receipt.',
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--preflight') {
    process.stdout.write(JSON.stringify(runOfflinePreflight(), null, 2) + '\n');
    return;
  }
  if (argv.length === 1 && argv[0] === '--occupancy-check') {
    const findings = inspectControlledUploadOccupancy();
    process.stdout.write(findings.map(({ table, status, diagnostic }) => (
      `${table}\t${status}\t${diagnostic}`
    )).join('\n') + '\n');
    if (findings.some(({ status }) => status === 'UNKNOWN')) process.exitCode = 2;
    else if (findings.some(({ status }) => status === 'NONEMPTY')) process.exitCode = 3;
    return;
  }
  if (argv.length === 4 && argv[0] === '--execute-approved-once' && argv[2] === '--approval-sha256') {
    const result = executeApprovedOnce({ approvalPath: argv[1], approvalSha256: argv[3] });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  process.stderr.write(usage() + '\n');
  process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  BASE_COMMIT,
  CONTROLLED_UPLOAD_TABLES,
  DISPOSITION_SHA256,
  EMPTY_TABLE_NOTICE,
  OCCUPANCY_DIAGNOSTICS,
  TARGET,
  buildDeploymentArgs,
  buildOccupancyArgs,
  classifyOccupancyResult,
  executeApprovedOnce,
  inspectControlledUploadOccupancy,
  runOfflinePreflight,
  validateApproval,
};
