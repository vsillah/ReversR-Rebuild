// Offline source contract only. The historical September packet remains immutable.
// This successor binds the same pending evidence requirements to the current source tree.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-production-auth-verifier-current-source-acceptance-v2.json';
const HISTORICAL_PACKET = 'docs/cad-production-auth-verifier-acceptance.json';
const HISTORICAL_PACKET_SHA256 = '31d1368957f770c423c903644decbc8043ac076a0dd8d76edfc3105a9643176f';
const CURRENT_MAIN_COMMIT = '7a41d2abf14f900637aaa0be496a4f37ca8613a4';
const ROUTER_CHANGE_COMMIT = '078f67889a7284939c18add425a3f6df7aebe4f5';
const ROUTER_MERGE_COMMIT = 'f42c2d8a4f489856582aa33962b795f78f610fc3';
const CURRENT_ROUTER_SHA256 = '505edcadacc870be65d9ef7db72bfdcc3eeb9fa72b4802c225a163b1532dee7d';
const SOURCES = Object.freeze([
  'server/cadProductionSessionVerifierBinding.js',
  'server/cadExactSessionBridge.js',
  'server/cadUploadSessionGatewayService.js',
  'server/uploadSessionStore.js',
  'server/cadUserUploadRouter.js',
  'convex/librarySession.ts',
  'convex/cadUploadSessionGateway.ts',
]);
const FALSE_FLAGS = Object.freeze([
  'productionVerifierAccepted', 'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized',
  'runtimeValuesInstalled', 'runtimeActivationAuthorized', 'liveProviderTestsAuthorized',
  'providerEnvResourceBillingChanges', 'secretReads', 'deploymentAuthorized',
  'conversionAuthorized', 'sandboxDispatchAuthorized', 'privateCadAuthorized',
  'realUserCommercializationAuthorized', 'externalMessagesAuthorized',
  'secondRunOrRetryAuthorized', 'commercialReadinessClaim',
]);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));

function historicalContract(readSource) {
  const bytes = readSource(HISTORICAL_PACKET);
  if (sha256(bytes) !== HISTORICAL_PACKET_SHA256) throw Error('HISTORICAL_PACKET_DRIFT');
  const packet = JSON.parse(bytes.toString('utf8'));
  if (packet?.packet !== 'cad-production-auth-verifier-acceptance'
    || packet?.baseCommit !== 'a2613c956ac6bd20637ffda6d020f128f065119b'
    || Object.keys(packet?.evidence || {}).length !== 12) {
    throw Error('INVALID_HISTORICAL_PACKET');
  }
  return packet;
}

function expectedPacket(readSource = read) {
  const historical = historicalContract(readSource);
  const evidence = Object.fromEntries(Object.entries(historical.evidence).map(([id, item]) => [id, {
    required: item.required,
    status: 'NOT_COLLECTED',
    accepted: false,
    receipt: null,
  }]));
  const sourceBindings = Object.fromEntries(SOURCES.map(file => [file, sha256(readSource(file))]));
  if (sourceBindings['server/cadUserUploadRouter.js'] !== CURRENT_ROUTER_SHA256) {
    throw Error('CURRENT_ROUTER_DRIFT');
  }
  return {
    schemaVersion: 2,
    packet: 'cad-production-auth-verifier-current-source-acceptance-v2',
    sourceOnly: true,
    status: 'PENDING_PRODUCTION_VERIFIER_EVIDENCE',
    lineage: {
      historicalPacket: HISTORICAL_PACKET,
      historicalPacketSha256: HISTORICAL_PACKET_SHA256,
      historicalBaseCommit: historical.baseCommit,
      routerChangeCommit: ROUTER_CHANGE_COMMIT,
      routerMergeCommit: ROUTER_MERGE_COMMIT,
      routerChangePullRequest: 480,
      currentMainCommit: CURRENT_MAIN_COMMIT,
    },
    historicalAuthority: {
      packetReusable: false,
      approvalReusable: false,
      windowReusable: false,
      expiredWindowsRemainExpired: true,
      successorConveysRuntimeAuthority: false,
    },
    claims: Object.fromEntries(FALSE_FLAGS.map(key => [key, false])),
    candidate: { providerRef: null, verifierCommit: null, deploymentRef: null, reviewer: null, acceptanceReceipt: null },
    transport: { bearer: 'REQUIRES_PROVIDER_EVIDENCE', cookie: 'REJECTED_SEPARATE_CSRF_ORIGIN_REVIEW_REQUIRED' },
    activation: {
      separateApprovalRequired: true,
      historicalWindowReusable: false,
      historicalApprovalReusable: false,
      approvalRef: null,
      startsAtUtc: null,
      expiresAtUtc: null,
    },
    evidence,
    sourceBindings,
  };
}

function checkAcceptance(packet, { readSource = read } = {}) {
  const problems = [];
  try {
    const expected = expectedPacket(readSource);
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) problems.push('invalid packet');
    else {
      if (!isDeepStrictEqual(Object.keys(packet).sort(), Object.keys(expected).sort())) problems.push('unexpected packet fields');
      for (const key of Object.keys(expected)) {
        if (!isDeepStrictEqual(packet[key], expected[key])) problems.push(`invalid current-source field: ${key}`);
      }
    }
  } catch {
    problems.push('required source unavailable or historical/current binding drifted');
  }
  return {
    ok: problems.length === 0,
    sourceContractValid: problems.length === 0,
    historicalPacketReusable: false,
    historicalApprovalReusable: false,
    historicalWindowReusable: false,
    productionVerifierAccepted: false,
    uploadSessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false,
    runtimeActivationAuthorized: false,
    problems,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_MODE');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), `${JSON.stringify(expectedPacket(), null, 2)}\n`);
    }
    const bytes = read(PACKET);
    const result = checkAcceptance(JSON.parse(bytes.toString('utf8')));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha256(bytes) } : {}) }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, code: 'CAD_CURRENT_SOURCE_ACCEPTANCE_CHECKER_ERROR' }));
    process.exitCode = 1;
  }
}

module.exports = {
  CURRENT_MAIN_COMMIT,
  HISTORICAL_PACKET,
  HISTORICAL_PACKET_SHA256,
  PACKET,
  ROUTER_CHANGE_COMMIT,
  ROUTER_MERGE_COMMIT,
  SOURCES,
  checkAcceptance,
  expectedPacket,
};
