const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  LIMITS: QUALIFICATION_LIMITS,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const {
  EXECUTION_BASELINE,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const {
  ISSUER_BASELINE,
  QUALIFICATION_LIMITS: ISSUER_QUALIFICATION_LIMITS,
} = require('../server/cadPhase5Package8ApprovalIssuanceContract');

const root = path.resolve(__dirname, '..');
const packetRelative =
  'docs/cad-phase5-package8-public-evidence/baseline-contract-reconciliation.json';
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function check(rootPath = root) {
  const packet = JSON.parse(fs.readFileSync(path.join(rootPath, packetRelative), 'utf8'));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType,
    'CAD_PHASE5_PACKAGE8_BASELINE_CONTRACT_RECONCILIATION');
  assert.equal(packet.status, 'SOURCE_ONLY_RECONCILED_DISABLED');
  assert.deepEqual(packet.baseline, {
    mergedMainCommit: '06897c895354b45d290cfc6ea1d7d0ccb9367243',
    mergedMainTree: '18feadb96a8da14fe102999d744155df5d8c7cf4',
    productionDeploymentId: 'dpl_4Dq2J7w4yZ6B32ZXMmcuLrzdM3Tk',
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
  for (const binding of Object.values(packet.sourceBindings)) {
    assert.equal(sha256(path.join(rootPath, binding.path)), binding.sha256, binding.path);
  }
  assert.equal(ISSUER_BASELINE.reviewedMainCommit, EXECUTION_BASELINE.mergedMainCommit);
  assert.equal(ISSUER_BASELINE.reviewedMainTree, EXECUTION_BASELINE.mergedMainTree);
  assert.deepEqual(ISSUER_QUALIFICATION_LIMITS, QUALIFICATION_LIMITS);
  assert.equal(packet.compatibility.canonicalExecutionBaselineCommit,
    EXECUTION_BASELINE.mergedMainCommit);
  assert.equal(packet.compatibility.canonicalExecutionBaselineTree,
    EXECUTION_BASELINE.mergedMainTree);
  assert.equal(packet.compatibility.launcherRequestAcceptedByIssuer, true);
  assert.equal(packet.compatibility.launcherAndIssuerReceiptEquivalent, true);
  assert.equal(packet.compatibility.reviewedHeadBoundAsCleanDescendant, true);
  assert.equal(packet.compatibility.runtimeReceiptBindsReviewedHead, true);
  assert.equal(packet.compatibility.qualificationAndLedgerLimitShapesSeparated, true);
  assert.equal(packet.compatibility.numericLimitsPreserved, true);
  assert.equal(packet.compatibility.selfReferentialBindingIntroduced, false);
  assert.equal(packet.controls.maximumSessions, 1);
  assert.equal(packet.controls.maximumFiles, 1);
  assert.equal(packet.controls.maximumAttempts, 1);
  assert.equal(packet.controls.maximumRetries, 0);
  assert.equal(packet.controls.maximumCostUsdExclusive, 9);
  assert.ok(Object.values(packet.defaultState).every(value => value === false));
  assert.ok(Object.values(packet.actionsPerformed).every(value => value === 0));
  assert.equal(packet.validation.crossModuleTestsPassed, 3);
  assert.equal(packet.nextGate.type,
    'SOURCE_ONLY_INDEPENDENT_RUNTIME_ISSUER_AUTHORITY_VERIFIER');
  assert.equal(packet.nextGate.runtimeActivationAllowed, false);

  const source = Object.values(packet.sourceBindings)
    .filter(binding => binding.path.startsWith('server/'))
    .map(binding => fs.readFileSync(path.join(rootPath, binding.path), 'utf8'))
    .join('\n');
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|child_process|secretAccessKey|private key/i);
  return Object.freeze({
    status: 'PASS',
    sourceOnly: true,
    canonicalBaselineReconciled: true,
    crossModuleTests: 3,
    runtimeMounted: false,
    approvalArtifactsIssued: 0,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
  });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
