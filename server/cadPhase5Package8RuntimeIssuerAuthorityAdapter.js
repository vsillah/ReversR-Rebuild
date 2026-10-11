// Disabled internal adapter for the durable Package 8 runtime issuer-authority
// ledger. Function references and transports are injected; no route, provider,
// credential, environment lookup, or retry path is installed here.
const {
  expectedRuntimeAuthorityReceipt,
} = require('./cadPhase5Package8IndependentQualificationLauncher');
const {
  hash,
  requestFromEvidence,
} = require('./cadPhase5Package8RuntimeIssuerAuthorityVerifier');

const REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'SOURCE_ONLY_PACKAGE8_RUNTIME_ISSUER_AUTHORITY_LEDGER_REVIEW',
  runtimeInstallRootCommit: 'c9dfd22a230869ef618c3c8fdfcc95ab86b8aaa0',
  runtimeInstallRootTree: '6db5b4f3c774e79aabb51ffa97d24d1d54c1e5dd',
  internalOnly: true,
  runtimeMounted: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
const FUNCTIONS = Object.freeze({
  register: 'mutation',
  consume: 'mutation',
  revoke: 'mutation',
  close: 'mutation',
  readSanitized: 'query',
});
const CODES = new Set([
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_DENIED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_EXPIRED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REPLAYED',
  'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONFLICT',
]);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
  && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const retry = () => ({ applicationRetries: 0, transportRetries: 0, providerRetries: 0 });

function plainClone(value, depth = 0, ancestors = []) {
  if (depth > 10 || !value || typeof value !== 'object' || ancestors.includes(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) {
    throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
  }
  const output = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
    }
    const item = descriptor.value;
    if (item === null || ['string', 'boolean'].includes(typeof item)) output[key] = item;
    else if (typeof item === 'number' && Number.isFinite(item)) output[key] = item;
    else output[key] = plainClone(item, depth + 1, [...ancestors, value]);
  }
  if (JSON.stringify(output).length > 32_768) {
    throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
  }
  return output;
}

function validBase(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && value.sourceOnly === true && value.internalOnly === true
    && value.routeMounted === false && value.runtimeActivationAllowed === false
    && value.requestBodyAdmissionAuthorized === false && value.providerDispatchEnabled === false
    && value.applicationRetries === 0 && value.transportRetries === 0
    && value.providerRetries === 0 && value.logicalOperationCalls === 1
    && value.externalSideEffectsInsideTransaction === false
    && value.platformOccReexecutionPossible === true
    && value.atMostOneCommittedTransition === true
    && typeof value.accepted === 'boolean' && CODES.has(value.code));
}

function sanitizeTransition(raw, expectedCode) {
  const value = plainClone(raw);
  if (!validBase(value)) throw Error('PACKAGE8_RUNTIME_AUTHORITY_RESULT_INVALID');
  if (value.accepted !== true) return Object.freeze({ ok: false, code: value.code,
    sourceOnly: true, ...retry() });
  if (value.code !== expectedCode || !digest(value.authorityCommitment)
    || !digest(value.requestCommitment) || !Number.isSafeInteger(value.generation)
    || value.generation < 1 || value.replayed !== false) {
    throw Error('PACKAGE8_RUNTIME_AUTHORITY_RESULT_INVALID');
  }
  return Object.freeze({ ok: true, code: value.code,
    authorityCommitment: value.authorityCommitment,
    requestCommitment: value.requestCommitment, generation: value.generation,
    replayed: false, sourceOnly: true, ...retry() });
}

function sanitizeRead(raw) {
  const value = plainClone(raw);
  if (!validBase(value) || value.accepted !== true
    || value.code !== 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIED'
    || !exactKeys(value.evidence, ['schemaVersion', 'authorityCommitment',
      'requestCommitment', 'issuanceReference', 'approvalCommitment', 'status',
      'generation', 'authorityExpiresAtUtc', 'consumed', 'revoked', 'closed', 'expired'])) {
    return null;
  }
  const evidence = value.evidence;
  if (evidence.schemaVersion !== 1 || !digest(evidence.authorityCommitment)
    || !digest(evidence.requestCommitment) || !id(evidence.issuanceReference)
    || !digest(evidence.approvalCommitment)
    || !['ACTIVE', 'CONSUMED', 'REVOKED', 'CLOSED', 'EXPIRED'].includes(evidence.status)
    || !Number.isSafeInteger(evidence.generation) || evidence.generation < 1
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(evidence.authorityExpiresAtUtc)
    || ['consumed', 'revoked', 'closed', 'expired']
      .some(key => typeof evidence[key] !== 'boolean')) return null;
  return Object.freeze(evidence);
}

function createCadPhase5Package8RuntimeIssuerAuthorityAdapter({
  reviewOnly = false,
  reviewGate,
  verifierPrincipalCommitment,
  references,
  runQuery,
  runMutation,
} = {}) {
  const operationNames = Object.keys(FUNCTIONS).sort();
  const reviewConfigured = reviewOnly === true && same(reviewGate, REVIEW_GATE)
    && digest(verifierPrincipalCommitment)
    && references && typeof references === 'object' && !Array.isArray(references)
    && Object.keys(references).sort().join(',') === operationNames.join(',')
    && Object.values(references).every(value => value !== null && value !== undefined)
    && typeof runQuery === 'function' && typeof runMutation === 'function';
  const refs = reviewConfigured ? Object.freeze({ ...references }) : null;
  let stopped = false;
  let remoteAttempts = 0;

  async function invoke(operation, payload) {
    if (!reviewConfigured || stopped) throw Error('PACKAGE8_RUNTIME_AUTHORITY_ADAPTER_DISABLED');
    const transport = FUNCTIONS[operation] === 'query' ? runQuery : runMutation;
    remoteAttempts += 1;
    try {
      return await transport(refs[operation], plainClone(payload));
    } catch {
      if (FUNCTIONS[operation] === 'mutation') stopped = true;
      throw Error('PACKAGE8_RUNTIME_AUTHORITY_OUTCOME_UNKNOWN');
    }
  }

  const exactLocator = value => {
    if (!value || !digest(value.issuerPrincipalCommitment)
      || !digest(value.authorityCommitment) || !digest(value.requestCommitment)) {
      throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
    }
    return { verifierPrincipalCommitment, issuerPrincipalCommitment: value.issuerPrincipalCommitment,
      authorityCommitment: value.authorityCommitment,
      requestCommitment: value.requestCommitment };
  };

  return Object.freeze({
    sourceOnly: true,
    internalOnly: true,
    configured: false,
    reviewConfigured,
    enabled: false,
    mounted: false,
    routeMounted: false,
    independentlyOwned: true,
    runtimeActivationAllowed: false,
    requestBodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    ...retry(),
    operations: FUNCTIONS,
    status: () => Object.freeze({ sourceOnly: true, internalOnly: true,
      configured: false, reviewConfigured, enabled: false, mounted: false,
      independentlyOwned: true, remoteAttempts, stopped, ...retry() }),
    async registerExact({ authorityEvidence, request, issuedAtUtc }) {
      const evidence = plainClone(authorityEvidence);
      const requested = plainClone(request);
      if (!reviewConfigured || stopped
        || evidence.verifierPrincipalCommitment !== verifierPrincipalCommitment
        || !same(requestFromEvidence(evidence), requested)
        || expectedRuntimeAuthorityReceipt(requested) === null
        || typeof issuedAtUtc !== 'string') {
        throw Error('PACKAGE8_RUNTIME_AUTHORITY_REGISTRATION_INVALID');
      }
      const authorityCommitment = hash(JSON.stringify(evidence));
      const requestCommitment = hash(JSON.stringify(requested));
      return sanitizeTransition(await invoke('register', {
        verifierPrincipalCommitment, authorityCommitment, requestCommitment,
        request: requested, issuedAtUtc,
      }), 'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REGISTERED');
    },
    async consumeExact(command) {
      const locator = exactLocator(command);
      return sanitizeTransition(await invoke('consume', locator),
        'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CONSUMED');
    },
    async revokeExact(command) {
      const locator = exactLocator(command);
      if (!digest(command.reasonDigest)) throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
      return sanitizeTransition(await invoke('revoke', { ...locator,
        reasonDigest: command.reasonDigest }),
      'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_REVOKED');
    },
    async closeExact(command) {
      const locator = exactLocator(command);
      if (!digest(command.reasonDigest)) throw Error('PACKAGE8_RUNTIME_AUTHORITY_INPUT_INVALID');
      return sanitizeTransition(await invoke('close', { ...locator,
        reasonDigest: command.reasonDigest }),
      'PACKAGE8_RUNTIME_ISSUER_AUTHORITY_CLOSED');
    },
    async readSanitized(command) {
      return sanitizeRead(await invoke('readSanitized', exactLocator(command)));
    },
  });
}

module.exports = {
  FUNCTIONS,
  REVIEW_GATE,
  createCadPhase5Package8RuntimeIssuerAuthorityAdapter,
};
