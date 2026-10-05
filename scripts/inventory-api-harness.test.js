const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { startInventoryApiFixture, token } = require('./fixtures/inventory-api-harness');
const request = async (fixture, route, body, bearer = token, extra = {}) => {
  const response = await fetch(`${fixture.base}${route}`, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(3000),
    headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};
test('synthetic session is exact; anonymous and customer-header spoofing cannot admit work', async t => {
  const fixture = await startInventoryApiFixture({ fixturePort: 3999 }); t.after(fixture.close);
  assert.equal((await request(fixture, '/api/me')).status, 200);
  for (const bearer of ['', 'synthetic-inventory-preflight-session-only-forged']) {
    const result = await request(fixture, '/api/gemini/match-machine', {}, bearer, {
      'x-reversr-client-id': 'synthetic-inventory-owner', 'x-reversr-profile-email': 'owner@synthetic.invalid',
    });
    assert.equal(result.status, 401);
  }
});
test('default and hosted denial remain effective even with the synthetic session adapter', async () => {
  for (const mode of ['default', 'hosted']) {
    const fixture = await startInventoryApiFixture({ fixturePort: 3999, mode });
    try {
      assert.equal((await request(fixture, '/api/me')).status, 503);
      assert.equal((await request(fixture, '/api/gemini/match-machine', {})).status, 503);
      await assert.rejects(fs.stat(fixture.storeFile), { code: 'ENOENT' });
    } finally { await fixture.close(); }
    await assert.rejects(fs.stat(fixture.directory), { code: 'ENOENT' });
  }
});
test('occupied port rejects child startup instead of accepting an unrelated healthy listener', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'reversr-inventory-occupied-'));
  let requests = 0;
  const stale = http.createServer((_req, res) => { requests++; res.end('{"status":"ok"}'); });
  await new Promise(resolve => stale.listen(0, '127.0.0.1', resolve));
  process.env.TMPDIR = directory;
  try {
    await assert.rejects(startInventoryApiFixture({ apiPort: stale.address().port, fixturePort: 3999 }), /EADDRINUSE/);
    assert.equal(requests, 0);
    assert.deepEqual(await fs.readdir(directory), []);
  } finally {
    delete process.env.TMPDIR;
    await new Promise(resolve => stale.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test('stores are isolated, inherited synthetic config is ignored, and custody is removed on close', async () => {
  const poison = await fs.mkdtemp(path.join(os.tmpdir(), 'reversr-inventory-poison-'));
  const sentinel = path.join(poison, 'do-not-load.cjs');
  await fs.writeFile(sentinel, 'throw Error("Inherited startup hook must not run");');
  const untouched = path.join(poison, 'commercial.json');
  await fs.writeFile(untouched, 'synthetic sentinel');
  Object.assign(process.env, { NODE_OPTIONS: `--require=${sentinel}`, COMMERCIAL_STORE_FILE: untouched,
    INVENTORY_CONNECTOR_SECRETS_FILE: path.join(poison, 'missing-secret-file'), COMMERCIAL_BACKEND: 'convex', VERCEL: '1' });
  let a, b;
  try {
    a = await startInventoryApiFixture({ fixturePort: 3999 });
    b = await startInventoryApiFixture({ fixturePort: 3999 });
    assert.notEqual(a.storeFile, b.storeFile);
    const saved = await request(a, '/api/commercial/profile', { profile: { name: 'Synthetic A', shopName: 'Synthetic shop A' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.profile.name, 'Synthetic A');
    const other = await request(b, '/api/me');
    assert.equal(other.status, 200); assert.notEqual(other.body.profile.name, 'Synthetic A');
    assert.equal(await fs.readFile(untouched, 'utf8'), 'synthetic sentinel');
  } finally {
    for (const key of ['NODE_OPTIONS', 'COMMERCIAL_STORE_FILE', 'INVENTORY_CONNECTOR_SECRETS_FILE', 'COMMERCIAL_BACKEND', 'VERCEL']) delete process.env[key];
    if (a) await a.close(); if (b) await b.close();
    await fs.rm(poison, { recursive: true, force: true });
  }
  await assert.rejects(fs.stat(a.directory), { code: 'ENOENT' });
  await assert.rejects(fs.stat(b.directory), { code: 'ENOENT' });
});
