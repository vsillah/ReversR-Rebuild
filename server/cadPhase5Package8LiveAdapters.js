// Source-only Package 8 adapter composition. No reviewed live activation gate
// exists in this source, so production bindings can never be accepted here.
// The only composable path is explicitly marked offline synthetic test input.
const { REQUIRED_DURABLE_OPERATIONS }
  = require('./cadPhase5Package8SourceBridges');

const BINDING = Object.freeze({
  mergedMainCommit: '24ec45362517d60237f6f3e186e5048f49177cf5',
  productionEvidenceDeploymentId: 'dpl_99Gfdd69ZTCGKYpbFgLDzMiwQGd9',
  rebindPacketSha256: '1a726b14bed6f3c771b6df58126e9a9ae81d1b726776720e51bd0456f6126e1d',
  reconciliationPacketSha256:
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c',
  sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
});
const OFFLINE_REVIEW_GATE = Object.freeze({
  schemaVersion: 1,
  mode: 'OFFLINE_SYNTHETIC_TEST_ONLY',
  ...BINDING,
  liveBindingsSupplied: false,
  providerDispatchAuthorized: false,
  runtimeActivationAuthorized: false,
});
const deny = code => Object.freeze({ ok: false, accepted: false, code,
  sourceOnly: true, providerDispatchEnabled: false, runtimeActivationAllowed: false });
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const offlinePort = (value, methods) => Boolean(value?.offlineSynthetic === true
  && methods.every(method => typeof value[method] === 'function'));
const bind = (target, method) => target[method].bind(target);

function disabledPorts() {
  const call = async () => deny('PACKAGE8_LIVE_BINDING_NOT_REVIEWED');
  return Object.freeze({
    authority: Object.freeze({ offlineSynthetic: false, verifyExact: call }),
    intentLedger: Object.freeze({ offlineSynthetic: false, consumeOnce: call }),
    durable: Object.freeze({ offlineSynthetic: false, operations: Object.freeze([]), call }),
    custody: Object.freeze({ offlineSynthetic: false, reserveArtifact: call,
      commitArtifact: call, issueDownloadGrant: call, deleteArtifact: call }),
    sandbox: Object.freeze({ offlineSynthetic: false, convert: call,
      cleanupStatus: () => Object.freeze({ stopped: false, cleanupConfirmed: false,
        outcomeUnknown: true }) }),
    sessionRevoker: Object.freeze({ offlineSynthetic: false, revokeExact: call }),
    fixtureReader: Object.freeze({ offlineSynthetic: false, readExact: call }),
    lifecycleMetadata: Object.freeze({ offlineSynthetic: false, readSanitized: call }),
  });
}

function createCadPhase5Package8LiveAdapters({
  testOnly = false,
  activationGate,
  authority,
  intentLedger,
  durable,
  custody,
  sandbox,
  sessionRevoker,
  fixtureReader,
  lifecycleMetadata,
} = {}) {
  const offlineReviewConfigured = testOnly === true && same(activationGate, OFFLINE_REVIEW_GATE)
    && durable?.offlineSynthetic === true && typeof durable.call === 'function'
    && REQUIRED_DURABLE_OPERATIONS.every(operation => durable.operations?.includes(operation))
    && offlinePort(authority, ['verifyExact']) && offlinePort(intentLedger, ['consumeOnce'])
    && offlinePort(custody, ['reserveArtifact', 'commitArtifact', 'issueDownloadGrant',
      'deleteArtifact']) && offlinePort(sandbox, ['convert', 'cleanupStatus'])
    && offlinePort(sessionRevoker, ['revokeExact'])
    && offlinePort(fixtureReader, ['readExact'])
    && offlinePort(lifecycleMetadata, ['readSanitized']);
  const ports = offlineReviewConfigured ? Object.freeze({
    authority: Object.freeze({ offlineSynthetic: true,
      verifyExact: bind(authority, 'verifyExact') }),
    intentLedger: Object.freeze({ offlineSynthetic: true,
      consumeOnce: bind(intentLedger, 'consumeOnce') }),
    durable: Object.freeze({ offlineSynthetic: true,
      operations: Object.freeze([...REQUIRED_DURABLE_OPERATIONS]),
      call: bind(durable, 'call') }),
    custody: Object.freeze({ offlineSynthetic: true,
      reserveArtifact: bind(custody, 'reserveArtifact'),
      commitArtifact: bind(custody, 'commitArtifact'),
      issueDownloadGrant: bind(custody, 'issueDownloadGrant'),
      deleteArtifact: bind(custody, 'deleteArtifact') }),
    sandbox: Object.freeze({ offlineSynthetic: true,
      convert: bind(sandbox, 'convert'), cleanupStatus: bind(sandbox, 'cleanupStatus') }),
    sessionRevoker: Object.freeze({ offlineSynthetic: true,
      revokeExact: bind(sessionRevoker, 'revokeExact') }),
    fixtureReader: Object.freeze({ offlineSynthetic: true,
      readExact: bind(fixtureReader, 'readExact') }),
    lifecycleMetadata: Object.freeze({ offlineSynthetic: true,
      readSanitized: bind(lifecycleMetadata, 'readSanitized') }),
  }) : disabledPorts();
  return Object.freeze({
    sourceOnly: true,
    developmentOnly: true,
    configured: false,
    reviewConfigured: offlineReviewConfigured,
    liveBindingsAccepted: false,
    liveActivationGateReviewed: false,
    mounted: false,
    routeMounted: false,
    providerDispatchEnabled: false,
    storageDispatchEnabled: false,
    conversionDispatchEnabled: false,
    downloadDispatchEnabled: false,
    runtimeActivationAllowed: false,
    productionBehaviorChanged: false,
    binding: BINDING,
    ports,
  });
}

module.exports = {
  BINDING,
  OFFLINE_REVIEW_GATE,
  createCadPhase5Package8LiveAdapters,
};
