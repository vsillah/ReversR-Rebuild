const test = require('node:test');
const assert = require('node:assert/strict');
const { createFixture, initialize } = require('./helpers/cad-durable-engine-fixture');

test('a mid-initialize store failure aborts the whole transaction without partial rows', async () => {
  const fixture = createFixture({ failAuthorityInsertAt: 3 });
  await assert.rejects(fixture.invoke('initialize', initialize()), /^Error: ENGINE_ABORT$/);
  assert.deepEqual(fixture.snapshot(), { ledgers: [], authority: [] });
});
