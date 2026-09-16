function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-development-body-admission-packet'
    && packet?.status === 'DEVELOPMENT_BODY_ADMISSION_PACKET_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.liveRunAuthorizedByThisPacket === false;
  const activationCloseoutAccepted = activationCloseout?.status === 'DEVELOPMENT_UPLOAD_ACTIVATION_PREVIEW_CLOSEOUT_ACCEPTED_SOURCE_ONLY'
    && activationCloseout?.activationPreviewCompleted === true
    && activationCloseout?.result?.unknownOutcome === false
    && activationCloseout?.evidence?.sanitizedEvidenceSha256 === packet?.acceptedInputs?.activationPreviewEvidenceSha256
    && activationCloseout?.evidence?.sanitizedReceiptSha256 === packet?.acceptedInputs?.activationPreviewReceiptSha256;
  const qualificationCloseoutAccepted = qualificationCloseout?.status === 'UPLOAD_ADMISSION_QUALIFICATION_CLOSEOUT_ACCEPTED_SOURCE_ONLY'
    && qualificationCloseout?.runCompleted === true
    && qualificationCloseout?.result?.unknownOutcome === false
    && qualificationCloseout?.evidence?.sanitizedEvidenceSha256 === packet?.acceptedInputs?.qualificationEvidenceSha256;
  const isolationValid = packet?.routeIsolation?.mountedRouteLiteralMustRemain === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.routeIsolation?.mountedProductionRouteModified === false
    && packet?.routeIsolation?.executorMayUseIsolatedVmRouteCopy === true
    && packet?.routeIsolation?.executorMayReplaceLiteralOnlyInIsolatedCopy === true
    && packet?.routeIsolation?.executorMayModifyTrackedRoute === false
    && packet?.routeIsolation?.executorMustPreSmokeMountedRouteBeforeBodyRead === true
    && packet?.routeIsolation?.executorMustPostSmokeMountedRouteAfterBodyRead === true;
  const boundsValid = packet?.boundedRunCriteria?.futureExactWindowRequired === true
    && packet?.boundedRunCriteria?.maxAttempts === 1
    && packet?.boundedRunCriteria?.automaticRetry === false
    && packet?.boundedRunCriteria?.secondRun === false
    && packet?.boundedRunCriteria?.stopOnUnknownOutcome === true
    && packet?.boundedRunCriteria?.developmentOnly === true
    && packet?.boundedRunCriteria?.privateCadAllowed === false
    && packet?.boundedRunCriteria?.realUsersAllowed === false
    && packet?.boundedRunCriteria?.allInPlanningCapUsd === 50
    && packet?.boundedRunCriteria?.bodyReadAllowedOnlyInIsolatedRouteCopy === true
    && packet?.boundedRunCriteria?.mountedProductionBodyReadAllowed === false
    && packet?.boundedRunCriteria?.cadConversionAuthorized === false
    && packet?.boundedRunCriteria?.sandboxDispatchAuthorized === false
    && packet?.boundedRunCriteria?.storeMutationAuthorized === false;
  const evidenceValid = packet?.evidenceRequirements?.rootTemplate === '.local/cad-convex/upload-admission-development-body-admission-[window-ref]'
    && packet?.evidenceRequirements?.gitIgnoredRequired === true
    && packet?.evidenceRequirements?.directoryMode === '700'
    && packet?.evidenceRequirements?.fileMode === '600'
    && packet?.evidenceRequirements?.mustNotRecordContentBase64 === true
    && packet?.evidenceRequirements?.mustNotRecordRawCredential === true
    && packet?.evidenceRequirements?.mustNotRecordPrivateCad === true;
  const rollbackValid = packet?.rollbackAndReconciliation?.rollbackTarget === 'USER_UPLOADS_DISABLED'
    && packet?.rollbackAndReconciliation?.closeAdmissionBeforeDrain === true
    && packet?.rollbackAndReconciliation?.deleteRetainedState === false
    && packet?.rollbackAndReconciliation?.unknownReservationsRemainLocked === true
    && packet?.rollbackAndReconciliation?.boundedReadOnlyReconciliationOnly === true
    && packet?.rollbackAndReconciliation?.postRollbackSmokeRequired === true;
  const authoritiesClosed = allFalse(packet?.authorityPreserved);
  return {
    structureValid,
    activationCloseoutAccepted,
    qualificationCloseoutAccepted,
    isolationValid,
    boundsValid,
    evidenceValid,
    rollbackValid,
    authoritiesClosed,
    readyForExecutorSourceSlice: structureValid
      && activationCloseoutAccepted
      && qualificationCloseoutAccepted
      && isolationValid
      && boundsValid
      && evidenceValid
      && rollbackValid
      && authoritiesClosed,
    liveRunAuthorizedByThisPacket: false
  };
}

module.exports = { inspectUploadAdmissionDevelopmentBodyAdmissionPacket };
