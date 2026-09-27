const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const express = require('express');
const {
  createCadLiveOpeningRuntimeMount,
  reviewRuntimeMountBinding,
  EFFECT_ORDER,
  REQUIRED_PRECHECKS,
} = require('../server/cadLiveOpeningRuntimeMount');
const {
  liveOpeningCommandCardDigestPreparation,
} = require('../offline/cad-auth-live-opening-command-card-digest-prep/preparation');
const {
  liveOpeningRuntimeMountPreparation,
  checkLiveOpeningRuntimeMountPreparation,
} = require('../offline/cad-auth-live-opening-runtime-mount-prep/preparation');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const {
  createUploadSessionService,
  createInMemoryUploadSessionStoreForTests,
} = require('../server/uploadSessionStore');
const { PACKET, SOURCES, checkRuntimeMountPrepPacket } =
  require('./cad-auth-live-opening-runtime-mount-prep-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
const parent = () => liveOpeningCommandCardDigestPreparation().commandCardDigest;

function closed(result) {
  assert.equal(result.uploadSessionIssuanceAuthorized, false);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.requestBodyAdmissionReadAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadUseAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.executableCommandCardIssuanceAuthorized, false);
  assert.equal(result.effectsExecuted, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\/|\.local\//);
}

async function sessionService() {
  const grant = {
    loginSessionId: 'runtime-mount-login',
    userId: 'runtime-mount-user',
    shopId: 'runtime-mount-shop',
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

test('packet validates runtime mount prep while preserving closed controls', () => {
  const p = liveOpeningRuntimeMountPreparation();
  assert.equal(checkLiveOpeningRuntimeMountPreparation(p).ok, true);
  assert.equal(checkRuntimeMountPrepPacket(packet()).ok, true);
  closed(checkRuntimeMountPrepPacket(packet()));
  assert.equal(p.routeWiring.literalBodyAdmissionGateRemainsFalse, true);
  assert.equal(p.routeWiring.unsafeAdapterGrantOverridden, true);
  assert.deepEqual(p.bindingRequirements.effectOrder, EFFECT_ORDER);
  assert.deepEqual(p.bindingRequirements.requiredPrechecks, REQUIRED_PRECHECKS);
});

test('runtime binding accepts only exact digest and current deployment while staying disabled', () => {
  const card = parent().draft;
  const accepted = reviewRuntimeMountBinding({
    commandCardDraft: card,
    commandCardSha256: parent().sha256,
    currentDeploymentReference: card.productionDeploymentReference,
  });
  assert.equal(accepted.bindingAccepted, true);
  assert.equal(accepted.ok, false);
  assert.equal(accepted.code, 'LIVE_OPENING_RUNTIME_MOUNT_DISABLED');
  assert.equal(accepted.currentDeploymentRechecked, true);
  assert.equal(accepted.oneSessionOneAttemptFenceRequired, true);
  assert.equal(accepted.independentExpiryBeforeEveryEffectRequired, true);
  assert.equal(accepted.rollbackFirstControlsRequired, true);
  assert.equal(accepted.postRollbackFailClosedSmokeRequired, true);

  assert.equal(reviewRuntimeMountBinding({
    commandCardDraft: card,
    commandCardSha256: 'f'.repeat(64),
    currentDeploymentReference: card.productionDeploymentReference,
  }).bindingAccepted, false);
  assert.equal(reviewRuntimeMountBinding({
    commandCardDraft: card,
    commandCardSha256: parent().sha256,
    currentDeploymentReference: 'https://vercel.com/vsillahs-projects/reversr/stale',
  }).bindingAccepted, false);
});

test('mounted runtime wrapper observes base switch but overrides unsafe grants', async () => {
  let seenPrincipal;
  const runtimeMount = createCadLiveOpeningRuntimeMount({
    admissionSwitch: {
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
    },
    commandCardDraft: parent().draft,
    commandCardSha256: parent().sha256,
    currentDeploymentReference: parent().draft.productionDeploymentReference,
  });
  const decision = await runtimeMount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: {
      schemaVersion: 1,
      userId: 'runtime-mount-user',
      shopId: 'runtime-mount-shop',
      sessionId: 'runtime-mount-session',
      cadUploadAllowed: true,
    },
  });
  assert.equal(seenPrincipal.userId, 'runtime-mount-user');
  assert.deepEqual(decision, {
    ok: false,
    code: 'LIVE_OPENING_RUNTIME_MOUNT_DISABLED',
    admissionAuthorized: false,
    bodyReadAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    storeMutationAuthorized: false,
    externalEffectAuthorized: false,
  });
});

test('actual route mount still denies before request-body parsing', async t => {
  let bodyReads = 0;
  const { service, authorization } = await sessionService();
  const app = express();
  app.use((req, _res, next) => {
    const on = req.on;
    req.on = function(event, ...args) {
      if (event === 'data' || event === 'readable') {
        bodyReads += 1;
        throw Error('BODY_READ_SENTINEL');
      }
      return on.call(this, event, ...args);
    };
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter({ sessionService: service }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: '{BODY_READ_SENTINEL',
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'USER_UPLOADS_DISABLED');
  assert.equal(bodyReads, 0);
});

test('source drift, missing files and hostile inputs fail closed', () => {
  const p = packet();
  for (const source of SOURCES) {
    for (const missing of [false, true]) {
      const result = checkRuntimeMountPrepPacket(p, { readSource(file) {
        if (file !== source) return read(file);
        if (missing) throw Error('PRIVATE_SENTINEL');
        return Buffer.concat([read(file), Buffer.from('\n')]);
      } });
      assert.equal(result.ok, false, source);
      closed(result);
    }
  }
  let calls = 0;
  const hook = () => { calls++; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, { toJSON: hook }]) {
    const result = checkRuntimeMountPrepPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('CLI refuses live activation, command-card issuance and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-runtime-mount-prep-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});

test('runtime mount source has no provider/env IO and route keeps literal body gate', () => {
  const mount = read('server/cadLiveOpeningRuntimeMount.js').toString();
  const route = read('server/cadUserUploadRouter.js').toString();
  assert.doesNotMatch(mount, /process\.env|fetch\s*\(|node:fs|child_process|https?\.request|\.listen\s*\(|cadSandbox/i);
  assert.match(route, /createCadLiveOpeningRuntimeMount/);
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /admissionSwitch\.decide/);
  assert.ok(route.indexOf('admissionSwitch.decide') < route.indexOf('validateRequestBody(req)'));
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true|process\.env\.[A-Z0-9_]*BODY_ADMISSION/);
});
