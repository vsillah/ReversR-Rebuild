const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkReview } = require('./cad-auth-restricted-receipt-review-checker');
const {
  MAIN_COMMIT,
  APPROVED_GATE,
  disabledRestrictedReceiptReview,
  checkDisabledRestrictedReceiptReview,
} = require('../offline/cad-auth-restricted-receipt-review/preparation');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

function closed(result) {
  assert.equal(result.executable, false);
  assert.equal(result.executableCommandCardIssued, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.uploadSessionIssuanceEnabled, false);
  assert.equal(result.requestBodyAdmissionRead, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.retryOrSecondRunAuthorized, false);
  assert.equal(result.commercialReadinessClaimed, false);
  assert.equal(result.restrictedValuesCollected, false);
  assert.equal(result.restrictedValuesUsed, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
}

function visit(value, keys = []) {
  if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
  return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => visit(child, [...keys, key]))];
}

test('approved gate is recorded while restricted receipts remain absent and blocked', () => {
  const p = packet();
  assert.equal(p.sourceMergeCommit, MAIN_COMMIT);
  assert.deepEqual(p.approvedGate, APPROVED_GATE);
  assert.equal(p.status, 'RESTRICTED_RECEIPT_VALUES_UNAVAILABLE_REVIEW_BLOCKED');
  assert.equal(p.parents.reviewDisposition.restrictedValuesReviewed, false);
  assert.equal(p.parents.restrictedReceiptBundle.restrictedValuesLoaded, false);
  assert.equal(p.parents.sealedCardCustodyRebind.executableCommandCardIssued, false);
  assert.equal(checkReview(p).ok, true);
  assert.equal(checkDisabledRestrictedReceiptReview(p.preparation).ok, true);
  closed(checkReview(p));
});

test('all eight categories require private refs and exact digest recomputation', () => {
  const review = disabledRestrictedReceiptReview().review;
  assert.deepEqual(Object.keys(review.categoryReviews), REQUIRED_LIVE_BINDINGS);
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const categoryReview = review.categoryReviews[category];
    assert.equal(categoryReview.status, 'RESTRICTED_RECEIPT_SOURCE_NOT_CONFIGURED');
    assert.deepEqual(categoryReview.requiredFields,
      Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])));
    assert.equal(categoryReview.restrictedReceiptRef, null);
    assert.equal(categoryReview.restrictedReceiptSha256, null);
    assert.equal(categoryReview.restrictedReceiptDigestRecomputed, false);
    assert.equal(categoryReview.accepted, false);
  }
  assert.equal(review.acceptedForSealedCardPreparation, false);
});

test('sanitized packet records no private store access or value handling', () => {
  const source = disabledRestrictedReceiptReview().restrictedReceiptSource;
  assert.equal(source.configured, false);
  assert.equal(source.sourceRef, null);
  assert.equal(source.storeOpened, false);
  assert.equal(source.restrictedValuesCreated, false);
  assert.equal(source.restrictedValuesCollected, false);
  assert.equal(source.restrictedValuesInstalled, false);
  assert.equal(source.restrictedValuesUsed, false);
  assert.equal(source.secretReads, false);
  assert.equal(source.providerEnvResourceBillingChanges, false);
  assert.equal(source.stopCode, 'RESTRICTED_RECEIPT_SOURCE_NOT_CONFIGURED');
});

test('every public packet mutation fails closed without echoing values', () => {
  for (const entry of visit(packet())) {
    for (const mode of entry.leaf ? ['alter', 'delete'] : ['extra']) {
      const p = packet();
      let target = p;
      const route = mode === 'extra' ? entry.keys : entry.keys.slice(0, -1);
      for (const key of route) target = target[key];
      const key = entry.keys.at(-1);
      if (mode === 'extra') target.privateReceipt = 'PRIVATE_SENTINEL';
      else if (mode === 'delete') delete target[key];
      else target[key] = typeof entry.value === 'boolean' ? !entry.value
        : typeof entry.value === 'number' ? entry.value + 1 : 'PRIVATE_SENTINEL';
      const result = checkReview(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
});

test('plausible restricted refs, digest pairs and approvals are still rejected in public source', () => {
  const cases = [
    ['preparation.restrictedReceiptSource.configured', true],
    ['preparation.restrictedReceiptSource.sourceRef', 'restricted://cad-auth/receipts'],
    ['preparation.restrictedReceiptSource.storeOpened', true],
    ['preparation.restrictedReceiptSource.restrictedValuesCollected', true],
    ['preparation.review.allEightCategoriesPresent', true],
    ['preparation.review.allCategoryDigestPairsBound', true],
    ['preparation.review.categoryReviews.custodyReviewerReceipt.restrictedReceiptRef', 'restricted://custody'],
    ['preparation.review.categoryReviews.custodyReviewerReceipt.restrictedReceiptSha256', 'a'.repeat(64)],
    ['preparation.review.categoryReviews.custodyReviewerReceipt.accepted', true],
    ['preparation.nextGate.nonExecutableSealedCardMayBePrepared', true],
    ['futureHumanGate.exactPhrase', 'Approve one read-only synthetic CAD Auth evidence collection'],
  ];
  for (const [route, value] of cases) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    const packetResult = checkReview(p);
    assert.equal(packetResult.ok, false, route);
    closed(packetResult);
    assert.equal(JSON.stringify(packetResult).includes(String(value)), false);
    if (route.startsWith('preparation.')) {
      const prepResult = checkDisabledRestrictedReceiptReview(p.preparation);
      assert.equal(prepResult.ok, false, route);
      closed(prepResult);
      assert.equal(JSON.stringify(prepResult).includes(String(value)), false);
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
    const result = checkReview(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.review.categoryReviews.custodyReviewerReceipt = accessor;
  assert.equal(checkReview(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift across parents and review files fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkReview(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('CLI rejects collection, source paths, live modes and issuance without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--collect'], ['--receipt'], ['--private-source'],
    ['--restricted-source=/tmp/receipts.json'], ['--install'], ['--use'], ['--issue'],
    ['--seal'], ['--approve'], ['--retry'], ['--write', '--collect'], ['/tmp/PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-restricted-receipt-review-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no I/O and runtime code does not import the review packet', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-receipt-review/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-receipt-review/, file);
  }
});
