const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root,
  'docs/cad-phase5-package8-public-evidence/remaining-binding-inventory.json');
const EXPECTED_UNAVAILABLE = new Set([
  'fresh supported Convex deployment-identity receipt',
  'Cloudflare R2 least-privilege credential custodian binding',
  'Cloudflare R2 durable quota-ledger namespace binding',
  'live Sandbox runtime digest',
  'live Sandbox runtime, resource, network, persistence, and cost-enforcement receipt',
  'qualification-specific private-data processor-boundary acceptance',
  'metadata-only destination covering the R2 and Sandbox qualification lifecycle',
  'Package 8-specific alert and stop-state rule',
]);

function checkPacket(packet) {
  const source = packet.source || {};
  const read = packet.readDisposition || {};
  const bindings = packet.verifiedBindings || {};
  const pricing = bindings.r2Pricing || {};
  const spend = bindings.vercelSpendManagement || {};
  const sandbox = bindings.sandboxAccountState || {};
  const policy = bindings.sandboxSourcePolicy || {};
  const monitoring = bindings.monitoring || {};
  const convex = packet.convexDisposition || {};
  const authority = packet.authority || {};
  const unavailable = packet.unavailableValues || [];

  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_REMAINING_BINDING_INVENTORY'
      || packet.status !== 'STOPPED_LIVE_SANDBOX_BINDING_UNAVAILABLE') throw new Error('status');
  if (source.mainCommit !== '83140c02ebcf29f287c4d8c023e5dc16ce75f772'
      || source.tree !== '3508853a7cf470fc73e3a35a8dec7f8867c6f079'
      || source.executionTree !== source.tree) throw new Error('source binding');
  if (source.productionDeployment !== 'dpl_BHGAbZQamRzSc23JPkDMiu62XKiX'
      || source.r2RefreshPacketSha256 !== '2cf6942916649c9280475e55c75d86a08ccf531952ea4fd55c5df764e6588f12'
      || source.splitProofPacketSha256 !== '51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1') {
    throw new Error('packet binding');
  }
  if (read.providerWrites !== 0 || read.rawResponsesPersisted !== false
      || read.credentialsOrEnvironmentValuesRead !== false || read.retryPerformed !== false
      || read.stopGate !== 'NO_EXISTING_SANDBOX_RESOURCE_FOR_LIVE_RUNTIME_OR_POLICY_DIGEST') {
    throw new Error('read disposition');
  }
  if (pricing.storageClass !== 'STANDARD' || pricing.storagePerGbMonth !== 0.015
      || pricing.classAPerMillion !== 4.5 || pricing.classBPerMillion !== 0.36
      || pricing.dataRetrievalPerGb !== 0 || pricing.internetEgressPerGb !== 0
      || pricing.monthlyFreeStorageGb !== 10
      || pricing.monthlyFreeClassAOperations !== 1000000
      || pricing.monthlyFreeClassBOperations !== 10000000
      || pricing.deleteOperationsFree !== true) throw new Error('r2 pricing');
  if (spend.plan !== 'pro' || spend.budgetUsd !== 200
      || spend.automaticProductionPauseEnabled !== false
      || spend.spendWebhookEnabled !== false || spend.effectiveHardCapEnabled !== false
      || spend.budgetAloneStopsUsage !== false) throw new Error('spend controls');
  if (policy.runtime !== 'node24' || policy.vcpus !== 1 || policy.memoryMbMaximum !== 2048
      || policy.lifetimeMs !== 60000 || policy.networkPolicy !== 'deny-all'
      || policy.persistent !== false || policy.ports.length !== 0
      || policy.runtimeDispatchEnabled !== false
      || policy.classification !== 'SOURCE_ONLY_NOT_LIVE_VERIFIED') throw new Error('sandbox source policy');
  if (sandbox.existingSandboxResourceObserved !== false
      || sandbox.liveRuntimeDigestAvailable !== false
      || sandbox.liveResourcePolicyDigestAvailable !== false
      || sandbox.runtimeCreatedByThisInventory !== false) throw new Error('sandbox live state');
  if (monitoring.vercelDrainsConfigured !== 0
      || monitoring.vercelCustomAlertRulesObserved !== 0
      || monitoring.vercelDefaultAnomalyRuleObserved !== true
      || monitoring.r2JurisdictionalDataAccessLogsAvailable !== false
      || monitoring.package8LifecycleCoverageVerified !== false) throw new Error('monitoring');
  if (convex.internalFunctionSpecEndpointUsed !== false
      || convex.sourceFunctionInventoryVerifiedBySplitProof !== true
      || convex.deploymentIdentityVerified !== false
      || convex.sourceToDeploymentFunctionEquivalence !== 'NOT_CLAIMED'
      || convex.authenticatedReadSkippedAfterStop !== true) throw new Error('convex boundary');
  if (!Object.values(authority).length || !Object.values(authority).every(value => value === false)) {
    throw new Error('authority');
  }
  if (unavailable.length !== EXPECTED_UNAVAILABLE.size
      || unavailable.some(value => !EXPECTED_UNAVAILABLE.has(value))
      || [...EXPECTED_UNAVAILABLE].some(value => !unavailable.includes(value))) throw new Error('unavailable');
  if (packet.candidateWindow?.activated !== false
      || packet.candidateWindow?.rebindRequiredBeforeUse !== true) throw new Error('window');

  return {
    status: 'PASS',
    resolvedBindings: packet.resolvedSinceR2Refresh.length,
    unavailableBindings: unavailable.length,
    providerWrites: 0,
    activationAuthorized: false,
  };
}

function check() {
  return checkPacket(JSON.parse(fs.readFileSync(packetPath, 'utf8')));
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check, checkPacket };
