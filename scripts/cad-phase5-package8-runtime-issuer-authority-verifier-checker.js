const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  VERIFIER_REVIEW_GATE,
  VERIFIER_SOURCE_BINDING,
  createCadPhase5Package8RuntimeIssuerAuthorityVerifier,
} = require('../server/cadPhase5Package8RuntimeIssuerAuthorityVerifier');

const root = path.resolve(__dirname, '..');
const packetRelative =
  'docs/cad-phase5-package8-public-evidence/runtime-issuer-authority-verifier-source-closure.json';
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = (rootPath, file) => fs.readFileSync(path.join(rootPath, file), 'utf8');

function check(rootPath = root) {
  const packet = JSON.parse(read(rootPath, packetRelative));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType,
    'CAD_PHASE5_PACKAGE8_RUNTIME_ISSUER_AUTHORITY_VERIFIER_SOURCE_CLOSURE');
  assert.equal(packet.status, 'SOURCE_ONLY_INTERNAL_UNMOUNTED_DISABLED');
  assert.equal(packet.scope,
    'SANITIZED_COMMITMENT_ONE_USE_RUNTIME_ISSUER_AUTHORITY_VERIFICATION');
  assert.deepEqual(packet.baseline, {
    mergedMainCommit: '06897c895354b45d290cfc6ea1d7d0ccb9367243',
    mergedMainTree: '18feadb96a8da14fe102999d744155df5d8c7cf4',
    productionDeploymentId: 'dpl_4Dq2J7w4yZ6B32ZXMmcuLrzdM3Tk',
    baselineContractReconciliationSha256:
      'cc369119f75ab8357f17ef22c236ba02ec4870b5d119043525633e87d54fd1a7',
    preparationPacketSha256:
      '425fa7ca434c638669223239568caef2d3ad62c655fd38c0b5500fae5e78e0f4',
    unissuedDraftSha256:
      '88b986914c54040503f1fdbbea4d48f3a181462e62fb0d1c6302ecdac462b210',
    incompatibilityStopPacketSha256:
      '935eba1cc64ab8640845c3f30e8e74c21a99445ddc13294e725078e15263651c',
    launcherClosureSha256:
      'da063f17489e95a2a8bbf55e9e32da40fca93866291d673e22276305408fc1c1',
    independentIssuerClosureSha256:
      'f14dd1a403d2513e039ecb6ba72af321f0899c6cd549ff0d77eaa10ce5a4eceb',
    reconciliationPacketSha256:
      'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  });
  assert.deepEqual(VERIFIER_SOURCE_BINDING, {
    reviewedMainCommit: packet.baseline.mergedMainCommit,
    reviewedMainTree: packet.baseline.mergedMainTree,
    productionEvidenceDeploymentId: packet.baseline.productionDeploymentId,
    baselineReconciliationPacketSha256:
      packet.baseline.baselineContractReconciliationSha256,
    preparationPacketSha256: packet.baseline.preparationPacketSha256,
    unissuedDraftSha256: packet.baseline.unissuedDraftSha256,
    incompatibilityStopPacketSha256: packet.baseline.incompatibilityStopPacketSha256,
    launcherClosureSha256: packet.baseline.launcherClosureSha256,
    independentIssuerClosureSha256: packet.baseline.independentIssuerClosureSha256,
    reconciliationPacketSha256: packet.baseline.reconciliationPacketSha256,
  });
  for (const binding of Object.values(packet.sourceBindings)) {
    assert.equal(sha256(path.join(rootPath, binding.path)), binding.sha256, binding.path);
  }
  assert.equal(sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/baseline-contract-reconciliation.json')),
  packet.baseline.baselineContractReconciliationSha256);
  assert.equal(sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/independent-runtime-issuer-authority-verifier-stop.json')),
  packet.baseline.incompatibilityStopPacketSha256);
  assert.deepEqual(packet.contract.operations, ['verifyExact']);
  assert.equal(packet.contract.sanitizedCommitmentsOnly, true);
  assert.equal(packet.contract.independentVerifierOwnership, true);
  assert.equal(packet.contract.oneUseLedgerConsumptionBeforeReceipt, true);
  assert.equal(packet.contract.replayAccepted, false);
  assert.equal(packet.contract.unsupportedFunctionEquivalenceClaimed, false);
  assert.equal(packet.contract.unknownOutcomeRetried, false);
  assert.equal(packet.controls.maximumSessions, 1);
  assert.equal(packet.controls.maximumFiles, 1);
  assert.equal(packet.controls.maximumAttempts, 1);
  assert.equal(packet.controls.maximumRetries, 0);
  assert.equal(packet.controls.maximumWindowMinutes, 15);
  assert.equal(packet.controls.maximumCostUsdExclusive, 9);
  assert.ok(Object.values(packet.defaultState).every(value => value === false));
  assert.equal(packet.offlineValidation.focusedSyntheticTests, 8);
  assert.equal(packet.offlineValidation.focusedSyntheticTestsPassed, 8);
  assert.ok(Object.values(packet.actionsPerformed).every(value => value === 0));
  assert.equal(packet.nextGate.type, 'DRAFT_PR_SOURCE_REVIEW');
  assert.equal(packet.nextGate.runtimeActivationAllowed, false);
  assert.equal(packet.nextGate.liveQualificationAllowed, false);

  const disabled = createCadPhase5Package8RuntimeIssuerAuthorityVerifier();
  assert.equal(disabled.reviewConfigured, false);
  assert.deepEqual(Object.entries(disabled)
    .filter(([, value]) => typeof value === 'function')
    .map(([name]) => name), ['verifyExact']);
  assert.ok(Object.values(VERIFIER_REVIEW_GATE)
    .filter(value => typeof value === 'boolean').every(value => value === false));

  const source = read(rootPath,
    'server/cadPhase5Package8RuntimeIssuerAuthorityVerifier.js');
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|child_process|console\.|secretAccessKey|private key/i);
  assert.match(source, /expectedRuntimeAuthorityReceipt/);
  assert.match(source, /functionSchemaEquivalenceClaimed === false/);
  assert.match(source, /PACKAGE8_RUNTIME_ISSUER_AUTHORITY_OUTCOME_UNKNOWN/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(read(rootPath, runtime),
      /cadPhase5Package8RuntimeIssuerAuthorityVerifier/);
  }
  return Object.freeze({
    status: 'PASS',
    sourceOnly: true,
    operations: 1,
    focusedSyntheticTests: 8,
    runtimeMounted: false,
    approvalArtifactsIssued: 0,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
  });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
