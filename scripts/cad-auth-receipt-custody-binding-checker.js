// Checks fixed public source only; never opens receipt refs or emits collection commands.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkBundle } = require('./cad-auth-restricted-receipt-bundle-checker');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { MERGE_COMMIT, disabledBinding, checkDisabledBinding }
  = require('../offline/cad-auth-receipt-custody-binding/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-receipt-custody-binding.json';
const SOURCES = Object.freeze([
  PARENT,
  'docs/cad-auth-receipt-custody-binding.md',
  'offline/cad-auth-receipt-custody-binding/preparation.js',
  'scripts/cad-auth-receipt-custody-binding-checker.js',
  'scripts/cad-auth-receipt-custody-binding.test.js',
  'scripts/cad-auth-restricted-receipt-bundle-checker.js',
  'offline/cad-auth-restricted-receipt-bundle/preparation.js',
  'scripts/cad-auth-command-card-source-checker.js',
  'offline/cad-auth-command-card-source/preparation.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkBundle(parent, { readSource }).ok) throw Error('INVALID_RECEIPT_BUNDLE_PARENT');
  return {
    schemaVersion: 1, packet: 'cad-auth-receipt-custody-binding-v1', sourceOnly: true,
    status: 'CUSTODY_BINDING_REQUIREMENTS_ONLY_EXECUTION_BLOCKED',
    parent: { packet: parent.packet, mergeCommit: MERGE_COMMIT,
      sha256: sha(readSource(PARENT)), consumedStopCode: parent.parent.consumedStopCode,
      priorApprovalReusable: false },
    preparation: disabledBinding(),
    futureHumanGate: {
      status: 'RESTRICTED_RECEIPTS_AND_SEPARATE_REVIEW_REQUIRED',
      required: true, automaticallyPromotable: false, approvalReceiptRef: null,
      exactPhrase: null, executableCommandCardIssued: false,
      nextStep: 'Review only these requirements and empty slots. Separate restricted-value authority is required before any creation, collection, installation or use.',
      receiptReview: 'Require all eight categories with refs, digests, provenance and independent review in a restricted user-owned store outside Git.',
      sourceReview: 'Recheck exact source hashes and immutable target; a source digest is not an installed runtime receipt.',
      subsequentGate: 'A reviewed restricted bundle still needs a separately reviewed sealed card and fresh exact approval before any collection.',
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkBinding(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...checkDisabledBinding(null), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_CUSTODY_BINDING_VALID' : 'INVALID_SOURCE_ONLY_CUSTODY_BINDING',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_CUSTODY_BINDING'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkBinding(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...checkDisabledBinding(null), code: 'CUSTODY_BINDING_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkBinding };
