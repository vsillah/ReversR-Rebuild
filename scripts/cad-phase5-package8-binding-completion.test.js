const assert = require('node:assert/strict');
const test = require('node:test');
const { check } = require('./cad-phase5-package8-binding-completion-checker');

test('Package 8 binding completion stays blocked and source-only', () => {
  assert.deepEqual(check(), {
    status: 'PASS',
    unavailableBindings: 17,
    activationAuthorized: false,
  });
});
