// Fixed public source reads only. No live adapter, command-card issuance or body IO.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-prod-executable-runner-checker');
const parentSource = require('./cad-auth-prod-executable-runner-source-checker');
const {
  durableRunnerAdapterPacket,
} = require('../offline/cad-auth-prod-durable-runner-adapter-prep/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-durable-runner-adapter-prep.json';
const SOURCES = Object.freeze([
  parent.PACKET,
  ...parent.SOURCES,
  parentSource.PACKET,
  ...parentSource.SOURCES,
  'offline/cad-auth-prod-durable-runner-adapter-prep/preparation.js',
  'offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter.js',
  'docs/cad-auth-prod-durable-runner-adapter-prep.md',
  'scripts/cad-auth-prod-durable-runner-adapter-prep-checker.js',
  'scripts/cad-auth-prod-durable-runner-adapter-prep.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  if (!parent.checkPacket(JSON.parse(readSource(parent.PACKET)), { readSource }).ok) {
    throw Error('PARENT_EXECUTABLE_RUNNER_INVALID');
  }
  if (!parentSource.checkPacket(JSON.parse(readSource(parentSource.PACKET)), { readSource }).ok) {
    throw Error('PARENT_EXECUTABLE_RUNNER_SOURCE_INVALID');
  }
  return {
    ...durableRunnerAdapterPacket(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = input !== null
      && typeof input === 'object'
      && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource));
  } catch {
    // Return a closed status without reflecting input.
  }
  return {
    ok,
    code: ok ? 'SOURCE_ONLY_DURABLE_RUNNER_ADAPTER_PREP_VALID' : 'INVALID_DURABLE_RUNNER_ADAPTER_PREP_PACKET',
    sourceOnly: true,
    enabled: false,
    runtimeMounted: false,
    liveExecutionReady: false,
    liveExecutionAuthorized: false,
    commandCardIssuanceAuthorized: false,
    uploadSessionIssuanceAuthorized: false,
    productionUploadActivationAuthorized: false,
    requestBodyAdmissionReadAuthorized: false,
    cleanupAuthorized: false,
    effectsExecuted: 0,
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2];
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
