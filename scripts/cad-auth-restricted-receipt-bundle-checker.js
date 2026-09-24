// Checks fixed public source only; never opens receipt refs or emits collection commands.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkPreparation } = require('./cad-auth-command-card-source-checker');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { MERGE_COMMIT, disabledBundle, checkDisabledBundle }
  = require('../offline/cad-auth-restricted-receipt-bundle/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-receipt-bundle.json';
const SOURCES = Object.freeze([
  PARENT,
  'docs/cad-auth-restricted-receipt-bundle.md',
  'offline/cad-auth-restricted-receipt-bundle/preparation.js',
  'scripts/cad-auth-restricted-receipt-bundle-checker.js',
  'scripts/cad-auth-restricted-receipt-bundle.test.js',
  'scripts/cad-auth-command-card-source-checker.js',
  'offline/cad-auth-command-card-source/preparation.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkPreparation(parent, { readSource }).ok) throw Error('INVALID_COMMAND_CARD_PARENT');
  return {
    schemaVersion: 1, packet: 'cad-auth-restricted-receipt-bundle-v1', sourceOnly: true,
    status: 'RESTRICTED_RECEIPT_STRUCTURE_ONLY_EXECUTION_BLOCKED',
    parent: { packet: parent.packet, mergeCommit: MERGE_COMMIT,
      sha256: sha(readSource(PARENT)), consumedStopCode: parent.parent.consumedStopCode,
      priorApprovalReusable: false },
    preparation: disabledBundle(),
    futureHumanGate: {
      status: 'RESTRICTED_RECEIPTS_AND_SEPARATE_REVIEW_REQUIRED',
      required: true, automaticallyPromotable: false, approvalReceiptRef: null,
      exactPhrase: null, executableCommandCardIssued: false,
      nextStep: 'Review this source-only structure; separately scope restricted receipt binding and custody before providing any values.',
      receiptReview: 'Require all eight categories with refs, digests, provenance and independent review in a restricted user-owned store outside Git.',
      sourceReview: 'Recheck exact source hashes and immutable target; a source digest is not an installed runtime receipt.',
      subsequentGate: 'A reviewed restricted bundle still needs a separately reviewed sealed card and fresh exact approval before any collection.',
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkBundle(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...checkDisabledBundle(null), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RECEIPT_BUNDLE_VALID' : 'INVALID_SOURCE_ONLY_RECEIPT_BUNDLE',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RECEIPT_BUNDLE'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkBundle(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...checkDisabledBundle(null), code: 'RECEIPT_BUNDLE_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkBundle };
