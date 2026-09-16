function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationRunnerRebind(rebind, rollover, refresh, closeout) {
  const structureValid = rebind?.schemaVersion === 1
    && rebind?.mode === 'source-only-cad-upload-admission-activation-runner-rebind'
    && rebind?.status === 'UPLOAD_ACTIVATION_RUNNER_REBIND_READY_SOURCE_ONLY'
    && rebind?.sourceOnly === true
    && rebind?.production === false
    && rebind?.baseMainCommit === '11f45049f1ce138c887482d5d68d25d9642e7284'
    && rebind?.branch === 'codex/cad-upload-activation-runner-rebind-2230z'
    && rebind?.target?.developmentDeployment === 'majestic-alligator-31';

  const rolloverWindowBound = rollover?.status === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_READY_SOURCE_ONLY'
    && rollover?.acceptedWindow?.runRef === rebind?.acceptedWindow?.runRef
    && rollover?.acceptedWindow?.startUtc === rebind?.acceptedWindow?.startUtc
    && rollover?.acceptedWindow?.expiresUtc === rebind?.acceptedWindow?.expiresUtc
    && rollover?.sanitizedEvidenceDestination?.root === rebind?.sanitizedEvidenceDestination?.root
    && rollover?.runnerDisposition?.sourceOnlyRunnerRebindRequiredBeforeLiveRun === true
    && rollover?.acceptedDecisionRefresh?.decisionRefreshMergeCommit
      === rebind?.acceptedDecisionRefresh?.decisionRefreshMergeCommit
    && rebind?.acceptedRollover?.rolloverMergeCommit
      === '11f45049f1ce138c887482d5d68d25d9642e7284';

  const refreshBound = refresh?.status === 'UPLOAD_ACTIVATION_DECISION_REFRESH_PREPARED_SOURCE_ONLY'
    && refresh?.acceptedMountedDevelopmentCloseout?.evidenceSha256
      === rebind?.acceptedDecisionRefresh?.mountedCloseoutEvidenceSha256
    && refresh?.acceptedMountedDevelopmentCloseout?.receiptSha256
      === rebind?.acceptedDecisionRefresh?.mountedCloseoutReceiptSha256
    && refresh?.futureRunBounds?.maxAllInCostUsd === rebind?.runBounds?.allInPlanningCapUsd;

  const closeoutBound = closeout?.runResult?.decision === 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED'
    && closeout?.runResult?.runCompleted === true
    && closeout?.runResult?.unknownOutcome === false
    && closeout?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.sanitizedRunEvidence?.evidenceSha256
      === rebind?.acceptedDecisionRefresh?.mountedCloseoutEvidenceSha256
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === rebind?.acceptedDecisionRefresh?.mountedCloseoutReceiptSha256;

  const runnerValid = rebind?.runner?.cli === 'scripts/run-cad-upload-activation-exact-window.js'
    && rebind?.runner?.reusesReviewedMountedHarness === true
    && rebind?.runner?.compatibilityConfigInMemoryOnly === true
    && rebind?.runner?.trackedRouteModified === false
    && rebind?.runner?.writesOwnActivationReceipt === true
    && rebind?.runner?.requiresWindowOpen === true
    && rebind?.runner?.preFlightDisabledCheckRequired === true
    && rebind?.runner?.postRunDisabledCheckRequired === true;

  const boundsValid = rebind?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && rebind?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && rebind?.runBounds?.maxAttempts === 1
    && rebind?.runBounds?.automaticRetry === false
    && rebind?.runBounds?.secondRun === false
    && rebind?.runBounds?.stopOnUnknownOutcome === true
    && rebind?.runBounds?.deleteRetainedState === false
    && rebind?.runBounds?.allInPlanningCapUsd === 50
    && rebind?.runBounds?.publicSyntheticFixtureOnly === true
    && rebind?.runBounds?.productionUploadActivationAuthorized === false
    && rebind?.runBounds?.productionBodyAdmissionAuthorized === false
    && rebind?.runBounds?.cadConversionAuthorized === false
    && rebind?.runBounds?.sandboxDispatchAuthorized === false
    && rebind?.runBounds?.privateCadAuthorized === false
    && rebind?.runBounds?.realUsersAuthorized === false;

  const expectedResultValid = rebind?.expectedFutureResult?.decision === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED'
    && rebind?.expectedFutureResult?.runCompleted === true
    && rebind?.expectedFutureResult?.unknownOutcome === false
    && rebind?.expectedFutureResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && rebind?.expectedFutureResult?.mountedRouteDisabledChecks === 2
    && rebind?.expectedFutureResult?.mountedDevelopmentBodyValidationChecks === 1
    && rebind?.expectedFutureResult?.conversionDispatches === 0
    && rebind?.expectedFutureResult?.sandboxDispatches === 0
    && rebind?.expectedFutureResult?.storeMutations === 0;

  const evidenceDestinationValid = rebind?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-activation-window-rollover-2230z'
    && rebind?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && rebind?.sanitizedEvidenceDestination?.directoryMode === '700'
    && rebind?.sanitizedEvidenceDestination?.fileMode === '600'
    && rebind?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && rebind?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && rebind?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(rebind?.authorityPreservedByThisPacket);

  return {
    structureValid,
    rolloverWindowBound,
    refreshBound,
    closeoutBound,
    runnerValid,
    boundsValid,
    expectedResultValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForWindowExecution: structureValid
      && rolloverWindowBound
      && refreshBound
      && closeoutBound
      && runnerValid
      && boundsValid
      && expectedResultValid
      && evidenceDestinationValid
      && authoritiesClosed,
    liveRunAuthorizedByThisPacket: false,
  };
}

module.exports = { inspectUploadAdmissionActivationRunnerRebind };
