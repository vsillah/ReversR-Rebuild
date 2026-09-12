// Synthetic callback expectations only; no PostgreSQL/provider conformance claim.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const digest = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const store = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const grant = { userId: 'synthetic-user', shopId: 'synthetic-shop', loginSessionId: 'synthetic-login',
    authMethod: 'oidc', cadUploadAllowed: true, expiresAt: 9000 };
  const options = { store, now: () => 1000,
    resolveAuthorization: async () => ({ ...grant }),
    refreshAuthorization: async () => ({ ...grant }) };
  return { store, grant, options };
}

test('permission removal with durable revocation requires new issuance after regrant', async () => {
  const f = fixture();
  const service = createUploadSessionService(f.options);
  const old = await service.issueSession({});
  assert.equal(old.ok, true);
  // Models the effect of the proposed admin transaction, not its DB atomicity.
  f.grant.cadUploadAllowed = false;
  assert.equal(await f.store.revoke(digest(old.credential), 1000), true);
  f.grant.cadUploadAllowed = true;
  assert.equal((await service.lookupSession(digest(old.credential))).status, 'revoked');
  const fresh = await service.issueSession({});
  assert.equal(fresh.ok, true);
  assert.notEqual(fresh.sessionId, old.sessionId);
  assert.equal((await service.lookupSession(digest(fresh.credential))).cadUploadAllowed, true);
});

test('refresh must check upload revocation committed after the initial read', async () => {
  const f = fixture();
  const service = createUploadSessionService(f.options);
  const issued = await service.issueSession({});
  assert.equal(issued.ok, true);
  const key = digest(issued.credential);
  let refreshes = 0;
  const raced = createUploadSessionService({ ...f.options,
    store: { ...f.store, read: async (...args) => {
      const stale = await f.store.read(...args);
      await f.store.revoke(key, 1000);
      return stale;
    } },
    refreshAuthorization: async binding => {
      refreshes++;
      assert.equal(binding.sessionId, issued.sessionId);
      assert.equal(binding.loginSessionId, f.grant.loginSessionId);
      const current = await f.store.read(key);
      return current.status === 'active' ? { ...f.grant } : null;
    } });
  assert.equal(await raced.lookupSession(key), null);
  assert.equal(refreshes, 1);
});

test('committed insert with lost acknowledgement returns no token and never retries', async () => {
  const f = fixture();
  let attempts = 0;
  let committedKey;
  const service = createUploadSessionService({ ...f.options,
    store: { ...f.store, insertIfAbsent: async (key, record, options) => {
      attempts++;
      committedKey = key;
      assert.equal(await f.store.insertIfAbsent(key, record, options), true);
      throw new Error('SYNTHETIC_PRIVATE_DRIVER_DIAGNOSTIC');
    } } });
  const result = await service.issueSession({});
  assert.deepEqual(result, { ok: false, code: 'AUTH_UNAVAILABLE' });
  assert.equal(attempts, 1);
  assert.equal((await f.store.read(committedKey)).status, 'active');
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE'), false);
  assert.equal('credential' in result, false);
  // Undelivered committed row is bounded by its original expiry.
  const later = createUploadSessionService({ ...f.options, now: () => 9000 });
  assert.equal((await later.lookupSession(committedKey)).expiresAt, 9000);
});
