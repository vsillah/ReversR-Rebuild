// Pure offline fill-plan inspection. It never resolves private refs or runs command cards.
const { createHash } = require('node:crypto');
const planTemplate = require('./privateEvidenceCommandCardFillPlan.json');
const approvalTemplate = require('./liveRunApprovalPacket.json');
const commandCardTemplate = require('./runnerCommandCards.json');
const durableAssembly = require('./liveDurableRunPacketAssembly.json');

const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameKeys = (actual, expected) => isObject(actual)
  && same(Object.keys(actual).sort(), Object.keys(expected).sort());
const hasRawPrivateValue = value => typeof value === 'string'
  && (/\/Users\//.test(value) || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
    || /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/.test(value)
    || /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(value));

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, output));
  else if (isObject(value)) Object.values(value).forEach(item => collectStrings(item, output));
  return output;
}

function collectPlannedFields(packet) {
  const groups = packet.fieldFillPlan.privateGroups;
  return [
    ...packet.fieldFillPlan.sourceResolved.map(item => item.id),
    ...Object.values(groups).flat(),
  ];
}

function inspectPrivateEvidenceCommandCardFillPlan(packet) {
  const errors = new Set();
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    sourceResolvedComplete: errors.size === 0,
    privateEvidenceComplete: false,
    commandCardsComplete: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    proposedAllocationDigest: errors.size === 0 ? digest(packet.commandCardPlan.proposedC2C3Allocation) : null,
    missingPrivateFields: sameKeys(packet, planTemplate) ? Object.values(packet.fieldFillPlan.privateGroups).flat() : [],
    errors: [...errors],
  });

  if (!sameKeys(packet, planTemplate)) {
    errors.add('PACKET_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'baseCommit', 'predecessor', 'expensesUsd',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
    'privateEvidenceComplete', 'commandCardsComplete', 'readyForLiveRunApproval']) {
    if (!same(packet[key], planTemplate[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (!sameKeys(packet.gates, planTemplate.gates) || Object.values(packet.gates).some(value => value !== false))
    errors.add('GATE_CHANGED');
  if (collectStrings(packet).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');

  if (packet.sourceBindings.adapterCommit !== durableAssembly.sourceDerived.adapterCommit
    || packet.sourceBindings.runnerCommit !== durableAssembly.sourceDerived.runnerCommit
    || packet.sourceBindings.implementationCommit !== durableAssembly.sourceDerived.implementationCommit
    || packet.sourceBindings.operationCounterTemplateDigest !== durableAssembly.sourceDerived.operationCounterTemplateDigest)
    errors.add('SOURCE_BINDING_MISMATCH');

  const expectedSourceResolved = durableAssembly.sourceResolvedApprovalFields;
  const sourceResolvedIds = packet.fieldFillPlan.sourceResolved.map(item => item.id).sort();
  if (!same(sourceResolvedIds, Object.keys(expectedSourceResolved).sort())) errors.add('SOURCE_RESOLVED_INVENTORY_INVALID');
  for (const item of packet.fieldFillPlan.sourceResolved) {
    if (!sameKeys(item, { id: '', publicValue: '', evidenceRef: '', acceptance: '' })) {
      errors.add('SOURCE_RESOLVED_ENTRY_INVALID');
      continue;
    }
    if (item.publicValue !== expectedSourceResolved[item.id] || !/^rrb-ref:[a-z0-9-]{1,80}$/.test(item.evidenceRef))
      errors.add('SOURCE_RESOLVED_VALUE_INVALID');
  }

  const approvalFields = Object.keys(approvalTemplate.fields).sort();
  const plannedFields = collectPlannedFields(packet);
  if (!same([...new Set(plannedFields)].sort(), approvalFields) || plannedFields.length !== approvalFields.length)
    errors.add('FIELD_COVERAGE_INVALID');

  const cardPlan = packet.commandCardPlan;
  if (!same(cardPlan.topLevelFields, Object.keys(commandCardTemplate.fields))) errors.add('COMMAND_TOP_FIELDS_INVALID');
  for (const card of cardPlan.cards) {
    const expected = commandCardTemplate.cards.find(item => item.id === card.id);
    if (!sameKeys(card, { id: '', effect: '', restrictedBytesRequired: false, storeMutationAllowed: false })
      || !expected || card.effect !== expected.effect || card.restrictedBytesRequired !== true
      || card.storeMutationAllowed !== false) errors.add('COMMAND_CARD_INVALID');
  }
  if (!same(cardPlan.cards.map(card => card.id), commandCardTemplate.cards.map(card => card.id)))
    errors.add('COMMAND_CARD_ORDER_INVALID');
  if (!same(cardPlan.perCardFields, Object.keys(commandCardTemplate.cards[0].fields)))
    errors.add('COMMAND_CARD_FIELDS_INVALID');
  if (!Array.isArray(cardPlan.proposedC2C3Allocation)
    || cardPlan.proposedC2C3Allocation.length !== commandCardTemplate.operationMatrix.length)
    errors.add('ALLOCATION_INVENTORY_INVALID');
  else {
    const c3Allowed = new Set(['read-exact-selector', 'read-authority-dependencies', 'mark-unknown',
      'claim-cas', 'settle-from-independent-synthetic-receipt', 'scan-bounded-page']);
    let logicalTotal = 0;
    let attemptTotal = 0;
    cardPlan.proposedC2C3Allocation.forEach((row, index) => {
      const expected = commandCardTemplate.operationMatrix[index];
      if (!sameKeys(row, {
        operation: '',
        c2LogicalCommands: 0,
        c2TransactionAttempts: 0,
        c3LogicalCommands: 0,
        c3TransactionAttempts: 0,
      }) || row.operation !== expected.operation) {
        errors.add('ALLOCATION_ROW_INVALID');
        return;
      }
      const values = [row.c2LogicalCommands, row.c2TransactionAttempts, row.c3LogicalCommands, row.c3TransactionAttempts];
      if (values.some(value => !Number.isSafeInteger(value) || value < 0)) errors.add('ALLOCATION_VALUE_INVALID');
      if (!c3Allowed.has(row.operation) && (row.c3LogicalCommands !== 0 || row.c3TransactionAttempts !== 0))
        errors.add('C3_EFFECT_FORBIDDEN');
      if (row.c2LogicalCommands + row.c3LogicalCommands !== expected.maxLogicalCommands
        || row.c2TransactionAttempts + row.c3TransactionAttempts !== expected.maxTransactionAttempts)
        errors.add('ALLOCATION_LIMIT_MISMATCH');
      logicalTotal += row.c2LogicalCommands + row.c3LogicalCommands;
      attemptTotal += row.c2TransactionAttempts + row.c3TransactionAttempts;
    });
    if (logicalTotal !== commandCardTemplate.limits.maxLogicalCommands
      || attemptTotal !== commandCardTemplate.limits.maxTransactionAttemptsTotal - 6)
      errors.add('ALLOCATION_TOTAL_INVALID');
  }
  if (cardPlan.proposedAllocationDigest !== digest(cardPlan.proposedC2C3Allocation))
    errors.add('ALLOCATION_DIGEST_INVALID');

  if (packet.costAndTimePlan.maxRunSeconds !== approvalTemplate.limits.maxRunSeconds
    || packet.costAndTimePlan.maxEnforcedCapMicros !== 9000000
    || packet.costAndTimePlan.estimatesAreSufficient !== false)
    errors.add('COST_TIME_PLAN_INVALID');
  if (packet.privateResourceBindingPlan.privateValueInGit !== false
    || packet.rollbackAndRetentionPlan.deletionAuthorized !== false
    || packet.rollbackAndRetentionPlan.retainedStateCustodyRequired !== true)
    errors.add('BOUNDARY_PLAN_INVALID');
  if (!packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.liveQualificationTemplate.includes('Keep uploads disabled')
    || !packet.nextHumanGates.liveQualificationTemplate.includes('No automatic retry after expiry'))
    errors.add('APPROVAL_TEMPLATE_INVALID');

  return result();
}

module.exports = { inspectPrivateEvidenceCommandCardFillPlan, template: clone(planTemplate) };
