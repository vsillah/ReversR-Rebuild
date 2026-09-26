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

test('source packet is transitively bound and source drift fails closed', () => {
  const packet = JSON.parse(fs.readFileSync(PACKET));
  assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource(file) {
      return file === source ? Buffer.from('drift') : fs.readFileSync(file);
    } }).ok, false, source);
  }
});

test('CLI refuses live execution, authority options and arbitrary paths', () => {
  for (const args of [[], ['--execute'], ['--live'], ['--activate'], ['--approval', 'PRIVATE_SENTINEL'], ['--write', '--execute']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-prod-durable-runner-adapter-prep-checker.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, args.length ? 1 : 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL|\/Users\//);
  }
});

test('preparation source has no runtime IO or runtime importers', () => {
  assert.doesNotMatch(fs.readFileSync('offline/cad-auth-prod-durable-runner-adapter-prep/preparation.js', 'utf8'),
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
