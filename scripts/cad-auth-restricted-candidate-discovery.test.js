const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { PACKET, SOURCES, checkDiscovery, validateCandidateRecords } =
  require('./cad-auth-restricted-candidate-discovery-checker');
const {
  SOURCE_INTAKE_PACKET,
  candidateDiscoveryDisposition,
  checkCandidateDiscoveryDisposition,
} = require('../offline/cad-auth-restricted-candidate-discovery/preparation');

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
  assert.equal(result.categoryUnionComplete, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE/);
}

test('candidate discovery records incomplete coverage with closed runtime controls', () => {
  const p = packet();
  const result = checkDiscovery(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.parent.sha256, SOURCE_INTAKE_PACKET.sha256);
  assert.equal(p.sourceMergeCommit, SOURCE_INTAKE_PACKET.boundMainCommit);
  assert.equal(p.status, 'CANDIDATE_DISCOVERY_INCOMPLETE_RESTRICTED_BUNDLE_ABSENT');
  assert.equal(p.discoverySummary.candidateCount, 78);
  assert.equal(p.discoverySummary.validJsonCount, 78);
  assert.equal(p.preparation.discoveryResult.categoryUnionComplete, false);
  assert.equal(p.preparation.discoveryResult.categoriesCoveredCount, 1);
  assert.equal(p.preparation.discoveryResult.categoriesMissingCount, 7);
  assert.deepEqual(Object.keys(p.preparation.discoveryResult.coveredCategories),
    ['concreteProviderRuntimeBinding']);
});

test('candidate records are sanitized opaque refs and digest-only projections', () => {
  const records = packet().preparation.discoveryResult.candidateRecords;
  assert.equal(validateCandidateRecords(records), true);
  const refs = Object.keys(records).sort();
  assert.equal(refs.length, 78);
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const record = records[ref];
    assert.equal(ref, `rrb-local:cad-auth-candidate-discovery-${String(i + 1).padStart(3, '0')}`);
    assert.equal(record.candidateRef, ref);
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
    assert.equal(typeof record.byteLength, 'number');
    assert.equal(record.validJson, true);
    assert.equal(Object.hasOwn(record, 'path'), false);
    assert.equal(Object.hasOwn(record, 'topLevelKeys'), false);
    assert.equal(Object.hasOwn(record, 'payload'), false);
  }
  const text = JSON.stringify(records);
  assert.doesNotMatch(text, new RegExp('PRIVATE_HOME|ABSOLUTE_PRIVATE_SOURCE|stop-receipt\\.json'));
});

test('only provider runtime binding has partial single-field candidate coverage', () => {
  const p = packet();
  for (const category of REQUIRED_LIVE_BINDINGS) {
    const summary = p.preparation.discoveryResult.categorySummary[category];
    if (category === 'concreteProviderRuntimeBinding') {
      assert.equal(summary.coveredByDiscovery, true);
      assert.deepEqual(summary.candidateRefs, {
        candidate1: 'rrb-local:cad-auth-candidate-discovery-019',
        candidate2: 'rrb-local:cad-auth-candidate-discovery-027',
      });
      assert.equal(summary.blocker, 'PARTIAL_SINGLE_FIELD_COVERAGE_ONLY');
    } else {
      assert.equal(summary.coveredByDiscovery, false);
      assert.deepEqual(summary.candidateRefs, {});
      assert.equal(summary.blocker, 'NO_CANDIDATE_COVERAGE');
    }
    assert.equal(summary.acceptedForBundle, false);
  }
  assert.equal(p.preparation.discoveryResult.candidateRecords['rrb-local:cad-auth-candidate-discovery-019']
    .categoryCoverage.concreteProviderRuntimeBinding.fieldsPresentCount, 1);
  assert.equal(p.preparation.discoveryResult.candidateRecords['rrb-local:cad-auth-candidate-discovery-027']
    .categoryCoverage.concreteProviderRuntimeBinding.fieldsPresentCount, 1);
});

test('mutation and category promotion fail closed without echoing private values', () => {
  const mutations = [
    ['packet', 'PRIVATE_SENTINEL'],
    ['parent.sha256', 'a'.repeat(64)],
    ['preparation.discoveryResult.candidateCount', 77],
    ['preparation.discoveryResult.candidateRecords.rrb-local:cad-auth-candidate-discovery-001.sha256', 'b'.repeat(64)],
    ['preparation.discoveryResult.candidateRecords.rrb-local:cad-auth-candidate-discovery-019.categoryCoverage.concreteProviderRuntimeBinding.fieldsPresentCount', 2],
    ['preparation.discoveryResult.categoryUnionComplete', true],
    ['preparation.discoveryResult.categoriesCoveredCount', 8],
    ['preparation.discoveryResult.categoriesMissingCount', 0],
    ['preparation.discoveryResult.categorySummary.executableCollectorCommand.coveredByDiscovery', true],
    ['preparation.discoveryResult.categorySummary.executableCollectorCommand.acceptedForBundle', true],
    ['preparation.controls.liveCollectionAuthorized', true],
    ['preparation.controls.uploadSessionIssuanceEnabled', true],
    ['futureHumanGate.exactPhrase', 'Approve one read-only synthetic CAD Auth evidence collection'],
  ];
  for (const [route, value] of mutations) {
    const p = packet();
    const keys = route.split('.');
    let target = p;
    for (const key of keys.slice(0, -1)) target = target[key];
    target[keys.at(-1)] = value;
    const result = checkDiscovery(p);
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
    const result = checkDiscovery(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  const nested = packet();
  nested.preparation.discoveryResult.candidateRecords['rrb-local:cad-auth-candidate-discovery-019'] = accessor;
  assert.equal(checkDiscovery(nested, { readSource: hook }).ok, false);
  assert.equal(calls, 0);
});

test('source drift and forbidden CLI modes fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkDiscovery(packet(), { readSource: name => {
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
      ['scripts/cad-auth-restricted-candidate-discovery-checker.js', ...args],
      { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    closed(JSON.parse(result.stdout));
    assert.deepEqual(read(PACKET), before);
  }
});

test('offline module has no private I/O and runtime code does not import the packet', () => {
  assert.equal(checkCandidateDiscoveryDisposition(packet().preparation).ok, true);
  assert.doesNotMatch(read('offline/cad-auth-restricted-candidate-discovery/preparation.js').toString(),
    new RegExp('process\\.env|fetch\\s*\\(|child_process|https?\\.request|node:fs|\\.listen\\s*\\('));
  function walk(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const file = path.posix.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
    });
  }
  for (const dir of ['server', 'api', 'app', 'convex', 'components', 'hooks', 'utils', 'constants']) {
    for (const file of walk(dir)) assert.doesNotMatch(read(file).toString(),
      /cad-auth-restricted-candidate-discovery/, file);
  }
});
