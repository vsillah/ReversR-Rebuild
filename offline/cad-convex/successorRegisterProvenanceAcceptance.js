// Source-safe successor restricted-register acceptance validator.
// It never reads restricted files, providers, env, network, stores, or secrets.
const { createHash } = require('node:crypto');
const { isDeepStrictEqual: same } = require('node:util');
const packetTemplate = require('../../docs/cad-successor-register-provenance-acceptance.json');
const projectionTemplate = require('../../docs/cad-successor-register-provenance-projection.json');
const predecessorPacket = require('../../docs/cad-fresh-replacement-restricted-evidence.json');
const rolloverPacket = require('../../docs/cad-fresh-bounded-dev-run-register-rollover.json');
const fillPlan = require('./privateEvidenceCommandCardFillPlan.json');
const { inspectCommandCards } = require('./runnerCommandCards');

const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (actual, expected) => isObject(actual)
  && same(Object.keys(actual).sort(), Object.keys(expected).sort());
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const ref = value => typeof value === 'string' && /^rrb-ref:[a-z0-9-]{1,80}$/.test(value);
const utc = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z');
const byteCount = value => Number.isSafeInteger(value) && value > 0 && value <= 1048576;
const digestBytes = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
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

function allFalse(map) {
  return isObject(map) && Object.values(map).every(value => value === false);
}

function receiptComplete(receipt) {
  return sameKeys(receipt, {
    ref: null,
    valueDigest: null,
    evidenceDigest: null,
    reviewerRef: null,
    reviewedUtc: null,
    byteCount: null,
  }) && ref(receipt.ref) && sha(receipt.valueDigest) && sha(receipt.evidenceDigest)
    && ref(receipt.reviewerRef) && utc(receipt.reviewedUtc) && byteCount(receipt.byteCount);
}

function inspectProjection(projection, expectedSha256) {
  const errors = new Set();
  const result = () => ({ valid: errors.size === 0, errors: [...errors] });
  if (!sameKeys(projection, projectionTemplate)) {
    errors.add('PROJECTION_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'sourceMainCommit', 'sourcePr',
    'observedAtUtc', 'runRef', 'publicProjectionOnly', 'liveRunAuthorized',
    'uploadsEnabled', 'conversionEnabled']) {
    if (!same(projection[key], projectionTemplate[key])) errors.add('PROJECTION_IMMUTABLE_CHANGED');
  }
  if (!same(projection.predecessor, projectionTemplate.predecessor)) errors.add('PROJECTION_PREDECESSOR_CHANGED');
  if (!same(projection.window, projectionTemplate.window)) errors.add('PROJECTION_WINDOW_CHANGED');
  if (!allFalse(projection.gates)) errors.add('PROJECTION_GATE_CHANGED');
  if (!sameKeys(projection.restrictedEvidence, projectionTemplate.restrictedEvidence)
    || Object.keys(projection.restrictedEvidence).length !== privateFieldIds().length)
    errors.add('PROJECTION_EVIDENCE_INVENTORY_INVALID');
  else for (const receipt of Object.values(projection.restrictedEvidence)) {
    if (!receiptComplete(receipt)) errors.add('PROJECTION_RECEIPT_INVALID');
  }
  const commandInspection = inspectCommandCards(JSON.stringify(projection.commandCards));
  if (!commandInspection.structureValid || !commandInspection.fieldsComplete)
    errors.add('PROJECTION_COMMAND_CARDS_INVALID');
  if (!sameKeys(projection.restrictedCommandByteCounts, projectionTemplate.restrictedCommandByteCounts)
    || Object.values(projection.restrictedCommandByteCounts).some(value => !Number.isSafeInteger(value) || value <= 0 || value > 65536))
    errors.add('PROJECTION_COMMAND_BYTE_COUNTS_INVALID');
  if (!sha(projection.restrictedCommandSetDigest)
    || !sha(projection.commandCardProjectionDigest)
    || projection.commandCardProjectionDigest !== digestBytes(JSON.stringify(projection.commandCards))
    || !Number.isSafeInteger(projection.commandCardProjectionByteCount)
    || projection.commandCardProjectionByteCount !== Buffer.byteLength(JSON.stringify(projection.commandCards), 'utf8')
    || !sha(projection.restrictedRegisterDigest)
    || !byteCount(projection.restrictedRegisterByteCount))
    errors.add('PROJECTION_DIGESTS_INVALID');
  for (const key of ['sanitizedDestinationRef', 'restrictedDestinationRef', 'independentReviewRef']) {
    if (!ref(projection[key])) errors.add('PROJECTION_DESTINATION_REF_INVALID');
  }
  if (expectedSha256 && expectedSha256 !== digestBytes(JSON.stringify(projection, null, 2) + '\n'))
    errors.add('PROJECTION_FILE_DIGEST_INVALID');
  if (collectStrings(projection).some(hasRawPrivateValue)) errors.add('PROJECTION_PRIVATE_VALUE_PATTERN_DETECTED');
  return result();
}

