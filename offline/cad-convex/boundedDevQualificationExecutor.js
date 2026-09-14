// Source-only executor bridge. It has no provider client, env reader, network
// transport, shell execution, or bundled live credentials. Runtime callers must
// inject the reviewed development adapter and no-body route checker.
const { createHash } = require('node:crypto');
const packet = require('./boundedDevQualificationExecutor.json');
const { blocked } = require('./durableAdapter');
const { createSourceSafeProjectionFromRestrictedRegister } = require('./privateRestrictedRegisterReview');
const { inspectRestrictedProjection } = require('./restrictedEvidenceCommandCardBytes');

const CARD_EFFECTS = Object.freeze(Object.fromEntries(packet.cards.map(card => [card.id, card.effect])));
const REQUIRED_CARDS = Object.freeze(packet.cards.map(card => card.id));
const DESCRIPTOR_KEYS = Object.freeze([
  'schemaVersion', 'cardId', 'effect', 'executable', 'sourceRef',
  'commandRef', 'argvDigest', 'expectedStop',
]);
const ADAPTER_METHODS = Object.freeze([
  'initialize', 'readExact', 'readAuthority', 'transact', 'changeAuthority',
  'claim', 'scanPage', 'stop',
]);
const MUTATION_METHODS = new Set(['initialize', 'transact', 'changeAuthority', 'claim', 'scanPage', 'stop']);
const AUTHORITY_KINDS = Object.freeze(['login', 'upload-session', 'membership', 'permission']);
const BINDING_KEYS = Object.freeze(['userId', 'shopId', 'sessionId', 'loginSessionId']);
const RUN_WINDOW_MS = 300000;
const PER_CALL_DEADLINE_MS = 4000;
const CLAIM_LEASE_MS = 60000;
const SCOPE_FIELDS = Object.freeze({
  resourceBindingDigest: 'identity.privateResourceBindingRef',
  namespaceDigest: 'identity.namespace',
  runDigest: 'identity.runId',
  ledgerDigest: 'identity.ledgerId',
  windowDigest: 'identity.windowId',
  fenceDigest: 'identity.fence',
});
const REBUILT_REGISTER_KEYS = Object.freeze([
  'schemaVersion', 'mode', 'status', 'sourceMainCommit', 'sourcePr',
  'createdAtUtc', 'runRef', 'originalSuccessorRegister', 'olderAcceptedRegister',
  'window', 'refs', 'restrictedEvidence', 'restrictedCommandCards', 'gates',
]);
const REBUILT_PROJECTION_KEYS = Object.freeze([
  'schemaVersion', 'mode', 'sourceMainCommit', 'sourcePr', 'observedAtUtc',
  'runRef', 'publicProjectionOnly', 'liveRunAuthorized', 'uploadsEnabled',
  'conversionEnabled', 'predecessor', 'window', 'restrictedEvidence',
  'commandCards', 'restrictedCommandByteCounts', 'restrictedCommandSetDigest',
  'commandCardProjectionDigest', 'commandCardProjectionByteCount',
  'restrictedRegisterDigest', 'restrictedRegisterByteCount',
  'sanitizedDestinationRef', 'restrictedDestinationRef', 'independentReviewRef',
  'gates',
]);
const REBUILT_RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'mode', 'status', 'acceptedAtUtc', 'acceptedByRef',
  'sourceMainCommit', 'sourcePr', 'approvalPhraseSha256',
  'acceptedProjectionSha256', 'acceptedProjectionByteCount',
  'privateSuccessorRestrictedRegisterDigest',
  'privateSuccessorRestrictedRegisterByteCount', 'acceptancePacketSha256',
  'acceptancePacketByteCount', 'restrictedCommandSetDigest',
  'commandCardProjectionDigest', 'commandCardProjectionByteCount',
  'evidenceReceiptCount', 'commandCardCount', 'runRef', 'resourceAliasRef',
  'namespaceRef', 'ledgerWindowRef', 'fenceRef',
  'originalSuccessorRegisterRecovered', 'unrecoveredOriginalSuccessorRegisterDigest',
  'olderAcceptedRegisterFound', 'olderAcceptedRegisterSubstituted',
  'acceptanceScope', 'nextBlockedUntil',
]);
const EARLIER_WINDOW_RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'mode', 'status', 'acceptedAtUtc', 'acceptedByRef',
  'sourceMainCommit', 'sourcePr', 'approvalPhraseSha256',
  'acceptedProjectionSha256', 'acceptedProjectionByteCount',
  'privateSuccessorRestrictedRegisterDigest',
  'privateSuccessorRestrictedRegisterByteCount', 'acceptancePacketSha256',
  'acceptancePacketByteCount', 'restrictedCommandSetDigest',
  'restrictedCommandReceiptByteCount', 'commandCardProjectionDigest',
  'commandCardProjectionByteCount', 'evidenceReceiptCount',
  'commandCardCount', 'runRef', 'resourceAliasRef', 'namespaceRef',
  'ledgerWindowRef', 'fenceRef', 'window', 'acceptanceScope',
  'nextBlockedUntil',
]);

const clone = value => JSON.parse(JSON.stringify(value));
const sha256 = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
const sha256Json = value => sha256(JSON.stringify(value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const ref = value => typeof value === 'string' && /^rrb-ref:[a-z0-9-]{1,80}$/.test(value);
const stringBytes = value => typeof value === 'string'
  ? value
  : Buffer.isBuffer(value) ? value.toString('utf8') : null;
const safeString = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const started = value => typeof value === 'string' && /^[A-Za-z0-9._:-]+$/.test(value);
const allFalse = value => isObject(value) && Object.values(value).every(item => item === false);
const ACCEPTED_EVIDENCE = Object.freeze(Object.entries({
  acceptedEvidence: packet.acceptedEvidence,
  acceptedRebuiltSuccessorEvidence: packet.acceptedRebuiltSuccessorEvidence,
}).filter(([, value]) => isObject(value)).map(([key, value]) => Object.freeze({ key, ...value })));

function fail(code, values = {}) {
  return Object.freeze({
    ...blocked(),
    mode: packet.mode,
    code,
    executableBridgeSource: true,
    acceptedArtifacts: false,
    runCompleted: false,
    evidenceWritten: false,
    automaticRetry: false,
    secondRun: false,
    ...values,
  });
}

function parseJsonBytes(bytes, errors, code) {
  const text = stringBytes(bytes);
  if (text === null || Buffer.byteLength(text, 'utf8') > 65536) {
    errors.add(code);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    errors.add(code);
    return null;
  }
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, output));
  else if (isObject(value)) Object.values(value).forEach(item => collectStrings(item, output));
  return output;
}

function leaksPrivatePattern(value) {
  return collectStrings(value).some(text => /\/Users\//.test(text)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
    || /(?:sk_live_|ghp_|github_pat_)[A-Za-z0-9_]{16,}/.test(text)
    || /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(text));
}

function inspectReceipt(receipt, receiptSha256, errors) {
  const expectedKeys = [
    'schemaVersion', 'mode', 'status', 'acceptedAtUtc', 'acceptedByRef',
    'sourceMainCommit', 'sourcePacketCommit', 'projectionSha256',
    'projectionByteCount', 'privateRestrictedRegisterDigest',
    'privateRestrictedRegisterByteCount', 'restrictedCommandSetDigest',
    'commandCardProjectionDigest', 'commandCardProjectionByteCount',
    'requiredEvidenceReceipts', 'publicRefs', 'approvalScope',
    'nextBlockedUntil', 'exactApprovedPhrase',
  ];
  if (!exact(receipt, expectedKeys)) {
    errors.add('ACCEPTANCE_RECEIPT_SHAPE_INVALID');
    return;
  }
  const evidence = packet.acceptedEvidence;
  if (receiptSha256 !== evidence.acceptanceReceiptSha256
    || receipt.status !== 'ACCEPTED_FOR_EVIDENCE_COMPLETENESS_ONLY'
    || receipt.sourceMainCommit !== packet.baseCommit
    || receipt.sourcePacketCommit !== packet.sourcePacketCommit
    || receipt.projectionSha256 !== evidence.projectionSha256
    || receipt.privateRestrictedRegisterDigest !== evidence.privateRestrictedRegisterDigest
    || receipt.restrictedCommandSetDigest !== evidence.restrictedCommandSetDigest
    || receipt.commandCardProjectionDigest !== evidence.commandCardProjectionDigest
    || receipt.requiredEvidenceReceipts !== evidence.requiredEvidenceReceipts) {
    errors.add('ACCEPTANCE_RECEIPT_DIGEST_MISMATCH');
  }
  if (!isObject(receipt.approvalScope)
    || receipt.approvalScope.acceptsEvidenceCompleteness !== true
    || Object.entries(receipt.approvalScope)
      .some(([key, value]) => key !== 'acceptsEvidenceCompleteness' && value !== false)) {
    errors.add('ACCEPTANCE_SCOPE_INVALID');
  }
}

function inspectRestrictedCommandDescriptors(register, projection) {
  const errors = new Set();
  const descriptors = [];
  if (!isObject(register) || !isObject(register.restrictedCommandBytes)
    || !isObject(projection) || !isObject(projection.commandCards)) {
    errors.add('COMMAND_DESCRIPTOR_INPUT_INVALID');
  } else {
    const digestSet = {};
    for (const cardId of REQUIRED_CARDS) {
      const bytes = register.restrictedCommandBytes[cardId];
      const descriptor = parseJsonBytes(bytes, errors, 'RESTRICTED_COMMAND_BYTES_INVALID');
      const card = projection.commandCards.cards.find(item => item.id === cardId);
      if (!descriptor || !card || !exact(descriptor, DESCRIPTOR_KEYS)) {
        errors.add('COMMAND_DESCRIPTOR_SHAPE_INVALID');
        continue;
      }
      if (descriptor.schemaVersion !== 1 || descriptor.cardId !== cardId
        || descriptor.effect !== CARD_EFFECTS[cardId] || descriptor.effect !== card.effect
        || descriptor.executable !== false || !ref(descriptor.sourceRef)
        || descriptor.commandRef !== card.fields.restrictedCommandRef
        || !digest(descriptor.argvDigest) || descriptor.expectedStop !== card.stopCounterpart) {
        errors.add('COMMAND_DESCRIPTOR_VALUE_INVALID');
      }
      const bytesDigest = sha256(bytes);
      if (card.fields.restrictedCommandDigest !== bytesDigest) errors.add('COMMAND_DESCRIPTOR_DIGEST_MISMATCH');
      digestSet[cardId] = bytesDigest;
      descriptors.push({
        cardId,
        effect: descriptor.effect,
        byteCount: Buffer.byteLength(bytes, 'utf8'),
        sha256: bytesDigest,
        executableCommandBytes: false,
        expectedStop: descriptor.expectedStop,
      });
    }
    if (sha256Json(digestSet) !== packet.acceptedEvidence.restrictedCommandSetDigest)
      errors.add('COMMAND_SET_DIGEST_MISMATCH');
  }
  return Object.freeze({
    structureValid: errors.size === 0,
    descriptors,
    errors: [...errors],
  });
}

function inspectLegacyAcceptedRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes } = {}) {
  const errors = new Set();
  const projectionText = stringBytes(projectionBytes);
  const receiptText = stringBytes(acceptanceReceiptBytes);
  const projection = parseJsonBytes(projectionBytes, errors, 'PROJECTION_BYTES_INVALID');
  const receipt = parseJsonBytes(acceptanceReceiptBytes, errors, 'ACCEPTANCE_RECEIPT_BYTES_INVALID');
  if (!isObject(register)) errors.add('RESTRICTED_REGISTER_INVALID');
  const generated = isObject(register) ? createSourceSafeProjectionFromRestrictedRegister(register) : null;
  if (!generated || !generated.structureValid || !generated.projectionComplete)
    errors.add('RESTRICTED_REGISTER_PROJECTION_INVALID');
  if (projectionText !== null && sha256(projectionText) !== packet.acceptedEvidence.projectionSha256)
    errors.add('PROJECTION_DIGEST_MISMATCH');
  if (receiptText !== null && receipt) inspectReceipt(receipt, sha256(receiptText), errors);
  if (isObject(register) && sha256Json(register) !== packet.acceptedEvidence.privateRestrictedRegisterDigest)
    errors.add('RESTRICTED_REGISTER_DIGEST_MISMATCH');
  if (projection && generated && JSON.stringify(projection) !== JSON.stringify(generated.projection))
    errors.add('PROJECTION_CONTENT_MISMATCH');
  if (projection) {
    const projectionInspection = inspectRestrictedProjection(projection);
    if (!projectionInspection.structureValid || !projectionInspection.projectionComplete)
      errors.add('PROJECTION_INCOMPLETE');
    for (const [key, expected] of Object.entries(packet.acceptedEvidence)) {
      const map = {
        privateRestrictedRegisterDigest: projection.restrictedRegisterDigest,
        restrictedCommandSetDigest: projection.restrictedCommandSetDigest,
        commandCardProjectionDigest: projection.commandCardProjectionDigest,
      };
      if (Object.hasOwn(map, key) && map[key] !== expected) errors.add('PROJECTION_BINDING_MISMATCH');
    }
  }
  const commands = generated && projection
    ? inspectRestrictedCommandDescriptors(register, projection)
    : { structureValid: false, descriptors: [], errors: ['COMMAND_DESCRIPTOR_SKIPPED'] };
  for (const error of commands.errors) errors.add(error);
  if (leaksPrivatePattern({ projection, receipt, descriptors: commands.descriptors }))
    errors.add('PRIVATE_PATTERN_DETECTED');
  return Object.freeze({
    mode: packet.mode,
    decision: errors.size === 0 ? 'EXECUTOR_BINDING_READY' : 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    acceptedArtifacts: errors.size === 0,
    executableBridgeSource: true,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    projectionSha256: projectionText === null ? null : sha256(projectionText),
    acceptanceReceiptSha256: receiptText === null ? null : sha256(receiptText),
    privateRestrictedRegisterDigest: isObject(register) ? sha256Json(register) : null,
    restrictedCommandSetDigest: projection ? projection.restrictedCommandSetDigest : null,
    commandCardProjectionDigest: projection ? projection.commandCardProjectionDigest : null,
    acceptedEvidenceKey: 'acceptedEvidence',
    commandCards: commands.descriptors,
    errors: [...errors],
  });
}

function isRebuiltSuccessorArtifactSet(register, projection, receipt) {
  return (isObject(register) && register.mode === 'ignored-successor-restricted-register-rebuild')
    || (isObject(projection) && projection.mode === 'source-safe-successor-restricted-evidence-rebuild-projection')
    || (isObject(receipt) && (receipt.mode === 'rebuilt-successor-evidence-acceptance-receipt'
      || receipt.mode === 'earlier-window-successor-evidence-acceptance-receipt'));
}

function inspectRebuiltSuccessorReceipt(receipt, receiptSha256, errors, evidence) {
  const receiptKeys = receipt && receipt.mode === 'earlier-window-successor-evidence-acceptance-receipt'
    ? EARLIER_WINDOW_RECEIPT_KEYS : REBUILT_RECEIPT_KEYS;
  if (!exact(receipt, receiptKeys)) {
    errors.add('REBUILT_ACCEPTANCE_RECEIPT_SHAPE_INVALID');
    return;
  }
  if (receiptSha256 !== evidence.acceptanceReceiptSha256
    || receipt.status !== 'ACCEPTED_FOR_EVIDENCE_COMPLETENESS_ONLY'
    || receipt.sourceMainCommit !== evidence.sourceMainCommit
    || receipt.sourcePr !== evidence.sourcePr
    || receipt.runRef !== evidence.runRef
    || receipt.acceptedProjectionSha256 !== evidence.projectionSha256
    || receipt.privateSuccessorRestrictedRegisterDigest !== evidence.privateRestrictedRegisterDigest
    || receipt.restrictedCommandSetDigest !== evidence.restrictedCommandSetDigest
    || receipt.commandCardProjectionDigest !== evidence.commandCardProjectionDigest
    || receipt.evidenceReceiptCount !== evidence.requiredEvidenceReceipts
    || receipt.commandCardCount !== REQUIRED_CARDS.length
    || (receipt.mode === 'rebuilt-successor-evidence-acceptance-receipt'
      && receipt.olderAcceptedRegisterSubstituted !== false)) {
    errors.add('REBUILT_ACCEPTANCE_RECEIPT_DIGEST_MISMATCH');
  }
  if (!isObject(receipt.acceptanceScope)
    || receipt.acceptanceScope.evidenceCompletenessOnly !== true
    || Object.entries(receipt.acceptanceScope)
      .some(([key, value]) => key !== 'evidenceCompletenessOnly' && value !== false)) {
    errors.add('REBUILT_ACCEPTANCE_SCOPE_INVALID');
  }
}

function inspectRebuiltSuccessorCommandCards(register, projection) {
  const errors = new Set();
  const descriptors = [];
  if (!isObject(register) || !isObject(register.restrictedCommandCards)
    || !isObject(projection) || !isObject(projection.commandCards)
    || !Array.isArray(projection.commandCards.cards)
    || !isObject(projection.restrictedCommandByteCounts)) {
    errors.add('REBUILT_COMMAND_DESCRIPTOR_INPUT_INVALID');
  } else {
    for (const cardId of REQUIRED_CARDS) {
      const command = register.restrictedCommandCards[cardId];
      const card = projection.commandCards.cards.find(item => item.id === cardId);
      if (!exact(command, ['restrictedCommandRef', 'restrictedCommandBytes', 'restrictedCommandDigest', 'byteCount'])
        || !isObject(card) || !isObject(card.fields)) {
        errors.add('REBUILT_COMMAND_DESCRIPTOR_SHAPE_INVALID');
        continue;
      }
      const commandBytes = command.restrictedCommandBytes;
      const commandDigest = typeof commandBytes === 'string' ? sha256(commandBytes) : null;
      const descriptor = parseJsonBytes(commandBytes, errors, 'REBUILT_RESTRICTED_COMMAND_BYTES_INVALID');
      if (typeof commandBytes !== 'string' || commandDigest !== command.restrictedCommandDigest
        || command.restrictedCommandDigest !== card.fields.restrictedCommandDigest
        || command.restrictedCommandRef !== card.fields.restrictedCommandRef
        || command.byteCount !== Buffer.byteLength(commandBytes || '', 'utf8')
        || projection.restrictedCommandByteCounts[cardId] !== command.byteCount) {
        errors.add('REBUILT_COMMAND_DESCRIPTOR_DIGEST_MISMATCH');
      }
      if (!isObject(descriptor)
        || descriptor.schemaVersion !== 1
        || descriptor.id !== cardId
        || descriptor.effect !== CARD_EFFECTS[cardId]
        || descriptor.effect !== card.effect
        || descriptor.runRef !== packet.acceptedRebuiltSuccessorEvidence.runRef
        || descriptor.sourceMainCommit !== packet.acceptedRebuiltSuccessorEvidence.sourceMainCommit
        || descriptor.sourcePr !== packet.acceptedRebuiltSuccessorEvidence.sourcePr
        || descriptor.syntheticMetadataOnly !== true
        || descriptor.cadFilesAllowed !== false
        || descriptor.uploadActivationAuthorized !== false
        || descriptor.conversionAuthorized !== false
        || descriptor.sandboxDispatchAuthorized !== false
        || descriptor.automaticRetryAuthorized !== false
        || descriptor.stopOnUnknown !== true
        || descriptor.stopCounterpart !== card.stopCounterpart) {
        errors.add('REBUILT_COMMAND_DESCRIPTOR_VALUE_INVALID');
      }
      descriptors.push({
        cardId,
        effect: card.effect,
        byteCount: command.byteCount,
        sha256: command.restrictedCommandDigest,
        executableCommandBytes: false,
        expectedStop: isObject(descriptor) ? descriptor.stopCounterpart : null,
      });
    }
  }
  return Object.freeze({
    structureValid: errors.size === 0,
    descriptors,
    errors: [...errors],
  });
}

function inspectRebuiltSuccessorRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes } = {}) {
  const errors = new Set();
  const evidence = packet.acceptedRebuiltSuccessorEvidence;
  const projectionText = stringBytes(projectionBytes);
  const receiptText = stringBytes(acceptanceReceiptBytes);
  const projection = parseJsonBytes(projectionBytes, errors, 'REBUILT_PROJECTION_BYTES_INVALID');
  const receipt = parseJsonBytes(acceptanceReceiptBytes, errors, 'REBUILT_ACCEPTANCE_RECEIPT_BYTES_INVALID');
  if (!isObject(register)) errors.add('REBUILT_RESTRICTED_REGISTER_INVALID');
  if (!isObject(evidence)) errors.add('REBUILT_ACCEPTED_EVIDENCE_MISSING');
  if (projectionText !== null && sha256(projectionText) !== evidence.projectionSha256)
    errors.add('REBUILT_PROJECTION_DIGEST_MISMATCH');
  if (receiptText !== null && receipt) inspectRebuiltSuccessorReceipt(receipt, sha256(receiptText), errors, evidence);
  if (isObject(register) && sha256Json(register) !== evidence.privateRestrictedRegisterDigest)
    errors.add('REBUILT_RESTRICTED_REGISTER_DIGEST_MISMATCH');
  if (!exact(register, REBUILT_REGISTER_KEYS)
    || register.schemaVersion !== 1
    || register.mode !== 'ignored-successor-restricted-register-rebuild'
    || register.sourceMainCommit !== evidence.sourceMainCommit
    || register.sourcePr !== evidence.sourcePr
    || register.runRef !== evidence.runRef
    || register.status !== 'REBUILT_AFTER_ORIGINAL_SUCCESSOR_REGISTER_UNRECOVERABLE'
    || !allFalse(register.gates)) {
    errors.add('REBUILT_RESTRICTED_REGISTER_SHAPE_INVALID');
  }
  if (!exact(projection, REBUILT_PROJECTION_KEYS)
    || projection.schemaVersion !== 1
    || projection.mode !== 'source-safe-successor-restricted-evidence-rebuild-projection'
    || projection.sourceMainCommit !== evidence.sourceMainCommit
    || projection.sourcePr !== evidence.sourcePr
    || projection.runRef !== evidence.runRef
    || projection.publicProjectionOnly !== true
    || projection.liveRunAuthorized !== false
    || projection.uploadsEnabled !== false
    || projection.conversionEnabled !== false
    || !allFalse(projection.gates)) {
    errors.add('REBUILT_PROJECTION_SHAPE_INVALID');
  }
  if (projection) {
    const commandBytes = JSON.stringify(projection.commandCards);
    if (projection.restrictedRegisterDigest !== evidence.privateRestrictedRegisterDigest
      || projection.restrictedCommandSetDigest !== evidence.restrictedCommandSetDigest
      || projection.commandCardProjectionDigest !== evidence.commandCardProjectionDigest
      || projection.commandCardProjectionDigest !== sha256(commandBytes)
      || !isObject(projection.restrictedEvidence)
      || !isObject(projection.commandCards)
      || !Array.isArray(projection.commandCards.cards)) {
      errors.add('REBUILT_PROJECTION_BINDING_MISMATCH');
    }
  }
  const commands = inspectRebuiltSuccessorCommandCards(register, projection);
  for (const error of commands.errors) errors.add(error);
  if (leaksPrivatePattern({ projection, receipt, descriptors: commands.descriptors }))
    errors.add('PRIVATE_PATTERN_DETECTED');
  return Object.freeze({
    mode: packet.mode,
    decision: errors.size === 0 ? 'EXECUTOR_BINDING_READY' : 'LIVE_RUN_BLOCKED',
    structureValid: errors.size === 0,
    acceptedArtifacts: errors.size === 0,
    executableBridgeSource: true,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    projectionSha256: projectionText === null ? null : sha256(projectionText),
    acceptanceReceiptSha256: receiptText === null ? null : sha256(receiptText),
    privateRestrictedRegisterDigest: isObject(register) ? sha256Json(register) : null,
    restrictedCommandSetDigest: projection ? projection.restrictedCommandSetDigest : null,
    commandCardProjectionDigest: projection ? projection.commandCardProjectionDigest : null,
    acceptedEvidenceKey: 'acceptedRebuiltSuccessorEvidence',
    commandCards: commands.descriptors,
    errors: [...errors],
  });
}

function inspectAcceptedRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes } = {}) {
  const errors = new Set();
  const projection = parseJsonBytes(projectionBytes, errors, 'PROJECTION_BYTES_INVALID');
  const receipt = parseJsonBytes(acceptanceReceiptBytes, errors, 'ACCEPTANCE_RECEIPT_BYTES_INVALID');
  if (isRebuiltSuccessorArtifactSet(register, projection, receipt))
    return inspectRebuiltSuccessorRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes });
  return inspectLegacyAcceptedRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes });
}

function validateOneRunApproval(approval) {
  return resolveAcceptedEvidenceFromApproval(approval) !== null;
}

function matchesAcceptedEvidence(approval, evidence) {
  return exact(approval, [
    'projectionSha256', 'acceptanceReceiptSha256', 'privateRestrictedRegisterDigest',
    'restrictedCommandSetDigest', 'commandCardProjectionDigest', 'automaticRetry',
    'secondRun', 'uploadsEnabled',
  ])
    && approval.projectionSha256 === evidence.projectionSha256
    && approval.acceptanceReceiptSha256 === evidence.acceptanceReceiptSha256
    && approval.privateRestrictedRegisterDigest === evidence.privateRestrictedRegisterDigest
    && approval.restrictedCommandSetDigest === evidence.restrictedCommandSetDigest
    && approval.commandCardProjectionDigest === evidence.commandCardProjectionDigest
    && approval.automaticRetry === false
    && approval.secondRun === false
    && approval.uploadsEnabled === false;
}

function resolveAcceptedEvidenceFromApproval(approval) {
  return ACCEPTED_EVIDENCE.find(evidence => matchesAcceptedEvidence(approval, evidence)) || null;
}

function createScenario(projection, nowMs, clockNow, acceptedEvidence = packet.acceptedEvidence) {
  const valueDigest = id => projection.restrictedEvidence[id].valueDigest;
  const label = id => id + '-' + valueDigest(id).slice(0, 16);
  const scope = Object.fromEntries(Object.entries(SCOPE_FIELDS)
    .map(([target, source]) => [target, valueDigest(source)]));
  const binding = {
    userId: label('identity.syntheticInventoryRef'),
    shopId: label('identity.resourceAlias'),
    sessionId: label('identity.runId'),
    loginSessionId: label('identity.ledgerId'),
  };
  const windowEnd = nowMs + RUN_WINDOW_MS;
  const ownerDigest = valueDigest('custody.primaryRef');
  const key = {
    primary: 'bounded-primary',
    conflict: 'bounded-conflict-observation',
  };
  const selectorDigest = name => sha256('selector:' + name + ':' + acceptedEvidence.commandCardProjectionDigest);
  const commandDigest = name => sha256('command:' + name + ':' + acceptedEvidence.restrictedCommandSetDigest);
  const proposalDigest = name => sha256('proposal:' + name + ':' + acceptedEvidence.projectionSha256);
  const selector = (name, fence) => ({ scope, binding, key: key[name], fence, selectorDigest: selectorDigest(name) });
  const deadline = () => {
    const liveNow = clockNow();
    if (!Number.isSafeInteger(liveNow) || liveNow < nowMs || liveNow >= windowEnd) return null;
    return Math.min(liveNow + PER_CALL_DEADLINE_MS, windowEnd);
  };
  const claimExpiresAt = () => {
    const liveNow = clockNow();
    if (!Number.isSafeInteger(liveNow) || liveNow < nowMs || liveNow >= windowEnd) return null;
    return Math.min(liveNow + CLAIM_LEASE_MS, windowEnd);
  };
  return {
    scope,
    binding,
    ownerDigest,
    policy: {
      schemaVersion: 1,
      windowId: label('identity.windowId'),
      windowStart: nowMs,
      windowEnd,
      userConcurrency: 64,
      shopConcurrency: 64,
      userAttempts: 64,
      shopAttempts: 64,
      leaseMs: 60000,
      maxReservationMicros: 100,
      budgetMicros: 6400,
      currency: 'USD',
    },
    authority: AUTHORITY_KINDS.map(kind => ({ kind, generation: 1, active: true, expiresAt: windowEnd })),
    deadline,
    claimExpiresAt,
    selector,
    reserve: (name, expectedRevision) => ({
      scope,
      expectedRevision,
      selectorDigest: selectorDigest(name),
      commandDigest: commandDigest('reserve:' + name),
      proposalDigest: proposalDigest('reserve:' + name),
      command: { type: 'reserve', binding, key: key[name], reservationMicros: 100 },
      deadlineAt: deadline(),
    }),
    command: (type, name, expectedRevision, fence) => ({
      scope,
      expectedRevision,
      selectorDigest: selectorDigest(name),
      commandDigest: commandDigest(type + ':' + name),
      proposalDigest: proposalDigest(type + ':' + name),
      command: { type, binding, key: key[name], fence },
      deadlineAt: deadline(),
    }),
    stop: () => ({ scope, reasonDigest: valueDigest('window.stopProcedureRef'), deadlineAt: deadline() }),
  };
}

function revisionFrom(...responses) {
  for (const response of responses) {
    if (response && Number.isSafeInteger(response.revision) && response.revision >= 0) return response.revision;
  }
  return 0;
}

function projectEngineResponse(response) {
  if (!isObject(response) || typeof response.code !== 'string') return { code: 'ENGINE_RESPONSE_INVALID' };
  const keys = ['code', 'engineAccepted', 'changed', 'revision', 'authorityRevision',
    'fence', 'status', 'outcome', 'claimGeneration', 'selectors', 'next', 'remoteAttempts'];
  return Object.fromEntries(keys.filter(key => Object.hasOwn(response, key)).map(key => [key, response[key]]));
}

function projectRouteResponse(response) {
  if (!isObject(response)) return { ok: false, code: 'ROUTE_RESPONSE_INVALID' };
  return {
    ok: response.ok === true,
    phase: typeof response.phase === 'string' ? response.phase : null,
    status: Number.isSafeInteger(response.status) ? response.status : null,
    code: typeof response.code === 'string' ? response.code : null,
    bodySubscribed: response.bodySubscribed === true,
    uploadsEnabled: response.uploadsEnabled === true,
    conversionDispatched: response.conversionDispatched === true,
    production: response.production === true,
  };
}

function validateRouteResponse(route) {
  return route.ok === true
    && [401, 403, 404, 405, 503].includes(route.status)
    && route.bodySubscribed === false
    && route.uploadsEnabled === false
    && route.conversionDispatched === false
    && route.production === false;
}

function validateAdapter(adapter) {
  return isObject(adapter) && ADAPTER_METHODS.every(method => typeof adapter[method] === 'function');
}

function withinAllocation(projection, counts) {
  const allowed = new Map();
  for (const card of projection.commandCards.cards) {
    for (const row of card.allocation || []) {
      const prior = allowed.get(row.operation) || 0;
      allowed.set(row.operation, prior + row.logicalCommands);
    }
  }
  return Object.entries(counts).every(([operation, count]) => count <= (allowed.get(operation) || 0));
}

async function executeBoundedDevelopmentQualificationRun({
  register,
  projectionBytes,
  acceptanceReceiptBytes,
  oneRunApproval,
  adapter,
  disabledRouteCheck,
  evidenceWriter = async () => ({}),
  now = () => Date.now(),
} = {}) {
  const acceptedEvidence = resolveAcceptedEvidenceFromApproval(oneRunApproval);
  if (!acceptedEvidence) return fail('ONE_RUN_APPROVAL_REQUIRED');
  if (!validateAdapter(adapter) || typeof disabledRouteCheck !== 'function' || typeof evidenceWriter !== 'function')
    return fail('EXECUTOR_BINDING_INVALID');
  const artifacts = inspectAcceptedRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes });
  if (!artifacts.structureValid) return fail('ACCEPTED_ARTIFACTS_INVALID', { artifacts });
  if (artifacts.acceptedEvidenceKey !== acceptedEvidence.key
    || artifacts.projectionSha256 !== acceptedEvidence.projectionSha256
    || artifacts.acceptanceReceiptSha256 !== acceptedEvidence.acceptanceReceiptSha256
    || artifacts.privateRestrictedRegisterDigest !== acceptedEvidence.privateRestrictedRegisterDigest
    || artifacts.restrictedCommandSetDigest !== acceptedEvidence.restrictedCommandSetDigest
    || artifacts.commandCardProjectionDigest !== acceptedEvidence.commandCardProjectionDigest)
    return fail('ACCEPTED_ARTIFACTS_APPROVAL_MISMATCH', { artifacts });
  const projection = JSON.parse(stringBytes(projectionBytes));
  const nowMs = now();
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) return fail('CLOCK_INVALID');
  const scenario = createScenario(projection, nowMs, now, acceptedEvidence);
  if (Object.values(scenario.binding).some(value => !safeString(value))
    || Object.values(scenario.scope).some(value => !digest(value))
    || !started(scenario.policy.windowId)) return fail('SCENARIO_INVALID');

  const cards = [];
  const steps = [];
  const counts = {};
  let stopped = false;
  let unknown = false;
  const addCount = operation => { counts[operation] = (counts[operation] || 0) + 1; };
  const routeCheck = async (cardId, phase) => {
    const route = projectRouteResponse(await disabledRouteCheck({
      cardId,
      phase,
      bodyBytes: null,
      expectedBodySubscribed: false,
      uploadsEnabled: false,
      production: false,
    }));
    cards.push({ cardId, effect: CARD_EFFECTS[cardId], route });
    if (!validateRouteResponse(route)) {
      stopped = true;
      steps.push({ cardId, operation: 'disabled-route-check', code: 'DISABLED_ROUTE_CHECK_FAILED' });
      return false;
    }
    return true;
  };
  const call = async (cardId, operation, method, input, expectedCodes) => {
    if (stopped) return null;
    addCount(operation);
    let response;
    try {
      response = projectEngineResponse(await adapter[method](input));
    } catch {
      response = { code: MUTATION_METHODS.has(method) ? 'OUTCOME_UNKNOWN' : 'ENGINE_UNAVAILABLE' };
    }
    const accepted = expectedCodes.includes(response.code);
    steps.push({ cardId, operation, method, expected: expectedCodes, response });
    if (response.code === 'OUTCOME_UNKNOWN' || response.code === 'ENGINE_RESPONSE_INVALID') {
      stopped = true;
      unknown = true;
    } else if (!accepted) {
      stopped = true;
    }
    return response;
  };

  cards.push({ cardId: 'C0', effect: CARD_EFFECTS.C0, acceptedArtifacts: true });
  if (!await routeCheck('C1', 'pre')) return fail('DISABLED_ROUTE_PRECHECK_FAILED', { cards, steps });

  const initialized = await call('C2', 'seed-synthetic-metadata', 'initialize', {
    scope: scenario.scope,
    policy: scenario.policy,
    binding: scenario.binding,
    authority: scenario.authority,
    deadlineAt: scenario.deadline(),
  }, ['RUN_INITIALIZED', 'RUN_ALREADY_EXISTS']);
  const authority = await call('C2', 'read-authority-dependencies', 'readAuthority', {
    scope: scenario.scope,
    binding: scenario.binding,
    deadlineAt: scenario.deadline(),
  }, ['AUTHORITY_ACTIVE']);
  if (!stopped && initialized?.code === 'RUN_ALREADY_EXISTS' && revisionFrom(authority) !== 0) {
    stopped = true;
    steps.push({ cardId: 'C2', operation: 'resume-initialized-run', method: 'readAuthority',
      expected: ['RETAINED_INITIALIZED_RUN'], response: { code: 'RESUME_STATE_UNSUPPORTED',
        revision: revisionFrom(authority) } });
  }
  await call('C2', 'read-exact-selector', 'readExact', {
    selector: scenario.selector('primary', 1),
    deadlineAt: scenario.deadline(),
  }, ['SELECTOR_NOT_FOUND']);
  const held = await call('C2', 'reserve-transaction', 'transact',
    scenario.reserve('primary', revisionFrom(authority, initialized)), ['COMMITTED']);
  await call('C2', 'reserve-transaction', 'transact',
    scenario.reserve('conflict', 0), ['CONFLICT']);
  const fenced = await call('C2', 'fence-without-dispatch', 'transact',
    scenario.command('fence', 'primary', held?.revision ?? 0, held?.fence ?? 1), ['COMMITTED']);
  const marked = await call('C2', 'mark-unknown', 'transact',
    scenario.command('unknown', 'primary', fenced?.revision ?? 0, held?.fence ?? 1), ['COMMITTED']);
  const claim = await call('C3', 'claim-cas', 'claim', {
    selector: scenario.selector('primary', held?.fence ?? 1),
    expectedGeneration: 0,
    ownerDigest: scenario.ownerDigest,
    expiresAt: scenario.claimExpiresAt(),
    deadlineAt: scenario.deadline(),
  }, ['CLAIMED']);
  await call('C3', 'scan-bounded-page', 'scanPage', {
    scope: scenario.scope,
    cursor: { after: 0, through: marked?.revision ?? claim?.revision ?? 0 },
    limit: 32,
    custodianDigest: scenario.ownerDigest,
    deadlineAt: scenario.deadline(),
  }, ['PAGE_SCANNED']);
  await call('C3', 'authority-revoke-or-delete-synthetic', 'changeAuthority', {
    scope: scenario.scope,
    binding: scenario.binding,
    kind: 'permission',
    expectedGeneration: 1,
    deadlineAt: scenario.deadline(),
  }, ['AUTHORITY_REVOKED']);
  await call('C3', 'read-authority-dependencies', 'readAuthority', {
    scope: scenario.scope,
    binding: scenario.binding,
    deadlineAt: scenario.deadline(),
  }, ['AUTHORITY_REJECTED']);

  if (!stopped && !withinAllocation(projection, counts)) stopped = true;
  if (!stopped && !await routeCheck('C4', 'post')) return fail('DISABLED_ROUTE_POSTCHECK_FAILED', { cards, steps, counts });
  if (!stopped) {
    const response = await call('C4', 'seed-synthetic-metadata', 'stop', scenario.stop(), ['RUN_STOPPED']);
    cards.push({ cardId: 'C4', effect: CARD_EFFECTS.C4, stopped: response?.code === 'RUN_STOPPED' });
  }

  const evidence = Object.freeze({
    schemaVersion: 1,
    mode: 'bounded-development-qualification-executor-evidence',
    decision: stopped ? 'RUN_STOPPED' : 'DEVELOPMENT_QUALIFICATION_EXECUTED',
    acceptedEvidenceKey: acceptedEvidence.key,
    acceptedProjectionSha256: acceptedEvidence.projectionSha256,
    acceptanceReceiptSha256: acceptedEvidence.acceptanceReceiptSha256,
    commandCardProjectionDigest: acceptedEvidence.commandCardProjectionDigest,
    commandCards: artifacts.commandCards.map(card => ({
      cardId: card.cardId,
      effect: card.effect,
      byteCount: card.byteCount,
      sha256: card.sha256,
    })),
    counts,
    routeChecks: cards.filter(card => card.route).map(card => ({
      cardId: card.cardId,
      phase: card.route.phase,
      status: card.route.status,
      code: card.route.code,
      bodySubscribed: card.route.bodySubscribed,
    })),
    engineCodes: steps.map(step => ({ cardId: step.cardId, operation: step.operation, code: step.response.code })),
    runCompleted: stopped === false,
    unknownOutcome: unknown,
    automaticRetry: false,
    secondRun: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    production: false,
  });
  if (leaksPrivatePattern(evidence)) return fail('EVIDENCE_SANITIZATION_FAILED');
  let written = {};
  try {
    written = await evidenceWriter(evidence);
  } catch {
    return fail('EVIDENCE_WRITE_FAILED', { evidence });
  }
  const executedCards = [...new Set([
    ...cards.map(card => card.cardId),
    ...steps.map(step => step.cardId),
  ])].sort();
  return Object.freeze({
    ...blocked(),
    mode: packet.mode,
    decision: evidence.decision,
    acceptedArtifacts: true,
    executableBridgeSource: true,
    runCompleted: evidence.runCompleted,
    evidenceWritten: true,
    unknownOutcome: evidence.unknownOutcome,
    counts,
    cards: executedCards.map(cardId => ({ cardId, effect: CARD_EFFECTS[cardId] })),
    steps: steps.map(step => ({ cardId: step.cardId, operation: step.operation, code: step.response.code })),
    evidenceSha256: sha256Json(evidence),
    evidenceRef: typeof written.ref === 'string' ? written.ref : null,
    liveRunAuthorized: false,
    uploadsEnabled: false,
    conversionEnabled: false,
    automaticRetry: false,
    secondRun: false,
  });
}

module.exports = {
  packet: clone(packet),
  inspectAcceptedRunArtifacts,
  inspectRebuiltSuccessorRunArtifacts,
  inspectRestrictedCommandDescriptors,
  executeBoundedDevelopmentQualificationRun,
};
