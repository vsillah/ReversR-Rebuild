function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionMountedDevelopmentExecutorBridge(bridge, windowPacket, readiness) {
  const structureValid = bridge?.schemaVersion === 1
    && bridge?.mode === 'source-only-cad-upload-admission-mounted-development-executor-bridge'
    && bridge?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_EXECUTOR_BRIDGE_READY_SOURCE_ONLY'
    && bridge?.sourceOnly === true
    && bridge?.baseMainCommit === '816c773a128a3d44ba26ce54227fa45be1db8d1b';

  const windowBound = windowPacket?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_WINDOW_READY_SOURCE_ONLY'
    && windowPacket?.acceptedWindow?.runRef === bridge?.acceptedWindow?.runRef
    && windowPacket?.acceptedWindow?.startUtc === bridge?.acceptedWindow?.startUtc
    && windowPacket?.acceptedWindow?.expiresUtc === bridge?.acceptedWindow?.expiresUtc
    && windowPacket?.sanitizedEvidenceDestination?.root === bridge?.sanitizedEvidenceRequirements?.root
    && windowPacket?.routeGate?.requiredDisabledLiteral === bridge?.routeGate?.requiredDisabledLiteral
    && windowPacket?.runBounds?.maxAttempts === bridge?.runBounds?.maxAttempts
    && windowPacket?.runBounds?.automaticRetry === bridge?.runBounds?.automaticRetry
    && windowPacket?.runBounds?.secondRun === bridge?.runBounds?.secondRun;

  const readinessBound = readiness?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_READINESS_READY_SOURCE_ONLY'
    && readiness?.acceptedBodyAdmissionCloseout?.evidenceSha256
      === bridge?.acceptedReadiness?.bodyAdmissionEvidenceSha256
    && readiness?.acceptedBodyAdmissionCloseout?.receiptSha256
      === bridge?.acceptedReadiness?.bodyAdmissionReceiptSha256;

  const bridgeValid = bridge?.executorCapabilities?.mountsDevelopmentRouteHarness === true
    && bridge?.executorCapabilities?.usesReviewedRouterSource === true
    && bridge?.executorCapabilities?.sourceLiteralMayFlip === false
    && bridge?.executorCapabilities?.trackedRouteModified === false
    && bridge?.executorCapabilities?.preFlightDisabledCheckRequired === true
    && bridge?.executorCapabilities?.postRunDisabledCheckRequired === true
    && bridge?.executorCapabilities?.writesSanitizedEvidence === true
    && bridge?.executorCapabilities?.liveRunAuthorizedByThisPacket === false;

  const boundsValid = bridge?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && bridge?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && bridge?.runBounds?.maxAttempts === 1
    && bridge?.runBounds?.automaticRetry === false
    && bridge?.runBounds?.secondRun === false
    && bridge?.runBounds?.stopOnUnknownOutcome === true
    && bridge?.runBounds?.allInPlanningCapUsd === 50
    && bridge?.runBounds?.publicSyntheticFixtureOnly === true
    && bridge?.runBounds?.productionUploadActivationAuthorized === false
    && bridge?.runBounds?.cadConversionAuthorized === false
    && bridge?.runBounds?.sandboxDispatchAuthorized === false
    && bridge?.runBounds?.privateCadAuthorized === false
    && bridge?.runBounds?.realUsersAuthorized === false;

  const expectedResultValid = bridge?.expectedFutureResult?.decision
      === 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED'
    && bridge?.expectedFutureResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && bridge?.expectedFutureResult?.runCompleted === true
    && bridge?.expectedFutureResult?.unknownOutcome === false
    && bridge?.expectedFutureResult?.conversionDispatches === 0
    && bridge?.expectedFutureResult?.sandboxDispatches === 0
    && bridge?.expectedFutureResult?.storeMutations === 0;

  const authoritiesClosed = allFalse(bridge?.authorityPreservedByThisPacket);

  return {
    structureValid,
    windowBound,
    readinessBound,
    bridgeValid,
    boundsValid,
    expectedResultValid,
    authoritiesClosed,
    readyForMountedDevelopmentRun: structureValid
      && windowBound
      && readinessBound
      && bridgeValid
      && boundsValid
      && expectedResultValid
      && authoritiesClosed,
    liveRunAuthorizedByThisPacket: false,
  };
}

module.exports = { inspectUploadAdmissionMountedDevelopmentExecutorBridge };
