#!/usr/bin/env node
'use strict';

// Fixed one-use development runner. It accepts no CLI arguments, function
// references, URLs, identities, body bytes or enabling flags. The checked-in
// binding remains source-closed until a separate reviewed rebind installs the
// approval digest, exact synthetic ids, qualification commit and UTC window.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const BINDING_FILE = path.join(ROOT, 'convex/cadControlledUploadDevQualificationBinding.ts');
const APPROVAL_FILE = path.join(ROOT, '.local/cad-convex/controlled-upload-development-qualification/approval.json');
const LEDGER_FILE = path.join(ROOT, '.local/cad-convex/controlled-upload-development-qualification/attempt-ledger.json');
const MUTATION = 'cadControlledUploadDevQualification:qualifyOnce';
const QUERY = 'cadControlledUploadDevQualification:readSanitized';
const DEPLOYMENT = 'majestic-alligator-31';
const CLI_TIMEOUT_MS = 15_000;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const isSha1 = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = code => { throw new Error(code); };

function loadBinding() {
  const source = fs.readFileSync(BINDING_FILE, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  if (compiled.diagnostics?.length) fail('BINDING_COMPILE_FAILED');
  const exports = {};
  vm.runInNewContext(`(function(exports){${compiled.outputText}\n})(exports);`,
    { exports }, { timeout: 1000, filename: BINDING_FILE });
  return JSON.parse(JSON.stringify(exports.cadControlledUploadDevQualificationBinding));
}

function assertPrivateJson(file) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || (stat.mode & 0o777) !== 0o600) fail('PRIVATE_ARTIFACT_INVALID');
  const bytes = fs.readFileSync(file);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function validateApproval(approval, approvalSha256, binding) {
  if (!binding || !isSha1(binding.source?.qualificationCommit)
    || !isSha256(binding.approval?.recordSha256)
    || !Number.isSafeInteger(binding.approval.windowStartMs)
    || !Number.isSafeInteger(binding.approval.windowEndMs)
    || typeof binding.synthetic?.userId !== 'string'
    || typeof binding.synthetic?.loginSessionId !== 'string') fail('SOURCE_BINDING_CLOSED');
  const exactKeys = ['schemaVersion','mode','status','source','target','fixture','window','limits','rollback'];
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)
    || Object.keys(approval).sort().join(',') !== exactKeys.sort().join(',')
    || approval.schemaVersion !== 1
    || approval.mode !== 'cad-controlled-upload-development-qualification-one-use-approval'
    || approval.status !== 'APPROVED_FOR_ONE_DEVELOPMENT_QUALIFICATION'
    || approvalSha256 !== binding.approval.recordSha256) fail('APPROVAL_INVALID');
  if (JSON.stringify(approval.source) !== JSON.stringify({
    baseCommit: binding.source.baseCommit,
    qualificationCommit: binding.source.qualificationCommit,
    stopReceiptSha256: binding.source.stopReceiptSha256,
  }) || JSON.stringify(approval.target) !== JSON.stringify(binding.target)
    || JSON.stringify(approval.fixture) !== JSON.stringify(binding.fixture)) fail('APPROVAL_BINDING_MISMATCH');
  if (approval.window.startMs !== binding.approval.windowStartMs
    || approval.window.endMs !== binding.approval.windowEndMs
    || approval.window.endMs <= approval.window.startMs
    || approval.window.endMs > approval.window.startMs + binding.limits.maxWindowMs) fail('APPROVAL_WINDOW_INVALID');
  if (JSON.stringify(approval.limits) !== JSON.stringify({ runs: 1, sessions: 1, attempts: 1, retries: 0 })
    || JSON.stringify(approval.rollback) !== JSON.stringify({ first: true, terminal: true, noDelete: true })) {
    fail('APPROVAL_LIMITS_INVALID');
  }
  return true;
}

