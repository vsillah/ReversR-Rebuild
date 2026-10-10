const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/post-merge-live-adapter-rebind.json');
const EXPECTED = Object.freeze({
  main: 'e0e2dc5b1ea7753d6c82dceeb887bfac3a9b62ad',
  tree: '8aff14e3fbcd25da2edd81d9886c31f6be96e745',
  deployment: 'dpl_9FnZqUdqpUyzNhqS1GRwMoJpA14c',
  sourceContract: 'c3ca361bf56eea26a95c92db2bf97680877e6f75c26deb5329c0d46191d3c054',
  rebindPacket: '1a726b14bed6f3c771b6df58126e9a9ae81d1b726776720e51bd0456f6126e1d',
  reconciliation: 'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
});
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const allFalse = value => Boolean(value && Object.keys(value).length > 0
  && Object.values(value).every(item => item === false));

function checkPacket(packet, rootPath = root) {
  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_POST_MERGE_LIVE_ADAPTER_REBIND'
      || packet.status !== 'SOURCE_ONLY_REBOUND_DISABLED'
      || packet.scope !== 'POST_MERGE_BINDING_ONLY_NO_EXECUTION') throw Error('packet identity');
  const source = packet.source || {};
  if (source.repository !== 'vsillah/ReversR-Rebuild'
      || source.mergedMainCommit !== EXPECTED.main || source.mergedMainTree !== EXPECTED.tree
      || source.productionEvidenceDeploymentId !== EXPECTED.deployment
      || source.productionEvidenceState !== 'READY'
      || source.deploymentMetadataBoundMergeCommit !== EXPECTED.main
      || source.bindingProvenance !== 'USER_SUPPLIED_EXACT_POST_MERGE_BINDING'
      || source.mergedCommitObjectAvailableLocally !== false
      || source.mainAndTreeVerifiedAfterFetch !== false
      || source.localHeadCommit !== 'cec0cafd5041731f5bf82cb8c901e6e5de1bc1ba'
      || source.localHeadTree !== EXPECTED.tree
      || source.mergedMainTreeMatchesLocalHeadTree !== true
      || source.providerRecheckPerformedByThisRound !== false
      || source.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED') {
    throw Error('source binding');
  }
  const immutable = packet.immutableEvidence || {};
  const immutableBindings = [
    ['liveAdapterSourceContract', EXPECTED.sourceContract],
    ['historicalExecutionRebind', EXPECTED.rebindPacket],
    ['readinessMonitoringReconciliation', EXPECTED.reconciliation],
  ];
  for (const [name, expected] of immutableBindings) {
    const binding = immutable[name];
    if (typeof binding?.path !== 'string' || binding.sha256 !== expected
        || sha256(path.join(rootPath, binding.path)) !== expected) throw Error('immutable evidence');
  }
  const bindings = packet.sourceBindings || {};
  const expectedPaths = Object.freeze({
    executionController: 'server/cadPhase5Package8ExecutionController.js',
    reviewedSourceBridges: 'server/cadPhase5Package8SourceBridges.js',
    liveAdapterComposition: 'server/cadPhase5Package8LiveAdapters.js',
    internalRunner: 'server/cadPhase5Package8InternalRunner.js',
    controllerTest: 'scripts/cad-phase5-package8-execution-controller.test.js',
    runnerTest: 'scripts/cad-phase5-package8-live-adapter-runner.test.js',
  });
  for (const [name, expectedPath] of Object.entries(expectedPaths)) {
    const binding = bindings[name];
    if (binding?.path !== expectedPath || typeof binding.sha256 !== 'string'
        || sha256(path.join(rootPath, expectedPath)) !== binding.sha256) {
      throw Error('current source digest');
    }
  }
  if (!allFalse(packet.defaultState) || !allFalse(packet.authority)) throw Error('runtime boundary');
  const validation = packet.validation || {};
  if (validation.offlineOnly !== true || validation.providerRequests !== 0
      || validation.credentialsOrEnvironmentValuesRead !== false
      || ['configurationChanges', 'deployments', 'functionInvocations', 'sessionIssuances',
        'requestBodyAdmissions', 'cadBodiesRead', 'r2ObjectsCreated', 'sandboxConversions',
        'downloads', 'payments', 'commits', 'pushes', 'pullRequests', 'merges',
        'externalMessages'].some(key => validation[key] !== 0)) throw Error('validation boundary');
  const blockers = packet.remainingExecutionBlockers || [];
  if (JSON.stringify(blockers) !== JSON.stringify([
    'MERGED_COMMIT_AND_TREE_NOT_LOCALLY_FETCH_VERIFIED',
    'SOURCE_TO_DEPLOYMENT_FUNCTION_EQUIVALENCE_NOT_CLAIMED',
    'EXACT_LIVE_ACTIVATION_GATE_NOT_REVIEWED',
    'LIVE_CONVEX_DURABLE_INVOKER_NOT_SUPPLIED',
    'LIVE_R2_CUSTODY_BINDING_NOT_SUPPLIED',
    'LIVE_SANDBOX_EXECUTOR_BINDING_NOT_SUPPLIED',
    'FRESH_SYNTHETIC_SESSION_AUTHORITY_NOT_SUPPLIED',
    'ACTIVE_WINDOW_AND_COST_REVALIDATION_NOT_SUPPLIED',
  ])) throw Error('blocker inventory');
  const next = packet.nextGate || {};
  if (next.type !== 'CAPTAIN_REVIEW_AND_COMMIT_AUTHORIZATION'
      || next.commitAuthorized !== false || next.pushAuthorized !== false
      || next.mergeAuthorized !== false || next.runtimeActivationAuthorized !== false
      || next.liveQualificationAuthorized !== false) throw Error('next gate');
  const controller = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8ExecutionController.js'), 'utf8');
  const adapters = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8LiveAdapters.js'), 'utf8');
  if (!controller.includes(EXPECTED.deployment) || !adapters.includes(EXPECTED.main)
      || !adapters.includes(EXPECTED.tree) || !adapters.includes(EXPECTED.deployment)
      || !adapters.includes(EXPECTED.sourceContract)
      || /process\.env|fetch\s*\(|https?\.request/.test(`${controller}\n${adapters}`)) {
    throw Error('source boundary');
  }
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const sourceText = fs.readFileSync(path.join(rootPath, runtime), 'utf8');
    if (sourceText.includes('cadPhase5Package8LiveAdapters')
        || sourceText.includes('cadPhase5Package8InternalRunner')) throw Error('runtime import');
  }
  return Object.freeze({ status: 'PASS', mergedMainCommit: EXPECTED.main,
    mergedMainTree: EXPECTED.tree, productionEvidenceDeploymentId: EXPECTED.deployment,
    sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED', runtimeActivationAuthorized: false,
    providerRequests: 0, blockers: blockers.length, sourceBindings: bindings });
}

function check(rootPath = root) {
  return checkPacket(JSON.parse(fs.readFileSync(path.join(rootPath,
    path.relative(root, packetPath)), 'utf8')), rootPath);
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { EXPECTED, check, checkPacket };
