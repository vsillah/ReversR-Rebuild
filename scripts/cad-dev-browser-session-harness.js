#!/usr/bin/env node
const express = require('express');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const { createCadDevAuthSessionIssuerBridge } = require('../server/cadDevAuthSessionIssuerBridge');
const { createCadDevAuthSessionIssuerRouter } = require('../server/cadDevAuthSessionIssuerRouter');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const { createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { createCadUploadSessionAdapter } = require('../utils/cadUserImportBridge');

const origin = 'https://synthetic-browser.example.invalid';
const authorization = 'Bearer synthetic-browser-login';
const digest = value => createHash('sha256').update(value).digest('hex');

function createSyntheticDevelopmentBridge({ now = Date.now } = {}) {
  let login = {
    userId: 'synthetic-browser-user',
    shopId: 'synthetic-browser-shop',
    loginSessionId: 'synthetic-browser-login',
    authMethod: 'password',
    cadUploadAllowed: true,
    expiresAt: now() + 60000,
  };
  let resolveCalls = 0;
  const store = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const bridge = createCadDevAuthSessionIssuerBridge({
    enabled: true,
    environment: 'development',
    origin,
    store,
    now,
    resolveAuthorization: async context => {
      resolveCalls++;
      if (!Object.isFrozen(context.headers)) throw new Error('HEADERS_NOT_FROZEN');
      return context.headers.authorization === authorization ? login : null;
    },
    refreshAuthorization: async principal => (
      principal.loginSessionId === login?.loginSessionId ? login : null
    ),
  });
  return Object.freeze({
    bridge,
    store,
    origin,
    authorization,
    revokeLogin: () => { login = null; },
    get resolveCalls() { return resolveCalls; },
  });
}

async function startBrowserSessionHarnessServer({ issuerBridge, uploadOptions } = {}) {
  let bodyReads = 0;
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
  app.use('/api/cad', createCadDevAuthSessionIssuerRouter({ issuerBridge }));
  if (uploadOptions) app.use('/api/cad', createCadUserUploadRouter(uploadOptions));
  app.use((req, res) => res.status(404).set('Cache-Control', 'no-store').json({
    schemaVersion: 1,
    status: 'error',
    code: 'NOT_FOUND',
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return Object.freeze({
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    get bodyReads() { return bodyReads; },
    async close() {
      server.closeAllConnections();
      server.close();
      await once(server, 'close').catch(() => {});
    },
  });
}

async function runBrowserSessionHarness({ now = Date.now, fetchImpl = fetch } = {}) {
  const synthetic = createSyntheticDevelopmentBridge({ now });
  const server = await startBrowserSessionHarnessServer({
    issuerBridge: synthetic.bridge,
    uploadOptions: {
      sessionService: synthetic.bridge,
      allowedOrigins: [synthetic.origin],
      corsOrigins: [synthetic.origin],
    },
  });
  let cookieHeader = null;
  try {
    const adapter = createCadUploadSessionAdapter({
      now,
      issue: async ({ signal }) => {
        const response = await fetchImpl(`${server.baseUrl}/api/cad/dev-upload-session`, {
          method: 'POST',
          signal,
          headers: {
            Origin: synthetic.origin,
            Authorization: synthetic.authorization,
            'Content-Type': 'application/json',
          },
          body: '{"sentinel":"body-must-not-be-read"}',
        });
        cookieHeader = response.headers.get('set-cookie');
        return response.json();
      },
    });
    const session = await adapter.connect();
    if (session.code !== 'SESSION_READY') {
      return sanitized('DEVELOPMENT_BROWSER_SESSION_HARNESS_STOPPED', {
        sessionCode: session.code,
        bodyReads: server.bodyReads,
      });
    }
    const cookiePair = cookieHeader.split(';')[0];
    const upload = await fetchImpl(`${server.baseUrl}/api/cad/user-import`, {
      method: 'POST',
      headers: {
        Origin: synthetic.origin,
        Cookie: cookiePair,
        'X-Upload-CSRF': session.session.csrfToken,
        'Content-Type': 'application/json',
      },
      body: '{"sentinel":"upload-body-must-not-be-read"}',
    });
    const uploadPayload = await upload.json();
    return sanitized('DEVELOPMENT_BROWSER_SESSION_HARNESS_PASSED', {
      sessionCode: session.code,
      sessionCanSubmit: session.canSubmit,
      issuerStatus: 200,
      uploadStatus: upload.status,
      uploadCode: uploadPayload.code,
      uploadAdmissionOpened: uploadPayload.code !== 'USER_UPLOADS_DISABLED',
      cookieIssued: /^__Host-reversr-upload-session=us1\.[A-Za-z0-9_-]{43}/.test(cookieHeader || ''),
      cookieDigest: digest(cookiePair),
      cookieValueRecorded: false,
      csrfTokenRecorded: false,
      resolveCalls: synthetic.resolveCalls,
      bodyReads: server.bodyReads,
    });
  } finally {
    await server.close();
  }
}

function sanitized(status, extra = {}) {
  return Object.freeze({
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-harness',
    status,
    sourceOnly: true,
    production: false,
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    sandboxDispatchAllowed: false,
    privateCadUsed: false,
    realUsersUsed: false,
    providerMutationAuthorized: false,
    resourceMutationAuthorized: false,
    envMutationAuthorized: false,
    usageBillingChangeAuthorized: false,
    retry: false,
    secondRun: false,
    ...extra,
  });
}

if (require.main === module) {
  runBrowserSessionHarness().then(result => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== 'DEVELOPMENT_BROWSER_SESSION_HARNESS_PASSED') process.exitCode = 1;
  }).catch(error => {
    process.stderr.write(`${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  createSyntheticDevelopmentBridge,
  startBrowserSessionHarnessServer,
  runBrowserSessionHarness,
};
