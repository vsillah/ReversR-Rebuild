// Checks only the public generator contract. Never reads a private source dir.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: CONTRACT_PACKET, checkContract } =
  require('./cad-auth-restricted-source-set-contract-checker');
const {
  generatorContract,
  checkGeneratorContract,
} = require('../offline/cad-auth-restricted-source-set-generator/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-source-set-generator.json';
const SOURCES = Object.freeze([
  CONTRACT_PACKET,
  'docs/cad-auth-restricted-source-set-generator.md',
  'offline/cad-auth-restricted-source-set-generator/preparation.js',
  'scripts/cad-auth-restricted-source-set-generator.js',
  'scripts/cad-auth-restricted-source-set-generator-checker.js',
  'scripts/cad-auth-restricted-source-set-generator.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const contract = JSON.parse(readSource(CONTRACT_PACKET));
  if (!checkContract(contract, { readSource }).ok) throw Error('INVALID_SOURCE_SET_CONTRACT_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-source-set-generator-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_GENERATOR_CONTRACT_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: contract.packet,
      sha256: sha(readSource(CONTRACT_PACKET)),
      sourceMergeCommit: contract.sourceMergeCommit,
      status: contract.status,
    },
    preparation: generatorContract(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: contract.sourceMergeCommit,
  };
}

function checkGeneratorPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkGeneratorContract(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkGeneratorContract(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_SET_GENERATOR_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_GENERATOR_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_GENERATOR_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkGeneratorPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkGeneratorContract(null),
      code: 'RESTRICTED_SOURCE_SET_GENERATOR_CONTRACT_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkGeneratorPacket };
