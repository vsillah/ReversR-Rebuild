// Source-only candidate. No runtime imports, drivers, callbacks, or enable switch.
const schema = require('./binding.schema.json');
const METHODS = Object.freeze(['verifyApproval', 'verifyDurableEvidence',
  'recheckDeployment', 'verifyClosedBaseline', 'claimRun', 'armRollback',
  'verifySession', 'claimAttempt', 'openFence', 'consumeAttempt', 'closeFence',
  'revokeSessionAndLateGrants', 'postRollbackSmoke']);
const APPROVAL_PHRASE = 'Approve source-only supply and review of the exact existing bounded-session ID, durable-evidence SHA-256, immutable deployment binding, and non-secret provenance for cad-auth-durable-adapter-rejection-prep; no session issuance, private evidence reads, runtime installation, activation, or live command-card issuance.';

function closed(code) {
  return Object.freeze({ code, sourceOnly: true, enabled: false,
    runtimeInstallationAuthorized: false, runtimeActivated: false,
    commandCardIssued: false, uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false, bodyReadAuthorized: false,
    conversionAuthorized: false, sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false, retryAuthorized: false,
    secondLiveRunAuthorized: false, externalMessagesAuthorized: false,
    realUserCommercializationAuthorized: false, effectsExecuted: 0 });
}

// Receives JSON bytes only, never a file path, callback or live object.
// This validates shape, not authenticity or current deployment status.
function matches(value, rule) {
  if (Object.hasOwn(rule, 'const') && value !== rule.const) return false;
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return rule.required.every(key => Object.hasOwn(value, key))
      && keys.every(key => Object.hasOwn(rule.properties, key)
        && matches(value[key], rule.properties[key]));
  }
  if (rule.type === 'integer') return Number.isInteger(value);
  if (rule.type === 'string') return typeof value === 'string'
    && value.length >= (rule.minLength || 0) && value.length <= rule.maxLength
    && (!rule.pattern || new RegExp(rule.pattern).test(value));
  return false;
}
function reviewBindingInput(bytes) {
  if (bytes === undefined || bytes === null) return closed('STOPPED_SOURCE_INPUTS_UNRESOLVED');
  try {
    if (typeof bytes !== 'string' || bytes.length > 16384) return closed('BINDING_INPUT_REJECTED');
    const input = JSON.parse(bytes);
    if (!matches(input, schema)) return closed('BINDING_INPUT_REJECTED');
    if (input.sessionId !== input.provenance.sessionId
      || input.durableEvidenceSha256 !== input.provenance.durableEvidenceSha256) {
      return closed('BINDING_PROVENANCE_MISMATCH');
    }
    return closed('BINDING_SHAPE_VALID_REQUIRES_SEPARATE_AUTHENTICITY_AND_CURRENT_TARGET_REVIEW');
  } catch { return closed('BINDING_INPUT_REJECTED'); }
}
function createDurableAdapterCandidate() {
  // Deliberately ignore all supplied options and operation arguments.
  return Object.freeze(Object.fromEntries(METHODS.map(name => [name, async () => {
    throw Error('SOURCE_ONLY_DURABLE_ADAPTER_RUNTIME_INSTALLATION_REJECTED');
  }])));
}
module.exports = { METHODS, APPROVAL_PHRASE, closed, reviewBindingInput, createDurableAdapterCandidate };
