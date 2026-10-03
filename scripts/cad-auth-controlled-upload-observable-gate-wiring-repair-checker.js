#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  APPROVED_COMMAND_CARD_SHA256,
  APPROVED_INSTALLATION_SHA256,
  BASE_VERCEL_DEPLOYMENT,
  CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_PACKET_SHA256,
  CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_SOURCE_COMMIT,
  createControlledUploadObservableGateWiringRepairReview,
} = require('../server/cadControlledUploadObservableGateWiringRepair');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-upload-observable-gate-wiring-repair.json';
const SOURCES = Object.freeze([
  '.github/workflows/release-local-ci.yml',
  'server/index.js',
  'server/cadControlledUploadDigestDriftRepair.js',
  'server/cadControlledUploadObservableGateWiringRepair.js',
  'server/cadControlledInternalUploadActivation.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadStartupLiveGateSourceInstallClosure.js',
  'server/cadUserUploadRouter.js',
  'server/cadUserUploadAdmission.js',
  'server/cadWorkerContract.js',
  'server/uploadSession.js',
  'docs/cad-auth-controlled-upload-observable-gate-wiring-repair.md',
  'docs/cad-auth-controlled-internal-upload-activation-implementation.md',
  'docs/cad-auth-controlled-internal-upload-activation-implementation.json',
  'scripts/cad-auth-controlled-upload-observable-gate-wiring-repair-checker.js',
  'scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js',
  'scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js',
  'scripts/cad-auth-controlled-internal-upload-activation-implementation.test.js',
]);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));

function sourceBindings(readSource = read) {
  return Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))]));
}

function deployedStartupObservableGateWired(readSource = read) {
  const index = readSource('server/index.js').toString('utf8');
  const completion =
    readSource('server/cadProductionExecutableRuntimeMountCompletion.js').toString('utf8');
  const source =
    readSource('server/cadControlledUploadObservableGateWiringRepair.js').toString('utf8');
  return /createCadControlledUploadDigestDriftRepairActivationMount/.test(index)
    && /controlledInternalUploadActivationMount:\s*\(\{ baseRuntimeMount \}\)\s*=>/.test(index)
    && /createCadControlledUploadDigestDriftRepairActivationMount\(\{ baseRuntimeMount \}\)/.test(index)
    && /typeof controlledInternalUploadActivationMount === 'function'/.test(completion)
    && /controlledInternalUploadActivationMount\(\{ baseRuntimeMount \}\)/.test(completion)
    && /createCadStartupActiveLiveOpeningWindow\(\{ now \}\)/.test(source)
    && /readCadProductionCurrentDeploymentMetadata/.test(source);
}

function observableProofHeadersPreserved(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  return /CONTROLLED_UPLOAD_VALIDATION_HEADER = 'X-ReversR-CAD-Controlled-Upload-Validation'/.test(router)
    && /CONTROLLED_UPLOAD_ROLLBACK_HEADER = 'X-ReversR-CAD-Controlled-Upload-Rollback'/.test(router)
    && /CONTROLLED_UPLOAD_COMMAND_CARD_HEADER = 'X-ReversR-CAD-Controlled-Command-Card-SHA256'/.test(router)
    && /CONTROLLED_UPLOAD_INSTALLATION_HEADER = 'X-ReversR-CAD-Controlled-Installation-SHA256'/.test(router)
    && /setControlledUploadValidationHeaders\(res, bodyGateDecision, cleanupDecision\)/.test(router)
    && /cleanupDecision\?\.code !== 'CONTROLLED_UPLOAD_POST_ROLLBACK_FAIL_CLOSED_SMOKE_PASSED'/.test(router)
    && /if \(!admission\.ok\) return send\(res, admission\.code\);/.test(router)
    && /return send\(res, 'USER_UPLOADS_DISABLED'\);/.test(router);
}

