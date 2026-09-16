// Source-only durable adapter model for CAD upload admission. This is not
// imported by runtime routes and cannot authorize request bodies or conversion.
const { transition, selectReconciliation } = require('./sharedUploadControls');
const { createDisabledAdmissionAdapter } = require('./disabledUploadAdmissionAdapter');

const CLOSED_AUTHORITY_KEYS = Object.freeze([
  'cadUploadActivationAuthorized',
  'cadConversionAuthorized',
  'sandboxDispatchAuthorized',
  'privateCadAuthorized',
  'productionStoreMutationAuthorized',
  'developmentStoreMutationAuthorizedNow',
  'envProviderAuthResourceChangeAuthorized',
  'usageBillingChangeAuthorized',
  'secretReadAuthorized',
  'emailSmsSlackAuthorized',
  'externalDeliveryAuthorized',
  'pushMergeDeployAuthorizedByThisPacket',
]);

const deny = code => ({ ok: false, code });
const allFalse = values => Object.values(values || {}).every(value => value === false);

function validateDurableAdapterPlan(plan, disabledAdapterManifest, readiness, runManifest) {
  if (!plan || plan.mode !== 'source-only-cad-upload-admission-durable-adapter-plan'
    || plan.sourceOnly !== true || plan.runtimeImported !== false
    || plan.bodyAdmissionAuthorized !== false || plan.executableNow !== false
    || plan.liveRunAuthorizedNow !== false || !allFalse(plan.planGates)
    || !CLOSED_AUTHORITY_KEYS.every(key => plan.authorityPreserved?.[key] === false)
    || plan.bindings?.disabledAdapter?.source !== 'offline/cad-convex/disabledUploadAdmissionAdapter.js'
    || plan.bindings?.disabledAdapter?.manifest !== 'offline/cad-convex/disabledUploadAdmissionAdapter.json'
    || plan.bindings?.disabledAdapter?.rollbackTarget !== true
    || plan.bindings?.activationReadiness?.manifest !== 'offline/cad-convex/userUploadActivationReadiness.json'
    || plan.bindings?.runManifest?.manifest !== 'docs/cad-upload-activation-run-manifest.json'
    || plan.bindings?.sharedControls?.model !== 'offline/cad-convex/sharedUploadControls.js'
    || plan.bindings?.sessionAuthority?.source !== 'docs/cad-dev-upload-session-successful-closeout.json'
    || plan.nextSafeAction?.branch !== 'codex/cad-upload-admission-durable-adapter-source') {
    return deny('DURABLE_ADAPTER_PLAN_NOT_CLOSED');
  }
  if (!disabledAdapterManifest || disabledAdapterManifest.mode !== 'source-only-disabled-upload-admission-adapter'
    || disabledAdapterManifest.enabled !== false || disabledAdapterManifest.liveReady !== false
    || disabledAdapterManifest.runtimeImported !== false
    || disabledAdapterManifest.bodyAdmissionAuthorized !== false
    || disabledAdapterManifest.terminalCode !== 'USER_UPLOADS_DISABLED'
    || !allFalse(disabledAdapterManifest.authorityPreserved)) return deny('DISABLED_ROLLBACK_TARGET_NOT_CLOSED');
  const disabled = createDisabledAdmissionAdapter({ readiness, runManifest });
  if (!disabled.ok) return deny(disabled.code);
  return { ok: true, code: 'DURABLE_ADAPTER_PLAN_CLOSED' };
}

function createUploadAdmissionDurableAdapter({ plan, disabledAdapterManifest, readiness, runManifest } = {}) {
  const planCheck = validateDurableAdapterPlan(plan, disabledAdapterManifest, readiness, runManifest);
  if (!planCheck.ok) return { ok: false, code: planCheck.code };
  const disabled = createDisabledAdmissionAdapter({ readiness, runManifest });
  return {
    ok: true,
    code: 'SOURCE_ONLY_DURABLE_ADAPTER_READY',
    sourceOnly: true,
    runtimeImported: false,
    routeTerminalCode: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    disabledRollback() {
      return disabled.planAdmission();
    },
    planTransaction({ snapshot, command, authority, now, dryRun = false, bodyAdmissionAuthorized = false } = {}) {
      if (bodyAdmissionAuthorized !== false) return deny('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (dryRun !== true) return disabled.planAdmission();
      const proposed = transition(snapshot, command, authority, now);
      if (!proposed.ok) return proposed;
      return {
        ok: true,
        code: 'SOURCE_ONLY_TRANSACTION_PROPOSAL',
        status: proposed.status,
        fence: proposed.fence,
        changed: proposed.changed,
        state: proposed.state,
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
        externalEffectAuthorized: false,
      };
    },
    selectReconciliation({ state, now, limit = 32, dryRun = false } = {}) {
      if (dryRun !== true) return disabled.planAdmission();
      const selected = selectReconciliation(state, now, limit);
      if (!selected.ok) return selected;
      return {
        ok: true,
        code: 'SOURCE_ONLY_RECONCILIATION_SELECTION',
        selectors: selected.selectors,
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
        externalEffectAuthorized: false,
      };
    },
  };
}

module.exports = { validateDurableAdapterPlan, createUploadAdmissionDurableAdapter };
