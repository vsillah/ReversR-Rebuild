// Checks only the public source-set contract. Never reads restricted receipt refs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { REQUIRED_LIVE_BINDINGS } = require('../offline/cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: CANDIDATE_PACKET, checkDiscovery } =
  require('./cad-auth-restricted-candidate-discovery-checker');
const {
  sourceSetContract,
  checkSourceSetContract,
} = require('../offline/cad-auth-restricted-source-set-contract/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-source-set-contract.json';
const SOURCES = Object.freeze([
  CANDIDATE_PACKET,
  'docs/cad-auth-restricted-source-set-contract.md',
  'offline/cad-auth-restricted-source-set-contract/preparation.js',
  'scripts/cad-auth-restricted-source-set-contract-checker.js',
  'scripts/cad-auth-restricted-source-set-contract.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedCategoryFieldCounts() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
    category,
    RECEIPT_FIELDS[category].length,
  ]));
}

function expectedPacket(readSource = read) {
  const candidateDiscovery = JSON.parse(readSource(CANDIDATE_PACKET));
  if (!checkDiscovery(candidateDiscovery, { readSource }).ok) {
    throw Error('INVALID_CANDIDATE_DISCOVERY_PARENT');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-source-set-contract-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_CONTRACT_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: candidateDiscovery.packet,
      sha256: sha(readSource(CANDIDATE_PACKET)),
      sourceMergeCommit: candidateDiscovery.sourceMergeCommit,
      status: candidateDiscovery.status,
      confirmsCandidateSetIncomplete: candidateDiscovery.preparation.discoveryResult.categoryUnionComplete === false,
    },
    preparation: sourceSetContract(),
    categoryFieldCounts: expectedCategoryFieldCounts(),
    acceptanceBoundary: {
      currentSourceSetAccepted: false,
      noCoherentPrivateSourceSetPresent: true,
      nextGateRequiresNamedPrivateSource: true,
      nextGateMayCommitOnlySanitizedProjection: true,
      nextGateStillNotExecutable: true,
      stopCondition: 'STOP_IF_NO_SINGLE_SOURCE_OR_COHERENT_SOURCE_SET_CONTAINS_ALL_EIGHT_CATEGORIES',
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: candidateDiscovery.sourceMergeCommit,
  };
}

function checkContract(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkSourceSetContract(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkSourceSetContract(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_SET_CONTRACT_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_CONTRACT',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_CONTRACT'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkContract(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkSourceSetContract(null),
      code: 'RESTRICTED_SOURCE_SET_CONTRACT_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkContract };
