// Disabled-by-default source binding. No environment, filesystem, provider,
// request, or credential inputs can populate this object.
const { METHODS, reviewExecutableCommandCardBinding } =
  require('./cadLiveOpeningExecutableRuntimeWiring');

const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const PRODUCTION_EXECUTION_BINDING_SOURCE = null;
const SHA = /^[a-f0-9]{64}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const isSha = value => typeof value === 'string' && SHA.test(value);
const isRef = value => typeof value === 'string' && REF.test(value);
const isId = value => typeof value === 'string' && ID.test(value);
const isService = value => value && typeof value === 'object' && !Array.isArray(value)
  && METHODS.every(name => typeof value[name] === 'function');

function createCadProductionExecutionBindingSource(input = PRODUCTION_EXECUTION_BINDING_SOURCE) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.enabled !== true) return null;
    if (input.boundedSessionRef !== BOUNDED_SESSION_REF
      || !isId(input.sessionId)
      || !isSha(input.commandCardSha256)
      || !isSha(input.durableEvidenceSha256)
      || !isRef(input.currentDeploymentReference)
      || typeof input.commandCardBytes !== 'string'
      || typeof input.now !== 'function'
      || !isService(input.durableService)) return null;
    const binding = reviewExecutableCommandCardBinding(input);
    if (binding.bindingAccepted !== true
      || input.sessionId !== binding.commandCard.sessionId
      || input.durableEvidenceSha256 !== binding.commandCard.durableEvidenceSha256) return null;
    return Object.freeze({
      enabled: true,
      commandCardBytes: input.commandCardBytes,
      commandCardSha256: input.commandCardSha256,
      currentDeploymentReference: input.currentDeploymentReference,
      boundedSessionRef: BOUNDED_SESSION_REF,
      sessionId: input.sessionId,
      durableEvidenceSha256: input.durableEvidenceSha256,
      durableService: input.durableService,
      now: input.now,
    });
  } catch {
    return null;
  }
}

module.exports = {
  BOUNDED_SESSION_REF,
  PRODUCTION_EXECUTION_BINDING_SOURCE,
  createCadProductionExecutionBindingSource,
};
