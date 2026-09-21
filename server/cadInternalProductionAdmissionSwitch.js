const disabledDecision = () => Object.freeze({
  ok: false,
  code: 'USER_UPLOADS_DISABLED',
  admissionAuthorized: false,
  bodyReadAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  storeMutationAuthorized: false,
  externalEffectAuthorized: false,
});

const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);

function validPrincipal(principal) {
  return principal && typeof principal === 'object' && !Array.isArray(principal)
    && principal.schemaVersion === 1 && id(principal.userId) && id(principal.shopId)
    && id(principal.sessionId) && principal.cadUploadAllowed === true;
}

function createCadInternalProductionAdmissionSwitch() {
  return Object.freeze({
    runtimeImported: true,
    defaultClosed: true,
    bodyAdmissionAuthorized: false,
    async decide(input = {}) {
      if (input.bodyAdmissionAuthorized !== false) return disabledDecision();
      if (!validPrincipal(input.principal)) return disabledDecision();
      return disabledDecision();
    },
  });
}

module.exports = { createCadInternalProductionAdmissionSwitch };
