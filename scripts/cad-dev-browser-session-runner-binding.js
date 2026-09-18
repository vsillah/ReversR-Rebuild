#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const packetMarkdown = 'docs/cad-dev-browser-session-qualification-packet.md';
const packetJson = 'docs/cad-dev-browser-session-qualification-packet.json';
const expectedPacket = Object.freeze({
  mergeCommit: 'a7ed32a15b5082dca7bad0b24d2500e5e7151923',
  packetMergeCommit: 'aeb437e29fef0eb87b6ff7db3292a247b295bde6',
  markdownSha256: '64248643c3f05c521e3c2a407170282cf63e61a2fd518841c422f7c8cc8aef4a',
  jsonSha256: 'f540591d39fcc628dd4cbec4bcfc7b66526eb70ad1791b3bc68c791d7e208c85',
});

const falseAuthorityKeys = Object.freeze([
  'liveRunAuthorized',
  'production',
  'uploadActivation',
  'bodyAdmission',
  'conversion',
  'sandboxDispatch',
  'privateCad',
  'realUsers',
  'providerMutation',
  'resourceMutation',
  'environmentMutation',
  'secretReads',
  'secretWrites',
  'persistentStoreMutation',
  'usageBillingChanges',
  'emailSmsSlack',
  'retryPriorRun',
  'cleanupBranchesWorktrees',
]);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const hex64 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const fail = code => { throw new Error(code); };

function read(file) {
  return fs.readFileSync(path.join(root, file));
}

function fileDigest(file) {
  return sha256(read(file));
}

function fileMode(file) {
  return fs.statSync(file).mode & 0o777;
}

function assertPrivateBindingFile(file) {
  if (!path.isAbsolute(file) || path.normalize(file) !== file) fail('BINDING_PATH_INVALID');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail('BINDING_FILE_MISSING');
  if (fileMode(file) !== 0o600) fail('BINDING_FILE_MODE_INVALID');
  const dir = path.dirname(file);
  if (fileMode(dir) !== 0o700) fail('BINDING_DIRECTORY_MODE_INVALID');
}

function validateOrigin(origin) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    fail('TARGET_ORIGIN_INVALID');
  }
  if (parsed.protocol !== 'https:') fail('TARGET_ORIGIN_NOT_HTTPS');
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    fail('TARGET_ORIGIN_NOT_ORIGIN_ONLY');
  }
  if (parsed.hostname === 'reversr.vercel.app') fail('TARGET_ORIGIN_PRODUCTION_FORBIDDEN');
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    fail('TARGET_ORIGIN_LOOPBACK_NOT_HTTPS_REVIEWED');
  }
  return parsed.origin;
}

function validateWindow(binding) {
  const start = Date.parse(binding.window?.startUtc);
  const end = Date.parse(binding.window?.endUtc);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) fail('RUN_WINDOW_INVALID');
  if (end <= start || end > start + 15 * 60 * 1000) fail('RUN_WINDOW_OUT_OF_BOUNDS');
  return { start, end };
}

function validateLimits(limits) {
  if (!limits || typeof limits !== 'object') fail('LIMITS_INVALID');
  const expected = {
    maxIssuerRequests: 1,
    maxDisabledUploadRequests: 1,
    requestBodyBytes: 0,
    bodyReads: 0,
    retry: false,
    secondRun: false,
    redirects: false,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (limits[key] !== value) fail(`LIMIT_${key}_INVALID`);
  }
}

function validateAuthority(authority) {
  if (!authority || typeof authority !== 'object') fail('AUTHORITY_INVALID');
  for (const key of falseAuthorityKeys) {
    if (authority[key] !== false) fail(`AUTHORITY_${key}_MUST_BE_FALSE`);
  }
}

