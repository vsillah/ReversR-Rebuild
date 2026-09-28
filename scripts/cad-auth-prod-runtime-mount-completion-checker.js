// Checks only public source-only production runtime mount completion files.
// No live activation, command-card issuance, credentials, request-body IO or arbitrary paths.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const {
  BASE_MAIN_COMMIT,
  BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256,
  runtimeMountCompletionPreparation,
  checkRuntimeMountCompletionPreparation,
} = require('../offline/cad-auth-prod-runtime-mount-completion/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-runtime-mount-completion.json';
const PARENT_PACKET = 'docs/cad-auth-executable-production-bootstrap-binding-repair.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'server/index.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadUserUploadRouter.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'docs/cad-auth-prod-runtime-mount-completion.md',
  'offline/cad-auth-prod-runtime-mount-completion/preparation.js',
  'scripts/cad-auth-prod-runtime-mount-fixture.js',
  'scripts/cad-auth-prod-runtime-mount-completion-checker.js',
  'scripts/cad-auth-prod-runtime-mount-completion.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  const parentSha = sha(readSource(PARENT_PACKET));
  if (parentSha !== BOOTSTRAP_BINDING_REPAIR_PACKET_SHA256) {
    throw Error('BOOTSTRAP_BINDING_REPAIR_PACKET_SHA_MISMATCH');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-prod-runtime-mount-completion-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_VALIDATED_PRODUCTION_CLOSED',
    baseMainCommit: BASE_MAIN_COMMIT,
    parent: {
      bootstrapBindingRepair: {
        path: PARENT_PACKET,
        sha256: parentSha,
        status: parent.status || parent.packet,
      },
    },
    preparation: runtimeMountCompletionPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = Boolean(input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && checkRuntimeMountCompletionPreparation(input.preparation).ok);
  } catch {
    // Sanitized fail-closed response.
  }
  return {
    ...checkRuntimeMountCompletionPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_PACKET_VALID'
      : 'PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_PACKET_BLOCKED',
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
      ...checkRuntimeMountCompletionPreparation(null),
      code: 'PRODUCTION_EXECUTABLE_RUNTIME_MOUNT_COMPLETION_CHECKER_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, PARENT_PACKET, SOURCES, expectedPacket, checkPacket };