function inspectSuccessorRegisterProvenanceAcceptance(packet, projection = null, projectionSha256 = null) {
  const errors = new Set();
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    readyForRestrictedEvidenceAcceptance: errors.size === 0,
    restrictedEvidenceAccepted: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    publicProjectionOnly: packet && packet.publicProjectionOnly === true,
    successorRegisterPrepared: packet && packet.localRestrictedArtifacts
      ? packet.localRestrictedArtifacts.successorRegisterPrepared === true : false,
    successorProjectionSha256: packet && packet.localRestrictedArtifacts
      ? packet.localRestrictedArtifacts.successorProjectionSha256 : null,
    errors: [...errors],
  });

  if (!sameKeys(packet, packetTemplate)) {
    errors.add('PACKET_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'status', 'sourceMainCommit', 'sourcePr',
    'observedAtUtc', 'expensesUsd', 'publicProjectionOnly']) {
    if (!same(packet[key], packetTemplate[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (packet.status !== 'RESTRICTED_EVIDENCE_ACCEPTANCE_PREPARED_NO_LIVE_AUTHORITY'
    || packet.sourceMainCommit !== 'bfd481fe2e5409c5cc384536543428c5627adb82'
    || packet.sourcePr !== 218
    || packet.expensesUsd !== 0)
    errors.add('PACKET_IDENTITY_INVALID');
  if (!utc(packet.observedAtUtc)) errors.add('OBSERVED_AT_INVALID');
  if (packet.predecessor.freshReplacementPacketSha256 !== 'adadfc84badd892708744feeca885e5498582282e793b3fc1bc15e8a96fc984d'
    || packet.predecessor.priorFreshRolloverProjectionSha256 !== predecessorPacket.predecessor.projectionSha256
    || packet.predecessor.priorFreshRolloverRegisterDigest !== predecessorPacket.predecessor.privateRestrictedRegisterDigest
    || packet.predecessor.priorFreshRolloverCommandCardProjectionDigest !== predecessorPacket.predecessor.commandCardProjectionDigest
    || packet.predecessor.priorFreshRolloverRestrictedCommandSetDigest !== predecessorPacket.predecessor.restrictedCommandSetDigest
    || packet.predecessor.priorFreshRolloverPlanningEvidenceSha256 !== rolloverPacket.planningEvidenceSha256
    || packet.predecessor.expiredRunCloseoutReceiptSha256 !== predecessorPacket.predecessor.expiredRunCloseoutReceiptSha256)
    errors.add('PREDECESSOR_BINDING_INVALID');
  const recovery = packet.provenanceRecovery;
  if (!sameKeys(recovery, packetTemplate.provenanceRecovery)
    || recovery.authenticOriginalRolloverRegisterFound !== false
    || recovery.authenticOriginalStillPreferred !== true
    || recovery.olderAcceptedRegisterFound !== true
    || recovery.olderAcceptedRegisterCanonicalDigest === packet.predecessor.priorFreshRolloverRegisterDigest
    || recovery.olderAcceptedRegisterSubstituted !== false
    || recovery.successorPreparedFromRecoveredOriginal !== false
    || recovery.successorRequiresIndependentReview !== true
    || recovery.publicDigestsCanReconstructPrivateEvidence !== false
    || recovery.sourceSafeProjectionOnly !== true)
    errors.add('PROVENANCE_RECOVERY_INVALID');
  const local = packet.localRestrictedArtifacts;
  if (local.directoryMode !== '0700' || local.fileMode !== '0600' || local.gitIgnored !== true
    || local.rawValuesInGit !== false || local.successorRegisterPrepared !== true
    || local.successorProjectionComplete !== true || local.commandCardsAvailable !== 5
    || !sha(local.successorRegisterDigest) || !byteCount(local.successorRegisterByteCount)
    || !sha(local.successorProjectionSha256) || !sha(local.commandCardProjectionDigest)
    || !Number.isSafeInteger(local.commandCardProjectionByteCount)
    || !sha(local.restrictedCommandSetDigest) || !sha(local.restrictedCommandDigestReceipt))
    errors.add('LOCAL_ARTIFACT_INVALID');
  const window = packet.successorWindow;
  if (window.startUtc !== '2026-09-15T17:00:00Z'
    || window.expiresUtc !== '2026-09-15T17:05:00Z'
    || Date.parse(window.expiresUtc) - Date.parse(window.startUtc) !== 300000
    || window.maxRunSeconds !== 300 || window.automaticRefresh !== false
    || window.approved !== false || window.boundToSuccessorRegister !== true)
    errors.add('SUCCESSOR_WINDOW_INVALID');
  const readiness = packet.evidenceReadiness;
  if (readiness.requiredFields !== privateFieldIds().length
    || readiness.projectedFields !== privateFieldIds().length
    || readiness.acceptedFields !== 0
    || readiness.commandCardsAvailable !== 5
    || readiness.independentReviewAccepted !== false
    || readiness.restrictedEvidenceAcceptanceGranted !== false
    || Object.entries(readiness).some(([key, value]) => !['requiredFields', 'projectedFields',
      'acceptedFields', 'commandCardsAvailable', 'independentReviewAccepted',
      'restrictedEvidenceAcceptanceGranted'].includes(key) && value !== true))
    errors.add('EVIDENCE_READINESS_INVALID');
  if (packet.retainedState.expiredRunRetryAuthorized !== false
    || packet.retainedState.deleteAuthorized !== false
    || packet.retainedState.retainNoDeleteCustody !== true
    || packet.retainedState.closeoutReceiptSha256 !== packet.predecessor.expiredRunCloseoutReceiptSha256)
    errors.add('RETAINED_STATE_INVALID');
  if (!allFalse(packet.gates)) errors.add('GATE_CHANGED');
  if (!packet.nextHumanGates.restrictedEvidenceAcceptance.includes(local.successorProjectionSha256)
    || !packet.nextHumanGates.restrictedEvidenceAcceptance.includes(local.successorRegisterDigest)
    || !packet.nextHumanGates.restrictedEvidenceAcceptance.includes(local.commandCardProjectionDigest)
    || !packet.nextHumanGates.restrictedEvidenceAcceptance.includes('authorizes no live run')
    || packet.nextHumanGates.liveRunApproval !== 'BLOCKED_UNTIL_RESTRICTED_EVIDENCE_ACCEPTED_AND_EXECUTOR_REBIND_REVIEWED'
    || !packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.publication.includes('No merge, deployment, live tests'))
    errors.add('NEXT_GATE_INVALID');
  if (projection !== null) {
    const projectionResult = inspectProjection(projection, projectionSha256 || local.successorProjectionSha256);
    if (!projectionResult.valid) projectionResult.errors.forEach(error => errors.add(error));
    if (projection.restrictedRegisterDigest !== local.successorRegisterDigest
      || projection.restrictedRegisterByteCount !== local.successorRegisterByteCount
      || projection.restrictedCommandSetDigest !== local.restrictedCommandSetDigest
      || projection.commandCardProjectionDigest !== local.commandCardProjectionDigest
      || projection.commandCardProjectionByteCount !== local.commandCardProjectionByteCount
      || projection.window.startUtc !== window.startUtc
      || projection.window.expiresUtc !== window.expiresUtc)
      errors.add('PROJECTION_PACKET_BINDING_INVALID');
  }
  if (collectStrings(packet).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  return result();
}

module.exports = {
  inspectSuccessorRegisterProvenanceAcceptance,
  inspectProjection,
  template: clone(packetTemplate),
};
