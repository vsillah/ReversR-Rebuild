function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadConversionSandboxAuthCorrection(packet) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-conversion-sandbox-auth-correction'
    && packet?.status === 'SANDBOX_AUTH_PATH_CORRECTED_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === '186acb47920b45832d116b60c3f6d40df533217f'
    && packet?.branch === 'codex/cad-upload-conversion-sandbox-auth-correction';

  const stoppedRunBound = packet?.stoppedRun?.runRef
      === 'rrb-ref:cad-upload-conversion-sandbox-qualification-0148z'
    && packet?.stoppedRun?.decision === 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_STOPPED'
    && packet?.stoppedRun?.runCompleted === false
    && packet?.stoppedRun?.unknownOutcome === true
    && packet?.stoppedRun?.automaticRetry === false
    && packet?.stoppedRun?.secondRun === false
    && packet?.stoppedRun?.sandboxCreatedStageObserved === false
    && packet?.stoppedRun?.retryAuthorized === false;

  const reconciliationValid = packet?.readOnlyReconciliation?.vercelDashboardInspected === true
    && packet?.readOnlyReconciliation?.vercelSandboxCliListSucceeded === true
    && packet?.readOnlyReconciliation?.sdkInferredCredentialListSucceeded === true
    && packet?.readOnlyReconciliation?.newSandboxSessionObserved === false
    && packet?.readOnlyReconciliation?.allListedSessionsStopped === true
    && packet?.readOnlyReconciliation?.storeMutationObserved === false
    && packet?.readOnlyReconciliation?.providerMutationObserved === false
    && packet?.readOnlyReconciliation?.conclusion === 'NO_SANDBOX_CREATION_OBSERVED';

  const correctionValid = packet?.correction?.rawCliTokenReadByRunner === false
    && packet?.correction?.rawCliTokenForwardedToSdk === false
    && packet?.correction?.sdkCredentialMode === 'linked-project-inferred-and-refreshable'
    && packet?.correction?.linkedProjectMetadataRequired === true
    && packet?.correction?.authorizationPreflightReadOnly === true
    && packet?.correction?.authorizationPreflightTimeoutMs === 10000
    && packet?.correction?.authorizationPreflightBeforeDispatch === true
    && packet?.correction?.preDispatchAuthorizationFailureCode
      === 'SANDBOX_AUTHORIZATION_FAILED'
    && packet?.correction?.preDispatchAuthorizationFailureUnknownOutcome === false
    && packet?.correction?.preDispatchAuthorizationFailureCleanupBlocked === false
    && packet?.correction?.providerErrorDetailsRecorded === false;

  const freshRunBoundsValid = packet?.futureFreshRunRequirements?.freshRunRefRequired === true
    && packet?.futureFreshRunRequirements?.freshEvidenceRootRequired === true
    && packet?.futureFreshRunRequirements?.freshUtcWindowRequired === true
    && packet?.futureFreshRunRequirements?.publicCubeOnly === true
    && packet?.futureFreshRunRequirements?.maxAttempts === 1
    && packet?.futureFreshRunRequirements?.automaticRetry === false
    && packet?.futureFreshRunRequirements?.secondRun === false
    && packet?.futureFreshRunRequirements?.stopOnUnknownOutcome === true
    && packet?.futureFreshRunRequirements?.allInPlanningCapUsd === 50
    && packet?.futureFreshRunRequirements?.productionUploadActivationAllowed === false
    && packet?.futureFreshRunRequirements?.privateCadAllowed === false
    && packet?.futureFreshRunRequirements?.realUsersAllowed === false
    && packet?.futureFreshRunRequirements?.storeMutationsAllowed === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    stoppedRunBound,
    reconciliationValid,
    correctionValid,
    freshRunBoundsValid,
    authoritiesClosed,
    readyForSourcePublication: structureValid
      && stoppedRunBound
      && reconciliationValid
      && correctionValid
      && freshRunBoundsValid
      && authoritiesClosed,
    freshLiveRunAuthorizedByThisPacket: false,
    stoppedRunRetryAuthorized: false,
  };
}

module.exports = { inspectUploadConversionSandboxAuthCorrection };
