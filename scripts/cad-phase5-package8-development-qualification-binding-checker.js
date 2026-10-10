const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/final-development-qualification-binding.json');
const EXPECTED = Object.freeze({
  main: '499ee332c0d076f531561a1d79939bc8e9aaddff',
  tree: '2b5c21f854327fbec81be6fa08d1e9aaa717f3fa',
  deployment: 'dpl_D9DcWPErFXC7De9q7pr7KWdQSs2t',
  rebind: '882e94de4d42c20934eb69c02b35eadb2c3fee24955bafa9f0c66f589d315cc3',
  reconciliation: 'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const allFalse = value => Boolean(value && Object.keys(value).length > 0
  && Object.values(value).every(item => item === false));

function checkPacket(packet, rootPath = root) {
  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_FINAL_DEVELOPMENT_QUALIFICATION_BINDING'
      || packet.status !== 'SOURCE_ONLY_UNMOUNTED_DISABLED'
      || packet.scope !== 'REVIEWED_ADAPTER_SOURCE_COMPOSITION_NO_EXECUTION') {
    throw Error('packet identity');
  }
  const source = packet.source || {};
  if (source.repository !== 'vsillah/ReversR-Rebuild'
      || source.mergedMainCommit !== EXPECTED.main || source.mergedMainTree !== EXPECTED.tree
      || source.productionEvidenceDeploymentId !== EXPECTED.deployment
      || source.productionEvidenceState !== 'READY'
      || source.postMergeRebindPacketSha256 !== EXPECTED.rebind
      || source.reconciliationPacketSha256 !== EXPECTED.reconciliation
      || source.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED'
      || source.providerRecheckPerformedByThisRound !== false) throw Error('source binding');
  if (sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/post-merge-live-adapter-rebind.json'))
      !== EXPECTED.rebind || sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/readiness-monitoring-reconciliation.json'))
      !== EXPECTED.reconciliation) throw Error('evidence digest');
  for (const binding of Object.values(packet.sourceBindings || {})) {
    if (typeof binding?.path !== 'string' || typeof binding.sha256 !== 'string'
        || sha256(path.join(rootPath, binding.path)) !== binding.sha256) {
      throw Error('source digest');
    }
  }
  const composition = packet.sourceComposition || {};
  if (composition.actualReviewedFactoriesComposed !== true
      || composition.offlineSyntheticSubstitution !== false
      || composition.executableAdaptersExposed !== false
      || composition.dependencyInvocationsDuringComposition !== 0
      || composition.sandboxEnvironmentValuesRead !== false
      || composition.sandboxReceivesExplicitEmptyEnvironment !== true
      || JSON.stringify(composition.convexOperations) !== JSON.stringify({
        reserveArtifact: 'mutation', consumeQuota: 'mutation', readArtifact: 'query',
        transitionArtifact: 'mutation', confirmDeleted: 'mutation',
        issueDownloadGrant: 'mutation', resolveDownloadGrant: 'query',
        claimUpload: 'mutation', advanceUpload: 'mutation', claimConversion: 'mutation',
        advanceConversion: 'mutation', closeForRollback: 'mutation', reconcile: 'query',
      })
      || JSON.stringify(composition.closeFirstOrder) !== JSON.stringify([
        'convex.closeForRollback', 'session.revokeSession', 'sandbox.cleanupBlocked',
        'r2.deleteArtifact', 'convex.reconcile'])) throw Error('source composition');
  const approval = packet.approvalArtifactContract || {};
  if (approval.kind !== 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL'
      || approval.status !== 'NOT_ISSUED'
      || approval.requiredIssuedStatus !== 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION'
      || approval.issued !== false
      || approval.maximumSessions !== 1 || approval.maximumFiles !== 1
      || approval.maximumAttempts !== 1 || approval.maximumRetries !== 0
      || approval.maximumWindowMinutes !== 15 || approval.maximumCostUsdExclusive !== 9
      || approval.reservationMicros !== 8_999_999
      || approval.ownerShopIsolationRequired !== true
      || approval.freshAuthorityRequired !== true
      || approval.closeFirstRollbackRequired !== true) throw Error('approval boundary');
  if (JSON.stringify(packet.credentialReferences) !== JSON.stringify([
    'reversr-package8-public-fixture-dev-preview-v2'])
      || JSON.stringify(packet.environmentVariableReferences) !== JSON.stringify([
        'CAD_R2_ACCESS_KEY_ID', 'CAD_R2_SECRET_ACCESS_KEY', 'VERCEL_OIDC_TOKEN'])
      || packet.credentialOrEnvironmentValuesRead !== false) throw Error('credential boundary');
  if (!allFalse(packet.defaultState)) throw Error('runtime boundary');
  const validation = packet.validationBoundary || {};
  if (validation.sourceCompositionOnly !== true || ['providerRequests', 'configurationChanges',
    'deployments', 'liveInvocations', 'runtimeActivations', 'sessionIssuances',
    'requestBodyAdmissions', 'privateOrCustomerCadReads', 'r2Objects', 'sandboxJobs',
    'downloads', 'payments', 'retries'].some(key => validation[key] !== 0)) {
    throw Error('validation boundary');
  }
  if (JSON.stringify(packet.remainingLiveBlockers) !== JSON.stringify([
    'ONE_USE_APPROVAL_ARTIFACT_NOT_ISSUED',
    'EXACT_LIVE_ACTIVATION_GATE_NOT_REVIEWED',
    'LIVE_CONVEX_REFERENCES_AND_TRANSPORT_NOT_INSTALLED',
    'LIVE_R2_PROVIDER_AND_STORE_NOT_INSTALLED',
    'LIVE_SANDBOX_CREATE_BINDING_NOT_INSTALLED',
    'LIVE_EXACT_SESSION_STORE_AND_VERIFIER_NOT_INSTALLED',
    'ACTIVE_WINDOW_AND_COST_REVALIDATION_NOT_SUPPLIED',
    'SOURCE_TO_DEPLOYMENT_FUNCTION_EQUIVALENCE_NOT_CLAIMED',
  ])) throw Error('blocker inventory');
  if (packet.nextGate?.type !== 'DRAFT_PR_SOURCE_REVIEW'
      || packet.nextGate.mergeAuthorized !== false
      || packet.nextGate.runtimeActivationAuthorized !== false
      || packet.nextGate.liveQualificationAuthorized !== false) throw Error('next gate');
  const bindingSource = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8DevelopmentQualificationBinding.js'), 'utf8');
  if (/process\.env|fetch\s*\(|https?\.request|credentialOptions/.test(bindingSource)
      || /createCadPhase5Package8InternalRunner|OFFLINE_REVIEW_GATE|offlineSynthetic/.test(bindingSource)
      || !/createCadPhase5Package8ConvexDurableInvoker/.test(bindingSource)
      || !/createCadR2PrivateArtifactCustody/.test(bindingSource)
      || !/createSandboxExecutor/.test(bindingSource)
      || !/createCadExactSessionBridge/.test(bindingSource)
      || !/createUploadSessionService/.test(bindingSource)
      || !/env:\s*EMPTY_ENVIRONMENT/.test(bindingSource)
      || !/liveBindingsSupplied:\s*false/.test(bindingSource)
      || !/configured:\s*false/.test(bindingSource)
      || !/routeMounted:\s*false/.test(bindingSource)
      || !/runtimeActivationAllowed:\s*false/.test(bindingSource)) throw Error('source boundary');
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    if (fs.readFileSync(path.join(rootPath, runtime), 'utf8')
      .includes('cadPhase5Package8DevelopmentQualificationBinding')) throw Error('runtime import');
  }
  return Object.freeze({ status: 'PASS', mergedMainCommit: EXPECTED.main,
    mergedMainTree: EXPECTED.tree, productionEvidenceDeploymentId: EXPECTED.deployment,
    approvalArtifactIssued: false, runtimeActivationAuthorized: false,
    providerRequests: 0, blockers: packet.remainingLiveBlockers.length });
}

function check(rootPath = root) {
  return checkPacket(JSON.parse(fs.readFileSync(path.join(rootPath,
    path.relative(root, packetPath)), 'utf8')), rootPath);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { EXPECTED, check, checkPacket };
