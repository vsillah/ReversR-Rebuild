const { createHash } = require('node:crypto');
const template = require('./liveDurableRunPacketAssembly.json');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (actual, expected) => isObject(actual)
  && Object.keys(actual).sort().join('\0') === Object.keys(expected).sort().join('\0');
const hex = (value, length) => typeof value === 'string'
  && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
const ref = value => typeof value === 'string' && /^rrb-ref:[a-z0-9-]{1,80}$/.test(value);

function inspectLiveDurableRunPacketAssembly(packet, sourceBytesByPath = {}) {
  const errors = new Set();
  const missingEvidenceIds = [];
  let sourceDigestsMatch = true;
  const fail = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: false,
    sourceDigestsMatch: false,
    sourceDerivedComplete: false,
    privateEvidenceComplete: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    missingEvidenceIds: [],
    errors: [...errors],
  });

  if (!sameKeys(packet, template)) {
    errors.add('PACKET_SHAPE_INVALID');
    return fail();
  }
  for (const key of ['schemaVersion', 'mode', 'baseCommit', 'sourceImplementationCommit', 'expensesUsd',
    'executable', 'liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled', 'sourceDerivedComplete',
    'privateEvidenceComplete', 'readyForLiveRunApproval', 'blockedScenarios']) {
    if (JSON.stringify(packet[key]) !== JSON.stringify(template[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (!sameKeys(packet.gates, template.gates) || Object.values(packet.gates).some(value => value !== false))
    errors.add('GATE_CHANGED');
  if (!sameKeys(packet.sourceDerived, template.sourceDerived)) errors.add('SOURCE_DERIVED_SHAPE_INVALID');
  if (!sameKeys(packet.sourceResolvedApprovalFields, template.sourceResolvedApprovalFields))
    errors.add('RESOLVED_FIELD_SHAPE_INVALID');
  if (!sameKeys(packet.nextHumanGates, template.nextHumanGates)) errors.add('APPROVAL_FIELD_SHAPE_INVALID');

  if (!hex(packet.baseCommit, 40) || !hex(packet.sourceImplementationCommit, 40)
    || !hex(packet.sourceDerived.adapterCommit, 40) || !hex(packet.sourceDerived.runnerCommit, 40)
    || !hex(packet.sourceDerived.implementationCommit, 40)
    || !hex(packet.sourceDerived.operationCounterTemplateDigest, 64)) errors.add('SOURCE_IDENTIFIER_INVALID');

  if (!Array.isArray(packet.sourceDerived.files) || packet.sourceDerived.files.length !== template.sourceDerived.files.length)
    errors.add('SOURCE_FILE_INVENTORY_INVALID');
  else {
    packet.sourceDerived.files.forEach((entry, index) => {
      const expected = template.sourceDerived.files[index];
      if (!sameKeys(entry, expected) || entry.path !== expected.path || entry.role !== expected.role
        || entry.sha256 !== expected.sha256 || !hex(entry.sha256, 64))
        errors.add('SOURCE_FILE_ENTRY_INVALID');
      if (Object.hasOwn(sourceBytesByPath, entry.path) && sha256(sourceBytesByPath[entry.path]) !== entry.sha256)
        sourceDigestsMatch = false;
    });
  }

  for (const [key, value] of Object.entries(packet.sourceResolvedApprovalFields)) {
    if (key.endsWith('Commit') && !hex(value, 40)) errors.add('RESOLVED_COMMIT_INVALID');
    if (key.endsWith('Ref') && !ref(value)) errors.add('RESOLVED_REF_INVALID');
  }

  if (!Array.isArray(packet.remainingEvidence) || packet.remainingEvidence.length === 0)
    errors.add('REMAINING_EVIDENCE_INVALID');
  else {
    const ids = new Set();
    for (const item of packet.remainingEvidence) {
      if (!sameKeys(item, { id: '', kind: '', reason: '' }) || typeof item.id !== 'string'
        || typeof item.kind !== 'string' || typeof item.reason !== 'string') errors.add('REMAINING_EVIDENCE_INVALID');
      else {
        ids.add(item.id);
        missingEvidenceIds.push(item.id);
      }
    }
    for (const required of ['identity.privateResourceBindingRef', 'identity.independentVerifierRef',
      'custody.*', 'window.*', 'cost.*', 'evidence.*', 'commandCards.C0-C4'])
      if (!ids.has(required)) errors.add('REQUIRED_BLOCKER_MISSING');
  }

  if (!packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.liveQualificationTemplate.includes('[run ID]')
    || !packet.nextHumanGates.liveQualificationTemplate.includes('Keep uploads disabled'))
    errors.add('APPROVAL_TEMPLATE_INVALID');

  return {
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    sourceDigestsMatch: errors.size === 0 && sourceDigestsMatch,
    sourceDerivedComplete: errors.size === 0 && sourceDigestsMatch && packet.sourceDerivedComplete === true,
    privateEvidenceComplete: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    missingEvidenceIds,
    errors: [...errors, ...(sourceDigestsMatch ? [] : ['SOURCE_DIGEST_MISMATCH'])],
  };
}

module.exports = { inspectLiveDurableRunPacketAssembly, template: clone(template) };
