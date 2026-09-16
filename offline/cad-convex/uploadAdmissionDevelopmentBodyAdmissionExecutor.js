const { inspectUploadAdmissionDevelopmentBodyAdmissionPacket } =
  require('./uploadAdmissionDevelopmentBodyAdmissionPacket');

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionDevelopmentBodyAdmissionExecutor(
  executor,
  packet,
  activationCloseout,
  qualificationCloseout,
) {
  const packetInspection = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(
    packet,
    activationCloseout,
    qualificationCloseout,
  );
  const structureValid = executor?.schemaVersion === 1
    && executor?.mode === 'source-only-cad-upload-admission-development-body-admission-executor'
    && executor?.status === 'DEVELOPMENT_BODY_ADMISSION_EXECUTOR_READY_SOURCE_ONLY'
    && executor?.sourceOnly === true
    && executor?.liveRunAuthorizedByThisPacket === false
    && executor?.acceptedWindow === null;
  const bindingsValid = executor?.sourceBindings?.bodyAdmissionPacket
      === 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json'
    && executor?.sourceBindings?.bodyAdmissionPacketInspector
      === 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.js'
    && executor?.sourceBindings?.routeGate === 'server/cadUserUploadRouter.js#BODY_ADMISSION_AUTHORIZED'
    && executor?.sourceBindings?.routeSource === 'server/cadUserUploadRouter.js'
    && executor?.sourceBindings?.admissionValidator === 'server/cadUserUploadAdmission.js'
    && executor?.sourceBindings?.runnerCli
      === 'scripts/run-cad-upload-admission-development-body-admission-executor.js';
  const packetReady = packetInspection.readyForExecutorSourceSlice === true
    && executor?.acceptedInputs?.activationPreviewEvidenceSha256
      === packet?.acceptedInputs?.activationPreviewEvidenceSha256
    && executor?.acceptedInputs?.activationPreviewReceiptSha256
      === packet?.acceptedInputs?.activationPreviewReceiptSha256
    && executor?.acceptedInputs?.qualificationEvidenceSha256
      === packet?.acceptedInputs?.qualificationEvidenceSha256
    && executor?.acceptedInputs?.publicFixtureSha256 === packet?.acceptedInputs?.publicFixtureSha256
    && executor?.acceptedInputs?.publicFixtureBytes === packet?.acceptedInputs?.publicFixtureBytes;
  const capabilitiesValid = executor?.executorCapabilities?.usesIsolatedVmRouteCopy === true
    && executor?.executorCapabilities?.mountedProductionRouteModified === false
    && executor?.executorCapabilities?.replacesLiteralOnlyInIsolatedCopy === true
    && executor?.executorCapabilities?.mountedPreAndPostDisabledChecks === true
    && executor?.executorCapabilities?.validatesPublicFixturePayload === true
    && executor?.executorCapabilities?.writesSanitizedEvidenceForAcceptedWindow === true
    && executor?.executorCapabilities?.bodyReadAllowedOnlyInIsolatedRouteCopyWhenWindowAccepted === true
    && executor?.executorCapabilities?.bodyReadAuthorizedByThisPacket === false
    && executor?.executorCapabilities?.productionBodyAdmissionAuthorized === false
    && executor?.executorCapabilities?.cadUploadActivationAuthorized === false
    && executor?.executorCapabilities?.cadConversionAuthorized === false
    && executor?.executorCapabilities?.sandboxDispatchAuthorized === false
    && executor?.executorCapabilities?.storeMutationAuthorized === false;
  const prerequisitesValid = executor?.runPrerequisites?.developmentOnly === true
    && executor?.runPrerequisites?.exactFutureWindowRequired === true
    && executor?.runPrerequisites?.acceptedWindowDefault === null
    && executor?.runPrerequisites?.windowMustBeFutureAtExecution === true
    && executor?.runPrerequisites?.maxAttempts === 1
    && executor?.runPrerequisites?.automaticRetry === false
    && executor?.runPrerequisites?.secondRun === false
    && executor?.runPrerequisites?.stopOnUnknownOutcome === true
    && executor?.runPrerequisites?.deleteRetainedState === false
    && executor?.runPrerequisites?.maxAllInCostUsd === 50
    && executor?.runPrerequisites?.privateCadAllowed === false
    && executor?.runPrerequisites?.realUsersAllowed === false;
  const evidenceValid = executor?.sanitizedEvidenceRequirements?.rootTemplate
      === '.local/cad-convex/upload-admission-development-body-admission-[window-ref]'
    && executor?.sanitizedEvidenceRequirements?.gitIgnoredRequired === true
    && executor?.sanitizedEvidenceRequirements?.directoryMode === '700'
    && executor?.sanitizedEvidenceRequirements?.fileMode === '600'
    && executor?.sanitizedEvidenceRequirements?.recordsContentBase64 === false
    && executor?.sanitizedEvidenceRequirements?.recordsRawCredential === false
    && executor?.sanitizedEvidenceRequirements?.recordsPrivateCad === false;
  const expectedResultValid = executor?.expectedFutureResult?.decision
      === 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED'
    && executor?.expectedFutureResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && executor?.expectedFutureResult?.runCompleted === true
    && executor?.expectedFutureResult?.unknownOutcome === false
    && executor?.expectedFutureResult?.mountedRouteDisabledChecks === 2
    && executor?.expectedFutureResult?.isolatedRouteBodyValidationChecks === 1
    && executor?.expectedFutureResult?.conversionDispatches === 0
    && executor?.expectedFutureResult?.sandboxDispatches === 0
    && executor?.expectedFutureResult?.storeMutations === 0
    && executor?.expectedFutureResult?.recordsContentBase64 === false
    && executor?.expectedFutureResult?.recordsRawCredential === false
    && executor?.expectedFutureResult?.recordsPrivateCad === false;
  const authoritiesClosed = allFalse(executor?.authorityPreserved);
  const readyForSourceMerge = structureValid
    && bindingsValid
    && packetReady
    && capabilitiesValid
    && prerequisitesValid
    && evidenceValid
    && expectedResultValid
    && authoritiesClosed;
  return {
    structureValid,
    bindingsValid,
    packetReady,
    capabilitiesValid,
    prerequisitesValid,
    evidenceValid,
    expectedResultValid,
    authoritiesClosed,
    readyForSourceMerge,
    readyForLiveRun: false,
    liveRunAuthorizedByThisPacket: false,
    productionUploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentBodyAdmissionExecutor };
