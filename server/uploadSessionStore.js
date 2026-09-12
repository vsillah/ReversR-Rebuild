// Server-only, unmounted foundation. No production auth or store is configured.
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const MAX_LIFETIME_MS = 15 * 60 * 1000;
const hash = value => createHash('sha256').update(value).digest('hex');
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const deny = code => ({ ok: false, code });
const unavailable = () => { throw new Error('AUTH_UNAVAILABLE'); };
const authorization = value => value && id(value.userId) && id(value.shopId)
  && ['password', 'passkey', 'oidc'].includes(value.authMethod)
  && typeof value.cadUploadAllowed === 'boolean' && time(value.expiresAt);

// A deadline limits waiting; durable adapters MUST also honor cancellation before commit.
async function bounded(operation, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timer;
  try {
    if (parentSignal?.aborted) unavailable();
    parentSignal?.addEventListener('abort', abort, { once: true });
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('AUTH_UNAVAILABLE')), { once: true });
        timer = setTimeout(abort, 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

/**
 * store: insertIfAbsent(digest, record, {signal}), read(digest, {signal}),
 * revoke(digest, revokedAt, {signal}). Writes return boolean acknowledgements.
 * resolveAuthorization(context, {signal}) must verify login + user/shop membership.
 * refreshAuthorization(binding, {signal}) must read current login + membership +
 * CAD permission; both return null for denied identity, throw for unavailable.
 * Neither callback has a production implementation in this slice.
 */
function createUploadSessionService({ store, resolveAuthorization, refreshAuthorization, now = Date.now } = {}) {
  const configured = () => store && ['insertIfAbsent', 'read', 'revoke'].every(key => typeof store[key] === 'function')
    && typeof resolveAuthorization === 'function' && typeof refreshAuthorization === 'function' && typeof now === 'function';
  const clock = () => { const value = now(); if (!time(value)) unavailable(); return value; };
  async function issueSession(context, { transport = 'bearer', lifetimeMs = MAX_LIFETIME_MS } = {}) {
    try {
      if (!configured()) return deny('AUTH_UNAVAILABLE');
      if (!['bearer', 'cookie'].includes(transport) || !Number.isSafeInteger(lifetimeMs)
        || lifetimeMs <= 0 || lifetimeMs > MAX_LIFETIME_MS) return deny('ISSUE_INVALID');
      return await bounded(async signal => {
        const grant = await resolveAuthorization(context, { signal });
        if (!authorization(grant)) return deny('AUTHORIZATION_REQUIRED');
        const issuedAt = clock();
        const expiresAt = Math.min(issuedAt + lifetimeMs, grant.expiresAt);
        if (!time(expiresAt) || expiresAt <= issuedAt) return deny('AUTHORIZATION_REQUIRED');
        const credential = `us1.${randomBytes(32).toString('base64url')}`;
        const csrf = transport === 'cookie' ? randomBytes(32).toString('base64url') : undefined;
        const record = Object.freeze({ schemaVersion: 1, userId: grant.userId, shopId: grant.shopId,
          sessionId: randomUUID(), authMethod: grant.authMethod, cadUploadAllowed: grant.cadUploadAllowed,
          transport, issuedAt, expiresAt, status: 'active', ...(csrf ? { csrfDigest: hash(csrf) } : {}) });
        signal.throwIfAborted();
        if (await store.insertIfAbsent(hash(credential), record, { signal }) !== true) unavailable();
        signal.throwIfAborted();
        if (clock() >= expiresAt) return deny('AUTHORIZATION_REQUIRED');
        return { ok: true, credential, ...(csrf ? { csrf } : {}), sessionId: record.sessionId, expiresAt };
      });
    } catch { return deny('AUTH_UNAVAILABLE'); }
  }
  async function lookupSession(key, { signal: parentSignal } = {}) {
    try {
      if (!configured()) unavailable();
      if (!digest(key)) return null;
      return await bounded(async signal => {
        const record = await store.read(key, { signal });
        if (record == null) return null;
        if (!authorization(record) || record.schemaVersion !== 1 || !id(record.sessionId)
          || !['active', 'revoked'].includes(record.status) || !['bearer', 'cookie'].includes(record.transport)
          || !time(record.issuedAt) || record.expiresAt <= record.issuedAt
          || record.expiresAt - record.issuedAt > MAX_LIFETIME_MS
          || (record.transport === 'cookie' && !digest(record.csrfDigest))) unavailable();
        // Whitelist fields: never propagate credentials or arbitrary store metadata.
        const result = { schemaVersion: 1, userId: record.userId, shopId: record.shopId,
          sessionId: record.sessionId, authMethod: record.authMethod, cadUploadAllowed: record.cadUploadAllowed,
          transport: record.transport, expiresAt: record.expiresAt, status: record.status,
          ...(record.transport === 'cookie' ? { csrfDigest: record.csrfDigest } : {}) };
        if (record.issuedAt > clock()) unavailable();
        if (result.status === 'revoked' || result.expiresAt <= clock()) return Object.freeze(result);
        const binding = Object.freeze({ userId: result.userId, shopId: result.shopId,
          sessionId: result.sessionId, authMethod: result.authMethod });
        const grant = await refreshAuthorization(binding, { signal });
        signal.throwIfAborted();
        if (grant == null) return null;
        if (!authorization(grant)) unavailable();
        if (grant.userId !== result.userId || grant.shopId !== result.shopId || grant.authMethod !== result.authMethod) return null;
        result.expiresAt = Math.min(result.expiresAt, grant.expiresAt);
        // A denied issued session never gains permission through refresh.
        result.cadUploadAllowed = result.cadUploadAllowed && grant.cadUploadAllowed;
        return Object.freeze(result);
      }, parentSignal);
    } catch { unavailable(); }
  }
  async function revokeSession(key) {
    try {
      if (!configured()) return deny('AUTH_UNAVAILABLE');
      if (!digest(key)) return deny('SESSION_INVALID');
      return await bounded(async signal => {
        const acknowledged = await store.revoke(key, clock(), { signal });
        signal.throwIfAborted();
        if (typeof acknowledged !== 'boolean') unavailable();
        return acknowledged ? { ok: true } : deny('SESSION_INVALID');
      });
    } catch { return deny('AUTH_UNAVAILABLE'); }
  }
  return Object.freeze({ issueSession, lookupSession, revokeSession });
}

// Opt-in test double, never selected by environment or by the default service.
// Process-local, non-durable; NOT a production adapter or cross-instance store.
function createInMemoryUploadSessionStoreForTests({ testOnly = false } = {}) {
  if (testOnly !== true) throw new Error('TEST_STORE_OPT_IN_REQUIRED');
  const records = new Map();
  const check = (key, signal) => { signal?.throwIfAborted(); if (!digest(key)) unavailable(); };
  return Object.freeze({
    async insertIfAbsent(key, record, { signal } = {}) {
      check(key, signal);
      if (records.has(key)) return false;
      // Only whitelisted fields can be persisted, even when directly called by a test.
      const saved = {};
      for (const field of ['schemaVersion', 'userId', 'shopId', 'sessionId', 'authMethod',
        'cadUploadAllowed', 'transport', 'issuedAt', 'expiresAt', 'status', 'csrfDigest']) {
        if (record[field] !== undefined) {
          if (!['string', 'number', 'boolean'].includes(typeof record[field])) unavailable();
          saved[field] = record[field];
        }
      }
      records.set(key, Object.freeze(saved));
      return true;
    },
    async read(key, { signal } = {}) { check(key, signal); return records.has(key) ? { ...records.get(key) } : null; },
    async revoke(key, revokedAt, { signal } = {}) {
      check(key, signal);
      if (!time(revokedAt)) unavailable();
      const record = records.get(key);
      if (!record) return false;
      if (record.status !== 'revoked') records.set(key, Object.freeze({ ...record, status: 'revoked', revokedAt }));
      return true;
    },
  });
}
const uploadSessionService = createUploadSessionService();
module.exports = { MAX_LIFETIME_MS, createUploadSessionService, createInMemoryUploadSessionStoreForTests, uploadSessionService };
