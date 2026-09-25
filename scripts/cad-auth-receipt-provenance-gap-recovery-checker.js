// Checks only the public source-only artifact preparation plan. Never reads private receipts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkSupplyPacket } =
  require('./cad-auth-eight-artifact-supply-gate-checker');
const {
  ANCHORS,
  recoveryPreparation,
  checkRecoveryPreparation,
} = require('../offline/cad-auth-receipt-provenance-gap-recovery/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-receipt-provenance-gap-recovery.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'offline/cad-auth-restricted-receipt-gap-closure/preparation.js',
  'docs/cad-auth-receipt-provenance-gap-recovery.md',
  'offline/cad-auth-receipt-provenance-gap-recovery/preparation.js',
  'scripts/cad-auth-receipt-provenance-gap-recovery-checker.js',
  'scripts/cad-auth-receipt-provenance-gap-recovery.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (sha(readSource(PARENT_PACKET)) !== ANCHORS.supplyPacketSha256 || !checkSupplyPacket(parent, { readSource }).ok) throw Error('INVALID_ARTIFACT_PREPARATION_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-receipt-provenance-gap-recovery-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_PROVENANCE_GAP_RECOVERY_STOP_PRESERVED',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: ANCHORS.mainCommit,
      status: parent.status,
    },
    preparation: recoveryPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: ANCHORS.mainCommit,
  };
}

function checkRecoveryPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkRecoveryPreparation(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkRecoveryPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RECEIPT_PROVENANCE_RECOVERY_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_RECEIPT_PROVENANCE_RECOVERY_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RECEIPT_PROVENANCE_RECOVERY_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkRecoveryPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkRecoveryPreparation(null),
      code: 'RECEIPT_PROVENANCE_RECOVERY_PLAN_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkRecoveryPacket };
