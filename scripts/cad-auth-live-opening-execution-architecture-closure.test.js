const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { createUploadSessionVerifier } = require('../server/uploadSession');
const {
  CLEANUP_EFFECTS,
  FORWARD_EFFECTS,
  METHODS,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  createCadLiveOpeningExecutableRuntimeBootstrap,
} = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE,
  REVIEWED_WINDOW,
  createLiveOpeningExecutionArchitectureRuntime,
  createProofGate,
  createSourceOwnedLiveOpeningExecutionArchitectureInstallation,
  createSourceOwnedLiveOpeningSessionService,
  exactGate,
  proofCredentialDigest,
} = require('../server/cadLiveOpeningExecutionArchitectureClosure');
const checker = require('./cad-auth-live-opening-execution-architecture-closure-checker');

function durableService(events = []) {
  const ledger = new Set();
  return Object.fromEntries(METHODS.map(operation => [operation, async input => {
    events.push({ operation, input });
    const receipt = {
      ...input,
      operation,
      ok: true,
      durable: true,
      expiryCheckedAtomically: true,
      explicitLiveGateApproved: true,
      evidenceSha256: input.durableEvidenceSha256,
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
    return receipt;
  }]));
}

function proofGate() {
  const metadata = require('../server/cadProductionCurrentDeploymentMetadata')
    .readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  return createProofGate({
    deploymentMetadata: metadata,
    sessionCredentialDigestSha256: checker.PROOF_CREDENTIAL_DIGEST_SHA256,
  });
}

function proofRuntime(events = [], gate = proofGate()) {
  const runtime = createLiveOpeningExecutionArchitectureRuntime({
    gate,
    deploymentMetadata: require('../server/cadProductionCurrentDeploymentMetadata')
      .readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    durableService: durableService(events),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const source = createCadProductionExecutionBindingSource(
    resolveCadProductionExecutionBindingSource(
      runtime.installation,
      () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    ),
  );
  return {
    runtime,
    mount: createCadLiveOpeningExecutableRuntimeBootstrap({
      executableRuntime: createCadProductionExecutionBinding(source),
    }),
  };
}

test('default deployed production path stays fail-closed', () => {
  assert.equal(DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE.enabled, false);
  assert.equal(exactGate(DEFAULT_LIVE_OPENING_EXECUTION_ARCHITECTURE_GATE), false);
  assert.equal(createSourceOwnedLiveOpeningExecutionArchitectureInstallation(), null);
  assert.equal(createSourceOwnedLiveOpeningSessionService(), null);
  assert.equal(resolveCadProductionExecutionBindingSource(), null);
  assert.equal(createCadProductionExecutionBindingSource(), null);
  assert.deepEqual(createCadProductionExecutionBinding(), { enabled: false });
});

test('exact reviewed source gate resolves the executable binding source and session service', async () => {
  const events = [];
  const { runtime, mount } = proofRuntime(events);
  assert.equal(runtime.sourceExecutable, true);
  assert.match(runtime.installation.manifest.commandCardSha256, /^[a-f0-9]{64}$/);
  assert.match(runtime.installation.liveGate.installationSha256, /^[a-f0-9]{64}$/);
  assert.equal(runtime.installation.manifest.commandCardSha256,
    checker.sourceOwnedArchitectureProof().commandCardSha256);
  assert.equal(runtime.installation.liveGate.installationSha256,
    checker.sourceOwnedArchitectureProof().installationSha256);
  assert.equal(mount.executableRuntimeWiringMounted, true);
  assert.equal(mount.enabled, true);
  assert.equal(events.length, 0);

  const record = await runtime.sessionService.lookupSession(checker.PROOF_CREDENTIAL_DIGEST_SHA256);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.sessionId, proofGate().sessionId);
  assert.equal(record.cadUploadAllowed, true);
  assert.deepEqual(await runtime.sessionService.issueSession(), {
    ok: false,
    code: 'UPLOAD_SESSION_ISSUANCE_DISABLED',
  });
});

test('digest-bound session credential reaches runtime gate without body read', async () => {
  const events = [];
  const proofToken = `${['u', 's', '1'].join('')}.${Buffer.alloc(32, 14).toString('base64url')}`;
  const gate = createProofGate({
    deploymentMetadata: require('../server/cadProductionCurrentDeploymentMetadata')
      .readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    sessionCredentialDigestSha256: proofCredentialDigest(proofToken),
  });
  const { runtime, mount } = proofRuntime(events, gate);
  const verifier = createUploadSessionVerifier({
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    lookupSession: runtime.sessionService.lookupSession,
  });
  const verified = await verifier({
    headers: { authorization: `Bearer ${proofToken}` },
    rawHeaders: ['authorization', `Bearer ${proofToken}`],
  });
  assert.equal(verified.ok, true);
  const admissionDecision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal: verified.principal,
  });
  assert.equal(admissionDecision.bodyReadAuthorized, true);
  const bodyGateDecision = await mount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal: verified.principal,
    admissionDecision,
  });
  assert.equal(bodyGateDecision.routeBodyGateAuthorized, true);
  assert.deepEqual(events.map(event => event.operation), FORWARD_EFFECTS);
  const closed = await mount.routeBodyGate.afterBodyAdmission();
  assert.equal(closed.rollbackVerified, true);
  assert.deepEqual(events.slice(-CLEANUP_EFFECTS.length).map(event => event.operation),
    CLEANUP_EFFECTS);
});

test('gate rejects stale or secret-bearing values', () => {
  for (const mutate of [
    gate => { gate.enabled = false; },
    gate => { gate.explicitLiveOpeningApproved = false; },
    gate => { gate.currentDeploymentReference = 'dpl_staleDeploymentReference000'; },
    gate => { gate.commandCardSha256 = '0'.repeat(64); },
    gate => { gate.installationSha256 = '0'.repeat(64); },
    gate => { gate.sessionCredentialDigestSha256 = 'not-a-digest'; },
    gate => { gate.startUtc = gate.expiresUtc; },
    gate => { gate.credential = 'PRIVATE_SENTINEL'; },
    gate => { gate.token = 'PRIVATE_SENTINEL'; },
    gate => { gate.secret = 'PRIVATE_SENTINEL'; },
  ]) {
    const gate = { ...proofGate() };
    mutate(gate);
    assert.equal(createSourceOwnedLiveOpeningExecutionArchitectureInstallation({
      gate,
      deploymentMetadata: require('../server/cadProductionCurrentDeploymentMetadata')
        .readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    }), null);
  }
  assert.equal(createLiveOpeningExecutionArchitectureRuntime({
    gate: proofGate(),
    deploymentMetadata: require('../server/cadProductionCurrentDeploymentMetadata')
      .readCadProductionCurrentDeploymentMetadata({
        ...checker.PROOF_ENV,
        VERCEL_DEPLOYMENT_ID: 'dpl_staleDeploymentReference000',
      }),
  }).sourceExecutable, false);
  assert.match(checker.PROOF_CREDENTIAL_DIGEST_SHA256, /^[a-f0-9]{64}$/);
});

test('checker validates packet and refuses live execution modes', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.executableSourcePathProven, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.equal(packet.uploadSessionIssued, false);
  assert.equal(packet.requestBodyAdmittedOrRead, false);
  assert.doesNotMatch(JSON.stringify(packet), /us1\.|PRIVATE_SENTINEL|\/Users\/|\.local\//);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-execution-architecture-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
