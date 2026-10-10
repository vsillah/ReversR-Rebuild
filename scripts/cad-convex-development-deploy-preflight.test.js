const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  BASE_COMMIT,
  CONTROLLED_UPLOAD_TABLES,
  DISPOSITION_SHA256,
  EMPTY_TABLE_NOTICE,
  OCCUPANCY_DIAGNOSTICS,
  TARGET,
  buildDeploymentArgs,
  buildOccupancyArgs,
  executeApprovedOnce,
  inspectControlledUploadOccupancy,
  runOfflinePreflight,
  validateApproval,
} = require('./cad-convex-development-deploy-preflight');

const sourceCommit = '1'.repeat(40);
const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const approval = () => ({
  schemaVersion: 1,
  mode: 'cad-convex-development-deployment-one-use-approval',
  status: 'APPROVED_FOR_ONE_DEVELOPMENT_DEPLOYMENT',
  target: { ...TARGET },
  baseCommit: BASE_COMMIT,
  sourceCommit,
  dispositionSha256: DISPOSITION_SHA256,
  priorAttemptConsumed: true,
  freshApproval: true,
  limits: { attempts: 1, retry: false, secondRun: false },
  rollback: { ready: true, first: true, noDelete: true },
});

test('offline preflight runs only the reviewed root and generated-binding checks', () => {
  const calls = [];
  const spawn = (command, args) => {
    calls.push([command, args]);
    return { status: 0, stdout: '', stderr: '' };
  };
  const result = runOfflinePreflight({ spawn });
  assert.deepEqual(calls, [
    ['npm', ['run', 'typecheck', '--', '--pretty', 'false']],
    ['npm', ['run', 'cad:convex:codegen:check']],
  ]);
  assert.equal(result.providerRequests, 0);
  assert.match(result.deploymentCommand, /--typecheck disable/);
  assert.match(result.deploymentCommand, /--codegen disable/);
  assert.match(result.deploymentCommand, /--tail-logs disable/);
});

test('deployment command is one-shot, no-run, no-retry, and disables duplicate checks', () => {
  const args = buildDeploymentArgs('.local/cad-convex/fresh-approved/deployment.env');
  assert.deepEqual(args, [
    '--no-install', 'convex', 'dev', '--once',
    '--env-file', '.local/cad-convex/fresh-approved/deployment.env',
    '--typecheck', 'disable', '--codegen', 'disable', '--tail-logs', 'disable',
  ]);
  const command = args.join(' ');
  assert.doesNotMatch(command, /--until-success|--run\b|--start\b|\bdeploy\b/);
});

test('occupancy checker is fixed to seven tables and emits only sanitized classifications', () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push([command, args, options]);
    return { status: 0, stdout: '[]\n', stderr: '' };
  };
  const findings = inspectControlledUploadOccupancy({ spawn });
  assert.deepEqual(findings, CONTROLLED_UPLOAD_TABLES.map(table => ({
    table,
    status: 'EMPTY',
    diagnostic: OCCUPANCY_DIAGNOSTICS.NONE,
  })));
  assert.equal(calls.length, 7);
  for (let index = 0; index < calls.length; index += 1) {
    assert.equal(calls[index][0], 'npx');
    assert.deepEqual(calls[index][1], buildOccupancyArgs(CONTROLLED_UPLOAD_TABLES[index]));
    assert.equal(calls[index][2].stdio, 'pipe');
    assert.equal(calls[index][2].maxBuffer, 256 * 1024);
  }
  assert.throws(() => buildOccupancyArgs('authAccounts'), /OCCUPANCY_TABLE_INVALID/);
});

