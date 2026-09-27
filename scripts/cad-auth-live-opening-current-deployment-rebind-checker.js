// Checks only public source-only current-deployment rebind files. No live activation.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parentRuntimeMount = require('./cad-auth-live-opening-runtime-mount-prep-checker');
const {
  SOURCE_COMMIT,
  RUNTIME_MOUNT_PREP_PACKET_SHA256,
  currentDeploymentRebindPreparation,
  checkCurrentDeploymentRebindPreparation,
} = require('../offline/cad-auth-live-opening-current-deployment-rebind/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-current-deployment-rebind.json';
const SOURCES = Object.freeze([
  parentRuntimeMount.PACKET,
  'docs/cad-auth-live-opening-current-deployment-rebind.md',
  'offline/cad-auth-live-opening-current-deployment-rebind/preparation.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'scripts/cad-auth-live-opening-current-deployment-rebind-checker.js',
  'scripts/cad-auth-live-opening-current-deployment-rebind.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(parentRuntimeMount.PACKET));
  if (!parentRuntimeMount.checkRuntimeMountPrepPacket(parent, { readSource }).ok) {
    throw Error('RUNTIME_MOUNT_PREP_PARENT_INVALID');
  }
  const parentSha = sha(readSource(parentRuntimeMount.PACKET));
  if (parentSha !== RUNTIME_MOUNT_PREP_PACKET_SHA256) {
    throw Error('RUNTIME_MOUNT_PREP_PACKET_SHA_MISMATCH');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-current-deployment-rebind-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_CURRENT_DEPLOYMENT_REBIND_NO_RUNTIME_EFFECTS',
    parent: {
      liveOpeningRuntimeMountPrep: {
        path: parentRuntimeMount.PACKET,
        sha256: parentSha,
        status: parent.status || parent.packet,
      },
    },
    preparation: currentDeploymentRebindPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceCommit: SOURCE_COMMIT,
  };
}

function checkCurrentDeploymentRebindPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null
      && typeof packet === 'object'
      && !Array.isArray(packet)
      && plainContractData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkCurrentDeploymentRebindPreparation(packet.preparation).ok;
  } catch {
    // Return a closed result without reflecting input.
  }
  return {
    ...checkCurrentDeploymentRebindPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_CURRENT_DEPLOYMENT_REBIND_PACKET_VALID'
      : 'INVALID_CURRENT_DEPLOYMENT_REBIND_PACKET',
    problems: ok ? [] : ['INVALID_CURRENT_DEPLOYMENT_REBIND_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkCurrentDeploymentRebindPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkCurrentDeploymentRebindPreparation(null),
      code: 'CURRENT_DEPLOYMENT_REBIND_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkCurrentDeploymentRebindPacket };
