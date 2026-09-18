function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectIntegratedUploadConversionReadiness(
  readiness,
  authSession,
  uploadSession,
  browserSession,
  mountedAdmission,
  conversion,
  priorCloseout,
) {
  const structureValid = readiness?.schemaVersion === 1
    && readiness?.mode === 'source-only-cad-integrated-upload-conversion-readiness'
    && readiness?.status === 'CAD_INTEGRATED_UPLOAD_CONVERSION_READINESS_REVIEWED_SOURCE_ONLY'
    && readiness?.sourceOnly === true
    && readiness?.production === false
    && readiness?.baseMainCommit === 'b6fd4f4cea351d5f74c857555e3e587e9c9165c9'
    && readiness?.branch === 'codex/cad-integrated-upload-conversion-readiness';

  const authSessionBound = authSession?.status
      === 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT'
    && authSession?.runResult?.decision === 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_EXECUTED'
    && authSession?.runResult?.runCompleted === true
    && authSession?.runResult?.unknownOutcome === false
    && authSession?.runResult?.productionTouched === false
    && readiness?.evidenceChain?.authSession?.sourceSha256
      === 'd1caa42df6916beee3466e20809598645b17a70c87bf4a25dd6ba64e73f23b3d';

  const uploadSessionBound = uploadSession?.status
      === 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT'
    && uploadSession?.runResult?.decision === 'DEVELOPMENT_UPLOAD_SESSION_QUALIFICATION_EXECUTED'
    && uploadSession?.runResult?.runCompleted === true
    && uploadSession?.runResult?.unknownOutcome === false
    && uploadSession?.runResult?.cadUploadsDisabled === true
    && uploadSession?.observedBridgeOutcome?.retainedUploadSession === true
    && readiness?.evidenceChain?.uploadSession?.sourceSha256
      === 'd31a35c92287d122d1eaa1aeacacbb6d2714866467f6b63006f1f7ea44ce3bdb';

  const browserSessionBound = browserSession?.status
      === 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT'
    && browserSession?.runResult?.decision === 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_EXECUTED'
    && browserSession?.runResult?.runCompleted === true
    && browserSession?.runResult?.unknownOutcome === false
    && browserSession?.runResult?.browserCookiesObserved === true
    && browserSession?.operationCounts?.disabledUploadRequests === 1
    && browserSession?.operationCounts?.bodyReads === 0
    && readiness?.evidenceChain?.browserSession?.sourceSha256
      === '5885f28c358167cb73c6f1f6c854ea77607b42050ae98e564c45d7b31b65aad4';

  const mountedAdmissionBound = mountedAdmission?.status
      === 'UPLOAD_ACTIVATION_ROLLOVER_COMPLETED_SOURCE_CLOSEOUT'
    && mountedAdmission?.runResult?.decision === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED'
    && mountedAdmission?.runResult?.runCompleted === true
    && mountedAdmission?.runResult?.unknownOutcome === false
    && mountedAdmission?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && mountedAdmission?.runResult?.bodyAdmissionValidated === true
    && mountedAdmission?.operationCounts?.conversionDispatches === 0
    && mountedAdmission?.operationCounts?.sandboxDispatches === 0
    && mountedAdmission?.operationCounts?.storeMutations === 0
    && readiness?.evidenceChain?.mountedUploadAdmission?.sourceSha256
      === '1ad47ef23a3432748c48b1e32574b5e26871cf8fc322789af81bb970645d8abc';

  const conversionBound = conversion?.status === 'PUBLIC_SYNTHETIC_CONVERSION_QUALIFIED'
    && conversion?.run?.decision === 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_EXECUTED'
    && conversion?.run?.runCompleted === true
    && conversion?.run?.unknownOutcome === false
    && conversion?.fixture?.id === 'public-cube'
    && conversion?.fixture?.privateCad === false
    && conversion?.conversionResult?.status === 'ready'
    && conversion?.conversionResult?.meshCount === 1
    && conversion?.conversionResult?.vertexCount === 24
    && conversion?.conversionResult?.triangleCount === 12
    && conversion?.sandboxEvidence?.status === 'stopped'
    && conversion?.sandboxEvidence?.cleanup === 'stopped'
    && readiness?.evidenceChain?.publicSyntheticConversion?.sourceSha256
      === '90eb08461039e5cc3112f50f5114c649415142ac29c9285312134f76dfa57f01';

  const priorCloseoutBound = priorCloseout?.status === 'DEVELOPMENT_READINESS_AUTOPILOT_COMPLETED'
    && priorCloseout?.scopeConclusion?.approvedAutopilotScopeCompleted === true
    && priorCloseout?.scopeConclusion?.additionalProviderRunRequired === false
    && priorCloseout?.scopeConclusion?.readyForRealUsers === false
    && priorCloseout?.scopeConclusion?.readyForProductionUploadActivation === false
    && readiness?.evidenceChain?.priorDevelopmentReadinessCloseout?.sourceSha256
      === '6c35ac054dbf1e6c62783f57ed6d1eaf2d32c9b1973373fd25a75f33c1aaa1e4';

  const routeControlsClosed = readiness?.routeControls?.route === 'server/cadUserUploadRouter.js'
    && readiness?.routeControls?.routeSha256
      === '70c1c8382b1a570b6c39c602707070a04f0c208dbe43e30bdbbd5a62c91d41bb'
    && readiness?.routeControls?.routeGateLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && readiness?.routeControls?.productionRouteDisabled === true
    && readiness?.routeControls?.productionBodyAdmissionAuthorized === false
    && readiness?.routeControls?.productionUploadActivationAuthorized === false;

  const fixtureContinuous = readiness?.fixtureContinuity?.primaryPublicFixtureId === 'public-cube'
    && readiness?.fixtureContinuity?.sha256
      === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && readiness?.fixtureContinuity?.bytes === 11562
    && readiness?.fixtureContinuity?.privateCad === false
    && readiness?.fixtureContinuity?.uploadAdmissionAndConversionFixtureMatched === true;

  const developmentReadinessComplete =
    readiness?.developmentReadiness?.syntheticAuthSessionQualified === true
    && readiness?.developmentReadiness?.syntheticUploadSessionQualified === true
    && readiness?.developmentReadiness?.localBrowserSessionQualified === true
    && readiness?.developmentReadiness?.mountedDevelopmentBodyAdmissionQualified === true
    && readiness?.developmentReadiness?.publicFixtureConversionQualified === true
    && readiness?.developmentReadiness?.sandboxResourceBoundsQualified === true
    && readiness?.developmentReadiness?.sandboxCleanupQualified === true
    && readiness?.developmentReadiness?.sanitizedEvidenceCustodyQualified === true
    && readiness?.developmentReadiness?.failClosedProductionSmokeQualified === true
    && readiness?.developmentReadiness?.componentEvidenceChainComplete === true
    && readiness?.developmentReadiness?.singleMountedEndToEndRealSessionRunCompleted === false;

  const noProviderRunRequired = readiness?.scopeConclusion?.componentEvidenceChainBound === true
    && readiness?.scopeConclusion?.developmentUploadToConversionComponentReadiness === true
    && readiness?.scopeConclusion?.additionalProviderRunRequired === false
    && readiness?.scopeConclusion?.readyForRealUsers === false
    && readiness?.scopeConclusion?.readyForPrivateCad === false
    && readiness?.scopeConclusion?.readyForProductionUploadActivation === false
    && readiness?.scopeConclusion?.readyForProductionConversion === false;

  const authoritiesClosed = allFalse(readiness?.authorityPreserved);

  return {
    structureValid,
    authSessionBound,
    uploadSessionBound,
    browserSessionBound,
    mountedAdmissionBound,
    conversionBound,
    priorCloseoutBound,
    routeControlsClosed,
    fixtureContinuous,
    developmentReadinessComplete,
    noProviderRunRequired,
    authoritiesClosed,
    readyForSourcePublication: structureValid
      && authSessionBound
      && uploadSessionBound
      && browserSessionBound
      && mountedAdmissionBound
      && conversionBound
      && priorCloseoutBound
      && routeControlsClosed
      && fixtureContinuous
      && developmentReadinessComplete
      && noProviderRunRequired
      && authoritiesClosed,
    readyForRealUsers: false,
    readyForPrivateCad: false,
    readyForProductionUploadActivation: false,
    readyForProductionConversion: false,
  };
}

module.exports = { inspectIntegratedUploadConversionReadiness };
