const { createHash, timingSafeEqual } = require('node:crypto');

const COOKIE = '__Host-reversr-upload-session';
const deny = code => ({ ok: false, code });
const digest = value => createHash('sha256').update(value).digest('hex');
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const secret = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

function readCredential(req) {
  const headers = req.headers;
  if (!headers || typeof headers !== 'object') return deny('SESSION_MALFORMED');
  const relevant = new Set(['authorization', 'cookie', 'origin', 'x-upload-csrf']);
  const seen = new Set();
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) return deny('SESSION_MALFORMED');
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (typeof req.rawHeaders[index] !== 'string') return deny('SESSION_MALFORMED');
    const name = req.rawHeaders[index].toLowerCase();
    if (relevant.has(name) && seen.has(name)) return deny('SESSION_MALFORMED');
    seen.add(name);
  }
  for (const name of relevant) {
    if (headers[name] !== undefined
      && (typeof headers[name] !== 'string' || headers[name].length > 8192)) {
      return deny('SESSION_MALFORMED');
    }
  }
  const cookies = (headers.cookie || '').split(';').map(value => value.trim())
    .filter(value => value.split('=')[0].trim() === COOKIE);
  if (cookies.length !== 1 || headers.authorization !== undefined) return deny('SESSION_MALFORMED');
  const token = cookies[0].slice(COOKIE.length + 1);
  if (!token.startsWith('us1.') || !secret(token.slice(4))) return deny('SESSION_MALFORMED');
  return { ok: true, token, origin: headers.origin, csrf: headers['x-upload-csrf'] };
}

function createCadAuthenticatedIgsSessionVerifier({ lookupSession, allowedOrigins = [],
  now = Date.now, lookupTimeoutMs = 5000 } = {}) {
  let origins;
  try {
    if (!Array.isArray(allowedOrigins)) throw new Error();
    origins = new Set(allowedOrigins.map(origin => {
      const url = new URL(origin);
      const localHttp = url.protocol === 'http:'
        && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
      if ((!localHttp && url.protocol !== 'https:') || url.origin !== origin
        || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
      return origin;
    }));
  } catch { origins = null; }

  return async function verify(req) {
    if (typeof lookupSession !== 'function' || typeof now !== 'function' || !origins
      || !Number.isSafeInteger(lookupTimeoutMs) || lookupTimeoutMs < 1 || lookupTimeoutMs > 5000) {
      return deny('AUTH_UNAVAILABLE');
    }
    const credential = readCredential(req);
    if (!credential.ok) return credential;
    if (!origins.has(credential.origin) || !secret(credential.csrf)) {
      return deny('ORIGIN_OR_CSRF_REJECTED');
    }
    let timer;
    const controller = new AbortController();
    try {
      const record = await Promise.race([
        Promise.resolve().then(() => lookupSession(digest(credential.token), {
          signal: controller.signal,
        })),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error()); }, lookupTimeoutMs);
        }),
      ]);
      if (record === null || record === undefined) return deny('SESSION_INVALID');
      if (typeof record !== 'object' || Array.isArray(record)
        || record.schemaVersion !== 1 || !id(record.userId) || !id(record.shopId)
        || !id(record.sessionId) || !['password', 'passkey', 'oidc'].includes(record.authMethod)
        || !['active', 'revoked'].includes(record.status) || !Number.isSafeInteger(record.expiresAt)
        || record.expiresAt <= 0 || record.transport !== 'cookie'
        || typeof record.cadUploadAllowed !== 'boolean') return deny('SESSION_INVALID');
      if (record.status === 'revoked') return deny('SESSION_REVOKED');
      const currentTime = now();
      if (!Number.isSafeInteger(currentTime) || currentTime < 0) return deny('AUTH_UNAVAILABLE');
      if (record.expiresAt <= currentTime) return deny('SESSION_EXPIRED');
      if (!record.cadUploadAllowed) return deny('CAD_PERMISSION_REQUIRED');
      if (typeof record.csrfDigest !== 'string' || !/^[a-f0-9]{64}$/.test(record.csrfDigest)
        || !timingSafeEqual(Buffer.from(digest(credential.csrf), 'hex'),
          Buffer.from(record.csrfDigest, 'hex'))) return deny('ORIGIN_OR_CSRF_REJECTED');
      return { ok: true, principal: Object.freeze({ schemaVersion: 1,
        userId: record.userId, shopId: record.shopId, sessionId: record.sessionId,
        expiresAt: record.expiresAt, authMethod: record.authMethod,
        transport: 'cookie', cadUploadAllowed: true }) };
    } catch { return deny('AUTH_UNAVAILABLE'); }
    finally { clearTimeout(timer); }
  };
}

module.exports = { createCadAuthenticatedIgsSessionVerifier };
