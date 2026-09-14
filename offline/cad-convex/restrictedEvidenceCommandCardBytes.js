// Pure offline projection validation. It never reads restricted bytes or grants run authority.
const { createHash } = require('node:crypto');
const planTemplate = require('./restrictedEvidenceCommandCardBytes.json');
const fillPlan = require('./privateEvidenceCommandCardFillPlan.json');
const commandCardTemplate = require('./runnerCommandCards.json');
const { inspectCommandCards } = require('./runnerCommandCards');

const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const digestBytes = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (actual, expected) => isObject(actual)
  && same(Object.keys(actual).sort(), Object.keys(expected).sort());
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const ref = value => typeof value === 'string' && /^rrb-ref:[a-z0-9-]{1,80}$/.test(value);
const utc = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z');
const byteCount = value => Number.isSafeInteger(value) && value > 0
  && value <= planTemplate.limits.maxRestrictedReceiptBytes;
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

function privateFieldIds() {
  return Object.values(fillPlan.fieldFillPlan.privateGroups).flat();
}

function sourceResolvedFields() {
  return Object.fromEntries(fillPlan.fieldFillPlan.sourceResolved.map(item => [
    item.id,
    {
      publicValue: item.publicValue,
      evidenceRef: item.evidenceRef,
      valueDigest: digestBytes(item.publicValue),
    },
  ]));
}

function emptyReceipt() {
  return {
    ref: null,
    valueDigest: null,
    evidenceDigest: null,
    reviewerRef: null,
    reviewedUtc: null,
    byteCount: null,
  };
}

function expectedAllocation(cardId) {
  if (!['C2', 'C3'].includes(cardId)) return [];
  return fillPlan.commandCardPlan.proposedC2C3Allocation.map(row => ({
    operation: row.operation,
    logicalCommands: cardId === 'C2' ? row.c2LogicalCommands : row.c3LogicalCommands,
    transactionAttempts: cardId === 'C2' ? row.c2TransactionAttempts : row.c3TransactionAttempts,
  }));
}

function createCommandCardsProjectionTemplate() {
  const packet = clone(commandCardTemplate);
  packet.fields = Object.fromEntries(Object.keys(packet.fields).map(key => [key, null]));
  packet.cards = packet.cards.map(card => ({
    ...card,
    fields: Object.fromEntries(Object.keys(card.fields).map(key => [key, null])),
    allocation: expectedAllocation(card.id),
  }));
  return packet;
}

function createRestrictedProjectionTemplate() {
  return {
    schemaVersion: 1,
    mode: 'restricted-public-projection-template',
    baseCommit: planTemplate.baseCommit,
    sourceBindings: clone(planTemplate.sourceBindings),
    sourceResolved: sourceResolvedFields(),
    restrictedEvidence: Object.fromEntries(privateFieldIds().map(id => [id, emptyReceipt()])),
    commandCards: createCommandCardsProjectionTemplate(),
    restrictedCommandByteCounts: Object.fromEntries(commandCardTemplate.cards.map(card => [card.id, null])),
    restrictedCommandSetDigest: null,
    commandCardProjectionDigest: null,
    commandCardProjectionByteCount: null,
    restrictedRegisterDigest: null,
    restrictedRegisterByteCount: null,
    sanitizedDestinationRef: null,
    restrictedDestinationRef: null,
    independentReviewRef: null,
  };
}

function receiptComplete(value) {
  if (!sameKeys(value, emptyReceipt())) return false;
  return ref(value.ref) && sha(value.valueDigest) && sha(value.evidenceDigest)
    && ref(value.reviewerRef) && utc(value.reviewedUtc) && byteCount(value.byteCount);
}

function inspectRestrictedEvidenceCommandCardByteAssembly(packet) {
  const errors = new Set();
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    restrictedEvidenceComplete: false,
    commandCardBytesComplete: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    publicProjectionOnly: packet && packet.publicProjectionOnly === true,
    errors: [...errors],
  });
  if (!sameKeys(packet, planTemplate)) {
    errors.add('PACKET_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'baseCommit', 'predecessor', 'expensesUsd',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
    'restrictedEvidenceComplete', 'commandCardBytesComplete', 'readyForLiveRunApproval',
    'publicProjectionOnly']) {
    if (!same(packet[key], planTemplate[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (!sameKeys(packet.gates, planTemplate.gates) || Object.values(packet.gates).some(value => value !== false))
    errors.add('GATE_CHANGED');
  if (!same(packet.sourceBindings, planTemplate.sourceBindings)) errors.add('SOURCE_BINDING_CHANGED');
  if (packet.inventory.sourceResolvedApprovalFields !== fillPlan.fieldFillPlan.sourceResolved.length
    || packet.inventory.restrictedApprovalFields !== privateFieldIds().length
    || packet.inventory.totalApprovalFields !== Object.keys(require('./liveRunApprovalPacket.json').fields).length
    || packet.inventory.commandCards !== commandCardTemplate.cards.length
    || packet.inventory.commandCardTopLevelFields !== Object.keys(commandCardTemplate.fields).length
    || packet.inventory.commandCardPerCardFields !== Object.keys(commandCardTemplate.cards[0].fields).length
    || packet.inventory.operationRows !== commandCardTemplate.operationMatrix.length) errors.add('INVENTORY_COUNT_INVALID');
  if (packet.limits.maxProjectionBytes !== 65536
    || packet.limits.maxRestrictedCommandBytesPerCard !== 65536
    || packet.limits.maxTotalRestrictedCommandBytes !== 327680
    || packet.limits.maxRunSeconds !== commandCardTemplate.limits.maxRunSeconds
    || packet.limits.maxEnforcedCapMicros !== fillPlan.costAndTimePlan.maxEnforcedCapMicros
    || packet.limits.maxLogicalCommands !== commandCardTemplate.limits.maxLogicalCommands
    || packet.limits.maxTransactionAttemptsTotal !== commandCardTemplate.limits.maxTransactionAttemptsTotal)
    errors.add('LIMIT_INVALID');
  if (Object.values(packet.privacy).some(value => value !== false && value !== 'refs-byte-counts-and-digests-only'))
    errors.add('PRIVACY_BOUNDARY_INVALID');
  if (!same(packet.projectionRequirements.commandCardReceiptShape, fillPlan.commandCardPlan.perCardFields))
    errors.add('COMMAND_RECEIPT_SHAPE_INVALID');
  if (!same(packet.projectionRequirements.commandCardByteCountShape, commandCardTemplate.cards.map(card => card.id)))
    errors.add('COMMAND_BYTE_COUNT_SHAPE_INVALID');
  if (!same(packet.commandCardPlan.cards, fillPlan.commandCardPlan.cards)) errors.add('COMMAND_CARD_PLAN_CHANGED');
  if (!packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.restrictedReviewTemplate.includes('authorizes no live run')
    || !packet.nextHumanGates.liveRunTemplate.includes('Keep uploads disabled'))
    errors.add('APPROVAL_TEMPLATE_INVALID');
  if (collectStrings(packet).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  return result();
}

function inspectRestrictedProjection(projection) {
  const errors = new Set();
  const missing = new Set();
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    projectionComplete: errors.size === 0 && missing.size === 0,
    restrictedEvidenceComplete: false,
    commandCardBytesComplete: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    missingCount: missing.size,
    errors: [...errors],
  });
  const template = createRestrictedProjectionTemplate();
  if (!sameKeys(projection, template)) {
    errors.add('PROJECTION_SHAPE_INVALID');
    return result();
  }
  if (projection.schemaVersion !== template.schemaVersion || projection.mode !== template.mode
    || projection.baseCommit !== template.baseCommit || !same(projection.sourceBindings, template.sourceBindings)
    || !same(projection.sourceResolved, template.sourceResolved)) errors.add('PROJECTION_SOURCE_CHANGED');
  if (!sameKeys(projection.restrictedEvidence, template.restrictedEvidence)
    || Object.keys(projection.restrictedEvidence).length !== privateFieldIds().length)
    errors.add('RESTRICTED_EVIDENCE_INVENTORY_INVALID');
  else for (const [key, receipt] of Object.entries(projection.restrictedEvidence)) {
    if (!sameKeys(receipt, emptyReceipt())) {
      errors.add('RESTRICTED_RECEIPT_SHAPE_INVALID');
      continue;
    }
    if (Object.values(receipt).some(value => value === null)) missing.add(key);
    else if (!receiptComplete(receipt)) errors.add('RESTRICTED_RECEIPT_VALUE_INVALID');
  }
  const commandBytes = JSON.stringify(projection.commandCards);
  const cardResult = inspectCommandCards(commandBytes);
  if (!cardResult.structureValid) errors.add('COMMAND_CARD_PROJECTION_INVALID');
  if (!cardResult.fieldsComplete) missing.add('commandCards.C0-C4');
  if (projection.commandCardProjectionDigest === null) missing.add('commandCardProjectionDigest');
  else if (!sha(projection.commandCardProjectionDigest)
    || projection.commandCardProjectionDigest !== digestBytes(commandBytes)) errors.add('COMMAND_CARD_DIGEST_INVALID');
  if (projection.commandCardProjectionByteCount === null) missing.add('commandCardProjectionByteCount');
  else if (!Number.isSafeInteger(projection.commandCardProjectionByteCount)
    || projection.commandCardProjectionByteCount !== Buffer.byteLength(commandBytes, 'utf8')
    || projection.commandCardProjectionByteCount > planTemplate.limits.maxProjectionBytes)
    errors.add('COMMAND_CARD_BYTE_COUNT_INVALID');
  if (!sameKeys(projection.restrictedCommandByteCounts, template.restrictedCommandByteCounts))
    errors.add('COMMAND_BYTE_COUNT_INVENTORY_INVALID');
  else {
    let totalCommandBytes = 0;
    for (const [cardId, count] of Object.entries(projection.restrictedCommandByteCounts)) {
      if (count === null) {
        missing.add('restrictedCommandByteCounts.' + cardId);
        continue;
      }
      if (!Number.isSafeInteger(count) || count <= 0
        || count > planTemplate.limits.maxRestrictedCommandBytesPerCard) {
        errors.add('RESTRICTED_COMMAND_BYTE_COUNT_INVALID');
        continue;
      }
      totalCommandBytes += count;
    }
    if (totalCommandBytes > planTemplate.limits.maxTotalRestrictedCommandBytes)
      errors.add('COMMAND_BYTES_TOTAL_INVALID');
  }
  if (projection.restrictedCommandSetDigest === null) missing.add('restrictedCommandSetDigest');
  else if (!sha(projection.restrictedCommandSetDigest)) errors.add('RESTRICTED_COMMAND_SET_DIGEST_INVALID');
  for (const key of ['restrictedRegisterDigest']) {
    if (projection[key] === null) missing.add(key);
    else if (!sha(projection[key])) errors.add('PROJECTION_DIGEST_INVALID');
  }
  if (projection.restrictedRegisterByteCount === null) missing.add('restrictedRegisterByteCount');
  else if (!byteCount(projection.restrictedRegisterByteCount)) errors.add('RESTRICTED_REGISTER_BYTE_COUNT_INVALID');
  for (const key of ['sanitizedDestinationRef', 'restrictedDestinationRef', 'independentReviewRef']) {
    if (projection[key] === null) missing.add(key);
    else if (!ref(projection[key])) errors.add('PROJECTION_REF_INVALID');
  }
  if (collectStrings(projection).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  return result();
}

module.exports = {
  inspectRestrictedEvidenceCommandCardByteAssembly,
  inspectRestrictedProjection,
  createRestrictedProjectionTemplate,
  template: clone(planTemplate),
};
