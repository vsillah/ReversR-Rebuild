// Checks only public source-only executable command-card rebind files.
// No live activation, command-card issuance, credentials or arbitrary paths.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-live-opening-executable-runtime-wiring-checker');
const {
  SOURCE_COMMIT,
  EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256,
  executableCommandCardRebindPreparation,
  checkExecutableCommandCardRebindPreparation,
} = require('../offline/cad-auth-live-opening-executable-command-card-rebind/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-executable-command-card-rebind.json';
const SOURCES = Object.freeze([
  parent.PACKET,
  'docs/cad-auth-live-opening-executable-command-card-rebind.md',
  'offline/cad-auth-live-opening-executable-command-card-rebind/preparation.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'scripts/cad-auth-live-opening-executable-command-card-rebind-checker.js',
  'scripts/cad-auth-live-opening-executable-command-card-rebind.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parentPacket = JSON.parse(readSource(parent.PACKET));
  if (!parent.checkPacket(parentPacket, { readSource }).ok) {
    throw Error('EXECUTABLE_RUNTIME_WIRING_PARENT_INVALID');
  }
  const parentSha = sha(readSource(parent.PACKET));
  if (parentSha !== EXECUTABLE_RUNTIME_WIRING_PACKET_SHA256) {
    throw Error('EXECUTABLE_RUNTIME_WIRING_PACKET_SHA_MISMATCH');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-executable-command-card-rebind-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_VALIDATED_NO_LIVE_EFFECTS',
    sourceCommit: SOURCE_COMMIT,
    parent: {
      executableRuntimeWiring: {
        path: parent.PACKET,
        sha256: parentSha,
        status: parentPacket.status || parentPacket.packet,
      },
    },
    preparation: executableCommandCardRebindPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && checkExecutableCommandCardRebindPreparation(input.preparation).ok);
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...checkExecutableCommandCardRebindPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_VALID'
      : 'EXECUTABLE_COMMAND_CARD_REBIND_PACKET_BLOCKED',
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
      ...checkExecutableCommandCardRebindPreparation(null),
      code: 'EXECUTABLE_COMMAND_CARD_REBIND_CHECKER_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
