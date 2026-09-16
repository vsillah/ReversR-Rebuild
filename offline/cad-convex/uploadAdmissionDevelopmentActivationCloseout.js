function inspectUploadAdmissionDevelopmentActivationCloseout(closeout) {
  const flags = closeout?.authorityPreservedByCloseout || {};
  const hashesValid = closeout?.evidence?.sanitizedEvidenceSha256 === '1e37b105c5adfd26ed4319bf0fed628d1b26b4cabd815dfe3f091c517cce9de6'
    && closeout?.evidence?.sanitizedReceiptSha256 === '1375b54ee2df2305138ee775f8906db81d94a45aa15d6cd12f7f62b991bbb3a2';
  const resultValid = closeout?.result?.decision === 'UPLOAD_ADMISSION_DEVELOPMENT_ACTIVATION_EXECUTOR_PREVIEWED'
    && closeout?.result?.previewCompleted === true
    && closeout?.result?.activationExecuted === false
    && closeout?.result?.liveRunStarted === false
    && closeout?.result?.unknownOutcome === false
    && closeout?.result?.bodyReadAuthorized === false
    && closeout?.result?.admissionAuthorized === false
    && closeout?.result?.conversionAuthorized === false
    && closeout?.result?.sandboxDispatchAuthorized === false
    && closeout?.result?.storeMutationAuthorized === false
    && closeout?.result?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.result?.uploadBodiesRead === 0
    && closeout?.result?.conversionDispatches === 0
    && closeout?.result?.sandboxDispatches === 0
    && closeout?.result?.storeMutations === 0
    && closeout?.result?.automaticRetry === false
    && closeout?.result?.secondRun === false;
  const productionSmokeValid = closeout?.productionFailClosedSmoke?.shell === '200 ReversR Rebuild'
    && closeout?.productionFailClosedSmoke?.capabilities === 200
    && closeout?.productionFailClosedSmoke?.userImport === '401 USER_SESSION_REQUIRED'
    && closeout?.productionFailClosedSmoke?.import === '401 UNAUTHORIZED'
    && closeout?.productionFailClosedSmoke?.sourceRecord === 404;
  const evidenceCustodyValid = closeout?.evidence?.directoryMode === '700'
    && closeout?.evidence?.fileMode === '600'
    && closeout?.evidence?.gitIgnored === true
    && closeout?.evidence?.privatePatternLeakObserved === false;
  const authoritiesClosed = Object.values(flags).every(value => value === false);
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-development-activation-closeout'
    && closeout?.status === 'DEVELOPMENT_UPLOAD_ACTIVATION_PREVIEW_CLOSEOUT_ACCEPTED_SOURCE_ONLY'
    && closeout?.sourceOnly === true
    && closeout?.activationPreviewCompleted === true
    && closeout?.runRef === 'rrb-ref:cad-upload-admission-development-activation-1215z'
    && hashesValid
    && resultValid
    && productionSmokeValid
    && evidenceCustodyValid
    && authoritiesClosed;
  return {
    structureValid,
    hashesValid,
    resultValid,
    productionSmokeValid,
    evidenceCustodyValid,
    authoritiesClosed,
    rerunAuthorized: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentActivationCloseout };
