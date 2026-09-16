const { buildUploadAdmissionDevelopmentDryRunEvidencePreview } =
  require('./uploadAdmissionDevelopmentDryRunExecutor');

async function inspectUploadAdmissionDevelopmentDryRunAcceptance(acceptance, executor, plan) {
  const preview = await buildUploadAdmissionDevelopmentDryRunEvidencePreview(executor, plan);
  const authoritiesClosed = Object.values(acceptance?.authorityPreservedByThisPacket || {}).every(value => value === false);
  const windowValid = acceptance?.acceptedWindow?.startUtc === '2026-09-16T04:15:00Z'
    && acceptance?.acceptedWindow?.expiresUtc === '2026-09-16T04:30:00Z'
    && acceptance?.acceptedWindow?.maxRunSeconds === 900
    && acceptance?.acceptedWindow?.scheduleIfMoreThanFiveMinutesAway === true;
  const boundsValid = acceptance?.runBounds?.maxAttempts === 1
    && acceptance?.runBounds?.automaticRetry === false
    && acceptance?.runBounds?.secondRun === false
    && acceptance?.runBounds?.stopOnUnknownOutcome === true
    && acceptance?.runBounds?.deleteRetainedState === false
    && acceptance?.runBounds?.allInPlanningCapUsd === 50
    && acceptance?.runBounds?.bodyAdmissionAuthorized === false
    && acceptance?.runBounds?.cadUploadActivationAuthorized === false
    && acceptance?.runBounds?.cadConversionAuthorized === false
    && acceptance?.runBounds?.sandboxDispatchAuthorized === false
    && acceptance?.runBounds?.privateCadAuthorized === false;
  const structureValid = acceptance?.schemaVersion === 1
    && acceptance?.mode === 'source-only-cad-upload-admission-development-dry-run-acceptance'
    && acceptance?.sourceOnly === true
    && acceptance?.acceptedExecutorPreview === true
    && acceptance?.nextSafeAction?.type === 'bounded-development-run'
    && preview.decision === 'DEVELOPMENT_DRY_RUN_EXECUTOR_PREVIEW_READY'
    && windowValid && boundsValid && authoritiesClosed;
  return {
    structureValid,
    executorPreviewAccepted: acceptance?.acceptedExecutorPreview === true,
    windowValid,
    boundsValid,
    authoritiesClosed,
    readyForAutopilotDevelopmentRun: structureValid,
    liveDevelopmentRunAuthorizedByThisPacket: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    retryAuthorized: false,
    secondRunAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentDryRunAcceptance };
