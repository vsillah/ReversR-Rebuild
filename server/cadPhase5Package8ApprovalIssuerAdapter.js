// Disabled source-only adapter for the independently owned approval issuer.
// References and transports are injected explicitly. No default instance,
// route, provider, environment selector, or retry path exists.
const {
  REVIEW_GATE,
  digest,
  exactKeys,
  id,
  same,
  validIssueCommand,
  validVerificationRequest,
  verificationReceipt,
} = require('./cadPhase5Package8ApprovalIssuanceContract');

const FUNCTIONS = Object.freeze({
  issue: 'mutation',
  verify: 'query',
  consume: 'mutation',
  revoke: 'mutation',
  close: 'mutation',
  readSanitized: 'query',
});
const RESULT_CODES = new Set([
  'PACKAGE8_APPROVAL_ISSUED',
  'PACKAGE8_APPROVAL_VERIFIED',
  'PACKAGE8_APPROVAL_CONSUMED',
  'PACKAGE8_APPROVAL_REVOKED',
  'PACKAGE8_APPROVAL_CLOSED',
  'PACKAGE8_APPROVAL_DENIED',
  'PACKAGE8_APPROVAL_EXPIRED',
  'PACKAGE8_APPROVAL_REPLAYED',
  'PACKAGE8_APPROVAL_CONFLICT',
]);

function plainClone(value, depth = 0, ancestors = []) {
  if (depth > 10 || !value || typeof value !== 'object' || ancestors.includes(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error('PACKAGE8_APPROVAL_INPUT_INVALID');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) {
    throw Error('PACKAGE8_APPROVAL_INPUT_INVALID');
  }
  const output = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw Error('PACKAGE8_APPROVAL_INPUT_INVALID');
    }
    const item = descriptor.value;
    if (item === null || ['string', 'boolean'].includes(typeof item)) output[key] = item;
    else if (typeof item === 'number' && Number.isFinite(item)) output[key] = item;
    else if (Array.isArray(item)) {
      if (item.length > 32) throw Error('PACKAGE8_APPROVAL_INPUT_INVALID');
      output[key] = item.map(entry => {
        if (entry === null || ['string', 'boolean'].includes(typeof entry)) return entry;
        if (typeof entry === 'number' && Number.isFinite(entry)) return entry;
        return plainClone(entry, depth + 1, [...ancestors, value]);
      });
    } else output[key] = plainClone(item, depth + 1, [...ancestors, value]);
  }
  return output;
}

function validBaseResult(value, code) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && value.sourceOnly === true && value.internalOnly === true
    && value.routeMounted === false && value.runtimeActivationAllowed === false
    && value.sessionIssuanceEnabled === false && value.requestBodyAdmissionAuthorized === false
    && value.providerDispatchEnabled === false && value.automaticRetries === 0
    && typeof value.accepted === 'boolean' && value.code === code && RESULT_CODES.has(code));
}

function validReceipt(value, request) {
  const expected = verificationReceipt(request);
  return exactKeys(value, [...Object.keys(request), 'verified', 'status', 'revoked',
    'consumed', 'receiptDigest']) && expected !== null && same(value, expected);
}

function sanitizeResult(operation, raw, request) {
  const value = plainClone(raw);
  if (!RESULT_CODES.has(value.code) || !validBaseResult(value, value.code)) {
    throw Error('PACKAGE8_APPROVAL_RESULT_INVALID');
  }
  if (operation === 'verify') {
    if (value.accepted !== true || value.code !== 'PACKAGE8_APPROVAL_VERIFIED'
      || !validReceipt(value.receipt, request)) return null;
    return Object.freeze(value.receipt);
  }
  if (operation === 'readSanitized') {
    if (value.accepted !== true || !exactKeys(value.evidence, ['schemaVersion',
      'issuanceReference', 'approvalCommitment', 'status', 'generation', 'issuedAtUtc',
      'authorityExpiresAtUtc', 'windowIdDigest', 'runtimeDeploymentId', 'receiptDigest',
      'consumptionReceiptDigest', 'revoked', 'consumed', 'closed', 'expired'])) return null;
    const evidence = value.evidence;
    if (evidence.schemaVersion !== 1 || !id(evidence.issuanceReference)
      || !digest(evidence.approvalCommitment) || !digest(evidence.windowIdDigest)
      || !id(evidence.runtimeDeploymentId) || !digest(evidence.receiptDigest)
      || (evidence.consumptionReceiptDigest !== null
        && !digest(evidence.consumptionReceiptDigest))
      || !Number.isSafeInteger(evidence.generation) || evidence.generation < 1
      || !['ISSUED_ACTIVE', 'ISSUED_CONSUMED', 'ISSUED_REVOKED',
        'ISSUED_CLOSED', 'ISSUED_EXPIRED'].includes(evidence.status)
      || ['revoked', 'consumed', 'closed', 'expired']
        .some(key => typeof evidence[key] !== 'boolean')) return null;
    return Object.freeze(evidence);
  }
  if (value.accepted !== true) return Object.freeze({ ok: false, code: value.code,
    sourceOnly: true, automaticRetries: 0 });
  const transition = {
    issue: ['PACKAGE8_APPROVAL_ISSUED', 'ISSUED_ACTIVE_ONE_USE'],
    consume: ['PACKAGE8_APPROVAL_CONSUMED', 'ISSUED_CONSUMED_ONE_USE'],
    revoke: ['PACKAGE8_APPROVAL_REVOKED', 'ISSUED_REVOKED'],
    close: ['PACKAGE8_APPROVAL_CLOSED', 'ISSUED_CLOSED'],
  }[operation];
  if (!transition || value.code !== transition[0] || value.status !== transition[1]) {
    throw Error('PACKAGE8_APPROVAL_RESULT_INVALID');
  }
  if (!id(value.issuanceReference) || !digest(value.approvalCommitment)
    || !Number.isSafeInteger(value.generation) || value.generation < 1) {
    throw Error('PACKAGE8_APPROVAL_RESULT_INVALID');
  }
  const result = { ok: true, code: value.code, issuanceReference: value.issuanceReference,
    approvalCommitment: value.approvalCommitment, status: value.status,
    generation: value.generation, sourceOnly: true, automaticRetries: 0 };
  if (Object.hasOwn(value, 'receiptDigest')) {
    if (!digest(value.receiptDigest)) throw Error('PACKAGE8_APPROVAL_RESULT_INVALID');
    result.receiptDigest = value.receiptDigest;
  }
  if (Object.hasOwn(value, 'consumptionReceiptDigest')) {
    if (!digest(value.consumptionReceiptDigest)) throw Error('PACKAGE8_APPROVAL_RESULT_INVALID');
    result.consumptionReceiptDigest = value.consumptionReceiptDigest;
  }
  return Object.freeze(result);
}

function createCadPhase5Package8ApprovalIssuerAdapter({
  reviewOnly = false,
  reviewGate,
  issuerPrincipalDigest,
  references,
  runQuery,
  runMutation,
} = {}) {
  const expected = Object.keys(FUNCTIONS).sort();
  const reviewConfigured = reviewOnly === true && same(reviewGate, REVIEW_GATE)
    && digest(issuerPrincipalDigest)
    && references && typeof references === 'object' && !Array.isArray(references)
    && Object.getPrototypeOf(references) === Object.prototype
    && Object.keys(references).sort().join(',') === expected.join(',')
    && Object.values(references).every(reference => reference !== null && reference !== undefined)
    && typeof runQuery === 'function' && typeof runMutation === 'function';
  const refs = reviewConfigured ? Object.freeze({ ...references }) : null;
  let remoteAttempts = 0;
  let stopped = false;

  async function invoke(operation, payload) {
    if (!reviewConfigured || stopped) throw Error('PACKAGE8_APPROVAL_ISSUER_DISABLED');
    const input = plainClone({ issuerPrincipalDigest, ...payload });
    remoteAttempts += 1;
    try {
      const fn = FUNCTIONS[operation] === 'query' ? runQuery : runMutation;
      return await fn(refs[operation], input);
    } catch (error) {
      if (FUNCTIONS[operation] === 'mutation') stopped = true;
      throw error;
    }
  }
  const requireReview = () => {
    if (!reviewConfigured || stopped) throw Error('PACKAGE8_APPROVAL_ISSUER_DISABLED');
  };

  return Object.freeze({
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    runtimeActivationAllowed: false,
    sessionIssuanceEnabled: false,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    approvalArtifactIssued: false,
    automaticRetries: 0,
    operations: FUNCTIONS,
    status: () => Object.freeze({ sourceOnly: true, internalOnly: true,
      configured: false, reviewConfigured, enabled: false, mounted: false,
      routeMounted: false, runtimeActivationAllowed: false,
      approvalArtifactIssued: false, remoteAttempts, automaticRetries: 0, stopped }),
    async issueExact(command) {
      requireReview();
      if (!validIssueCommand(command)
        || command.issuerPrincipalDigest !== issuerPrincipalDigest) {
        throw Error('PACKAGE8_APPROVAL_ISSUE_INVALID');
      }
      return sanitizeResult('issue', await invoke('issue', { command }), command.request);
    },
    async verifyExact(request) {
      requireReview();
      if (!validVerificationRequest(request)) throw Error('PACKAGE8_APPROVAL_VERIFY_INVALID');
      return sanitizeResult('verify', await invoke('verify', { request }), request);
    },
    async consumeExact(request) {
      requireReview();
      if (!validVerificationRequest(request)) throw Error('PACKAGE8_APPROVAL_CONSUME_INVALID');
      return sanitizeResult('consume', await invoke('consume', { request }), request);
    },
    async revokeExact({ issuanceReference, approvalCommitment, reasonDigest }) {
      requireReview();
      if (!id(issuanceReference) || !digest(approvalCommitment) || !digest(reasonDigest)) {
        throw Error('PACKAGE8_APPROVAL_REVOKE_INVALID');
      }
      return sanitizeResult('revoke', await invoke('revoke', {
        issuanceReference, approvalCommitment, reasonDigest,
      }));
    },
    async closeExact({ issuanceReference, approvalCommitment, reasonDigest }) {
      requireReview();
      if (!id(issuanceReference) || !digest(approvalCommitment) || !digest(reasonDigest)) {
        throw Error('PACKAGE8_APPROVAL_CLOSE_INVALID');
      }
      return sanitizeResult('close', await invoke('close', {
        issuanceReference, approvalCommitment, reasonDigest,
      }));
    },
    async readSanitized({ issuanceReference, approvalCommitment }) {
      requireReview();
      if (!id(issuanceReference) || !digest(approvalCommitment)) {
        throw Error('PACKAGE8_APPROVAL_READ_INVALID');
      }
      return sanitizeResult('readSanitized', await invoke('readSanitized', {
        issuanceReference, approvalCommitment,
      }));
    },
  });
}

module.exports = {
  FUNCTIONS,
  createCadPhase5Package8ApprovalIssuerAdapter,
};
