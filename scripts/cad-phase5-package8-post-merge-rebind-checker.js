const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/post-merge-execution-rebind.json');
const successorPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/live-adapter-runner-source-contract.json');
const EXPECTED = Object.freeze({
  main: '27afaccd00231acbca49b71a5fafabd42e9637bd',
  tree: 'c45198a6c493d03e3a57533ad63150323c02b4ea',
  mergedController: 'd715a1db78f04000620b2a7b6e28a275b5c0e3e25998b65815687561c2905279',
  reboundController: 'b041955ffae7fe35c7a703f16f2846b24fc01d1e48878f8a22377a3d42583504',
  bridge: 'e50a6f9291708fb5cdf90d7ac6c141e6337b0f71d938f565fa9a7d1935cedbcf',
  monitor: 'e8c23880d7de4edbfbac2729f41b9f072e9651405e5effe49796608fba97d74e',
  controllerTest: 'dbdc8ebea41e17a27ac155a9583d6e42c19a15533a5aecbd40ed06c97f476066',
  reconciliation: 'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  deployment: 'dpl_6gU2Ppcn3J4zJQiwtQFBYU1VBM6D',
  fixture: '0bdb42a7c58f4d51eee7eec2befae6ba590e43e0ecce34350cef9db4345c4c70',
});
const SUCCESSOR = Object.freeze({
  main: '24ec45362517d60237f6f3e186e5048f49177cf5',
  deployment: 'dpl_99Gfdd69ZTCGKYpbFgLDzMiwQGd9',
  rebindPacket: '1a726b14bed6f3c771b6df58126e9a9ae81d1b726776720e51bd0456f6126e1d',
});
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const exactKeys = (value, keys) => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key)));
const allFalse = value => Boolean(value && Object.keys(value).length > 0
  && Object.values(value).every(item => item === false));

function checkSuccessorContract(rootPath = root, suppliedContract) {
  const contract = suppliedContract || JSON.parse(fs.readFileSync(path.join(rootPath,
    path.relative(root, successorPath)), 'utf8'));
  if (contract.packetType !== 'CAD_PHASE5_PACKAGE8_LIVE_ADAPTER_RUNNER_SOURCE_CONTRACT'
      || contract.status !== 'SOURCE_ONLY_DISABLED_DEFAULT'
      || contract.scope !== 'DEVELOPMENT_ONLY_NONPROPRIETARY_SYNTHETIC_QUALIFICATION') {
    throw Error('successor identity');
  }
  const admission = contract.admission || {};
  if (admission.mergedMainCommit !== SUCCESSOR.main
      || admission.productionEvidenceDeploymentId !== SUCCESSOR.deployment
      || admission.productionEvidenceState !== 'READY'
      || admission.deploymentMetadataBoundMergeCommit !== SUCCESSOR.main
      || admission.deploymentEvidenceReviewedLocally !== true
      || admission.providerRecheckPerformedByThisRound !== false
      || admission.rebindPacketSha256 !== SUCCESSOR.rebindPacket
      || admission.reconciliationPacketSha256 !== EXPECTED.reconciliation
      || admission.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED') {
    throw Error('successor admission');
  }
  if (sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/post-merge-execution-rebind.json'))
      !== SUCCESSOR.rebindPacket) throw Error('successor rebind digest');
  const bindings = contract.sourceBindings || {};
  const bindingNames = ['executionController', 'reviewedSourceBridges',
    'liveAdapterComposition', 'internalRunner', 'controllerTest', 'runnerTest'];
  for (const name of bindingNames) {
    const binding = bindings[name];
    if (typeof binding?.path !== 'string' || typeof binding.sha256 !== 'string'
        || sha256(path.join(rootPath, binding.path)) !== binding.sha256) {
      throw Error('successor source digest');
    }
  }
  if (bindings.executionController.path !== 'server/cadPhase5Package8ExecutionController.js'
      || bindings.controllerTest.path !== 'scripts/cad-phase5-package8-execution-controller.test.js'
      || bindings.reviewedSourceBridges.sha256 !== EXPECTED.bridge
      || !allFalse(contract.defaultState)) throw Error('successor boundary');
  const offline = contract.offlineQualification || {};
  if (offline.gate !== 'OFFLINE_SYNTHETIC_TEST_ONLY'
      || offline.fixtureSha256 !== EXPECTED.fixture || offline.projectOwned !== true
      || offline.nonproprietary !== true || offline.customerData !== false
      || ['providerRequests', 'liveInvocations', 'runtimeActivations',
        'requestBodyAdmissions', 'privateOrCustomerCadReads', 'r2Objects',
        'sandboxJobs', 'downloads', 'payments'].some(key => offline[key] !== 0)) {
    throw Error('successor qualification');
  }
  const boundary = contract.qualificationBoundary || {};
  if (boundary.controlledSyntheticPathOnly !== true
      || boundary.proprietaryOrCustomerOwnershipQualified !== false
      || boundary.customerDataHandlingQualified !== false
      || boundary.generalProductionUploadReady !== false
      || boundary.package8Activated !== false) throw Error('successor qualification boundary');
  return contract;
}

function checkPacket(packet, rootPath = root) {
  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_POST_MERGE_EXECUTION_REBIND'
      || packet.status !== 'SOURCE_ONLY_REBIND_INACTIVE'
      || packet.scope !== 'FINAL_NONPROPRIETARY_SYNTHETIC_ONE_USE_DEVELOPMENT_QUALIFICATION') {
    throw Error('packet identity');
  }
  const source = packet.source || {};
  if (source.repository !== 'vsillah/ReversR-Rebuild'
      || source.mergedMainCommit !== EXPECTED.main || source.mergedMainTree !== EXPECTED.tree
      || source.mainAndTreeVerifiedAfterFetch !== true
      || source.mergedControllerSource?.sha256 !== EXPECTED.mergedController
      || source.reboundControllerSource?.sha256 !== EXPECTED.reboundController
      || source.sourceBridge?.sha256 !== EXPECTED.bridge
      || source.lifecycleMonitor?.sha256 !== EXPECTED.monitor
      || source.controllerTest?.sha256 !== EXPECTED.controllerTest
      || source.reconciliationPacket?.sha256 !== EXPECTED.reconciliation
      || source.productionEvidenceDeploymentId !== EXPECTED.deployment
      || source.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED'
      || source.deploymentInvokedByThisRound !== false) throw Error('source binding');
  let successor;
  for (const binding of [source.reboundControllerSource, source.sourceBridge,
    source.lifecycleMonitor, source.controllerTest, source.reconciliationPacket]) {
    if (typeof binding?.path !== 'string') throw Error('source digest');
    const currentDigest = sha256(path.join(rootPath, binding.path));
    if (currentDigest === binding.sha256) continue;
    if (![source.reboundControllerSource.path, source.controllerTest.path]
      .includes(binding.path)) throw Error('source digest');
    successor ||= checkSuccessorContract(rootPath);
    const successorBinding = binding.path === source.reboundControllerSource.path
      ? successor.sourceBindings.executionController : successor.sourceBindings.controllerTest;
    if (successorBinding.path !== binding.path || successorBinding.sha256 !== currentDigest) {
      throw Error('source digest');
    }
  }

  const target = packet.targetBindings || {};
  const convex = target.convexDevelopment || {};
  if (convex.teamSlug !== 'vambah-sillah' || convex.projectSlug !== 'reversr-cad-auth-dev'
      || convex.deploymentName !== 'majestic-alligator-31'
      || convex.deploymentType !== 'development' || convex.identityPreviouslyVerified !== true
      || convex.functionSchemaEquivalenceClaimed !== false) throw Error('convex binding');
  const r2 = target.privateR2 || {};
  if (r2.bucket !== 'reversr-cad-package8-public-fixture-us' || r2.jurisdiction !== 'US'
      || r2.storageClass !== 'STANDARD' || r2.publicAccess !== false
      || r2.customDomainCount !== 0 || r2.applicationBindingConfigured !== false) {
    throw Error('r2 binding');
  }
  const credential = target.credentialCustody || {};
  if (credential.credentialName !== 'reversr-package8-public-fixture-dev-preview-v2'
      || credential.custodian !== 'Vambah Sillah' || credential.permission !== 'OBJECT_READ_WRITE'
      || credential.lifetime !== '24_HOURS' || credential.activeUntilDate !== '2026-10-11'
      || credential.credentialValuesRecorded !== false
      || credential.credentialValuesReadByThisRound !== false) throw Error('credential binding');
  const variables = target.vercelServerVariables || {};
  if (variables.project !== 'reversr'
      || JSON.stringify(variables.variableNames) !== JSON.stringify([
        'CAD_R2_ACCESS_KEY_ID', 'CAD_R2_SECRET_ACCESS_KEY'])
      || JSON.stringify(variables.environments) !== JSON.stringify(['preview', 'development'])
      || variables.productionBinding !== false
      || variables.configurationChangedByThisRound !== false) throw Error('variable binding');
  const quota = target.durableQuota || {};
  if (quota.namespace !== 'phase5-synthetic-private-path-v1'
      || quota.maximumStoredBytes !== 8 * 1024 * 1024 || quota.maximumObjects !== 12
      || quota.maximumClassAOperations !== 1000 || quota.maximumClassBOperations !== 1000
      || quota.maximumDeleteOperations !== 1000 || quota.maximumCostUsdExclusive !== 9
      || quota.reservationMicros !== 8_999_999) throw Error('quota binding');
  const sandbox = target.sandbox || {};
  if (sandbox.runtime !== 'node24' || sandbox.region !== 'iad1' || sandbox.vcpus !== 1
      || sandbox.memoryMbMaximum !== 2048 || sandbox.lifetimeMsMaximum !== 60000
      || sandbox.networkPolicy !== 'deny-all' || sandbox.persistent !== false
      || sandbox.exposedPorts !== 0 || sandbox.snapshotAllowed !== false
      || sandbox.maximumAttempts !== 1 || sandbox.maximumRetries !== 0
      || sandbox.terminalCleanupRequired !== true) throw Error('sandbox binding');

  const fixture = packet.fixture || {};
  if (fixture.id !== 'reversr-phase5-synthetic-private-line-v1'
      || fixture.fileName !== 'reversr-phase5-synthetic-private-path.igs'
      || fixture.mimeType !== 'model/iges' || fixture.byteCount !== 486
      || fixture.sha256 !== EXPECTED.fixture || fixture.classification !== 'RESTRICTED_SYNTHETIC_TEST_ONLY'
      || fixture.owner !== 'ReversR test project' || fixture.projectOwned !== true
      || fixture.nonproprietary !== true || fixture.customerData !== false
      || fixture.publicDistributionAuthorized !== false) throw Error('fixture binding');
  const envelope = packet.executionEnvelope || {};
  if (envelope.developmentOnly !== true || envelope.maximumSessions !== 1
      || envelope.maximumFiles !== 1 || envelope.maximumAttempts !== 1
      || envelope.maximumRetries !== 0 || envelope.ownerShopIsolationRequired !== true
      || envelope.freshAuthorityBeforeBodyRequired !== true
      || envelope.durableClaimAndQuotaBeforeBodyRequired !== true
      || envelope.allInCostUsdExclusive !== 9) throw Error('execution envelope');

  const close = packet.closeFirstContract || {};
  if (JSON.stringify(close.order) !== JSON.stringify([
    'CLOSE_ADMISSION_AND_CONVERSION', 'REVOKE_EXACT_SESSION_AND_GRANTS',
    'CONFIRM_SANDBOX_STOP_OR_QUARANTINE_UNKNOWN', 'QUARANTINE_UNCERTAIN_RECORDS',
    'DELETE_EXACT_SYNTHETIC_ARTIFACTS_ONLY',
    'RECONCILE_DURABLE_TOMBSTONES_AND_PROVIDER_ABSENCE'])
      || [close.sessionRevocationRequired, close.grantRevocationRequired,
        close.uncertaintyQuarantineRequired, close.exactArtifactDeletionRequired,
        close.durableReconciliationRequired].some(value => value !== true)) {
    throw Error('close-first contract');
  }
  const monitoring = packet.monitoringContract || {};
  if (monitoring.implementation !== 'UNWIRED_PURE_METADATA_POLICY'
      || monitoring.supportedMetadataOnly !== true || monitoring.providerReadsEnabled !== false
      || monitoring.providerWritesEnabled !== false || monitoring.runtimeMonitoringEnabled !== false
      || monitoring.externalAlertDeliveryConfigured !== false
      || monitoring.r2DataAccessLogsAvailable !== false
      || monitoring.r2DataAccessLogsEquivalenceClaimed !== false
      || monitoring.rawProviderOutputAllowed !== false || monitoring.sensitiveFieldsAllowed !== false
      || monitoring.maximumEvidenceAgeMs !== 120000) throw Error('monitoring boundary');

  const boundary = packet.qualificationBoundary || {};
  if (boundary.syntheticControlledPathQualifiedOnSuccess !== true
      || boundary.proprietaryOrCustomerFileOwnershipProven !== false
      || boundary.customerDataHandlingProven !== false
      || boundary.generalProductionUploadReadinessProven !== false
      || boundary.package8ActivationProven !== false) throw Error('qualification boundary');
  const window = packet.proposedWindow || {};
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start
      || end - start !== 10 * 60_000 || window.durationMinutes !== 10
      || window.activated !== false
      || window.freshTargetCredentialCostAndAuthorityReviewRequired !== true) throw Error('window');

  const validation = packet.validation || {};
  if (validation.offlineMetadataTests !== 8 || validation.offlineMetadataTestsPassed !== 8
      || validation.providerRequests !== 0
      || validation.credentialsOrEnvironmentValuesRead !== false
      || ['configurationChanges', 'deployments', 'functionInvocations', 'runtimeActivations',
        'sessionIssuances', 'requestBodiesRead', 'cadBodiesRead', 'r2ObjectsCreated',
        'sandboxConversions', 'downloads', 'payments', 'retries']
        .some(key => validation[key] !== 0)) throw Error('validation');
  if (!allFalse(packet.authority)) throw Error('authority');

  const unresolved = packet.unresolvedBindings || [];
  const expectedUnresolved = [
    'SOURCE_TO_DEPLOYMENT_FUNCTION_EQUIVALENCE_NOT_CLAIMED',
    'FRESH_CREDENTIAL_LIFETIME_NOT_REVALIDATED_FOR_ACTUAL_RUN',
    'R2_REQUEST_LEVEL_DATA_ACCESS_LOGS_UNAVAILABLE',
    'EXTERNAL_ALERT_DELIVERY_NOT_CONFIGURED',
    'PROPOSED_WINDOW_INACTIVE',
  ];
  if (JSON.stringify(unresolved.map(item => item.code)) !== JSON.stringify(expectedUnresolved)
      || unresolved[0]?.requiredBeforeExecution !== false
      || unresolved[1]?.requiredBeforeExecution !== true
      || unresolved[2]?.requiredBeforeExecution !== false
      || unresolved[3]?.requiredBeforeExecution !== false
      || unresolved[4]?.requiredBeforeExecution !== true) throw Error('unresolved binding');
  if (JSON.stringify(packet.stopConditions) !== JSON.stringify([
    'MAIN_OR_TREE_DRIFT', 'EXPIRED_OR_MISSING_BINDING', 'UNSUPPORTED_MONITORING_CLAIM',
    'SOURCE_TO_DEPLOYMENT_EQUIVALENCE_OVERCLAIM', 'VALIDATION_FAILURE', 'PRIVACY_RISK',
    'COST_UNCERTAINTY_OR_CEILING_FAILURE', 'UNKNOWN_OUTCOME'])) throw Error('stop conditions');
  const next = packet.nextGate || {};
  if (next.type !== 'CAPTAIN_SOURCE_REVIEW' || next.activationAllowed !== false
      || typeof next.authorization !== 'string'
      || !next.authorization.includes('codex/cad-phase5-package8-post-merge-rebind')
      || !next.authorization.includes(EXPECTED.main)
      || !next.authorization.includes(EXPECTED.tree)
      || !next.authorization.includes(EXPECTED.deployment)
      || !next.authorization.includes(EXPECTED.reconciliation)
      || !next.authorization.includes('Do not authorize provider requests')) throw Error('next gate');

  const controller = fs.readFileSync(path.join(rootPath,
    'server/cadPhase5Package8ExecutionController.js'), 'utf8');
  const activeDeployment = successor?.admission.productionEvidenceDeploymentId || EXPECTED.deployment;
  if (!controller.includes(activeDeployment)
      || !/configured:\s*false/.test(controller) || !/routeMounted:\s*false/.test(controller)
      || !/providerDispatchEnabled:\s*false/.test(controller)
      || !/conversionDispatchEnabled:\s*false/.test(controller)
      || !/runtimeActivationAllowed:\s*false/.test(controller)
      || !/productionBehaviorChanged:\s*false/.test(controller)
      || /process\.env|fetch\s*\(|https?\.request/.test(controller)) throw Error('controller boundary');
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const sourceText = fs.readFileSync(path.join(rootPath, runtime), 'utf8');
    if (sourceText.includes('cadPhase5Package8ExecutionController')) throw Error('runtime import');
  }
  return Object.freeze({ status: 'PASS', mergedMainCommit: EXPECTED.main,
    mergedMainTree: EXPECTED.tree, deploymentEvidence: EXPECTED.deployment,
    proposedWindowMinutes: 10, activationAuthorized: false,
    unresolvedBindings: expectedUnresolved.length, providerRequests: 0 });
}

function check() {
  return checkPacket(JSON.parse(fs.readFileSync(packetPath, 'utf8')));
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { EXPECTED, SUCCESSOR, check, checkPacket, checkSuccessorContract };
