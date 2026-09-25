// Checks only the public source-only accepted provenance projection packet.
// Never reads private reviews, receipts, schedules, or source-set files.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkStopRepairPacket } =
  require('./cad-auth-provenance-review-stop-repair-checker');
const {
  SOURCE_MERGE_COMMIT,
  acceptedProvenanceProjection,
  checkAcceptedProvenanceProjection,
} = require('../offline/cad-auth-accepted-provenance-projection/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-accepted-provenance-projection.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-accepted-provenance-projection.md',
  'offline/cad-auth-accepted-provenance-projection/preparation.js',
  'scripts/cad-auth-accepted-provenance-projection-checker.js',
  'scripts/cad-auth-accepted-provenance-projection.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (!checkStopRepairPacket(parent, { readSource }).ok) throw Error('INVALID_STOP_REPAIR_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-accepted-provenance-review-projection-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_NO_PRIVATE_READS',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: SOURCE_MERGE_COMMIT,
      status: parent.status,
    },
    preparation: acceptedProvenanceProjection(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
  };
}

function checkProjectionPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkAcceptedProvenanceProjection(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkAcceptedProvenanceProjection(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_ACCEPTED_PROVENANCE_PROJECTION_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkProjectionPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkAcceptedProvenanceProjection(null),
      code: 'ACCEPTED_PROVENANCE_PROJECTION_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkProjectionPacket };
