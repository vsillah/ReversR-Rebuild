'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runner = require('./cad-controlled-upload-development-qualification-runner');
const { source, binding, resetBinding, installBinding, emptyRows, syntheticDb } =
  require('./helpers/cad-controlled-upload-dev-qualification-fixture');

function assertPrivateClosed(value) {
  assert.equal(value.sourceOnly, true);
  assert.equal(value.developmentOnly, true);
  assert.equal(value.internalOnly, true);
  assert.equal(value.hostQualified, false);
  assert.equal(value.bodyAdmissionAuthorized, false);
  assert.equal(value.requestBodyReads, 0);
  assert.equal(value.conversionAuthorized, false);
  assert.equal(value.sandboxAuthorized, false);
  assert.equal(value.storageWritesAuthorized, false);
  assert.equal(value.productionChangesAuthorized, false);
  assert.equal(value.automaticRetries, 0);
}

test.afterEach(resetBinding);

test('source remains closed until a future exact approval rebind installs every run field', async () => {
  const database = syntheticDb(emptyRows());
  const value = await database.transaction(db => source.executeDevelopmentQualification(db, 2_000_000,
    binding.target.cloudUrl));
  assertPrivateClosed(value);
  assert.equal(value.code, 'DEVELOPMENT_QUALIFICATION_SOURCE_CLOSED');
  assert.equal(database.writes(), 0);
});

test('valid qualification atomically creates one terminal session and one spent attempt', async () => {
  const now = installBinding();
  const database = syntheticDb(emptyRows());
  const value = await database.transaction(db => source.executeDevelopmentQualification(db, now, binding.target.cloudUrl));
  assertPrivateClosed(value);
  assert.equal(value.code, 'DEVELOPMENT_QUALIFICATION_TERMINAL_COMMITTED');
  assert.equal(value.modelAccepted, true);
  assert.equal(value.sessionCreated, true);
  assert.equal(value.attemptCreated, true);
  assert.equal(value.rollbackArmed, true);
  assert.equal(value.fenceOpenedOnce, false);
  assert.equal(value.fenceOpen, false);
  assert.equal(value.consumed, false);
  assert.equal(value.closed, true);
  assert.equal(value.revoked, true);
  const rows = database.tables();
  for (const table of ['cadUploadSessions','cadControlledUploadGrants','cadControlledUploadScopes',
    'cadControlledUploadAttempts','cadControlledUploadSessionTombstones','cadControlledUploadReceipts',
    'cadControlledUploadHostPrincipals']) assert.equal(rows[table].length, 1, table);
  assert.deepEqual({ status: rows.cadUploadSessions[0].status, allowed: rows.cadUploadSessions[0].cadUploadAllowed },
    { status: 'revoked', allowed: false });
  assert.deepEqual({
    spent: rows.cadControlledUploadAttempts[0].attemptSpent,
    rollback: rows.cadControlledUploadAttempts[0].rollbackArmed,
    opened: rows.cadControlledUploadAttempts[0].fenceOpenedOnce,
    open: rows.cadControlledUploadAttempts[0].fenceOpen,
    consumed: rows.cadControlledUploadAttempts[0].consumed,
    closed: rows.cadControlledUploadAttempts[0].closed,
    revoked: rows.cadControlledUploadAttempts[0].revoked,
  }, { spent: true, rollback: true, opened: false, open: false, consumed: false, closed: true, revoked: true });
});

test('replay, cloned restart and concurrent serialized calls preserve the one-use fence', async () => {
  const now = installBinding();
  const database = syntheticDb(emptyRows());
  const first = await database.transaction(db => source.executeDevelopmentQualification(db, now, binding.target.cloudUrl));
  const writes = database.writes();
  const replay = await database.transaction(db => source.executeDevelopmentQualification(db, now + 1, binding.target.cloudUrl));
  assert.equal(first.code, 'DEVELOPMENT_QUALIFICATION_TERMINAL_COMMITTED');
  assert.equal(replay.code, 'DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED');
  assert.equal(database.writes(), writes);
  const restarted = syntheticDb(structuredClone(database.tables()));
  const afterRestart = await restarted.transaction(db => source.executeDevelopmentQualification(db, now + 2,
    binding.target.cloudUrl));
  assert.equal(afterRestart.code, 'DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED');
  assert.equal(restarted.writes(), 0);

  const concurrent = syntheticDb(emptyRows());
  let tail = Promise.resolve();
  const serialized = fn => {
    const next = tail.then(() => concurrent.transaction(fn));
    tail = next.catch(() => {});
    return next;
  };
  const values = await Promise.all([
    serialized(db => source.executeDevelopmentQualification(db, now, binding.target.cloudUrl)),
    serialized(db => source.executeDevelopmentQualification(db, now, binding.target.cloudUrl)),
  ]);
  assert.deepEqual(values.map(value => value.code).sort(), [
    'DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED',
    'DEVELOPMENT_QUALIFICATION_TERMINAL_COMMITTED',
  ]);
  assert.equal(concurrent.tables().cadControlledUploadAttempts.length, 1);
});

test('malformed approval binding and wrong source, target or fixture fail before writes', async () => {
  const now = installBinding();
  const cases = [
    () => { binding.approval.recordSha256 = 'bad'; },
    () => { binding.source.baseCommit = '0'.repeat(40); },
    () => { binding.target.deploymentName = 'wrong-target'; },
    () => { binding.fixture.sha256 = '0'.repeat(64); },
    () => { binding.synthetic.sessionId = 'caller-selected-session'; },
  ];
  for (const mutate of cases) {
    installBinding(now);
    mutate();
    const database = syntheticDb(emptyRows());
    const value = await database.transaction(db => source.executeDevelopmentQualification(db, now,
      binding.target.cloudUrl));
    assert.equal(value.code, 'DEVELOPMENT_QUALIFICATION_SOURCE_CLOSED');
    assert.equal(database.writes(), 0);
  }
});

test('identity mismatch and receipt-write failure cannot leave partial durable state', async () => {
  const now = installBinding();
  const wrongRows = emptyRows();
  wrongRows.users[0].email = 'other@example.invalid';
  const mismatch = syntheticDb(wrongRows);
  assert.equal((await mismatch.transaction(db => source.executeDevelopmentQualification(db, now,
    binding.target.cloudUrl))).code,
    'DEVELOPMENT_QUALIFICATION_IDENTITY_MISMATCH');
  assert.equal(mismatch.writes(), 0);
  const failed = syntheticDb(emptyRows(), true);
  await assert.rejects(failed.transaction(db => source.executeDevelopmentQualification(db, now,
    binding.target.cloudUrl)),
    /SYNTHETIC_PRIVATE_SENTINEL/);
  assert.equal(failed.tables().cadControlledUploadAttempts.length, 0);
  assert.equal(failed.tables().cadUploadSessions.length, 0);
});

test('expired or malformed bound login sessions stop before every write', async () => {
  const now = installBinding();
  for (const expirationTime of [binding.approval.windowEndMs, binding.approval.windowEndMs - 1,
    Number.NaN, Number.POSITIVE_INFINITY, 'later']) {
    const rows = emptyRows();
    rows.authSessions[0].expirationTime = expirationTime;
    const database = syntheticDb(rows);
    const value = await database.transaction(db => source.executeDevelopmentQualification(db, now,
      binding.target.cloudUrl));
    assert.equal(value.code, 'DEVELOPMENT_QUALIFICATION_IDENTITY_MISMATCH');
    assert.equal(database.writes(), 0);
  }
});

test('runner never retries an unknown mutation and reconciles with one fixed query', async () => {
  const terminal = {
    code: 'DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED', sourceOnly: true, developmentOnly: true,
    internalOnly: true, modelAccepted: true, hostQualified: false, bodyAdmissionAuthorized: false,
    requestBodyReads: 0, conversionAuthorized: false, sandboxAuthorized: false,
    storageWritesAuthorized: false, productionChangesAuthorized: false, automaticRetries: 0,
    runSpent: true, sessionCreated: true, attemptCreated: true, rollbackArmed: true,
    fenceOpenedOnce: false, fenceOpen: false, consumed: false, closed: true, revoked: true,
    unknown: false, permanentStop: true, bindingDigest: 'a'.repeat(64), resultDigest: 'b'.repeat(64),
  };
  let mutations = 0;
  let queries = 0;
  const reconciled = await runner.executeOnce({
    invokeMutation: async () => { mutations++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); },
    reconcileQuery: async () => { queries++; return terminal; },
  });
  assert.equal(reconciled.status, 'MUTATION_OUTCOME_UNKNOWN_RECONCILED_TERMINAL');
  assert.equal(reconciled.outcomeUnknown, true);
  assert.equal(mutations, 1);
  assert.equal(queries, 1);
  assert.equal(reconciled.retry, false);
  assert.equal(reconciled.secondRun, false);
  assert.doesNotMatch(JSON.stringify(reconciled), /SYNTHETIC_PRIVATE_SENTINEL|synthetic-user|login-session|@/);

  const stopped = await runner.executeOnce({
    invokeMutation: async () => { throw Error('private'); },
    reconcileQuery: async () => { throw Error('private'); },
  });
  assert.equal(stopped.status, 'MUTATION_OUTCOME_UNKNOWN_STOPPED_NO_RETRY');
  assert.equal(stopped.mutationCalls, 1);
  assert.equal(stopped.reconciliationQueries, 1);
});

