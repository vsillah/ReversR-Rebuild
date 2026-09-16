// Source-only adapter model. No runtime import, provider client, store, env, fetch
// or executor. The mounted route remains closed by BODY_ADMISSION_AUTHORIZED=false.
const REQUIRED_REFS = Object.freeze({
  commandManifest: 'docs/cad-upload-activation-run-manifest.json#commandManifest',
  operators: 'docs/cad-upload-activation-run-manifest.json#operators',
  disabledRelease: 'docs/cad-upload-activation-run-manifest.json#rollback.verifiedDisabledRelease',
  closeAdmission: 'docs/cad-upload-activation-run-manifest.json#rollback.closeAdmissionBeforeDrain',
  reconcileUnknowns: 'docs/cad-upload-activation-run-manifest.json#commandManifest.reconcileUnknowns',
  safeDisposition: 'docs/cad-upload-activation-run-manifest.json#rollback.safeRetainedStateDispositionRequired',
  disabledSmoke: 'docs/cad-upload-activation-run-manifest.json#failClosedSmoke',
  runManifest: 'docs/cad-upload-activation-run-manifest.json#runManifest',
});
const deny = code => ({ ok: false, code });
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const allFalse = values => Object.values(values || {}).every(value => value === false);
const allNull = values => Object.values(values || {}).every(value => value === null);
function validateReadiness(readiness) {
  if (!readiness || readiness.mode !== 'source-only-activation-readiness'
    || readiness.enabled !== false || readiness.liveReady !== false || readiness.executable !== false
    || readiness.currentTerminalCode !== 'USER_UPLOADS_DISABLED'
    || !readiness.gates || Object.values(readiness.gates).some(gate => gate.approved !== false)
    || !allNull(readiness.authority)) return deny('READINESS_NOT_CLOSED');
  const provider = readiness.gates.providerReadiness.evidence;
  const rollback = readiness.gates.rollback.evidence;
  const activation = readiness.gates.activation.evidence;
  if (provider.reviewedExactCommandManifest !== REQUIRED_REFS.commandManifest
    || rollback.namedExecutorAndBackup !== REQUIRED_REFS.operators
    || rollback.verifiedDisabledRelease !== REQUIRED_REFS.disabledRelease
    || rollback.closeAdmissionBeforeDrain !== REQUIRED_REFS.closeAdmission
    || rollback.reconcileInFlightAndUnknownOutcomes !== REQUIRED_REFS.reconcileUnknowns
    || rollback.safeRetainedStateDisposition !== REQUIRED_REFS.safeDisposition
    || rollback.disabledEndpointReceipt !== REQUIRED_REFS.disabledSmoke
    || activation.boundedRunAndCostManifest !== REQUIRED_REFS.runManifest
    || activation.explicitUploadActivationApproval !== null
    || activation.separateConversionAndSandboxApproval !== null) return deny('READINESS_REF_MISMATCH');
  return { ok: true, code: 'READINESS_CLOSED' };
}
function validateRunManifest(packet) {
  if (!packet || packet.mode !== 'source-only-cad-upload-activation-run-manifest'
    || packet.sourceOnly !== true || packet.productionUploadActivationAuthorized !== false
    || packet.productionConversionAuthorized !== false || packet.sandboxDispatchAuthorized !== false
    || !allFalse(packet.authorityPreserved) || packet.runManifest.executableNow !== false
    || packet.runManifest.activationApprovalAccepted !== false
    || packet.runManifest.conversionAllowed !== false || packet.runManifest.sandboxDispatchAllowed !== false
    || packet.runManifest.privateCadAllowed !== false || packet.runManifest.realUsersAllowed !== false
    || packet.commandManifest.exactCommandsExecutableNow !== false
    || packet.target.currentTerminalCode !== 'USER_UPLOADS_DISABLED') return deny('RUN_MANIFEST_NOT_CLOSED');
  if (!exact(packet.operators, ['primaryCustodian', 'backupCustodian', 'testerReviewer',
    'executorRef', 'backupRef', 'testerReviewerRef', 'markIsCustodian'])
    || packet.operators.primaryCustodian !== 'Vambah Sillah'
    || packet.operators.backupCustodian !== 'Amina'
    || packet.operators.markIsCustodian !== false) return deny('RUN_MANIFEST_OPERATOR_MISMATCH');
  return { ok: true, code: 'RUN_MANIFEST_CLOSED' };
}
function createDisabledAdmissionAdapter({ readiness, runManifest, bodyAdmissionAuthorized = false } = {}) {
  const readinessCheck = validateReadiness(readiness);
  if (!readinessCheck.ok) return { ok: false, code: readinessCheck.code };
  const runCheck = validateRunManifest(runManifest);
  if (!runCheck.ok) return { ok: false, code: runCheck.code };
  if (bodyAdmissionAuthorized !== false) return { ok: false, code: 'BODY_ADMISSION_MUST_REMAIN_FALSE' };
  return {
    ok: true,
    code: 'DISABLED_ADMISSION_ADAPTER_READY',
    terminalCode: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    planAdmission() {
      return { ok: false, code: 'USER_UPLOADS_DISABLED', admissionAuthorized: false,
        conversionAuthorized: false, sandboxDispatchAuthorized: false };
    },
  };
}
module.exports = { REQUIRED_REFS, validateReadiness, validateRunManifest, createDisabledAdmissionAdapter };
