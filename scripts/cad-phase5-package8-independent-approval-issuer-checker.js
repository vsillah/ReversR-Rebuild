const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/independent-approval-issuer-source-closure.json');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function check(rootPath = root) {
  const packet = JSON.parse(fs.readFileSync(path.join(rootPath,
    path.relative(root, packetPath)), 'utf8'));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType,
    'CAD_PHASE5_PACKAGE8_INDEPENDENT_APPROVAL_ISSUER_SOURCE_CLOSURE');
  assert.equal(packet.status, 'SOURCE_ONLY_INTERNAL_UNMOUNTED_DISABLED');
  assert.deepEqual(packet.baseline, {
    mergedMainCommit: '1512dedb5c240765bf87c749e07ed2f6709ec5b1',
    mergedMainTree: 'a1378dc31e79690fcc717f2414b39074133773a5',
    productionEvidenceDeploymentId: 'dpl_7LvYWCimHGDd2TK7i9qGiYutv1ut',
    privatePreparationSha256: '024e183dd84087fe9c6d685a59dda95d14ea1b1f4b3f63b590b8fa73aaed69eb',
    unissuedApprovalDraftSha256: '647d4c500bf79904c1c139cb015f759600437e76d51f97e284120b22dbed514f',
  });
  for (const binding of Object.values(packet.sourceBindings)) {
    assert.equal(sha256(path.join(rootPath, binding.path)), binding.sha256, binding.path);
  }
  assert.deepEqual(packet.durableOperations,
    ['issue', 'verify', 'consume', 'revoke', 'close', 'readSanitized']);
  assert.equal(packet.ownershipBoundary.executionCoordinatorImportsIssuer, false);
  assert.equal(packet.ownershipBoundary.runtimeImportsIssuer, false);
  assert.equal(packet.ownershipBoundary.publicFunctionsExposed, 0);
  assert.equal(packet.ownershipBoundary.httpRoutesAdded, 0);
  assert.equal(packet.durabilityAndRollback.atomicOneUseConsumption, true);
  assert.equal(packet.durabilityAndRollback.replayRefused, true);
  assert.equal(packet.durabilityAndRollback.restartDurabilityBackedByConvexTable, true);
  assert.equal(packet.durabilityAndRollback.automaticRetries, 0);
  assert.equal(packet.privacyBoundary.rawOwnerIdentifiersStored, false);
  assert.equal(packet.privacyBoundary.rawSessionIdentifiersStored, false);
  assert.equal(packet.privacyBoundary.credentialOrEnvironmentValuesRead, false);
  assert.equal(packet.privacyBoundary.sanitizedEvidenceOnly, true);
  assert.ok(Object.values(packet.defaultState).every(value => value === false));
  assert.equal(packet.offlineValidation.focusedSyntheticTests, 9);
  assert.equal(packet.offlineValidation.focusedSyntheticTestsPassed, 9);
  assert.equal(packet.offlineValidation.typescriptPassed, true);
  assert.equal(packet.offlineValidation.localOnlyCodegenPassed, true);
  assert.ok(Object.values(packet.actionsPerformedByThisImplementation)
    .every(value => value === 0));
  assert.equal(packet.nextGate.type, 'DRAFT_PR_SOURCE_REVIEW');
  assert.equal(packet.nextGate.mergeAuthorized, false);
  assert.equal(packet.nextGate.deploymentAuthorized, false);
  assert.equal(packet.nextGate.approvalArtifactIssuanceAuthorized, false);
  assert.equal(packet.nextGate.liveQualificationAuthorized, false);

  const sourceFiles = [
    'server/cadPhase5Package8ApprovalIssuanceContract.js',
    'server/cadPhase5Package8ApprovalIssuerAdapter.js',
    'convex/cadPhase5Package8ApprovalIssuance.ts',
  ];
  const source = sourceFiles.map(file => fs.readFileSync(path.join(rootPath, file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|CAD_R2_|VERCEL_OIDC|secretAccessKey|private key/i);
  assert.match(source, /automaticRetries:\s*0/);
  assert.match(source, /cadPackage8ApprovalIssuances/);
  for (const operation of packet.durableOperations) {
    assert.match(source, new RegExp(`(?:export const|${operation}:)\\s*${operation}`));
  }
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js',
    'server/cadPhase5Package8OneUseCoordinator.js']) {
    const runtimeSource = fs.readFileSync(path.join(rootPath, runtime), 'utf8');
    assert.doesNotMatch(runtimeSource,
      /cadPhase5Package8ApprovalIssuer|cadPhase5Package8ApprovalIssuance/);
  }
  return Object.freeze({ status: 'PASS', sourceOnly: true,
    operations: packet.durableOperations.length, approvalArtifactsIssued: 0,
    runtimeMounted: false, automaticRetries: 0 });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
