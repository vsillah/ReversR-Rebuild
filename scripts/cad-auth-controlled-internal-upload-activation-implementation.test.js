const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const express = require('express');
const {
  CONTROLLED_UPLOAD_COMMAND_CARD_HEADER,
  CONTROLLED_UPLOAD_INSTALLATION_HEADER,
  CONTROLLED_UPLOAD_ROLLBACK_HEADER,
  CONTROLLED_UPLOAD_VALIDATION_HEADER,
  createCadUserUploadRouter,
} = require('../server/cadUserUploadRouter');
const {
  CLEANUP_EFFECTS,
  CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED,
  FORWARD_EFFECTS,
  METHODS,
  SESSION_REF,
  SOURCE_ONLY_PROOF_WINDOW,
  SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  VALIDATOR_ENVELOPE,
  createCadControlledInternalUploadActivationMount,
  createControlledInternalUploadActivationManifest,
  createControlledInternalUploadActivationReview,
  forbiddenKeyPresent,
  reviewControlledInternalUploadActivationManifest,
} = require('../server/cadControlledInternalUploadActivation');
const checker = require('./cad-auth-controlled-internal-upload-activation-implementation-checker');

function requireProductionMountWithStubbedHttpDeps() {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === 'express') {
      return {
        Router: () => ({
          all() { return this; },
          use() { return this; },
          post() { return this; },
        }),
      };
    }
    if (request === 'cors') return () => (_req, _res, next) => next?.();
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require('../server/cadProductionExecutableRuntimeMountCompletion');
  } finally {
    Module._load = originalLoad;
  }
}

const NOW = Date.parse('2030-01-01T00:05:00Z');
const sha = value => createHash('sha256').update(value).digest('hex');
const principal = Object.freeze({
  schemaVersion: 1,
  userId: 'source-owned-internal-tester',
  shopId: 'source-owned-internal-shop',
  sessionId: SESSION_REF,
  cadUploadAllowed: true,
});

// Synthetic protocol receipts only; these do not prove durable storage or real smoke.
function adapter({ events = [], ledger, mutate = () => {} } = {}) {
  function receiptFor(operation, input) {
    const receipt = {
      ok: true,
      operation,
      commandCardSha256: input.commandCardSha256,
      installationSha256: input.installationSha256,
      deploymentReference: input.deploymentReference,
      sessionId: input.sessionId,
      cohortRef: input.cohortRef,
    };
    if (['claimRun', 'claimAttempt', 'armRollback', 'openBodyAdmissionFence', 'consumeAttemptBeforeBodyRead'].includes(operation)) {
      receipt.durable = true;
      receipt.expiryCheckedAtomically = true;
    }
    if (operation === 'verifyCurrentDeployment') receipt.currentDeploymentVerified = true;
    if (operation === 'verifyCommandCardBinding') receipt.bindingVerified = true;
    if (operation === 'verifyClosedBaseline') {
      receipt.failClosed = true;
      receipt.bodyReads = 0;
      receipt.uploadActivations = 0;
    }
    if (operation === 'claimRun') {
      const key = `${input.deploymentReference}:${input.sessionId}`;
      receipt.claimed = !ledger || !ledger.has(key);
      if (receipt.claimed && ledger) ledger.add(key);
      if (!receipt.claimed) receipt.ok = false;
    }
    if (operation === 'verifyBoundedSession') {
      receipt.bounded = true;
      receipt.concurrentSessions = 1;
    }
    if (operation === 'claimAttempt') receipt.claimed = true;
    if (operation === 'armRollback') {
      receipt.armed = true;
      receipt.beforeBodyAdmission = true;
    }
    if (operation === 'openBodyAdmissionFence') {
      receipt.open = true;
      receipt.conversionAuthorized = false;
      receipt.sandboxDispatchAuthorized = false;
    }
    if (operation === 'consumeAttemptBeforeBodyRead') receipt.consumed = true;
    if (operation === 'closeBodyAdmissionFence') {
      receipt.closed = true;
      receipt.durable = true;
    }
    if (operation === 'revokeSessionAndLateGrants') {
      receipt.revoked = true;
      receipt.durable = true;
    }
    if (operation === 'postRollbackFailClosedSmoke') {
      receipt.failClosed = true;
      receipt.status = 401;
      receipt.code = 'USER_SESSION_REQUIRED';
      receipt.bodyReads = 0;
      receipt.fenceClosed = true;
    }
    mutate(operation, receipt, input);
    events.push({ operation, receipt });
    return receipt;
  }
  return Object.freeze(Object.fromEntries(
    METHODS.map(operation => [operation, async input => receiptFor(operation, input)]),
  ));
}

function row(content, section, seq) {
  return `${String(content || '').padEnd(72, ' ').slice(0, 72)}${section}${String(seq).padStart(7, ' ')}`;
}

function syntheticIgesBody() {
  const rows = [
    row('Synthetic IGES for controlled ReversR upload validation only', 'S', 1),
    row('1H,,1H;,7HReversR,9HSynthetic,32,38,6,308,15,1.0,1,2HIN,1,0.01;', 'G', 1),
    row('     100       1       0       0       0       0       0       0000000', 'D', 1),
    row('     100       0       0       1       0       0       0       0       0', 'D', 2),
    row('100,0,0,0;', 'P', 1),
    row('S      1G      1D      2P      1', 'T', 1),
  ];
  return {
    contentBase64: Buffer.from(rows.join('\n'), 'ascii').toString('base64'),
    fileName: 'synthetic-internal-validation.igs',
    mimeType: 'model/iges',
  };
}

async function routeFixture(t, liveOpeningRuntimeMount) {
  const credential = `us1.${Buffer.alloc(32, 9).toString('base64url')}`;
  const credentialDigest = sha(credential);
  const app = express();
  app.use('/api/cad', createCadUserUploadRouter({
    corsOrigins: ['https://approved.example'],
    liveOpeningRuntimeMount,
    sessionService: Object.freeze({
      async lookupSession(digest) {
        return digest === credentialDigest ? Object.freeze({
          schemaVersion: 1,
          userId: principal.userId,
          shopId: principal.shopId,
          sessionId: principal.sessionId,
          authMethod: 'password',
          status: 'active',
          expiresAt: Date.parse('2030-01-01T00:20:00Z'),
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
    credential,
    url: `http://127.0.0.1:${server.address().port}/api/cad/user-import`,
  };
}

async function open(mount) {
  const input = { bodyAdmissionAuthorized: false, principal };
  const admissionDecision = await mount.admissionSwitch.decide(input);
  return mount.routeBodyGate.authorizeBodyRead({ ...input, admissionDecision });
}

test('implementation review is source-only and default-closed', () => {
  const review = createControlledInternalUploadActivationReview();

  assert.equal(review.sourceOnly, true);
  assert.equal(review.status, 'CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_READY_SOURCE_ONLY');
  assert.equal(review.controlledActivationPath.defaultActivationEnabled, false);
  assert.equal(review.controlledActivationPath.disabledManifest.activationEnabled, false);
  assert.equal(review.controlledActivationPath.disabledManifestReview.bindingAccepted, true);
  assert.equal(review.authorizes.productionUploadActivation, false);
  assert.equal(review.authorizes.requestBodyAdmissionOrRead, false);
  assert.equal(review.authorizes.privateCredentialRead, false);
  assert.equal(review.authorizes.conversionDispatch, false);
  assert.equal(review.authorizes.sandboxDispatch, false);
  assert.equal(CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_ENABLED, false);
});

test('manifest binds exact current deployment, command-card bytes, installation SHA, and IGES validator envelope', () => {
  const manifest = createControlledInternalUploadActivationManifest();
  const review = reviewControlledInternalUploadActivationManifest({ manifest });

  assert.equal(review.bindingAccepted, true);
  assert.equal(review.currentDeploymentRechecked, true);
  assert.equal(review.validatorEnvelopeAccepted, true);
  assert.equal(manifest.currentDeploymentReference, SOURCE_OWNED_DEPLOYMENT_REFERENCE);
  assert.match(manifest.commandCardSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.installationSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(manifest.validatorEnvelope, VALIDATOR_ENVELOPE);
  assert.equal(manifest.validatorEnvelope.acceptedFileExtensions.join(','), 'igs,iges');
  assert.equal(manifest.validatorEnvelope.stepStpAuthorized, false);
  assert.equal(manifest.conversionAuthorized, false);
  assert.equal(manifest.sandboxDispatchAuthorized, false);

  assert.equal(
    reviewControlledInternalUploadActivationManifest({
      manifest: { ...manifest, currentDeploymentReference: 'stale' },
    }).bindingAccepted,
    false,
  );
  assert.equal(
    reviewControlledInternalUploadActivationManifest({
      manifest: { ...manifest, commandCardBytes: `${manifest.commandCardBytes} ` },
    }).bindingAccepted,
    false,
  );
  assert.equal(
    reviewControlledInternalUploadActivationManifest({
      manifest: { ...manifest, validatorEnvelope: { ...VALIDATOR_ENVELOPE, acceptedFileExtensions: ['igs', 'iges', 'stp'] } },
    }).bindingAccepted,
    false,
  );
});

test('default mount stays closed and executes no adapter effects', async () => {
  const events = [];
  const mount = createCadControlledInternalUploadActivationMount({
    adapter: adapter({ events }),
    now: () => NOW,
  });

  assert.equal((await mount.admissionSwitch.decide({ bodyAdmissionAuthorized: false, principal })).bodyReadAuthorized, false);
  assert.equal((await open(mount)).bodyReadAuthorized, false);
  assert.equal(events.length, 0);
  assert.equal(mount.productionUploadActivationAuthorized, false);
  assert.equal(mount.requestBodyAdmissionReadAuthorized, false);
});

test('enabled local proof mount opens one route body gate then rolls back and smokes fail-closed', async () => {
  const events = [];
  const manifest = createControlledInternalUploadActivationManifest({ activationEnabled: true });
  const mount = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter({ events }),
    now: () => NOW,
  });

  const result = await open(mount);
  assert.equal(result.routeBodyGateAuthorized, true);
  assert.equal(result.bodyReadAuthorized, true);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.deepEqual(events.map(event => event.operation), FORWARD_EFFECTS);
  assert.ok(FORWARD_EFFECTS.indexOf('armRollback') < FORWARD_EFFECTS.indexOf('openBodyAdmissionFence'));

  const cleanup = await mount.routeBodyGate.afterBodyAdmission();
  assert.equal(cleanup.rollbackVerified, true);
  assert.equal(cleanup.bodyReadAuthorized, false);
  assert.deepEqual(events.slice(-3).map(event => event.operation), CLEANUP_EFFECTS);
  assert.equal((await open(mount)).bodyReadAuthorized, false);
});

test('synthetic shared-ledger protocol blocks a second mount without proving durability', async () => {
  const ledger = new Set();
  const manifest = createControlledInternalUploadActivationManifest({ activationEnabled: true });
  const first = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter({ ledger }),
    now: () => NOW,
  });
  assert.equal((await open(first)).routeBodyGateAuthorized, true);
  await first.routeBodyGate.afterBodyAdmission();

  const secondEvents = [];
  const second = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter({ ledger, events: secondEvents }),
    now: () => NOW,
  });
  const result = await open(second);
  assert.equal(result.bodyReadAuthorized, false);
  assert.ok(!secondEvents.some(event => event.operation === 'openBodyAdmissionFence'));
});

test('independent expiry and sanitized receipt checks stop before body admission', async () => {
  const manifest = createControlledInternalUploadActivationManifest({ activationEnabled: true });
  const expired = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter(),
    now: () => Date.parse(SOURCE_ONLY_PROOF_WINDOW.expiresUtc),
  });
  assert.equal((await open(expired)).bodyReadAuthorized, false);

  const events = [];
  const leaking = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter({
      events,
      mutate: (operation, receipt) => {
        if (operation === 'verifyClosedBaseline') receipt.fileName = 'private.igs';
      },
    }),
    now: () => NOW,
  });
  const result = await open(leaking);
  assert.equal(result.bodyReadAuthorized, false);
  assert.ok(!events.some(event => event.operation === 'claimRun'));
  assert.equal(forbiddenKeyPresent({ requestBody: 'CAD_SENTINEL' }), true);
  assert.equal(forbiddenKeyPresent({ nested: { cadBytes: 'CAD_SENTINEL' } }), true);
});

test('route source remains closed and checker binds deterministic source packet', () => {
  const packet = checker.expectedPacket();
  const sharedValidator = checker.reviewedSharedValidator();

  assert.equal(checker.routeStillClosed(), true);
  assert.equal(checker.deployedStartupWiredDefaultClosed(), true);
  assert.equal(checker.validatorEnvelopePreserved(), true);
  assert.equal(sharedValidator.path, 'utils/igesAdmission.js');
  assert.match(sharedValidator.sha256, /^[a-f0-9]{64}$/);
  assert.equal(sharedValidator.workerContractImportsSharedValidator, true);
  assert.equal(sharedValidator.workerContractUsesSharedFileNameInspection, true);
  assert.equal(sharedValidator.workerContractUsesSharedSourceInspection, true);
  assert.equal(sharedValidator.sourceLimitDerivedFromSharedValidator, true);
  assert.equal(sharedValidator.exactPayloadKeysPreserved, true);
  assert.equal(sharedValidator.acceptedMimeTypesPreserved, true);
  assert.equal(sharedValidator.igesExtensionsOnly, true);
  assert.equal(sharedValidator.externalReferencesRejected, true);
  assert.equal(sharedValidator.envelopeMatchesExpected, true);
  assert.equal(sharedValidator.preserved, true);
  assert.equal(packet.implementationResolved, true);
  assert.equal(packet.deployedStartupWiredDefaultClosed, true);
  assert.equal(
    packet.reviewedSharedValidator.sha256,
    packet.sourceBindings['utils/igesAdmission.js'],
  );
  assert.equal(packet.authorizes.productionUploadActivation, false);
  assert.equal(packet.authorizes.requestBodyAdmissionOrRead, false);
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(
    checker.checkPacket({
      ...packet,
      authorizes: { ...packet.authorizes, requestBodyAdmissionOrRead: true },
    }).ok,
    false,
  );

  for (const file of checker.SOURCES) {
    assert.equal(checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ])).ok, false, file);
  }
});

test('checker fails closed if the shared IGES import or exact envelope weakens', () => {
  const readSource = candidate => fs.readFileSync(candidate);
  const replaceSource = (target, search, replacement) => candidate => {
    const source = readSource(candidate);
    return candidate === target
      ? Buffer.from(source.toString('utf8').replace(search, replacement))
      : source;
  };

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
  assert.equal(checker.validatorEnvelopePreserved(replaceSource(
    'utils/igesAdmission.js',
    "=== 416) return rejection('UNSUPPORTED', 'external-reference');",
    "=== -1) return rejection('UNSUPPORTED', 'external-reference');",
  )), false);
  assert.equal(checker.validatorEnvelopePreserved(
    readSource,
    {
      ...checker.EXPECTED_VALIDATOR_ENVELOPE,
      acceptedFileExtensions: ['igs', 'iges', 'step'],
      stepStpAuthorized: true,
    },
  ), false);
});

test('production startup mount wires controlled activation and remains default-closed', async () => {
  const {
    createCadProductionExecutableRuntimeMount,
  } = requireProductionMountWithStubbedHttpDeps();
  let captured = null;
  const baseRuntimeMount = Object.freeze({
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
    }),
  });
  const router = createCadProductionExecutableRuntimeMount({
    sessionService: Object.freeze({ lookupSession: async () => null }),
    bootstrap: () => baseRuntimeMount,
    createRouter: options => {
      captured = options;
      return Object.freeze({ mounted: true });
    },
  });

  assert.equal(router.mounted, true);
  assert.equal(captured.liveOpeningRuntimeMount.controlledInternalUploadActivationMounted, true);
  assert.equal(captured.liveOpeningRuntimeMount.controlledInternalUploadActivationEnabled, false);
  assert.equal(captured.liveOpeningRuntimeMount.controlledInternalUploadActivationDefaultClosed, true);

  const decision = await captured.liveOpeningRuntimeMount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal,
  });
  assert.equal(decision.bodyReadAuthorized, false);
  assert.equal(decision.code, 'BASE_DEFAULT_CLOSED');
});

test('controlled startup composition preserves existing base executable runtime gates', async () => {
  const {
    createCadProductionExecutableRuntimeMount,
  } = requireProductionMountWithStubbedHttpDeps();
  let captured = null;
  let cleaned = false;
  const baseRuntimeMount = Object.freeze({
    admissionSwitch: Object.freeze({
      decide: async () => Object.freeze({
        code: 'BASE_BODY_GATE_READY',
        bodyReadAuthorized: true,
        routeBodyGateAuthorized: false,
      }),
    }),
    routeBodyGate: Object.freeze({
      authorizeBodyRead: async () => Object.freeze({
        code: 'BASE_BODY_GATE_OPEN',
        bodyReadAuthorized: true,
        routeBodyGateAuthorized: true,
      }),
      afterBodyAdmission: async () => {
        cleaned = true;
        return Object.freeze({ code: 'BASE_GATE_CLEANED', bodyReadAuthorized: false });
      },
    }),
  });
  createCadProductionExecutableRuntimeMount({
    sessionService: Object.freeze({ lookupSession: async () => null }),
    bootstrap: () => baseRuntimeMount,
    createRouter: options => {
      captured = options;
      return Object.freeze({ mounted: true });
    },
  });

  const input = { bodyAdmissionAuthorized: false, principal };
  const admissionDecision = await captured.liveOpeningRuntimeMount.admissionSwitch.decide(input);
  assert.equal(admissionDecision.code, 'BASE_BODY_GATE_READY');
  const bodyGateDecision = await captured.liveOpeningRuntimeMount.routeBodyGate.authorizeBodyRead({
    ...input,
    admissionDecision,
  });
  assert.equal(bodyGateDecision.code, 'BASE_BODY_GATE_OPEN');
  await captured.liveOpeningRuntimeMount.routeBodyGate.afterBodyAdmission({ bodyGateDecision });
  assert.equal(cleaned, true);
});

test('route emits observable controlled validation headers only after body validation and rollback smoke', async t => {
  const events = [];
  const manifest = createControlledInternalUploadActivationManifest({ activationEnabled: true });
  const mount = createCadControlledInternalUploadActivationMount({
    enabled: true,
    manifest,
    adapter: adapter({ events }),
    now: () => NOW,
  });
  const fixture = await routeFixture(t, mount);
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
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), 'iges-body-validated');
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_ROLLBACK_HEADER), 'post-rollback-fail-closed-smoke-passed');
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_COMMAND_CARD_HEADER), manifest.commandCardSha256);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_INSTALLATION_HEADER), manifest.installationSha256);
  assert.match(response.headers.get('access-control-expose-headers'), /X-ReversR-CAD-Controlled-Upload-Validation/);
  assert.deepEqual(events.map(event => event.operation), [...FORWARD_EFFECTS, ...CLEANUP_EFFECTS]);
  assert.doesNotMatch([...response.headers.values()].join('\n'), /us1\.|contentBase64|synthetic-internal-validation|private-session-credential/i);
});

