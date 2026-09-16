function isUtcTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionDevelopmentActivationWindow(packet, executor, decision, closeout) {
  const structureValid = packet?.schemaVersion === 1
    && packet.mode === 'source-only-cad-upload-admission-development-activation-window'
    && packet.status === 'DEVELOPMENT_UPLOAD_ACTIVATION_WINDOW_READY_SOURCE_ONLY'
    && packet.sourceOnly === true
    && packet.acceptedExecutorPreview === true;

  const executorPreviewAccepted = executor?.status === 'DEVELOPMENT_UPLOAD_ACTIVATION_EXECUTOR_PREVIEW_READY_SOURCE_ONLY'
    && executor?.expectedPreview?.decision === packet?.acceptedEvidence?.activationPreviewDecision
    && executor?.expectedPreview?.activationExecuted === false
    && executor?.expectedPreview?.liveRunStarted === false
    && executor?.authorityPreserved?.cadUploadActivationAuthorizedByThisPacket === false;

  const decisionAccepted = decision?.status === 'DEVELOPMENT_UPLOAD_ACTIVATION_DECISION_PREPARED_SOURCE_ONLY'
    && decision?.futureDevelopmentActivationBounds?.developmentOnly === true
    && decision?.futureDevelopmentActivationBounds?.maxAllInCostUsd === packet?.runBounds?.allInPlanningCapUsd
    && decision?.authorityPreserved?.developmentRunAuthorizedByThisPacket === false;

  const closeoutAccepted = closeout?.status === 'UPLOAD_ADMISSION_QUALIFICATION_CLOSEOUT_ACCEPTED_SOURCE_ONLY'
    && closeout?.runCompleted === true
    && closeout?.result?.unknownOutcome === false
    && closeout?.evidence?.sanitizedEvidenceSha256 === packet?.acceptedEvidence?.qualificationEvidenceSha256
    && closeout?.evidence?.sanitizedReceiptSha256 === packet?.acceptedEvidence?.qualificationReceiptSha256;

  const start = packet?.acceptedWindow?.startUtc;
  const expires = packet?.acceptedWindow?.expiresUtc;
  const windowValid = isUtcTimestamp(start)
    && isUtcTimestamp(expires)
    && Date.parse(start) < Date.parse(expires)
    && packet.acceptedWindow.maxRunSeconds === 900
    && packet.acceptedWindow.scheduleIfMoreThanFiveMinutesAway === true;

  const boundsValid = packet?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && packet?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && packet?.runBounds?.maxAttempts === 1
    && packet?.runBounds?.automaticRetry === false
    && packet?.runBounds?.secondRun === false
    && packet?.runBounds?.stopOnUnknownOutcome === true
    && packet?.runBounds?.bodyAdmissionAuthorized === false
    && packet?.runBounds?.productionUploadActivationAuthorized === false
    && packet?.runBounds?.cadConversionAuthorized === false
    && packet?.runBounds?.sandboxDispatchAuthorized === false
    && packet?.runBounds?.privateCadAuthorized === false
    && packet?.runBounds?.realUsersAuthorized === false;

  const evidenceDestinationValid = packet?.sanitizedEvidenceDestination?.root === '.local/cad-convex/upload-admission-development-activation-1215z'
    && packet?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet?.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet?.sanitizedEvidenceDestination?.fileMode === '600';

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    executorPreviewAccepted,
    decisionAccepted,
    closeoutAccepted,
    windowValid,
    boundsValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForAutopilotDevelopmentPreview: structureValid
      && executorPreviewAccepted
      && decisionAccepted
      && closeoutAccepted
      && windowValid
      && boundsValid
      && evidenceDestinationValid
      && authoritiesClosed,
    liveDevelopmentRunAuthorizedByThisPacket: false
  };
}

module.exports = { inspectUploadAdmissionDevelopmentActivationWindow };
