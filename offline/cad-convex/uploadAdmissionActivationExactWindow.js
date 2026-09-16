function isUtcTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationExactWindow(packet, refresh, closeout) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-activation-exact-window'
    && packet?.status === 'UPLOAD_ACTIVATION_EXACT_WINDOW_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === 'fbd8628efc52d9ec0df55f106c1b5ce0c6487cd5'
    && packet?.branch === 'codex/cad-upload-activation-exact-window'
    && packet?.target?.developmentDeployment === 'majestic-alligator-31';

  const refreshBound = refresh?.status === 'UPLOAD_ACTIVATION_DECISION_REFRESH_PREPARED_SOURCE_ONLY'
    && refresh?.acceptedMountedDevelopmentCloseout?.mergedMainCommit
      === packet?.acceptedDecisionRefresh?.mountedCloseoutMergeCommit
    && refresh?.acceptedMountedDevelopmentCloseout?.evidenceSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutEvidenceSha256
    && refresh?.acceptedMountedDevelopmentCloseout?.receiptSha256
      === packet?.acceptedDecisionRefresh?.mountedCloseoutReceiptSha256
    && refresh?.futureRunBounds?.developmentOnly === true
    && refresh?.futureRunBounds?.maxAllInCostUsd === packet?.runBounds?.allInPlanningCapUsd
    && refresh?.decision?.requiresExactUtcWindowBeforeRun === true;

  const closeoutBound = closeout?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_ADMISSION_COMPLETED_SOURCE_CLOSEOUT'
    && closeout?.runResult?.decision === packet?.acceptedMountedDevelopmentCloseout?.decision
    && closeout?.runResult?.runCompleted === true
    && closeout?.runResult?.unknownOutcome === false
    && closeout?.sanitizedRunEvidence?.evidenceSha256
      === packet?.acceptedMountedDevelopmentCloseout?.evidenceSha256
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === packet?.acceptedMountedDevelopmentCloseout?.receiptSha256
    && closeout?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED';

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

  const runnerDispositionValid = packet?.runnerDisposition?.existingMountedRunnerBoundToExpiredWindow === true
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
    && packet?.runBounds?.developmentUploadActivationAuthorizedNow === false
    && packet?.runBounds?.productionUploadActivationAuthorized === false
    && packet?.runBounds?.productionBodyAdmissionAuthorized === false
    && packet?.runBounds?.cadConversionAuthorized === false
    && packet?.runBounds?.sandboxDispatchAuthorized === false
    && packet?.runBounds?.privateCadAuthorized === false
    && packet?.runBounds?.realUsersAuthorized === false;

  const evidenceDestinationValid = packet?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-activation-exact-window-2030z'
    && packet?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet?.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet?.sanitizedEvidenceDestination?.fileMode === '600'
    && packet?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && packet?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && packet?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    refreshBound,
    closeoutBound,
    windowValid,
    routeGateValid,
    runnerDispositionValid,
    boundsValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForSourceOnlyRunnerRebind: structureValid
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

module.exports = { inspectUploadAdmissionActivationExactWindow };
