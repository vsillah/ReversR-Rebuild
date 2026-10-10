const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packetPath = path.join(root, 'docs/cad-phase5-package8-release-readiness.json');
const EXPECTED_COMMIT = '6c822b215bc74fc1203442bfef903855a9cbe5df';
const EXPECTED_TREE = '0063973062495d3f06e93644f041c57d76989f42';

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validatePacket(packet) {
  const errors = [];
  const expect = (condition, message) => { if (!condition) errors.push(message); };

  expect(packet?.schemaVersion === 1, 'schema version');
  expect(packet?.packetType === 'CAD_PHASE5_PACKAGE8_RELEASE_READINESS', 'packet type');
  expect(packet?.status === 'BLOCKED_PENDING_EXACT_BINDINGS', 'blocked status');
  expect(packet?.scope === 'SOURCE_ONLY_RELEASE_READINESS', 'source-only scope');
  expect(packet?.source?.mergeCommit === EXPECTED_COMMIT, 'source commit');
  expect(packet?.source?.tree === EXPECTED_TREE, 'source tree');
  expect(packet?.productionEvidence?.deploymentId === 'dpl_9LJyxxsuq8pqEXBTGidGvagLxfgb', 'deployment id');
  expect(packet?.productionEvidence?.gitCommit === EXPECTED_COMMIT, 'deployment commit');
  expect(packet?.productionEvidence?.target === 'production', 'deployment target');
  expect(packet?.productionEvidence?.readyState === 'READY', 'deployment state');
  expect(packet?.productionEvidence?.canonicalUrl === 'https://reversr.vercel.app', 'canonical alias');

  const smoke = packet?.failClosedSmoke;
  expect(smoke?.method === 'POST', 'smoke method');
  expect(smoke?.url === 'https://reversr.vercel.app/api/cad/user-import', 'smoke URL');
  expect(smoke?.requestCount === 1 && smoke?.requestBodyBytes === 0, 'empty one-request smoke');
  expect(smoke?.retries === 0 && smoke?.redirectsFollowed === 0, 'smoke retry and redirect policy');
  expect(smoke?.status === 401 && smoke?.code === 'USER_SESSION_REQUIRED', 'smoke result');

  const candidate = packet?.candidateQualification;
  expect(candidate?.classification === 'PUBLIC_FIXTURE_ONLY', 'public fixture classification');
  expect(candidate?.sessions === 1 && candidate?.files === 1 && candidate?.attempts === 1, 'one-use limits');
  expect(candidate?.automaticRetries === 0, 'zero retries');
  expect(candidate?.maximumWindowMinutes === 15, 'window limit');
  expect(candidate?.allInCostCeilingUsd === 9, 'cost ceiling');
  for (const key of ['proprietaryCadAllowed', 'customerDataAllowed', 'generalAvailabilityAllowed', 'commercialAvailabilityAllowed']) {
    expect(candidate?.[key] === false, `${key} closed`);
  }

  const authority = packet?.authority || {};
  const authorityKeys = [
    'package8ActivationAuthorized', 'routeMountAuthorized', 'sessionIssuanceAuthorized',
    'requestBodyAdmissionAuthorized', 'storageDispatchAuthorized', 'conversionDispatchAuthorized',
    'downloadRoutingAuthorized', 'providerConfigurationAuthorized', 'deploymentAuthorized',
    'paymentAuthorized', 'externalMessagesAuthorized',
  ];
  for (const key of authorityKeys) expect(authority[key] === false, `${key} closed`);

  const requiredBindings = packet?.requiredBindings || {};
  expect(Object.keys(requiredBindings).length === 29, 'required binding inventory');
  for (const [key, value] of Object.entries(requiredBindings)) expect(value === null, `${key} unresolved`);

  expect(Array.isArray(packet?.packageReceipts) && packet.packageReceipts.length === 7, 'seven package receipts');
  expect(Array.isArray(packet?.rollbackOrder) && packet.rollbackOrder.length === 7, 'rollback sequence');
  expect(packet?.rollbackOrder?.[0] === 'close admission and conversion', 'close-first rollback');
  expect(Array.isArray(packet?.stopConditions) && packet.stopConditions.length === 9, 'stop conditions');
  expect(packet?.nextGate?.type === 'READ_ONLY_BINDING_COMPLETION', 'next gate type');
  expect(packet?.nextGate?.activationAllowed === false, 'next gate activation closed');
  expect(typeof packet?.nextGate?.template === 'string'
    && packet.nextGate.template.includes('Treat Vambah as release, rollback, incident, and monitoring owner')
    && packet.nextGate.template.includes('no backup operator is required'), 'continuation template');
  return errors;
}

function verifySource(rootPath = root) {
  const errors = [];
  const packet = JSON.parse(fs.readFileSync(path.join(rootPath, 'docs/cad-phase5-package8-release-readiness.json'), 'utf8'));
  errors.push(...validatePacket(packet));

  for (const binding of [packet.source.phase5Plan, packet.source.package7Gate, ...packet.packageReceipts]) {
    if (sha256(path.join(rootPath, binding.path)) !== binding.sha256) errors.push(`digest mismatch: ${binding.path}`);
  }

  const tree = execFileSync('git', ['show', '-s', '--format=%T', EXPECTED_COMMIT], { cwd: rootPath, encoding: 'utf8' }).trim();
  if (tree !== EXPECTED_TREE) errors.push('baseline tree mismatch');
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', EXPECTED_COMMIT, 'HEAD'], { cwd: rootPath, stdio: 'ignore' });
  } catch {
    errors.push('baseline is not an ancestor');
  }

  const uploadRouter = fs.readFileSync(path.join(rootPath, 'server/cadUserUploadRouter.js'), 'utf8');
  const importBridge = fs.readFileSync(path.join(rootPath, 'utils/cadUserImportBridge.js'), 'utf8');
  const authBinding = fs.readFileSync(path.join(rootPath, 'server/cadConvexAuthWebSessionBinding.js'), 'utf8');
  const custody = fs.readFileSync(path.join(rootPath, 'server/cadR2PrivateArtifactCustody.js'), 'utf8');
  const conversion = fs.readFileSync(path.join(rootPath, 'server/cadPhase5DerivedArtifactOrchestrator.js'), 'utf8');
  if (!/const BODY_ADMISSION_AUTHORIZED = false;/.test(uploadRouter)) errors.push('body gate is not closed');
  if (!/const CAD_USER_IMPORT_ENABLED = false;/.test(importBridge)) errors.push('import bridge is not closed');
  if (!/issuanceRouted: false/.test(authBinding)) errors.push('session issuance is not closed');
  if (!/providerDispatchEnabled: false/.test(custody)) errors.push('custody dispatch is not closed');
  if (!/runtimeConversionDispatchEnabled: false/.test(conversion)) errors.push('conversion dispatch is not closed');
  return errors;
}

if (require.main === module) {
  const errors = verifySource();
  if (errors.length) {
    process.stdout.write(`${JSON.stringify({ status: 'FAIL', errors })}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${JSON.stringify({ status: 'PASS', package: 8, activationAuthorized: false, unresolvedBindings: 29 })}\n`);
  }
}

module.exports = { validatePacket, verifySource };
