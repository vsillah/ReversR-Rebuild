#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const express = require('express');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json');
const packet = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
const activationCloseout = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json');
const qualificationCloseout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionExecutor } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } =
  require('../server/uploadSessionStore');

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

function parsedMs(value) {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) throw new Error('CAD_BODY_ADMISSION_INVALID_WINDOW');
  return parsed;
}

function validAcceptedWindow(window) {
  return window && typeof window === 'object' && !Array.isArray(window)
    && typeof window.runRef === 'string'
    && typeof window.startUtc === 'string'
    && typeof window.expiresUtc === 'string'
    && Number.isSafeInteger(window.maxRunSeconds)
    && typeof window.evidenceRoot === 'string'
    && window.evidenceRoot.startsWith('.local/cad-convex/upload-admission-development-body-admission-');
}

function materializePublicFixture(packetConfig = packet) {
  const file = path.join(
    root,
    'node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs',
  );
  const bytes = fs.readFileSync(file);
  const digest = sha(bytes);
  if (digest !== packetConfig.acceptedInputs.publicFixtureSha256) {
    throw new Error('CAD_BODY_ADMISSION_FIXTURE_DIGEST_MISMATCH');
  }
  if (bytes.length !== packetConfig.acceptedInputs.publicFixtureBytes) {
    throw new Error('CAD_BODY_ADMISSION_FIXTURE_SIZE_MISMATCH');
  }
  return Object.freeze({
    file,
    bytes,
    digest,
    payload: Object.freeze({
      fileName: 'public-cube.igs',
      mimeType: 'model/iges',
      contentBase64: bytes.toString('base64'),
    }),
  });
}

function isolatedRouterFactory() {
  const file = require.resolve('../server/cadUserUploadRouter');
  const source = fs.readFileSync(file, 'utf8');
  if (source.split('const BODY_ADMISSION_AUTHORIZED = false;').length !== 2) {
    throw new Error('CAD_BODY_ADMISSION_ROUTE_LITERAL_NOT_UNIQUE');
  }
  const context = { module: { exports: {} }, require: createRequire(file) };
  vm.runInNewContext(
    source.replace('const BODY_ADMISSION_AUTHORIZED = false;', 'const BODY_ADMISSION_AUTHORIZED = true;'),
    context,
  );
  return context.module.exports.createCadUserUploadRouter;
}

async function issueSyntheticSession() {
  const grant = Object.freeze({
    loginSessionId: 'body-admission-login',
    userId: 'body-admission-user',
    shopId: 'body-admission-shop',
    authMethod: 'password',
    cadUploadAllowed: true,
    expiresAt: Date.now() + 60000,
  });
  const sessionService = createUploadSessionService({
    store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async () => grant,
    refreshAuthorization: async () => grant,
  });
  const issued = await sessionService.issueSession(null);
  if (!issued.ok) throw new Error('CAD_BODY_ADMISSION_SESSION_ISSUE_FAILED');
  return { sessionService, credential: issued.credential };
}

async function requestUserImport({ createRouter, sessionService, credential, body, countBodyReads = false }) {
  let bodyReads = 0;
  const app = express();
  if (countBodyReads) {
    app.use((req, _res, next) => {
      const on = req.on;
      req.on = function(event, ...args) {
        if (event === 'data') bodyReads += 1;
        return on.call(this, event, ...args);
      };
      next();
    });
  }
  app.use('/api/cad', createRouter({ sessionService }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        'content-type': 'application/json',
      },
      body,
    });
    const payload = await response.json();
    return { status: response.status, code: payload.code, bodyReads };
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

async function executeUploadAdmissionDevelopmentBodyAdmission({
  executorConfig = executor,
  packetConfig = packet,
  activationCloseoutConfig = activationCloseout,
  qualificationCloseoutConfig = qualificationCloseout,
  acceptedWindow = executorConfig.acceptedWindow,
  now = Date.now,
  writeEvidence = true,
} = {}) {
  const inspected = inspectUploadAdmissionDevelopmentBodyAdmissionExecutor(
    executorConfig,
    packetConfig,
    activationCloseoutConfig,
    qualificationCloseoutConfig,
  );
  if (!inspected.readyForSourceMerge) {
    return {
      decision: 'BLOCKED',
      code: 'DEVELOPMENT_BODY_ADMISSION_EXECUTOR_CONFIG_INVALID',
      runCompleted: false,
      unknownOutcome: false,
      inspected,
    };
  }
  if (!validAcceptedWindow(acceptedWindow)) {
    return {
      decision: 'BLOCKED',
      code: 'BODY_ADMISSION_WINDOW_NOT_ACCEPTED',
      runCompleted: false,
      unknownOutcome: false,
      liveRunAuthorizedByThisPacket: false,
    };
  }
  const current = now();
  const start = parsedMs(acceptedWindow.startUtc);
  const end = parsedMs(acceptedWindow.expiresUtc);
  if (current < start || current >= end) {
    return {
      decision: 'BLOCKED',
      code: current < start ? 'WINDOW_NOT_OPEN' : 'WINDOW_EXPIRED',
      runCompleted: false,
      unknownOutcome: false,
      utcNow: new Date(current).toISOString(),
      windowStartUtc: acceptedWindow.startUtc,
      windowEndUtc: acceptedWindow.expiresUtc,
    };
  }
  const fixture = materializePublicFixture(packetConfig);
  const { sessionService, credential } = await issueSyntheticSession();
  const defaultRouter = require('../server/cadUserUploadRouter').createCadUserUploadRouter;
  const malformed = JSON.stringify({ ...fixture.payload, contentBase64: 'SENTINEL_NOT_VALID_BASE64' });
  const pre = await requestUserImport({
    createRouter: defaultRouter,
    sessionService,
    credential,
    body: malformed,
    countBodyReads: true,
  });
  if (pre.status !== 503 || pre.code !== 'USER_UPLOADS_DISABLED' || pre.bodyReads !== 0) {
    return { decision: 'BLOCKED', code: 'PREFLIGHT_ROUTE_NOT_DISABLED', runCompleted: false, unknownOutcome: true, pre };
  }
  const admitted = await requestUserImport({
    createRouter: isolatedRouterFactory(),
    sessionService,
    credential,
    body: JSON.stringify(fixture.payload),
    countBodyReads: true,
  });
  if (admitted.status !== 503 || admitted.code !== 'USER_UPLOADS_DISABLED' || admitted.bodyReads < 1) {
    return { decision: 'BLOCKED', code: 'ISOLATED_BODY_ADMISSION_FAILED', runCompleted: false, unknownOutcome: true, admitted };
  }
  const post = await requestUserImport({
    createRouter: defaultRouter,
    sessionService,
    credential,
    body: malformed,
    countBodyReads: true,
  });
  if (post.status !== 503 || post.code !== 'USER_UPLOADS_DISABLED' || post.bodyReads !== 0) {
    return { decision: 'BLOCKED', code: 'POSTCHECK_ROUTE_NOT_DISABLED', runCompleted: false, unknownOutcome: true, post };
  }
  const evidence = Object.freeze({
    schemaVersion: 1,
    decision: executorConfig.expectedFutureResult.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: acceptedWindow.runRef,
    acceptedWindow: Object.freeze({
      startUtc: acceptedWindow.startUtc,
      expiresUtc: acceptedWindow.expiresUtc,
      maxRunSeconds: acceptedWindow.maxRunSeconds,
    }),
    production: false,
    fixture: Object.freeze({
      id: 'public-cube',
      sha256: fixture.digest,
      bytes: fixture.bytes.length,
      privateCad: false,
    }),
    counts: Object.freeze({
      mountedRouteDisabledChecks: 2,
      isolatedRouteBodyValidationChecks: 1,
      uploadBodiesRead: admitted.bodyReads,
      conversionDispatches: 0,
      sandboxDispatches: 0,
      storeMutations: 0,
    }),
    flags: Object.freeze({
      productionUploadActivationAuthorized: false,
      productionBodyAdmissionAuthorized: false,
      cadUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      realUserAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }),
    terminalCode: admitted.code,
    bodyAdmissionValidated: true,
    recordsContentBase64: false,
    recordsRawCredential: false,
    recordsPrivateCad: false,
    completedAtUtc: new Date(current).toISOString(),
  });
  if (!writeEvidence) return evidence;
  const destination = path.join(root, acceptedWindow.evidenceRoot);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const evidencePath = path.join(destination, executorConfig.sanitizedEvidenceRequirements.evidence);
  const receiptPath = path.join(destination, executorConfig.sanitizedEvidenceRequirements.receipt);
  writeJson600(evidencePath, evidence);
  const evidenceSha256 = sha(fs.readFileSync(evidencePath));
  writeJson600(receiptPath, {
    schemaVersion: 1,
    mode: 'cad-upload-admission-development-body-admission-receipt',
    status: evidence.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: acceptedWindow.runRef,
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
    const inspected = inspectUploadAdmissionDevelopmentBodyAdmissionExecutor(
      executor,
      packet,
      activationCloseout,
      qualificationCloseout,
    );
    emit({
      status: inspected.readyForSourceMerge ? 'READY_SOURCE_ONLY_NEEDS_ACCEPTED_WINDOW' : 'BLOCKED',
      sourceOnly: true,
      exactFutureWindowRequired: true,
      liveRunAuthorizedByThisPacket: false,
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }, inspected.readyForSourceMerge ? 0 : 2);
    return;
  }
  const result = await executeUploadAdmissionDevelopmentBodyAdmission();
  emit(result, result.runCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_BODY_ADMISSION_EXECUTOR_FAILED', message: error.message }, 1);
  });
}

module.exports = {
  executeUploadAdmissionDevelopmentBodyAdmission,
  isolatedRouterFactory,
  materializePublicFixture,
};
