// Checks only the public source-only artifact preparation plan. Never reads private receipts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkArtifactPacket } =
  require('./cad-auth-missing-receipt-artifact-prep-checker');
const {
  MERGE_COMMIT,
  bundlePreparation,
  checkBundlePreparation,
} = require('../offline/cad-auth-eight-artifact-supply-gate/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-eight-artifact-supply-gate.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-eight-artifact-supply-gate.md',
  'offline/cad-auth-eight-artifact-supply-gate/preparation.js',
  'scripts/cad-auth-eight-artifact-supply-gate-checker.js',
  'scripts/cad-auth-eight-artifact-supply-gate.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (!checkArtifactPacket(parent, { readSource }).ok) throw Error('INVALID_ARTIFACT_PREPARATION_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-eight-artifact-supply-gate-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_BUNDLED_SUPPLY_GATE_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: MERGE_COMMIT,
      status: parent.status,
    },
    preparation: bundlePreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: MERGE_COMMIT,
  };
}

function checkSupplyPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkBundlePreparation(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkBundlePreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_EIGHT_ARTIFACT_SUPPLY_GATE_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_EIGHT_ARTIFACT_SUPPLY_GATE_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_EIGHT_ARTIFACT_SUPPLY_GATE_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkSupplyPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkBundlePreparation(null),
      code: 'EIGHT_ARTIFACT_SUPPLY_GATE_PLAN_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkSupplyPacket };
