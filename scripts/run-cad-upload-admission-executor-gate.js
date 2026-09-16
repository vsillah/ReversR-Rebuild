#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const express = require('express');
const gate = require('../offline/cad-convex/uploadAdmissionExecutorGate.json');
const packet = require('../offline/cad-convex/uploadAdmissionExecutionPacket.json');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { inspectUploadAdmissionExecutorGate } = require('../offline/cad-convex/uploadAdmissionExecutorGate');

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

function ms(value) {
  const parsed = Date.parse(value);
  if (!Number.isSafeInteger(parsed)) throw new Error('CAD_UPLOAD_ADMISSION_INVALID_WINDOW');
  return parsed;
}

function materializeFixture(config = gate) {
  const packageRoot = path.dirname(require.resolve(`${config.publicFixtureMaterialization.package}/package.json`));
  const file = path.join(packageRoot, 'test/testfiles/cube-10x10mm/Cube 10x10.igs');
  const bytes = fs.readFileSync(file);
  const digest = sha(bytes);
  if (digest !== config.publicFixtureMaterialization.sha256) {
    throw new Error('CAD_UPLOAD_ADMISSION_FIXTURE_DIGEST_MISMATCH');
  }
  if (bytes.length !== config.publicFixtureMaterialization.bytes) {
    throw new Error('CAD_UPLOAD_ADMISSION_FIXTURE_SIZE_MISMATCH');
  }
  return {
    file,
    bytes,
    payload: {
      fileName: config.publicFixtureMaterialization.fileName,
      mimeType: config.publicFixtureMaterialization.mimeType,
      contentBase64: bytes.toString('base64'),
    },
    digest,
  };
}

function instrumentedRouterFactory() {
  const file = require.resolve('../server/cadUserUploadRouter');
  const source = fs.readFileSync(file, 'utf8');
  if (source.split('const BODY_ADMISSION_AUTHORIZED = false;').length !== 2) {
    throw new Error('CAD_UPLOAD_ADMISSION_ROUTE_LITERAL_NOT_UNIQUE');
  }
  const context = { module: { exports: {} }, require: createRequire(file) };
  vm.runInNewContext(
    source.replace('const BODY_ADMISSION_AUTHORIZED = false;', 'const BODY_ADMISSION_AUTHORIZED = true;'),
    context,
  );
  return context.module.exports.createCadUserUploadRouter;
}

async function issueSyntheticSession() {
  const grant = {
    loginSessionId: 'admission-qualification-login',
    userId: 'admission-qualification-user',
    shopId: 'admission-qualification-shop',
    authMethod: 'password',
    cadUploadAllowed: true,
    expiresAt: Date.now() + 60000,
  };
  const sessionService = createUploadSessionService({
    store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async () => grant,
    refreshAuthorization: async () => grant,
  });
  const issued = await sessionService.issueSession(null);
  if (!issued.ok) throw new Error('CAD_UPLOAD_ADMISSION_SESSION_ISSUE_FAILED');
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

async function executeUploadAdmissionExecutorGate({
  config = gate,
  packetConfig = packet,
  now = Date.now,
  writeEvidence = true,
} = {}) {
  const inspected = inspectUploadAdmissionExecutorGate(config, packetConfig);
  if (!Object.values(inspected).every(Boolean)) {
    return { decision: 'BLOCKED', code: 'EXECUTOR_GATE_CONFIG_INVALID', runCompleted: false, unknownOutcome: false, inspected };
  }
  const current = now();
  const start = ms(config.acceptedWindow.startUtc);
  const end = ms(config.acceptedWindow.expiresUtc);
  if (current < start || current >= end) {
    return {
      decision: 'BLOCKED',
      code: current < start ? 'WINDOW_NOT_OPEN' : 'WINDOW_EXPIRED',
      runCompleted: false,
      unknownOutcome: false,
      utcNow: new Date(current).toISOString(),
      windowStartUtc: config.acceptedWindow.startUtc,
      windowEndUtc: config.acceptedWindow.expiresUtc,
    };
  }
  const fixture = materializeFixture(config);
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
    createRouter: instrumentedRouterFactory(),
    sessionService,
    credential,
    body: JSON.stringify(fixture.payload),
    countBodyReads: true,
  });
  if (admitted.status !== 503 || admitted.code !== 'USER_UPLOADS_DISABLED' || admitted.bodyReads < 1) {
    return { decision: 'BLOCKED', code: 'ISOLATED_BODY_VALIDATION_FAILED', runCompleted: false, unknownOutcome: true, admitted };
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
  const evidence = {
    schemaVersion: 1,
    decision: 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED',
    runCompleted: true,
    unknownOutcome: false,
    runRef: config.acceptedWindow.runRef,
    acceptedWindow: config.acceptedWindow,
    production: false,
    fixture: {
      id: 'cube',
      sha256: fixture.digest,
      bytes: fixture.bytes.length,
      privateCad: false,
    },
    counts: {
      mountedRouteDisabledChecks: 2,
      isolatedRouteBodyValidationChecks: 1,
      uploadBodiesRead: admitted.bodyReads,
      conversionDispatches: 0,
      sandboxDispatches: 0,
      storeMutations: 0,
    },
    flags: {
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      realUserAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    },
    terminalCode: admitted.code,
    uploadBodyValidated: true,
    recordsContentBase64: false,
    recordsRawCredential: false,
    completedAtUtc: new Date(current).toISOString(),
  };
  if (!writeEvidence) return evidence;
  const destination = path.join(root, config.sanitizedEvidenceDestination.root);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const evidencePath = path.join(destination, config.sanitizedEvidenceDestination.evidence);
  const receiptPath = path.join(destination, config.sanitizedEvidenceDestination.receipt);
  writeJson600(evidencePath, evidence);
  const evidenceSha256 = sha(fs.readFileSync(evidencePath));
  const receipt = {
    schemaVersion: 1,
    mode: 'cad-upload-admission-executor-gate-receipt',
    status: evidence.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: config.acceptedWindow.runRef,
    evidenceSha256,
    evidencePath: path.relative(root, evidencePath),
    production: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadAuthorized: false,
    automaticRetry: false,
    secondRun: false,
    completedAtUtc: evidence.completedAtUtc,
  };
  writeJson600(receiptPath, receipt);
  return {
    ...evidence,
    evidenceSha256,
    receiptPath: path.relative(root, receiptPath),
  };
}

async function main() {
  const inspected = inspectUploadAdmissionExecutorGate(gate, packet);
  if (!Object.values(inspected).every(Boolean)) {
    emit({ status: 'BLOCKED', code: 'EXECUTOR_GATE_CONFIG_INVALID', inspected }, 2);
    return;
  }
  if (process.argv.includes('--preflight')) {
    const fixture = materializeFixture(gate);
    emit({
      status: 'READY_WAITING_FOR_WINDOW',
      runRef: gate.acceptedWindow.runRef,
      windowStartUtc: gate.acceptedWindow.startUtc,
      windowEndUtc: gate.acceptedWindow.expiresUtc,
      fixtureSha256: fixture.digest,
      fixtureBytes: fixture.bytes.length,
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    });
    return;
  }
  const result = await executeUploadAdmissionExecutorGate();
  emit(result, result.runCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_UPLOAD_ADMISSION_EXECUTOR_GATE_FAILED', message: error.message }, 1);
  });
}

module.exports = {
  executeUploadAdmissionExecutorGate,
  instrumentedRouterFactory,
  materializeFixture,
};
