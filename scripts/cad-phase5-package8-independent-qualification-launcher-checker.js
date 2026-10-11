const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetRelative =
  'docs/cad-phase5-package8-public-evidence/independent-qualification-launcher-source-closure.json';
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = (rootPath, file) => fs.readFileSync(path.join(rootPath, file), 'utf8');

function check(rootPath = root) {
  const packet = JSON.parse(read(rootPath, packetRelative));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType,
    'CAD_PHASE5_PACKAGE8_INDEPENDENT_QUALIFICATION_LAUNCHER_SOURCE_CLOSURE');
  assert.equal(packet.status, 'SOURCE_ONLY_UNMOUNTED_DISABLED');
  assert.equal(packet.scope,
    'INDEPENDENT_ISSUER_CONSUMPTION_BEFORE_QUALIFICATION_BINDING');
  assert.deepEqual(packet.baseline, {
    mergedMainCommit: 'a24ac3f3e18e8ce5eb03d36fbc18c669e149e328',
    mergedMainTree: '1a03c0d437cf4e9900f9acc1d5f13f9f6e5d74e7',
    productionEvidenceDeploymentId: 'dpl_56C2e54pmrn94oBdAEAnVHcVLjvA',
    independentIssuerClosureSha256:
      'f14dd1a403d2513e039ecb6ba72af321f0899c6cd549ff0d77eaa10ce5a4eceb',
    reconciliationPacketSha256:
      'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  });
  for (const binding of Object.values(packet.sourceBindings)) {
    assert.equal(sha256(path.join(rootPath, binding.path)), binding.sha256, binding.path);
  }
  assert.equal(packet.authority.independentRuntimeAuthorityVerifierRequired, true);
  assert.equal(packet.authority.issuerPrincipalMustDifferFromOwner, true);
  assert.equal(packet.authority.issuerPrincipalMustDifferFromSession, true);
  assert.equal(packet.authority.liveVerifierSupplied, false);
  assert.deepEqual(packet.sequence, [
    'VERIFY_INDEPENDENT_ISSUER_AUTHORITY',
    'VERIFY_ACTIVE_ONE_USE_APPROVAL',
    'ATOMICALLY_CONSUME_APPROVAL',
    'SUPPLY_SINGLE_CACHED_CONSUMPTION_PROOF',
    'RUN_EXISTING_QUALIFICATION_BINDING',
    'REVOKE_ON_FAILURE',
    'CLOSE_APPROVAL_TERMINALLY',
    'READ_SANITIZED_TERMINAL_EVIDENCE',
  ]);
  assert.equal(packet.controls.consumptionBeforeProviderEligibility, true);
  assert.equal(packet.controls.actualApprovalIssuanceImplemented, false);
  assert.equal(packet.controls.oneSession, true);
  assert.equal(packet.controls.oneFile, true);
  assert.equal(packet.controls.oneAttempt, true);
  assert.equal(packet.controls.maximumRetries, 0);
  assert.equal(packet.controls.restartReplayTransfersAuthority, false);
  assert.equal(packet.controls.unknownMutationOutcomeStops, true);
  assert.equal(packet.controls.closeFirstFailurePath, true);
  assert.ok(Object.values(packet.defaultState).every(value => value === false));
  assert.equal(packet.offlineValidation.focusedSyntheticTests, 9);
  assert.equal(packet.offlineValidation.focusedSyntheticTestsPassed, 9);
  assert.ok(Object.values(packet.actionsPerformedByThisImplementation)
    .every(value => value === 0));
  assert.equal(packet.nextGate.type, 'DRAFT_PR_SOURCE_REVIEW');
  assert.equal(packet.nextGate.mergeAuthorized, false);
  assert.equal(packet.nextGate.deploymentAuthorized, false);
  assert.equal(packet.nextGate.actualApprovalIssuanceAuthorized, false);
  assert.equal(packet.nextGate.liveQualificationAuthorized, false);

  const launcherPath = 'server/cadPhase5Package8IndependentQualificationLauncher.js';
  const launcher = read(rootPath, launcherPath);
  assert.doesNotMatch(launcher,
    /process\.env|fetch\s*\(|https?\.request|child_process|console\.|secretAccessKey|private key/i);
  assert.doesNotMatch(launcher, /\.issueExact\s*\(/);
  assert.match(launcher, /createCadPhase5Package8DevelopmentQualificationBinding/);
  assert.match(launcher, /createConsumedApprovalVerifier/);
  assert.match(launcher, /independentRuntimeIssuerCustodyBound:\s*true/);
  assert.match(launcher, /applicationRetries:\s*0/);
  assert.match(launcher, /transportRetries:\s*0/);
  assert.match(launcher, /providerRetries:\s*0/);
  const order = [
    'counts.authorityVerifications += 1;',
    'counts.issuerVerifications += 1;',
    'counts.issuerConsumptions += 1;',
    'const approvalIssuance = createConsumedApprovalVerifier(',
    'qualification = qualificationBindingFactory({',
  ].map(token => launcher.indexOf(token));
  assert.ok(order.every(index => index >= 0));
  assert.deepEqual([...order].sort((left, right) => left - right), order);
  assert.ok(launcher.indexOf('approvalIssuer.revokeExact({')
    < launcher.indexOf('approvalIssuer.closeExact({'));

  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(read(rootPath, runtime),
      /cadPhase5Package8IndependentQualificationLauncher/);
  }
  const sourceAudit = read(rootPath, 'scripts/cad-convex-source-audit.js');
  const manifestGenerator = read(rootPath, 'scripts/cad-convex-contract-manifest.js');
  for (const file of [launcherPath,
    'scripts/cad-phase5-package8-independent-qualification-launcher.test.js',
    'scripts/cad-phase5-package8-independent-qualification-launcher-checker.js',
    packetRelative]) {
    assert.match(sourceAudit, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(manifestGenerator,
      new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  return Object.freeze({
    status: 'PASS',
    sourceOnly: true,
    focusedSyntheticTests: packet.offlineValidation.focusedSyntheticTestsPassed,
    approvalArtifactsIssued: 0,
    runtimeMounted: false,
    consumptionBeforeProviderEligibility: true,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
  });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
