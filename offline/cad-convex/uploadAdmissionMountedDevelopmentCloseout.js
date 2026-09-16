function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionMountedDevelopmentCloseout(closeout) {
  const hashesValid = closeout?.sanitizedRunEvidence?.evidenceSha256
      === 'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75'
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === '915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a';

  const resultValid = closeout?.runResult?.decision === 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED'
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
    && closeout?.productionFailClosedSmoke?.mergeCommit === '8bcbca81d24aa0f483bbc7a95274a6590fab56ef';

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
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-mounted-development-closeout'
    && closeout?.status === 'MOUNTED_DEVELOPMENT_UPLOAD_ADMISSION_COMPLETED_SOURCE_CLOSEOUT'
    && closeout?.sourceOnly === true
    && closeout?.production === false
    && closeout?.developmentDeployment === 'local-mounted-development-harness'
    && closeout?.sourcePr === 287
    && closeout?.mergedMainCommit === '8bcbca81d24aa0f483bbc7a95274a6590fab56ef'
    && closeout?.executorBridgeCommit === '379e47aa8ece3bf1608ef7324bdfc852ed37826e'
    && closeout?.runRef === 'rrb-ref:cad-upload-admission-mounted-development-1800z'
    && closeout?.acceptedWindow?.startUtc === '2026-09-16T18:00:00Z'
    && closeout?.acceptedWindow?.expiresUtc === '2026-09-16T18:15:00Z'
    && hashesValid
    && resultValid
    && countsValid
    && flagsValid
    && productionSmokeValid
    && evidenceCustodyValid
    && fixtureValid
    && authoritiesClosed;

  return {
    structureValid,
    hashesValid,
    resultValid,
    countsValid,
    flagsValid,
    productionSmokeValid,
    evidenceCustodyValid,
    fixtureValid,
    authoritiesClosed,
    uploadActivationAuthorized: false,
    productionBodyAdmissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionMountedDevelopmentCloseout };
