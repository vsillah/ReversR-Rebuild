function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectDevelopmentReadinessAutopilotCloseout(closeout, metadata, upload, conversion) {
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-development-readiness-autopilot-closeout'
    && closeout?.status === 'DEVELOPMENT_READINESS_AUTOPILOT_COMPLETED'
    && closeout?.sourceOnly === true
    && closeout?.production === false
    && closeout?.baseMainCommit === 'a642e31a2baea6d1103c36a8494384faa1328659'
    && closeout?.branch === 'codex/cad-development-readiness-autopilot-closeout';

  const metadataBound = metadata?.status === 'DEVELOPMENT_QUALIFICATION_COMPLETED_SOURCE_CLOSEOUT'
    && metadata?.runResult?.decision === 'DEVELOPMENT_QUALIFICATION_EXECUTED'
    && metadata?.runResult?.runCompleted === true
    && metadata?.runResult?.unknownOutcome === false
    && closeout?.evidenceChain?.syntheticDurableMetadata?.sourceSha256
      === '16696938ab11d0f7739af87d72207e7413050863d473f4039d6a1d5674c66013';

  const uploadBound = upload?.status === 'UPLOAD_ACTIVATION_ROLLOVER_COMPLETED_SOURCE_CLOSEOUT'
    && upload?.runResult?.decision === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED'
    && upload?.runResult?.runCompleted === true
    && upload?.runResult?.unknownOutcome === false
    && upload?.runResult?.bodyAdmissionValidated === true
    && closeout?.evidenceChain?.publicSyntheticUploadAdmission?.sourceSha256
      === '1ad47ef23a3432748c48b1e32574b5e26871cf8fc322789af81bb970645d8abc';

  const conversionBound = conversion?.status === 'PUBLIC_SYNTHETIC_CONVERSION_QUALIFIED'
    && conversion?.run?.decision === 'UPLOAD_CONVERSION_SANDBOX_QUALIFICATION_EXECUTED'
    && conversion?.run?.runCompleted === true
    && conversion?.run?.unknownOutcome === false
    && conversion?.sandboxEvidence?.cleanup === 'stopped'
    && closeout?.evidenceChain?.publicSyntheticConversion?.sourceSha256
      === '90eb08461039e5cc3112f50f5114c649415142ac29c9285312134f76dfa57f01';

  const fixtureContinuous = closeout?.fixtureContinuity?.fixtureId === 'public-cube'
    && closeout?.fixtureContinuity?.sha256
      === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && closeout?.fixtureContinuity?.bytes === 11562
    && closeout?.fixtureContinuity?.privateCad === false
    && closeout?.fixtureContinuity?.uploadAndConversionFixtureMatched === true;

  const controlsClosed = closeout?.safetyControls?.productionRouteDisabled === true
    && closeout?.safetyControls?.automaticRetryObserved === false
    && closeout?.safetyControls?.secondRunObserved === false
    && closeout?.safetyControls?.privateCadObserved === false
    && closeout?.safetyControls?.realUserObserved === false
    && closeout?.safetyControls?.productionStoreMutationObserved === false
    && closeout?.safetyControls?.externalMessageObserved === false;

  const componentReadinessComplete = closeout?.developmentReadiness?.syntheticMetadataControlsQualified === true
    && closeout?.developmentReadiness?.publicFixtureBodyAdmissionQualified === true
    && closeout?.developmentReadiness?.publicFixtureConversionQualified === true
    && closeout?.developmentReadiness?.sandboxResourceBoundsQualified === true
    && closeout?.developmentReadiness?.sandboxCleanupQualified === true
    && closeout?.developmentReadiness?.sanitizedEvidenceCustodyQualified === true
    && closeout?.developmentReadiness?.failClosedProductionSmokeQualified === true
    && closeout?.developmentReadiness?.componentEvidenceChainComplete === true
    && closeout?.developmentReadiness?.singleMountedEndToEndRealSessionRunCompleted === false;

  const authoritiesClosed = allFalse(closeout?.authorityPreserved);
  const autopilotScopeCompleted = closeout?.scopeConclusion?.approvedAutopilotScopeCompleted === true
    && closeout?.scopeConclusion?.additionalProviderRunRequired === false
    && closeout?.scopeConclusion?.readyForRealUsers === false
    && closeout?.scopeConclusion?.readyForPrivateCad === false
    && closeout?.scopeConclusion?.readyForProductionUploadActivation === false;

  return {
    structureValid,
    metadataBound,
    uploadBound,
    conversionBound,
    fixtureContinuous,
    controlsClosed,
    componentReadinessComplete,
    authoritiesClosed,
    autopilotScopeCompleted,
    readyForSourcePublication: structureValid
      && metadataBound
      && uploadBound
      && conversionBound
      && fixtureContinuous
      && controlsClosed
      && componentReadinessComplete
      && authoritiesClosed
      && autopilotScopeCompleted,
    readyForRealUsers: false,
    readyForProductionUploadActivation: false,
  };
}

module.exports = { inspectDevelopmentReadinessAutopilotCloseout };
