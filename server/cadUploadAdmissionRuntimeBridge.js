// Source-only runtime bridge candidate. It is not imported by the mounted route.
const deny = code => Object.freeze({ ok: false, code });
const disabled = () => Object.freeze({
  ok: false,
  code: 'USER_UPLOADS_DISABLED',
  admissionAuthorized: false,
  bodyReadAuthorized: false,
  conversionAuthorized: false,
  sandboxDispatchAuthorized: false,
  storeMutationAuthorized: false,
});
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);

function validPrincipal(principal) {
  return principal && typeof principal === 'object' && !Array.isArray(principal)
    && principal.schemaVersion === 1 && id(principal.userId) && id(principal.shopId)
    && id(principal.sessionId) && principal.cadUploadAllowed === true;
}

function safeProposal(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.admissionAuthorized === false
    && value.conversionAuthorized === false
    && value.sandboxDispatchAuthorized === false
    && value.storeMutationAuthorized === false;
}

function createCadUploadAdmissionRuntimeBridge({
  enabled = false,
  acceptedWindow = false,
  planTransaction,
} = {}) {
  return Object.freeze({
    sourceOnly: true,
    runtimeMounted: false,
    bodyAdmissionAuthorized: false,
    async planAdmission(input = {}) {
      if (input.bodyAdmissionAuthorized !== false) return deny('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (enabled !== true || acceptedWindow !== true || input.dryRun !== true) return disabled();
      if (!validPrincipal(input.principal)) return deny('SESSION_CONTEXT_REQUIRED');
      if (typeof planTransaction !== 'function') return disabled();
      const proposal = await planTransaction(Object.freeze({
        principal: Object.freeze({
          schemaVersion: 1,
          userId: input.principal.userId,
          shopId: input.principal.shopId,
          sessionId: input.principal.sessionId,
        }),
        snapshot: input.snapshot,
        command: input.command,
        authority: input.authority,
        now: input.now,
        dryRun: true,
        bodyAdmissionAuthorized: false,
      }));
      if (!safeProposal(proposal)) return deny('UNSAFE_PROPOSAL_REJECTED');
      return Object.freeze({
        ...proposal,
        bodyReadAuthorized: false,
        runtimeMounted: false,
      });
    },
  });
}

module.exports = { createCadUploadAdmissionRuntimeBridge };
