const assert = require('node:assert/strict');
const test = require('node:test');
const {
  check,
} = require('./cad-phase5-package8-runtime-install-final-checker');

test('final Package 8 runtime install source closure remains exact and disabled', () => {
  const result = check();
  assert.equal(result.status, 'PASS');
  assert.equal(result.sourceOnly, true);
  assert.equal(result.historicalPacketSha256,
    '35695e026e063008a90dcb45a4090542b5dbac0b8e629503f826a2890d446ca7');
  assert.equal(result.runtimeMounted, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(result.retries, 0);
});