function validateRunBinding(binding) {
  if (!binding || typeof binding !== 'object') fail('BINDING_INVALID');
  if (binding.schemaVersion !== 1 || binding.mode !== 'cad-dev-browser-session-qualification-run-binding') {
    fail('BINDING_MODE_INVALID');
  }
  if (!safeId(binding.runId)) fail('RUN_ID_INVALID');
  if (!commit40(binding.sourceCommit)) fail('SOURCE_COMMIT_INVALID');

  if (!binding.packet || typeof binding.packet !== 'object') fail('PACKET_BINDING_INVALID');
  if (binding.packet.dependsOnPr !== 315) fail('PACKET_PR_INVALID');
  if (binding.packet.mergeCommit !== expectedPacket.mergeCommit) fail('PACKET_MERGE_INVALID');
  if (binding.packet.packetMergeCommit !== expectedPacket.packetMergeCommit) fail('PACKET_SOURCE_MERGE_INVALID');
  if (binding.packet.markdownSha256 !== expectedPacket.markdownSha256
    || binding.packet.jsonSha256 !== expectedPacket.jsonSha256) fail('PACKET_EXPECTED_DIGEST_INVALID');
  if (fileDigest(packetMarkdown) !== binding.packet.markdownSha256
    || fileDigest(packetJson) !== binding.packet.jsonSha256) fail('PACKET_DIGEST_DRIFT');

  if (!binding.target || typeof binding.target !== 'object') fail('TARGET_INVALID');
  const origin = validateOrigin(binding.target.exactOrigin);
  if (typeof binding.target.exactBrowserRoute !== 'string'
    || !binding.target.exactBrowserRoute.startsWith('/')) fail('TARGET_ROUTE_INVALID');
  if (binding.target.sourceCommit !== binding.sourceCommit) fail('TARGET_SOURCE_COMMIT_MISMATCH');
  if (!hex64(binding.target.productionSmokeReceiptSha256)) fail('TARGET_SMOKE_RECEIPT_INVALID');

  if (!binding.auth || typeof binding.auth !== 'object') fail('AUTH_BINDING_INVALID');
  if (binding.auth.kind !== 'synthetic-server-owned-header-resolver') fail('AUTH_KIND_INVALID');
  if (!hex64(binding.auth.acceptanceReceiptSha256) || !hex64(binding.auth.adapterSourceSha256)) {
    fail('AUTH_DIGEST_INVALID');
  }
  if (binding.auth.realProviderAllowed !== false || binding.auth.lifetimeMs !== 60000) {
    fail('AUTH_BOUNDARY_INVALID');
  }

  if (!binding.rollback || !hex64(binding.rollback.receiptSha256)
    || binding.rollback.deletesPersistentRows !== false) fail('ROLLBACK_INVALID');
  if (!binding.custody || !safeId(binding.custody.custodian)
    || binding.custody.retentionDays > 30 || !hex64(binding.custody.receiptSha256)) {
    fail('CUSTODY_INVALID');
  }
  if (!binding.cost || binding.cost.maxCostUsd !== 0 || !hex64(binding.cost.evidenceSha256)) {
    fail('COST_INVALID');
  }
  validateLimits(binding.limits);
  validateAuthority(binding.authority);
  const window = validateWindow(binding);
  return Object.freeze({ origin, window });
}

function inspectBindingFile(file) {
  const bindingPath = path.resolve(file);
  assertPrivateBindingFile(bindingPath);
  const bytes = fs.readFileSync(bindingPath);
  const binding = JSON.parse(bytes.toString('utf8'));
  const validated = validateRunBinding(binding);
  return Object.freeze({
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-runner-binding-inspection',
    status: 'BROWSER_SESSION_BINDING_ACCEPTED_FOR_REVIEW',
    runId: binding.runId,
    sourceCommit: binding.sourceCommit,
    exactOrigin: validated.origin,
    exactBrowserRoute: binding.target.exactBrowserRoute,
    startUtc: binding.window.startUtc,
    endUtc: binding.window.endUtc,
    packetMarkdownSha256: binding.packet.markdownSha256,
    packetJsonSha256: binding.packet.jsonSha256,
    bindingSha256: sha256(bytes),
    liveRunAuthorized: false,
    productionTouched: false,
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    sandboxDispatchAllowed: false,
    privateCadUsed: false,
    realUsersUsed: false,
    retry: false,
    secondRun: false,
  });
}

function usage() {
  return [
    'Usage:',
    '  node scripts/cad-dev-browser-session-runner-binding.js --inspect <binding.json>',
    '',
    'This source-only validator never runs browser qualification by itself.',
  ].join('\n');
}

if (require.main === module) {
  try {
    if (process.argv[2] !== '--inspect' || !process.argv[3]) {
      process.stderr.write(`${usage()}\n`);
      process.exit(1);
    }
    process.stdout.write(`${JSON.stringify(inspectBindingFile(process.argv[3]), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  expectedPacket,
  falseAuthorityKeys,
  validateRunBinding,
  inspectBindingFile,
  assertPrivateBindingFile,
};
