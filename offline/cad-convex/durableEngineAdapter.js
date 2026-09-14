// Host adapter for reviewed internal durable-engine references. This module has no
// provider client, credential resolver, environment lookup or public route wiring.
const { blocked } = require('./durableAdapter');
const { inspectSyntheticEvidence } = require('./durableEvidenceBinding');

const FUNCTIONS = Object.freeze({
  initialize: Object.freeze({ name: 'cadDurableEngine:initialize', kind: 'mutation' }),
  readExact: Object.freeze({ name: 'cadDurableEngine:readExact', kind: 'query' }),
  readAuthority: Object.freeze({ name: 'cadDurableEngine:readAuthority', kind: 'query' }),
  transact: Object.freeze({ name: 'cadDurableEngine:transact', kind: 'mutation' }),
  changeAuthority: Object.freeze({ name: 'cadDurableEngine:changeAuthority', kind: 'mutation' }),
  claim: Object.freeze({ name: 'cadDurableEngine:claim', kind: 'mutation' }),
  settle: Object.freeze({ name: 'cadDurableEngine:settle', kind: 'mutation' }),
  scanPage: Object.freeze({ name: 'cadDurableEngine:scanPage', kind: 'mutation' }),
  stop: Object.freeze({ name: 'cadDurableEngine:stop', kind: 'mutation' }),
});
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const sanitized = (code, remoteAttempts, values = {}) => Object.freeze({ ...blocked(),
  code, engineAccepted: false, ...values, remoteAttempts });
function project(value, remoteAttempts) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.code !== 'string'
    || typeof value.engineAccepted !== 'boolean') return sanitized('ENGINE_RESPONSE_INVALID', remoteAttempts);
  const keys = ['changed', 'revision', 'authorityRevision', 'fence', 'status', 'outcome',
    'claimGeneration', 'selectors', 'next'];
  const out = Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
  if (Object.hasOwn(out, 'selectors')) {
    if (!Array.isArray(out.selectors) || out.selectors.some(row => !row || !Number.isSafeInteger(row.fence)
      || row.fence < 1 || typeof row.selectorDigest !== 'string' || !/^[a-f0-9]{64}$/.test(row.selectorDigest)))
      return sanitized('ENGINE_RESPONSE_INVALID', remoteAttempts);
    out.selectors = out.selectors.map(row => ({ fence: row.fence, selectorDigest: row.selectorDigest }));
  }
  return sanitized(value.code, remoteAttempts, { ...out, engineAccepted: value.engineAccepted });
}
function createDurableEngineAdapter({ references, runQuery, runMutation,
  verifyIndependentEvidence = () => false } = {}) {
  if (!exact(references, Object.keys(FUNCTIONS)) || Object.values(references).some(value => value == null)
    || typeof runQuery !== 'function' || typeof runMutation !== 'function'
    || typeof verifyIndependentEvidence !== 'function') throw new Error('ENGINE_ADAPTER_INVALID');
  const refs = Object.freeze({ ...references });
  let stopped = false, attempts = 0;
  async function call(operation, input, options = {}) {
    if (stopped) return sanitized('RUN_STOPPED', attempts);
    const definition = FUNCTIONS[operation];
    if (!definition) return sanitized('COMMAND_INVALID', attempts);
    try {
      options.signal?.throwIfAborted();
      attempts++;
      const invoke = definition.kind === 'query' ? runQuery : runMutation;
      const value = await invoke(refs[operation], input, options);
      options.signal?.throwIfAborted();
      const result = project(value, attempts);
      if (result.code === 'OUTCOME_UNKNOWN' || result.code === 'ENGINE_RESPONSE_INVALID') stopped = true;
      return result;
    } catch {
      if (definition.kind === 'mutation') stopped = true;
      return sanitized(definition.kind === 'mutation' ? 'OUTCOME_UNKNOWN' : 'ENGINE_UNAVAILABLE', attempts);
    }
  }
  return Object.freeze({
    initialize: (input, options) => call('initialize', input, options),
    readExact: (input, options) => call('readExact', input, options),
    readAuthority: (input, options) => call('readAuthority', input, options),
    transact: (input, options) => call('transact', input, options),
    changeAuthority: (input, options) => call('changeAuthority', input, options),
    claim: (input, options) => call('claim', input, options),
    async settle(input, evidenceBytes, expectedBytes, options) {
      try {
        // A matching public synthetic projection can never authorize settlement.
        const synthetic = inspectSyntheticEvidence(evidenceBytes, expectedBytes);
        if (synthetic.syntheticBindingsMatch === true) return sanitized('EVIDENCE_UNVERIFIED', attempts);
        // A later private host must bind a separately reviewed independent verifier.
        const verified = await verifyIndependentEvidence(evidenceBytes, expectedBytes, input);
        if (!verified || verified.independentEvidenceVerified !== true) return sanitized('EVIDENCE_UNVERIFIED', attempts);
        return call('settle', { ...input, evidence: verified }, options);
      } catch { return sanitized('EVIDENCE_UNVERIFIED', attempts); }
    },
    scanPage: (input, options) => call('scanPage', input, options),
    async stop(input, options) {
      const response = await call('stop', input, options);
      stopped = true;
      return response;
    },
    status: () => Object.freeze({ stopped, remoteAttempts: attempts, automaticRetries: 0 }),
  });
}
module.exports = { FUNCTIONS, createDurableEngineAdapter };