function routeVerifierClockInjectable(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  const testSource =
    readSource('scripts/cad-auth-controlled-upload-observable-gate-wiring-repair.test.js')
      .toString('utf8');
  return /now = Date\.now/.test(router)
    && /createUploadSessionVerifier\(\{ lookupSession: sessionService\.lookupSession, allowedOrigins, now \}\)/.test(router)
    && /createCadUserUploadRouter\(\{[\s\S]*\n\s+now,/.test(testSource)
    && /const now = \(\) => Date\.parse\(APPROVED_CONTROLLED_WINDOW\.proofNowUtc\);/.test(testSource);
}

function routeStillDefaultClosed(readSource = read) {
  const router = readSource('server/cadUserUploadRouter.js').toString('utf8');
  const activation = readSource('server/cadControlledInternalUploadActivation.js').toString('utf8');
  return /const BODY_ADMISSION_AUTHORIZED = false;/.test(router)
    && !/BODY_ADMISSION_AUTHORIZED = true/.test(router)
    && /return send\(res, 'USER_UPLOADS_DISABLED'\);/.test(router)
    && /const CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED = false;/.test(activation);
}

function validatorEnvelopePreserved(readSource = read) {
  const admission = readSource('server/cadUserUploadAdmission.js').toString('utf8');
  const contract = readSource('server/cadWorkerContract.js').toString('utf8');
  return /Object\.keys\(body\)\.sort\(\)\.join\(','\) !== 'contentBase64,fileName,mimeType'/.test(admission)
    && /\['model\/iges', 'application\/iges', 'application\/octet-stream'\]/.test(admission)
    && /LIMITS = Object\.freeze\(\{ inputBytes: 256 \* 1024, jsonBytes: 384 \* 1024/.test(contract)
    && /!\s*\/\\\.\(igs\|iges\)\$\/i\.test\(body\.fileName\)/.test(contract);
}

function expectedPacket(readSource = read) {
  const review = createControlledUploadObservableGateWiringRepairReview();
  return Object.freeze({
    schemaVersion: 1,
    artifact: 'cad-auth-controlled-upload-observable-gate-wiring-repair-packet-v1',
    sourceOnly: true,
    roadmap: 'Phase 7 controlled internal upload activation observable deployed wiring repair',
    status: review.status,
    purpose:
      'repair deployed startup/default route wiring so the controlled internal upload activation mount can emit source-owned observable body-admission proof headers under a later exact live gate',
    boundInputs: Object.freeze({
      stoppedControlledUploadActivationDispositionSha256:
        review.boundStopDisposition.stoppedControlledUploadActivationDispositionSha256,
      approvedControlledActivationRefreshSha256:
        review.boundStopDisposition.approvedControlledActivationRefreshSha256,
      controlledUploadObservableGateProofPacketSha256:
        CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_PACKET_SHA256,
      controlledUploadObservableGateProofSourceCommit:
        CONTROLLED_UPLOAD_OBSERVABLE_GATE_PROOF_SOURCE_COMMIT,
      baseVercelDeployment: BASE_VERCEL_DEPLOYMENT,
      approvedCommandCardSha256: APPROVED_COMMAND_CARD_SHA256,
      approvedInstallationSha256: APPROVED_INSTALLATION_SHA256,
    }),
    review,
    deployedStartupObservableGateWired: deployedStartupObservableGateWired(readSource),
    observableProofHeadersPreserved: observableProofHeadersPreserved(readSource),
    routeVerifierClockInjectable: routeVerifierClockInjectable(readSource),
    routeStillDefaultClosed: routeStillDefaultClosed(readSource),
    validatorEnvelopePreserved: validatorEnvelopePreserved(readSource),
    laterLiveGateRequirements: Object.freeze({
      exactCurrentDeploymentBinding: true,
      exactControlledManifest: true,
      exactCommandCardSha256: true,
      exactInstallationSha256: true,
      oneSessionOneAttemptFence: true,
      rollbackFirstControls: true,
      postRollbackFailClosedSmoke: true,
      observableProofHeaders: true,
      igesOnlyValidatorEnvelope: true,
      requestBodyAdmissionNow: false,
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
  const resolved = packet?.review?.status
    === 'CONTROLLED_UPLOAD_OBSERVABLE_GATE_WIRING_READY_SOURCE_ONLY'
    && packet?.deployedStartupObservableGateWired === true
    && packet?.observableProofHeadersPreserved === true
    && packet?.routeVerifierClockInjectable === true
    && packet?.routeStillDefaultClosed === true
    && packet?.validatorEnvelopePreserved === true
    && packet?.laterLiveGateRequirements?.requestBodyAdmissionNow === false;
  const closed = packet?.authorizes?.productionUploadActivation === false
    && packet?.authorizes?.requestBodyAdmissionOrRead === false
    && packet?.authorizes?.privateCredentialRead === false
    && packet?.authorizes?.uploadSessionIssuance === false
    && packet?.authorizes?.conversionDispatch === false
    && packet?.authorizes?.sandboxDispatch === false
    && packet?.authorizes?.commercialReadinessClaim === false;
  const serialized = JSON.stringify(packet || {});
  const noPrivateLeakage = !/PRIVATE_SENTINEL|CAD_SENTINEL|\/Users\/|\.local\/|private-session-credential/i.test(serialized);
  const ok = matches && resolved && closed && noPrivateLeakage;
  return Object.freeze({
    ok,
    code: ok
      ? 'CAD_AUTH_CONTROLLED_UPLOAD_OBSERVABLE_GATE_WIRING_REPAIR_VALID_SOURCE_ONLY'
      : 'CAD_AUTH_CONTROLLED_UPLOAD_OBSERVABLE_GATE_WIRING_REPAIR_BLOCKED',
    resolved,
    routeStillDefaultClosed: packet?.routeStillDefaultClosed === true,
    deployedStartupObservableGateWired:
      packet?.deployedStartupObservableGateWired === true,
    observableProofHeadersPreserved:
      packet?.observableProofHeadersPreserved === true,
    routeVerifierClockInjectable:
      packet?.routeVerifierClockInjectable === true,
    validatorEnvelopePreserved: packet?.validatorEnvelopePreserved === true,
    productionUploadActivationAuthorized:
      packet?.authorizes?.productionUploadActivation === true,
    requestBodyAdmissionOrReadAuthorized:
      packet?.authorizes?.requestBodyAdmissionOrRead === true,
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
      code: 'CAD_AUTH_CONTROLLED_UPLOAD_OBSERVABLE_GATE_WIRING_REPAIR_CHECKER_ERROR',
      resolved: false,
    }));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  checkPacket,
  deployedStartupObservableGateWired,
  expectedPacket,
  observableProofHeadersPreserved,
  routeVerifierClockInjectable,
  routeStillDefaultClosed,
  sourceBindings,
  validatorEnvelopePreserved,
};