test('route does not emit observable controlled validation headers for default-closed gate', async t => {
  const mount = createCadControlledInternalUploadActivationMount({
    adapter: adapter(),
    now: () => NOW,
  });
  const fixture = await routeFixture(t, mount);
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
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_ROLLBACK_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_COMMAND_CARD_HEADER), null);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_INSTALLATION_HEADER), null);
});

test('checker CLI validates committed packet and rejects live modes', () => {
  const result = spawnSync(process.execPath, [
    'scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(
    parsed.code,
    'CAD_AUTH_CONTROLLED_INTERNAL_UPLOAD_ACTIVATION_IMPLEMENTATION_VALID_SOURCE_ONLY',
  );
  assert.match(parsed.packetSha256, /^[a-f0-9]{64}$/);

  for (const args of [['--live'], ['--execute'], ['--activate'], ['--issue-command-card']]) {
    const denied = spawnSync(process.execPath, [
      'scripts/cad-auth-controlled-internal-upload-activation-implementation-checker.js',
      ...args,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(denied.status, 1);
    assert.doesNotMatch(denied.stdout + denied.stderr, /us1\.|PRIVATE_SENTINEL|CAD_SENTINEL/);
  }
});

for (const operation of CLEANUP_EFFECTS) {
  for (const failure of ['throw', 'forged']) {
    test(`synthetic ${operation} ${failure} remains unknown without retry or proof headers`, async t => {
      const mount = createCadControlledInternalUploadActivationMount({
        enabled: true,
        manifest: createControlledInternalUploadActivationManifest({ activationEnabled: true }),
        now: () => NOW,
        adapter: adapter({ mutate: (name, receipt) => {
          if (name !== operation) return;
          if (failure === 'throw') throw Error('synthetic failure');
          receipt.installationSha256 = '0'.repeat(64);
        } }),
      });
      assert.equal((await open(mount)).bodyReadAuthorized, true);
      const result = await mount.routeBodyGate.afterBodyAdmission();
      assert.equal(result.code, 'CONTROLLED_UPLOAD_ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY');
      assert.equal(result.rollbackVerified, false);
      assert.equal(result.unknownOutcome, true);
      assert.deepEqual(result.cleanupFailures, [operation]);
      assert.equal((await open(mount)).bodyReadAuthorized, false);
      const { setControlledUploadValidationHeaders } = require('../server/cadUserUploadRouter');
      let headers = 0;
      assert.equal(setControlledUploadValidationHeaders({ set() { headers++; } }, {
        code: 'CONTROLLED_UPLOAD_BODY_ADMISSION_FENCE_OPEN',
        bodyReadAuthorized: true, routeBodyGateAuthorized: true,
        commandCardSha256: 'a'.repeat(64), installationSha256: 'b'.repeat(64),
      }, result), false);
      assert.equal(headers, 0);
    });
  }
}

test('synthetic forged forward receipts stop before body admission and execute all cleanup', async () => {
  for (const operation of ['claimRun', 'claimAttempt', 'armRollback', 'openBodyAdmissionFence', 'consumeAttemptBeforeBodyRead']) {
    const events = [];
    const mount = createCadControlledInternalUploadActivationMount({
      enabled: true,
      manifest: createControlledInternalUploadActivationManifest({ activationEnabled: true }),
      now: () => NOW,
      adapter: adapter({ events, mutate: (name, receipt) => {
        if (name === operation) receipt.expiryCheckedAtomically = false;
      } }),
    });
    assert.equal((await open(mount)).bodyReadAuthorized, false);
    assert.deepEqual(events.slice(-3).map(event => event.operation), CLEANUP_EFFECTS);
    assert.equal((await open(mount)).bodyReadAuthorized, false);
  }
});
