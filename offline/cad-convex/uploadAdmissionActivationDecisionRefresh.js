function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationDecisionRefresh(packet) {
  const mountedCloseoutValid = packet?.acceptedMountedDevelopmentCloseout?.sourcePr === 288
    && packet?.acceptedMountedDevelopmentCloseout?.mergedMainCommit === 'c74de5b1deecfd1bb8741190ef702e670dce41c4'
    && packet?.acceptedMountedDevelopmentCloseout?.decision === 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED'
    && packet?.acceptedMountedDevelopmentCloseout?.evidenceSha256 === 'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75'
    && packet?.acceptedMountedDevelopmentCloseout?.receiptSha256 === '915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a'
    && packet?.acceptedMountedDevelopmentCloseout?.publicFixtureSha256 === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && packet?.acceptedMountedDevelopmentCloseout?.publicFixtureBytes === 11562
    && packet?.acceptedMountedDevelopmentCloseout?.bodyAdmissionValidated === true
    && packet?.acceptedMountedDevelopmentCloseout?.runCompleted === true
    && packet?.acceptedMountedDevelopmentCloseout?.unknownOutcome === false
    && packet?.acceptedMountedDevelopmentCloseout?.terminalCode === 'USER_UPLOADS_DISABLED';

  const sourceGuardsValid = packet?.sourceGuards?.checkedInRouteMustRemainDisabled === true
    && packet?.sourceGuards?.routeGateLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.sourceGuards?.runtimeBridgeMountedNow === false
    && packet?.sourceGuards?.productionBodyAdmissionAuthorizedNow === false
    && packet?.sourceGuards?.currentTerminalCode === 'USER_UPLOADS_DISABLED'
    && packet?.sourceGuards?.conversionAllowedNow === false
    && packet?.sourceGuards?.sandboxDispatchAllowedNow === false;

  const decisionValid = packet?.decision?.developmentSyntheticUploadPathCanProceedToExactWindowPacket === true
    && packet?.decision?.requiresExactUtcWindowBeforeRun === true
    && packet?.decision?.requiresReviewedRunnerBeforeRun === true
    && packet?.decision?.requiresPreAndPostDisabledRouteChecks === true
    && packet?.decision?.requiresRollbackAndEvidenceDestinationBeforeRun === true
    && packet?.decision?.productionUploadActivationReady === false
    && packet?.decision?.realUserReady === false
    && packet?.decision?.privateCadReady === false
    && packet?.decision?.conversionSandboxReady === false;

  const futureBoundsValid = packet?.futureRunBounds?.developmentOnly === true
    && packet?.futureRunBounds?.productionAllowed === false
    && packet?.futureRunBounds?.fixtureScope === 'public synthetic cube fixture only'
    && packet?.futureRunBounds?.maxAttempts === 1
    && packet?.futureRunBounds?.automaticRetry === false
    && packet?.futureRunBounds?.secondRun === false
    && packet?.futureRunBounds?.stopOnUnknownOutcome === true
    && packet?.futureRunBounds?.maxAllInCostUsd === 50
    && packet?.futureRunBounds?.privateCadAllowed === false
    && packet?.futureRunBounds?.realUsersAllowed === false
    && packet?.futureRunBounds?.stopBeforeConversion === true
    && packet?.futureRunBounds?.stopBeforeSandbox === true;

  const authoritiesClosed = allFalse(packet?.authorityPreserved);
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-activation-decision-refresh'
    && packet?.status === 'UPLOAD_ACTIVATION_DECISION_REFRESH_PREPARED_SOURCE_ONLY'
    && packet?.sourceOnly === true
    && packet?.enabled === false
    && packet?.liveRunAuthorizedByThisPacket === false
    && packet?.target?.developmentDeployment === 'majestic-alligator-31'
    && mountedCloseoutValid
    && sourceGuardsValid
    && decisionValid
    && futureBoundsValid
    && authoritiesClosed;

  return {
    structureValid,
    mountedCloseoutValid,
    sourceGuardsValid,
    decisionValid,
    futureBoundsValid,
    authoritiesClosed,
    liveRunAuthorized: false,
    productionUploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionActivationDecisionRefresh };
