// Checks fixed public source only; never opens restricted receipt refs or emits commands.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkIntake } = require('./cad-auth-receipt-intake-template-checker');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const {
  SOURCE_MERGE_COMMIT,
  disabledReviewDisposition,
  checkDisabledReviewDisposition,
} = require('../offline/cad-auth-receipt-intake-review-disposition/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-receipt-intake-review-disposition.json';
const SOURCES = Object.freeze([
  PARENT,
  'docs/cad-auth-receipt-intake-review-disposition.md',
  'offline/cad-auth-receipt-intake-review-disposition/preparation.js',
  'scripts/cad-auth-receipt-intake-review-disposition-checker.js',
  'scripts/cad-auth-receipt-intake-review-disposition.test.js',
  'scripts/cad-auth-receipt-intake-template-checker.js',
  'offline/cad-auth-receipt-intake-template/preparation.js',
  'scripts/cad-auth-sealed-card-custody-rebind-checker.js',
  'offline/cad-auth-sealed-card-custody-rebind/preparation.js',
  'scripts/cad-auth-receipt-custody-binding-checker.js',
  'offline/cad-auth-receipt-custody-binding/preparation.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkIntake(parent, { readSource }).ok) throw Error('INVALID_INTAKE_TEMPLATE_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-receipt-intake-review-disposition-v1',
    sourceOnly: true,
    status: 'RECEIPT_INTAKE_REVIEW_DISPOSITION_ONLY_EXECUTION_BLOCKED',
    parent: {
      packet: parent.packet,
      mergeCommit: SOURCE_MERGE_COMMIT,
      sha256: sha(readSource(PARENT)),
      restrictedValuesLoaded: parent.preparation.intake.restrictedValuesLoaded,
      receiptIngestionImplemented: parent.preparation.intake.receiptIngestionImplemented,
      priorApprovalReusable: false,
    },
    preparation: disabledReviewDisposition(),
    futureHumanGate: {
      status: 'RESTRICTED_VALUES_AND_REVIEW_DISPOSITION_REQUIRED',
      required: true,
      automaticallyPromotable: false,
      approvalReceiptRef: null,
      exactPhrase: null,
      executableCommandCardIssued: false,
      nextStep: 'Review only the value-free disposition shape; later restricted receipt review must populate actual refs and digests outside Git.',
      receiptReview: 'Accept or reject every category only after receipt refs, digests, provenance, custody and independent review are bound.',
      sourceReview: 'Recheck source hashes and immutable deployment before any non-executable sealed-card proposal.',
      subsequentGate: 'An accepted disposition can only feed a later non-executable sealed-card proposal, not execution.',
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkDisposition(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return {
    ...checkDisabledReviewDisposition(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RECEIPT_INTAKE_REVIEW_DISPOSITION_VALID'
      : 'INVALID_SOURCE_ONLY_RECEIPT_INTAKE_REVIEW_DISPOSITION',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RECEIPT_INTAKE_REVIEW_DISPOSITION'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkDisposition(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...checkDisabledReviewDisposition(null),
      code: 'RECEIPT_INTAKE_REVIEW_DISPOSITION_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkDisposition };
