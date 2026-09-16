#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const rebind = require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind.json');
const rollover = require('../offline/cad-convex/uploadAdmissionActivationWindowRollover.json');
const refresh = require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json');
const closeout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const readiness = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
const { inspectUploadAdmissionActivationRunnerRebind } =
  require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind');
const { executeUploadAdmissionMountedDevelopmentWindow } =
  require('./run-cad-upload-admission-mounted-development-window');

const root = path.resolve(__dirname, '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function emit(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

function writeJson600(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function compatibilityBridge() {
  return Object.freeze({
    schemaVersion: 1,
    mode: 'source-only-cad-upload-admission-mounted-development-executor-bridge',
    status: 'MOUNTED_DEVELOPMENT_UPLOAD_EXECUTOR_BRIDGE_READY_SOURCE_ONLY',
    sourceOnly: true,
    baseMainCommit: '816c773a128a3d44ba26ce54227fa45be1db8d1b',
    acceptedWindow: Object.freeze({
      source: rebind.acceptedRollover.source,
      sourcePr: rebind.acceptedRollover.sourcePr,
      windowMergeCommit: rebind.acceptedRollover.rolloverMergeCommit,
      runRef: rebind.acceptedWindow.runRef,
      startUtc: rebind.acceptedWindow.startUtc,
      expiresUtc: rebind.acceptedWindow.expiresUtc,
      maxRunSeconds: rebind.acceptedWindow.maxRunSeconds,
    }),
    acceptedReadiness: Object.freeze({
      source: 'offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json',
      bodyAdmissionEvidenceSha256: readiness.acceptedBodyAdmissionCloseout.evidenceSha256,
      bodyAdmissionReceiptSha256: readiness.acceptedBodyAdmissionCloseout.receiptSha256,
      publicFixtureSha256: rebind.acceptedDecisionRefresh.publicFixtureSha256,
      publicFixtureBytes: rebind.acceptedDecisionRefresh.publicFixtureBytes,
    }),
    routeGate: Object.freeze({
      route: 'POST /api/cad/user-import',
      source: 'server/cadUserUploadRouter.js',
      requiredDisabledLiteral: 'const BODY_ADMISSION_AUTHORIZED = false;',
      sourceLiteralMayFlip: false,
      trackedRouteModified: false,
    }),
    executorCapabilities: Object.freeze({
      mountsDevelopmentRouteHarness: true,
      usesReviewedRouterSource: true,
      sourceLiteralMayFlip: false,
      trackedRouteModified: false,
      preFlightDisabledCheckRequired: true,
      postRunDisabledCheckRequired: true,
      writesSanitizedEvidence: true,
      liveRunAuthorizedByThisPacket: false,
    }),
    runBounds: Object.freeze({
      developmentProject: rebind.runBounds.developmentProject,
      developmentDeployment: rebind.runBounds.developmentDeployment,
      maxAttempts: rebind.runBounds.maxAttempts,
      automaticRetry: rebind.runBounds.automaticRetry,
      secondRun: rebind.runBounds.secondRun,
      stopOnUnknownOutcome: rebind.runBounds.stopOnUnknownOutcome,
      deleteRetainedState: rebind.runBounds.deleteRetainedState,
      allInPlanningCapUsd: rebind.runBounds.allInPlanningCapUsd,
      publicSyntheticFixtureOnly: rebind.runBounds.publicSyntheticFixtureOnly,
      productionUploadActivationAuthorized: false,
      cadConversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      realUsersAuthorized: false,
    }),
    sanitizedEvidenceRequirements: rebind.sanitizedEvidenceDestination,
    expectedFutureResult: Object.freeze({
      ...rebind.expectedFutureResult,
      decision: 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED',
    }),
    authorityPreservedByThisPacket: rebind.authorityPreservedByThisPacket,
  });
}

function compatibilityWindow() {
  return Object.freeze({
    status: 'MOUNTED_DEVELOPMENT_UPLOAD_WINDOW_READY_SOURCE_ONLY',
    acceptedWindow: Object.freeze({
      runRef: rebind.acceptedWindow.runRef,
      startUtc: rebind.acceptedWindow.startUtc,
      expiresUtc: rebind.acceptedWindow.expiresUtc,
    }),
    sanitizedEvidenceDestination: rebind.sanitizedEvidenceDestination,
    routeGate: Object.freeze({ requiredDisabledLiteral: 'const BODY_ADMISSION_AUTHORIZED = false;' }),
    runBounds: Object.freeze({
      maxAttempts: rebind.runBounds.maxAttempts,
      automaticRetry: rebind.runBounds.automaticRetry,
      secondRun: rebind.runBounds.secondRun,
    }),
  });
}

async function executeUploadActivationExactWindow({
  rebindConfig = rebind,
  exactWindowConfig = rollover,
  refreshConfig = refresh,
  closeoutConfig = closeout,
  readinessConfig = readiness,
  now = Date.now,
  writeEvidence = true,
} = {}) {
  const inspected = inspectUploadAdmissionActivationRunnerRebind(
    rebindConfig,
    exactWindowConfig,
    refreshConfig,
    closeoutConfig,
  );
  if (!inspected.readyForWindowExecution) {
    return {
      decision: 'BLOCKED',
      code: 'UPLOAD_ACTIVATION_RUNNER_REBIND_CONFIG_INVALID',
      runCompleted: false,
      unknownOutcome: false,
      inspected,
    };
  }
  const result = await executeUploadAdmissionMountedDevelopmentWindow({
    bridgeConfig: compatibilityBridge(),
    windowConfig: compatibilityWindow(),
    readinessConfig,
    now,
    writeEvidence: false,
  });
  if (!result.runCompleted) return result;
  const evidence = Object.freeze({
    schemaVersion: 1,
    mode: 'cad-upload-activation-exact-window-sanitized-evidence',
    decision: rebindConfig.expectedFutureResult.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: rebindConfig.acceptedWindow.runRef,
    acceptedWindow: Object.freeze({
      startUtc: rebindConfig.acceptedWindow.startUtc,
      expiresUtc: rebindConfig.acceptedWindow.expiresUtc,
      maxRunSeconds: rebindConfig.acceptedWindow.maxRunSeconds,
    }),
    production: false,
    fixture: result.fixture,
    counts: result.counts,
    flags: result.flags,
    terminalCode: result.terminalCode,
    bodyAdmissionValidated: result.bodyAdmissionValidated,
    sourceOnlyRunnerRebind: rebindConfig.acceptedRollover.rolloverMergeCommit,
    recordsContentBase64: false,
    recordsRawCredential: false,
    recordsPrivateCad: false,
    completedAtUtc: result.completedAtUtc,
  });
  if (!writeEvidence) return evidence;
  const destination = path.join(root, rebindConfig.sanitizedEvidenceDestination.root);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const evidencePath = path.join(destination, rebindConfig.sanitizedEvidenceDestination.evidence);
  const receiptPath = path.join(destination, rebindConfig.sanitizedEvidenceDestination.receipt);
  writeJson600(evidencePath, evidence);
  const evidenceSha256 = sha(fs.readFileSync(evidencePath));
  writeJson600(receiptPath, {
    schemaVersion: 1,
    mode: 'cad-upload-activation-exact-window-receipt',
    status: evidence.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: rebindConfig.acceptedWindow.runRef,
    evidenceSha256,
    evidencePath: path.relative(root, evidencePath),
    production: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
    automaticRetry: false,
    secondRun: false,
    completedAtUtc: evidence.completedAtUtc,
  });
  return {
    ...evidence,
    evidenceSha256,
    receiptPath: path.relative(root, receiptPath),
  };
}

async function main() {
  if (process.argv.includes('--preflight')) {
    const inspected = inspectUploadAdmissionActivationRunnerRebind(rebind, rollover, refresh, closeout);
    emit({
      status: inspected.readyForWindowExecution ? 'READY_WAITING_FOR_WINDOW' : 'BLOCKED',
      runRef: rebind.acceptedWindow.runRef,
      windowStartUtc: rebind.acceptedWindow.startUtc,
      windowEndUtc: rebind.acceptedWindow.expiresUtc,
      sourceOnly: true,
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }, inspected.readyForWindowExecution ? 0 : 2);
    return;
  }
  const result = await executeUploadActivationExactWindow();
  emit(result, result.runCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_UPLOAD_ACTIVATION_EXACT_WINDOW_FAILED', message: error.message }, 1);
  });
}

module.exports = {
  compatibilityBridge,
  compatibilityWindow,
  executeUploadActivationExactWindow,
};
