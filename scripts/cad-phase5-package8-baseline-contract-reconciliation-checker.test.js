const assert = require('node:assert/strict');
const test = require('node:test');
const {
  check,
} = require('./cad-phase5-package8-baseline-contract-reconciliation-checker');

test('baseline reconciliation evidence remains exact and source-only', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    sourceOnly: true,
    canonicalBaselineReconciled: true,
    crossModuleTests: 3,
    runtimeMounted: false,
    approvalArtifactsIssued: 0,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
  });
});

