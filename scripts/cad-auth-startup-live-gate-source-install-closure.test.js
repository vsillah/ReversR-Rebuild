const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  SESSION_CREDENTIAL_DIGEST_SHA256,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const {
  createCadLiveOpeningExecutableRuntimeBootstrap,
} = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT,
  ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256,
  ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256,
  ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET,
  ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW,
  ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_BOUNDED_SESSION_REF,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  REVIEWED_WINDOW,
  createCadStartupActiveLiveOpeningWindow,
  createCadStartupLiveGateSourceInstallClosure,
  createStartupLiveGateInstallSourceFromMetadata,
  exactStartupLiveGateInstallSource,
  normalizeStartupDeploymentMetadata,
} = require('../server/cadStartupLiveGateSourceInstallClosure');
const checker = require('./cad-auth-startup-live-gate-source-install-closure-checker');

test('default startup live-gate source installer stays fail-closed', () => {
  const closure = createCadStartupLiveGateSourceInstallClosure({
    source: DEFAULT_STARTUP_LIVE_GATE_INSTALL_SOURCE,
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
  assert.equal(deploymentMetadata.deploymentReference, checker.PROOF_ENV.VERCEL_DEPLOYMENT_ID);
  const normalized = normalizeStartupDeploymentMetadata(
    deploymentMetadata,
    REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
  );
  assert.equal(normalized.deploymentReference, REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE);

  const closure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata,
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

test('startup source derives executable binding from a fresh current deployment', () => {
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata({
    ...checker.PROOF_ENV,
    VERCEL_DEPLOYMENT_ID: 'dpl_FreshStartupSourceOwnedRef123456',
    VERCEL_URL: 'reversr-fresh123-vsillahs-projects.vercel.app',
    VERCEL_GIT_COMMIT_SHA: '1234567890abcdef1234567890abcdef12345678',
  });
  const expectedSourceOwnedReference =
    'vercel-target:reversr-fresh123-vsillahs-projects.vercel.app@1234567890abcdef1234567890abcdef12345678';
  assert.equal(deploymentMetadata.deploymentReference, 'dpl_FreshStartupSourceOwnedRef123456');
  const source = createStartupLiveGateInstallSourceFromMetadata({
    deploymentMetadata,
    openingWindow: REVIEWED_WINDOW,
  });
  assert.equal(exactStartupLiveGateInstallSource(source), true);
  assert.equal(source.mainCommit, deploymentMetadata.gitCommitSha);
  assert.equal(source.sourceOwnedDeploymentReference, expectedSourceOwnedReference);
  assert.equal(source.productionDeploymentReference, expectedSourceOwnedReference);
  assert.notEqual(source.sourceOwnedDeploymentReference, REVIEWED_SOURCE_OWNED_DEPLOYMENT_REFERENCE);

  const closure = createCadStartupLiveGateSourceInstallClosure({
    source,
    deploymentMetadata,
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(closure.deploymentMetadataAccepted, true);
  assert.equal(closure.startupLiveGateInstallAccepted, true);
  assert.equal(closure.sourceOwnedDeploymentReference, expectedSourceOwnedReference);
  assert.equal(closure.runtime.installation.manifest.currentDeploymentReference,
    expectedSourceOwnedReference);
  assert.equal(closure.runtime.installation.manifest.commandCardSha256,
    source.commandCardSha256);
  assert.equal(closure.runtime.installation.liveGate.installationSha256,
    source.installationSha256);

  const noArgClosure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata,
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(noArgClosure.deploymentMetadataAccepted, true);
  assert.equal(noArgClosure.startupLiveGateInstallAccepted, true);
  assert.equal(noArgClosure.sourceOwnedDeploymentReference, expectedSourceOwnedReference);
  assert.equal(noArgClosure.startupLiveGateInstallSource.sourceOwnedDeploymentReference,
    expectedSourceOwnedReference);
  assert.equal(noArgClosure.runtime.installation.manifest.currentDeploymentReference,
    expectedSourceOwnedReference);
  assert.equal(noArgClosure.startupLiveGateInstallSource.commandCardSha256,
    noArgClosure.runtime.installation.manifest.commandCardSha256);

  const staleMetadata = readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV);
  const staleClosure = createCadStartupLiveGateSourceInstallClosure({
    source,
    deploymentMetadata: staleMetadata,
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(staleClosure.deploymentMetadataAccepted, false);
  assert.equal(staleClosure.startupLiveGateInstallAccepted, false);
});

test('deployed no-arg startup path resolves the active repaired window from source-owned time', () => {
  const now = () => Date.parse(ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW.proofNowUtc);
  const activeWindow = createCadStartupActiveLiveOpeningWindow({ now });
  assert.deepEqual(activeWindow, ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW);
  const deploymentMetadata = readCadProductionCurrentDeploymentMetadata({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    VERCEL_URL: ACTIVE_WINDOW_BINDING_REPAIR_PRODUCTION_TARGET.replace('https://', ''),
    VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
    VERCEL_GIT_COMMIT_SHA: ACTIVE_WINDOW_BINDING_REPAIR_BASE_MAIN_COMMIT,
    VERCEL_GIT_COMMIT_REF: 'main',
    VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild',
    VERCEL_GIT_REPO_OWNER: 'vsillah',
  });
  assert.equal(
    deploymentMetadata.deploymentReference,
    ACTIVE_WINDOW_BINDING_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  );
  const closure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata,
    now,
  });
  assert.equal(closure.deploymentMetadataAccepted, true);
  assert.equal(closure.startupLiveGateInstallSourceAccepted, true);
  assert.equal(closure.startupLiveGateInstallAccepted, true);
  assert.equal(closure.sourceExecutable, true);
  assert.equal(closure.sessionServiceNonNull, true);
  assert.equal(closure.executableRuntime.enabled, true);
  assert.equal(closure.startupLiveGateInstallSource.startUtc,
    ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW.startUtc);
  assert.equal(closure.startupLiveGateInstallSource.expiresUtc,
    ACTIVE_WINDOW_BINDING_REPAIR_PROOF_WINDOW.expiresUtc);
  assert.equal(
    closure.startupLiveGateInstallSource.privateSupplyReceiptSha256,
    GENERATED_PRIVATE_SUPPLY_RECEIPT_SHA256,
  );
  assert.equal(
    closure.runtime.installation.manifest.commandCardSha256,
    ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_COMMAND_CARD_SHA256,
  );
  assert.equal(
    closure.runtime.installation.liveGate.installationSha256,
    ACTIVE_WINDOW_BINDING_REPAIR_PREVIOUS_INSTALLATION_SHA256,
  );
});

test('deployed no-arg startup path has non-closed source-owned local body gate proof', async () => {
  const closure = createCadStartupLiveGateSourceInstallClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const runtimeMount = createCadLiveOpeningExecutableRuntimeBootstrap({
    executableRuntime: closure.executableRuntime,
  });
  const principal = await closure.sessionService.lookupSession(SESSION_CREDENTIAL_DIGEST_SHA256);
  assert.equal(principal.sessionId, REVIEWED_BOUNDED_SESSION_REF);

  const decision = await runtimeMount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal,
  });
  assert.equal(decision.bodyReadAuthorized, true);
  assert.equal(decision.conversionAuthorized, false);
  assert.equal(decision.sandboxDispatchAuthorized, false);

  const gateDecision = await runtimeMount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal,
    admissionDecision: decision,
  });
  assert.equal(gateDecision.bodyReadAuthorized, true);
  assert.equal(gateDecision.routeBodyGateAuthorized, true);
  assert.equal(gateDecision.conversionAuthorized, false);
  assert.equal(gateDecision.sandboxDispatchAuthorized, false);

  const cleanup = await runtimeMount.routeBodyGate.afterBodyAdmission({
    bodyGateDecision: gateDecision,
    admissionOk: false,
  });
  assert.equal(cleanup.rollbackVerified, true);
  assert.equal(cleanup.unknownOutcome, false);

  const secondAttempt = await runtimeMount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal,
    admissionDecision: decision,
  });
  assert.equal(secondAttempt.bodyReadAuthorized, false);
  assert.equal(secondAttempt.code, 'ATTEMPT_ALREADY_SPENT');
});

test('source rejects drift, stale metadata, and private credential value fields', () => {
  assert.equal(exactStartupLiveGateInstallSource(REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE), true);
  for (const mutate of [
    source => { source.enabled = false; },
    source => { source.explicitLiveOpeningApproved = false; },
    source => { source.activeWindowBindingRepairStoppedLiveOpeningDispositionSha256 = '0'.repeat(64); },
    source => { source.activeWindowBindingRepairApprovedRefreshSha256 = '0'.repeat(64); },
    source => { source.activeWindowBindingRepairBaseMainCommit = '0'.repeat(40); },
    source => { source.activeWindowBindingRepairGithubProductionDeploymentReference = '0'; },
    source => { source.activeWindowBindingRepairProductionTarget = 'https://reversr-stale-vsillahs-projects.vercel.app'; },
    source => { source.activeWindowBindingRepairSourceOwnedDeploymentReference = 'stale'; },
    source => { source.activeWindowBindingRepairPreviousCommandCardSha256 = '0'.repeat(64); },
    source => { source.activeWindowBindingRepairPreviousInstallationSha256 = '0'.repeat(64); },
    source => { source.mainCommit = '0'.repeat(40); },
    source => { source.productionDeploymentReference = 'dpl_stale'; },
    source => { source.sourceOwnedDeploymentReference = 'stale'; },
    source => { source.commandCardSha256 = '0'.repeat(63); },
    source => { source.installationSha256 = '0'.repeat(63); },
    source => { source.privateSupplyReceiptSha256 = '0'.repeat(64); },
    source => { source.privateSupplyReceiptSha256 = REVIEWED_PRIVATE_SUPPLY_RECEIPT_SHA256.slice(1); },
    source => { source.sessionCredentialDigestSha256 = '0'.repeat(64); },
    source => { source.startUtc = '2026-10-01T10:30:00Z'; },
    source => { source.expiresUtc = '2026-10-01T10:00:00Z'; },
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

  const digestDriftSource = {
    ...REVIEWED_STARTUP_LIVE_GATE_INSTALL_SOURCE,
    commandCardSha256: '0'.repeat(64),
  };
  assert.equal(exactStartupLiveGateInstallSource(digestDriftSource), true);
  const digestDriftClosure = createCadStartupLiveGateSourceInstallClosure({
    source: digestDriftSource,
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(checker.PROOF_ENV),
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  assert.equal(digestDriftClosure.startupLiveGateInstallAccepted, false);
  assert.equal(digestDriftClosure.sourceExecutable, false);
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
