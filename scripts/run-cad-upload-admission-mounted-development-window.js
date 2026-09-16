#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { Readable, Writable } = require('node:stream');
const express = require('express');
const bridge = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge.json');
const windowPacket = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json');
const readiness = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
const { inspectUploadAdmissionMountedDevelopmentExecutorBridge } =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentExecutorBridge');
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
  if (!Number.isSafeInteger(parsed)) throw new Error('CAD_MOUNTED_DEVELOPMENT_INVALID_WINDOW');
  return parsed;
}

function materializePublicFixture(config = bridge) {
  let file = path.join(
    root,
    'node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs',
  );
  if (!fs.existsSync(file)) {
    file = path.join(
      path.dirname(require.resolve('occt-import-js/package.json')),
      'test/testfiles/cube-10x10mm/Cube 10x10.igs',
    );
  }
  const bytes = fs.readFileSync(file);
  const digest = sha(bytes);
  if (digest !== config.acceptedReadiness.publicFixtureSha256) {
    throw new Error('CAD_MOUNTED_DEVELOPMENT_FIXTURE_DIGEST_MISMATCH');
  }
  if (bytes.length !== config.acceptedReadiness.publicFixtureBytes) {
    throw new Error('CAD_MOUNTED_DEVELOPMENT_FIXTURE_SIZE_MISMATCH');
  }
  return Object.freeze({
    bytes,
    digest,
    payload: Object.freeze({
      fileName: 'public-cube.igs',
      mimeType: 'model/iges',
      contentBase64: bytes.toString('base64'),
    }),
  });
}

function developmentRouterFactory() {
  const file = require.resolve('../server/cadUserUploadRouter');
  const source = fs.readFileSync(file, 'utf8');
  if (source.split('const BODY_ADMISSION_AUTHORIZED = false;').length !== 2) {
    throw new Error('CAD_MOUNTED_DEVELOPMENT_ROUTE_LITERAL_NOT_UNIQUE');
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
    loginSessionId: 'mounted-development-login',
    userId: 'mounted-development-user',
    shopId: 'mounted-development-shop',
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
  if (!issued.ok) throw new Error('CAD_MOUNTED_DEVELOPMENT_SESSION_ISSUE_FAILED');
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
  const response = await dispatchExpressRequest(app, {
    method: 'POST',
    url: '/api/cad/user-import',
    headers: {
      authorization: `Bearer ${credential}`,
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
    },
    body,
  });
  const payload = JSON.parse(response.body || '{}');
  return { status: response.status, code: payload.code, bodyReads };
}

function dispatchExpressRequest(app, { method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const request = Readable.from(body ? [Buffer.from(body)] : []);
    Object.assign(request, {
      method,
      url,
      originalUrl: url,
      headers,
      complete: true,
      socket: { encrypted: false, remoteAddress: '127.0.0.1' },
      connection: { encrypted: false, remoteAddress: '127.0.0.1' },
    });
    const chunks = [];
    const responseHeaders = new Map();
    const response = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    Object.assign(response, {
      statusCode: 200,
      locals: {},
      setHeader(name, value) {
        responseHeaders.set(name.toLowerCase(), value);
      },
      getHeader(name) {
        return responseHeaders.get(name.toLowerCase());
      },
      getHeaders() {
        return Object.fromEntries(responseHeaders);
      },
      removeHeader(name) {
        responseHeaders.delete(name.toLowerCase());
      },
      writeHead(statusCode, headersOrMessage, maybeHeaders) {
        this.statusCode = statusCode;
        const headersValue = typeof headersOrMessage === 'object' ? headersOrMessage : maybeHeaders;
        if (headersValue) {
          for (const [name, value] of Object.entries(headersValue)) this.setHeader(name, value);
        }
        return this;
      },
      end(chunk, encoding, callback) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        Writable.prototype.end.call(this, callback);
        resolve({
          status: this.statusCode,
          headers: this.getHeaders(),
          body: Buffer.concat(chunks).toString('utf8'),
        });
        return this;
      },
    });
    app.handle(request, response, error => {
      if (error) reject(error);
      else if (!response.writableEnded) {
        reject(new Error('CAD_MOUNTED_DEVELOPMENT_REQUEST_NOT_HANDLED'));
      }
    });
  });
}

async function executeUploadAdmissionMountedDevelopmentWindow({
  bridgeConfig = bridge,
  windowConfig = windowPacket,
  readinessConfig = readiness,
  now = Date.now,
  writeEvidence = true,
} = {}) {
  const inspected = inspectUploadAdmissionMountedDevelopmentExecutorBridge(
    bridgeConfig,
    windowConfig,
    readinessConfig,
  );
  if (!inspected.readyForMountedDevelopmentRun) {
    return {
      decision: 'BLOCKED',
      code: 'MOUNTED_DEVELOPMENT_EXECUTOR_CONFIG_INVALID',
      runCompleted: false,
      unknownOutcome: false,
      inspected,
    };
  }
  const current = now();
  const start = parsedMs(bridgeConfig.acceptedWindow.startUtc);
  const end = parsedMs(bridgeConfig.acceptedWindow.expiresUtc);
  if (current < start || current >= end) {
    return {
      decision: 'BLOCKED',
      code: current < start ? 'WINDOW_NOT_OPEN' : 'WINDOW_EXPIRED',
      runCompleted: false,
      unknownOutcome: false,
      utcNow: new Date(current).toISOString(),
      windowStartUtc: bridgeConfig.acceptedWindow.startUtc,
      windowEndUtc: bridgeConfig.acceptedWindow.expiresUtc,
    };
  }
  const fixture = materializePublicFixture(bridgeConfig);
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
    createRouter: developmentRouterFactory(),
    sessionService,
    credential,
    body: JSON.stringify(fixture.payload),
    countBodyReads: true,
  });
  if (admitted.status !== 503 || admitted.code !== 'USER_UPLOADS_DISABLED' || admitted.bodyReads < 1) {
    return { decision: 'BLOCKED', code: 'MOUNTED_DEVELOPMENT_BODY_ADMISSION_FAILED', runCompleted: false, unknownOutcome: true, admitted };
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
    decision: bridgeConfig.expectedFutureResult.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: bridgeConfig.acceptedWindow.runRef,
    acceptedWindow: Object.freeze({
      startUtc: bridgeConfig.acceptedWindow.startUtc,
      expiresUtc: bridgeConfig.acceptedWindow.expiresUtc,
      maxRunSeconds: bridgeConfig.acceptedWindow.maxRunSeconds,
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
      mountedDevelopmentBodyValidationChecks: 1,
      uploadBodiesRead: admitted.bodyReads,
      conversionDispatches: 0,
      sandboxDispatches: 0,
      storeMutations: 0,
    }),
    flags: Object.freeze({
      productionUploadActivationAuthorized: false,
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
  const destination = path.join(root, bridgeConfig.sanitizedEvidenceRequirements.root);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const evidencePath = path.join(destination, bridgeConfig.sanitizedEvidenceRequirements.evidence);
  const receiptPath = path.join(destination, bridgeConfig.sanitizedEvidenceRequirements.receipt);
  writeJson600(evidencePath, evidence);
  const evidenceSha256 = sha(fs.readFileSync(evidencePath));
  writeJson600(receiptPath, {
    schemaVersion: 1,
    mode: 'cad-upload-admission-mounted-development-receipt',
    status: evidence.decision,
    runCompleted: true,
    unknownOutcome: false,
    runRef: bridgeConfig.acceptedWindow.runRef,
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
    const inspected = inspectUploadAdmissionMountedDevelopmentExecutorBridge(bridge, windowPacket, readiness);
    emit({
      status: inspected.readyForMountedDevelopmentRun ? 'READY_WAITING_FOR_WINDOW' : 'BLOCKED',
      runRef: bridge.acceptedWindow.runRef,
      windowStartUtc: bridge.acceptedWindow.startUtc,
      windowEndUtc: bridge.acceptedWindow.expiresUtc,
      sourceOnly: true,
      productionUploadActivationAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadAuthorized: false,
      automaticRetry: false,
      secondRun: false,
    }, inspected.readyForMountedDevelopmentRun ? 0 : 2);
    return;
  }
  const result = await executeUploadAdmissionMountedDevelopmentWindow();
  emit(result, result.runCompleted ? 0 : 2);
}

if (require.main === module) {
  main().catch(error => {
    emit({ status: 'BLOCKED', code: 'CAD_MOUNTED_DEVELOPMENT_EXECUTOR_FAILED', message: error.message }, 1);
  });
}

module.exports = {
  executeUploadAdmissionMountedDevelopmentWindow,
  developmentRouterFactory,
  materializePublicFixture,
};
