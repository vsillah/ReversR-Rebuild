function isUtcTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionMountedDevelopmentWindow(packet, readiness) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-mounted-development-window'
    && packet?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_WINDOW_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === 'd89290c61511006c849954275602f21f57092457'
    && packet?.developmentDeployment === 'majestic-alligator-31';

  const readinessBound = readiness?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_READINESS_READY_SOURCE_ONLY'
    && readiness?.developmentDeployment === packet?.developmentDeployment
    && readiness?.acceptedBodyAdmissionCloseout?.evidenceSha256
      === packet?.acceptedReadiness?.bodyAdmissionEvidenceSha256
    && readiness?.acceptedBodyAdmissionCloseout?.receiptSha256
      === packet?.acceptedReadiness?.bodyAdmissionReceiptSha256
    && readiness?.readinessForFutureMountedDevelopmentRun?.allInPlanningCapUsd
      === packet?.runBounds?.allInPlanningCapUsd
    && readiness?.readinessForFutureMountedDevelopmentRun?.maxAttempts === packet?.runBounds?.maxAttempts
    && readiness?.readinessForFutureMountedDevelopmentRun?.automaticRetry === packet?.runBounds?.automaticRetry
    && readiness?.readinessForFutureMountedDevelopmentRun?.secondRun === packet?.runBounds?.secondRun
    && readiness?.mountedRouteGate?.requiredDisabledLiteral === packet?.routeGate?.requiredDisabledLiteral;

  const start = packet?.acceptedWindow?.startUtc;
  const expires = packet?.acceptedWindow?.expiresUtc;
  const windowValid = isUtcTimestamp(start)
    && isUtcTimestamp(expires)
    && Date.parse(start) < Date.parse(expires)
    && packet?.acceptedWindow?.maxRunSeconds === 900
    && packet?.acceptedWindow?.scheduleIfMoreThanFiveMinutesAway === true
    && packet?.acceptedWindow?.evidenceRoot === packet?.sanitizedEvidenceDestination?.root;

  const routeGateValid = packet?.routeGate?.route === 'POST /api/cad/user-import'
    && packet?.routeGate?.source === 'server/cadUserUploadRouter.js'
    && packet?.routeGate?.requiredDisabledLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.routeGate?.mountedRouteCurrentlyDisabled === true
    && packet?.routeGate?.sourcePacketMayFlipLiteral === false
    && packet?.routeGate?.preFlightDisabledCheckRequired === true
    && packet?.routeGate?.postRunDisabledOrRollbackCheckRequired === true;

  const boundsValid = packet?.runBounds?.developmentProject === 'reversr-cad-auth-dev'
    && packet?.runBounds?.developmentDeployment === 'majestic-alligator-31'
    && packet?.runBounds?.maxAttempts === 1
    && packet?.runBounds?.automaticRetry === false
    && packet?.runBounds?.secondRun === false
    && packet?.runBounds?.stopOnUnknownOutcome === true
    && packet?.runBounds?.deleteRetainedState === false
    && packet?.runBounds?.allInPlanningCapUsd === 50
    && packet?.runBounds?.publicSyntheticFixtureOnly === true
    && packet?.runBounds?.mountedDevelopmentUploadExecutionAuthorizedNow === false
    && packet?.runBounds?.productionUploadActivationAuthorized === false
    && packet?.runBounds?.productionBodyAdmissionAuthorized === false
    && packet?.runBounds?.cadConversionAuthorized === false
    && packet?.runBounds?.sandboxDispatchAuthorized === false
    && packet?.runBounds?.privateCadAuthorized === false
    && packet?.runBounds?.realUsersAuthorized === false;

  const evidenceDestinationValid = packet?.sanitizedEvidenceDestination?.root
      === '.local/cad-convex/upload-admission-mounted-development-1800z'
    && packet?.sanitizedEvidenceDestination?.gitIgnoredRequired === true
    && packet?.sanitizedEvidenceDestination?.directoryMode === '700'
    && packet?.sanitizedEvidenceDestination?.fileMode === '600'
    && packet?.sanitizedEvidenceDestination?.recordsContentBase64 === false
    && packet?.sanitizedEvidenceDestination?.recordsRawCredential === false
    && packet?.sanitizedEvidenceDestination?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    readinessBound,
    windowValid,
    routeGateValid,
    boundsValid,
    evidenceDestinationValid,
    authoritiesClosed,
    readyForAutopilotMountedDevelopmentWindow: structureValid
      && readinessBound
      && windowValid
      && routeGateValid
      && boundsValid
      && evidenceDestinationValid
      && authoritiesClosed,
    liveDevelopmentRunAuthorizedByThisPacket: false,
  };
}

module.exports = { inspectUploadAdmissionMountedDevelopmentWindow };
