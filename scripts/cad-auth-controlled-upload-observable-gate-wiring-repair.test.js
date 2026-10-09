const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const {
  CONTROLLED_UPLOAD_COMMAND_CARD_HEADER,
  CONTROLLED_UPLOAD_INSTALLATION_HEADER,
  CONTROLLED_UPLOAD_ROLLBACK_HEADER,
  CONTROLLED_UPLOAD_VALIDATION_HEADER,
  createCadUserUploadRouter,
} = require('../server/cadUserUploadRouter');
const {
  createCadProductionExecutableRuntimeMount,
} = require('../server/cadProductionExecutableRuntimeMountCompletion');
const {
  COHORT_REF,
  SESSION_REF,
} = require('../server/cadControlledInternalUploadActivation');
const {
  APPROVED_COMMAND_CARD_SHA256,
  APPROVED_CONTROLLED_WINDOW,
  APPROVED_INSTALLATION_SHA256,
  BASE_VERCEL_DEPLOYMENT,
  createCadControlledUploadObservableGateActivationMount,
  createControlledUploadObservableGateActivationConfig,
  createControlledUploadObservableGateAdapter,
  createControlledUploadObservableGateWiringRepairReview,
  createProofDeploymentMetadata,
} = require('../server/cadControlledUploadObservableGateWiringRepair');
const checker = require('./cad-auth-controlled-upload-observable-gate-wiring-repair-checker');

const sha = value => createHash('sha256').update(value).digest('hex');
const now = () => Date.parse(APPROVED_CONTROLLED_WINDOW.proofNowUtc);

const principal = Object.freeze({
  schemaVersion: 1,
  userId: 'source-owned-internal-tester',
  shopId: 'source-owned-internal-shop',
  sessionId: SESSION_REF,
  cadUploadAllowed: true,
});

test('observable gate checker binds and reuses the reviewed shared IGES validator', () => {
  const packet = checker.expectedPacket();
  const sharedValidator = checker.reviewedSharedValidator();
  const readSource = candidate => fs.readFileSync(candidate);
  const replaceSource = (target, search, replacement) => candidate => {
    const source = readSource(candidate);
    return candidate === target
      ? Buffer.from(source.toString('utf8').replace(search, replacement))
      : source;
  };

  assert.equal(checker.validatorEnvelopePreserved(), true);
  assert.equal(sharedValidator.path, 'utils/igesAdmission.js');
  assert.equal(sharedValidator.preserved, true);
  assert.equal(
    packet.reviewedSharedValidator.sha256,
    packet.sourceBindings['utils/igesAdmission.js'],
  );
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(checker.validatorEnvelopePreserved(replaceSource(
    'server/cadWorkerContract.js',
    "require('../utils/igesAdmission')",
    "require('../utils/igesAdmission-copy')",
  )), false);
  assert.equal(checker.validatorEnvelopePreserved(replaceSource(
    'utils/igesAdmission.js',
    '/\\.(igs|iges)$/i',
    '/\\.(igs|iges|step|stp)$/i',
  )), false);
});

function ledger() {
  return {
    runs: new Set(),
    attempts: new Set(),
    rollbacks: new Set(),
    fences: new Set(),
    revoked: new Set(),
  };
}

function row(content, section, seq) {
  return `${String(content || '').padEnd(72, ' ').slice(0, 72)}${section}${String(seq).padStart(7, ' ')}`;
}

function syntheticIgesBody() {
  const rows = [
    row('Synthetic IGES for controlled observable gate validation only', 'S', 1),
    row('1H,,1H;,7HReversR,9HSynthetic,32,38,6,308,15,1.0,1,2HIN,1,0.01;', 'G', 1),
    row('     100       1       0       0       0       0       0       0000000', 'D', 1),
    row('     100       0       0       1       0       0       0       0       0', 'D', 2),
    row('100,0,0,0;', 'P', 1),
    row('S      1G      1D      2P      1', 'T', 1),
  ];
  return {
    contentBase64: Buffer.from(rows.join('\n'), 'ascii').toString('base64'),
    fileName: 'synthetic-observable-validation.igs',
    mimeType: 'model/iges',
  };
}

async function routeFixture(t, liveOpeningRuntimeMount) {
  const credential = `${['us', '1.'].join('')}${Buffer.alloc(32, 11).toString('base64url')}`;
  const credentialDigest = sha(credential);
  const app = express();
  let bodySubscriptions = 0;
  app.use((req, _res, next) => {
    const on = req.on;
    req.on = function (event, ...args) {
      if (event === 'data' || event === 'readable') bodySubscriptions++;
      return on.call(this, event, ...args);
    };
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter({
    corsOrigins: ['https://approved.example'],
    liveOpeningRuntimeMount,
    now,
    sessionService: Object.freeze({
      async lookupSession(digest) {
        return digest === credentialDigest ? Object.freeze({
          schemaVersion: 1,
          userId: principal.userId,
          shopId: principal.shopId,
          sessionId: principal.sessionId,
          authMethod: 'password',
          status: 'active',
          expiresAt: Date.parse(APPROVED_CONTROLLED_WINDOW.expiresUtc),
          transport: 'bearer',
          cadUploadAllowed: true,
        }) : null;
      },
    }),
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return {
    bodySubscriptions: () => bodySubscriptions,
    credential,
    url: `http://127.0.0.1:${server.address().port}/api/cad/user-import`,
  };
}

function baseRuntimeMount() {
  return Object.freeze({
    admissionSwitch: Object.freeze({
      decide: async () => Object.freeze({
        code: 'BASE_DEFAULT_CLOSED',
        bodyReadAuthorized: false,
        routeBodyGateAuthorized: false,
      }),
    }),
    routeBodyGate: Object.freeze({
      authorizeBodyRead: async () => Object.freeze({
        code: 'BASE_GATE_CLOSED',
        bodyReadAuthorized: false,
        routeBodyGateAuthorized: false,
      }),
      afterBodyAdmission: async () => Object.freeze({
        code: 'BASE_GATE_CLEANED',
        bodyReadAuthorized: false,
      }),
    }),
  });
}

test('review proves approved window digests and stays source-only default-closed', () => {
  const review = createControlledUploadObservableGateWiringRepairReview();

  assert.equal(review.sourceOnly, true);
  assert.equal(review.status, 'CONTROLLED_UPLOAD_OBSERVABLE_GATE_SOURCE_BOUND_RUNTIME_BLOCKED');
  assert.equal(review.startupWiring.requestTimeCurrentDeploymentMetadata, false);
  assert.equal(review.startupWiring.requestTimeActiveWindowBinding, false);
  assert.equal(review.startupWiring.defaultProductionClosed, true);
  assert.equal(review.startupWiring.approvedWindowCommandCardMatches, true);
  assert.equal(review.startupWiring.approvedWindowInstallationMatches, true);
  assert.equal(review.authorizes.productionUploadActivation, false);
  assert.equal(review.authorizes.requestBodyAdmissionOrRead, false);
  assert.equal(review.authorizes.privateCredentialRead, false);
});

test('source config resolves exact approved command-card and installation binding', () => {
  const config = createControlledUploadObservableGateActivationConfig({
    deploymentMetadata: createProofDeploymentMetadata(),
    now,
    ledger: ledger(),
  });

  assert.equal(config.binding.ok, false);
  assert.equal(config.binding.sourceBindingAccepted, true);
  assert.equal(config.controlledInternalUploadActivation.enabled, false);
  assert.equal(config.source.currentDeploymentReference, BASE_VERCEL_DEPLOYMENT);
  assert.equal(config.source.commandCardSha256, APPROVED_COMMAND_CARD_SHA256);
  assert.equal(config.source.installationSha256, APPROVED_INSTALLATION_SHA256);
  assert.equal(config.source.openingWindow.startUtc, APPROVED_CONTROLLED_WINDOW.startUtc);
  assert.equal(config.source.openingWindow.expiresUtc, APPROVED_CONTROLLED_WINDOW.expiresUtc);
  assert.equal(config.source.manifest.activationEnabled, true);
  assert.equal(config.source.manifestReview.bindingAccepted, true);
  assert.equal(config.binding.productionUploadActivationAuthorized, false);
  assert.equal(config.binding.requestBodyAdmissionReadAuthorized, false);
});

test('missing current deployment metadata leaves controlled startup gate closed', async () => {
  const mount = createCadControlledUploadObservableGateActivationMount({
    deploymentMetadata: () => null,
    now,
    ledger: ledger(),
    baseRuntimeMount: baseRuntimeMount(),
  });
  const decision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal,
  });

  assert.equal(decision.bodyReadAuthorized, false);
  assert.equal(decision.code, 'CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED');
});

test('production mount factory installs terminal default-closed controlled gate', async () => {
  let captured = null;
  const router = createCadProductionExecutableRuntimeMount({
    sessionService: Object.freeze({ lookupSession: async () => null }),
    bootstrap: () => baseRuntimeMount(),
    controlledInternalUploadActivationMount: ({ baseRuntimeMount: runtime }) =>
      createCadControlledUploadObservableGateActivationMount({
        deploymentMetadata: () => createProofDeploymentMetadata(),
        now,
        ledger: ledger(),
        baseRuntimeMount: runtime,
      }),
    createRouter: options => {
      captured = options;
      return Object.freeze({ mounted: true });
    },
  });
  const input = { bodyAdmissionAuthorized: false, principal };
  const decision = await captured.liveOpeningRuntimeMount.admissionSwitch.decide(input);
  const bodyGateDecision = await captured.liveOpeningRuntimeMount.routeBodyGate.authorizeBodyRead({
    ...input,
    admissionDecision: decision,
  });
  const cleanup = await captured.liveOpeningRuntimeMount.routeBodyGate.afterBodyAdmission({
    bodyGateDecision,
  });

  assert.equal(router.mounted, true);
  assert.equal(captured.liveOpeningRuntimeMount.controlledInternalUploadActivationMounted, true);
  assert.equal(captured.liveOpeningRuntimeMount.controlledInternalUploadActivationEnabled, false);
  assert.equal(bodyGateDecision.routeBodyGateAuthorized, false);
  assert.equal(bodyGateDecision.commandCardSha256, undefined);
  assert.equal(bodyGateDecision.installationSha256, undefined);
  assert.notEqual(cleanup?.rollbackVerified, true);
});

test('route withholds observable headers while durable host is absent', async t => {
  const controlledMount = createCadControlledUploadObservableGateActivationMount({
    deploymentMetadata: () => createProofDeploymentMetadata(),
    now,
    ledger: ledger(),
    baseRuntimeMount: baseRuntimeMount(),
  });
  const fixture = await routeFixture(t, controlledMount);
  const response = await fetch(fixture.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${fixture.credential}`,
      'content-type': 'application/json',
      origin: 'https://approved.example',
    },
    body: JSON.stringify(syntheticIgesBody()),
  });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.code, 'USER_UPLOADS_DISABLED');
  assert.equal(fixture.bodySubscriptions(), 0);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_ROLLBACK_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_COMMAND_CARD_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_INSTALLATION_HEADER), null);
  assert.doesNotMatch([...response.headers.values()].join('\n'), /contentBase64|synthetic-observable-validation|private-session-credential/i);
});

test('independent runtime instances remain blocked with separate local ledgers', async t => {
  const firstMount = createCadControlledUploadObservableGateActivationMount({
    deploymentMetadata: () => createProofDeploymentMetadata(),
    now,
    ledger: ledger(),
    baseRuntimeMount: baseRuntimeMount(),
  });
  const first = await routeFixture(t, firstMount);
  const firstResponse = await fetch(first.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${first.credential}`,
      'content-type': 'application/json',
      origin: 'https://approved.example',
    },
    body: JSON.stringify(syntheticIgesBody()),
  });
  await firstResponse.json();
  assert.equal(firstResponse.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), null);

  const secondMount = createCadControlledUploadObservableGateActivationMount({
    deploymentMetadata: () => createProofDeploymentMetadata(),
    now,
    ledger: ledger(),
    baseRuntimeMount: baseRuntimeMount(),
  });
  const second = await routeFixture(t, secondMount);
  const secondResponse = await fetch(second.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${second.credential}`,
      'content-type': 'application/json',
      origin: 'https://approved.example',
    },
    body: JSON.stringify(syntheticIgesBody()),
  });
  const secondPayload = await secondResponse.json();

  assert.equal(secondResponse.status, 503);
  assert.equal(secondPayload.code, 'USER_UPLOADS_DISABLED');
  assert.equal(secondResponse.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), null);
  assert.equal(secondResponse.headers.get(CONTROLLED_UPLOAD_COMMAND_CARD_HEADER), null);
});

// These are adversarial synthetic fixtures, never live durable evidence.
test('missing host dependencies and forged capabilities cannot install an adapter', async () => {
  let calls = 0;
  const forged = new Proxy({}, { get() { calls++; return async () => ({
    ok: true, durable: true, expiryCheckedAtomically: true, closed: true,
    revoked: true, failClosed: true, status: 401, bodyReads: 0,
  }); } });
  for (const dependencies of [undefined, {}, { runQuery: forged, runMutation: forged },
    { sharedDurableTransactionalAdapter: forged, independentSmokeVerifier: forged },
    { adapter: forged, reviewed: true, durable: true, expiryCheckedAtomically: true },
    { ledger: ledger() }]) {
    assert.equal(createControlledUploadObservableGateAdapter(dependencies), null);
    const config = createControlledUploadObservableGateActivationConfig({
      deploymentMetadata: createProofDeploymentMetadata(), now, ...dependencies,
    });
    assert.equal(config.controlledInternalUploadActivation.enabled, false);
    const mount = createCadControlledUploadObservableGateActivationMount({
      deploymentMetadata: createProofDeploymentMetadata(), now, ...dependencies,
    });
    const input = { principal, bodyAdmissionAuthorized: false,
      admissionDecision: { bodyReadAuthorized: true } };
    for (let request = 0; request < 2; request++) {
      assert.equal((await mount.admissionSwitch.decide(input)).bodyReadAuthorized, false);
      assert.equal((await mount.routeBodyGate.authorizeBodyRead(input)).bodyReadAuthorized, false);
    }
    assert.notEqual((await mount.routeBodyGate.afterBodyAdmission()).rollbackVerified, true);
  }
  assert.equal(calls, 0);
});

test('terminal missing-host barrier prevents legacy base gate fallback', async () => {
  let calls = 0;
  let captured;
  const base = {
    admissionSwitch: { decide: async () => { calls++; return { bodyReadAuthorized: true }; } },
    routeBodyGate: { authorizeBodyRead: async () => { calls++; return { bodyReadAuthorized: true }; } },
  };
  createCadProductionExecutableRuntimeMount({
    sessionService: { lookupSession: async () => null },
    bootstrap: () => base,
    controlledInternalUploadActivationMount: ({ baseRuntimeMount }) =>
      createCadControlledUploadObservableGateActivationMount({ baseRuntimeMount }),
    createRouter: options => { captured = options.liveOpeningRuntimeMount; return {}; },
  });
  const input = { principal, bodyAdmissionAuthorized: false,
    admissionDecision: { code: 'LEGACY_OPEN', bodyReadAuthorized: true } };
  assert.equal((await captured.admissionSwitch.decide(input)).bodyReadAuthorized, false);
  assert.equal((await captured.routeBodyGate.authorizeBodyRead(input)).bodyReadAuthorized, false);
  assert.equal(calls, 0);
});
