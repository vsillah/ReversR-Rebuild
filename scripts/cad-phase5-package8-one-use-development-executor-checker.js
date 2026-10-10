const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/one-use-development-executor-closure.json');
const hashFile = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const EXACT_BASELINE = Object.freeze({
  mergedMainCommit: '228320e174d23cbe9b43d9c192c2216733f4c477',
  mergedMainTree: 'cb22fc27d6bc741f2abc61ed0e456d66e2bfc336',
  productionEvidenceDeploymentId: 'dpl_5AAN3zH7vezsF7So7s93jxz7oVCY',
  finalBindingPacketSha256: '979ddfcc8ff378e50bd451365982b31fb232b21033d78d13f91f403829f4b012',
  postMergeRebindPacketSha256: '882e94de4d42c20934eb69c02b35eadb2c3fee24955bafa9f0c66f589d315cc3',
  reconciliationPacketSha256: 'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const ZERO_ACTIONS = Object.freeze(['providerRequests', 'environmentValuesRead',
  'configurationChanges', 'deployments', 'liveInvocations', 'runtimeActivations',
  'sessionIssuances', 'requestBodyAdmissions', 'privateOrCustomerCadReads',
  'r2Objects', 'sandboxJobs', 'downloads', 'payments', 'retries']);
const APPROVED_SOURCE_AUDIT_SUCCESSOR_SHA256 =
  'd273fa07d3290db09eebf0debf927b35e532ffa105a729eb5acfd8bccaaaf537';

