const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const {
  RECEIPTS, CLOSED_CONTROLS, coherentSourceSetProjection, checkCoherentSourceSetProjection,
} = require('../offline/cad-auth-coherent-source-set-projection/preparation');
const {
  PACKET, SOURCES, checkCoherentProjectionPacket,
} = require('./cad-auth-coherent-source-set-projection-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
function closed(result) {
  for (const [key, expected] of Object.entries(CLOSED_CONTROLS)) assert.equal(result[key], expected, key);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|PRIVATE_HOME|\/Users\//);
}

test('projection binds the supplied digest and run without claiming private verification', () => {
  const p = packet();
  const result = checkCoherentProjectionPacket(p);
  assert.equal(result.ok, true);
  closed(result);
  assert.equal(p.sourceMergeCommit, '3ab958f1216fa33323e1ed9b65d2408836788427');
  assert.equal(p.preparation.sourceSet.outputSha256, '2d437fd9e964dd1c346bb60d9d3de8d14bd845e1980a225ffeb4ca4c4b2216c4');
  assert.equal(p.preparation.sourceSet.runId, '20260925t182340z');
  assert.equal(p.preparation.sourceSet.evidenceBasis, 'APPROVED_SANITIZED_HANDOFF_FACTS_ONLY');
  for (const key of ['privateSourceSetBytesReadByThisLane', 'privateReceiptBytesReadByThisLane',
    'privateDigestsRecomputedByThisLane', 'privateReceiptSemanticsVerifiedByThisLane', 'liveEvidenceAcceptedByThisPacket']) {
    assert.equal(p.preparation.sourceSet[key], false, key);
  }
});

test('eight categories match the public required-field contract and total 23 fields / 47410 bytes', () => {
  const { categoryCoverage: coverage, overallCoverage: totals } = packet().preparation;
  assert.deepEqual(Object.keys(coverage), Object.keys(RECEIPT_FIELDS));
  for (const [category, row] of Object.entries(coverage)) {
    assert.equal(row.requiredFieldCount, RECEIPT_FIELDS[category].length, category);
    assert.equal(row.presentFieldCount, row.requiredFieldCount, category);
    assert.equal(row.complete, true);
    assert.equal(row.status, 'SUPPLIED_COVERAGE_COMPLETE_PROJECTED');
    assert.match(row.receiptSha256, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(totals, {
    requiredCategoryCount: 8, presentCategoryCount: 8,
    requiredFieldCount: 23, presentFieldCount: 23, totalReceiptByteLength: 47410,
    complete: true, coverageProvesRuntimeReadiness: false,
  });
  assert.equal(Object.values(coverage).reduce((sum, row) => sum + row.byteLength, 0), 47410);
  assert.equal(new Set(Object.values(coverage).map(row => row.receiptSha256)).size, 8);
});

test('documentation reproduces every supplied receipt digest, size and coverage', () => {
  const doc = read('docs/cad-auth-coherent-source-set-projection.md').toString();
  const expectedSizes = [5189, 6196, 4857, 6243, 6247, 6145, 4840, 7693];
  assert.deepEqual(Object.values(RECEIPTS).map(row => row.byteLength), expectedSizes);
  for (const [category, row] of Object.entries(RECEIPTS)) {
    assert.ok(doc.includes(`| ${category} | \`${row.receiptSha256}\` | ${row.byteLength} | ${row.requiredFieldCount}/${row.requiredFieldCount} |`), category);
  }
});

test('all control statuses remain closed and next review cannot issue execution authority', () => {
  const p = packet().preparation;
  assert.ok(Object.values(p.closedControlStatus).every(value => value === true));
  closed(p.controls);
  const gate = p.nextGate;
  assert.equal(gate.authorized, false);
  assert.deepEqual([...gate.exactPhraseTemplate.matchAll(/<([^>]+)>/g)].map(m => m[1]), Object.keys(gate.phraseFields));
  assert.ok(Object.values(gate.phraseFields).every(value => value === null));
  assert.equal(gate.unresolvedPlaceholdersAreNotApproval, true);
  assert.equal(gate.projectionIsNotExecutableApproval, true);
  assert.match(gate.exactPhraseTemplate, /review only committed sanitized source artifacts/);
  assert.match(gate.exactPhraseTemplate, /No private source-set or receipt reads/);
  assert.match(gate.exactPhraseTemplate, /runtime activation, executable command-card issuance/);
  assert.ok(Object.values(gate.prerequisites).every(value => value === 'REQUIRES_SEPARATE_REVIEW'));
  assert.ok(Object.values(p.stopConditions).every(value => value === true));
});

test('all projection leaves reject mutation and deletion with sanitized closed failures', () => {
  const original = coherentSourceSetProjection();
  function visit(value, trail = []) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...trail, key];
      if (item && typeof item === 'object') visit(item, next);
      else {
        const changed = structuredClone(original);
        let target = changed;
        for (const parent of trail) target = target[parent];
        target[key] = item === true ? false : item === false ? true : 'PRIVATE_SENTINEL';
        const result = checkCoherentSourceSetProjection(changed);
        assert.equal(result.ok, false, next.join('.'));
        closed(result);
        delete target[key];
        assert.equal(checkCoherentSourceSetProjection(changed).ok, false, next.join('.'));
      }
    }
  }
  visit(original);
});

test('packet rejects missing, extra, duplicated categories, swapped receipts and injected private fields', () => {
  const mutations = [
    p => { delete p.preparation.categoryCoverage.lateGrantObserver; },
    p => { p.preparation.categoryCoverage.unknown = p.preparation.categoryCoverage.lateGrantObserver; },
    p => { p.preparation.categoryCoverage.lateGrantObserver = p.preparation.categoryCoverage.custodyReviewerReceipt; },
    p => { p.preparation.categoryCoverage.lateGrantObserver.receiptSha256 = p.preparation.categoryCoverage.custodyReviewerReceipt.receiptSha256; },
    p => { p.preparation.privateReceiptValue = 'PRIVATE_SENTINEL'; },
    p => { p.preparation.controls.runtimeActivationAuthorized = true; },
    p => { p.preparation.sourceSet.outputSha256 = '0'.repeat(64); },
    p => { p.preparation.overallCoverage.presentFieldCount = 22; },
    p => { p.parents.acceptedProvenance.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const p = packet();
    mutate(p);
    const result = checkCoherentProjectionPacket(p);
    assert.equal(result.ok, false);
    closed(result);
  }
});

test('source drift and missing public bindings fail closed', () => {
  for (const file of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkCoherentProjectionPacket(packet(), { readSource: name => {
        if (name !== file) return read(name);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(name), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, file);
      closed(result);
    }
  }
});

test('hostile values cannot invoke hooks or source reads', () => {
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  const cycle = {};
  cycle.self = cycle;
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, cycle, { toJSON: hook }]) {
    const result = checkCoherentProjectionPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker reads committed sources only and never follows injected private paths', () => {
  const tracked = new Set(spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n'));
  const result = checkCoherentProjectionPacket(packet(), { readSource: file => {
    assert.ok(tracked.has(file), file);
    assert.ok(!path.isAbsolute(file));
    assert.ok(!file.split('/').includes('..'));
    assert.doesNotMatch(file, /\.local|\.env/);
    return read(file);
  } });
  assert.equal(result.ok, true);
  closed(result);
  const p = packet();
  p.preparation.sourceSet.path = 'PRIVATE_SENTINEL';
  assert.equal(checkCoherentProjectionPacket(p, { readSource: file => {
    assert.notEqual(file, 'PRIVATE_SENTINEL');
    return read(file);
  } }).ok, false);
});

test('CLI refuses source paths, runtime flags and extra arguments without echoing input', () => {
  for (const args of [['PRIVATE_SENTINEL'], ['--execute'], ['--source-dir', 'PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, ['scripts/cad-auth-coherent-source-set-projection-checker.js', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('preparation has no IO and runtime source surfaces never import this packet', () => {
  assert.doesNotMatch(read('offline/cad-auth-coherent-source-set-projection/preparation.js').toString(),
    /process\.env|fetch\s*\(|child_process|https?\.request|node:fs|\.listen\s*\(/);
  const tracked = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n');
  for (const file of tracked.filter(file => /^(?:server|api|app|convex|components|hooks|utils|constants|src|plugins)\/.*\.[cm]?[jt]sx?$/.test(file))) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-coherent-source-set-projection/, file);
  }
});
