const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/cad-convex-source-loader');
const { FUNCTIONS } = require('../offline/cad-convex/durableEngineAdapter');

test('durable source registers only the fixed internal function map', async () => {
  const { durable } = loadSource();
  assert.deepEqual(Object.keys(durable).sort(), Object.keys(FUNCTIONS).sort());
  for (const [operation, definition] of Object.entries(FUNCTIONS))
    assert.equal(durable[operation].kind, definition.kind);
  await assert.rejects(durable.readExact.invoke({}, { selector: {}, deadlineAt: 1 }));
  await assert.rejects(durable.initialize.invoke({}, { scope: {}, deadlineAt: 1 }));
});

test('durable schema uses exact scope and authority indexes', () => {
  const { schema } = loadSource();
  assert.equal(JSON.stringify(schema.cadQualificationLedgers.indexes), JSON.stringify(
    { by_resource_namespace_run_ledger_window_fence: ['resourceBindingDigest', 'namespaceDigest',
      'runDigest', 'ledgerDigest', 'windowDigest', 'fenceDigest'] }));
  assert.equal(JSON.stringify(schema.cadQualificationAuthority.indexes), JSON.stringify(
    { by_ledger_binding_kind: ['ledgerId', 'userId', 'shopId', 'sessionId', 'loginSessionId', 'kind'] }));
  assert.equal(schema.cadQualificationAuthority.fields.ledgerId.table, 'cadQualificationLedgers');
});