test('runner approval is exact and source exposes internal-only zero-argument functions', () => {
  const now = installBinding();
  const approval = {
    schemaVersion: 1,
    mode: 'cad-controlled-upload-development-qualification-one-use-approval',
    status: 'APPROVED_FOR_ONE_DEVELOPMENT_QUALIFICATION',
    source: {
      baseCommit: binding.source.baseCommit,
      qualificationCommit: binding.source.qualificationCommit,
      stopReceiptSha256: binding.source.stopReceiptSha256,
    },
    target: structuredClone(binding.target),
    fixture: structuredClone(binding.fixture),
    window: { startMs: now - 1000, endMs: now + 60000 },
    limits: { runs: 1, sessions: 1, attempts: 1, retries: 0 },
    rollback: { first: true, terminal: true, noDelete: true },
  };
  assert.equal(runner.validateApproval(approval, binding.approval.recordSha256, binding), true);
  assert.throws(() => runner.validateApproval({ ...approval, target: { ...approval.target,
    cloudUrl: 'https://wrong.example' } }, binding.approval.recordSha256, binding), /APPROVAL_BINDING_MISMATCH/);
  const implementation = fs.readFileSync(path.join(__dirname, '../convex/cadControlledUploadDevQualification.ts'), 'utf8');
  const production = fs.readFileSync(path.join(__dirname,
    '../offline/cad-convex/controlledUploadAuthorityContinuity.ts'), 'utf8');
  assert.match(implementation, /export const qualifyOnce = internalMutation\(\{\s*args: \{\}/s);
  assert.match(implementation, /export const readSanitized = internalQuery\(\{\s*args: \{\}/s);
  assert.doesNotMatch(implementation, /export const .* = (?:query|mutation|action)\(/);
  assert.match(production, /verifyIndependentRegistrationApproval\(\.\.\._untrusted: unknown\[\]\): VerifiedContinuity \| null \{ return null; \}/);
});

test('runtime target mismatch is source-closed and never writes', async () => {
  const now = installBinding();
  const database = syntheticDb(emptyRows());
  const value = await database.transaction(db => source.executeDevelopmentQualification(db, now,
    'https://wrong-target.convex.cloud'));
  assert.equal(value.code, 'DEVELOPMENT_QUALIFICATION_SOURCE_CLOSED');
  assert.equal(database.writes(), 0);
});

test('runner source integrity rejects staged and unstaged tracked changes but does not inspect untracked files', () => {
  const sourceBinding = { source: { qualificationCommit: 'c'.repeat(40), baseCommit: 'b'.repeat(40) } };
  const run = statuses => {
    const calls = [];
    const spawn = (_command, args) => {
      calls.push(args);
      const key = args.slice(0, 2).join(' ');
      const status = statuses[key] ?? 0;
      return { status, stdout: args[0] === 'rev-parse' ? `${sourceBinding.source.qualificationCommit}\n` : '', stderr: '' };
    };
    return { calls, invoke: () => runner.assertLocalSource(sourceBinding, spawn) };
  };
  const clean = run({});
  assert.doesNotThrow(clean.invoke);
  assert.deepEqual(clean.calls.map(args => args.slice(0, 2).join(' ')), [
    'rev-parse HEAD', 'merge-base --is-ancestor', 'diff --quiet', 'diff --cached',
  ]);
  assert.equal(clean.calls.some(args => args.includes('--untracked-files')), false);
  assert.throws(run({ 'diff --quiet': 1 }).invoke, /QUALIFICATION_TRACKED_SOURCE_DIRTY/);
  assert.throws(run({ 'diff --cached': 1 }).invoke, /QUALIFICATION_TRACKED_SOURCE_DIRTY/);
});

test('consumed ledger is exclusively written, file-synced, closed, then parent-directory-synced', () => {
  const calls = [];
  const fileDescriptor = 11;
  const directoryDescriptor = 12;
  const fakeFs = {
    mkdirSync: (...args) => calls.push(['mkdir', ...args]),
    chmodSync: (...args) => calls.push(['chmod', ...args]),
    lstatSync: target => {
      calls.push(['lstat', target]);
      return { mode: 0o700, isSymbolicLink: () => false, isDirectory: () => true };
    },
    openSync: (target, flags, mode) => {
      calls.push(['open', target, flags, mode]);
      return target.endsWith('attempt-ledger.json') ? fileDescriptor : directoryDescriptor;
    },
    fchmodSync: (...args) => calls.push(['fchmod', ...args]),
    fstatSync: descriptor => {
      calls.push(['fstat', descriptor]);
      return { mode: 0o600, isFile: () => true };
    },
    writeSync: (descriptor, body, offset, length) => {
      calls.push(['write', descriptor, offset, length]);
      return Math.min(7, length);
    },
    fsyncSync: descriptor => calls.push(['fsync', descriptor]),
    closeSync: descriptor => calls.push(['close', descriptor]),
  };
  const ledger = '/synthetic/private/attempt-ledger.json';
  runner.writeConsumedLedgerDurably(ledger, { status: 'CONSUMED_BEFORE_MUTATION' }, fakeFs);
  const fileOpen = calls.find(call => call[0] === 'open' && call[1] === ledger);
  assert.equal((fileOpen[2] & fs.constants.O_EXCL) !== 0, true);
  assert.ok(calls.filter(call => call[0] === 'write').length > 1);
  assert.ok(calls.findIndex(call => call[0] === 'fsync' && call[1] === fileDescriptor)
    < calls.findIndex(call => call[0] === 'close' && call[1] === fileDescriptor));
  assert.ok(calls.findIndex(call => call[0] === 'close' && call[1] === fileDescriptor)
    < calls.findIndex(call => call[0] === 'open' && call[1] === '/synthetic/private'));
  assert.ok(calls.findIndex(call => call[0] === 'fsync' && call[1] === directoryDescriptor)
    < calls.findIndex(call => call[0] === 'close' && call[1] === directoryDescriptor));
});

test('partial ledger failure closes the file and never removes the permanent no-retry marker', () => {
  const calls = [];
  const fakeFs = {
    mkdirSync: () => calls.push('mkdir'), chmodSync: () => calls.push('chmod'),
    lstatSync: () => ({ mode: 0o700, isSymbolicLink: () => false, isDirectory: () => true }),
    openSync: () => { calls.push('open'); return 21; },
    fchmodSync: () => calls.push('fchmod'),
    fstatSync: () => ({ mode: 0o600, isFile: () => true }),
    writeSync: () => { calls.push('partial-write'); throw Error('SYNTHETIC_WRITE_INTERRUPTED'); },
    fsyncSync: () => calls.push('fsync'),
    closeSync: () => calls.push('close'),
  };
  assert.throws(() => runner.writeConsumedLedgerDurably('/synthetic/private/attempt-ledger.json',
    { status: 'CONSUMED_BEFORE_MUTATION' }, fakeFs), /SYNTHETIC_WRITE_INTERRUPTED/);
  assert.deepEqual(calls.slice(-2), ['partial-write', 'close']);
  assert.equal(Object.hasOwn(fakeFs, 'unlinkSync'), false);
});

test('fixed CLI mutation and reconciliation calls use bounded timeouts and never retry', async () => {
  const calls = [];
  const timeoutSpawn = (_command, args, options) => {
    calls.push({ args, options });
    const error = new Error('SYNTHETIC_TIMEOUT_PRIVATE');
    error.code = 'ETIMEDOUT';
    return { error, status: null, stdout: '', stderr: '' };
  };
  const result = await runner.executeOnce({
    invokeMutation: async () => runner.invokeFixed(
      'cadControlledUploadDevQualification:qualifyOnce', timeoutSpawn),
    reconcileQuery: async () => runner.invokeFixed(
      'cadControlledUploadDevQualification:readSanitized', timeoutSpawn),
  });
  assert.equal(result.status, 'MUTATION_OUTCOME_UNKNOWN_STOPPED_NO_RETRY');
  assert.equal(result.mutationCalls, 1);
  assert.equal(result.reconciliationQueries, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls.every(call => call.options.timeout === runner.CLI_TIMEOUT_MS
    && call.options.killSignal === 'SIGKILL'), true);
  assert.deepEqual(calls.map(call => call.args[3]), [
    'cadControlledUploadDevQualification:qualifyOnce',
    'cadControlledUploadDevQualification:readSanitized',
  ]);
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_TIMEOUT_PRIVATE/);
});
