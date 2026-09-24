// Checks the sanitized public review result only. Never opens private receipt refs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: REVIEW_DISPOSITION, checkDisposition } =
  require('./cad-auth-receipt-intake-review-disposition-checker');
const { checkBundle } = require('./cad-auth-restricted-receipt-bundle-checker');
const { checkRebind } = require('./cad-auth-sealed-card-custody-rebind-checker');
const {
  MAIN_COMMIT,
  APPROVED_GATE,
  disabledRestrictedReceiptReview,
  checkDisabledRestrictedReceiptReview,
} = require('../offline/cad-auth-restricted-receipt-review/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-receipt-review.json';
const RESTRICTED_BUNDLE = 'docs/cad-auth-restricted-receipt-bundle.json';
const SEALED_REBIND = 'docs/cad-auth-sealed-card-custody-rebind.json';
const SOURCES = Object.freeze([
  REVIEW_DISPOSITION,
  RESTRICTED_BUNDLE,
  SEALED_REBIND,
  'docs/cad-auth-restricted-receipt-review.md',
  'offline/cad-auth-restricted-receipt-review/preparation.js',
  'scripts/cad-auth-restricted-receipt-review-checker.js',
  'scripts/cad-auth-restricted-receipt-review.test.js',
  'scripts/cad-auth-receipt-intake-review-disposition-checker.js',
  'offline/cad-auth-receipt-intake-review-disposition/preparation.js',
  'scripts/cad-auth-restricted-receipt-bundle-checker.js',
  'scripts/cad-auth-sealed-card-custody-rebind-checker.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const reviewDisposition = JSON.parse(readSource(REVIEW_DISPOSITION));
  const restrictedBundle = JSON.parse(readSource(RESTRICTED_BUNDLE));
  const sealedRebind = JSON.parse(readSource(SEALED_REBIND));
  if (!checkDisposition(reviewDisposition, { readSource }).ok) throw Error('INVALID_REVIEW_DISPOSITION_PARENT');
  if (!checkBundle(restrictedBundle, { readSource }).ok) throw Error('INVALID_RESTRICTED_BUNDLE_PARENT');
  if (!checkRebind(sealedRebind, { readSource }).ok) throw Error('INVALID_SEALED_REBIND_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-receipt-review-v1',
    sourceOnly: true,
    status: 'RESTRICTED_RECEIPT_VALUES_UNAVAILABLE_REVIEW_BLOCKED',
    approvedGate: APPROVED_GATE,
    parents: {
      reviewDisposition: {
        packet: reviewDisposition.packet,
        sha256: sha(readSource(REVIEW_DISPOSITION)),
        restrictedValuesReviewed: reviewDisposition.preparation.intakeReviewDisposition.restrictedValuesReviewed,
      },
      restrictedReceiptBundle: {
        packet: restrictedBundle.packet,
        sha256: sha(readSource(RESTRICTED_BUNDLE)),
        restrictedValuesLoaded: restrictedBundle.preparation.restrictedValuesLoaded,
      },
      sealedCardCustodyRebind: {
        packet: sealedRebind.packet,
        sha256: sha(readSource(SEALED_REBIND)),
        executableCommandCardIssued: sealedRebind.preparation.executableCommandCardIssued,
      },
    },
    preparation: disabledRestrictedReceiptReview(),
    futureHumanGate: {
      status: 'PRIVATE_RESTRICTED_RECEIPT_SOURCE_REQUIRED',
      required: true,
      automaticallyPromotable: false,
      approvalReceiptRef: null,
      exactPhrase: null,
      priorApprovalReusableWithoutPrivateSource: false,
      nextStep: 'Supply or authorize one private restricted receipt source; commit only sanitized refs, digests and disposition after independent review.',
      blockedUntilAllEightCategoryRefsPresent: true,
      blockedUntilDigestRecomputationComplete: true,
      blockedUntilCustodyReviewerSeparationAccepted: true,
      blockedUntilRetentionDispositionSettled: true,
      blockedUntilImmutableTargetRechecked: true,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: MAIN_COMMIT,
  };
}

function checkReview(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return {
    ...checkDisabledRestrictedReceiptReview(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_RECEIPT_REVIEW_BLOCKED_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_REVIEW',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_REVIEW'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkReview(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkDisabledRestrictedReceiptReview(null),
      code: 'RESTRICTED_RECEIPT_REVIEW_SOURCE_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkReview };
