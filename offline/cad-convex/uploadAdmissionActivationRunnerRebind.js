function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationRunnerRebind(rebind, exactWindow, refresh, closeout) {
  const structureValid = rebind?.schemaVersion === 1
    && rebind?.mode === 'source-only-cad-upload-admission-activation-runner-rebind'
    && rebind?.status === 'UPLOAD_ACTIVATION_RUNNER_REBIND_READY_SOURCE_ONLY'
    && rebind?.sourceOnly === true
    && rebind?.production === false
    && rebind?.baseMainCommit === 'f848b56449c6e192cf3ea57ed8119776eba73481'
    && rebind?.branch === 'codex/cad-upload-activation-runner-rebind'
    && rebind?.target?.developmentDeployment === 'majestic-alligator-31';

  const exactWindowBound = exactWindow?.status === 'UPLOAD_ACTIVATION_EXACT_WINDOW_READY_SOURCE_ONLY'
    && exactWindow?.acceptedWindow?.runRef === rebind?.acceptedWindow?.runRef
    && exactWindow?.acceptedWindow?.startUtc === rebind?.acceptedWindow?.startUtc
    && exactWindow?.acceptedWindow?.expiresUtc === rebind?.acceptedWindow?.expiresUtc
    && exactWindow?.sanitizedEvidenceDestination?.root === rebind?.sanitizedEvidenceDestination?.root
    && exactWindow?.runnerDisposition?.sourceOnlyRunnerRebindRequiredBeforeLiveRun === true
    && exactWindow?.acceptedDecisionRefresh?.decisionRefreshMergeCommit
      === rebind?.acceptedDecisionRefresh?.decisionRefreshMergeCommit
    && rebind?.acceptedExactWindow?.exactWindowMergeCommit
      === 'f848b56449c6e192cf3ea57ed8119776eba73481';

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

  const expectedResultValid = rebind?.expectedFutureResult?.decision === 'UPLOAD_ACTIVATION_EXACT_WINDOW_EXECUTED'
    && rebind?.expectedFutureResult?.runCompleted === true
    && rebind?.expectedFutureResult?.unknownOutcome === false
    && rebind?.expectedFutureResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && rebind?.expectedFutureResult?.mountedRouteDisabledChecks === 2
    && rebind?.expectedFutureResult?.mountedDevelopmentBodyValidationChecks === 1
    && rebind?.expectedFutureResult?.conversionDispatches === 0
    && rebind?.expectedFutureResult?.sandboxDispatches === 0
    && rebind?.expectedFutureResult?.storeMutations === 0;

  const evidenceDestinationValid = rebind?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-activation-exact-window-2030z'
    && rebind?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && rebind?.sanitizedEvidenceDestination?.directoryMode === '700'
    && rebind?.sanitizedEvidenceDestination?.fileMode === '600'
    && rebind?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && rebind?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && rebind?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(rebind?.authorityPreservedByThisPacket);

  return {
    structureValid,
    exactWindowBound,
    refreshBound,
    closeoutBound,
    runnerValid,
    boundsValid,
    expectedResultValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForWindowExecution: structureValid
      && exactWindowBound
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
