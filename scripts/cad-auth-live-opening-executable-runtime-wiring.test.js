const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {
  EXECUTABLE_COMMAND_CARD_ARTIFACT,
  RUN_FENCE_KEY,
  FORWARD_EFFECTS,
  CLEANUP_EFFECTS,
  METHODS,
  reviewExecutableCommandCardBinding,
  createCadLiveOpeningExecutableRuntimeWiring,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const { createCadLiveOpeningExecutableRuntimeBootstrap } =
  require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const {
  createUploadSessionService,
  createInMemoryUploadSessionStoreForTests,
} = require('../server/uploadSessionStore');
const {
  PACKET,
  SOURCES,
  checkPacket,
} = require('./cad-auth-live-opening-executable-runtime-wiring-checker');

const root = path.resolve(__dirname, '..');
const deploymentReference = 'https://vercel.com/vsillahs-projects/reversr/EPiBwXcH8op6ykFj7m3hP6ZHwbe3';
const startUtc = '2030-01-01T00:00:00Z';
const expiresUtc = '2030-01-01T00:30:00Z';
const sessionId = 'synthetic-live-opening-session';

function commandCard() {
  return {
    schemaVersion: 1,
    artifact: EXECUTABLE_COMMAND_CARD_ARTIFACT,
    sourceOnly: false,
    executable: true,
    issued: true,
    authorizedForLiveUse: true,
    productionUploadAdmissionOpeningAuthorized: true,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionReadAuthorized: true,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    privateCadUseAuthorized: false,
    externalMessagesAuthorized: false,
    retryAuthorized: false,
    secondLiveRunAuthorized: false,
    productionDeploymentReference: deploymentReference,
    productionOrigin: 'https://reversr.vercel.app',
    productionRoute: 'POST /api/cad/user-import',
    cohortRef: 'rrb-ref:cad-upload-internal-mark-test-cohort-v1',
    sessionId,
    durableEvidenceSha256: createHash('sha256').update('durable-evidence').digest('hex'),
    openingWindow: {
      startUtc,
      expiresUtc,
      startInclusiveExpiryExclusive: true,
    },
    ceilings: {
      concurrentSessions: 1,
      uploadAttempts: 1,
      retries: 0,
      secondLiveRuns: 0,
    },
    liveExecutionControls: {
      independentExpiryCheckBeforeEveryEffect: true,
      atomicDurableRunClaimRequired: true,
      atomicDurableAttemptClaimRequired: true,
      rollbackImmediatelyAfterWindow: true,
      postRollbackFailClosedSmokeRequired: true,
      unknownOutcomeStopsWithoutRetry: true,
    },
  };
}

function harness({ ledger = new Set(), mutate = () => {}, now } = {}) {
  const card = commandCard();
  const commandCardBytes = JSON.stringify(card);
  const commandCardSha256 = createHash('sha256').update(commandCardBytes).digest('hex');
  const events = [];
  const adapter = Object.fromEntries(METHODS.map(operation => [operation, async input => {
    events.push({ operation, input });
    const receipt = {
      ...input,
      operation,
      ok: true,
      durable: true,
      expiryCheckedAtomically: true,
      explicitLiveGateApproved: true,
      evidenceSha256: card.durableEvidenceSha256,
      independentExpiryEnforced: true,
      atomicClaims: true,
      durableRollbackEnforced: true,
      immutableCurrent: true,
      failClosed: true,
      armed: true,
      bounded: true,
      concurrentSessions: 1,
      open: true,
      consumed: true,
      closed: true,
      revoked: true,
      bodyReads: 0,
      sessionGrants: 0,
      fenceClosed: true,
    };
    if (operation === 'claimRun' || operation === 'claimAttempt') {
      const key = `${input.runFenceKey}:${operation}`;
      receipt.claimed = !ledger.has(key);
      ledger.add(key);
    }
    await mutate(operation, receipt, input);
    return receipt;
  }]));
  const principal = Object.freeze({
    schemaVersion: 1,
    userId: 'synthetic-user',
    shopId: 'synthetic-shop',
    sessionId,
    cadUploadAllowed: true,
  });
  return {
    card,
    commandCardBytes,
    commandCardSha256,
    events,
    adapter,
    principal,
    options: {
      enabled: true,
      commandCardBytes,
      commandCardSha256,
      currentDeploymentReference: deploymentReference,
      adapter,
      now: now || (() => Date.parse(startUtc) + 1000),
    },
  };
}

async function service() {
  const grant = {
    loginSessionId: 'executable-runtime-login',
    userId: 'synthetic-user',
    shopId: 'synthetic-shop',
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
  assert.equal(issued.ok, true);
  return { sessionService, authorization: `Bearer ${issued.credential}` };
}

function closed(result) {
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.uploadSessionIssuanceAuthorized, false);
  assert.equal(result.requestBodyAdmissionReadAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadUseAuthorized, false);
  assert.equal(result.effectsExecuted, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|\/Users\/|\.local\//);
}

test('default production bootstrap is closed and never calls adapters', async () => {
  const mount = createCadLiveOpeningExecutableRuntimeBootstrap();
  closed(mount);
  assert.equal(mount.executableRuntimeWiringMounted, true);
  assert.equal(mount.enabled, false);
  assert.equal((await mount.admissionSwitch.decide()).code, 'EXECUTABLE_RUNTIME_WIRING_DISABLED');
  assert.equal((await mount.routeBodyGate.authorizeBodyRead()).code, 'EXECUTABLE_RUNTIME_WIRING_DISABLED');
});

test('executable command-card binding requires exact bytes and current deployment', () => {
  const h = harness();
  const accepted = reviewExecutableCommandCardBinding({
    commandCardBytes: h.commandCardBytes,
    commandCardSha256: h.commandCardSha256,
    currentDeploymentReference: deploymentReference,
  });
  assert.equal(accepted.bindingAccepted, true);
  assert.equal(accepted.currentDeploymentRechecked, true);
  assert.equal(accepted.bodyReadAuthorized, false);

  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: h.commandCardBytes + '\n',
    commandCardSha256: createHash('sha256').update(h.commandCardBytes + '\n').digest('hex'),
    currentDeploymentReference: deploymentReference,
  }).bindingAccepted, false);
  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: h.commandCardBytes,
    commandCardSha256: h.commandCardSha256,
    currentDeploymentReference: 'https://vercel.com/vsillahs-projects/reversr/stale',
  }).bindingAccepted, false);

  const draft = { ...h.card, sourceOnly: true, executable: false, issued: false };
  const draftBytes = JSON.stringify(draft);
  assert.equal(reviewExecutableCommandCardBinding({
    commandCardBytes: draftBytes,
    commandCardSha256: createHash('sha256').update(draftBytes).digest('hex'),
    currentDeploymentReference: deploymentReference,
  }).bindingAccepted, false);
});

test('direct body gate enforces ordered durable receipts and closes after admission', async () => {
  const h = harness();
  const mount = createCadLiveOpeningExecutableRuntimeWiring(h.options);
  const admissionDecision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: h.principal,
  });
  assert.equal(admissionDecision.bodyReadAuthorized, true);
  assert.equal(admissionDecision.routeBodyGateAuthorized, false);

  const gate = await mount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal: h.principal,
    admissionDecision,
  });
  assert.equal(gate.bodyReadAuthorized, true);
  assert.equal(gate.routeBodyGateAuthorized, true);
  assert.deepEqual(h.events.map(event => event.operation), FORWARD_EFFECTS);
  for (const { input } of h.events) {
    assert.equal(Object.isFrozen(input), true);
    assert.equal(input.runFenceKey, RUN_FENCE_KEY);
    assert.equal(input.bodyReadAuthorized, false);
  }

  const closeout = await mount.routeBodyGate.afterBodyAdmission({ bodyGateDecision: gate, admissionOk: true });
  assert.equal(closeout.rollbackVerified, true);
  assert.equal(closeout.bodyReadAuthorized, false);
  assert.deepEqual(h.events.slice(-3).map(event => event.operation), CLEANUP_EFFECTS);
  assert.equal((await mount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal: h.principal,
    admissionDecision,
  })).code, 'ATTEMPT_ALREADY_SPENT');
});

test('durable run and attempt receipts stop duplicates without opening another gate', async () => {
  const ledger = new Set();
  const first = harness({ ledger });
  const second = harness({ ledger });
  const firstMount = createCadLiveOpeningExecutableRuntimeWiring(first.options);
  const secondMount = createCadLiveOpeningExecutableRuntimeWiring(second.options);
  const firstDecision = await firstMount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: first.principal,
  });
  assert.equal((await firstMount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal: first.principal,
    admissionDecision: firstDecision,
  })).routeBodyGateAuthorized, true);

  const secondDecision = await secondMount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: second.principal,
  });
  const duplicate = await secondMount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal: second.principal,
    admissionDecision: secondDecision,
  });
  assert.equal(duplicate.bodyReadAuthorized, false);
  assert.equal(duplicate.unknownOutcome, true);
  assert.equal(second.events.some(event => event.operation === 'openFence'), false);
});

