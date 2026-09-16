#!/usr/bin/env node
const windowPacket = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow.json');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json');
const bodyPacket = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionWindow } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionWindow');
const { executeUploadAdmissionDevelopmentBodyAdmission } =
  require('./run-cad-upload-admission-development-body-admission-executor');

function emit(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

async function executeUploadAdmissionDevelopmentBodyAdmissionWindow({
  windowConfig = windowPacket,
  executorConfig = executor,
  bodyPacketConfig = bodyPacket,
  now = Date.now,
  writeEvidence = true,
} = {}) {
  const inspected = inspectUploadAdmissionDevelopmentBodyAdmissionWindow(
    windowConfig,
    executorConfig,
    bodyPacketConfig,
  );
  if (!inspected.readyForAutopilotDevelopmentBodyAdmissionRun) {
    return {
      decision: 'BLOCKED',
      code: 'DEVELOPMENT_BODY_ADMISSION_WINDOW_CONFIG_INVALID',
      runCompleted: false,
      unknownOutcome: false,
      inspected,
    };
  }
  return executeUploadAdmissionDevelopmentBodyAdmission({
    executorConfig,
    acceptedWindow: windowConfig.acceptedWindow,
    now,
    writeEvidence,
  });
}

async function main() {
  if (process.argv.includes('--preflight')) {
    const inspected = inspectUploadAdmissionDevelopmentBodyAdmissionWindow(windowPacket, executor, bodyPacket);
    emit({
      status: inspected.readyForAutopilotDevelopmentBodyAdmissionRun
        ? 'READY_WAITING_FOR_WINDOW'
        : 'BLOCKED',
      runRef: windowPacket.acceptedWindow.runRef,
      windowStartUtc: windowPacket.acceptedWindow.startUtc,
      windowEndUtc: windowPacket.acceptedWindow.expiresUtc,
      sourceOnly: true,
      productionUploadActivationAuthorized: false,
      mountedProductionBodyAdmissionAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }, inspected.readyForAutopilotDevelopmentBodyAdmissionRun ? 0 : 2);
    return;
  }
  const result = await executeUploadAdmissionDevelopmentBodyAdmissionWindow();
  emit(result, result.runCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_BODY_ADMISSION_WINDOW_RUNNER_FAILED', message: error.message }, 1);
  });
}

module.exports = { executeUploadAdmissionDevelopmentBodyAdmissionWindow };
