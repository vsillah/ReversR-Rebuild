// Source-safe validator for the fresh replacement restricted evidence packet.
// It never reads private artifacts, providers, env, network, or stores.
const { createHash } = require('node:crypto');
const packetTemplate = require('../../docs/cad-fresh-replacement-restricted-evidence.json');
const predecessorRollover = require('../../docs/cad-fresh-bounded-dev-run-register-rollover.json');
const predecessorRebind = require('../../docs/cad-fresh-executor-rebind-evidence-prep.json');

const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (actual, expected) => isObject(actual)
  && same(Object.keys(actual).sort(), Object.keys(expected).sort());
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const utc = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z');
const digestJson = value => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
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

function replacementDigestsAreNull(packet) {
  return sameKeys(packet.replacement, packetTemplate.replacement)
    && Object.values(packet.replacement).every(value => value === null);
}

function allFalse(map) {
  return isObject(map) && Object.values(map).every(value => value === false);
}

function inspectFreshReplacementRestrictedEvidence(packet) {
  const errors = new Set();
  const result = () => ({
    decision: 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    restrictedEvidenceAccepted: false,
    readyForExecutorRebind: false,
    readyForLiveRunApproval: false,
    executable: false,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    successorIntakePrepared: packet && packet.localRestrictedArtifacts
      ? packet.localRestrictedArtifacts.successorIntakePrepared === true : false,
    successorExecutable: false,
    replacementDigest: errors.size === 0 ? digestJson(packet) : null,
    errors: [...errors],
  });

  if (!sameKeys(packet, packetTemplate)) {
    errors.add('PACKET_SHAPE_INVALID');
    return result();
  }
  for (const key of ['schemaVersion', 'mode', 'status', 'sourceMainCommit',
    'sourcePr', 'expensesUsd', 'clockEvidence']) {
    if (!same(packet[key], packetTemplate[key])) errors.add('IMMUTABLE_FIELD_CHANGED');
  }
  if (!utc(packet.observedAtUtc)) errors.add('OBSERVATION_UTC_INVALID');
  if (!sameKeys(packet.predecessor, packetTemplate.predecessor)) errors.add('PREDECESSOR_SHAPE_INVALID');
  if (packet.predecessor.sourcePr !== 216
    || packet.predecessor.mergeCommit !== '2024c8f0a3b212fbde80bb820b97bb75bd9edcba'
    || packet.predecessor.projectionSha256 !== predecessorRollover.projectionSha256
    || packet.predecessor.privateRestrictedRegisterDigest !== predecessorRollover.privateRestrictedRegisterDigest
    || packet.predecessor.commandCardProjectionDigest !== predecessorRollover.commandCardProjectionDigest
    || packet.predecessor.restrictedCommandSetDigest !== predecessorRollover.restrictedCommandSetDigest
    || packet.predecessor.expiredRunCloseoutReceiptSha256 !== predecessorRebind.predecessor.expiredRunCloseoutReceiptSha256)
    errors.add('PREDECESSOR_BINDING_INVALID');
  if (!sameKeys(packet.provenance, packetTemplate.provenance)
    || packet.provenance.originalRolloverRegisterFound !== false
    || packet.provenance.predecessorProjectionBytesVerified !== true
    || packet.provenance.olderAcceptedRegisterFound !== true
    || packet.provenance.olderAcceptedRegisterSubstituted !== false
    || packet.provenance.historicalCloseoutBytesVerified !== true
    || packet.provenance.freshProviderObservation !== false
    || packet.provenance.custodianAcceptanceFound !== false)
    errors.add('PROVENANCE_INVALID');
  if (packet.provenance.expectedOriginalRegisterDigest !== packet.predecessor.privateRestrictedRegisterDigest
    || packet.provenance.olderAcceptedRegisterCanonicalDigest === packet.predecessor.privateRestrictedRegisterDigest)
    errors.add('REGISTER_SUBSTITUTION_INVALID');
  for (const key of ['expectedOriginalRegisterDigest', 'olderAcceptedRegisterCanonicalDigest',
    'provenanceSearchSha256', 'successorIntakeSha256', 'closeoutReceiptSha256']) {
    const source = key in packet.provenance ? packet.provenance : key in packet.localRestrictedArtifacts
      ? packet.localRestrictedArtifacts : packet.retainedState;
    if (!sha(source[key])) errors.add('DIGEST_INVALID');
  }
  if (packet.localRestrictedArtifacts.directoryMode !== '0700'
    || packet.localRestrictedArtifacts.fileMode !== '0600'
    || packet.localRestrictedArtifacts.gitIgnored !== true
    || packet.localRestrictedArtifacts.successorIntakePrepared !== true
    || packet.localRestrictedArtifacts.successorIntakeIsExecutableRestrictedRegister !== false
    || packet.localRestrictedArtifacts.rawValuesInGit !== false)
    errors.add('LOCAL_ARTIFACT_BOUNDARY_INVALID');
  const window = packet.proposedReplacementWindow;
  if (!sameKeys(window, packetTemplate.proposedReplacementWindow)
    || window.startUtc !== '2026-09-15T17:00:00Z'
    || window.expiresUtc !== '2026-09-15T17:05:00Z'
    || window.maxRunSeconds !== 300
    || window.automaticRefresh !== false
    || window.approved !== false
    || window.boundToRestrictedRegister !== false
    || Date.parse(window.expiresUtc) - Date.parse(window.startUtc) !== 300000)
    errors.add('WINDOW_INVALID');
  if (!replacementDigestsAreNull(packet)) errors.add('REPLACEMENT_DIGESTS_MUST_REMAIN_NULL');
  if (!sameKeys(packet.evidenceStatus, packetTemplate.evidenceStatus)
    || packet.evidenceStatus.requiredFields !== 45
    || packet.evidenceStatus.acceptedFields !== 0
    || packet.evidenceStatus.commandCardsAvailable !== 0
    || packet.evidenceStatus.proposedCapMicros !== 9000000
    || Object.entries(packet.evidenceStatus).some(([key, value]) => !['requiredFields',
      'acceptedFields', 'commandCardsAvailable', 'proposedCapMicros'].includes(key) && value !== false))
    errors.add('EVIDENCE_STATUS_INVALID');
  if (packet.retainedState.expiredRunRetryAuthorized !== false
    || packet.retainedState.deleteAuthorized !== false
    || packet.retainedState.retainNoDeleteCustody !== true
    || packet.retainedState.closeoutReceiptSha256 !== packet.predecessor.expiredRunCloseoutReceiptSha256)
    errors.add('RETAINED_STATE_INVALID');
  const review = packet.independentReviewAcceptanceMaterials;
  if (!sameKeys(review, packetTemplate.independentReviewAcceptanceMaterials)
    || review.acceptancePhraseAvailable !== false
    || !Array.isArray(review.requiredBeforeAcceptance)
    || review.requiredBeforeAcceptance.length !== 6
    || !Array.isArray(review.rejectionRules)
    || review.rejectionRules.length !== 4
    || !review.rejectionRules.some(rule => rule.includes('do not reconstruct private evidence'))
    || !review.rejectionRules.some(rule => rule.includes('older accepted register')))
    errors.add('INDEPENDENT_REVIEW_MATERIALS_INVALID');
  if (!Array.isArray(packet.blockedReasons) || packet.blockedReasons.length < 5
    || !packet.blockedReasons.some(reason => reason.includes('original restricted rollover register not found'))
    || !packet.blockedReasons.some(reason => reason.includes('must not be substituted')))
    errors.add('BLOCKED_REASONS_INVALID');
  if (!allFalse(packet.gates)) errors.add('GATE_CHANGED');
  if (!packet.nextHumanGates.publication.includes('[full reviewed SHA]')
    || !packet.nextHumanGates.publication.includes('No merge, deployment, live tests')
    || !packet.nextHumanGates.sourceOnlyExecutorRebind.includes('final evidence pins blocked')
    || packet.nextHumanGates.restrictedEvidenceAcceptance !== 'BLOCKED_UNTIL_AUTHENTIC_SUCCESSOR_RESTRICTED_REGISTER_AND_INDEPENDENT_REVIEW_EXIST')
    errors.add('NEXT_GATE_INVALID');
  if (collectStrings(packet).some(hasRawPrivateValue)) errors.add('PRIVATE_VALUE_PATTERN_DETECTED');
  return result();
}

module.exports = {
  inspectFreshReplacementRestrictedEvidence,
  template: clone(packetTemplate),
};
