const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { PACKET, SOURCES, checkDisposition } = require('./cad-auth-receipt-intake-review-disposition-checker');
const { SOURCE_MERGE_COMMIT, disabledReviewDisposition, checkDisabledReviewDisposition }
  = require('../offline/cad-auth-receipt-intake-review-disposition/preparation');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.executableCommandCardIssued, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.restrictedReceiptCreationAuthorized, false);
  assert.equal(result.restrictedReceiptCollectionAuthorized, false);
  assert.equal(result.restrictedReceiptInstallationAuthorized, false);
  assert.equal(result.restrictedReceiptUseAuthorized, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}

function visit(value, keys = []) {
  if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
  return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => visit(child, [...keys, key]))];
}

test('source contract validates as a value-free review disposition', () => {
  const p = packet();
  assert.equal(p.parent.mergeCommit, SOURCE_MERGE_COMMIT);
  assert.equal(p.parent.restrictedValuesLoaded, false);
  assert.equal(p.parent.receiptIngestionImplemented, false);
  assert.equal(p.parent.priorApprovalReusable, false);
  assert.equal(checkDisposition(p).ok, true);
  assert.equal(checkDisabledReviewDisposition(p.preparation).ok, true);
  closed(checkDisposition(p));
  assert.equal(p.preparation.bindingStatus, 'RECEIPT_INTAKE_REVIEW_DISPOSITION_UNBOUND_SOURCE_ONLY');
  assert.deepEqual(Object.keys(p.preparation.intakeReviewDisposition.categoryDispositions), REQUIRED_LIVE_BINDINGS);
});

test('category dispositions require later receipt review and cannot accept now', () => {
  const disposition = disabledReviewDisposition().intakeReviewDisposition;
  assert.equal(disposition.status, 'NO_RESTRICTED_VALUES_REVIEWED');
  assert.equal(disposition.templateOnly, true);
  assert.equal(disposition.restrictedValuesReviewed, false);
  assert.equal(disposition.reviewerCanAcceptWithoutValues, false);
  assert.equal(disposition.reviewerCanRejectWithoutValues, false);
  for (const [category, categoryDisposition] of Object.entries(disposition.categoryDispositions)) {
    assert.equal(categoryDisposition.category, category);
    assert.equal(categoryDisposition.status, 'NOT_REVIEWED_NO_RESTRICTED_VALUES');
    for (const [key, value] of Object.entries(categoryDisposition)) {
      if (['category', 'status'].includes(key)) continue;
      assert.ok(value === null || value === false, key);
    }
  }
});

test('next packet controls leave sealed-card and exact approval work blocked', () => {
  const controls = disabledReviewDisposition().intakeReviewDisposition.nextPacketControls;
  assert.equal(controls.nonExecutableSealedCardMayBePrepared, false);
  assert.equal(controls.executableCommandCardMayBeIssued, false);
  assert.equal(controls.exactApprovalPhraseMayBeRequested, false);
  assert.equal(controls.freshWindowMayBeBound, false);
  assert.equal(controls.liveCollectionMayRun, false);
});

test('every leaf alteration, deletion and unknown nested field fails closed', () => {
  for (const entry of visit(packet())) {
    for (const mode of entry.leaf ? ['alter', 'delete'] : ['extra']) {
      const p = packet();
      let target = p;
      const route = mode === 'extra' ? entry.keys : entry.keys.slice(0, -1);
      for (const key of route) target = target[key];
      const key = entry.keys.at(-1);
      if (mode === 'extra') target.unknownPrivateField = 'PRIVATE_SENTINEL';
      else if (mode === 'delete') delete target[key];
      else target[key] = typeof entry.value === 'boolean' ? !entry.value
        : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
      const result = checkDisposition(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
});

test('plausible review receipts, decisions, targets and phrases remain rejected', () => {
  const cases = [
    ['preparation.intakeReviewDisposition.reviewerDecision', 'ACCEPTED'],
    ['preparation.intakeReviewDisposition.acceptanceBundleRef', 'restricted://acceptance'],
    ['preparation.intakeReviewDisposition.acceptanceBundleSha256', 'a'.repeat(64)],
    ['preparation.intakeReviewDisposition.categoryDispositions.custodyReviewerReceipt.accepted', true],
    ['preparation.intakeReviewDisposition.categoryDispositions.custodyReviewerReceipt.reviewReceiptRef', 'restricted://review'],
    ['preparation.intakeReviewDisposition.custodyReview.independentReviewerIdentityRef', 'rrb-ref:reviewer'],
    ['preparation.intakeReviewDisposition.digestReview.validationReceiptSha256', 'b'.repeat(64)],
    ['preparation.intakeReviewDisposition.immutableTargetReview.candidateCommit', SOURCE_MERGE_COMMIT],
    ['preparation.intakeReviewDisposition.retentionDispositionReview.dispositionReceiptRef', 'restricted://disposition'],
    ['preparation.futureHumanGate.exactPhrase', 'Approve one read-only synthetic CAD Auth evidence collection'],
  ];
  for (const [route, value] of cases) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    for (const result of [checkDisposition(p), checkDisabledReviewDisposition(p.preparation)]) {
      assert.equal(result.ok, false, route);
      closed(result);
      assert.equal(JSON.stringify(result).includes(String(value)), false);
    }
  }
});

test('hostile private objects fail without getter, proxy, toJSON or source evaluation', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {}; Object.defineProperty(accessor, 'receiptRef', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = packet(); cycle.self = cycle;
  const hidden = packet(); Object.defineProperty(hidden, 'private', { value: 'PRIVATE_SENTINEL' });
  const symbol = packet(); symbol[Symbol('private')] = 'PRIVATE_SENTINEL';
  const toJSON = packet(); toJSON.toJSON = hook;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', NaN, new Date(),
    accessor, proxy, revoked.proxy, cycle, hidden, symbol, toJSON]) {
    const result = checkDisposition(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.intakeReviewDisposition.categoryDispositions.custodyReviewerReceipt = accessor;
  assert.equal(checkDisposition(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift across parent and disposition files fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkDisposition(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('parent validation cannot be bypassed by rebinding a modified parent hash', () => {
  const { createHash } = require('node:crypto');
  const parentFile = 'docs/cad-auth-receipt-intake-template.json';
  const modified = JSON.parse(read(parentFile));
  modified.preparation.intake.restrictedValuesLoaded = true;
  const bytes = Buffer.from(JSON.stringify(modified));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const p = packet();
  p.parent.sha256 = digest;
  p.sourceBindings[parentFile] = digest;
  const result = checkDisposition(p, { readSource: file => file === parentFile ? bytes : read(file) });
  assert.equal(result.ok, false);
  closed(result);
});

test('CLI rejects live, review, value, issuance, retry and path modes without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--review'], ['--collect'], ['--receipt'], ['--value'],
    ['--install'], ['--use'], ['--issue'], ['--seal'], ['--approve'], ['--retry'],
    ['--write', '--live'], ['--write=PRIVATE_SENTINEL'], ['/tmp/PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-receipt-intake-review-disposition-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and runtime code does not import the disposition packet', () => {
  assert.doesNotMatch(read('offline/cad-auth-receipt-intake-review-disposition/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-receipt-intake-review-disposition/, file);
  }
});
