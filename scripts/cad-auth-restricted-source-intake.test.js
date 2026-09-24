const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkIntake } = require('./cad-auth-restricted-source-intake-checker');
const {
  REVIEW_PACKET,
  APPROVED_SOURCE_READ,
  STOP_RECEIPT_MISSING_PREREQUISITES,
  restrictedSourceIntakeDisposition,
  checkRestrictedSourceIntakeDisposition,
} = require('../offline/cad-auth-restricted-source-intake/preparation');

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
  assert.equal(result.requiredEightCategoryBundlePresent, false);
  assert.doesNotMatch(JSON.stringify(result),
    new RegExp('PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE'));
}

function visit(value, keys = []) {
  if (value === null || typeof value !== 'object') return [{ keys, leaf: true, value }];
  return [{ keys, leaf: false }, ...Object.entries(value).flatMap(([key, child]) => visit(child, [...keys, key]))];
}

test('approved stop receipt is recorded as insufficient, not accepted evidence', () => {
  const p = packet();
  const result = checkIntake(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.parent.sha256, REVIEW_PACKET.sha256);
  assert.equal(p.sourceMergeCommit, REVIEW_PACKET.boundMainCommit);
  assert.equal(p.status, 'APPROVED_PRIVATE_SOURCE_READ_STOPPED_INSUFFICIENT');
  assert.equal(p.approvedSourceProjection.ref, APPROVED_SOURCE_READ.sourceRef);
  assert.equal(p.approvedSourceProjection.sha256, APPROVED_SOURCE_READ.sourceSha256);
  assert.equal(p.approvedSourceProjection.stopCode, 'MISSING_PREREQUISITE');
  assert.equal(p.preparation.sourceFinding.status, 'STOP_RECEIPT_INSUFFICIENT_FOR_RESTRICTED_RECEIPT_REVIEW');
  assert.deepEqual(p.preparation.sourceFinding.actionsObserved, ZERO_ACTIONS);
  assert.equal(p.preparation.nextGate.status, 'FULL_EIGHT_CATEGORY_RESTRICTED_RECEIPT_BUNDLE_REQUIRED');
});

test('all eight receipt categories remain absent and specify required fields', () => {
  const disposition = restrictedSourceIntakeDisposition();
  assert.deepEqual(Object.keys(disposition.categoryRequirements), REQUIRED_LIVE_BINDINGS);
  assert.deepEqual(Object.keys(disposition.nextGate.requiredBundleShape), REQUIRED_LIVE_BINDINGS);
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const requirement = disposition.categoryRequirements[category];
    assert.equal(requirement.presentInApprovedSource, false);
    assert.equal(requirement.accepted, false);
    assert.equal(requirement.blocker, 'APPROVED_SOURCE_IS_STOP_RECEIPT_NOT_CATEGORY_RECEIPT');
    assert.deepEqual(requirement.requiredFields,
      Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, 'REQUIRED'])));
    const nextShape = disposition.nextGate.requiredBundleShape[category];
    assert.equal(nextShape.status, 'REQUIRED_FROM_SEPARATELY_APPROVED_PRIVATE_SOURCE');
    assert.equal(nextShape.publicValuesPermitted, false);
    assert.equal(nextShape.localDigestRecomputationRequired, true);
  }
});

test('committed packet contains only sanitized opaque refs and no local private path', () => {
  const text = read(PACKET).toString() + read('docs/cad-auth-restricted-source-intake.md').toString()
    + read('offline/cad-auth-restricted-source-intake/preparation.js').toString();
  assert.doesNotMatch(text,
    new RegExp('PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE'));
  assert.match(text, new RegExp('rrb-local:cad-auth-live-evidence-stop-receipt/20260924T132411Z'));
  assert.match(text, new RegExp(APPROVED_SOURCE_READ.sourceSha256));
});

test('mutation, promoted category values and exact phrases fail closed', () => {
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
      const result = checkIntake(p);
      assert.equal(result.ok, false, entry.keys.join('.') + ':' + mode);
      closed(result);
    }
  }
  const cases = [
    ['preparation.approvedSource.sourceContainsRequiredEightCategoryBundle', true],
    ['preparation.approvedSource.sourceCategoryReceiptsPresent.concreteProviderRuntimeBinding', true],
    ['preparation.categoryRequirements.executableCollectorCommand.restrictedReceiptRef', 'restricted://command'],
    ['preparation.categoryRequirements.executableCollectorCommand.restrictedReceiptSha256', 'a'.repeat(64)],
    ['preparation.categoryRequirements.executableCollectorCommand.accepted', true],
    ['preparation.controls.liveCollectionAuthorized', true],
    ['preparation.nextGate.nonExecutableSealedCardMayBePrepared', true],
    ['futureHumanGate.exactPhrase', 'Approve one read-only synthetic CAD Auth evidence collection'],
  ];
  for (const [route, value] of cases) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    const result = checkIntake(p);
    assert.equal(result.ok, false, route);
    closed(result);
    assert.equal(JSON.stringify(result).includes(String(value)), false);
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
    const result = checkIntake(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.categoryRequirements.custodyReviewerReceipt = accessor;
  assert.equal(checkIntake(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift across parents and intake files fails closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkIntake(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('CLI rejects private paths, source rereads, live modes and issuance without writing', () => {
  const before = read(PACKET);
  for (const args of [['--live'], ['--collect'], ['--receipt'], ['--private-source'],
    ['--restricted-source=/tmp/receipts.json'], ['--install'], ['--use'], ['--issue'],
    ['--seal'], ['--approve'], ['--retry'], ['--write', '--collect'],
    ['/PRIVATE_HOME/ReversR-Rebuild/ABSOLUTE_PRIVATE_SOURCE.json']]) {
    const result = spawnSync(process.execPath, ['scripts/cad-auth-restricted-source-intake-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no private I/O and runtime code does not import the packet', () => {
  assert.doesNotMatch(read('offline/cad-auth-restricted-source-intake/preparation.js').toString(),
    new RegExp('process\\.env|fetch\\s*\\(|child_process|https?\\.request|node:fs|\\.listen\\s*\\('));
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-source-intake/, file);
  }
});
