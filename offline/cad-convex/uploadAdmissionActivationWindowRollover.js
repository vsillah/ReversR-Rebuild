function isUtcTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationWindowRollover(
  packet,
  previousWindow,
  previousRebind,
  refresh,
  closeout,
) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-activation-window-rollover'
    && packet?.status === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === '8ed710f63574a1ef40df25beb5d6fb80c58f22c1'
    && packet?.branch === 'codex/cad-upload-activation-window-rollover-2230z'
    && packet?.target?.developmentDeployment === 'majestic-alligator-31';

  const priorWindowBound = previousWindow?.status === 'UPLOAD_ACTIVATION_EXACT_WINDOW_READY_SOURCE_ONLY'
    && previousWindow?.acceptedWindow?.runRef === packet?.missedWindow?.runRef
    && previousWindow?.acceptedWindow?.startUtc === packet?.missedWindow?.startUtc
    && previousWindow?.acceptedWindow?.expiresUtc === packet?.missedWindow?.expiresUtc
    && previousRebind?.status === 'UPLOAD_ACTIVATION_RUNNER_REBIND_READY_SOURCE_ONLY'
    && previousRebind?.acceptedWindow?.runRef === packet?.missedWindow?.runRef
    && packet?.missedWindow?.executionObserved === false
    && packet?.missedWindow?.evidenceObserved === false
    && packet?.missedWindow?.unknownOutcome === false
    && packet?.missedWindow?.retryAuthorized === false
    && packet?.missedWindow?.newRunRefRequired === true;

  const refreshBound = refresh?.status === 'UPLOAD_ACTIVATION_DECISION_REFRESH_PREPARED_SOURCE_ONLY'
    && refresh?.acceptedMountedDevelopmentCloseout?.evidenceSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutEvidenceSha256
    && refresh?.acceptedMountedDevelopmentCloseout?.receiptSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutReceiptSha256
    && refresh?.futureRunBounds?.maxAllInCostUsd === packet?.runBounds?.allInPlanningCapUsd;

  const closeoutBound = closeout?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_ADMISSION_COMPLETED_SOURCE_CLOSEOUT'
    && closeout?.runResult?.decision === 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED'
    && closeout?.runResult?.runCompleted === true
    && closeout?.runResult?.unknownOutcome === false
    && closeout?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.sanitizedRunEvidence?.evidenceSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutEvidenceSha256
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutReceiptSha256;

  const start = packet?.acceptedWindow?.startUtc;
  const expires = packet?.acceptedWindow?.expiresUtc;
  const observed = packet?.observedAtUtc;
  const windowValid = isUtcTimestamp(observed)
    && isUtcTimestamp(start)
    && isUtcTimestamp(expires)
    && Date.parse(observed) < Date.parse(start)
    && Date.parse(start) < Date.parse(expires)
    && packet?.acceptedWindow?.maxRunSeconds === 900
    && packet?.acceptedWindow?.scheduleIfMoreThanFiveMinutesAway === true
    && packet?.acceptedWindow?.evidenceRoot === packet?.sanitizedEvidenceDestination?.root;

  const routeGateValid = packet?.routeGate?.route === 'POST /api/cad/user-import'
    && packet?.routeGate?.source === 'server/cadUserUploadRouter.js'
    && packet?.routeGate?.requiredDisabledLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.routeGate?.checkedInRouteMustRemainDisabled === true
    && packet?.routeGate?.sourcePacketMayFlipLiteral === false
    && packet?.routeGate?.preFlightDisabledCheckRequired === true
    && packet?.routeGate?.postRunDisabledOrRollbackCheckRequired === true;

  const runnerDispositionValid = packet?.runnerDisposition?.priorRunnerBoundToMissedWindow === true
    && packet?.runnerDisposition?.sourceOnlyRunnerRebindRequiredBeforeLiveRun === true
    && packet?.runnerDisposition?.liveRunAuthorizedByThisPacket === false
    && packet?.runnerDisposition?.automaticRetryAuthorized === false
    && packet?.runnerDisposition?.secondRunAuthorized === false;

  const boundsValid = packet?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && packet?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && packet?.runBounds?.maxAttempts === 1
    && packet?.runBounds?.automaticRetry === false
    && packet?.runBounds?.secondRun === false
    && packet?.runBounds?.stopOnUnknownOutcome === true
    && packet?.runBounds?.deleteRetainedState === false
    && packet?.runBounds?.allInPlanningCapUsd === 50
    && packet?.runBounds?.publicSyntheticFixtureOnly === true
    && packet?.runBounds?.productionUploadActivationAuthorized === false
    && packet?.runBounds?.cadConversionAuthorized === false
    && packet?.runBounds?.sandboxDispatchAuthorized === false
    && packet?.runBounds?.privateCadAuthorized === false
    && packet?.runBounds?.realUsersAuthorized === false;

  const evidenceDestinationValid = packet?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-activation-window-rollover-2230z'
    && packet?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet?.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet?.sanitizedEvidenceDestination?.fileMode === '600'
    && packet?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && packet?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && packet?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    priorWindowBound,
    refreshBound,
    closeoutBound,
    windowValid,
    routeGateValid,
    runnerDispositionValid,
    boundsValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForSourceOnlyRunnerRebind: structureValid
      && priorWindowBound
      && refreshBound
      && closeoutBound
      && windowValid
      && routeGateValid
      && runnerDispositionValid
      && boundsValid
      && evidenceDestinationValid
      && authoritiesClosed,
    liveDevelopmentRunAuthorizedByThisPacket: false,
  };
}

module.exports = { inspectUploadAdmissionActivationWindowRollover };
