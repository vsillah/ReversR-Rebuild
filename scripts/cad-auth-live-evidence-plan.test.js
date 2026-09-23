const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { CASES } = require('./cad-production-verifier-evidence-checker');
const { PACKET, SOURCES, WINDOW, APPROVAL_PHRASE, checkPlan } = require('./cad-auth-live-evidence-plan-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
const before = Date.parse(WINDOW.startsAtUtc) - 1;

test('covers every acceptance case with concrete expected observations and no collected receipts', () => {
  const p = packet();
  const result = checkPlan(p, { now: before });
  assert.equal(result.ok, true);
  assert.equal(result.proposalWindowStillFuture, true);
  assert.deepEqual(p.cases.map(c => `${c.category}/${c.id}`),
    Object.entries(CASES).flatMap(([category, ids]) => ids.map(id => `${category}/${id}`)));
  assert.equal(new Set(p.cases.map(c => c.id)).size, p.cases.length);
  for (const c of p.cases) {
    assert.ok(c.expected.length > 20);
    assert.deepEqual(c.paths, ['resolve', 'refresh']);
    assert.equal(c.status, 'NOT_COLLECTED');
    assert.equal(c.observed, null);
  }
  assert.equal(p.approval.requiredPhrase, APPROVAL_PHRASE);
  assert.equal(Date.parse(WINDOW.expiresAtUtc) - Date.parse(WINDOW.startsAtUtc), 30 * 60 * 1000);
});

test('source validity and window freshness never grant live collection or activation', () => {
  for (const now of [before, Date.parse(WINDOW.startsAtUtc), Date.parse(WINDOW.expiresAtUtc), NaN, Infinity]) {
    const r = checkPlan(packet(), { now });
    assert.equal(r.ok, true);
    assert.equal(r.proposalWindowStillFuture, now === before);
    for (const key of ['liveCollectionAuthorized', 'executable', 'productionVerifierAccepted',
      'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized', 'runtimeActivationAuthorized']) assert.equal(r[key], false);
  }
});

test('rejects approval promotion, missing prerequisites, filled receipts and widened bounds', () => {
  const mutations = [
    p => { p.approval.received = true; },
    p => { p.approval.receipt = 'private-sentinel'; },
    p => { p.approval.proposal.approved = true; },
    p => { p.approval.proposal.expiresAtUtc = '2099-01-01T00:00:00Z'; },
    p => { p.approval.proposal.startsAtUtc = '2026-09-15T00:00:00Z'; },
    p => { p.approval.sealedCommandCardSha256 = 'a'.repeat(64); },
    p => { p.deployment.collectionTargetRef = p.deployment.immutableUrl; },
    p => { p.candidate.concreteProviderAdapterCommit = p.candidate.sourceCommit; },
    p => { p.cohort.creationAuthorized = true; },
    p => { p.cohort.actualMappingRef = 'private-sentinel'; },
    p => { p.route.observedApplicationBytesRead = 0; },
    p => { p.route.instrumentationInstalled = true; },
    p => { p.custody.rawCredentialCaptureAllowed = true; },
    p => { p.custody.publicReceiptPublicationAllowed = true; },
    p => { p.extra = { execute: true }; },
    ...Object.keys(packet().claims).map(key => p => { p.claims[key] = true; }),
    ...Object.keys(packet().completion).map(key => p => { p.completion[key] = true; }),
    ...Object.keys(packet().limits).map(key => p => { p.limits[key]++; }),
    ...Object.keys(packet().evidenceTemplate).map(key => p => { p.evidenceTemplate[key] = 'private-sentinel'; }),
    ...Object.keys(packet().prerequisites).flatMap(key => [
      p => { delete p.prerequisites[key]; }, p => { p.prerequisites[key].status = 'READY'; },
    ]),
    ...packet().cases.flatMap((_, index) => [
      p => { p.cases[index].status = 'PASS'; },
      p => { p.cases[index].expected = 'skip'; },
      p => { p.cases[index].observed = 'private-sentinel'; },
      p => { p.cases[index].paths.pop(); },
    ]),
  ];
  for (const mutate of mutations) {
    const p = packet(); mutate(p);
    const r = checkPlan(p);
    assert.equal(r.ok, false);
    assert.equal(r.executable, false);
    assert.equal(JSON.stringify(r).includes('private-sentinel'), false);
  }
});

test('source drift, missing files, malformed packets and prior evidence promotion fail closed', () => {
  for (const file of SOURCES) {
    assert.equal(checkPlan(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) }).ok, false);
  }
  assert.equal(checkPlan(packet(), { readSource: () => { throw Error('private-sentinel'); } }).ok, false);
  for (const p of [null, [], {}, false, 'private-sentinel']) assert.equal(checkPlan(p).ok, false);
});

test('checker is offline and source-only; no runtime dependency imports or mounted planner', () => {
  const source = read('scripts/cad-auth-live-evidence-plan-checker.js').toString();
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|child_process|https?\.request|writeFile|createServer|\.listen\s*\(/);
  const imports = [...source.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepEqual(imports, ['node:fs', 'node:path', 'node:crypto', 'node:util', './cad-production-verifier-evidence-checker']);
  for (const file of ['server/index.js', 'api/[...path].js', 'server/cadUserUploadRouter.js']) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-live-evidence-plan/);
  }
});