function checkPacket(packet, rootPath = root) {
  if (packet?.schemaVersion !== 1
      || packet.packetType !== 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_EXECUTOR_CLOSURE'
      || packet.status !== 'SOURCE_ONLY_UNMOUNTED_DISABLED_BY_DEFAULT'
      || packet.scope !== 'ONE_USE_DEVELOPMENT_COORDINATOR_SOURCE_CLOSURE') {
    throw Error('packet identity');
  }
  if (JSON.stringify(packet.baseline) !== JSON.stringify(EXACT_BASELINE)) throw Error('baseline binding');
  const expectedEvidence = [
    ['final-development-qualification-binding.json', EXACT_BASELINE.finalBindingPacketSha256],
    ['post-merge-live-adapter-rebind.json', EXACT_BASELINE.postMergeRebindPacketSha256],
    ['readiness-monitoring-reconciliation.json', EXACT_BASELINE.reconciliationPacketSha256],
  ];
  for (const [name, digest] of expectedEvidence) {
    if (hashFile(path.join(rootPath, 'docs/cad-phase5-package8-public-evidence', name)) !== digest) {
      throw Error('immutable evidence digest');
    }
  }
  const bindings = packet.sourceBindings;
  if (!bindings || Object.keys(bindings).length !== 7) throw Error('source bindings');
  for (const binding of Object.values(bindings)) {
    if (typeof binding?.path !== 'string' || !/^[a-f0-9]{64}$/.test(binding.sha256)) {
      throw Error('source digest');
    }
    const currentDigest = hashFile(path.join(rootPath, binding.path));
    if (currentDigest === binding.sha256) continue;
    if (binding.path !== 'scripts/cad-convex-source-audit.js'
        || currentDigest !== APPROVED_SOURCE_AUDIT_SUCCESSOR_SHA256) throw Error('source digest');
    const successor = fs.readFileSync(path.join(rootPath, binding.path), 'utf8');
    for (const file of ['cadPhase5Package8ApprovalIssuanceContract.js',
      'cadPhase5Package8ApprovalIssuerAdapter.js',
      'cadPhase5Package8ApprovalIssuance.ts',
      'independent-approval-issuer-source-closure.json']) {
      if (!successor.includes(file)) throw Error('source audit successor');
    }
  }
  const contract = packet.coordinatorContract || {};
  if (contract.actualReviewedFactoriesComposed !== true
      || contract.offlineSyntheticSubstitution !== false
      || contract.independentApprovalIssuanceVerifierRequired !== true
      || contract.approvalIssuanceVerificationRunsFirst !== true
      || contract.durableClaimBindsIssuanceReferenceAndReceiptDigest !== true
      || contract.approvalBoundOwnerAndSession !== true
      || contract.cleanDescendantAncestryReceiptRequired !== true
      || contract.exactDevelopmentDeploymentReceiptRequired !== true
      || contract.runtimeRouteMounted !== false || contract.runtimeActivationAllowed !== false
      || contract.sessionIssuanceEnabled !== false
      || contract.requestBodyAdmissionAuthorized !== false || contract.automaticRetries !== 0
      || JSON.stringify(contract.closeFirstOrder) !== JSON.stringify([
        'convex.closeForRollback', 'session.revokeSession', 'sandbox.cleanupConfirmed',
        'convex.reconcile', 'grant.revokeReconcile', 'artifact.quarantineReconcile',
        'r2.deleteExact', 'convex.tombstoneReconcile'])) throw Error('coordinator contract');
  const limits = packet.oneUseLimits || {};
  if (limits.maximumSessions !== 1 || limits.maximumFiles !== 1
      || limits.maximumAttempts !== 1 || limits.maximumRetries !== 0
      || limits.maximumWindowMinutes !== 15 || limits.maximumCostUsdExclusive !== 9
      || limits.reservationMicros !== 8_999_999
      || limits.projectOwnedNonproprietarySyntheticFixtureOnly !== true
      || limits.ownerShopIsolationRequired !== true) throw Error('one-use limits');
  const boundary = packet.credentialAndEnvironmentBoundary || {};
  if (JSON.stringify(boundary.credentialReferences) !== JSON.stringify([
    'reversr-package8-public-fixture-dev-preview-v2'])
      || JSON.stringify(boundary.environmentVariableReferences) !== JSON.stringify([
        'CAD_R2_ACCESS_KEY_ID', 'CAD_R2_SECRET_ACCESS_KEY', 'VERCEL_OIDC_TOKEN'])
      || boundary.valuesReadByThisRound !== false || boundary.httpRouteAdded !== false) {
    throw Error('credential boundary');
  }
  if (!Array.isArray(packet.offlineValidationCoverage)
      || packet.offlineValidationCoverage.length !== 10
      || !packet.offlineValidationCoverage.includes(
        'INDEPENDENT_APPROVAL_ISSUANCE_AUTHENTICITY')) throw Error('validation coverage');
  if (ZERO_ACTIONS.some(key => packet.actionsPerformedByThisRound?.[key] !== 0)) {
    throw Error('action boundary');
  }
  const gate = packet.remainingGate || {};
  if (gate.type !== 'DRAFT_PR_SOURCE_REVIEW_THEN_EXACT_RUNTIME_BINDING'
      || gate.mergeAuthorized !== false || gate.deploymentAuthorized !== false
      || gate.runtimeActivationAuthorized !== false || gate.oneUseApprovalArtifactIssued !== false
      || gate.independentApprovalIssuanceVerifierSupplied !== false
      || gate.liveQualificationAuthorized !== false) throw Error('remaining gate');
  const coordinator = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8OneUseCoordinator.js'), 'utf8');
  const binding = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8DevelopmentQualificationBinding.js'), 'utf8');
  if (/process\.env|fetch\s*\(|https?\.request|offlineSynthetic/.test(`${coordinator}\n${binding}`)
      || !/routeMounted:\s*false/.test(coordinator)
      || !/runtimeActivationAllowed:\s*false/.test(coordinator)
      || !/env:\s*EMPTY_ENVIRONMENT/.test(binding)) throw Error('source boundary');
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const source = fs.readFileSync(path.join(rootPath, runtime), 'utf8');
    if (/cadPhase5Package8OneUseCoordinator|cadPhase5Package8DevelopmentQualificationBinding/.test(source)) {
      throw Error('runtime import');
    }
  }
  return Object.freeze({ status: 'PASS', sourceOnly: true, unmounted: true,
    baselineCommit: EXACT_BASELINE.mergedMainCommit, providerRequests: 0,
    runtimeActivationAuthorized: false, approvalArtifactIssued: false });
}

function check(rootPath = root) {
  return checkPacket(JSON.parse(fs.readFileSync(path.join(rootPath,
    path.relative(root, packetPath)), 'utf8')), rootPath);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { EXACT_BASELINE, check, checkPacket };
