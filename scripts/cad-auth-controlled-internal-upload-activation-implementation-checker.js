#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED,
  IMPLEMENTATION_ARTIFACT,
  VALIDATOR_ENVELOPE,
  createControlledInternalUploadActivationReview,
  forbiddenKeyPresent,
} = require('../server/cadControlledInternalUploadActivation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-internal-upload-activation-implementation.json';
const SOURCES = Object.freeze([
  'server/cadControlledInternalUploadActivation.js',
  'server/cadUserUploadRouter.js',
  'server/cadUserUploadAdmission.js',
  'server/cadWorkerContract.js',
  'server/uploadSession.js',
  'docs/cad-auth-controlled-internal-upload-activation-implementation.md',
  'docs/cad-auth-controlled-internal-upload-activation-decision.json',
  'docs/cad-auth-controlled-internal-upload-activation-decision.md',
  'docs/cad-production-upload-activation-scope.md',
  'scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js',
  'scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const text = file => read(file).toString('utf8');

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function routeStillClosed(readSource = read) {
  const route = readSource('server/cadUserUploadRouter.js').toString('utf8');
  return /const BODY_ADMISSION_AUTHORIZED = false;/.test(route)
    && !/BODY_ADMISSION_AUTHORIZED = true/.test(route)
    && /routeBodyGate\.authorizeBodyRead[\s\S]*validateRequestBody\(req\)/.test(route)
    && /return send\(res, 'USER_UPLOADS_DISABLED'\);/.test(route);
}

function validatorEnvelopePreserved(readSource = read) {
  const admission = readSource('server/cadUserUploadAdmission.js').toString('utf8');
  const contract = readSource('server/cadWorkerContract.js').toString('utf8');
  return /Object\.keys\(body\)\.sort\(\)\.join\(','\) !== 'contentBase64,fileName,mimeType'/.test(admission)
    && /\['model\/iges', 'application\/iges', 'application\/octet-stream'\]/.test(admission)
    && /LIMITS = Object\.freeze\(\{ inputBytes: 256 \* 1024, jsonBytes: 384 \* 1024/.test(contract)
    && /!\s*\/\\\.\(igs\|iges\)\$\/i\.test\(body\.fileName\)/.test(contract)
    && VALIDATOR_ENVELOPE.stepStpAuthorized === false
    && VALIDATOR_ENVELOPE.externalReferencesAuthorized === false;
}

function defaultProductionUnwired(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  const route = readSource('server/cadUserUploadRouter.js').toString('utf8');
  return !/cadControlledInternalUploadActivation/.test(index)
    && !/cadControlledInternalUploadActivation/.test(route)
    && CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED === false;
}

function expectedPacket(readSource = read) {
  const review = createControlledInternalUploadActivationReview();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-internal-upload-activation-implementation-packet-v1',
    sourceOnly: true,
    roadmap: 'Phase 7.2 controlled internal upload activation implementation',
    status: review.status,
    purpose:
      'install disabled-by-default source-owned manifest controls for a later bounded internal upload body-admission gate while preserving default production fail-closed behavior',
    implementationArtifact: IMPLEMENTATION_ARTIFACT,
    implementation: review,
    implementationResolved: review.status
      === 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_READY_SOURCE_ONLY'
      && review.controlledActivationPath?.disabledManifestReview?.bindingAccepted === true
      && review.controlledActivationPath?.defaultActivationEnabled === false
      && review.authorizes?.productionUploadActivation === false
      && review.authorizes?.requestBodyAdmissionOrRead === false,
    routeStillClosed: routeStillClosed(readSource),
    defaultProductionUnwired: defaultProductionUnwired(readSource),
    validatorEnvelopePreserved: validatorEnvelopePreserved(readSource),
    receiptSanitizationProof: Object.freeze({
      rejectsCredentialValue: forbiddenKeyPresent({ credentialValue: 'PRIVATE_SENTINEL' }),
      rejectsRequestBody: forbiddenKeyPresent({ requestBody: 'CAD_SENTINEL' }),
      rejectsCadBytes: forbiddenKeyPresent({ nested: { cadBytes: 'CAD_SENTINEL' } }),
      rejectsPrivateFileName: forbiddenKeyPresent({ privateFileName: 'private.igs' }),
    }),
    authorizes: Object.freeze({
      sourceOnlyDocsTestsCheckersManifests: true,
      localValidation: true,
      draftPrAfterExplicitApproval: true,
      greenCheckMergeAfterExplicitApproval: true,
      normalVercelDeploymentFromMainAfterExplicitApproval: true,
      productionFailClosedSmokeAfterExplicitApproval: true,
      productionUploadActivation: false,
      requestBodyAdmissionOrRead: false,
      privateCredentialRead: false,
      uploadSessionIssuance: false,
      conversionDispatch: false,
      sandboxDispatch: false,
      privateCadUse: false,
      runtimeInstallationActivation: false,
      executableCommandCardIssuance: false,
      externalMessages: false,
      liveRetry: false,
      secondLiveRun: false,
      realUserCommercialization: false,
      commercialReadinessClaim: false,
    }),
    sourceBindings: sourceBindings(readSource),
  });
}

function checkPacket(packet, readSource = read) {
  let matches = false;
  try {
    matches = isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch {
    matches = false;
  }
  const resolved = packet?.implementationResolved === true
    && packet?.routeStillClosed === true
    && packet?.defaultProductionUnwired === true
    && packet?.validatorEnvelopePreserved === true
    && packet?.receiptSanitizationProof?.rejectsCredentialValue === true
    && packet?.receiptSanitizationProof?.rejectsRequestBody === true
    && packet?.receiptSanitizationProof?.rejectsCadBytes === true
    && packet?.receiptSanitizationProof?.rejectsPrivateFileName === true;
  const closed = packet?.authorizes?.productionUploadActivation === false
    && packet?.authorizes?.requestBodyAdmissionOrRead === false
    && packet?.authorizes?.privateCredentialRead === false
    && packet?.authorizes?.uploadSessionIssuance === false
    && packet?.authorizes?.conversionDispatch === false
    && packet?.authorizes?.sandboxDispatch === false
    && packet?.authorizes?.commercialReadinessClaim === false;
  const serialized = JSON.stringify(packet || {});
  const noPrivateLeakage = !/us1\.|PRIVATE_SENTINEL|CAD_SENTINEL|\/Users\/|\.local\/|private-session-credential/i.test(serialized);
  const ok = matches && resolved && closed && noPrivateLeakage;
  return Object.freeze({
    ok,
    code: ok
      ? 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_VALID_SOURCE_ONLY'
      : 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_BLOCKED',
    implementationResolved: resolved,
    routeStillClosed: packet?.routeStillClosed === true,
    defaultProductionUnwired: packet?.defaultProductionUnwired === true,
    validatorEnvelopePreserved: packet?.validatorEnvelopePreserved === true,
    productionUploadActivationAuthorized: packet?.authorizes?.productionUploadActivation === true,
    requestBodyAdmissionOrReadAuthorized: packet?.authorizes?.requestBodyAdmissionOrRead === true,
    privateLeakageDetected: !noPrivateLeakage,
  });
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) {
      throw Error('INVALID_MODE');
    }
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({
      ...result,
      ...(result.ok ? { packetSha256: sha(bytes) } : {}),
    }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ok: false,
      code: 'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_CHECKER_ERROR',
      implementationResolved: false,
    }));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  defaultProductionUnwired,
  expectedPacket,
  routeStillClosed,
  sourceBindings,
  validatorEnvelopePreserved,
};
