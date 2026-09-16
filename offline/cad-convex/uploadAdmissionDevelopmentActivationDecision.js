function inspectUploadAdmissionDevelopmentActivationDecision(packet) {
  const flags = packet?.authorityPreserved || {};
  const inputsValid = packet?.acceptedInputs?.qualificationDecision === 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED'
    && packet?.acceptedInputs?.qualificationEvidenceSha256 === 'cb4619a7b0c34731047f6493a4c74d5e1ffb3cf598c1a7a6117e0525318f9ffd'
    && packet?.acceptedInputs?.qualificationReceiptSha256 === '176440f7c579ff709dcd8ca30ea3dad41200d7c01658a10064ccfeafc66024b4'
    && packet?.acceptedInputs?.publicFixtureSha256 === '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3'
    && packet?.acceptedInputs?.publicFixtureBytes === 11562;
  const sourceGuardsValid = packet?.sourceGuards?.mountedRouteMustRemainDisabled === true
    && packet?.sourceGuards?.routeGateLiteral === 'const BODY_ADMISSION_AUTHORIZED = false;'
    && packet?.sourceGuards?.runtimeBridgeMountedNow === false
    && packet?.sourceGuards?.bodyAdmissionAuthorizedNow === false
    && packet?.sourceGuards?.currentTerminalCode === 'USER_UPLOADS_DISABLED'
    && packet?.sourceGuards?.conversionAllowedNow === false
    && packet?.sourceGuards?.sandboxDispatchAllowedNow === false;
  const boundsValid = packet?.futureDevelopmentActivationBounds?.developmentOnly === true
    && packet?.futureDevelopmentActivationBounds?.productionAllowed === false
    && packet?.futureDevelopmentActivationBounds?.maxAttempts === 1
    && packet?.futureDevelopmentActivationBounds?.automaticRetry === false
    && packet?.futureDevelopmentActivationBounds?.secondRun === false
    && packet?.futureDevelopmentActivationBounds?.privateCadAllowed === false
    && packet?.futureDevelopmentActivationBounds?.realUsersAllowed === false
    && packet?.futureDevelopmentActivationBounds?.maxAllInCostUsd === 50
    && packet?.futureDevelopmentActivationBounds?.stopBeforeConversion === true
    && packet?.futureDevelopmentActivationBounds?.stopBeforeSandbox === true;
  const authoritiesClosed = Object.values(flags).every(value => value === false);
  const structureValid = packet?.schemaVersion === 1
    && packet?.mode === 'source-only-cad-upload-admission-development-activation-decision'
    && packet?.sourceOnly === true
    && packet?.executionAuthorizedByThisPacket === false
    && packet?.target?.developmentDeployment === 'majestic-alligator-31'
    && packet?.operators?.backupCustodian === 'Amina'
    && packet?.operators?.testerReviewer === 'Mark'
    && inputsValid
    && sourceGuardsValid
    && boundsValid
    && authoritiesClosed;
  return {
    structureValid,
    inputsValid,
    sourceGuardsValid,
    boundsValid,
    authoritiesClosed,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
  };
}

module.exports = { inspectUploadAdmissionDevelopmentActivationDecision };
