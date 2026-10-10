// Source-only host adapter for the reviewed Package 8 Convex functions.
// References and transports are injected explicitly; this module does not
// select a deployment, read environment values, mount a route, or retry.

const FUNCTIONS = Object.freeze({
  reserveArtifact: 'mutation',
  consumeQuota: 'mutation',
  readArtifact: 'query',
  transitionArtifact: 'mutation',
  confirmDeleted: 'mutation',
  issueDownloadGrant: 'mutation',
  resolveDownloadGrant: 'query',
  claimUpload: 'mutation',
  advanceUpload: 'mutation',
  claimConversion: 'mutation',
  advanceConversion: 'mutation',
  closeForRollback: 'mutation',
  reconcile: 'query',
});

const OPTIONAL_FIELDS = Object.freeze({
  status: 'string',
  artifactId: 'string',
  attemptId: 'string',
  jobId: 'string',
  fence: 'number',
  generation: 'number',
  retainedUntil: 'number',
  byteCount: 'number',
  expiresAt: 'number',
  deleted: 'boolean',
  tombstoneDigest: 'digest',
  state: 'string',
  replayed: 'boolean',
  revision: 'number',
  admissionClosed: 'boolean',
  conversionClosed: 'boolean',
  grantsRevoked: 'boolean',
  uncertainRecordsQuarantined: 'boolean',
});
const CODE = /^[A-Z0-9_]{1,128}$/;
const DIGEST = /^[a-f0-9]{64}$/;

function denied(code, attempts, stopped = false) {
  return Object.freeze({
    sourceOnly: true,
    liveReady: false,
    routeMounted: false,
    bodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    conversionDispatchEnabled: false,
    downloadRouteEnabled: false,
    accepted: false,
    code,
    remoteAttempts: attempts,
    automaticRetries: 0,
    stopped,
  });
}

function plainClone(value, depth = 0, ancestors = []) {
  if (depth > 12) throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.includes(value)) {
    throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) {
    throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
  }
  if (Array.isArray(value)) {
    if (value.length > 128 || Object.keys(descriptors)
      .some(key => key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key))) {
      throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
    }
    return value.map((_, index) => {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
        throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
      }
      return plainClone(descriptor.value, depth + 1, [...ancestors, value]);
    });
  }
  const output = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw Error('PACKAGE8_DURABLE_INPUT_INVALID');
    }
    output[key] = plainClone(descriptor.value, depth + 1, [...ancestors, value]);
  }
  return output;
}

function optionalValid(kind, value) {
  if (kind === 'string') return typeof value === 'string' && value.length <= 256;
  if (kind === 'number') return Number.isSafeInteger(value) && value >= 0;
  if (kind === 'boolean') return typeof value === 'boolean';
  return kind === 'digest' && typeof value === 'string' && DIGEST.test(value);
}

function sanitize(value, attempts, stopped) {
  let input;
  try { input = plainClone(value); } catch {
    return denied('PACKAGE8_DURABLE_RESULT_INVALID', attempts, true);
  }
  if (!input || Array.isArray(input) || input.sourceOnly !== true || input.liveReady !== false
    || input.routeMounted !== false || input.bodyAdmissionAuthorized !== false
    || input.providerDispatchEnabled !== false || input.conversionDispatchEnabled !== false
    || input.downloadRouteEnabled !== false || typeof input.accepted !== 'boolean'
    || !CODE.test(input.code || '')) {
    return denied('PACKAGE8_DURABLE_RESULT_INVALID', attempts, true);
  }
  const output = { ...denied(input.code, attempts, stopped), accepted: input.accepted };
  for (const [field, kind] of Object.entries(OPTIONAL_FIELDS)) {
    if (Object.hasOwn(input, field) && optionalValid(kind, input[field])) output[field] = input[field];
  }
  return Object.freeze(output);
}

function createCadPhase5Package8ConvexDurableInvoker({ references, runQuery, runMutation } = {}) {
  const expected = Object.keys(FUNCTIONS).sort();
  if (!references || typeof references !== 'object' || Array.isArray(references)
    || Object.getPrototypeOf(references) !== Object.prototype
    || Object.keys(references).sort().join(',') !== expected.join(',')
    || Object.values(references).some(reference => reference === null || reference === undefined)
    || typeof runQuery !== 'function' || typeof runMutation !== 'function') {
    throw Error('PACKAGE8_CONVEX_DURABLE_INVOKER_INVALID');
  }
  const refs = Object.freeze({ ...references });
  let attempts = 0;
  let stopped = false;

  async function call(name, input = {}) {
    if (stopped) return denied('PACKAGE8_DURABLE_INVOKER_STOPPED', attempts, true);
    let captured;
    try { captured = plainClone(input); } catch {
      return denied('PACKAGE8_DURABLE_INPUT_INVALID', attempts, stopped);
    }
    attempts += 1;
    try {
      const invoke = FUNCTIONS[name] === 'query' ? runQuery : runMutation;
      const output = sanitize(await invoke(refs[name], captured), attempts, stopped);
      if (output.code === 'PACKAGE8_DURABLE_RESULT_INVALID') stopped = true;
      return stopped && output.stopped !== true
        ? Object.freeze({ ...output, stopped: true }) : output;
    } catch {
      if (FUNCTIONS[name] === 'mutation') stopped = true;
      return denied(FUNCTIONS[name] === 'mutation'
        ? 'PACKAGE8_DURABLE_OUTCOME_UNKNOWN' : 'PACKAGE8_DURABLE_UNAVAILABLE', attempts, stopped);
    }
  }

  const methods = {};
  for (const name of Object.keys(FUNCTIONS)) methods[name] = input => call(name, input);
  return Object.freeze({
    ...methods,
    status: () => Object.freeze({
      sourceOnly: true,
      configured: true,
      internalOnly: true,
      mounted: false,
      routeMounted: false,
      liveReady: false,
      remoteAttempts: attempts,
      automaticRetries: 0,
      stopped,
    }),
  });
}

module.exports = { FUNCTIONS, createCadPhase5Package8ConvexDurableInvoker };
