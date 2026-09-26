// Fixed public source reads only. No command-card issuance or live execution.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-prod-runner-checker');
const {
  runnerSourcePacket,
  checkRunnerSourcePacket,
} = require('../offline/cad-auth-prod-executable-runner-source/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-executable-runner-source.json';
const SOURCES = Object.freeze([
  parent.PACKET,
  ...parent.SOURCES,
  'offline/cad-auth-prod-executable-runner-source/preparation.js',
  'docs/cad-auth-prod-executable-runner-source.md',
  'scripts/cad-auth-prod-executable-runner-source-checker.js',
  'scripts/cad-auth-prod-executable-runner-source.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  if (!parent.checkPacket(JSON.parse(readSource(parent.PACKET)), { readSource }).ok) {
    throw Error('PARENT_RUNNER_PACKET_INVALID');
  }
  return {
    ...runnerSourcePacket(),
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
    ...checkRunnerSourcePacket(null),
    ok,
    code: ok ? 'SOURCE_ONLY_EXECUTABLE_RUNNER_SOURCE_VALID' : 'INVALID_EXECUTABLE_RUNNER_SOURCE_PACKET',
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
