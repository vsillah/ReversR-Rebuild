const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const packet = require('../offline/cad-convex/privateEvidenceCommandCardFillPlan.json');
const approvalTemplate = require('../offline/cad-convex/liveRunApprovalPacket.json');
const commandCardTemplate = require('../offline/cad-convex/runnerCommandCards.json');
const durableAssembly = require('../offline/cad-convex/liveDurableRunPacketAssembly.json');
const { inspectPrivateEvidenceCommandCardFillPlan: inspect } = require('../offline/cad-convex/privateEvidenceCommandCardFillPlan');

const digest = value => crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const plannedFields = value => [
  ...value.fieldFillPlan.sourceResolved.map(item => item.id),
  ...Object.values(value.fieldFillPlan.privateGroups).flat(),
];

test('fill plan covers every approval field and remains blocked', () => {
  const result = inspect(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.decision, 'LIVE_RUN_BLOCKED');
  for (const key of ['privateEvidenceComplete', 'commandCardsComplete', 'readyForLiveRunApproval',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled']) assert.equal(result[key], false);
  assert.deepEqual([...new Set(plannedFields(packet))].sort(), Object.keys(approvalTemplate.fields).sort());
  assert.equal(plannedFields(packet).length, Object.keys(approvalTemplate.fields).length);
  assert.ok(result.missingPrivateFields.includes('identity.privateResourceBindingRef'));
  assert.ok(result.missingPrivateFields.includes('evidence.restrictedDestinationRef'));
});

test('source-resolved fields bind the PR 210 packet without adding private evidence', () => {
  assert.equal(packet.baseCommit, 'c785c79e7ed3b1b5eea1868a82a41740fa2451ed');
  assert.equal(packet.sourceBindings.adapterCommit, durableAssembly.sourceDerived.adapterCommit);
  assert.equal(packet.sourceBindings.runnerCommit, durableAssembly.sourceDerived.runnerCommit);
  assert.equal(packet.sourceBindings.implementationCommit, durableAssembly.sourceDerived.implementationCommit);
  assert.equal(packet.sourceBindings.operationCounterTemplateDigest, durableAssembly.sourceDerived.operationCounterTemplateDigest);
  for (const item of packet.fieldFillPlan.sourceResolved)
    assert.equal(item.publicValue, durableAssembly.sourceResolvedApprovalFields[item.id]);
});

test('command-card fill plan inventories C0-C4 fields and preserves shared operation totals', () => {
  assert.deepEqual(packet.commandCardPlan.topLevelFields, Object.keys(commandCardTemplate.fields));
  assert.deepEqual(packet.commandCardPlan.cards.map(card => card.id), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.deepEqual(packet.commandCardPlan.cards.map(card => card.effect), commandCardTemplate.cards.map(card => card.effect));
  assert.deepEqual(packet.commandCardPlan.perCardFields, Object.keys(commandCardTemplate.cards[0].fields));
  assert.equal(packet.commandCardPlan.proposedAllocationDigest, digest(packet.commandCardPlan.proposedC2C3Allocation));
  let logical = 0;
  let attempts = 0;
  packet.commandCardPlan.proposedC2C3Allocation.forEach((row, index) => {
    const expected = commandCardTemplate.operationMatrix[index];
    assert.equal(row.operation, expected.operation);
    assert.equal(row.c2LogicalCommands + row.c3LogicalCommands, expected.maxLogicalCommands);
    assert.equal(row.c2TransactionAttempts + row.c3TransactionAttempts, expected.maxTransactionAttempts);
    logical += row.c2LogicalCommands + row.c3LogicalCommands;
    attempts += row.c2TransactionAttempts + row.c3TransactionAttempts;
  });
  assert.equal(logical, commandCardTemplate.limits.maxLogicalCommands);
  assert.equal(attempts, commandCardTemplate.limits.maxTransactionAttemptsTotal - 6);
});

test('mutated gates, field coverage, allocations and private-looking values fail closed without echo', () => {
  for (const mutate of [
    p => p.gates.liveRun = true,
    p => p.liveRunAuthorized = true,
    p => p.fieldFillPlan.privateGroups.cost.pop(),
    p => p.fieldFillPlan.privateGroups.cost.push('identity.runId'),
    p => p.commandCardPlan.cards.reverse(),
    p => p.commandCardPlan.proposedC2C3Allocation[2].c3LogicalCommands = 1,
    p => p.commandCardPlan.proposedAllocationDigest = 'f'.repeat(64),
    p => p.fieldFillPlan.sourceResolved[0].publicValue = 'PRIVATE_SENTINEL_VALUE',
  ]) {
    const candidate = structuredClone(packet);
    mutate(candidate);
    const result = inspect(candidate);
    assert.equal(result.structureValid, false);
    assert.equal(result.readyForLiveRunApproval, false);
    assert.equal(result.liveRunAuthorized, false);
    assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL_VALUE'));
  }
});

test('source packet is non-executable and documentation has future approval wording', () => {
  const source = fs.readFileSync('offline/cad-convex/privateEvidenceCommandCardFillPlan.js', 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/);
  const doc = fs.readFileSync('docs/cad-private-evidence-command-card-fill.md', 'utf8');
  assert.match(doc, /source-only private evidence and command-card fill planning/);
  assert.match(doc, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.match(doc, /Keep uploads disabled/);
  assert.doesNotMatch(doc, /\/Users\//);
});
