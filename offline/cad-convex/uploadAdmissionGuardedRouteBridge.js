// Source-only guarded route bridge model. It is not mounted by server routes.
const { createUploadAdmissionDurableAdapter } = require('./uploadAdmissionDurableAdapter');

const deny = code => ({ ok: false, code });
const allFalse = values => Object.values(values || {}).every(value => value === false);

function validateQualificationWindow(packet) {
  if (!packet || packet.mode !== 'source-only-cad-upload-admission-qualification-window'
    || packet.sourceOnly !== true || packet.liveRunAuthorizedNow !== false
    || packet.uploadActivationAuthorizedNow !== false || packet.runtimeBridgeAvailableNow !== false
    || packet.bodyAdmissionAuthorized !== false || packet.qualificationBounds?.acceptedNow !== false
    || packet.fixtureCandidate?.acceptedNow !== false || packet.fixtureCandidate?.privateCad !== false
    || packet.fixtureCandidate?.conversionAuthorized !== false
    || packet.fixtureCandidate?.sandboxDispatchAuthorized !== false
    || packet.qualificationBounds?.allInPlanningCapUsd !== 50
    || packet.qualificationBounds?.maxAttempts !== 1
    || packet.qualificationBounds?.automaticRetry !== false
    || packet.qualificationBounds?.secondRun !== false
    || packet.qualificationBounds?.stopOnUnknownOutcome !== true
    || packet.nextSafeAction?.branch !== 'codex/cad-upload-admission-guarded-route-bridge'
    || !allFalse(packet.authorityPreserved)) return deny('QUALIFICATION_WINDOW_NOT_CLOSED');
  return { ok: true, code: 'QUALIFICATION_WINDOW_CLOSED' };
}

function createUploadAdmissionGuardedRouteBridge({
  qualificationWindow,
  plan,
  disabledAdapterManifest,
  readiness,
  runManifest,
  bridgeEnabled = false,
  acceptedWindow = false,
} = {}) {
  const windowCheck = validateQualificationWindow(qualificationWindow);
  if (!windowCheck.ok) return { ok: false, code: windowCheck.code };
  const adapter = createUploadAdmissionDurableAdapter({ plan, disabledAdapterManifest, readiness, runManifest });
  if (!adapter.ok) return adapter;
  return {
    ok: true,
    code: 'SOURCE_ONLY_GUARDED_ROUTE_BRIDGE_READY',
    runtimeMounted: false,
    bridgeEnabled: false,
    bodyAdmissionAuthorized: false,
    routeTerminalCode: 'USER_UPLOADS_DISABLED',
    planRouteDecision(input = {}) {
      if (input.bodyAdmissionAuthorized !== false) return deny('BODY_ADMISSION_MUST_REMAIN_FALSE');
      if (bridgeEnabled !== true || acceptedWindow !== true) return adapter.disabledRollback();
      if (input.dryRun !== true) return adapter.disabledRollback();
      return adapter.planTransaction({
        snapshot: input.snapshot,
        command: input.command,
        authority: input.authority,
        now: input.now,
        dryRun: true,
        bodyAdmissionAuthorized: false,
      });
    },
    planReconciliation(input = {}) {
      if (bridgeEnabled !== true || acceptedWindow !== true || input.dryRun !== true) return adapter.disabledRollback();
      return adapter.selectReconciliation({
        state: input.state,
        now: input.now,
        limit: input.limit,
        dryRun: true,
      });
    },
  };
}

module.exports = { validateQualificationWindow, createUploadAdmissionGuardedRouteBridge };
