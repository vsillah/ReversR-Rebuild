const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../offline/cad-convex/restrictedEvidenceCommandCardBytes.json');
const fillPlan = require('../offline/cad-convex/privateEvidenceCommandCardFillPlan.json');
const approvalTemplate = require('../offline/cad-convex/liveRunApprovalPacket.json');
const commandCards = require('../offline/cad-convex/runnerCommandCards.json');
const { inspectCommandCards } = require('../offline/cad-convex/runnerCommandCards');
const {
  inspectRestrictedEvidenceCommandCardByteAssembly: inspect,
  inspectRestrictedProjection,
  createRestrictedProjectionTemplate,
} = require('../offline/cad-convex/restrictedEvidenceCommandCardBytes');

const sha = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const privateIds = () => Object.values(fillPlan.fieldFillPlan.privateGroups).flat();

function completeProjection() {
  const projection = createRestrictedProjectionTemplate();
  const receipt = id => ({
    ref: 'rrb-ref:' + id.replaceAll('.', '-').replace(/[A-Z]/g, s => s.toLowerCase()).slice(0, 70),
    valueDigest: 'a'.repeat(64),
    evidenceDigest: 'b'.repeat(64),
    reviewerRef: 'rrb-ref:synthetic-reviewer',
    reviewedUtc: '2026-09-14T10:00:00Z',
    byteCount: 512,
  });
  for (const id of Object.keys(projection.restrictedEvidence)) projection.restrictedEvidence[id] = receipt(id);
  for (const key of Object.keys(projection.commandCards.fields))
    projection.commandCards.fields[key] = key.endsWith('Commit') ? 'c'.repeat(40) : 'd'.repeat(64);
  projection.commandCards.cards.forEach(card => {
    for (const key of Object.keys(card.fields)) {
      card.fields[key] = key === 'timeoutMs' ? 5000
        : key.endsWith('Ref') ? 'rrb-ref:synthetic-command-' + card.id.toLowerCase()
          : 'e'.repeat(64);
    }
  });
  const bytes = JSON.stringify(projection.commandCards);
  for (const card of projection.commandCards.cards) projection.restrictedCommandByteCounts[card.id] = 1024;
  projection.restrictedCommandSetDigest = '9'.repeat(64);
  projection.commandCardProjectionDigest = sha(bytes);
  projection.commandCardProjectionByteCount = Buffer.byteLength(bytes, 'utf8');
  projection.restrictedRegisterDigest = 'f'.repeat(64);
  projection.restrictedRegisterByteCount = 4096;
  projection.sanitizedDestinationRef = 'rrb-ref:synthetic-sanitized-destination';
  projection.restrictedDestinationRef = 'rrb-ref:synthetic-restricted-destination';
  projection.independentReviewRef = 'rrb-ref:synthetic-independent-review';
  return projection;
}

test('assembly packet inventories the PR 211 fill plan and remains blocked', () => {
  const result = inspect(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  for (const key of ['restrictedEvidenceComplete', 'commandCardBytesComplete',
    'readyForLiveRunApproval', 'executable', 'liveRunAuthorized', 'uploadsEnabled',
    'conversionEnabled']) assert.equal(result[key], false);
  assert.equal(packet.inventory.sourceResolvedApprovalFields, fillPlan.fieldFillPlan.sourceResolved.length);
  assert.equal(packet.inventory.restrictedApprovalFields, privateIds().length);
  assert.equal(packet.inventory.totalApprovalFields, Object.keys(approvalTemplate.fields).length);
  assert.equal(packet.inventory.commandCards, commandCards.cards.length);
  assert.equal(packet.sourceBindings.proposedAllocationDigest, fillPlan.commandCardPlan.proposedAllocationDigest);
});

test('generated projection covers every private field and command card without raw bytes', () => {
  const projection = createRestrictedProjectionTemplate();
  assert.deepEqual(Object.keys(projection.restrictedEvidence).sort(), privateIds().sort());
  assert.deepEqual(Object.keys(projection.sourceResolved).sort(),
    fillPlan.fieldFillPlan.sourceResolved.map(item => item.id).sort());
  assert.deepEqual(projection.commandCards.cards.map(card => card.id), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.deepEqual(projection.commandCards.cards.map(card => card.effect), commandCards.cards.map(card => card.effect));
  assert.deepEqual(Object.keys(projection.restrictedCommandByteCounts), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.equal(inspectRestrictedProjection(projection).projectionComplete, false);
  assert.ok(inspectRestrictedProjection(projection).missingCount > 0);
});

test('syntactically complete public projection stays blocked and validates command-card bytes', () => {
  const projection = completeProjection();
  const result = inspectRestrictedProjection(projection);
  assert.equal(result.structureValid, true);
  assert.equal(result.projectionComplete, true);
  for (const key of ['restrictedEvidenceComplete', 'commandCardBytesComplete',
    'readyForLiveRunApproval', 'executable', 'liveRunAuthorized', 'uploadsEnabled',
    'conversionEnabled']) assert.equal(result[key], false);
  const commandResult = inspectCommandCards(JSON.stringify(projection.commandCards));
  assert.equal(commandResult.structureValid, true);
  assert.equal(commandResult.fieldsComplete, true);
  assert.equal(commandResult.liveRunAuthorized, false);
});

test('mutated gates, inventories, byte counts, digests and private-looking values fail closed', () => {
  for (const mutate of [
    p => p.gates.liveRun = true,
    p => p.liveRunAuthorized = true,
    p => p.inventory.restrictedApprovalFields -= 1,
    p => p.sourceBindings.proposedAllocationDigest = '0'.repeat(64),
    p => p.privacy.rawCommandBytesInGit = true,
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
  }
  for (const mutate of [
    p => p.restrictedEvidence['identity.runId'].ref = 'PRIVATE_SENTINEL_VALUE',
    p => p.commandCards.cards[0].fields.executableSha256 = 'PRIVATE_SENTINEL_VALUE',
    p => p.commandCardProjectionDigest = '0'.repeat(64),
    p => p.commandCardProjectionByteCount += 1,
    p => p.restrictedCommandByteCounts.C2 = 65537,
    p => p.restrictedCommandSetDigest = 'bad',
    p => p.restrictedRegisterByteCount = 1048577,
    p => p.sanitizedDestinationRef = 'PRIVATE_SENTINEL_VALUE',
  ]) {
    const projection = completeProjection();
    mutate(projection);
    const result = inspectRestrictedProjection(projection);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL_VALUE'));
  }
});

test('source files are offline-only and documentation carries exact future gates', () => {
  const source = fs.readFileSync('offline/cad-convex/restrictedEvidenceCommandCardBytes.js', 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
  const doc = fs.readFileSync('docs/cad-restricted-evidence-command-card-bytes.md', 'utf8');
  assert.match(doc, /source-only restricted evidence and command-card byte assembly/);
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.match(doc, /authorizes no live run/);
  assert.doesNotMatch(doc, /\/Users\//);
});