function sanitizeRemote(value, status) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('REMOTE_RESULT_INVALID');
  const required = {
    sourceOnly: true, developmentOnly: true, internalOnly: true, hostQualified: false,
    bodyAdmissionAuthorized: false, requestBodyReads: 0, conversionAuthorized: false,
    sandboxAuthorized: false, storageWritesAuthorized: false, productionChangesAuthorized: false,
    automaticRetries: 0, runSpent: true, sessionCreated: true, attemptCreated: true,
    rollbackArmed: true, fenceOpenedOnce: false, fenceOpen: false, consumed: false,
    closed: true, revoked: true, unknown: false, permanentStop: true,
  };
  if (Object.entries(required).some(([key, expected]) => value[key] !== expected)
    || !isSha256(value.bindingDigest) || !isSha256(value.resultDigest)) fail('REMOTE_RESULT_INVALID');
  return Object.freeze({
    schemaVersion: 1,
    mode: 'cad-controlled-upload-development-qualification-sanitized-result',
    status,
    code: String(value.code).slice(0, 128),
    ...required,
    bindingDigest: value.bindingDigest,
    resultDigest: value.resultDigest,
    retry: false,
    secondRun: false,
    rawIdentityRecorded: false,
    bodyBytesRecorded: false,
  });
}

async function executeOnce({ invokeMutation, reconcileQuery }) {
  let mutationCalls = 0;
  let queryCalls = 0;
  try {
    mutationCalls += 1;
    const value = await invokeMutation();
    const sanitized = sanitizeRemote(value, value.code === 'DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED'
      ? 'REPLAY_REJECTED_ALREADY_CONSUMED' : 'DEVELOPMENT_QUALIFICATION_TERMINAL_COMMITTED');
    return Object.freeze({ ...sanitized, mutationCalls, reconciliationQueries: queryCalls, outcomeUnknown: false });
  } catch {
    queryCalls += 1;
    try {
      const reconciled = await reconcileQuery();
      const sanitized = sanitizeRemote(reconciled, 'MUTATION_OUTCOME_UNKNOWN_RECONCILED_TERMINAL');
      return Object.freeze({ ...sanitized, mutationCalls, reconciliationQueries: queryCalls, outcomeUnknown: true });
    } catch {
      return Object.freeze({
        schemaVersion: 1,
        mode: 'cad-controlled-upload-development-qualification-sanitized-result',
        status: 'MUTATION_OUTCOME_UNKNOWN_STOPPED_NO_RETRY',
        sourceOnly: true,
        developmentOnly: true,
        internalOnly: true,
        hostQualified: false,
        bodyAdmissionAuthorized: false,
        requestBodyReads: 0,
        conversionAuthorized: false,
        sandboxAuthorized: false,
        storageWritesAuthorized: false,
        productionChangesAuthorized: false,
        automaticRetries: 0,
        retry: false,
        secondRun: false,
        mutationCalls,
        reconciliationQueries: queryCalls,
        outcomeUnknown: true,
        rawIdentityRecorded: false,
        bodyBytesRecorded: false,
      });
    }
  }
}

function invokeFixed(functionName, spawn = spawnSync) {
  if (![MUTATION, QUERY].includes(functionName)) fail('FUNCTION_REFERENCE_INVALID');
  const processResult = spawn('npx', ['--no-install', 'convex', 'run', functionName, '{}',
    '--deployment', DEPLOYMENT, '--typecheck', 'disable', '--codegen', 'disable'], {
    cwd: ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 128 * 1024,
    timeout: CLI_TIMEOUT_MS, killSignal: 'SIGKILL',
  });
  if (processResult.error || processResult.status !== 0 || String(processResult.stderr || '').trim()) {
    fail('FIXED_FUNCTION_INVOCATION_FAILED');
  }
  try { return JSON.parse(processResult.stdout); } catch { fail('FIXED_FUNCTION_RESULT_INVALID'); }
}

