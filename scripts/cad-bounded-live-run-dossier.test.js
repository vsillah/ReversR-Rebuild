const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const packet = require('../offline/cad-convex/boundedLiveRunDossier.json');
const prior = require('../offline/cad-convex/liveAdapterRunPacket.json');
const { inspectBoundedLiveRunDossier: inspect } = require('../offline/cad-convex/boundedLiveRunDossier');
function closed(value) {
  const result = inspect(value);
  for (const key of ['executable', 'liveQualified', 'publicationAuthorized', 'liveRunAuthorized'])
    assert.equal(result[key], false);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  return result;
}
test('closed dossier inventories unique missing prerequisites and twelve pending live proofs', () => {
  assert.equal(closed(packet).contractValid, true);
  const ids = packet.missingPrerequisites.map(p => p.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(closed(packet).missingPrerequisiteIds, ids);
  assert.ok(packet.missingPrerequisites.every(p => p.value === null && p.status === 'missing' && p.acceptance));
  assert.deepEqual(packet.postRunEvidence.map(e => e.requirementId), prior.evidence.map(e => e.requirementId));
  assert.ok(packet.postRunEvidence.every(e => e.status === 'pending' && e.disposition === null));
});
test('every changed or deleted leaf and injected approval fails closed', () => {
  function visit(value, path = []) {
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) visit(value[key], [...path, key]);
      return;
    }
    for (const remove of [false, true]) {
      const copy = structuredClone(packet); let parent = copy;
      for (const key of path.slice(0, -1)) parent = parent[key];
      if (remove) delete parent[path.at(-1)];
      else parent[path.at(-1)] = value === null ? 'filled' : typeof value === 'boolean' ? !value : typeof value === 'number' ? value + 1 : value + '-changed';
      assert.equal(closed(copy).contractValid, false, path.join('.'));
    }
  }
  visit(packet);
  for (const value of [null, {}, [], { ...packet, approved: true }, { ...packet, approval: 'proceed' }])
    assert.equal(closed(value).contractValid, false);
});
test('fully populated prerequisites and claimed publication/live approval never enable a runner', () => {
  const filled = structuredClone(packet);
  for (const field of filled.missingPrerequisites) { field.value = 'reviewed-fixture'; field.status = 'accepted'; }
  for (const slot of filled.postRunEvidence) { slot.status = 'passed'; slot.disposition = 'pass'; }
  for (const gate of ['publication', 'liveRun', 'storeMutation']) {
    filled.gates[gate] = true;
    assert.equal(closed(filled).contractValid, false);
  }
  assert.equal(closed({ ...packet, publicationApproval: 'Approve source publication only' }).contractValid, false);
  assert.equal(closed(packet).contractValid, true, 'inspection must not mutate original');
});
test('operation matrix preserves allowlist and fits shared ceilings without authorizing store restart', () => {
  assert.deepEqual(packet.operationMatrix.map(r => r.operation), prior.operations);
  assert.equal(packet.operationMatrix.reduce((n, r) => n + r.maxLogicalCommands, 0), 256);
  assert.equal(packet.operationMatrix.reduce((n, r) => n + r.maxTransactionAttempts, 0), 762);
  assert.ok(packet.operationMatrix.every(r => !r.authorized && r.maxTransactionAttempts <= r.maxLogicalCommands * 3));
  for (const [key, value] of Object.entries(prior.resources))
    if (typeof value === 'number') assert.ok(packet.proposedLimits[key] <= value, key);
  assert.equal(packet.proposedLimits.maxStoreRestarts, 0);
  assert.deepEqual(packet.separatelyBlockedOperations, prior.separateApprovalOperations);
});
test('checker is pure, isolated and source publication wording excludes live authority', () => {
  const source = fs.readFileSync(require.resolve('../offline/cad-convex/boundedLiveRunDossier'), 'utf8');
  assert.doesNotMatch(source, /require\s*\(|process\.|fetch\s*\(|import\s|child_process|https?:|eval\s*\(|new Function/);
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /boundedLiveRunDossier/);
  const doc = fs.readFileSync(require('node:path').join(__dirname, '../docs/cad-bounded-live-run-dossier.md'), 'utf8');
  assert.match(doc, /Approve pushing only commit \[full SHA\] from codex\/cad-bounded-live-run-dossier/);
  assert.match(doc, /Publication never grants live-run authority/);
});
