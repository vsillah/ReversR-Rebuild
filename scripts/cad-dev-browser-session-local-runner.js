#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  falseAuthorityKeys,
  validateRunBinding,
  assertPrivateBindingFile,
} = require('./cad-dev-browser-session-runner-binding');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };

function parseBindingFile(bindingFile) {
  const resolved = path.resolve(bindingFile);
  assertPrivateBindingFile(resolved);
  const bytes = fs.readFileSync(resolved);
  const binding = JSON.parse(bytes.toString('utf8'));
  const validated = validateRunBinding(binding);
  return { bindingFile: resolved, bytes, binding, validated, bindingSha256: sha256(bytes) };
}

function assertLocalLoopbackBinding(binding, validated) {
  const target = binding.target || {};
  if (target.kind !== 'local-loopback-https') fail('LOCAL_RUNNER_TARGET_KIND_INVALID');
  const parsed = new URL(validated.origin);
  if (parsed.protocol !== 'https:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    fail('LOCAL_RUNNER_TARGET_NOT_LOOPBACK_HTTPS');
  }
  return {
    origin: parsed.origin,
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || '443', 10),
    route: target.exactBrowserRoute,
  };
}

function buildLocalRunnerPlan(bindingFile, { generatedAtUtc = 'source-review' } = {}) {
  const { bytes, binding, validated } = parseBindingFile(bindingFile);
  const target = assertLocalLoopbackBinding(binding, validated);
  const bindingSha256 = sha256(bytes);
  return Object.freeze({
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-local-runner-plan',
    status: 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED',
    sourceOnly: true,
    generatedAtUtc,
    runId: binding.runId,
    sourceCommit: binding.sourceCommit,
    bindingSha256,
    target,
    window: {
      startUtc: binding.window.startUtc,
      endUtc: binding.window.endUtc,
    },
    packet: {
      markdownSha256: binding.packet.markdownSha256,
      jsonSha256: binding.packet.jsonSha256,
    },
    guards: {
      bindingMustRemainMode0600: true,
      bindingDirectoryMustRemainMode0700: true,
      exactBindingSha256Required: bindingSha256,
      exactSourceCommitRequired: binding.sourceCommit,
      exactAcceptanceReceiptRequired: true,
      liveRunAuthorizedNow: false,
      maxIssuerRequests: binding.limits.maxIssuerRequests,
      maxDisabledUploadRequests: binding.limits.maxDisabledUploadRequests,
      requestBodyBytes: binding.limits.requestBodyBytes,
      bodyReads: binding.limits.bodyReads,
      retry: binding.limits.retry,
      secondRun: binding.limits.secondRun,
      redirects: binding.limits.redirects,
    },
    executionPlan: [
      'validate the private run binding and exact source commit',
      'require a separate explicit one-run approval before any browser opens',
      'start only the run-owned local HTTPS target described by the binding',
      'open one fresh Chromium context with persistent profile, extensions and service workers disabled',
      'issue at most one bodyless synthetic session request',
      'attempt at most one disabled upload-route request without a request body',
      'write sanitized local evidence and stop on any unknown outcome',
    ],
    authority: Object.freeze(Object.fromEntries(falseAuthorityKeys.map(key => [key, false]))),
  });
}

function assertAcceptance(bindingFile, bindingSha256, acceptedBindingSha256, acceptedReceiptSha256) {
  if (bindingSha256 !== acceptedBindingSha256) fail('ACCEPTED_BINDING_SHA_MISMATCH');
  if (!/^[a-f0-9]{64}$/.test(acceptedReceiptSha256 || '')) fail('ACCEPTANCE_RECEIPT_SHA_INVALID');
  const receiptFile = path.join(path.dirname(bindingFile), 'local-binding-acceptance-receipt.json');
  assertPrivateBindingFile(receiptFile);
  const receiptBytes = fs.readFileSync(receiptFile);
  if (sha256(receiptBytes) !== acceptedReceiptSha256) fail('ACCEPTANCE_RECEIPT_SHA_MISMATCH');
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  if (receipt.status !== 'ACCEPTED_LOCAL_LOOPBACK_BINDING_SOURCE_ONLY'
    || receipt.bindingSha256 !== bindingSha256
    || receipt.liveRunAuthorized !== false
    || receipt.uploadActivation !== false
    || receipt.bodyAdmission !== false
    || receipt.conversion !== false
    || receipt.sandboxDispatch !== false
    || receipt.privateCad !== false
    || receipt.realUsers !== false
    || receipt.retry !== false
    || receipt.secondRun !== false) {
    fail('ACCEPTANCE_RECEIPT_INVALID');
  }
}

function assertRunWindowOpen(binding, nowMs) {
  const start = Date.parse(binding.window.startUtc);
  const end = Date.parse(binding.window.endUtc);
  if (!Number.isSafeInteger(nowMs) || nowMs < start || nowMs >= end) fail('RUN_WINDOW_CLOSED');
}

async function startLocalHttpsServer({ binding, target, now = Date.now }) {
  const https = require('node:https');
  const express = require('express');
  const { once } = require('node:events');
  const { createCadDevAuthSessionIssuerBridge } = require('../server/cadDevAuthSessionIssuerBridge');
  const { createCadDevAuthSessionIssuerRouter } = require('../server/cadDevAuthSessionIssuerRouter');
  const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
  const { createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');

  const runDir = path.dirname(binding.bindingFile);
  const keyFile = path.join(runDir, 'tls/local-loopback.key');
  const certFile = path.join(runDir, 'tls/local-loopback.crt');
  const key = fs.readFileSync(keyFile);
  const cert = fs.readFileSync(certFile);
  if (sha256(key) !== binding.target.tls.privateKeySha256
    || sha256(cert) !== binding.target.tls.certificateSha256) fail('LOCAL_TLS_DIGEST_MISMATCH');

  let bodyReads = 0;
  let resolveCalls = 0;
  const authorizationToken = crypto.randomBytes(32).toString('base64url');
  const app = express();
  app.use((req, _res, next) => {
    const on = req.on;
    req.on = function (event, ...args) {
      if (event === 'data' || event === 'readable') {
        bodyReads++;
        throw new Error('CAD_BODY_READ_FORBIDDEN');
      }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', {
      get() {
        bodyReads++;
        throw new Error('CAD_BODY_READ_FORBIDDEN');
      },
    });
    next();
  });
  const store = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const bridge = createCadDevAuthSessionIssuerBridge({
    enabled: true,
    environment: 'development',
    origin: target.origin,
    store,
    now,
    resolveAuthorization: async context => {
      resolveCalls++;
      return context.headers.authorization === `Bearer ${authorizationToken}` ? {
        userId: `${binding.runId}-user`,
        shopId: `${binding.runId}-shop`,
        loginSessionId: `${binding.runId}-login`,
        authMethod: 'password',
        cadUploadAllowed: true,
        expiresAt: now() + 60000,
      } : null;
    },
    refreshAuthorization: async principal => ({
      userId: principal.userId,
      shopId: principal.shopId,
      loginSessionId: principal.loginSessionId,
      authMethod: 'password',
      cadUploadAllowed: true,
      expiresAt: now() + 60000,
    }),
  });
  app.get(target.route, (_req, res) => {
    res.set('Cache-Control', 'no-store').type('html').send('<!doctype html><title>CAD Browser Qualification</title>');
  });
  app.use('/api/cad', createCadDevAuthSessionIssuerRouter({ issuerBridge: bridge }));
  app.use('/api/cad', createCadUserUploadRouter({
    sessionService: bridge,
    allowedOrigins: [target.origin],
    corsOrigins: [target.origin],
  }));
  const server = https.createServer({ key, cert }, app);
  server.listen(target.port, target.host);
  await once(server, 'listening');
  return {
    authHeader: `Bearer ${authorizationToken}`,
    get bodyReads() { return bodyReads; },
    get resolveCalls() { return resolveCalls; },
    async close() {
      server.closeAllConnections();
      server.close();
      await once(server, 'close').catch(() => {});
    },
  };
}

