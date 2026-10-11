const assert = require('node:assert/strict');
const test = require('node:test');
const {
  check,
} = require('./cad-phase5-package8-runtime-issuer-authority-verifier-checker');

test('runtime issuer-authority verifier closure remains source-only and disabled', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    sourceOnly: true,
    operations: 1,
    focusedSyntheticTests: 8,
    runtimeMounted: false,
    approvalArtifactsIssued: 0,
    applicationRetries: 0,
    transportRetries: 0,
    providerRetries: 0,
  });
});
