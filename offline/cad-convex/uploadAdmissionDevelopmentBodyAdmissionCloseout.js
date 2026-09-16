function allFalse(record) {
  return Object.values(record || {}).every(value => value === false);
}

function inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(closeout) {
  const hashesValid = closeout?.sanitizedRunEvidence?.evidenceSha256
      === 'd5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604'
    && closeout?.sanitizedRunEvidence?.receiptSha256
      === '90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84';

  const resultValid = closeout?.runResult?.decision === 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED'
    && closeout?.runResult?.runCompleted === true
    && closeout?.runResult?.unknownOutcome === false
    && closeout?.runResult?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.runResult?.bodyAdmissionValidated === true
    && closeout?.runResult?.automaticRetry === false
    && closeout?.runResult?.secondRun === false;

  const countsValid = closeout?.operationCounts?.mountedRouteDisabledChecks === 2
    && closeout?.operationCounts?.isolatedRouteBodyValidationChecks === 1
    && closeout?.operationCounts?.uploadBodiesRead === 1
    && closeout?.operationCounts?.conversionDispatches === 0
    && closeout?.operationCounts?.sandboxDispatches === 0
    && closeout?.operationCounts?.storeMutations === 0;

  const flagsValid = closeout?.runFlags?.productionUploadActivationAuthorized === false
    && closeout?.runFlags?.productionBodyAdmissionAuthorized === false
    && closeout?.runFlags?.cadUploadActivationAuthorized === false
    && closeout?.runFlags?.conversionAuthorized === false
    && closeout?.runFlags?.sandboxDispatchAuthorized === false
    && closeout?.runFlags?.privateCadAuthorized === false
    && closeout?.runFlags?.realUserAuthorized === false;

  const productionSmokeValid = closeout?.productionFailClosedSmoke?.shell === '200 ReversR Rebuild'
    && closeout?.productionFailClosedSmoke?.capabilities === 200
    && closeout?.productionFailClosedSmoke?.userImport === '401 USER_SESSION_REQUIRED'
    && closeout?.productionFailClosedSmoke?.import === '401 UNAUTHORIZED'
    && closeout?.productionFailClosedSmoke?.sourceRecord === 404;

  const evidenceCustodyValid = closeout?.sanitizedRunEvidence?.gitIgnored === true
    && closeout?.sanitizedRunEvidence?.directoryMode === '700'
    && closeout?.sanitizedRunEvidence?.fileMode === '600'
    && closeout?.sanitizedRunEvidence?.privatePatternLeakObserved === false
    && closeout?.sanitizedRunEvidence?.recordsContentBase64 === false
    && closeout?.sanitizedRunEvidence?.recordsRawCredential === false
    && closeout?.sanitizedRunEvidence?.recordsPrivateCad === false;

  const authoritiesClosed = allFalse(closeout?.authorityPreserved);
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-development-body-admission-closeout'
    && closeout?.status === 'DEVELOPMENT_BODY_ADMISSION_COMPLETED_SOURCE_CLOSEOUT'
    && closeout?.sourceOnly === true
    && closeout?.production === false
    && closeout?.developmentDeployment === 'majestic-alligator-31'
    && closeout?.mergedMainCommit === 'ce6494ca1bd250b7d0051ffcaff3e8ac86a3054d'
    && closeout?.sourcePr === 283
    && closeout?.runRef === 'rrb-ref:cad-upload-admission-development-body-admission-1630z'
    && hashesValid
    && resultValid
    && countsValid
    && flagsValid
    && productionSmokeValid
    && evidenceCustodyValid
    && authoritiesClosed;

  return {
    structureValid,
    hashesValid,
    resultValid,
    countsValid,
    flagsValid,
    productionSmokeValid,
    evidenceCustodyValid,
    authoritiesClosed,
    uploadActivationAuthorized: false,
    productionBodyAdmissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentBodyAdmissionCloseout };
