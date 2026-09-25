const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET, SOURCES, checkContract } =
  require('./cad-auth-restricted-source-set-contract-checker');
const { checkSourceSetContract } =
  require('../offline/cad-auth-restricted-source-set-contract/preparation');

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
  assert.equal(result.exactApprovalPhraseReady, false);
  assert.equal(result.coherentPrivateSourceSetAccepted, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE/);
}

test('source-set contract validates as source-only and keeps all runtime controls closed', () => {
  const p = packet();
  const result = checkContract(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.status, 'SOURCE_ONLY_CONTRACT_NO_PRIVATE_RECEIPTS_LOADED');
  assert.equal(p.parent.confirmsCandidateSetIncomplete, true);
  assert.equal(p.acceptanceBoundary.currentSourceSetAccepted, false);
  assert.equal(p.acceptanceBoundary.stopCondition,
    'STOP_IF_NO_SINGLE_SOURCE_OR_COHERENT_SOURCE_SET_CONTAINS_ALL_EIGHT_CATEGORIES');
});

test('all eight categories and field counts are represented without values', () => {
  const p = packet();
  assert.deepEqual(Object.keys(p.preparation.requiredCategories), [...REQUIRED_LIVE_BINDINGS].sort()
    .sort((a, b) => REQUIRED_LIVE_BINDINGS.indexOf(a) - REQUIRED_LIVE_BINDINGS.indexOf(b)));
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const contract = p.preparation.requiredCategories[category];
    assert.equal(contract.requiredReceiptRef, true);
    assert.equal(contract.requiredReceiptSha256, 'lowercase-hex-64');
    assert.equal(contract.requiredByteLength, 'positive-integer');
    assert.equal(p.categoryFieldCounts[category], RECEIPT_FIELDS[category].length);
    assert.deepEqual(Object.keys(contract.requiredFieldPresence), RECEIPT_FIELDS[category]);
    for (const field of RECEIPT_FIELDS[category]) {
      assert.equal(contract.requiredFieldPresence[field].requiredInRestrictedSource, true);
      assert.equal(contract.requiredFieldPresence[field].publicValueCommitted, false);
    }
  }
  assert.equal(JSON.stringify(p).includes('receiptValue'), false);
});

test('coherence rules reject path refs, duplicates, drift and missing custody prerequisites', () => {
  const rules = packet().preparation.coherenceRules;
  assert.equal(rules.eitherSingleBundleOrDeclaredCoherentSet, true);
  assert.equal(rules.everyCategoryRequiredExactlyOnce, true);
  assert.equal(rules.duplicateCategoryRefsRejected, true);
  assert.equal(rules.refsMustBeOpaqueAndNonPath, true);
  assert.equal(rules.localPathsCommitted, false);
  assert.equal(rules.topLevelKeysCommitted, false);
  assert.equal(rules.privatePayloadValuesCommitted, false);
  assert.equal(rules.allDigestsRecomputedFromExactStoredReceiptBytes, true);
  assert.equal(rules.custodianAndReviewerMustBeDistinctRefs, true);
  assert.equal(rules.retentionAndDeletionDispositionMustBeBoundBeforePublicProjection, true);
});

test('mutation and promotion attempts fail closed without echoing private values', () => {
  const mutations = [
    ['packet', 'PRIVATE_SENTINEL'],
    ['parent.sha256', 'a'.repeat(64)],
    ['preparation.reviewDisposition.publicPacketCanAdvanceSealedCard', true],
    ['preparation.reviewDisposition.exactApprovalPhraseReady', true],
    ['preparation.controls.liveCollectionAuthorized', true],
    ['preparation.controls.uploadSessionIssuanceEnabled', true],
    ['preparation.controls.requestBodyAdmissionRead', true],
    ['preparation.requiredCategories.concreteProviderRuntimeBinding.requiredReceiptSha256', null],
    ['preparation.requiredCategories.custodyReviewerReceipt.requiredFieldPresence.custodianReceiptRef.publicValueCommitted', true],
    ['acceptanceBoundary.currentSourceSetAccepted', true],
    ['acceptanceBoundary.noCoherentPrivateSourceSetPresent', false],
  ];
  for (const [route, value] of mutations) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    const result = checkContract(p);
    assert.equal(result.ok, false, route);
    closed(result);
    if (typeof value === 'string' && /PRIVATE|^[a-f0-9]{64}$/.test(value)) {
      assert.equal(JSON.stringify(result).includes(value), false);
    }
  }
});

test('hostile objects fail without getter, proxy, toJSON or restricted source evaluation', () => {
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
    const result = checkContract(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.requiredCategories.concreteProviderRuntimeBinding = accessor;
  assert.equal(checkContract(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift and forbidden CLI modes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkContract(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
  const before = read(PACKET);
  for (const args of [['--live'], ['--collect'], ['--receipt'], ['--private-source'],
    ['--restricted-source=/tmp/receipts.json'], ['--install'], ['--use'], ['--issue'],
    ['--seal'], ['--approve'], ['--retry'], ['--write', '--collect'],
    ['/PRIVATE_HOME/ReversR-Rebuild/ABSOLUTE_PRIVATE_SOURCE.json']]) {
    const result = spawnSync(process.execPath,
      ['scripts/cad-auth-restricted-source-set-contract-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no private I/O and runtime code does not import the packet', () => {
  assert.equal(checkSourceSetContract(packet().preparation).ok, true);
  assert.doesNotMatch(read('offline/cad-auth-restricted-source-set-contract/preparation.js').toString(),
    new RegExp('process\\.env|fetch\\s*\\(|child_process|https?\\.request|node:fs|\\.listen\\s*\\('));
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-source-set-contract/, file);
  }
});
