const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkRebind, PACKET, REQUIRED_SOURCES } = require('./cad-internal-admission-current-commit-rebind-checker');
const packet = JSON.parse(fs.readFileSync(PACKET));
const expectedCommit = '046ff00368caa98f13c9a105fa30ec7036bdc57f';
const staleCommit = '92db313ed4c3452e98c72ac16bf1bf16e84159f7';
const check = value => checkRebind(value, { expectedCommit });
test('current source review passes without conveying activation readiness', () => {
  const result = check(packet);
  assert.equal(result.ok, true, result.problems.join('\n'));
  assert.equal(result.readyForSeparateActivationApproval, false);
  assert.equal(result.routeMayOpenNow, false);
});
test('caller must explicitly supply expected merge commit; advancing it invalidates old evidence', () => {
  assert.equal(checkRebind(packet).ok, false);
  assert.equal(checkRebind(packet, { expectedCommit: 'a'.repeat(40) }).ok, false);
});
for (const [label, mutate] of [
  ['old candidate base', p => { p.baseCommit = staleCommit; }],
  ['old exact opening', p => { p.effectiveOpeningEvidence.exactRuntimeCommit = staleCommit; }],
  ['old smoke', p => { p.productionFailClosedSmoke.commit = staleCommit; }],
  ['old cache buster', p => { p.productionFailClosedSmoke.cacheBuster = 'qa=92db313'; }],
  ['old bridge', p => { p.effectiveOpeningEvidence.bridgeIncludedInMerge = staleCommit; }],
  ['missing bridge', p => { delete p.sourceBindings[REQUIRED_SOURCES[3]]; }],
  ['missing smoke denial', p => { p.productionFailClosedSmoke.results.splice(2, 1); }],
  ['missing provenance', p => { delete p.productionFailClosedSmoke.source; }],
  ['reused old window', p => { p.effectiveOpeningEvidence.startsAtUtc = '2026-09-22T17:00:00Z'; }],
  ['approval transfer', p => { p.effectiveOpeningEvidence.humanQaAcceptedForRebind = true; }],
  ['activation grant', p => { p.authorizes.productionUploadActivation = true; }],
]) test(`rejects ${label}`, () => {
  const changed = structuredClone(packet);
  mutate(changed);
  assert.equal(check(changed).ok, false);
});
test('changed bridge source invalidates digest even when packet commit stays current', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-rebind-'));
  try {
    for (const file of REQUIRED_SOURCES) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.copyFileSync(file, path.join(root, file));
    }
    fs.appendFileSync(path.join(root, 'server/cadExactSessionBridge.js'), '\n// stale binding fixture\n');
    const result = checkRebind(packet, { expectedCommit, root });
    assert.ok(result.problems.includes('stale source digest: server/cadExactSessionBridge.js'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
