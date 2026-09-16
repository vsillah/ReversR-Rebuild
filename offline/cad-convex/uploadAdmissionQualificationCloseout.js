function inspectUploadAdmissionQualificationCloseout(closeout) {
  const flags = closeout?.authorityPreservedByCloseout || {};
  const expectedFixtureSha = '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3';
  const hashesValid = closeout?.evidence?.sanitizedEvidenceSha256 === 'cb4619a7b0c34731047f6493a4c74d5e1ffb3cf598c1a7a6117e0525318f9ffd'
    && closeout?.evidence?.sanitizedReceiptSha256 === '176440f7c579ff709dcd8ca30ea3dad41200d7c01658a10064ccfeafc66024b4';
  const fixtureValid = closeout?.fixture?.sha256 === expectedFixtureSha
    && closeout?.fixture?.bytes === 11562
    && closeout?.fixture?.privateCad === false
    && closeout?.preflight?.fixtureSha256 === expectedFixtureSha
    && closeout?.preflight?.fixtureBytes === 11562;
  const resultValid = closeout?.result?.decision === 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED'
    && closeout?.result?.runCompleted === true
    && closeout?.result?.unknownOutcome === false
    && closeout?.result?.mountedRouteDisabledChecks === 2
    && closeout?.result?.isolatedRouteBodyValidationChecks === 1
    && closeout?.result?.uploadBodiesRead === 1
    && closeout?.result?.conversionDispatches === 0
    && closeout?.result?.sandboxDispatches === 0
    && closeout?.result?.storeMutations === 0
    && closeout?.result?.terminalCode === 'USER_UPLOADS_DISABLED'
    && closeout?.result?.uploadBodyValidated === true
    && closeout?.result?.recordsContentBase64 === false
    && closeout?.result?.recordsRawCredential === false;
  const preflightClosed = [
    'productionUploadActivationAuthorized',
    'conversionAuthorized',
    'sandboxDispatchAuthorized',
    'privateCadAuthorized',
    'automaticRetry',
    'secondRun',
  ].every(key => closeout?.preflight?.[key] === false);
  const authoritiesClosed = Object.values(flags).every(value => value === false);
  const schedulerClosed = closeout?.scheduler?.deletedAfterCompletion === true
    && closeout?.scheduler?.automaticRetry === false
    && closeout?.scheduler?.secondRun === false;
  const structureValid = closeout?.schemaVersion === 1
    && closeout?.mode === 'source-only-cad-upload-admission-qualification-closeout'
    && closeout?.sourceOnly === true
    && closeout?.runCompleted === true
    && closeout?.runRef === 'rrb-ref:cad-upload-admission-qualification-1100z'
    && closeout?.sourceBindings?.bodyAdmissionLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && closeout?.evidence?.gitIgnored === true
    && closeout?.evidence?.privatePatternLeakObserved === false
    && hashesValid
    && fixtureValid
    && resultValid
    && preflightClosed
    && authoritiesClosed
    && schedulerClosed;
  return {
    structureValid,
    hashesValid,
    fixtureValid,
    resultValid,
    preflightClosed,
    authoritiesClosed,
    schedulerClosed,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionQualificationCloseout };
