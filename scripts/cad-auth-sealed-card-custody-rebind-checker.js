// Checks public source-only rebind data; never opens restricted receipts or emits a command card.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual, types } = require('node:util');
const { PACKET: HISTORICAL_SEALED_CARD, checkPreparation } = require('./cad-auth-live-evidence-sealed-card-prep-checker');
const { PACKET: RECEIPT_CUSTODY_BINDING, checkBinding } = require('./cad-auth-receipt-custody-binding-checker');
const { SOURCE_MERGE_COMMIT, disabledRebind, checkDisabledRebind }
  = require('../offline/cad-auth-sealed-card-custody-rebind/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-sealed-card-custody-rebind.json';
const SOURCES = Object.freeze([
  HISTORICAL_SEALED_CARD,
  RECEIPT_CUSTODY_BINDING,
  'docs/cad-auth-sealed-card-custody-rebind.md',
  'offline/cad-auth-sealed-card-custody-rebind/preparation.js',
  'scripts/cad-auth-sealed-card-custody-rebind-checker.js',
  'scripts/cad-auth-sealed-card-custody-rebind.test.js',
  'docs/cad-auth-live-evidence-acceptance.json',
  'docs/cad-auth-sealed-setup-stop-runbook.md',
  'scripts/cad-auth-live-evidence-sealed-card-prep-checker.js',
  'scripts/cad-auth-receipt-custody-binding-checker.js',
  'offline/cad-auth-receipt-custody-binding/preparation.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function plainData(value, seen = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || types.isProxy(value) || depth > 32 || seen.has(value)) return false;
  if (![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return false;
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !Object.hasOwn(d, 'value')) return false;
    if (!d.enumerable && !(Array.isArray(value) && key === 'length')) return false;
    if (!plainData(d.value, seen, depth + 1)) return false;
  }
  seen.delete(value);
  return true;
}

function expectedPacket(readSource = read) {
  const historical = JSON.parse(readSource(HISTORICAL_SEALED_CARD));
  if (!checkPreparation(historical, { readSource }).ok) throw Error('INVALID_HISTORICAL_SEALED_CARD');
  const custody = JSON.parse(readSource(RECEIPT_CUSTODY_BINDING));
  if (!checkBinding(custody, { readSource }).ok) throw Error('INVALID_RECEIPT_CUSTODY_PARENT');
  if (custody.futureHumanGate.exactPhrase !== null) throw Error('UNEXPECTED_CUSTODY_PHRASE');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-sealed-card-custody-rebind-v1',
    sourceOnly: true,
    status: 'SEALED_CARD_CUSTODY_REBIND_PREPARED_NON_EXECUTABLE',
    parents: {
      historicalSealedCard: {
        packet: historical.payload.packet,
        sourceSha256: sha(readSource(HISTORICAL_SEALED_CARD)),
        payloadSealSha256: historical.seal.sha256,
        candidateCommit: historical.payload.candidateCommit,
        immutableDeploymentRef: historical.payload.deployment.id,
        startsAtUtc: historical.payload.window.startsAtUtc,
        expiresAtUtc: historical.payload.window.expiresAtUtc,
        futureApprovalPhraseWasActionable: historical.futureApproval.phraseActionableNow,
        reusableForExecution: false,
        reusableReason: 'Historical packet predates the restricted receipt/custody binding and its window is not fresh.',
      },
      receiptCustodyBinding: {
        packet: custody.packet,
        sourceSha256: sha(readSource(RECEIPT_CUSTODY_BINDING)),
        sourceMergeCommit: SOURCE_MERGE_COMMIT,
        status: custody.status,
        restrictedValuesLoaded: custody.preparation.restrictedValuesLoaded,
        exactPhrase: custody.futureHumanGate.exactPhrase,
        executableCommandCardIssued: custody.futureHumanGate.executableCommandCardIssued,
      },
    },
    preparation: disabledRebind(),
    guardrails: {
      executableCommandCardIssued: false,
      exactApprovalPhrasePopulated: false,
      restrictedReceiptRefsPopulated: false,
      restrictedReceiptDigestsPopulated: false,
      immutableDeploymentBoundForFutureRun: false,
      freshCollectionWindowBound: false,
      liveCollectionAuthorized: false,
      priorSealedCardCanBeReused: false,
      previousApprovalCanBeReused: false,
      previousWindowCanBeReused: false,
    },
    requiredBeforeExecutableCardCanBeProposed: [
      'Create or collect no restricted receipt values from this packet.',
      'Review restricted receipt refs and exact SHA-256 digests outside Git.',
      'Verify custodian, preparer, independent reviewer and deletion-owner assignments.',
      'Recompute receipt digests from exact stored bytes and resolve mismatches.',
      'Recheck immutable production deployment target and source digest after this merge.',
      'Bind a fresh UTC collection window and schedule/limits digest.',
      'Generate a new non-executable sealed card packet with null runtime authority first.',
      'Request a separate exact approval phrase only after every receipt and target is reviewed.',
    ],
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkRebind(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    const rootObject = packet !== null && typeof packet === 'object'
      && !Array.isArray(packet) && !types.isProxy(packet);
    ok = rootObject && plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return { ...checkDisabledRebind(null), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_SEALED_CARD_CUSTODY_REBIND_VALID' : 'INVALID_SOURCE_ONLY_SEALED_CARD_CUSTODY_REBIND',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_SEALED_CARD_CUSTODY_REBIND'] };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkRebind(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...checkDisabledRebind(null), code: 'SEALED_CARD_CUSTODY_REBIND_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkRebind };
