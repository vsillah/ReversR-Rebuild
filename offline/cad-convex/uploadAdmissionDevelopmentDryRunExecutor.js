const { inspectUploadAdmissionDevelopmentDryRunPlan } = require('./uploadAdmissionDevelopmentDryRunPlan');

async function buildUploadAdmissionDevelopmentDryRunEvidencePreview(executor, plan) {
  const authorityClosed = Object.values(executor?.authorityPreserved || {}).every(value => value === false);
  const guardsClosed = executor?.runGuards?.maxAttempts === 1
    && executor?.runGuards?.automaticRetry === false
    && executor?.runGuards?.secondRun === false
    && executor?.runGuards?.stopOnUnknownOutcome === true
    && executor?.runGuards?.deleteRetainedState === false
    && executor?.runGuards?.allInPlanningCapUsd === 50;
  const capabilitiesClosed = executor?.executorCapabilities?.sourceOnlyPreview === true
    && executor?.executorCapabilities?.sanitizedEvidenceTemplate === true
    && executor?.executorCapabilities?.liveDevelopmentRun === false
    && executor?.executorCapabilities?.developmentStoreMutationAuthorizedNow === false
    && executor?.executorCapabilities?.bodyAdmissionAuthorized === false
    && executor?.executorCapabilities?.cadUploadActivationAuthorized === false
    && executor?.executorCapabilities?.cadConversionAuthorized === false
    && executor?.executorCapabilities?.sandboxDispatchAuthorized === false;
  const planPreview = await inspectUploadAdmissionDevelopmentDryRunPlan(plan);
  const structureValid = executor?.schemaVersion === 1
    && executor?.mode === 'source-only-cad-upload-admission-development-dry-run-executor'
    && executor?.sourceOnly === true
    && executor?.nextSafeAction?.branch === 'codex/cad-upload-admission-development-dry-run-acceptance'
    && authorityClosed && guardsClosed && capabilitiesClosed
    && planPreview.structureValid === true && planPreview.sourceOnlyPreviewPasses === true;
  return {
    schemaVersion: 1,
    mode: 'source-only-cad-upload-admission-development-dry-run-evidence-preview',
    structureValid,
    decision: structureValid ? 'DEVELOPMENT_DRY_RUN_EXECUTOR_PREVIEW_READY' : 'DEVELOPMENT_DRY_RUN_EXECUTOR_PREVIEW_BLOCKED',
    developmentDryRunExecuted: false,
    liveRunAuthorizedNow: false,
    developmentStoreMutationAuthorizedNow: false,
    bodyAdmissionAuthorized: false,
    cadUploadActivationAuthorized: false,
    cadConversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
    automaticRetry: false,
    secondRun: false,
    deleteRetainedState: false,
    sourceOnlyPreviewPasses: planPreview.sourceOnlyPreviewPasses === true,
    sanitizedEvidenceTemplateReady: executor?.sanitizedEvidenceTemplate?.recordsOnlyRefsAndDigests === true
      && executor?.sanitizedEvidenceTemplate?.recordsPrivateValues === false
      && executor?.sanitizedEvidenceTemplate?.recordsCadBytes === false
      && executor?.sanitizedEvidenceTemplate?.recordsRawCredential === false
      && executor?.sanitizedEvidenceTemplate?.recordsPrivateCad === false,
  };
}

module.exports = { buildUploadAdmissionDevelopmentDryRunEvidencePreview };
