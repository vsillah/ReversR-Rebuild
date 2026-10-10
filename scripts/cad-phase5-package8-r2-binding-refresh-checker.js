const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root, 'docs/cad-phase5-package8-public-evidence/r2-binding-refresh.json');
const EXPECTED_UNAVAILABLE = new Set([
  'fresh authoritative Convex target metadata and function-name inventory',
  'Cloudflare R2 least-privilege credential custodian binding',
  'Cloudflare R2 durable quota-ledger namespace binding',
  'current Cloudflare R2 pricing digest',
  'live Sandbox runtime digest',
  'live Sandbox resource, network, persistence, and cost-control metadata',
  'private-data processor boundary attestation',
  'Vercel Spend Management hard limit',
  'Vercel automatic-pausing setting',
  'metadata-only monitoring destinations compatible with jurisdictional R2',
  'monitoring alert rules',
]);

function checkPacket(packet) {
  const source = packet.source || {};
  const bucket = packet.verifiedR2Binding || {};
  const limits = packet.sourceEnforcedLimits || {};
  const lifecycle = bucket.pilotDeletionRule || {};
  const logs = bucket.dataAccessLogs || {};
  const disposition = packet.provisioningDisposition || {};
  const authority = packet.authority || {};
  const unavailable = packet.unavailableValues || [];

  if (packet.packetType !== 'CAD_PHASE5_PACKAGE8_R2_BINDING_REFRESH'
      || packet.status !== 'BLOCKED_REMAINING_BINDINGS') throw new Error('status');
  if (source.mainCommit !== '83140c02ebcf29f287c4d8c023e5dc16ce75f772'
      || source.tree !== '3508853a7cf470fc73e3a35a8dec7f8867c6f079'
      || source.executionTree !== source.tree) throw new Error('source binding');
  if (source.productionDeployment !== 'dpl_BHGAbZQamRzSc23JPkDMiu62XKiX') throw new Error('deployment');
  if (source.splitProofPacketSha256 !== '51bd69a71349275c631c16eb4849303657fa9c5b3d1dbdd9b7161bd4cd6c77b1'
      || source.parentProposalSha256 !== '554fb996ba48f06109eef17026471aab9c44919926c4b203cb3355e210c39cda') {
    throw new Error('packet binding');
  }
  if (!Object.values(authority).length || !Object.values(authority).every(value => value === false)) {
    throw new Error('authority');
  }
  if (bucket.accountReferenceSha256 !== 'd866bce146afc71d8300445bc1956f4d65582a41f8669908c4168bb77ce4cae1'
      || bucket.bucketName !== 'reversr-cad-package8-public-fixture-us'
      || bucket.jurisdiction !== 'us' || bucket.storageClass !== 'STANDARD') throw new Error('bucket binding');
  if (bucket.publicDevelopmentUrlEnabled !== false || bucket.customDomainCount !== 0
      || bucket.credentialCreated !== false || bucket.applicationBindingConfigured !== false) {
    throw new Error('private bucket');
  }
  if (bucket.objectCount !== 0 || bucket.storedBytes !== 0
      || bucket.classAOperations !== 0 || bucket.classBOperations !== 0) throw new Error('empty bucket');
  if (lifecycle.name !== 'Delete all objects after 1 day' || lifecycle.prefix !== null
      || lifecycle.deleteAfterDays !== 1 || lifecycle.enabled !== true) throw new Error('lifecycle');
  if (bucket.providerDefaultMultipartAbortRule?.changedByThisStep !== false) throw new Error('default lifecycle');
  if (logs.available !== false || logs.classification !== 'UNAVAILABLE_FOR_JURISDICTIONAL_BUCKET'
      || logs.monitoringEquivalenceClaimed !== false) throw new Error('monitoring limitation');
  if (limits.sourceSha256 !== '106920b5c72e51d5132edd56d913246489a8aa0e0f1c5cf5978b356dee56ee5d'
      || limits.maxStoredBytes !== 8388608 || limits.maxObjects !== 12
      || limits.maxClassAOperations !== 1000 || limits.maxClassBOperations !== 1000
      || limits.maxDeleteOperations !== 1000 || limits.maxPilotCostMicros !== 9000000
      || limits.providerDispatchEnabled !== false) throw new Error('source limits');
  if (disposition.browserProvisioningAttempts !== 1 || disposition.bucketResourcesCreated !== 1
      || disposition.pilotLifecycleRulesCreated !== 1 || disposition.objectsCreated !== 0
      || disposition.credentialsRead !== false || disposition.credentialsCreated !== false
      || disposition.runtimeActivated !== false || disposition.outcome !== 'VERIFIED_PRIVATE_BUCKET_READY') {
    throw new Error('provisioning disposition');
  }
  if (unavailable.length !== EXPECTED_UNAVAILABLE.size
      || unavailable.some(value => !EXPECTED_UNAVAILABLE.has(value))
      || [...EXPECTED_UNAVAILABLE].some(value => !unavailable.includes(value))) throw new Error('unavailable');
  if (packet.candidateWindow?.activated !== false
      || packet.candidateWindow?.rebindRequiredBeforeUse !== true) throw new Error('window');
  return { status: 'PASS', unavailableBindings: unavailable.length,
    r2BucketVerified: true, activationAuthorized: false };
}

function check() {
  return checkPacket(JSON.parse(fs.readFileSync(packetPath, 'utf8')));
}

if (require.main === module) process.stdout.write(`${JSON.stringify(check())}\n`);
module.exports = { check, checkPacket };