test('occupancy checker discards nonempty row contents and stops without retry', () => {
  const privateFixture = {
    _id: 'private-id-must-not-escape',
    credential: 'private-value-must-not-escape',
  };
  let calls = 0;
  const findings = inspectControlledUploadOccupancy({
    spawn: () => {
      calls += 1;
      return { status: 0, stdout: JSON.stringify([privateFixture]), stderr: '' };
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(findings, [{
    table: CONTROLLED_UPLOAD_TABLES[0],
    status: 'NONEMPTY',
    diagnostic: OCCUPANCY_DIAGNOSTICS.NONE,
  }]);
  const serialized = JSON.stringify(findings);
  assert.doesNotMatch(serialized, /private-id|private-value|credential/);
});

test('occupancy checker accepts only the official empty-table stderr sentinel', () => {
  const findings = inspectControlledUploadOccupancy({
    spawn: () => ({ status: 0, stdout: '', stderr: `${EMPTY_TABLE_NOTICE}\n` }),
  });
  assert.deepEqual(findings, CONTROLLED_UPLOAD_TABLES.map(table => ({
    table,
    status: 'EMPTY',
    diagnostic: OCCUPANCY_DIAGNOSTICS.EMPTY_NOTICE_ACCEPTED,
  })));
});

test('occupancy checker sanitizes every failure category without leakage', () => {
  const cases = [
    [{ status: 1, stdout: '', stderr: 'unknown option with private path' }, OCCUPANCY_DIAGNOSTICS.ARGUMENT_REJECTED],
    [{ status: 1, stdout: '', stderr: 'unauthorized private account' }, OCCUPANCY_DIAGNOSTICS.TARGET_OR_AUTH_REJECTED],
    [{ status: 1, stdout: '', stderr: 'private provider error' }, OCCUPANCY_DIAGNOSTICS.PROCESS_EXIT_FAILURE],
    [{ status: 0, stdout: '{malformed', stderr: '' }, OCCUPANCY_DIAGNOSTICS.JSON_INVALID],
    [{ status: 0, stdout: '{}', stderr: '' }, OCCUPANCY_DIAGNOSTICS.RESPONSE_SHAPE_INVALID],
    [{ status: 0, stdout: '[{},{}]', stderr: '' }, OCCUPANCY_DIAGNOSTICS.RESPONSE_SHAPE_INVALID],
    [{ status: 0, stdout: '[]', stderr: 'unexpected warning with private content' }, OCCUPANCY_DIAGNOSTICS.STDERR_PRESENT],
    [{ error: new Error('private process failure'), status: null, stdout: '', stderr: '' }, OCCUPANCY_DIAGNOSTICS.EXECUTABLE_FAILURE],
  ];
  for (const [result, diagnostic] of cases) {
    let calls = 0;
    const findings = inspectControlledUploadOccupancy({
      spawn: () => {
        calls += 1;
        return result;
      },
    });
    assert.equal(calls, 1);
    assert.deepEqual(findings, [{
      table: CONTROLLED_UPLOAD_TABLES[0],
      status: 'UNKNOWN',
      diagnostic,
    }]);
    assert.equal(JSON.stringify(findings).includes('private'), false);
  }
});

test('approval binds the exact development target, consumed predecessor, and fresh one-use limits', () => {
  assert.equal(validateApproval(approval(), { sourceCommit }).target.deploymentName, 'majestic-alligator-31');
  for (const mutate of [
    value => { value.target.deploymentName = 'other'; },
    value => { value.baseCommit = '0'.repeat(40); },
    value => { value.dispositionSha256 = '0'.repeat(64); },
    value => { value.priorAttemptConsumed = false; },
    value => { value.freshApproval = false; },
    value => { value.limits.attempts = 2; },
    value => { value.limits.retry = true; },
    value => { value.limits.secondRun = true; },
    value => { value.rollback.ready = false; },
    value => { value.rollback.first = false; },
    value => { value.rollback.noDelete = false; },
  ]) {
    const candidate = approval();
    mutate(candidate);
    assert.throws(() => validateApproval(candidate, { sourceCommit }));
  }
});

test('approved execution consumes before one exact provider spawn and rejects a second attempt', () => {
  const relativeDir = `.local/cad-convex/preflight-test-${process.pid}-${Date.now()}`;
  const dir = path.join(root, relativeDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    const writePrivate = (name, bytes) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, bytes, { mode: 0o600 });
      fs.chmodSync(file, 0o600);
      return { path: `${relativeDir}/${name}`, sha256: digest(bytes) };
    };
    const rollbackBytes = Buffer.from(JSON.stringify({
      schemaVersion: 1,
      mode: 'cad-convex-development-rollback-readiness-receipt',
      status: 'ROLLBACK_READY',
      target: TARGET,
      ready: true,
      noDelete: true,
      retainedWorktreeUntouched: true,
    }) + '\n');
    const rollback = writePrivate('rollback.json', rollbackBytes);
    const envFile = writePrivate('deployment.env', Buffer.from('SYNTHETIC_TEST_BINDING\n'));
    const value = {
      ...approval(),
      rollback: {
        ...approval().rollback,
        receiptPath: rollback.path,
        receiptSha256: rollback.sha256,
      },
      envFile,
      attemptLedgerPath: `${relativeDir}/attempt.json`,
    };
    const approvalBytes = Buffer.from(JSON.stringify(value) + '\n');
    const approvalFile = writePrivate('approval.json', approvalBytes);
    const calls = [];
    const spawn = (command, args) => {
      calls.push([command, args]);
      if (command === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: `${sourceCommit}\n`, stderr: '' };
      if (command === 'git' && args[0] === 'status') return { status: 0, stdout: '', stderr: '' };
      if (command === 'git' && args[0] === 'merge-base') return { status: 0, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    };
    const result = executeApprovedOnce({
      approvalPath: approvalFile.path,
      approvalSha256: approvalFile.sha256,
      spawn,
      now: () => Date.parse('2026-10-09T18:00:00Z'),
    });
    assert.equal(result.status, 'COMPLETED');
    const providerCalls = calls.filter(([command]) => command === 'npx');
    assert.equal(providerCalls.length, 1);
    assert.deepEqual(providerCalls[0][1], buildDeploymentArgs(envFile.path));
    const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'attempt.json'), 'utf8'));
    assert.equal(ledger.status, 'COMPLETED');
    assert.equal(ledger.retry, false);
    assert.equal(ledger.secondRun, false);
    assert.throws(() => executeApprovedOnce({
      approvalPath: approvalFile.path,
      approvalSha256: approvalFile.sha256,
      spawn,
      now: () => Date.parse('2026-10-09T18:01:00Z'),
    }), /ATTEMPT_ALREADY_CONSUMED/);
    assert.equal(calls.filter(([command]) => command === 'npx').length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
