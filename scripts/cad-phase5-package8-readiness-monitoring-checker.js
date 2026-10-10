const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  CLOSE_FIRST_ACTIONS,
  STOP_CODES,
  createDisabledPackage8LifecycleMonitor,
} = require('../server/cadPhase5Package8LifecycleMonitor');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/readiness-monitoring-reconciliation.json');
const EXPECTED = Object.freeze({
  main: '83140c02ebcf29f287c4d8c023e5dc16ce75f772',
  tree: '3508853a7cf470fc73e3a35a8dec7f8867c6f079',
  localHead: 'ae17c76ab47105632cbb7ec4fa6be9925f23fba3',
  rotation: '5e41c1fa25f271a117103ab528c2ee298ffe0be1c723ba568e942acd5d67762a',
  inventory: '6810835298ce09e4b2f685f938c3bf4cfa42809a39741cbd0331ce9b2287bcdb',
  r2: '2cf6942916649c9280475e55c75d86a08ccf531952ea4fd55c5df764e6588f12',
  splitProof: '51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1',
  sandbox: '430ca8a85dc3f14fc2ec10e087ae55911ab6ad6af31d6b188b69675794ad1d4a',
  restrictedRotation: 'bcb90102c74058e841f2eaadfce5e2268a28a1d6c272eba66519812fa3592dfb',
});

const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function checkPacket(packet, rootPath = root) {
  const source = packet.source || {};
  const completed = packet.completedBindings || {};
  const monitoring = packet.monitoringContract || {};
  const processor = packet.processorBoundary || {};
  const validation = packet.validation || {};
  const authority = packet.authority || {};
  const monitor = createDisabledPackage8LifecycleMonitor();

  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_READINESS_MONITORING_RECONCILIATION'
      || packet.status !== 'SOURCE_RECONCILED_EXECUTION_CLOSED'
      || packet.scope !== 'SOURCE_ONLY_METADATA_MONITORING_AND_STOP_RULES') throw Error('status');
  if (source.reportedMergedMainCommit !== EXPECTED.main
      || source.reportedMergedMainObjectAvailableOffline !== false
      || source.reviewedSourceTree !== EXPECTED.tree || source.localExecutionTree !== EXPECTED.tree
      || source.localExecutionHead !== EXPECTED.localHead || source.commitAncestryClaimed !== false
      || source.treeIdentityVerified !== true) throw Error('source binding');
  if (source.credentialRotationPacketSha256 !== EXPECTED.rotation
      || source.remainingBindingInventorySha256 !== EXPECTED.inventory
      || source.r2RefreshPacketSha256 !== EXPECTED.r2
      || source.splitProofPacketSha256 !== EXPECTED.splitProof
      || source.sandboxPreflightReceiptSha256 !== EXPECTED.sandbox
      || source.restrictedCredentialRotationReceiptSha256 !== EXPECTED.restrictedRotation) {
    throw Error('parent binding');
  }
  for (const binding of [source.monitorSource, source.monitorTest]) {
    if (!binding?.path || sha256(path.join(rootPath, binding.path)) !== binding.sha256) {
      throw Error('source digest');
    }
  }
  if (sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/development-prerequisite-credential-rotation.json'))
      !== EXPECTED.rotation) throw Error('rotation digest');
  if (sha256(path.join(rootPath,
    'docs/cad-phase5-package8-public-evidence/remaining-binding-inventory.json'))
      !== EXPECTED.inventory) throw Error('inventory digest');

  if (completed.convex?.deploymentIdentityVerified !== true
      || completed.convex?.functionSchemaEquivalenceClaimed !== false
      || completed.quota?.namespace !== 'phase5-synthetic-private-path-v1'
      || completed.quota?.maximumCostUsdExclusive !== 9
      || completed.sandbox?.preflightPassed !== true
      || completed.sandbox?.terminalCleanupVerified !== true
      || completed.sandbox?.networkPolicy !== 'deny-all'
      || completed.sandbox?.persistent !== false || completed.sandbox?.snapshotAllowed !== false
      || completed.r2CredentialCustody?.credentialValuesRecorded !== false
      || completed.vercelServerBindings?.productionBinding !== false
      || completed.vercelServerBindings?.deploymentTriggered !== false) throw Error('completed binding');

  if (processor.acceptedClassification !== 'RESTRICTED_SYNTHETIC_TEST_ONLY'
      || processor.projectOwned !== true || processor.nonproprietary !== true
      || processor.customerData !== false || processor.proprietaryCadQualified !== false
      || processor.customerDataHandlingQualified !== false
      || processor.generalProductionReadinessQualified !== false) throw Error('processor boundary');

  if (monitoring.implementation !== 'UNWIRED_PURE_METADATA_POLICY'
      || monitoring.providerReadsEnabled !== false || monitoring.providerWritesEnabled !== false
      || monitoring.runtimeMonitoringEnabled !== false
      || monitoring.externalAlertDeliveryConfigured !== false
      || monitoring.r2DataAccessLogsAvailable !== false
      || monitoring.r2DataAccessLogsEquivalenceClaimed !== false
      || monitoring.rawProviderOutputAllowed !== false
      || monitoring.sensitiveFieldsAllowed !== false) throw Error('monitoring boundary');
  if (!same(packet.stopRules, STOP_CODES) || !same(packet.closeFirstActions, CLOSE_FIRST_ACTIONS)) {
    throw Error('stop rules');
  }
  const start = Date.parse(packet.proposedWindow?.startUtc);
  const end = Date.parse(packet.proposedWindow?.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start
      || end - start > 15 * 60_000 || packet.proposedWindow?.durationMinutes !== 10
      || packet.proposedWindow?.activated !== false
      || packet.proposedWindow?.freshAdmissionReviewRequired !== true) throw Error('window');

  if (validation.offlineSyntheticTests !== 12 || validation.offlineSyntheticTestsPassed !== 12
      || validation.providerRequests !== 0 || validation.credentialsOrEnvironmentValuesRead !== false
      || validation.rawResponsesPersisted !== false || validation.runtimeImportsAdded !== 0
      || validation.retries !== 0) throw Error('validation');
  if (!Object.values(authority).length || !Object.values(authority).every(value => value === false)) {
    throw Error('authority');
  }
  if (!Array.isArray(packet.sourceOnlyBindingsRemaining)
      || packet.sourceOnlyBindingsRemaining.length !== 0
      || packet.nextGate?.type !== 'SOURCE_RELEASE_REVIEW'
      || packet.nextGate?.activationAllowed !== false) throw Error('next gate');
  if (monitor.configured !== false || monitor.runtimeMonitoringEnabled !== false
      || monitor.providerReadsEnabled !== false || monitor.providerWritesEnabled !== false
      || monitor.dispatchEnabled !== false) throw Error('monitor wiring');

  const serverFiles = fs.readdirSync(path.join(rootPath, 'server'))
    .filter(name => name.endsWith('.js') && name !== 'cadPhase5Package8LifecycleMonitor.js');
  if (serverFiles.some(name => fs.readFileSync(path.join(rootPath, 'server', name), 'utf8')
    .includes('cadPhase5Package8LifecycleMonitor'))) throw Error('runtime import');

  return {
    status: 'PASS',
    sourceOnlyBindingsRemaining: 0,
    stopRules: STOP_CODES.length,
    proposedWindowMinutes: 10,
    activationAuthorized: false,
  };
}

function check() {
  return checkPacket(JSON.parse(fs.readFileSync(packetPath, 'utf8')));
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check, checkPacket };
