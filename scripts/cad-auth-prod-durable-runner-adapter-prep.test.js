const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const {
  DIGEST_KEYS,
  DURABLE_RECEIPTS,
  durableAdapterContract,
  durableRunnerAdapterPacket,
  prepareDurableCommandCardDraft,
  validateDurableReceiptPlan,
} = require('../offline/cad-auth-prod-durable-runner-adapter-prep/preparation');
const {
  initialDurableRecord,
  proposeDurableTransition,
  checkIndependentFence,
} = require('../offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter');
const { PACKET, SOURCES, checkPacket } = require('./cad-auth-prod-durable-runner-adapter-prep-checker');

const sha = value => createHash('sha256').update(value).digest('hex');
const binding = () => ({
  digests: Object.fromEntries(DIGEST_KEYS.map(key => [key, sha(key)])),
  startUtc: '2030-01-01T00:00:00.000Z',
  expiresUtc: '2030-01-01T00:01:00.000Z',
  maxDurationSeconds: 60,
  runLedgerKey: 'cad-auth-run-ledger-20300101',
  attemptLedgerKey: 'cad-auth-attempt-ledger-20300101',
});
const receiptPlan = bindingSha256 => ({
  bindingSha256,
  receipts: Object.fromEntries(DURABLE_RECEIPTS.map(key => [key, sha(`receipt:${key}`)])),
  observerDeltas: {
    bodyReads: 0,
    sessionsIssued: 0,
    conversions: 0,
    sandboxDispatches: 0,
    retries: 0,
    secondRuns: 0,
  },
});
function closed(result) {
  for (const key of ['enabled', 'runtimeMounted', 'liveExecutionReady', 'commandCardIssuanceAuthorized',
    'uploadSessionIssuanceAuthorized', 'productionUploadActivationAuthorized',
    'requestBodyAdmissionReadAuthorized', 'cleanupAuthorized']) assert.equal(result[key], false, key);
  assert.equal(result.effectsExecuted, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\//);
}

test('packet models durable adapter requirements while staying closed', () => {
  const packet = durableRunnerAdapterPacket();
  closed(packet);
  assert.equal(packet.packet, 'cad-auth-prod-durable-runner-adapter-prep-v1');
  assert.equal(packet.sourceCommit, 'ac6534162a6ef0057ee945b15a9079218f4431ba');
  assert.equal(packet.durableAdapter.atomicity.runClaim.maxWinners, 1);
  assert.equal(packet.durableAdapter.atomicity.attemptClaim.maxWinners, 1);
  assert.equal(packet.durableAdapter.expiry.independentClockRequired, true);
  assert.equal(packet.durableAdapter.rollback.idempotentCloseRequired, true);
  assert.deepEqual(packet.commandCardIssuancePreparation.requiredDurableReceipts, DURABLE_RECEIPTS);
  assert.equal(packet.nextGate.authorized, false);
});

test('durable command-card draft is canonical, non-executable and one session/attempt only', () => {
  const draft = prepareDurableCommandCardDraft(binding());
  closed(draft);
  assert.equal(draft.code, 'DURABLE_COMMAND_CARD_DRAFT_ONLY');
  assert.equal(draft.draft.issued, false);
  assert.equal(draft.draft.executable, false);
  assert.equal(draft.draft.oneSession, true);
  assert.equal(draft.draft.oneAttempt, true);
  assert.equal(draft.draft.retries, 0);
  assert.equal(draft.draft.durableAdapterContractSha256, sha(JSON.stringify(durableAdapterContract())));
  const reversed = binding();
  reversed.digests = Object.fromEntries(Object.entries(reversed.digests).reverse());
  assert.deepEqual(prepareDurableCommandCardDraft(reversed), draft);
});

test('invalid binding input never invokes accessors or leaks input', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'digests', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {}; cycle.self = cycle;
  const invalid = [null, [], accessor, proxy, cycle, { ...binding(), enabled: true },
    { ...binding(), runLedgerKey: 'same', attemptLedgerKey: 'same' },
    { ...binding(), startUtc: '2030-02-30T00:00:00.000Z' },
    { ...binding(), expiresUtc: binding().startUtc },
    { ...binding(), maxDurationSeconds: Infinity }];
  for (const key of DIGEST_KEYS) {
    const next = binding();
    next.digests[key] = 'PRIVATE_SENTINEL';
    invalid.push(next);
  }
  for (const value of invalid) {
    const result = prepareDurableCommandCardDraft(value);
    closed(result);
    assert.equal(result.code, 'INVALID_DURABLE_COMMAND_CARD_DRAFT');
    assert.equal(result.draft, null);
  }
  assert.equal(calls, 0);
});

test('receipt plan requires every durable receipt and zero observer deltas', () => {
  const draft = prepareDurableCommandCardDraft(binding());
  const valid = validateDurableReceiptPlan(receiptPlan(draft.bindingSha256));
  closed(valid);
  assert.equal(valid.code, 'DURABLE_RECEIPT_PLAN_VALID');
  for (const key of DURABLE_RECEIPTS) {
    const next = receiptPlan(draft.bindingSha256);
    delete next.receipts[key];
    const result = validateDurableReceiptPlan(next);
    closed(result);
    assert.equal(result.code, 'INVALID_DURABLE_RECEIPT_PLAN');
  }
  for (const key of Object.keys(receiptPlan(draft.bindingSha256).observerDeltas)) {
    const next = receiptPlan(draft.bindingSha256);
    next.observerDeltas[key] = 1;
    const result = validateDurableReceiptPlan(next);
    closed(result);
    assert.equal(result.code, 'INVALID_DURABLE_RECEIPT_PLAN');
  }
});

test('durable transition source enforces ordered one-session and one-attempt claims', () => {
  const start = Date.parse(binding().startUtc);
  const request = (operation, expectedRevision) => ({
    operation,
    expectedRevision,
    nowMs: start,
    clockTrusted: true,
    ownerAlive: true,
    ownerLeaseExpiresMs: start + 30000,
    outcomeKnown: true,
  });
  let record = initialDurableRecord(binding());
  assert.equal(record.revision, 0);
  for (const operation of ['CLAIM_RUN', 'CLAIM_SESSION', 'CLAIM_ATTEMPT']) {
    const result = proposeDurableTransition(binding(), record, request(operation, record.revision));
    closed(result);
    assert.equal(result.code, 'TRANSACTION_PREPARED');
    assert.equal(result.mustClose, false);
    assert.equal(result.admissionAllowed, false);
    record = result.proposedRecord;
  }
  assert.equal(record.runClaimed, true);
  assert.equal(record.sessionClaimed, true);
  assert.equal(record.attemptClaimed, true);
  const repeated = proposeDurableTransition(binding(), record, request('CLAIM_ATTEMPT', record.revision));
  closed(repeated);
  assert.equal(repeated.code, 'BLOCKED_NO_RETRY');
  assert.equal(repeated.proposedRecord.closed, true);
  assert.equal(repeated.proposedRecord.revoked, true);
});

test('durable transition source blocks stale revisions, unknown outcomes and expiry', () => {
  const start = Date.parse(binding().startUtc);
  const expires = Date.parse(binding().expiresUtc);
  const base = {
    operation: 'CLAIM_RUN',
    expectedRevision: 0,
    nowMs: start,
    clockTrusted: true,
    ownerAlive: true,
    ownerLeaseExpiresMs: start + 30000,
    outcomeKnown: true,
  };
  for (const mutate of [
    r => { r.expectedRevision = 1; },
    r => { r.outcomeKnown = false; },
    r => { r.clockTrusted = false; },
    r => { r.ownerAlive = false; },
    r => { r.nowMs = expires; },
    r => { r.ownerLeaseExpiresMs = expires + 1; },
  ]) {
    const request = { ...base };
    mutate(request);
    const result = proposeDurableTransition(binding(), null, request);
    closed(result);
    assert.equal(result.code, 'BLOCKED_NO_RETRY');
    if (result.proposedRecord !== null) {
      assert.equal(result.proposedRecord.closed, true);
      assert.equal(result.proposedRecord.revoked, true);
      assert.equal(result.mustClose, true);
    }
  }
});

test('rollback is idempotent and independent fence never grants admission', () => {
  const start = Date.parse(binding().startUtc);
  const request = {
    operation: 'ROLLBACK',
    expectedRevision: 0,
    nowMs: start,
    clockTrusted: true,
    ownerAlive: true,
    ownerLeaseExpiresMs: start + 30000,
    outcomeKnown: true,
  };
  const first = proposeDurableTransition(binding(), null, request);
  closed(first);
  assert.equal(first.code, 'ROLLBACK_PREPARED');
  const second = proposeDurableTransition(binding(), first.proposedRecord, { ...request, expectedRevision: first.proposedRecord.revision });
  closed(second);
  assert.equal(second.code, 'ROLLBACK_ALREADY_PREPARED');
  assert.deepEqual(second.proposedRecord, first.proposedRecord);

  const eligibleRecord = {
    ...initialDurableRecord(binding()),
    runClaimed: true,
    sessionClaimed: true,
    revision: 2,
    lastNowMs: start,
  };
  const fence = checkIndependentFence(binding(), eligibleRecord, {
    nowMs: start,
    clockTrusted: true,
    ownerAlive: true,
    ownerLeaseExpiresMs: start + 30000,
  });
  closed(fence);
  assert.equal(fence.simulatedEligible, true);
  assert.equal(fence.admissionAllowed, false);
});

test('historical source packet validates at its original revision and rejects current drift', () => {
  // This immutable packet predates later router changes. Never refresh it in place.
  const revision = '00fd71d76430123c220af25e85d37ecba802b7b0';
  const snapshot = new Map();
  const readHistorical = file => {
    if (!snapshot.has(file)) {
      const result = spawnSync('git', ['show', `${revision}:${file}`]);
      assert.equal(result.status, 0, `Historical source unavailable: ${file}`);
      snapshot.set(file, result.stdout);
    }
    return snapshot.get(file);
  };
  const packetBytes = fs.readFileSync(PACKET);
  assert.deepEqual(packetBytes, readHistorical(PACKET));
  const packet = JSON.parse(packetBytes);
  assert.equal(checkPacket(packet, { readSource: readHistorical }).ok, true);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource(file) {
      return file === source ? Buffer.from('drift') : readHistorical(file);
    } }).ok, false, source);
  }
  assert.notEqual(sha(fs.readFileSync('server/cadUserUploadRouter.js')),
    packet.sourceBindings['server/cadUserUploadRouter.js']);
  assert.equal(checkPacket(packet).ok, false);
});

test('CLI refuses live execution, authority options and arbitrary paths', () => {
  for (const args of [[], ['--execute'], ['--live'], ['--activate'], ['--approval', 'PRIVATE_SENTINEL'], ['--write', '--execute']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-prod-durable-runner-adapter-prep-checker.js', ...args], { encoding: 'utf8' });
    // No-argument validation also rejects the stale historical packet.
    assert.equal(result.status, 1);
    const closedResult = JSON.parse(result.stdout);
    assert.equal(closedResult.ok, false);
    assert.equal(closedResult.effectsExecuted, 0);
    assert.equal(closedResult.liveExecutionAuthorized, false);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL|\/Users\//);
  }
});

test('preparation source has no runtime IO or runtime importers', () => {
  assert.doesNotMatch(fs.readFileSync('offline/cad-auth-prod-durable-runner-adapter-prep/preparation.js', 'utf8'),
    /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|setTimeout|\.listen\s*\(/);
  assert.doesNotMatch(fs.readFileSync('offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter.js', 'utf8'),
    /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|setTimeout|\.listen\s*\(/);
  function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants', 'src', 'plugins']) {
    for (const file of walk(dir)) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cad-auth-prod-durable-runner-adapter-prep/, file);
    }
  }
});
