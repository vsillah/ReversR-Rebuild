// Fixed public source inspection only. No receipt resolution or collection mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { disabledBinding, checkDisabledBinding } = require('../offline/cad-auth-receipt-custody-binding/preparation');
const { PACKET: PARENT, checkBinding } = require('./cad-auth-receipt-custody-binding-checker');
const { PACKET: HISTORICAL, canonical, checkPreparation } = require('./cad-auth-live-evidence-sealed-card-prep-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-sealed-card-custody-rebind.json';
const MERGE_COMMIT = 'fb36a99bc6e0ba40551766bbb6558c7d044b13d7';
const SOURCES = Object.freeze([PARENT, HISTORICAL,
  'docs/cad-auth-sealed-card-custody-rebind.md',
  'scripts/cad-auth-sealed-card-custody-rebind-checker.js',
  'scripts/cad-auth-sealed-card-custody-rebind.test.js',
  'scripts/cad-auth-receipt-custody-binding-checker.js',
  'offline/cad-auth-receipt-custody-binding/preparation.js',
  'scripts/cad-auth-live-evidence-sealed-card-prep-checker.js']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function closed() {
  return { ...checkDisabledBinding(null), executableCommandCardIssued: false,
    runtimeActivationAuthorized: false, uploadSessionIssuanceEnabled: false,
    productionUploadActivationAuthorized: false, bodyAdmissionAuthorized: false,
    requestBodyReadAuthorized: false, conversionAuthorized: false, sandboxDispatchAuthorized: false,
    liveProviderTestsAuthorized: false, providerChangesAuthorized: false, secretReadsAuthorized: false,
    privateCadAuthorized: false, externalMessagesAuthorized: false, commercialReadinessClaimed: false,
    retryOrSecondRunAuthorized: false, evidenceAccepted: false, authorizedRuns: 0 };
}
function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT));
  const historical = JSON.parse(readSource(HISTORICAL));
  if (!checkBinding(parent, { readSource }).ok || !checkPreparation(historical, { readSource }).ok)
    throw Error('INVALID_SOURCE_PARENT');
  const { ok, code, ...authority } = closed();
  const payload = {
    schemaVersion: 1, packet: 'cad-auth-sealed-card-custody-rebind-v1', sourceOnly: true,
    status: 'CUSTODY_REBOUND_SOURCE_ONLY_EXECUTION_BLOCKED',
    parent: { packet: parent.packet, mergeCommit: MERGE_COMMIT, sha256: sha(readSource(PARENT)),
      consumedStopCode: parent.parent.consumedStopCode, priorApprovalReusable: false },
    historicalPreparation: { packet: historical.payload.packet, sha256: sha(readSource(HISTORICAL)),
      provenanceOnly: true, targetReusable: false, windowReusable: false, approvalPhraseReusable: false },
    preparation: disabledBinding(),
    authority,
    sealedCard: { commandLine: null, dryRunCommandLine: null, candidateCommit: null,
      immutableDeploymentRef: null, startsAtUtc: null, expiresAtUtc: null,
      scheduleReviewReceiptRef: null, limitsReviewReceiptRef: null,
      restrictedBundleReceiptRef: null, restrictedBundleReceiptSha256: null,
      custodyReviewReceiptRef: null, custodyReviewReceiptSha256: null,
      executableCommandCardIssued: false, reviewed: false },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
  return { payload, seal: { algorithm: 'SHA-256', encoding: 'RECURSIVE_SORTED_JSON_UTF8_NO_NEWLINE',
    scope: 'payload only; public source integrity, never an executable command-card seal',
    sha256: sha(canonical(payload)), executable: false },
    futureApproval: { exactPhrase: null, approvalReceiptRef: null, userApproved: false,
      phraseActionableNow: false, automaticallyPromotable: false,
      restrictedValueAuthorityRequired: true, independentReceiptReviewRequired: true,
      immutableTargetRecheckRequired: true, separateSealedCardReviewRequired: true,
      freshExactApprovalRequired: true } };
}
function checkRebind(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...closed(), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_SEALED_CARD_REBIND_VALID' : 'INVALID_SOURCE_ONLY_SEALED_CARD_REBIND' };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkRebind(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...closed(), code: 'SEALED_CARD_REBIND_SOURCE_BLOCKED' }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, MERGE_COMMIT, expectedPacket, checkRebind };
