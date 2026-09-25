// Checks only the public source-only artifact preparation plan. Never reads private receipts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkGapClosurePacket } =
  require('./cad-auth-restricted-receipt-gap-closure-checker');
const {
  MERGE_COMMIT,
  artifactPreparation,
  checkArtifactPreparation,
} = require('../offline/cad-auth-missing-receipt-artifact-prep/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-missing-receipt-artifact-prep.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-missing-receipt-artifact-prep.md',
  'offline/cad-auth-missing-receipt-artifact-prep/preparation.js',
  'scripts/cad-auth-missing-receipt-artifact-prep-checker.js',
  'scripts/cad-auth-missing-receipt-artifact-prep.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (!checkGapClosurePacket(parent, { readSource }).ok) throw Error('INVALID_GAP_CLOSURE_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-missing-receipt-artifact-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_ARTIFACT_PREPARATION_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: MERGE_COMMIT,
      status: parent.status,
    },
    preparation: artifactPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: MERGE_COMMIT,
  };
}

function checkArtifactPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkArtifactPreparation(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkArtifactPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_MISSING_RECEIPT_ARTIFACT_PREP_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_MISSING_RECEIPT_ARTIFACT_PREP_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_MISSING_RECEIPT_ARTIFACT_PREP_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkArtifactPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkArtifactPreparation(null),
      code: 'MISSING_RECEIPT_ARTIFACT_PREP_PLAN_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkArtifactPacket };
