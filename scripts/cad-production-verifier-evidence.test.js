const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { checkEvidence, CASES, PACKET, SOURCES } = require('./cad-production-verifier-evidence-checker');
const root = path.resolve(__dirname, '..');
const packet = () => JSON.parse(fs.readFileSync(path.join(root, PACKET)));

test('all acceptance categories have pending case plans, never provider or route evidence', () => {
  const p = packet();
  assert.equal(checkEvidence(p).ok, true);
  assert.equal(Object.keys(CASES).length, 12);
  assert.equal(p.bodyOrdering.requiredUploadBytesBeforeAcceptance, 0);
  assert.equal(p.bodyOrdering.observedUploadBytesBeforeAcceptance, null);
  for (const category of Object.values(p.futureProviderEvidence)) {
    assert.equal(category.status, 'NOT_COLLECTED');
    assert.ok(category.cases.length > 0);
    for (const c of category.cases) assert.deepEqual(c.paths, ['resolve', 'refresh']);
  }
});

test('completion, receipts, stale or fresh approvals/windows and body evidence all rejected', () => {
  const mutations = [
    p => { p.activation.approvalRef = 'historical-approval'; },
    p => { p.activation.startsAtUtc = '2026-09-15T03:00:00Z'; p.activation.expiresAtUtc = '2026-09-15T03:05:00Z'; },
    p => { p.activation.expiresAtUtc = '2099-01-01T00:00:00Z'; },
    p => { p.bodyOrdering.observedUploadBytesBeforeAcceptance = 0; },
    p => { p.localSynthetic.provesProviderAuth = true; },
    p => { p.localSynthetic.provesActualRouteBodyOrdering = true; },
    p => { p.localSynthetic.storedRunReceipt = 'synthetic-is-not-live'; },
    p => { p.extra = { accepted: true }; },
    ...Object.keys(packet().claims).map(key => p => { p.claims[key] = true; }),
    ...Object.keys(CASES).flatMap(key => [
      p => { delete p.futureProviderEvidence[key]; },
      p => { p.futureProviderEvidence[key].accepted = true; },
      p => { p.futureProviderEvidence[key].cases[0].status = 'PASS'; },
      p => { p.futureProviderEvidence[key].cases[0].observed = 'completed'; },
      p => { p.futureProviderEvidence[key].cases[0].evidenceRef = 'private-sentinel'; },
    ]),
  ];
  for (const mutate of mutations) {
    const p = packet(); mutate(p);
    const result = checkEvidence(p);
    assert.equal(result.ok, false);
    assert.equal(result.productionVerifierAccepted, false);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
  }
});

test('missing sources, source drift and acceptance requirement tampering fail closed', () => {
  for (const file of SOURCES) {
    assert.equal(checkEvidence(packet(), { readSource: source => {
      const bytes = fs.readFileSync(path.join(root, source));
      return source === file ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes;
    } }).ok, false);
  }
  assert.equal(checkEvidence(packet(), { readSource: () => { throw Error('private-path'); } }).ok, false);
});

test('candidate is unreachable from production source and carries no runtime client', () => {
  const candidate = fs.readFileSync(path.join(root, SOURCES[0]), 'utf8');
  assert.doesNotMatch(candidate, /process\.env|fetch\s*\(|node:fs|child_process|convex\/browser|console\./);
  // Enumerate runtime trees, including nested entrypoints, not just known routers.
  function scan(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.(?:js|ts|tsx)$/.test(file)) assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /productionVerifierCandidate|cad-production-verifier-evidence/);
    }
  }
  for (const dir of ['server', 'api', 'convex']) if (fs.existsSync(path.join(root, dir))) scan(dir);
});
