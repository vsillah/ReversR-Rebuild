const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  createClosedDurableAdapterService,
} = require('../server/cadProductionExecutionBindingInstallation');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  REVIEWED_WINDOW,
  createCadStartupLiveGateSourceInstallClosure,
  exactStartupLiveGateInstallSource,
  normalizeStartupDeploymentMetadata,
} = require('../server/cadStartupLiveGateSourceInstallClosure');
const checker = require('./cad-auth-startup-live-gate-source-install-closure-checker');

test('default startup live-gate source installer stays fail-closed', () => {
  const closure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closure.startupLiveGateInstallSourceAccepted, false);
  assert.equal(closure.startupLiveGateInstallAccepted, false);
  assert.equal(closure.sourceExecutable, false);
  assert.equal(closure.sessionService, null);
  assert.equal(closure.sessionServiceNonNull, false);
  assert.equal(closure.executableRuntime.enabled, false);
  assert.equal(closure.uploadSessionIssued, false);
  assert.equal(closure.requestBodyAdmittedOrRead, false);
});

test('reviewed source installs exact startup session service and runtime from current metadata', async () => {
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  assert.equal(deploymentMetadata.deploymentReference, REVIEWED_PRODUCTION_DEPLOYMENT_REFERENCE);
  const normalized = normalizeStartupDeploymentMetadata(
    deploymentMetadata,
    REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  );
  assert.equal(normalized.deploymentReference, REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE);

  const closure = createCadStartupLiveGateSourceInstallClosure({
    source: REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    deploymentMetadata,
    durableService: createClosedDurableAdapterService(),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closure.startupLiveGateInstallSourceAccepted, true);
  assert.equal(closure.startupLiveGateInstallAccepted, true);
  assert.equal(closure.deploymentMetadataAccepted, true);
  assert.equal(closure.privateCredentialSupplyAccepted, true);
  assert.equal(closure.privateCredentialValueIncluded, false);
  assert.equal(closure.sourceExecutable, true);
  assert.equal(closure.sessionServiceNonNull, true);
  assert.equal(closure.executableRuntime.enabled, true);
  assert.equal(closure.runtime.installation.manifest.commandCardSha256,
    REVIEWED_COMMAND_CARD_SHA256);
  assert.equal(closure.runtime.installation.liveGate.installationSha256,
    REVIEWED_INSTALLATION_SHA256);
  assert.equal(closure.runtime.installation.manifest.currentDeploymentReference,
    REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE);

  const issue = await closure.sessionService.issueSession();
  assert.deepEqual(issue, { ok: false, code: 'UPLOAD_SESSION_ISSUANCE_DISABLED' });
  const record = await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(record.sessionId, REVIEWED_BOUNDED_SESSION_REF);
  assert.equal(record.transport, 'bearer');
  assert.equal(record.cadUploadAllowed, true);
});

test('source rejects drift, stale metadata, and private credential value fields', () => {
  assert.equal(exactStartupLiveGateInstallSource(REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE), true);
  for (const mutate of [
    source => { source.enabled = false; },
    source => { source.explicitLiveOpeningApproved = false; },
    source => { source.mainCommit = '0'.repeat(40); },
    source => { source.productionDeploymentReference = 'dpl_stale'; },
    source => { source.sourceOwnedDeploymentReference = 'stale'; },
    source => { source.commandCardSha256 = '0'.repeat(64); },
    source => { source.installationSha256 = '0'.repeat(64); },
    source => { source.privateSupplyReceiptSha256 = '0'.repeat(64); },
    source => { source.privateSupplyReceiptSha256 = REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256.slice(1); },
    source => { source.sessionCredentialDigestSha256 = '0'.repeat(64); },
    source => { source.startUtc = '2026-10-01T05:30:00Z'; },
    source => { source.expiresUtc = '2026-10-01T05:00:00Z'; },
    source => { source.credential = 'PRIVATE_SENTINEL'; },
    source => { source.privateCredentialValue = 'PRIVATE_SENTINEL'; },
    source => { source.secret = 'PRIVATE_SENTINEL'; },
    source => { source.token = 'PRIVATE_SENTINEL'; },
  ]) {
    const source = { ...REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE };
    mutate(source);
    assert.equal(exactStartupLiveGateInstallSource(source), false);
    const closure = createCadStartupLiveGateSourceInstallClosure({
      source,
      deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
      now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    });
    assert.equal(closure.startupLiveGateInstallAccepted, false);
    assert.equal(closure.sourceExecutable, false);
  }
});

test('checker validates packet, refuses live modes, and avoids private-value leakage', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.deployedStartupPathProvenExecutableWithoutRuntimeActivation, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.equal(packet.uploadSessionIssued, false);
  assert.equal(packet.requestBodyAdmittedOrRead, false);
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
      'scripts/cad-auth-startup-live-gate-source-install-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL/);
  }
});
