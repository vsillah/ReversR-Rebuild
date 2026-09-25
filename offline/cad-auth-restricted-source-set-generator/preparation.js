// Source-only generator contract. No receipt reads, source-dir scans or execution.
const { isDeepStrictEqual } = require('node:util');
const { REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS } = require('../cad-auth-live-collector-binding/guardedCollector');
const { RECEIPT_FIELDS, plainData } = require('../cad-auth-command-card-source/preparation');
const { sourceSetContract } = require('../cad-auth-restricted-source-set-contract/preparation');

function expectedReceiptFiles() {
  return Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
    category,
    `${category}.json`,
  ]));
}

function generatorContract() {
  return {
    schemaVersion: 1,
    contract: 'cad-auth-restricted-source-set-generator-v1',
    sourceOnly: true,
    purpose: 'Generate a local ignored sanitized source-set projection from an explicit private receipt folder.',
    parentContract: sourceSetContract().contract,
    privateReadPolicy: {
      namedSourceDirRequired: true,
      automaticSearchOrDirectoryDiscoveryAllowed: false,
      expectedReceiptFiles: expectedReceiptFiles(),
      recursiveReadAllowed: false,
      symlinkReadAllowed: false,
      privateValuesMayBeCommitted: false,
      topLevelKeysMayBeCommitted: false,
      localPathsMayBeCommitted: false,
    },
    projectionPolicy: {
      outputRootRef: '.local/cad-auth-restricted-source-sets',
      outputFileName: 'restricted-source-set.json',
      committedProjectionAllowed: false,
      allowedPublicFields: {
        opaqueReceiptRef: true,
        receiptSha256: 'lowercase-hex-64',
        byteLength: 'positive-integer',
        requiredFieldPresence: true,
        categoryCoverageDisposition: true,
      },
      digestAlgorithm: 'SHA-256',
      digestByteScope: 'exact receipt file bytes',
    },
    requiredCategories: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(category => [
      category,
      { requiredFields: Object.fromEntries(RECEIPT_FIELDS[category].map(field => [field, true])) },
    ])),
    stopConditions: {
      missingCategoryFile: true,
      malformedJson: true,
      missingRequiredField: true,
      outputOutsideIgnoredSourceSetRoot: true,
      placeholderPromotionAttempt: true,
    },
    controls: {
      executable: false,
      executableCommandCardIssued: false,
      liveCollectorCommandLine: null,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      bodyAdmissionAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      requestBodyAdmissionRead: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      retryOrSecondRunAuthorized: false,
      commercialReadinessClaimed: false,
      authorizedRuns: 0,
      ...ZERO_ACTIONS,
    },
  };
}

function checkGeneratorContract(input) {
  let ok = false;
  try { ok = plainData(input) && isDeepStrictEqual(input, generatorContract()); } catch { /* sanitized */ }
  return {
    ok,
    executable: false,
    executableCommandCardIssued: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    requestBodyAdmissionRead: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    retryOrSecondRunAuthorized: false,
    commercialReadinessClaimed: false,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_SOURCE_SET_GENERATOR_CONTRACT_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_SOURCE_SET_GENERATOR_CONTRACT',
  };
}

module.exports = { generatorContract, checkGeneratorContract, expectedReceiptFiles };
