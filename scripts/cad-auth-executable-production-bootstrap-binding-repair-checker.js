// Checks only public source-only bootstrap binding repair files.
// No live activation, command-card issuance, credentials, arbitrary paths or upload IO.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const {
  BASE_MAIN_COMMIT,
  PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256,
  bootstrapBindingRepairPreparation,
  checkBootstrapBindingRepairPreparation,
} = require('../offline/cad-auth-executable-production-bootstrap-binding-repair/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-executable-production-bootstrap-binding-repair.json';
const PARENT_PACKET = 'docs/cad-auth-live-opening-executable-command-card-rebind.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'server/cadUserUploadRouter.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'docs/cad-auth-executable-production-bootstrap-binding-repair.md',
  'offline/cad-auth-executable-production-bootstrap-binding-repair/preparation.js',
  'scripts/cad-auth-executable-production-bootstrap-binding-repair-checker.js',
  'scripts/cad-auth-executable-production-bootstrap-binding-repair.test.js',
  'scripts/cad-auth-live-opening-executable-runtime-wiring.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parentSha = sha(readSource(PARENT_PACKET));
  if (parentSha !== PREVIOUS_EXECUTABLE_COMMAND_CARD_REBIND_PACKET_SHA256) {
    throw Error('PARENT_EXECUTABLE_COMMAND_CARD_REBIND_SHA_MISMATCH');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-executable-production-bootstrap-binding-repair-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_BOOTSTRAP_BINDING_REPAIR_PACKET_VALIDATED_PRODUCTION_CLOSED',
    baseMainCommit: BASE_MAIN_COMMIT,
    parent: {
      executableCommandCardRebind: {
        path: PARENT_PACKET,
        sha256: parentSha,
        validationMode: 'historical-digest-only-parent-remains-source-bound-to-pre-repair-state',
      },
    },
    preparation: bootstrapBindingRepairPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && checkBootstrapBindingRepairPreparation(input.preparation).ok);
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...checkBootstrapBindingRepairPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_BOOTSTRAP_BINDING_REPAIR_PACKET_VALID'
      : 'BOOTSTRAP_BINDING_REPAIR_PACKET_BLOCKED',
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
      ...checkBootstrapBindingRepairPreparation(null),
      code: 'BOOTSTRAP_BINDING_REPAIR_CHECKER_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, PARENT_PACKET, SOURCES, expectedPacket, checkPacket };
