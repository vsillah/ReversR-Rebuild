const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/final-development-qualification-binding.json');
const EXPECTED = Object.freeze({
  packetSha256: '979ddfcc8ff378e50bd451365982b31fb232b21033d78d13f91f403829f4b012',
  main: '499ee332c0d076f531561a1d79939bc8e9aaddff',
  tree: '2b5c21f854327fbec81be6fa08d1e9aaa717f3fa',
  deployment: 'dpl_D9DcWPErFXC7De9q7pr7KWdQSs2t',
  rebind: '882e94de4d42c20934eb69c02b35eadb2c3fee24955bafa9f0c66f589d315cc3',
  reconciliation: 'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const IMMUTABLE_SOURCE_BINDINGS = Object.freeze({
  developmentQualificationBinding: Object.freeze({
    path: 'server/cadPhase5Package8DevelopmentQualificationBinding.js',
    sha256: '5ccc9f69ce2a28e53b0e21935481b2c12783dd1228aa93cb839c79cc184ca742',
  }),
  convexDurableInvoker: Object.freeze({ path: 'server/cadPhase5Package8ConvexDurableInvoker.js',
    sha256: '4f308722e2e2996ba25dacf8181b05f490b47a3798e840800abfa028721a0ce8' }),
  convexDurableFunctions: Object.freeze({ path: 'convex/cadPhase5DurableAdapters.ts',
    sha256: '308594be3b407f129d9e219092fe3a9bdf22ea0224473aab2172c5136f675260' }),
  privateR2Custody: Object.freeze({ path: 'server/cadR2PrivateArtifactCustody.js',
    sha256: '106920b5c72e51d5132edd56d913246489a8aa0e0f1c5cf5978b356dee56ee5d' }),
  boundedSandboxExecutor: Object.freeze({ path: 'server/cadSandboxExecutor.js',
    sha256: '445191c5e89c5188ddee055921a1582ccd8116738c8f29f74b6d3821c0445fc7' }),
  exactSessionAuthority: Object.freeze({ path: 'server/cadExactSessionBridge.js',
    sha256: 'ba2839aa0cdaf3a32b94f5d2dfb6b1ffc7d4909b58232745a8a9a1fc0e7d5eee' }),
  uploadSessionService: Object.freeze({ path: 'server/uploadSessionStore.js',
    sha256: 'e1a49b7779ec53c36346846a845a4076659358a96fd493467fa9e0824ed0b3b8' }),
  lifecycleMonitor: Object.freeze({ path: 'server/cadPhase5Package8LifecycleMonitor.js',
    sha256: 'e8c23880d7de4edbfbac2729f41b9f072e9651405e5effe49796608fba97d74e' }),
  sourceCompositionTest: Object.freeze({
    path: 'scripts/cad-phase5-package8-development-qualification-binding.test.js',
    sha256: '0d4ca93827dd8d1c999bd9c5503dbac3492e76b0f95d2a367d0dc185f7b55ada',
  }),
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
  if (JSON.stringify(packet.sourceBindings) !== JSON.stringify(IMMUTABLE_SOURCE_BINDINGS)) {
    throw Error('source digest');
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
  const exactPacketPath = path.join(rootPath, path.relative(root, packetPath));
  if (sha256(exactPacketPath) !== EXPECTED.packetSha256) throw Error('immutable packet digest');
  return checkPacket(JSON.parse(fs.readFileSync(exactPacketPath, 'utf8')), rootPath);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { EXPECTED, check, checkPacket };