test('bad receipts and stale sessions fail closed and sanitize errors', async () => {
  for (const [operation, field, value] of [
    ['verifyApproval', 'explicitLiveGateApproved', false],
    ['verifyDurableEvidence', 'atomicClaims', false],
    ['recheckDeployment', 'deploymentReference', 'stale'],
    ['claimRun', 'expiryCheckedAtomically', false],
    ['verifySession', 'concurrentSessions', 2],
    ['claimAttempt', 'claimed', false],
    ['openFence', 'open', false],
  ]) {
    const h = harness({ mutate(name, receipt) {
      if (name === operation) receipt[field] = value;
    } });
    const mount = createCadLiveOpeningExecutableRuntimeWiring(h.options);
    const admissionDecision = await mount.admissionSwitch.decide({
      bodyAdmissionAuthorized: false,
      principal: h.principal,
    });
    const result = await mount.routeBodyGate.authorizeBodyRead({
      bodyAdmissionAuthorized: false,
      principal: h.principal,
      admissionDecision,
    });
    assert.equal(result.bodyReadAuthorized, false, `${operation}.${field}`);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL/);
  }

  const h = harness();
  const mount = createCadLiveOpeningExecutableRuntimeWiring(h.options);
  const decision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: { ...h.principal, sessionId: 'different-session' },
  });
  assert.equal(decision.code, 'SESSION_BINDING_MISMATCH');
});

test('actual production route default and unsafe mounts deny before parsing', async t => {
  const { sessionService, authorization } = await service();
  let bodyReads = 0;
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
    Object.defineProperty(req, 'body', { get() { bodyReads += 1; throw Error('BODY_READ_SENTINEL'); } });
    next();
  });
  app.use('/default/api/cad', createCadUserUploadRouter({ sessionService }));
  app.use('/unsafe/api/cad', createCadUserUploadRouter({
    sessionService,
    liveOpeningRuntimeMount: {
      admissionSwitch: {
        async decide() {
          return { ok: true, admissionAuthorized: true, bodyReadAuthorized: true };
        },
      },
    },
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  for (const prefix of ['default', 'unsafe']) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${prefix}/api/cad/user-import`, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: '{BODY_READ_SENTINEL',
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'USER_UPLOADS_DISABLED');
  }
  assert.equal(bodyReads, 0);
});

test('route source keeps literal closed gate and body gate precedes validation', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  const wiring = fs.readFileSync(path.join(root, 'server/cadLiveOpeningExecutableRuntimeWiring.js'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(root, 'server/cadLiveOpeningExecutableRuntimeBootstrap.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /createCadLiveOpeningRuntimeMount/);
  assert.match(route, /createCadLiveOpeningExecutableRuntimeBootstrap/);
  assert.ok(route.indexOf('decision = await admissionSwitch.decide') < route.indexOf('bodyGateDecision = routeBodyGate'));
  assert.ok(route.indexOf('bodyGateDecision = routeBodyGate') < route.indexOf('validateRequestBody(req)'));
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true|process\.env\.[A-Z0-9_]*BODY_ADMISSION/);
  assert.doesNotMatch(wiring + bootstrap, /process\.env|node:fs|child_process|fetch\s*\(|https?\.request|\.listen\s*\(/);
});

test('source packet validates and rejects drift or hostile inputs', () => {
  const packet = JSON.parse(fs.readFileSync(PACKET, 'utf8'));
  assert.equal(checkPacket(packet).ok, true);
  for (const source of SOURCES) {
    assert.equal(checkPacket(packet, { readSource(file) {
      return file === source
        ? Buffer.concat([fs.readFileSync(path.join(root, file)), Buffer.from('\n')])
        : fs.readFileSync(path.join(root, file));
    } }).ok, false, source);
  }
  let calls = 0;
  const hook = () => { calls += 1; throw Error('PRIVATE_SENTINEL'); };
  const accessor = {};
  Object.defineProperty(accessor, 'preparation', { enumerable: true, get: hook });
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook });
  for (const input of [null, undefined, [], 'PRIVATE_SENTINEL', accessor, proxy, { toJSON: hook }]) {
    const result = checkPacket(input, { readSource: hook });
    assert.equal(result.ok, false);
    closed(result);
  }
  assert.equal(calls, 0);
});

test('checker refuses execution, live mode and arbitrary paths', () => {
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'],
    ['--approval', 'PRIVATE_SENTINEL'], ['PRIVATE_SENTINEL'], ['--write', 'PRIVATE_SENTINEL']]) {
    const run = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-executable-runtime-wiring-checker.js',
      ...args,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.doesNotMatch(run.stdout + run.stderr, /PRIVATE_SENTINEL|\/Users\//);
    closed(JSON.parse(run.stdout));
  }
});
