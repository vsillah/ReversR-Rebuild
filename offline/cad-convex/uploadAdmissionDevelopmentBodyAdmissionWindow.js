function isUtcTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionDevelopmentBodyAdmissionWindow(packet, executor, bodyPacket) {
  const structureValid = packet?.schemaVersion === 1
    && packet.mode === 'source-only-cad-upload-admission-development-body-admission-window'
    && packet.status === 'DEVELOPMENT_BODY_ADMISSION_WINDOW_READY_SOURCE_ONLY'
    && packet.sourceOnly === true
    && packet.acceptedExecutorSource === true;

  const executorAccepted = executor?.status === 'DEVELOPMENT_BODY_ADMISSION_EXECUTOR_READY_SOURCE_ONLY'
    && executor?.expectedFutureResult?.decision === 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED'
    && executor?.liveRunAuthorizedByThisPacket === false
    && executor?.acceptedWindow === null
    && executor?.acceptedInputs?.qualificationEvidenceSha256
      === packet?.acceptedEvidence?.qualificationEvidenceSha256
    && executor?.acceptedInputs?.publicFixtureSha256 === packet?.acceptedEvidence?.publicFixtureSha256
    && packet?.acceptedEvidence?.executorMergedMainCommit === '8a333f534c1824d2899010269efba75b98937fc5';

  const bodyPacketAccepted = bodyPacket?.status === 'DEVELOPMENT_BODY_ADMISSION_PACKET_READY_SOURCE_ONLY'
    && bodyPacket?.liveRunAuthorizedByThisPacket === false
    && bodyPacket?.boundedRunCriteria?.maxAttempts === packet?.runBounds?.maxAttempts
    && bodyPacket?.boundedRunCriteria?.automaticRetry === packet?.runBounds?.automaticRetry
    && bodyPacket?.boundedRunCriteria?.secondRun === packet?.runBounds?.secondRun
    && bodyPacket?.boundedRunCriteria?.allInPlanningCapUsd === packet?.runBounds?.allInPlanningCapUsd
    && bodyPacket?.acceptedInputs?.publicFixtureSha256 === packet?.acceptedEvidence?.publicFixtureSha256;

  const start = packet?.acceptedWindow?.startUtc;
  const expires = packet?.acceptedWindow?.expiresUtc;
  const windowValid = isUtcTimestamp(start)
    && isUtcTimestamp(expires)
    && Date.parse(start) < Date.parse(expires)
    && packet.acceptedWindow.maxRunSeconds === 900
    && packet.acceptedWindow.scheduleIfMoreThanFiveMinutesAway === true
    && packet.acceptedWindow.evidenceRoot === packet.sanitizedEvidenceDestination?.root;

  const boundsValid = packet?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && packet?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && packet?.runBounds?.maxAttempts === 1
    && packet?.runBounds?.automaticRetry === false
    && packet?.runBounds?.secondRun === false
    && packet?.runBounds?.stopOnUnknownOutcome === true
    && packet?.runBounds?.deleteRetainedState === false
    && packet?.runBounds?.allInPlanningCapUsd === 50
    && packet?.runBounds?.isolatedRouteBodyAdmissionDuringWindow === true
    && packet?.runBounds?.mountedProductionBodyAdmissionAuthorized === false
    && packet?.runBounds?.productionUploadActivationAuthorized === false
    && packet?.runBounds?.cadUploadActivationAuthorized === false
    && packet?.runBounds?.cadConversionAuthorized === false
    && packet?.runBounds?.sandboxDispatchAuthorized === false
    && packet?.runBounds?.storeMutationAuthorized === false
    && packet?.runBounds?.privateCadAuthorized === false
    && packet?.runBounds?.realUsersAuthorized === false;

  const evidenceDestinationValid = packet?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-admission-development-body-admission-1630z'
    && packet?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet?.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet?.sanitizedEvidenceDestination?.fileMode === '600'
    && packet?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && packet?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && packet?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    executorAccepted,
    bodyPacketAccepted,
    windowValid,
    boundsValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForAutopilotDevelopmentBodyAdmissionRun: structureValid
      && executorAccepted
      && bodyPacketAccepted
      && windowValid
      && boundsValid
      && evidenceDestinationValid
      && authoritiesClosed,
    liveDevelopmentRunAuthorizedByThisPacket: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentBodyAdmissionWindow };
