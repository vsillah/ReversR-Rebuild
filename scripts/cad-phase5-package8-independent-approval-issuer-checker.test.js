const assert = require('node:assert/strict');
const test = require('node:test');
const { check } = require('./cad-phase5-package8-independent-approval-issuer-checker');

test('independent approval issuer source closure remains exact and disabled', () => {
  assert.deepEqual(check(), {
    status: 'PASS', sourceOnly: true, operations: 6,
    approvalArtifactsIssued: 0, runtimeMounted: false, automaticRetries: 0,
  });
});
