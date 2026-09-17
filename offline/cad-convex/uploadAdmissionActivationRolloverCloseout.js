function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionActivationRolloverCloseout(closeout, rollover, rebind) {
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-activation-rollover-closeout'
    && closeout?.status === 'UPLOAD_ACTIVATION_ROLLOVER_COMPLETED_SOURCE_CLOSEOUT'
    && closeout?.sourceOnly === true
    && closeout?.production === false
    && closeout?.baseMainCommit === '48edc745d500bd2ffe418ca3aebbc9bd77a465f8'
    && closeout?.branch === 'codex/cad-upload-activation-rollover-closeout'
    && closeout?.targetContext?.developmentDeployment === 'majestic-alligator-31'
    && closeout?.executionSurface === 'local-mounted-development-harness';

  const sourceBound = rollover?.status === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_READY_SOURCE_ONLY'
    && rebind?.status === 'UPLOAD_ACTIVATION_RUNNER_REBIND_READY_SOURCE_ONLY'
    && rollover?.acceptedWindow?.runRef === closeout?.runRef
    && rebind?.acceptedWindow?.runRef === closeout?.runRef
    && rollover?.acceptedWindow?.startUtc === closeout?.acceptedWindow?.startUtc
    && rollover?.acceptedWindow?.expiresUtc === closeout?.acceptedWindow?.expiresUtc
    && closeout?.sourceBindings?.rolloverMergeCommit
      === '11f45049f1ce138c887482d5d68d25d9642e7284'
    && closeout?.sourceBindings?.runnerRebindMergeCommit
      === '48edc745d500bd2ffe418ca3aebbc9bd77a465f8';

  const hashesValid = closeout?.sanitizedRunEvidence?.evidenceSha256
      === '29be0ace835239dcaa46ebdb71b247a850b360e072a7043f446b0a418c7e4a8f'
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === '298f25e13ca43aee29432954853bd4cc13924b2c39c3767a70552575f313e847';

  const resultValid = closeout?.runResult?.decision === 'UPLOAD_ACTIVATION_WINDOW_ROLLOVER_EXECUTED'
    && closeout?.runResult?.runCompleted === true
    && closeout?.runResult?.unknownOutcome === false
    && closeout?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.runResult?.bodyAdmissionValidated === true
    && closeout?.runResult?.automaticRetry === false
    && closeout?.runResult?.secondRun === false;

  const countsValid = closeout?.operationCounts?.mountedRouteDisabledChecks === 2
    && closeout?.operationCounts?.mountedDevelopmentBodyValidationChecks === 1
    && closeout?.operationCounts?.uploadBodiesRead === 1
    && closeout?.operationCounts?.conversionDispatches === 0
    && closeout?.operationCounts?.sandboxDispatches === 0
    && closeout?.operationCounts?.storeMutations === 0;

  const flagsValid = closeout?.runFlags?.productionUploadActivationAuthorized === false
    && closeout?.runFlags?.cadUploadActivationAuthorized === false
    && closeout?.runFlags?.conversionAuthorized === false
    && closeout?.runFlags?.sandboxDispatchAuthorized === false
    && closeout?.runFlags?.privateCadAuthorized === false
    && closeout?.runFlags?.realUserAuthorized === false
    && closeout?.runFlags?.automaticRetry === false
    && closeout?.runFlags?.secondRun === false;

  const productionSmokeValid = closeout?.productionFailClosedSmoke?.shell === '200 ReversR Rebuild'
    && closeout?.productionFailClosedSmoke?.capabilities === 200
    && closeout?.productionFailClosedSmoke?.userImport === '401 USER_SESSION_REQUIRED'
    && closeout?.productionFailClosedSmoke?.import === '401 UNAUTHORIZED'
    && closeout?.productionFailClosedSmoke?.sourceRecord === 404
    && closeout?.productionFailClosedSmoke?.mergeCommit
      === '48edc745d500bd2ffe418ca3aebbc9bd77a465f8';

  const evidenceCustodyValid = closeout?.sanitizedRunEvidence?.gitIgnored === true
    && closeout?.sanitizedRunEvidence?.directoryMode === '700'
    && closeout?.sanitizedRunEvidence?.fileMode === '600'
    && closeout?.sanitizedRunEvidence?.privatePatternLeakObserved === false
    && closeout?.sanitizedRunEvidence?.recordsContentBase64 === false
    && closeout?.sanitizedRunEvidence?.recordsRawCredential === false
    && closeout?.sanitizedRunEvidence?.recordsPrivateCad === false;

  const fixtureValid = closeout?.fixture?.id === 'public-cube'
    && closeout?.fixture?.sha256 === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && closeout?.fixture?.bytes === 11562
    && closeout?.fixture?.privateCad === false;

  const authoritiesClosed = allFalse(closeout?.authorityPreserved);

  return {
    structureValid,
    sourceBound,
    hashesValid,
    resultValid,
    countsValid,
    flagsValid,
    productionSmokeValid,
    evidenceCustodyValid,
    fixtureValid,
    authoritiesClosed,
    developmentSyntheticUploadPathQualified: structureValid
      && sourceBound
      && hashesValid
      && resultValid
      && countsValid
      && flagsValid
      && productionSmokeValid
      && evidenceCustodyValid
      && fixtureValid
      && authoritiesClosed,
    productionUploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionActivationRolloverCloseout };
