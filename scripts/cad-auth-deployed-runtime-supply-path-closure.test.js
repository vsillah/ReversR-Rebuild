const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  METHODS,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
  REVIEWED_DEPLOYMENT_REFERENCE,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_DURABLE_SERVICE_REF,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_WINDOW,
  createCadDeployedRuntimeSupplyPathClosure,
  exactGate,
} = require('../server/cadDeployedRuntimeSupplyPathClosure');
const checker = require('./cad-auth-deployed-runtime-supply-path-closure-checker');

function durableService(events = []) {
  return Object.freeze(Object.fromEntries(METHODS.map(operation => [operation, async () => {
    events.push(operation);
    throw Error('UNEXPECTED_EFFECT');
  }])));
}

function proofClosure(events = []) {
  return checker.withProofEnv(() => createCadDeployedRuntimeSupplyPathClosure({
    gate: REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
    durableService: durableService(events),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  }));
}

test('default deployed startup wrapper remains fail-closed', () => {
  const closure = createCadDeployedRuntimeSupplyPathClosure();
  assert.equal(closure.deployedRuntimeSupplyPathAccepted, false);
  assert.equal(closure.deployedRuntimeSupplyPathGateAccepted, false);
  assert.equal(closure.sourceExecutable, false);
  assert.equal(closure.sessionService, null);
  assert.equal(closure.sessionServiceNonNull, false);
  assert.equal(closure.executableRuntime.enabled, false);
  assert.equal(closure.uploadSessionIssued, false);
  assert.equal(closure.requestBodyAdmittedOrRead, false);
});

test('reviewed gate reads current production metadata from server env and resolves exact source-owned runtime', async () => {
  const events = [];
  const closure = proofClosure(events);
  assert.equal(closure.deployedRuntimeSupplyPathGateAccepted, true);
  assert.equal(closure.deployedRuntimeSupplyPathMetadataAccepted, true);
  assert.equal(closure.deployedRuntimeSupplyPathAccepted, true);
  assert.equal(closure.privateCredentialSupplyAccepted, true);
  assert.equal(closure.privateCredentialValueIncluded, false);
  assert.equal(closure.gateNonNull, true);
  assert.equal(closure.installationNonNull, true);
  assert.equal(closure.sessionServiceNonNull, true);
  assert.equal(closure.sourceExecutable, true);
  assert.equal(closure.executableRuntime.enabled, true);
  assert.equal(closure.runtime.installation.manifest.commandCardSha256,
    REVIEWED_COMMAND_CARD_SHA256);
  assert.equal(closure.runtime.installation.liveGate.installationSha256,
    REVIEWED_INSTALLATION_SHA256);
  assert.equal(closure.runtime.installation.manifest.currentDeploymentReference,
    REVIEWED_DEPLOYMENT_REFERENCE);
  assert.equal(closure.runtime.installation.manifest.boundedSessionRef,
    REVIEWED_BOUNDED_SESSION_REF);
  assert.equal(closure.runtime.installation.manifest.sessionId,
    REVIEWED_BOUNDED_SESSION_REF);
  assert.equal(closure.runtime.installation.manifest.durableEvidenceSha256,
    REVIEWED_DURABLE_EVIDENCE_SHA256);
  assert.equal(closure.runtime.installation.manifest.durableServiceRef,
    REVIEWED_DURABLE_SERVICE_REF);
  assert.equal(events.length, 0);

  const issued = await closure.sessionService.issueSession();
  assert.deepEqual(issued, { ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
  const record = await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(record.sessionId, REVIEWED_BOUNDED_SESSION_REF);
  assert.equal(record.transport, 'bearer');
  assert.equal(record.cadUploadAllowed, true);
  assert.equal(events.length, 0);
});

test('reviewed gate rejects source drift, stale metadata, and private credential value fields', () => {
  assert.equal(exactGate(REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE), true);
  for (const mutate of [
    gate => { gate.enabled = false; },
    gate => { gate.explicitLiveOpeningApproved = false; },
    gate => { gate.mainCommit = '0'.repeat(40); },
    gate => { gate.currentDeploymentReference = 'wrong'; },
    gate => { gate.productionTarget = 'https://reversr-stale-vsillahs-projects.vercel.app'; },
    gate => { gate.commandCardSha256 = '0'.repeat(64); },
    gate => { gate.installationSha256 = '0'.repeat(64); },
    gate => { gate.privateSupplyReceiptSha256 = '0'.repeat(64); },
    gate => { gate.privateSupplyReceiptSha256 = REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256.slice(1); },
    gate => { gate.sessionCredentialDigestSha256 = '0'.repeat(64); },
    gate => { gate.startUtc = '2026-10-01T04:30:00Z'; },
    gate => { gate.expiresUtc = '2026-10-01T04:00:00Z'; },
    gate => { gate.credential = 'PRIVATE_SENTINEL'; },
    gate => { gate.privateCredentialValue = 'PRIVATE_SENTINEL'; },
    gate => { gate.secret = 'PRIVATE_SENTINEL'; },
    gate => { gate.token = 'PRIVATE_SENTINEL'; },
  ]) {
    const gate = { ...REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE };
    mutate(gate);
    assert.equal(exactGate(gate), false);
    const closure = checker.withProofEnv(() => createCadDeployedRuntimeSupplyPathClosure({
      gate,
      now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    }));
    assert.equal(closure.deployedRuntimeSupplyPathAccepted, false);
    assert.equal(closure.sourceExecutable, false);
  }
});

test('server startup proof rejects missing or stale production metadata without reading private inputs', () => {
  const closed = createCadDeployedRuntimeSupplyPathClosure({
    gate: REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closed.deployedRuntimeSupplyPathAccepted, false);

  const stale = checker.withProofEnv(() => {
    process.env.VERCEL_GIT_COMMIT_SHA = '0'.repeat(40);
    return createCadDeployedRuntimeSupplyPathClosure({
      gate: REVIEWED_DEPLOYED_RUNTIME_SUPPLY_PATH_GATE,
      now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    });
  });
  assert.equal(stale.deployedRuntimeSupplyPathAccepted, false);
  assert.equal(stale.sourceExecutable, false);
});

test('checker validates packet, refuses live modes, and avoids private-value leakage', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.deployedStartupPathProvenExecutableWithoutRuntimeActivation, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.equal(packet.uploadSessionIssued, false);
  assert.equal(packet.requestBodyAdmittedOrRead, false);
  assert.equal(packet.runtimeInstallationActivated, false);
  assert.doesNotMatch(JSON.stringify(packet), /PRIVATE_SENTINEL|\/Users\/|\.local\//);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['PRIVATE_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-deployed-runtime-supply-path-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
