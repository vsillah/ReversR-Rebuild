// Fixed public source manifest only. No runtime execution or provider access.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-live-opening-current-deployment-rebind-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-runtime-activation.json';
const SOURCES = Object.freeze([
  parent.PACKET,
  'scripts/cad-upload-admission-activation-runner-rebind.test.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadUserUploadRouter.js',
  'server/cadLiveOpeningRuntimeActivation.js',
  'docs/cad-auth-live-opening-runtime-activation.md',
  'scripts/cad-auth-live-opening-runtime-activation-checker.js',
  'scripts/cad-auth-live-opening-runtime-activation.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const controls = Object.freeze({
  runtimeActivationAuthorized: false, productionUploadActivationAuthorized: false,
  uploadSessionIssuanceAuthorized: false, requestBodyAdmissionReadAuthorized: false,
  executableCommandCardIssuanceAuthorized: false, liveEvidenceCollectionAuthorized: false,
  providerEnvResourceBillingChangeAuthorized: false, secretReadAuthorized: false,
  conversionAuthorized: false, sandboxDispatchAuthorized: false, privateCadUseAuthorized: false,
  externalMessagesAuthorized: false, retryAuthorized: false, secondLiveRunAuthorized: false,
  realUserCommercializationAuthorized: false, commercialReadinessClaimed: false, effectsExecuted: 0,
});
function expectedPacket(readSource = read) {
  const prior = JSON.parse(readSource(parent.PACKET));
  if (!parent.checkCurrentDeploymentRebindPacket(prior, { readSource }).ok) throw Error('INVALID_PARENT');
  return {
    schemaVersion: 1, packet: 'cad-auth-live-opening-runtime-activation-v1', sourceOnly: true,
    status: 'SOURCE_ONLY_CONTROL_PLANE_IMPLEMENTED_PRODUCTION_CLOSED',
    baseCommit: '3b22baa19359dcb6b2dcd30ad5ea8a35cf1c6ded',
    controls,
    implementation: {
      enabledByDefault: false, providerAdapterSupplied: false, routerBodyGateChanged: true,
      exactByteDigestRequired: true, immutableDeploymentRecheckedBeforeOpening: true,
      durableEvidenceRequired: true, permanentCrossCardRunFence: true, maxSessions: 1, maxAttempts: 1,
      expiryBeforeEveryEffect: true, independentDurableRollbackRequired: true,
      expiredCleanupStillRequired: true, postRollbackFailClosedSmokeRequired: true,
      actualDurableAdapterQualifiedBySyntheticTests: false,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource)); } catch { /* Closed. */ }
  return { ...controls, ok, code: ok ? 'SOURCE_ONLY_ACTIVATION_IMPLEMENTATION_VALID' : 'ACTIVATION_IMPLEMENTATION_BLOCKED' };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...controls, ok: false, code: 'ACTIVATION_IMPLEMENTATION_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