function assertLocalSource(binding, spawn = spawnSync) {
  const options = { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' };
  const head = spawn('git', ['rev-parse', 'HEAD'], options);
  if (head.error || head.status !== 0 || head.stdout.trim() !== binding.source.qualificationCommit) {
    fail('QUALIFICATION_SOURCE_COMMIT_MISMATCH');
  }
  const ancestry = spawn('git', ['merge-base', '--is-ancestor', binding.source.baseCommit,
    binding.source.qualificationCommit], options);
  if (ancestry.error || ancestry.status !== 0) fail('QUALIFICATION_SOURCE_LINEAGE_MISMATCH');
  const unstaged = spawn('git', ['diff', '--quiet', '--ignore-submodules', '--'], options);
  if (unstaged.error || unstaged.status !== 0) fail('QUALIFICATION_TRACKED_SOURCE_DIRTY');
  const staged = spawn('git', ['diff', '--cached', '--quiet', '--ignore-submodules', '--'], options);
  if (staged.error || staged.status !== 0) fail('QUALIFICATION_TRACKED_SOURCE_DIRTY');
}

function writeConsumedLedgerDurably(ledgerFile, value, fsImpl = fs) {
  if (!path.isAbsolute(ledgerFile) || path.normalize(ledgerFile) !== ledgerFile) fail('LEDGER_PATH_INVALID');
  const parent = path.dirname(ledgerFile);
  fsImpl.mkdirSync(parent, { recursive: true, mode: 0o700 });
  fsImpl.chmodSync(parent, 0o700);
  const parentStat = fsImpl.lstatSync(parent);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory() || (parentStat.mode & 0o777) !== 0o700) {
    fail('LEDGER_PARENT_INVALID');
  }
  const body = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  let fileDescriptor;
  try {
    fileDescriptor = fsImpl.openSync(ledgerFile, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
    fsImpl.fchmodSync(fileDescriptor, 0o600);
    const fileStat = fsImpl.fstatSync(fileDescriptor);
    if (!fileStat.isFile() || (fileStat.mode & 0o777) !== 0o600) fail('LEDGER_FILE_INVALID');
    let offset = 0;
    while (offset < body.length) {
      const written = fsImpl.writeSync(fileDescriptor, body, offset, body.length - offset, null);
      if (!Number.isSafeInteger(written) || written <= 0) fail('LEDGER_WRITE_INCOMPLETE');
      offset += written;
    }
    fsImpl.fsyncSync(fileDescriptor);
  } finally {
    if (fileDescriptor !== undefined) fsImpl.closeSync(fileDescriptor);
  }
  let directoryDescriptor;
  try {
    directoryDescriptor = fsImpl.openSync(parent, fs.constants.O_RDONLY);
    fsImpl.fsyncSync(directoryDescriptor);
  } finally {
    if (directoryDescriptor !== undefined) fsImpl.closeSync(directoryDescriptor);
  }
}

async function main() {
  if (process.argv.length !== 2) fail('CALLER_ARGUMENTS_FORBIDDEN');
  const binding = loadBinding();
  const artifact = assertPrivateJson(APPROVAL_FILE);
  const approvalSha = sha256(artifact.bytes);
  validateApproval(artifact.value, approvalSha, binding);
  assertLocalSource(binding);
  if (fs.existsSync(LEDGER_FILE)) fail('LOCAL_ATTEMPT_ALREADY_CONSUMED');
  writeConsumedLedgerDurably(LEDGER_FILE, {
    schemaVersion: 1,
    mode: 'cad-controlled-upload-development-qualification-attempt-ledger',
    status: 'CONSUMED_BEFORE_MUTATION',
    sourceCommit: binding.source.qualificationCommit,
    approvalSha256: approvalSha,
    retry: false,
    secondRun: false,
  });
  const output = await executeOnce({
    invokeMutation: () => invokeFixed(MUTATION),
    reconcileQuery: () => invokeFixed(QUERY),
  });
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  if (output.status === 'MUTATION_OUTCOME_UNKNOWN_STOPPED_NO_RETRY') process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
  process.stderr.write(`${String(error.message).replace(/[^A-Z0-9_:.-]/gi, '_').slice(0, 160)}\n`);
  process.exitCode = 1;
});

module.exports = {
  CLI_TIMEOUT_MS,
  loadBinding,
  validateApproval,
  sanitizeRemote,
  executeOnce,
  invokeFixed,
  assertLocalSource,
  writeConsumedLedgerDurably,
};
