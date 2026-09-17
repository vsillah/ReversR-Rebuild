function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadConversionSandboxReadiness(packet, uploadCloseout) {
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-conversion-sandbox-readiness'
    && packet?.status === 'CONVERSION_SANDBOX_BRIDGE_READY_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.production === false
    && packet?.baseMainCommit === 'dcddbcf8b0a0d636749cacc9084c63b7c4f346e9'
    && packet?.branch === 'codex/cad-upload-conversion-sandbox-readiness';

  const uploadCloseoutBound = uploadCloseout?.status
      === 'UPLOAD_ACTIVATION_ROLLOVER_COMPLETED_SOURCE_CLOSEOUT'
    && uploadCloseout?.runResult?.runCompleted === true
    && uploadCloseout?.runResult?.unknownOutcome === false
    && uploadCloseout?.runResult?.bodyAdmissionValidated === true
    && uploadCloseout?.fixture?.sha256 === packet?.fixture?.sha256
    && packet?.acceptedUploadPathCloseout?.sourceSha256
      === '1ad47ef23a3432748c48b1e32574b5e26871cf8fc322789af81bb970645d8abc'
    && packet?.acceptedUploadPathCloseout?.mergeCommit
      === 'dcddbcf8b0a0d636749cacc9084c63b7c4f346e9';

  const qualificationReusable = packet?.qualificationDecision?.decision
      === 'REUSE_EXISTING_SOURCE_BOUND_SANDBOX_QUALIFICATION'
    && packet?.qualificationDecision?.newStandaloneSandboxProofRequired === false
    && packet?.historicalQualification?.livePublicFixtureMatrix?.status === 'pass'
    && packet?.historicalQualification?.livePublicFixtureMatrix?.evidenceSha256
      === '2d982c39c0318f69e074a99c7822d11596dc9b1243c81cd257608cd826ab6b54'
    && packet?.historicalQualification?.privatePilot?.status === 'pass'
    && packet?.historicalQualification?.privatePilot?.executionCommit
      === 'a46eb8789b45babca171f428098128860d144012'
    && packet?.historicalQualification?.sourceContinuity?.executorChangedSincePrivatePilot === false
    && packet?.historicalQualification?.sourceContinuity?.configChangedSincePrivatePilot === false
    && packet?.historicalQualification?.sourceContinuity?.runnerChangedSincePrivatePilot === false
    && packet?.historicalQualification?.sourceContinuity?.workerContractChangedSincePrivatePilot === false;

  const boundsValid = packet?.futureRunBounds?.developmentOnly === true
    && packet?.futureRunBounds?.maxAttempts === 1
    && packet?.futureRunBounds?.automaticRetry === false
    && packet?.futureRunBounds?.secondRun === false
    && packet?.futureRunBounds?.stopOnUnknownOutcome === true
    && packet?.futureRunBounds?.maxWindowSeconds === 1800
    && packet?.futureRunBounds?.allInPlanningCapUsd === 50
    && packet?.futureRunBounds?.publicSyntheticFixtureOnly === true
    && packet?.futureRunBounds?.privateCadAllowed === false
    && packet?.futureRunBounds?.realUsersAllowed === false
    && packet?.futureRunBounds?.productionAllowed === false;

  const routeClosed = packet?.routeGate?.requiredDisabledLiteral
      === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.routeGate?.trackedRouteModified === false
    && packet?.routeGate?.productionUploadActivationAuthorized === false;

  const authoritiesClosed = allFalse(packet?.authorityPreservedByThisPacket);

  return {
    structureValid,
    uploadCloseoutBound,
    qualificationReusable,
    boundsValid,
    routeClosed,
    authoritiesClosed,
    readyForOneFutureDevelopmentConversionRun: structureValid
      && uploadCloseoutBound
      && qualificationReusable
      && boundsValid
      && routeClosed
      && authoritiesClosed,
    liveRunAuthorizedByThisPacket: false,
    productionUploadActivationAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadConversionSandboxReadiness };
