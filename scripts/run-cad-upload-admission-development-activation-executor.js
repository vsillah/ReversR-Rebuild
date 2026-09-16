#!/usr/bin/env node
const manifest = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationExecutor.json');
const decision = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision.json');
const closeout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const { inspectUploadAdmissionDevelopmentActivationExecutor } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationExecutor');
const { inspectUploadAdmissionDevelopmentActivationDecision } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision');
const { createCadUploadAdmissionRuntimeBridge } = require('../server/cadUploadAdmissionRuntimeBridge');

function emit(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

function inspectionPassed(inspection, required) {
  return required.every(key => inspection?.[key] === true);
}

function syntheticPrincipal() {
  return Object.freeze({
    schemaVersion: 1,
    userId: 'activation-preview-user',
    shopId: 'activation-preview-shop',
    sessionId: 'activation-preview-session',
    cadUploadAllowed: true,
  });
}

async function executeUploadAdmissionDevelopmentActivationPreview({
  manifestConfig = manifest,
  decisionPacket = decision,
  qualificationCloseout = closeout,
  now = () => Date.now(),
} = {}) {
  const manifestInspection = inspectUploadAdmissionDevelopmentActivationExecutor(manifestConfig, decisionPacket);
  const decisionInspection = inspectUploadAdmissionDevelopmentActivationDecision(decisionPacket);
  if (!inspectionPassed(manifestInspection, [
    'structureValid',
    'bindingsValid',
    'boundsClosed',
    'expectedValid',
    'authoritiesClosed',
  ]) || !inspectionPassed(decisionInspection, [
    'structureValid',
    'inputsValid',
    'sourceGuardsValid',
    'boundsValid',
    'authoritiesClosed',
  ])) {
    return {
      decision: 'BLOCKED',
      code: 'DEVELOPMENT_ACTIVATION_EXECUTOR_CONFIG_INVALID',
      previewCompleted: false,
      unknownOutcome: false,
      manifestInspection,
      decisionInspection,
    };
  }
  if (qualificationCloseout?.result?.decision !== 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED') {
    return {
      decision: 'BLOCKED',
      code: 'QUALIFICATION_CLOSEOUT_NOT_ACCEPTED',
      previewCompleted: false,
      unknownOutcome: false,
    };
  }
  let transactionSeen = false;
  const bridge = createCadUploadAdmissionRuntimeBridge({
    enabled: true,
    acceptedWindow: true,
    planTransaction(input) {
      transactionSeen = true;
      return Object.freeze({
        ok: true,
        code: 'SOURCE_ONLY_DEVELOPMENT_ACTIVATION_PREVIEW',
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
        retainedStateDeletionAuthorized: false,
        commandType: input.command?.type,
      });
    },
  });
  const planned = await bridge.planAdmission({
    bodyAdmissionAuthorized: false,
    dryRun: true,
    principal: syntheticPrincipal(),
    snapshot: Object.freeze({
      qualificationEvidenceSha256: decisionPacket.acceptedInputs.qualificationEvidenceSha256,
      publicFixtureSha256: decisionPacket.acceptedInputs.publicFixtureSha256,
    }),
    command: Object.freeze({ type: 'preview-development-upload-activation' }),
    authority: Object.freeze({ maxAllInCostUsd: decisionPacket.futureDevelopmentActivationBounds.maxAllInCostUsd }),
    now: now(),
  });
  if (!transactionSeen || planned?.code !== 'SOURCE_ONLY_DEVELOPMENT_ACTIVATION_PREVIEW') {
    return {
      decision: 'BLOCKED',
      code: 'DEVELOPMENT_ACTIVATION_PREVIEW_FAILED',
      previewCompleted: false,
      unknownOutcome: true,
      planned,
    };
  }
  return Object.freeze({
    schemaVersion: 1,
    decision: manifestConfig.expectedPreview.decision,
    code: planned.code,
    previewCompleted: true,
    activationExecuted: false,
    liveRunStarted: false,
    unknownOutcome: false,
    production: false,
    runtimeMounted: planned.runtimeMounted,
    bodyReadAuthorized: planned.bodyReadAuthorized,
    admissionAuthorized: planned.admissionAuthorized,
    conversionAuthorized: planned.conversionAuthorized,
    sandboxDispatchAuthorized: planned.sandboxDispatchAuthorized,
    storeMutationAuthorized: planned.storeMutationAuthorized,
    terminalCode: manifestConfig.expectedPreview.terminalCode,
    counts: Object.freeze({
      uploadBodiesRead: 0,
      conversionDispatches: 0,
      sandboxDispatches: 0,
      storeMutations: 0,
    }),
    flags: Object.freeze({
      productionUploadActivationAuthorized: false,
      developmentRunAuthorized: false,
      privateCadAuthorized: false,
      realUserAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }),
  });
}

async function main() {
  if (process.argv.includes('--preflight')) {
    emit({
      status: 'READY_SOURCE_ONLY_PREVIEW',
      sourceOnly: true,
      liveRunAuthorized: false,
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    });
    return;
  }
  const result = await executeUploadAdmissionDevelopmentActivationPreview();
  emit(result, result.previewCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_UPLOAD_ADMISSION_DEVELOPMENT_ACTIVATION_PREVIEW_FAILED', message: error.message }, 1);
  });
}

module.exports = { executeUploadAdmissionDevelopmentActivationPreview };
