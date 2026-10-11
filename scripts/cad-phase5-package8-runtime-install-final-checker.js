const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = 'docs/cad-phase5-package8-public-evidence/runtime-install-final-source-closure.json';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fileSha256 = (rootPath, file) => sha256(fs.readFileSync(path.join(rootPath, file)));

function check(rootPath = root) {
  const packet = JSON.parse(fs.readFileSync(path.join(rootPath, packetPath), 'utf8'));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType,
    'CAD_PHASE5_PACKAGE8_FINAL_RUNTIME_INSTALL_SOURCE_CLOSURE');
  assert.equal(packet.status, 'SOURCE_ONLY_INTERNAL_UNMOUNTED_DISABLED');
  assert.deepEqual(packet.parent, {
    commit: 'c9dfd22a230869ef618c3c8fdfcc95ab86b8aaa0',
    tree: '6db5b4f3c774e79aabb51ffa97d24d1d54c1e5dd',
  });
  assert.ok(Array.isArray(packet.reviewedFiles) && packet.reviewedFiles.length >= 27);
  assert.deepEqual([...packet.reviewedFiles].sort(), packet.reviewedFiles);
  assert.equal(new Set(packet.reviewedFiles).size, packet.reviewedFiles.length);
  const inventory = packet.reviewedFiles.map(file => ({ path: file,
    sha256: fileSha256(rootPath, file) }));
  assert.equal(sha256(JSON.stringify(inventory)), packet.reviewedBundleSha256);
  for (const required of [
    'convex/cadPhase5Package8RuntimeIssuerAuthority.ts',
    'server/cadPhase5Package8RuntimeIssuerAuthorityAdapter.js',
    'server/cadPhase5Package8RuntimeIssuerAuthorityVerifier.js',
    'server/cadPhase5Package8InternalQualificationCommand.js',
    'scripts/run-cad-phase5-package8-internal-qualification.js',
  ]) assert.ok(packet.reviewedFiles.includes(required), required);
  assert.deepEqual(packet.contract, {
    durableConvexRuntimeAuthorityLedger: true,
    internalAdapterInstalled: true,
    immutableExecutionBaseline: '228320e174d23cbe9b43d9c192c2216733f4c477',
    cleanDescendantRequired: true,
    exactDevelopmentRuntimeReceiptRequired: true,
    deploymentIdentityMetadataSupported: true,
    sourceToDeploymentFunctionEquivalenceClaimed: false,
    runtimeAuthorityConsumedBeforeApprovalAndProviderEffects: true,
    atomicOneUseConsumption: true,
    restartReplayRefused: true,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
    executableInternalCommand: true,
    httpRouteAdded: false,
    runtimeMounted: false,
    runtimeActivationAuthorized: false,
  });
  assert.ok(Object.values(packet.actionsPerformed).every(value => value === 0));
  assert.equal(packet.validation.focusedTestsPassed, true);
  assert.equal(packet.validation.package8SuitePassed, true);
  assert.equal(packet.validation.codegenCheckPassed, true);
  assert.equal(packet.validation.typecheckPassed, true);
  assert.equal(packet.validation.contractManifestPassed, true);
  assert.equal(packet.validation.privacyScanPassed, true);
  assert.equal(packet.nextGate.type, 'DRAFT_PR_CHECKS_AND_MERGE_REVIEW');
  assert.equal(packet.nextGate.mergeAuthorized, false);
  assert.equal(packet.nextGate.runtimeQualificationAuthorized, false);

  const convex = fs.readFileSync(path.join(rootPath,
    'convex/cadPhase5Package8RuntimeIssuerAuthority.ts'), 'utf8');
  const command = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8InternalQualificationCommand.js'), 'utf8');
  assert.match(convex, /internalMutation/);
  assert.match(convex, /internalQuery/);
  assert.doesNotMatch(convex, /export const \w+\s*=\s*(query|mutation|action)\s*\(/);
  assert.doesNotMatch(`${convex}\n${command}`,
    /process\.env|fetch\s*\(|https?\.request|httpAction|app\.(get|post|use)\s*\(/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const source = fs.readFileSync(path.join(rootPath, runtime), 'utf8');
    assert.doesNotMatch(source,
      /cadPhase5Package8InternalQualificationCommand|cadPhase5Package8RuntimeIssuerAuthority/);
  }
  return Object.freeze({ status: 'PASS', sourceOnly: true, reviewedFiles: inventory.length,
    runtimeMounted: false, runtimeActivationAuthorized: false, retries: 0 });
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check };
