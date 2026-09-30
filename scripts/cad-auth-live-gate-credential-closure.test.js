const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  CLEANUP_EFFECTS,
  FORWARD_EFFECTS,
  METHODS,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  createCadLiveOpeningExecutableRuntimeBootstrap,
} = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY,
  REVIEWED_WINDOW,
  SESSION_CREDENTIAL_DIGEST_SHA256,
  createCadLiveOpeningGateCredentialClosure,
  createProofPrivateSessionCredentialSupply,
  exactPrivateSessionCredentialSupply,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const checker = require('./cad-auth-live-gate-credential-closure-checker');

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

function proofClosure(events = []) {
  return createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    privateSessionCredentialSupply: createProofPrivateSessionCredentialSupply({
      supplyReceiptSha256: checker.PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256,
    }),
    durableService: durableService(events),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
}

test('default production path stays fail-closed without private credential supply', () => {
  const closure = createCadLiveOpeningGateCredentialClosure();
  assert.equal(DEFAULT_PRIVATE_SESSION_CREDENTIAL_SUPPLY.supplied, false);
  assert.equal(closure.privateCredentialSupplyAccepted, false);
  assert.equal(closure.gateNonNull, false);
  assert.equal(closure.sessionService, null);
  assert.equal(closure.executableRuntime.enabled, false);
  assert.equal(closure.uploadSessionIssued, false);
  assert.equal(closure.requestBodyAdmittedOrRead, false);
});

test('private digest-bound supply resolves executable gate without issuing credentials', async () => {
  const events = [];
  const closure = proofClosure(events);
  assert.equal(closure.privateCredentialSupplyAccepted, true);
  assert.equal(closure.gateNonNull, true);
  assert.equal(closure.installationNonNull, true);
  assert.equal(closure.sessionServiceNonNull, true);
  assert.equal(closure.sourceExecutable, true);
  assert.equal(closure.executableRuntime.enabled, true);
  assert.equal(events.length, 0);

  const issued = await closure.sessionService.issueSession();
  assert.deepEqual(issued, { ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
  const record = await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.sessionId, checker.expectedPacket().boundInputs.privateSessionCredentialSupplyRef
    ? 'rrb-ref:cad-upload-internal-mark-test-session-v1' : null);
  assert.equal(record.transport, 'bearer');
  assert.equal(record.cadUploadAllowed, true);
});

test('source-owned runtime gate executes only after a verified principal reaches it', async () => {
  const events = [];
  const closure = proofClosure(events);
  const record = await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  const principal = Object.freeze({
    schemaVersion: 1,
    userId: record.userId,
    shopId: record.shopId,
    sessionId: record.sessionId,
    expiresAt: record.expiresAt,
    authMethod: record.authMethod,
    transport: record.transport,
    cadUploadAllowed: true,
  });
  const mount = createCadLiveOpeningExecutableRuntimeBootstrap({
    executableRuntime: closure.executableRuntime,
  });
  const decision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal,
  });
  assert.equal(decision.bodyReadAuthorized, true);
  const bodyGateDecision = await mount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal,
    admissionDecision: decision,
  });
  assert.equal(bodyGateDecision.routeBodyGateAuthorized, true);
  assert.deepEqual(events.map(event => event.operation), FORWARD_EFFECTS);
  const closed = await mount.routeBodyGate.afterBodyAdmission({ bodyGateDecision });
  assert.equal(closed.rollbackVerified, true);
  assert.deepEqual(events.slice(-CLEANUP_EFFECTS.length).map(event => event.operation),
    CLEANUP_EFFECTS);
});

test('credential supply contract rejects value disclosure, drift, or missing receipt', () => {
  const valid = createProofPrivateSessionCredentialSupply({
    supplyReceiptSha256: checker.PROOF_PRIVATE_SUPPLY_RECEIPT_SHA256,
  });
  assert.equal(exactPrivateSessionCredentialSupply(valid), true);
  for (const mutate of [
    supply => { supply.supplied = false; },
    supply => { supply.credentialDigestSha256 = '0'.repeat(64); },
    supply => { supply.supplyReceiptSha256 = null; },
    supply => { supply.credentialValueIncluded = true; },
    supply => { supply.credential = 'PRIVATE_SENTINEL'; },
    supply => { supply.token = 'PRIVATE_SENTINEL'; },
    supply => { supply.secret = 'PRIVATE_SENTINEL'; },
  ]) {
    const supply = { ...valid };
    mutate(supply);
    assert.equal(exactPrivateSessionCredentialSupply(supply), false);
    assert.equal(createCadLiveOpeningGateCredentialClosure({
      deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
      privateSessionCredentialSupply: supply,
      now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    }).sourceExecutable, false);
  }
});

test('checker validates packet and refuses live execution modes', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.executableGateAndCredentialPreconditionProven, true);
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
      'scripts/cad-auth-live-gate-credential-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
