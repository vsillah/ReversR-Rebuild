// Checks only the public source-only stop-repair packet. Never reads private receipts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkRecoveryPacket } =
  require('./cad-auth-receipt-provenance-gap-recovery-checker');
const {
  SOURCE_MERGE_COMMIT,
  stopRepairPreparation,
  checkStopRepairPreparation,
} = require('../offline/cad-auth-provenance-review-stop-repair/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-provenance-review-stop-repair.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-provenance-review-stop-repair.md',
  'offline/cad-auth-provenance-review-stop-repair/preparation.js',
  'scripts/cad-auth-provenance-review-stop-repair-checker.js',
  'scripts/cad-auth-provenance-review-stop-repair.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (!checkRecoveryPacket(parent, { readSource }).ok) throw Error('INVALID_RECOVERY_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-provenance-review-stop-repair-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_STOPPED_REVIEW_REPAIR_CONTRACT_NO_PRIVATE_READS',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: SOURCE_MERGE_COMMIT,
      status: parent.status,
    },
    preparation: stopRepairPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
  };
}

function checkStopRepairPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkStopRepairPreparation(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkStopRepairPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_PROVENANCE_REVIEW_STOP_REPAIR_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_PROVENANCE_REVIEW_STOP_REPAIR_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_PROVENANCE_REVIEW_STOP_REPAIR_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkStopRepairPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkStopRepairPreparation(null),
      code: 'PROVENANCE_REVIEW_STOP_REPAIR_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkStopRepairPacket };
