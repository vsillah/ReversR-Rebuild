// Server-only, unwired transport port. NOT a deployed Convex backend or auth provider.
// The injected call must implement docs/cad-convex-store-design.md in full.
const { MAX_LIFETIME_MS } = require('./uploadSessionStore');
const OPERATION_BUDGET_MS = 800;
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const fields = ['schemaVersion', 'userId', 'shopId', 'sessionId', 'loginSessionId', 'authMethod',
  'cadUploadAllowed', 'transport', 'issuedAt', 'expiresAt', 'status', 'csrfDigest'];

function projectRecord(record) {
  if (!record || record.schemaVersion !== 2
    || !['userId', 'shopId', 'sessionId', 'loginSessionId'].every(key => id(record[key]))
    || !['password', 'passkey', 'oidc'].includes(record.authMethod)
    || typeof record.cadUploadAllowed !== 'boolean'
    || !['bearer', 'cookie'].includes(record.transport)
    || !['active', 'revoked'].includes(record.status)
    || !time(record.issuedAt) || !time(record.expiresAt) || record.expiresAt <= record.issuedAt
    || record.expiresAt - record.issuedAt > MAX_LIFETIME_MS
    || (record.transport === 'cookie' && !digest(record.csrfDigest))) fail();
  const result = {};
  for (const field of fields) {
    if (field === 'csrfDigest' && record.transport !== 'cookie') continue;
    if (record[field] !== undefined) result[field] = record[field];
  }
  return Object.freeze(result);
}

/**
 * call(operation, payload, {signal}) is a trusted server injection, not a URL,
 * an arbitrary Convex function reference, or an end-user claims object.
 * It must not retry uncertain writes or reuse cached positive query results.
 * Abort stops waiting, NOT a remote commit. A backend deadline is also required.
 */
function createConvexUploadSessionStore({ call, now = Date.now } = {}) {
  async function invoke(operation, payload, parentSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timer;
    let onAbort;
    try {
      if (typeof call !== 'function' || typeof now !== 'function' || parentSignal?.aborted) fail();
      const startedAt = now();
      if (!time(startedAt) || !time(startedAt + OPERATION_BUDGET_MS)) fail();
      const deadlineAt = startedAt + OPERATION_BUDGET_MS;
      parentSignal?.addEventListener('abort', abort, { once: true });
      const cancelled = new Promise((_, reject) => {
        onAbort = () => reject(new Error('AUTH_UNAVAILABLE'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(abort, OPERATION_BUDGET_MS);
      });
      const result = await Promise.race([
        Promise.resolve().then(() => {
          controller.signal.throwIfAborted();
          return call(operation, Object.freeze({ ...payload, deadlineAt }), { signal: controller.signal });
        }), cancelled,
      ]);
      const finishedAt = now();
      if (controller.signal.aborted || !time(finishedAt) || finishedAt < startedAt || finishedAt >= deadlineAt) fail();
      return result;
    } catch { fail(); }
    finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
      if (onAbort) controller.signal.removeEventListener('abort', onAbort);
      controller.abort();
    }
  }
  return Object.freeze({
    async insertIfAbsent(key, record, { signal } = {}) {
      try {
        if (!digest(key)) fail();
        const saved = projectRecord(record);
        if (saved.status !== 'active') fail();
        const result = await invoke('insertIfAbsent', { credentialDigest: key, record: saved }, signal);
        if (typeof result !== 'boolean') fail();
        return result;
      } catch { fail(); }
    },
    async read(key, { signal } = {}) {
      try {
        if (!digest(key)) fail();
        const result = await invoke('read', { credentialDigest: key }, signal);
        return result === null ? null : projectRecord(result);
      } catch { fail(); }
    },
    async revoke(key, revokedAt, { signal } = {}) {
      try {
        if (!digest(key) || !time(revokedAt)) fail();
        const result = await invoke('revoke', { credentialDigest: key, revokedAt }, signal);
        if (typeof result !== 'boolean') fail();
        return result;
      } catch { fail(); }
    },
  });
}
module.exports = { OPERATION_BUDGET_MS, createConvexUploadSessionStore };
