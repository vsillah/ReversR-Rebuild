const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createSyntheticSessionHandshake, scenarios } = require('./fixtures/cad-session-handshake');
const { CAD_USER_IMPORT_ENABLED, createCadUploadSessionAdapter, prepareCadFileMetadata, parseCadUploadSessionResponse } = require('../utils/cadUserImportBridge');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
for (const [scenario, code] of Object.entries({ success: 'SESSION_READY', revoked: 'USER_SESSION_REQUIRED', error: 'USER_AUTH_UNAVAILABLE', malformed: 'UNKNOWN', timeout: 'UPLOAD_TIMEOUT', cancel: 'UPLOAD_CANCELLED' })) {
  test(`canonical adapter: ${scenario} stays closed without automatic retry`, async () => {
    const harness = createSyntheticSessionHandshake({ scenario, now: () => 1000, timeoutMs: 10 });
    const pending = harness.adapter.connect();
    await Promise.resolve();
    if (scenario === 'cancel') harness.cancel();
    const result = await pending;
    assert.equal(result.code, code); assert.equal(result.ok, scenario === 'success');
    assert.equal(result.canSubmit, false); assert.equal(CAD_USER_IMPORT_ENABLED, false);
    harness.settlePending(); await delay(25);
    assert.equal(result.code, code); assert.equal(harness.calls, 1);
    if (scenario === 'success') assert.equal(result.session.expiresAt, 61000);
  });
}
test('revocation is represented by a canonical error, not a competing session schema', async () => {
  const harness = createSyntheticSessionHandshake({ scenario: 'revoked' });
  assert.equal((await harness.adapter.connect()).code, 'USER_SESSION_REQUIRED');
  assert.equal(harness.calls, 1);
  await harness.adapter.connect(); // An explicit user retry is a new invocation.
  assert.equal(harness.calls, 2);
});
test('unmount and pre-cancel signals settle without late success', async () => {
  const harness = createSyntheticSessionHandshake({ scenario: 'cancel' });
  const controller = new AbortController();
  controller.abort();
  assert.equal((await harness.adapter.connect({ signal: controller.signal })).code, 'UPLOAD_CANCELLED');
  assert.equal(harness.calls, 0);
  const live = new AbortController();
  const pending = harness.adapter.connect({ signal: live.signal });
  await Promise.resolve(); live.abort();
  assert.equal((await pending).code, 'UPLOAD_CANCELLED');
  harness.settlePending(); assert.equal(harness.calls, 1);
});
test('metadata objects with forbidden body access work alongside handshake', async () => {
  let reads = 0;
  const file = { name: 'synthetic.iges', size: 23 };
  for (const key of ['text', 'arrayBuffer', 'stream', 'slice', 'body']) Object.defineProperty(file, key, { get() { reads++; throw Error('Forbidden body read'); } });
  assert.deepEqual(prepareCadFileMetadata(file).metadata, { format: 'IGES', bytes: 23 });
  assert.equal((await createSyntheticSessionHandshake().adapter.connect()).canSubmit, false);
  assert.equal(reads, 0);
});
test('unknown and old duplicate success packets cannot pass the canonical parser', () => {
  for (const packet of [null, [], {}, { schemaVersion: 2, status: 'success' },
    { schemaVersion: 1, status: 'success', code: 'DEVELOPMENT_SESSION_READY', session: { state: 'active', expiresAt: 2000 }, uploadEnabled: false, conversionEnabled: false }]) {
    const result = parseCadUploadSessionResponse(packet, { now: 1000 });
    assert.equal(result.ok, false); assert.equal(result.canSubmit, false);
  }
});
test('shipped app stays unconfigured and the synthetic fixture has no transport or conversion', async () => {
  assert.equal((await createCadUploadSessionAdapter().connect()).code, 'USER_AUTH_UNAVAILABLE');
  for (const root of ['app', 'components']) {
    for (const entry of fs.readdirSync(root, { recursive: true })) {
      const path = `${root}/${entry}`;
      if (!fs.statSync(path).isFile()) continue;
      assert.doesNotMatch(fs.readFileSync(path, 'utf8'), /uploadSessionAdapter\s*=|cad-session-handshake/);
    }
  }
  assert.equal(fs.existsSync('app/session-contract-qa.tsx'), false);
  assert.equal(fs.existsSync('utils/cadUploadSessionAdapter.js'), false);
  assert.doesNotMatch(fs.readFileSync('scripts/fixtures/cad-session-handshake.js', 'utf8'), /fetch\(|XMLHttpRequest|FormData|FileReader|require\(['"].*(?:server|convex|sandbox)/i);
  assert.equal(scenarios.length, 6);
});
