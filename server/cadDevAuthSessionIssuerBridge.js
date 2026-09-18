// Source-only composition: deliberately not mounted by server/index.js or api/.
const { createUploadSessionService, MAX_LIFETIME_MS } = require('./uploadSessionStore');
const { createUploadSessionVerifier } = require('./uploadSession');
const COOKIE = '__Host-reversr-upload-session';
const failures = new Set(['SESSION_MISSING', 'SESSION_MALFORMED', 'SESSION_INVALID', 'SESSION_REVOKED', 'SESSION_EXPIRED']);
const error = (code, statusCode = 503) => ({ statusCode, headers: { 'Cache-Control': 'no-store' },
  body: { schemaVersion: 1, status: 'error', code } });

/** Server-owned adapters only. No default provider/store, route, or environment enable switch.
 * resolveAuthorization receives a frozen header-only login context; it MUST verify
 * the exact login session, membership and CAD entitlement, never profile claims.
 * Store cancellation and authorization refresh follow uploadSessionStore.js.
 */
function createCadDevAuthSessionIssuerBridge({ enabled = false, environment, origin,
  store, resolveAuthorization, refreshAuthorization, lifetimeMs = 60000, now = Date.now } = {}) {
  let validOrigin = false;
  try { const url = new URL(origin); validOrigin = url.protocol === 'https:' && url.origin === origin; } catch {}
  const configured = enabled === true && environment === 'development' && validOrigin
    && Number.isSafeInteger(lifetimeMs) && lifetimeMs > 0 && lifetimeMs <= MAX_LIFETIME_MS
    && typeof now === 'function' && typeof resolveAuthorization === 'function'
    && typeof refreshAuthorization === 'function'
    && store && ['insertIfAbsent', 'read', 'revoke'].every(key => typeof store[key] === 'function');
  const allowed = () => configured && process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';
  const service = createUploadSessionService({ store, now, refreshAuthorization,
    async resolveAuthorization(context, options) {
      const grant = await resolveAuthorization(context, options);
      // The shared foundation can represent denied grants; this issuer cannot issue one.
      return grant?.cadUploadAllowed === true ? grant : null;
    } });
  async function lookupSession(key, options) {
    if (!allowed()) throw new Error('AUTH_UNAVAILABLE');
    return service.lookupSession(key, options);
  }
  const verify = createUploadSessionVerifier({ lookupSession, allowedOrigins: validOrigin ? [origin] : [], now });
  return Object.freeze({
    lookupSession,
    async verifySession(req) {
      if (!allowed()) return { ok: false, code: 'AUTH_UNAVAILABLE' };
      return verify(req);
    },
    async issueSession(req) {
      if (!allowed()) return error('USER_AUTH_UNAVAILABLE');
      try {
        if (req.method !== 'POST') return { ...error('METHOD_NOT_ALLOWED', 405),
          headers: { 'Cache-Control': 'no-store', Allow: 'POST' } };
        const headers = req.headers;
        if (!headers || typeof headers !== 'object') return error('USER_SESSION_REQUIRED', 401);
        const keys = ['origin', 'authorization', 'cookie'];
        const seen = new Set();
        if (req.rawHeaders !== undefined) {
          if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) return error('USER_SESSION_REQUIRED', 401);
          for (let i = 0; i < req.rawHeaders.length; i += 2) {
            if (typeof req.rawHeaders[i] !== 'string') return error('USER_SESSION_REQUIRED', 401);
            const key = req.rawHeaders[i].toLowerCase();
            if (keys.includes(key) && seen.has(key)) return error('USER_SESSION_REQUIRED', 401);
            seen.add(key);
          }
        }
        if (keys.some(key => headers[key] !== undefined
          && (typeof headers[key] !== 'string' || headers[key].length > 8192 || /[\r\n]/.test(headers[key])))) {
          return error('USER_SESSION_REQUIRED', 401);
        }
        if (headers.origin !== origin) return error('ORIGIN_OR_CSRF_REJECTED', 403);
        if (!headers.authorization && !headers.cookie) return error('USER_SESSION_REQUIRED', 401);
        // No request body, stream, profile, claimed identity or caller-selected lifetime crosses the boundary.
        const context = Object.freeze({ headers: Object.freeze(Object.fromEntries(
          keys.filter(key => headers[key] !== undefined).map(key => [key, headers[key]]))) });
        const issued = await service.issueSession(context, { transport: 'cookie', lifetimeMs });
        if (!issued.ok) return error(issued.code === 'AUTHORIZATION_REQUIRED' ? 'USER_SESSION_REQUIRED' : 'USER_AUTH_UNAVAILABLE',
          issued.code === 'AUTHORIZATION_REQUIRED' ? 401 : 503);
        const current = now();
        if (!allowed() || !Number.isSafeInteger(current) || current < 0 || current >= issued.expiresAt) return error('USER_AUTH_UNAVAILABLE');
        const checked = await verify({ headers: { cookie: `${COOKIE}=${issued.credential}`, origin, 'x-upload-csrf': issued.csrf } });
        if (!checked.ok) return error(failures.has(checked.code) ? 'USER_SESSION_REQUIRED' : 'USER_AUTH_UNAVAILABLE', failures.has(checked.code) ? 401 : 503);
        const finishedAt = now();
        if (!allowed() || !Number.isSafeInteger(finishedAt) || finishedAt < current
          || checked.principal.expiresAt - finishedAt < 1000) return error('USER_AUTH_UNAVAILABLE');
        return { statusCode: 200, headers: { 'Cache-Control': 'no-store',
          'Set-Cookie': `${COOKIE}=${issued.credential}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.floor((checked.principal.expiresAt - finishedAt) / 1000)}` },
        body: { schemaVersion: 1, status: 'success', session: {
          transport: 'cookie', expiresAt: checked.principal.expiresAt, csrfToken: issued.csrf } } };
      } catch { return error('USER_AUTH_UNAVAILABLE'); }
    },
  });
}
module.exports = { createCadDevAuthSessionIssuerBridge };
