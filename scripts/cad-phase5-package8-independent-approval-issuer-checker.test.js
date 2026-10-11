const assert = require('node:assert/strict');
const test = require('node:test');
const { check } = require('./cad-phase5-package8-independent-approval-issuer-checker');

test('source-separated approval issuer closure remains exact and runtime-custody unbound', () => {
  assert.deepEqual(check(), {
    status: 'PASS', sourceOnly: true, operations: 6,
    approvalArtifactsIssued: 0, runtimeMounted: false,
    sourceOwnershipSeparated: true, independentRuntimeIssuerCustodyBound: false,
    applicationRetries: 0, transportRetries: 0, providerRetries: 0,
    platformOccReexecutionPossible: true, atMostOneCommittedTransition: true,
  });
});
