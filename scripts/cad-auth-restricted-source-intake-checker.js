// Checks the sanitized restricted source intake only. Never opens private receipt refs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: REVIEW_PACKET_FILE, checkReview } =
  require('./cad-auth-restricted-receipt-review-checker');
const {
  REVIEW_PACKET,
  APPROVED_SOURCE_READ,
  restrictedSourceIntakeDisposition,
  checkRestrictedSourceIntakeDisposition,
} = require('../offline/cad-auth-restricted-source-intake/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-source-intake.json';
const SOURCES = Object.freeze([
  REVIEW_PACKET_FILE,
  'docs/cad-auth-restricted-source-intake.md',
  'offline/cad-auth-restricted-source-intake/preparation.js',
  'scripts/cad-auth-restricted-source-intake-checker.js',
  'scripts/cad-auth-restricted-source-intake.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const reviewPacket = JSON.parse(readSource(REVIEW_PACKET_FILE));
  if (!checkReview(reviewPacket, { readSource }).ok) throw Error('INVALID_RESTRICTED_RECEIPT_REVIEW_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-source-intake-v1',
    sourceOnly: true,
    status: 'APPROVED_PRIVATE_SOURCE_READ_STOPPED_INSUFFICIENT',
    parent: {
      packet: reviewPacket.packet,
      sha256: sha(readSource(REVIEW_PACKET_FILE)),
      sourceMergeCommit: reviewPacket.sourceMergeCommit,
      status: reviewPacket.status,
      matchesApprovedReviewPacket: REVIEW_PACKET.sha256 === sha(readSource(REVIEW_PACKET_FILE)),
    },
    approvedSourceProjection: {
      ref: APPROVED_SOURCE_READ.sourceRef,
      sha256: APPROVED_SOURCE_READ.sourceSha256,
      byteLength: APPROVED_SOURCE_READ.sourceByteLength,
      packet: APPROVED_SOURCE_READ.sourcePacket,
      status: APPROVED_SOURCE_READ.sourceStatus,
      stopCode: APPROVED_SOURCE_READ.sourceStopCode,
    },
    preparation: restrictedSourceIntakeDisposition(),
    futureHumanGate: {
      status: 'ANOTHER_PRIVATE_SOURCE_REQUIRED',
      required: true,
      automaticallyPromotable: false,
      exactPhrase: null,
      nextStep: 'Supply and approve one private restricted receipt bundle containing all eight category refs and exact SHA-256 digests; this stop receipt cannot advance.',
      blockedUntilFullBundleSourceNamed: true,
      blockedUntilAllEightCategoryRefsPresent: true,
      blockedUntilDigestRecomputationComplete: true,
      blockedUntilCustodyReviewerSeparationAccepted: true,
      blockedUntilRetentionDispositionSettled: true,
      blockedUntilImmutableTargetRechecked: true,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: REVIEW_PACKET.boundMainCommit,
  };
}

function checkIntake(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return {
    ...checkRestrictedSourceIntakeDisposition(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_INTAKE_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_INTAKE',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_INTAKE'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkIntake(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkRestrictedSourceIntakeDisposition(null),
      code: 'RESTRICTED_SOURCE_INTAKE_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkIntake };
