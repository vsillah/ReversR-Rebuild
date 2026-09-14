// Source-safe restricted register projection. It never reads files, providers, env or secrets.
const { createHash } = require('node:crypto');
const packetTemplate = require('./privateRestrictedRegisterReview.json');
const priorPacket = require('./restrictedEvidenceCommandCardBytes.json');
const fillPlan = require('./privateEvidenceCommandCardFillPlan.json');
const commandCardTemplate = require('./runnerCommandCards.json');
const {
  createRestrictedProjectionTemplate,
  inspectRestrictedProjection,
} = require('./restrictedEvidenceCommandCardBytes');
const { inspectCommandCards } = require('./runnerCommandCards');

const clone = value => JSON.parse(JSON.stringify(value));
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
  && value <= packetTemplate.limits.maxRestrictedReceiptBytes;
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

function safeRef(label) {
  return 'rrb-ref:' + String(label).replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/[A-Z]/g, s => s.toLowerCase()).replace(/^-+|-+$/g, '').slice(0, 72);
}

function hashLabel(label) {
  return digestBytes('rrb-cad-restricted-review:' + label);
}

function inspectPrivateRestrictedRegisterReview(packet, projection = null) {
  const errors = new Set();
  let projectionResult = null;
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    projectionComplete: projectionResult ? projectionResult.projectionComplete : false,
    restrictedEvidenceAccepted: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    publicProjectionOnly: packet && packet.publicProjectionOnly === true,
    errors: [...errors],
  });

  if (!sameKeys(packet, packetTemplate)) {
    errors.add('PACKET_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'baseCommit', 'predecessor', 'expensesUsd',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled',
    'restrictedEvidenceAccepted', 'readyForLiveRunApproval', 'publicProjectionOnly']) {
    if (!same(packet[key], packetTemplate[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (!sameKeys(packet.gates, packetTemplate.gates) || Object.values(packet.gates).some(value => value !== false))
    errors.add('GATE_CHANGED');
  if (packet.sourceBindings.restrictedEvidenceCommandCardBytesCommit !== packet.baseCommit
    || packet.sourceBindings.adapterCommit !== priorPacket.sourceBindings.adapterCommit
    || packet.sourceBindings.runnerCommit !== priorPacket.sourceBindings.runnerCommit
    || packet.sourceBindings.implementationCommit !== priorPacket.sourceBindings.implementationCommit
    || packet.sourceBindings.proposedAllocationDigest !== priorPacket.sourceBindings.proposedAllocationDigest
    || packet.sourceBindings.operationCounterTemplateDigest !== priorPacket.sourceBindings.operationCounterTemplateDigest)
    errors.add('SOURCE_BINDING_MISMATCH');
  if (packet.inventory.sourceResolvedApprovalFields !== fillPlan.fieldFillPlan.sourceResolved.length
    || packet.inventory.restrictedApprovalFields !== privateFieldIds().length
    || packet.inventory.commandCards !== commandCardTemplate.cards.length
    || packet.inventory.commandCardTopLevelFields !== Object.keys(commandCardTemplate.fields).length
    || packet.inventory.commandCardPerCardFields !== Object.keys(commandCardTemplate.cards[0].fields).length
    || packet.inventory.operationRows !== commandCardTemplate.operationMatrix.length)
    errors.add('INVENTORY_COUNT_INVALID');
  if (packet.limits.maxProjectionBytes !== priorPacket.limits.maxProjectionBytes
    || packet.limits.maxRestrictedCommandBytesPerCard !== priorPacket.limits.maxRestrictedCommandBytesPerCard
    || packet.limits.maxTotalRestrictedCommandBytes !== priorPacket.limits.maxTotalRestrictedCommandBytes
    || packet.limits.maxRunSeconds !== priorPacket.limits.maxRunSeconds
    || packet.limits.maxEnforcedCapMicros !== priorPacket.limits.maxEnforcedCapMicros)
    errors.add('LIMIT_INVALID');
  if (packet.privateRegisterContract.rawValuePublic !== false
    || packet.privateRegisterContract.rawCommandBytesPublic !== false
    || packet.privateRegisterContract.secretGenerationAuthorized !== false
    || packet.privateRegisterContract.providerReadAuthorized !== false
    || packet.privateRegisterContract.providerMutationAuthorized !== false
    || packet.privateRegisterContract.liveRunAuthorized !== false)
    errors.add('PRIVATE_REGISTER_BOUNDARY_INVALID');
  if (!packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.restrictedEvidenceAcceptanceTemplate.includes('authorizes no live run')
    || !packet.nextHumanGates.liveRunTemplate.includes('Keep uploads disabled'))
    errors.add('APPROVAL_TEMPLATE_INVALID');
  if (collectStrings(packet).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  if (projection !== null) {
    projectionResult = inspectRestrictedProjection(projection);
    if (!projectionResult.structureValid) errors.add('PUBLIC_PROJECTION_INVALID');
    if (!projectionResult.projectionComplete) errors.add('PUBLIC_PROJECTION_INCOMPLETE');
  }
  return result();
}

function fillCommandCardFields(packet) {
  packet.fields.runnerCommit = packetTemplate.sourceBindings.runnerCommit;
  packet.fields.adapterCommit = packetTemplate.sourceBindings.adapterCommit;
  for (const key of Object.keys(packet.fields)) {
    if (packet.fields[key] === null) packet.fields[key] = hashLabel('command-top:' + key);
  }
  packet.cards.forEach(card => {
    for (const key of Object.keys(card.fields)) {
      card.fields[key] = key === 'restrictedCommandRef' ? safeRef('restricted-command-' + card.id)
        : key === 'timeoutMs' ? 5000
          : hashLabel('command-card:' + card.id + ':' + key);
    }
  });
  return packet;
}

function createSyntheticRestrictedRegisterFixture() {
  const projectionTemplate = createRestrictedProjectionTemplate();
  const commandCards = fillCommandCardFields(clone(projectionTemplate.commandCards));
  const restrictedCommandBytes = Object.fromEntries(commandCards.cards.map(card => [
    card.id,
    JSON.stringify({
      schemaVersion: 1,
      cardId: card.id,
      effect: card.effect,
      executable: false,
      sourceRef: safeRef('source-' + card.id),
      commandRef: card.fields.restrictedCommandRef,
      argvDigest: card.fields.argvDigest,
      expectedStop: card.stopCounterpart,
    }),
  ]));
  return {
    schemaVersion: 1,
    mode: packetTemplate.privateRegisterContract.mode,
    baseCommit: packetTemplate.baseCommit,
    restrictedEvidence: Object.fromEntries(privateFieldIds().map(id => [id, {
      ref: safeRef('restricted-' + id),
      valueBytes: 'restricted-local-value:' + id + ':' + packetTemplate.baseCommit,
      evidenceBytes: 'reviewed-local-evidence:' + id + ':' + hashLabel(id),
      reviewerRef: safeRef('reviewer-' + id),
      reviewedUtc: '2026-09-14T11:00:00Z',
    }])),
    commandCards,
    restrictedCommandBytes,
    sanitizedDestinationRef: 'rrb-ref:cad-sanitized-evidence-destination',
    restrictedDestinationRef: 'rrb-ref:cad-restricted-evidence-destination',
    independentReviewRef: 'rrb-ref:cad-independent-review-required',
  };
}

function createSourceSafeProjectionFromRestrictedRegister(register) {
  const errors = new Set();
  const result = projection => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    projectionComplete: false,
    restrictedEvidenceAccepted: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    projection,
    errors: [...errors],
  });
  const expectedRegister = createSyntheticRestrictedRegisterFixture();
  const registerShape = Object.fromEntries(Object.keys(expectedRegister).map(key => [key, null]));
  if (!sameKeys(register, registerShape)) {
    errors.add('RESTRICTED_REGISTER_SHAPE_INVALID');
    return result(null);
  }
  if (register.schemaVersion !== 1 || register.mode !== packetTemplate.privateRegisterContract.mode
    || register.baseCommit !== packetTemplate.baseCommit)
    errors.add('RESTRICTED_REGISTER_IDENTITY_INVALID');
  if (!sameKeys(register.restrictedEvidence, expectedRegister.restrictedEvidence)
    || Object.keys(register.restrictedEvidence).length !== privateFieldIds().length)
    errors.add('RESTRICTED_EVIDENCE_INVENTORY_INVALID');
  if (!sameKeys(register.restrictedCommandBytes, expectedRegister.restrictedCommandBytes)
    || !same(Object.keys(register.restrictedCommandBytes), packetTemplate.privateRegisterContract.requiredCommandCards))
    errors.add('RESTRICTED_COMMAND_INVENTORY_INVALID');
  if (!ref(register.sanitizedDestinationRef) || !ref(register.restrictedDestinationRef) || !ref(register.independentReviewRef))
    errors.add('DESTINATION_REF_INVALID');
  if (collectStrings({
    refs: [register.sanitizedDestinationRef, register.restrictedDestinationRef, register.independentReviewRef],
    commandCards: register.commandCards,
  }).some(hasRawPrivateValue)) errors.add('PUBLIC_BOUNDARY_VALUE_INVALID');
  if (errors.has('DESTINATION_REF_INVALID') || errors.has('PUBLIC_BOUNDARY_VALUE_INVALID')) return result(null);

  const projection = createRestrictedProjectionTemplate();
  projection.commandCards = clone(register.commandCards);

  if (errors.has('RESTRICTED_EVIDENCE_INVENTORY_INVALID')) return result(projection);
  for (const id of privateFieldIds()) {
    const receipt = register.restrictedEvidence[id];
    if (!sameKeys(receipt, expectedRegister.restrictedEvidence[id]) || !ref(receipt.ref)
      || !ref(receipt.reviewerRef) || !utc(receipt.reviewedUtc)
      || typeof receipt.valueBytes !== 'string' || typeof receipt.evidenceBytes !== 'string'
      || byteCount(Buffer.byteLength(receipt.valueBytes, 'utf8')) === false
      || byteCount(Buffer.byteLength(receipt.evidenceBytes, 'utf8')) === false) {
      errors.add('RESTRICTED_RECEIPT_INVALID');
      continue;
    }
    projection.restrictedEvidence[id] = {
      ref: receipt.ref,
      valueDigest: digestBytes(receipt.valueBytes),
      evidenceDigest: digestBytes(receipt.evidenceBytes),
      reviewerRef: receipt.reviewerRef,
      reviewedUtc: receipt.reviewedUtc,
      byteCount: Buffer.byteLength(receipt.valueBytes + receipt.evidenceBytes, 'utf8'),
    };
  }
  let totalCommandBytes = 0;
  const commandDigestSet = {};
  for (const cardId of packetTemplate.privateRegisterContract.requiredCommandCards) {
    const bytes = register.restrictedCommandBytes[cardId];
    if (typeof bytes !== 'string') {
      errors.add('RESTRICTED_COMMAND_BYTES_INVALID');
      continue;
    }
    const count = Buffer.byteLength(bytes, 'utf8');
    if (count <= 0 || count > packetTemplate.limits.maxRestrictedCommandBytesPerCard)
      errors.add('RESTRICTED_COMMAND_BYTES_INVALID');
    projection.restrictedCommandByteCounts[cardId] = count;
    commandDigestSet[cardId] = digestBytes(bytes);
    const card = projection.commandCards.cards.find(item => item.id === cardId);
    if (card) card.fields.restrictedCommandDigest = commandDigestSet[cardId];
    totalCommandBytes += count;
  }
  const commandInspection = inspectCommandCards(JSON.stringify(projection.commandCards));
  if (!commandInspection.structureValid || !commandInspection.fieldsComplete) {
    errors.add('COMMAND_CARD_PROJECTION_INVALID');
    return result(null);
  } else {
    projection.commandCardProjectionDigest = commandInspection.packetSha256;
    projection.commandCardProjectionByteCount = Buffer.byteLength(JSON.stringify(projection.commandCards), 'utf8');
  }
  if (totalCommandBytes > packetTemplate.limits.maxTotalRestrictedCommandBytes)
    errors.add('RESTRICTED_COMMAND_TOTAL_INVALID');
  projection.restrictedCommandSetDigest = digestBytes(JSON.stringify(commandDigestSet));
  const registerBytes = JSON.stringify(register);
  projection.restrictedRegisterDigest = digestBytes(registerBytes);
  projection.restrictedRegisterByteCount = Buffer.byteLength(registerBytes, 'utf8');
  projection.sanitizedDestinationRef = register.sanitizedDestinationRef;
  projection.restrictedDestinationRef = register.restrictedDestinationRef;
  projection.independentReviewRef = register.independentReviewRef;
  if (collectStrings(projection).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  const projectionInspection = inspectRestrictedProjection(projection);
  if (!projectionInspection.structureValid) errors.add('PUBLIC_PROJECTION_INVALID');
  const response = result(projection);
  response.projectionComplete = projectionInspection.projectionComplete && errors.size === 0;
  return response;
}

module.exports = {
  inspectPrivateRestrictedRegisterReview,
  createSourceSafeProjectionFromRestrictedRegister,
  createSyntheticRestrictedRegisterFixture,
  template: clone(packetTemplate),
};
