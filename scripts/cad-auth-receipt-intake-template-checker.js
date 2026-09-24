// Checks fixed public source only; never opens receipt refs or emits collection commands.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: PARENT, checkRebind } = require('./cad-auth-sealed-card-custody-rebind-checker');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { SOURCE_MERGE_COMMIT, disabledIntake, checkDisabledIntake }
  = require('../offline/cad-auth-receipt-intake-template/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-receipt-intake-template.json';
const SOURCES = Object.freeze([
  PARENT,
  'docs/cad-auth-receipt-intake-template.md',
  'offline/cad-auth-receipt-intake-template/preparation.js',
  'scripts/cad-auth-receipt-intake-template-checker.js',
  'scripts/cad-auth-receipt-intake-template.test.js',
  'scripts/cad-auth-sealed-card-custody-rebind-checker.js',
  'offline/cad-auth-sealed-card-custody-rebind/preparation.js',
  'scripts/cad-auth-receipt-custody-binding-checker.js',
  'offline/cad-auth-receipt-custody-binding/preparation.js',
  'scripts/cad-auth-restricted-receipt-bundle-checker.js',
  'offline/cad-auth-restricted-receipt-bundle/preparation.js',
  'scripts/cad-auth-command-card-source-checker.js',
  'offline/cad-auth-command-card-source/preparation.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  if (!checkRebind(parent, { readSource }).ok) throw Error('INVALID_CUSTODY_REBIND_PARENT');
  return {
    schemaVersion: 1, packet: 'cad-auth-receipt-intake-template-v1', sourceOnly: true,
    status: 'RECEIPT_INTAKE_TEMPLATE_ONLY_EXECUTION_BLOCKED',
    parent: { packet: parent.packet, mergeCommit: SOURCE_MERGE_COMMIT,
      sha256: sha(readSource(PARENT)), historicalCardReusable: false,
      priorApprovalReusable: false },
    preparation: disabledIntake(),
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
function checkIntake(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...checkDisabledIntake(null), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RECEIPT_INTAKE_TEMPLATE_VALID' : 'INVALID_SOURCE_ONLY_RECEIPT_INTAKE_TEMPLATE',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RECEIPT_INTAKE_TEMPLATE'] };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkIntake(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...checkDisabledIntake(null), code: 'RECEIPT_INTAKE_TEMPLATE_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkIntake };
