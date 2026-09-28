// Fixed source-only checker. No live mode, credentials or arbitrary paths.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-live-opening-runtime-activation-checker');
const {
  BASE_MAIN_COMMIT,
  executableRuntimeWiringPreparation,
  checkExecutableRuntimeWiringPreparation,
} = require('../offline/cad-auth-live-opening-executable-runtime-wiring/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-executable-runtime-wiring.json';
const SOURCES = Object.freeze([
  parent.PACKET,
  'server/cadUserUploadRouter.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'offline/cad-auth-live-opening-executable-runtime-wiring/preparation.js',
  'docs/cad-auth-live-opening-executable-runtime-wiring.md',
  'scripts/cad-auth-live-opening-executable-runtime-wiring-checker.js',
  'scripts/cad-auth-live-opening-executable-runtime-wiring.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parentPacket = JSON.parse(readSource(parent.PACKET));
  if (!parent.checkPacket(parentPacket, { readSource }).ok) {
    throw Error('RUNTIME_ACTIVATION_PARENT_INVALID');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-executable-runtime-wiring-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_EXECUTABLE_RUNTIME_WIRING_PACKET_VALIDATED_PRODUCTION_CLOSED',
    baseMainCommit: BASE_MAIN_COMMIT,
    parent: {
      runtimeActivation: {
        path: parent.PACKET,
        sha256: sha(readSource(parent.PACKET)),
        status: parentPacket.status || parentPacket.packet,
      },
    },
    preparation: executableRuntimeWiringPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && checkExecutableRuntimeWiringPreparation(input.preparation).ok);
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...checkExecutableRuntimeWiringPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_RUNTIME_WIRING_PACKET_VALID'
      : 'EXECUTABLE_RUNTIME_WIRING_PACKET_BLOCKED',
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkExecutableRuntimeWiringPreparation(null),
      code: 'EXECUTABLE_RUNTIME_WIRING_CHECKER_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
