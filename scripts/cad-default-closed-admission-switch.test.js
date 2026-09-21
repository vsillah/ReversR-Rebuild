const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const packet = require('../docs/cad-default-closed-admission-switch.json');
const { createCadInternalProductionAdmissionSwitch } = require('../server/cadInternalProductionAdmissionSwitch');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const {
  createUploadSessionService,
  createInMemoryUploadSessionStoreForTests,
} = require('../server/uploadSessionStore');

const root = path.resolve(__dirname, '..');

async function sessionService() {
  const grant = {
    loginSessionId: 'login-switch',
    userId: 'switch-user',
    shopId: 'switch-shop',
    authMethod: 'password',
    cadUploadAllowed: true,
    expiresAt: Date.now() + 60000,
  };
  const service = createUploadSessionService({
    store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async () => grant,
    refreshAuthorization: async () => grant,
  });
  const issued = await service.issueSession(null);
  assert.equal(issued.ok, true);
  return { service, authorization: `Bearer ${issued.credential}` };
}

async function requestWithSwitch(t, admissionSwitch) {
  let bodyReads = 0;
  const app = express();
  app.use((req, _res, next) => {
    const on = req.on;
    req.on = function (event, ...args) {
      if (event === 'data' || event === 'readable') {
        bodyReads += 1;
        throw Error('BODY_READ_SENTINEL');
      }
      return on.call(this, event, ...args);
    };
    next();
  });
  const { service, authorization } = await sessionService();
  app.use('/api/cad', createCadUserUploadRouter({ sessionService: service, admissionSwitch }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
    assert.equal(bodyReads, 0);
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: '{BODY_READ_SENTINEL',
  });
  const payload = await response.json();
  return { response, payload };
}

test('default switch always returns the disabled no-body decision', async () => {
  const admissionSwitch = createCadInternalProductionAdmissionSwitch();
  assert.equal(admissionSwitch.runtimeImported, true);
  assert.equal(admissionSwitch.defaultClosed, true);
  assert.equal(admissionSwitch.bodyAdmissionAuthorized, false);
  const decision = await admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: {
      schemaVersion: 1,
      userId: 'switch-user',
      shopId: 'switch-shop',
      sessionId: 'switch-session',
      cadUploadAllowed: true,
    },
  });
  assert.deepEqual(decision, packet.defaultDecision);
  assert.deepEqual(await admissionSwitch.decide({ bodyAdmissionAuthorized: true }), packet.defaultDecision);
  assert.deepEqual(await admissionSwitch.decide({ bodyAdmissionAuthorized: false, principal: {} }), packet.defaultDecision);
});

test('mounted route imports the switch but still refuses body admission before parsing', async t => {
  let seenPrincipal;
  const admissionSwitch = {
    async decide(input) {
      seenPrincipal = input.principal;
      return {
        ok: true,
        code: 'UNSAFE_TEST_PROPOSAL',
        admissionAuthorized: true,
        bodyReadAuthorized: true,
        conversionAuthorized: true,
        sandboxDispatchAuthorized: true,
        storeMutationAuthorized: true,
      };
    },
  };
  const { response, payload } = await requestWithSwitch(t, admissionSwitch);
  assert.equal(response.status, 503);
  assert.equal(payload.code, 'USER_UPLOADS_DISABLED');
  assert.equal(seenPrincipal.schemaVersion, 1);
  assert.equal(seenPrincipal.userId, 'switch-user');
  assert.equal(seenPrincipal.shopId, 'switch-shop');
  assert.equal(seenPrincipal.cadUploadAllowed, true);
});

test('route source preserves the literal gate and consults switch before validation', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /createCadInternalProductionAdmissionSwitch/);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /if \(!BODY_ADMISSION_AUTHORIZED\) return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.ok(route.indexOf('admissionSwitch.decide') < route.indexOf('validateRequestBody(req)'));
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /process\.env\.[A-Z0-9_]*BODY_ADMISSION|BODY_ADMISSION_AUTHORIZED\s*=\s*req\./);
});

test('switch source and packet remain provider-free and authority-closed', () => {
  const source = fs.readFileSync(path.join(root, 'server/cadInternalProductionAdmissionSwitch.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\.|cadSandbox/i);
  for (const key of [
    'requestBodyRead',
    'productionUploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'storeMutation',
    'providerEnvResourceBillingChanges',
    'privateCad',
    'realUsers',
    'externalMessages',
    'secrets',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain false`);
  }
  assert.equal(packet.guardModel.factoryOptionCannotOpenRoute, true);
  assert.equal(packet.guardModel.consultedAfterSessionVerification, true);
  assert.equal(packet.guardModel.consultedBeforeRequestBodyParsing, true);
});
