function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout) {
  const closeoutBound = bodyAdmissionCloseout?.status === 'DEVELOPMENT_BODY_ADMISSION_COMPLETED_SOURCE_CLOSEOUT'
    && bodyAdmissionCloseout?.sourcePr === packet?.acceptedBodyAdmissionCloseout?.sourcePr
    && bodyAdmissionCloseout?.mergedMainCommit === packet?.acceptedBodyAdmissionCloseout?.mergedMainCommit
    && bodyAdmissionCloseout?.sanitizedRunEvidence?.evidenceSha256
      === packet?.acceptedBodyAdmissionCloseout?.evidenceSha256
    && bodyAdmissionCloseout?.sanitizedRunEvidence?.receiptSha256
      === packet?.acceptedBodyAdmissionCloseout?.receiptSha256
    && bodyAdmissionCloseout?.runResult?.decision === 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED'
    && bodyAdmissionCloseout?.runResult?.runCompleted === true
    && bodyAdmissionCloseout?.runResult?.unknownOutcome === false
    && bodyAdmissionCloseout?.operationCounts?.uploadBodiesRead === 1
    && bodyAdmissionCloseout?.operationCounts?.conversionDispatches === 0
    && bodyAdmissionCloseout?.operationCounts?.sandboxDispatches === 0
    && bodyAdmissionCloseout?.operationCounts?.storeMutations === 0;

  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-mounted-development-readiness'
    && packet?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_READINESS_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.developmentDeployment === 'majestic-alligator-31'
    && packet?.baseMainCommit === '0b30989c0458763aa20fa6609430e07e5bedeb60'
    && closeoutBound;

  const routeGateValid = packet?.mountedRouteGate?.route === 'POST /api/cad/user-import'
    && packet?.mountedRouteGate?.source === 'server/cadUserUploadRouter.js'
    && packet?.mountedRouteGate?.requiredDisabledLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.mountedRouteGate?.mountedRouteCurrentlyDisabled === true
    && packet?.mountedRouteGate?.sourcePacketMayFlipLiteral === false
    && packet?.mountedRouteGate?.futureRunRequiresSeparateExactWindow === true
    && packet?.mountedRouteGate?.preFlightDisabledCheckRequired === true
    && packet?.mountedRouteGate?.postRunDisabledOrRollbackCheckRequired === true;

  const readinessValid = packet?.readinessForFutureMountedDevelopmentRun?.usesAcceptedIsolatedBodyAdmissionCloseout === true
    && packet?.readinessForFutureMountedDevelopmentRun?.requiresNewExactUtcWindowPacket === true
    && packet?.readinessForFutureMountedDevelopmentRun?.requiresLiveRunApproval === true
    && packet?.readinessForFutureMountedDevelopmentRun?.developmentOnly === true
    && packet?.readinessForFutureMountedDevelopmentRun?.maxAttempts === 1
    && packet?.readinessForFutureMountedDevelopmentRun?.automaticRetry === false
    && packet?.readinessForFutureMountedDevelopmentRun?.secondRun === false
    && packet?.readinessForFutureMountedDevelopmentRun?.stopOnUnknownOutcome === true
    && packet?.readinessForFutureMountedDevelopmentRun?.allInPlanningCapUsd === 50
    && packet?.readinessForFutureMountedDevelopmentRun?.publicSyntheticFixtureOnly === true
    && packet?.readinessForFutureMountedDevelopmentRun?.privateCadAllowed === false
    && packet?.readinessForFutureMountedDevelopmentRun?.realUsersAllowed === false
    && packet?.readinessForFutureMountedDevelopmentRun?.cadConversionAuthorized === false
    && packet?.readinessForFutureMountedDevelopmentRun?.sandboxDispatchAuthorized === false;

  const evidenceValid = packet?.evidenceRequirements?.rootTemplate
      === '.local/cad-convex/upload-admission-mounted-development-[window-ref]'
    && packet?.evidenceRequirements?.gitIgnoredRequired === true
    && packet?.evidenceRequirements?.directoryMode === '700'
    && packet?.evidenceRequirements?.fileMode === '600'
    && packet?.evidenceRequirements?.mustNotRecordContentBase64 === true
    && packet?.evidenceRequirements?.mustNotRecordRawCredential === true
    && packet?.evidenceRequirements?.mustNotRecordPrivateCad === true
    && packet?.evidenceRequirements?.mustRecordRouteGatePrePost === true
    && packet?.evidenceRequirements?.mustRecordOperationCounts === true;

  const rollbackValid = packet?.rollbackAndReconciliation?.rollbackTarget === 'USER_UPLOADS_DISABLED'
    && packet?.rollbackAndReconciliation?.deleteRetainedState === false
    && packet?.rollbackAndReconciliation?.unknownReservationsRemainLocked === true
    && packet?.rollbackAndReconciliation?.boundedReadOnlyReconciliationOnly === true
    && packet?.rollbackAndReconciliation?.postRollbackSmokeRequired === true;

  const authoritiesClosed = allFalse(packet?.authorityPreserved);

  return {
    structureValid,
    closeoutBound,
    routeGateValid,
    readinessValid,
    evidenceValid,
    rollbackValid,
    authoritiesClosed,
    readyForExactWindowSourcePacket: structureValid
      && closeoutBound
      && routeGateValid
      && readinessValid
      && evidenceValid
      && rollbackValid
      && authoritiesClosed,
    liveRunAuthorizedByThisPacket: false,
    uploadActivationAuthorizedByThisPacket: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionMountedDevelopmentReadiness };
