// Source-only server contract for the internal Convex controlled-upload host.
// This module has no provider client, environment lookup, credential resolver,
// route registration, activation switch, retry loop or request-body access.

const FUNCTIONS = Object.freeze({
  registerApprovedGrantAndScope: 'mutation',
  projectAuthenticatedAuthority: 'mutation',
  transact: 'mutation',
  persistRestriction: 'mutation',
  readState: 'query',
  readReceipt: 'query',
  recordIndependentSmoke: 'mutation',
});

const OPTIONAL_FIELDS = Object.freeze({
  candidateWritten: 'boolean', metadataMatches: 'boolean', statePresent: 'boolean', receiptPresent: 'boolean',
  revision: 'number', resultDigest: 'digest', runSpent: 'boolean', attemptSpent: 'boolean',
  rollbackArmed: 'boolean', fenceOpenedOnce: 'boolean', fenceOpen: 'boolean', consumed: 'boolean',
  closed: 'boolean', revoked: 'boolean', unknown: 'boolean', permanentStop: 'boolean',
  recoveryState: 'recoveryState', stopReason: 'stopReason',
});
const RECOVERY_STATES = new Set(['pending', 'closed-revoked', 'verified', 'unknown']);
const STOP_REASONS = new Set(['unknown', 'clock-regression', 'restore', 'duplicate', 'revoked', 'expired']);
const DIGEST = /^[a-f0-9]{64}$/;
const CODE = /^[A-Z0-9_]{1,128}$/;

function denied(code, attempts, stopped = false) {
  return Object.freeze({
    code,
    sourceOnly: true,
    modelAccepted: false,
    hostQualified: false,
    bodyAdmissionAuthorized: false,
    liveReady: false,
    costs: 0,
    remoteAttempts: attempts,
    automaticRetries: 0,
    stopped,
  });
}

function plainClone(value, depth = 0, ancestors = []) {
  if (depth > 12) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.includes(value)) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  if (Array.isArray(value)) {
    if (value.length > 128 || Object.keys(descriptors).some(key => key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key))) {
      throw Error('CONTROLLED_HOST_INPUT_INVALID');
    }
    return value.map((_, index) => {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw Error('CONTROLLED_HOST_INPUT_INVALID');
      return plainClone(descriptor.value, depth + 1, [...ancestors, value]);
    });
  }
  const output = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw Error('CONTROLLED_HOST_INPUT_INVALID');
    output[key] = plainClone(descriptor.value, depth + 1, [...ancestors, value]);
  }
  return output;
}

function optionalValid(kind, value) {
  if (kind === 'boolean') return typeof value === 'boolean';
  if (kind === 'number') return Number.isSafeInteger(value) && value >= 0;
  if (kind === 'digest') return typeof value === 'string' && DIGEST.test(value);
  if (kind === 'recoveryState') return RECOVERY_STATES.has(value);
  if (kind === 'stopReason') return STOP_REASONS.has(value);
  return false;
}

function sanitize(value, attempts, stopped) {
  let input;
  try { input = plainClone(value); } catch { return denied('CONTROLLED_HOST_RESULT_INVALID', attempts, true); }
  if (!input || Array.isArray(input) || !CODE.test(input.code || '') || typeof input.modelAccepted !== 'boolean'
    || input.sourceOnly !== true || input.hostQualified !== false || input.bodyAdmissionAuthorized !== false
    || input.liveReady !== false || input.costs !== 0) {
    return denied('CONTROLLED_HOST_RESULT_INVALID', attempts, true);
  }
  const result = { ...denied(input.code, attempts, stopped), modelAccepted: input.modelAccepted };
  for (const [field, kind] of Object.entries(OPTIONAL_FIELDS)) {
    if (Object.hasOwn(input, field) && optionalValid(kind, input[field])) result[field] = input[field];
  }
  return Object.freeze(result);
}

function createCadControlledUploadDurableHostAdapter({ references, runQuery, runMutation } = {}) {
  if (!references || typeof references !== 'object' || Array.isArray(references)
    || Object.getPrototypeOf(references) !== Object.prototype
    || Object.keys(references).sort().join(',') !== Object.keys(FUNCTIONS).sort().join(',')
    || Object.values(references).some(reference => reference === null || reference === undefined)
    || typeof runQuery !== 'function' || typeof runMutation !== 'function') {
    throw Error('CONTROLLED_UPLOAD_DURABLE_HOST_ADAPTER_INVALID');
  }
  const refs = Object.freeze({ ...references });
  let attempts = 0;
  let stopped = false;

  async function call(name, input = {}) {
    if (stopped) return denied('CONTROLLED_HOST_ADAPTER_STOPPED', attempts, true);
    if (!Object.hasOwn(FUNCTIONS, name)) return denied('CONTROLLED_HOST_OPERATION_INVALID', attempts, stopped);
    let captured;
    try { captured = plainClone(input); } catch { return denied('CONTROLLED_HOST_INPUT_INVALID', attempts, stopped); }
    attempts += 1;
    try {
      const invoke = FUNCTIONS[name] === 'query' ? runQuery : runMutation;
      const result = sanitize(await invoke(refs[name], captured), attempts, stopped);
      if (result.code === 'CONTROLLED_HOST_RESULT_INVALID') stopped = true;
      return stopped && result.stopped !== true ? Object.freeze({ ...result, stopped: true }) : result;
    } catch {
      if (FUNCTIONS[name] === 'mutation') stopped = true;
      return denied(FUNCTIONS[name] === 'mutation' ? 'CONTROLLED_HOST_OUTCOME_UNKNOWN' : 'CONTROLLED_HOST_UNAVAILABLE', attempts, stopped);
    }
  }

  return Object.freeze({
    registerApprovedGrantAndScope: input => call('registerApprovedGrantAndScope', input),
    projectAuthenticatedAuthority: input => call('projectAuthenticatedAuthority', input),
    transact: input => call('transact', input),
    persistRestriction: input => call('persistRestriction', input),
    readState: input => call('readState', input),
    readReceipt: input => call('readReceipt', input),
    recordIndependentSmoke: input => call('recordIndependentSmoke', input),
    status: () => Object.freeze({
      sourceOnly: true,
      configured: true,
      internalOnly: true,
      independentVerificationAvailable: false,
      hostQualified: false,
      bodyAdmissionAuthorized: false,
      liveReady: false,
      remoteAttempts: attempts,
      automaticRetries: 0,
      stopped,
    }),
  });
}

module.exports = { FUNCTIONS, createCadControlledUploadDurableHostAdapter };