async function runChromiumQualification({ target, authHeader }) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    await page.goto(`${target.origin}${target.route}`, { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async authorization => {
      const issuer = await fetch('/api/cad/dev-upload-session', {
        method: 'POST',
        headers: { Authorization: authorization },
      });
      const issuerPayload = await issuer.json();
      const upload = await fetch('/api/cad/user-import', {
        method: 'POST',
        headers: { 'X-Upload-CSRF': issuerPayload.session?.csrfToken || 'missing' },
      });
      const uploadPayload = await upload.json();
      return {
        issuerStatus: issuer.status,
        issuerCode: issuerPayload.status === 'success' ? 'SESSION_READY' : issuerPayload.code,
        uploadStatus: upload.status,
        uploadCode: uploadPayload.code,
      };
    }, authHeader);
    const cookies = await context.cookies(target.origin);
    return { ...result, browserCookiesObserved: cookies.length > 0 };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function executeLocalBrowserQualification(bindingFile, {
  acceptedBindingSha256,
  acceptedReceiptSha256,
  now = Date.now,
  serverStarter = startLocalHttpsServer,
  browserRunner = runChromiumQualification,
} = {}) {
  const parsed = parseBindingFile(bindingFile);
  const target = assertLocalLoopbackBinding(parsed.binding, parsed.validated);
  assertAcceptance(parsed.bindingFile, parsed.bindingSha256, acceptedBindingSha256, acceptedReceiptSha256);
  const current = now();
  assertRunWindowOpen(parsed.binding, current);
  const server = await serverStarter({ binding: { ...parsed.binding, bindingFile: parsed.bindingFile }, target, now });
  try {
    const browserResult = await browserRunner({ binding: parsed.binding, target, authHeader: server.authHeader });
    if (browserResult.issuerStatus !== 200 || browserResult.issuerCode !== 'SESSION_READY') {
      fail('ISSUER_SESSION_CHECK_FAILED');
    }
    if (browserResult.uploadStatus !== 503 || browserResult.uploadCode !== 'USER_UPLOADS_DISABLED') {
      fail('DISABLED_UPLOAD_CHECK_FAILED');
    }
    if (server.bodyReads !== 0) fail('BODY_READ_OBSERVED');
    return {
      schemaVersion: 1,
      mode: 'cad-dev-browser-session-local-runner-evidence',
      status: 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_EXECUTED',
      generatedAtUtc: new Date(current).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      runId: parsed.binding.runId,
      sourceCommit: parsed.binding.sourceCommit,
      bindingSha256: parsed.bindingSha256,
      acceptanceReceiptSha256: acceptedReceiptSha256,
      target: { origin: target.origin, route: target.route },
      runCompleted: true,
      unknownOutcome: false,
      cadUploadsDisabled: true,
      bodyAdmissionAuthorized: false,
      conversionAllowed: false,
      sandboxDispatchAllowed: false,
      privateCadUsed: false,
      realUsersUsed: false,
      retry: false,
      secondRun: false,
      browserCookiesObserved: browserResult.browserCookiesObserved === true,
      operationCounts: {
        issuerRequests: 1,
        disabledUploadRequests: 1,
        resolveAuthorizationCalls: server.resolveCalls,
        bodyReads: server.bodyReads,
      },
      rawAuthorizationRecorded: false,
      rawCookieRecorded: false,
      rawCsrfRecorded: false,
      rawPrivateKeyRecorded: false,
    };
  } finally {
    await server.close();
  }
}

function writeJson600(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--plan') args.plan = argv[++i];
    else if (arg === '--execute-approved-once') args.execute = argv[++i];
    else if (arg === '--binding-sha256') args.acceptedBindingSha256 = argv[++i];
    else if (arg === '--acceptance-receipt-sha256') args.acceptedReceiptSha256 = argv[++i];
    else fail('ARGUMENT_INVALID');
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/cad-dev-browser-session-local-runner.js --plan <binding.json>',
    '  node scripts/cad-dev-browser-session-local-runner.js --execute-approved-once <binding.json> --binding-sha256 <sha256> --acceptance-receipt-sha256 <sha256>',
    '',
    'Execution requires a separate one-run approval naming the exact binding and acceptance receipt digests.',
  ].join('\n');
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      if (args.plan) {
        process.stdout.write(`${JSON.stringify(buildLocalRunnerPlan(args.plan), null, 2)}\n`);
        return;
      }
      if (args.execute) {
        const evidence = await executeLocalBrowserQualification(args.execute, args);
        const runDir = path.dirname(path.resolve(args.execute));
        const evidencePath = path.join(runDir, 'browser-session-sanitized-evidence.json');
        writeJson600(evidencePath, evidence);
        const receipt = {
          schemaVersion: 1,
          mode: 'cad-dev-browser-session-local-runner-receipt',
          status: 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_RECEIPT',
          runId: evidence.runId,
          evidenceSha256: sha256(fs.readFileSync(evidencePath)),
          runCompleted: evidence.runCompleted,
          unknownOutcome: evidence.unknownOutcome,
          retry: false,
          secondRun: false,
        };
        const receiptPath = path.join(runDir, 'browser-session-sanitized-receipt.json');
        writeJson600(receiptPath, receipt);
        process.stdout.write(`${JSON.stringify({ status: evidence.status, evidencePath, receiptPath }, null, 2)}\n`);
        return;
      }
      process.stderr.write(`${usage()}\n`);
      process.exit(1);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  })();
}

module.exports = {
  buildLocalRunnerPlan,
  assertLocalLoopbackBinding,
  executeLocalBrowserQualification,
  startLocalHttpsServer,
  runChromiumQualification,
};
