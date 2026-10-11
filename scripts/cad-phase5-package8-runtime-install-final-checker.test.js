const assert = require('node:assert/strict');
const test = require('node:test');
const {
  check,
} = require('./cad-phase5-package8-runtime-install-final-checker');

test('final Package 8 runtime install source closure remains exact and disabled', () => {
  const result = check();
  assert.equal(result.status, 'PASS');
  assert.equal(result.sourceOnly, true);
  assert.equal(result.runtimeMounted, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.retries, 0);
});
