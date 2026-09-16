function inspectUploadAdmissionDevelopmentActivationExecutor(manifest, decision) {
  const flags = manifest?.authorityPreserved || {};
  const bindingsValid = manifest?.sourceBindings?.decisionPacket === 'offline/cad-convex/uploadAdmissionDevelopmentActivationDecision.json'
    && manifest?.sourceBindings?.runtimeBridge === 'server/cadUploadAdmissionRuntimeBridge.js'
    && manifest?.sourceBindings?.routeGate === 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED'
    && decision?.mode === 'source-only-cad-upload-admission-development-activation-decision';
  const boundsClosed = Object.values(manifest?.previewBounds || {}).every(value => value === false || value === true || value === 50)
    && manifest?.previewBounds?.developmentOnly === true
    && manifest?.previewBounds?.bodyAdmissionAuthorized === false
    && manifest?.previewBounds?.admissionAuthorized === false
    && manifest?.previewBounds?.conversionAuthorized === false
    && manifest?.previewBounds?.sandboxDispatchAuthorized === false
    && manifest?.previewBounds?.storeMutationAuthorized === false
    && manifest?.previewBounds?.maxAllInCostUsd === 50;
  const expectedValid = manifest?.expectedPreview?.decision === 'UPLOAD_ADMISSION_DEVELOPMENT_ACTIVATION_EXECUTOR_PREVIEWED'
    && manifest?.expectedPreview?.code === 'SOURCE_ONLY_DEVELOPMENT_ACTIVATION_PREVIEW'
    && manifest?.expectedPreview?.terminalCode === 'USER_UPLOADS_DISABLED'
    && manifest?.expectedPreview?.activationExecuted === false
    && manifest?.expectedPreview?.liveRunStarted === false
    && manifest?.expectedPreview?.uploadBodiesRead === 0
    && manifest?.expectedPreview?.conversionDispatches === 0
    && manifest?.expectedPreview?.sandboxDispatches === 0
    && manifest?.expectedPreview?.storeMutations === 0;
  const authoritiesClosed = Object.values(flags).every(value => value === false);
  const structureValid = manifest?.schemaVersion === 1
    && manifest?.mode === 'source-only-cad-upload-admission-development-activation-executor'
    && manifest?.sourceOnly === true
    && manifest?.liveRunAuthorizedByThisPacket === false
    && bindingsValid
    && boundsClosed
    && expectedValid
    && authoritiesClosed;
  return {
    structureValid,
    bindingsValid,
    boundsClosed,
    expectedValid,
    authoritiesClosed,
    liveRunAuthorized: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentActivationExecutor };
