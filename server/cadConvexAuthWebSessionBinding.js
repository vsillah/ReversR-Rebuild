// Source-only web binding. No route, environment selector, provider client or
// default instance imports this module. Issuance stays unrouted.
const { createUploadSessionService, MAX_LIFETIME_MS } = require('./uploadSessionStore');
const { CONVEX_AUTHORITY_MODEL } = require('./convexUploadSessionStore');

const UPLOAD_COOKIE = '__Host-reversr-upload-session';
const WEB_SESSION_LIFETIME_MS = 15 * 60 * 1000;
const AUTH_METHODS = new Set(['password', 'passkey', 'oidc']);
const ISSUE_KEYS = new Set(['shopId']);
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const deny = code => Object.freeze({ ok: false, code });
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const generation = value => Number.isSafeInteger(value) && value > 0;
const time = value => Number.isSafeInteger(value) && value >= 0;

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.has(key))) fail();
}

function normalizeOrigins(origins) {
  if (!Array.isArray(origins) || origins.length === 0) return null;
  const result = [];
  for (const raw of origins) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/'
        || url.search || url.hash || url.origin !== raw || result.includes(raw)) return null;
      result.push(raw);
    } catch { return null; }
  }
  return Object.freeze(result);
}

function snapshotWebLoginHeaders(request, allowedOrigins) {
  const headers = request?.headers;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) fail();
  const origin = headers.origin;
  const cookie = headers.cookie;
  if (typeof origin !== 'string' || !allowedOrigins.includes(origin)
    || typeof cookie !== 'string' || cookie.length < 1 || cookie.length > 8192
    || /[\r\n]/.test(cookie) || headers.authorization !== undefined) fail();
  if (request.rawHeaders !== undefined) {
    if (!Array.isArray(request.rawHeaders) || request.rawHeaders.length % 2) fail();
    let cookieCount = 0;
    let originCount = 0;
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      const key = request.rawHeaders[index];
      const value = request.rawHeaders[index + 1];
      if (typeof key !== 'string' || typeof value !== 'string') fail();
      if (key.toLowerCase() === 'authorization') fail();
      if (key.toLowerCase() === 'cookie') {
        cookieCount += 1;
        if (value !== cookie) fail();
      }
      if (key.toLowerCase() === 'origin') {
        originCount += 1;
        if (value !== origin) fail();
      }
    }
    if (cookieCount !== 1 || originCount !== 1) fail();
  }
  return Object.freeze({ cookie, origin });
}

function projectLogin(value, expectedLoginSessionId, now) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !id(value.userId) || !id(value.loginSessionId) || !AUTH_METHODS.has(value.authMethod)
    || typeof value.active !== 'boolean' || !time(value.expiresAt)) fail();
  if (!value.active) return null;
  if (expectedLoginSessionId && value.loginSessionId !== expectedLoginSessionId) return null;
  if (value.expiresAt <= now) return null;
  return Object.freeze({ userId: value.userId, loginSessionId: value.loginSessionId,
    authMethod: value.authMethod, expiresAt: value.expiresAt });
}

function projectAuthorization(value, login, shopId, now) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.userId !== login.userId || value.loginSessionId !== login.loginSessionId
    || value.shopId !== shopId || typeof value.userEnabled !== 'boolean'
    || typeof value.membershipActive !== 'boolean'
    || typeof value.cadUploadAllowed !== 'boolean' || !generation(value.userGeneration)
    || !generation(value.membershipGeneration) || !time(value.expiresAt)) fail();
  const expiresAt = Math.min(login.expiresAt, value.expiresAt);
  if (expiresAt <= now || !value.userEnabled || !value.membershipActive
    || !value.cadUploadAllowed) return null;
  return Object.freeze({ userId: login.userId, loginSessionId: login.loginSessionId,
    shopId, authMethod: login.authMethod, cadUploadAllowed: true, expiresAt,
    userGeneration: value.userGeneration, membershipGeneration: value.membershipGeneration });
}

function cookieHeader(credential, expiresAt, now) {
  const maxAge = Math.max(0, Math.floor((expiresAt - now) / 1000));
  return `${UPLOAD_COOKIE}=${credential}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

const clearCookieHeader = () => `${UPLOAD_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;

function createCadConvexAuthWebSessionBinding({
  enabled = false,
  request,
  allowedOrigins = [],
  store,
  readCurrentConvexAuthSession,
  readConvexAuthSessionById,
  readCadAuthorization,
  now = Date.now,
} = {}) {
  const origins = normalizeOrigins(allowedOrigins);
  const dependenciesReady = enabled === true && origins
    && store?.authorityModel === CONVEX_AUTHORITY_MODEL
    && ['insertIfAbsent', 'read', 'revoke'].every(name => typeof store[name] === 'function')
    && typeof readCurrentConvexAuthSession === 'function'
    && typeof readConvexAuthSessionById === 'function'
    && typeof readCadAuthorization === 'function' && typeof now === 'function';
  let loginHeaders = null;
  if (dependenciesReady) {
    try { loginHeaders = snapshotWebLoginHeaders(request, origins); } catch { /* Closed below. */ }
  }
  const reviewConfigured = Boolean(dependenciesReady && loginHeaders);

  async function readGrant(login, shopId, signal) {
    signal?.throwIfAborted?.();
    const startedAt = now();
    if (!time(startedAt)) fail();
    const raw = await readCadAuthorization(Object.freeze({ userId: login.userId,
      loginSessionId: login.loginSessionId, shopId }), { signal });
    signal?.throwIfAborted?.();
    const finishedAt = now();
    if (!time(finishedAt) || finishedAt < startedAt) fail();
    return projectAuthorization(raw, login, shopId, finishedAt);
  }

  const service = createUploadSessionService({
    store: reviewConfigured ? store : null,
    now,
    async resolveAuthorization(context, { signal } = {}) {
      if (!reviewConfigured) return null;
      exactObject(context, ISSUE_KEYS);
      if (!id(context.shopId)) fail();
      signal?.throwIfAborted?.();
      const startedAt = now();
      if (!time(startedAt)) fail();
      const rawLogin = await readCurrentConvexAuthSession(loginHeaders, { signal });
      signal?.throwIfAborted?.();
      const checkedAt = now();
      if (!time(checkedAt) || checkedAt < startedAt) fail();
      const login = projectLogin(rawLogin, null, checkedAt);
      return login ? readGrant(login, context.shopId, signal) : null;
    },
    async refreshAuthorization(binding, { signal } = {}) {
      if (!reviewConfigured) return null;
      signal?.throwIfAborted?.();
      const startedAt = now();
      if (!time(startedAt)) fail();
      const rawLogin = await readConvexAuthSessionById(binding.loginSessionId, { signal });
      signal?.throwIfAborted?.();
      const checkedAt = now();
      if (!time(checkedAt) || checkedAt < startedAt) fail();
      const login = projectLogin(rawLogin, binding.loginSessionId, checkedAt);
      if (!login || login.userId !== binding.userId || login.authMethod !== binding.authMethod) return null;
      return readGrant(login, binding.shopId, signal);
    },
  });
  let issued = false;

  async function lookupActiveSession(key, options) {
    const record = await service.lookupSession(key, options);
    if (!record || record.status !== 'active') return null;
    const checkedAt = now();
    if (!time(checkedAt) || record.expiresAt <= checkedAt) return null;
    return record;
  }

  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    issuanceRouted: false,
    transport: 'cookie',
    lifetimeMs: WEB_SESSION_LIFETIME_MS,
    cookieName: UPLOAD_COOKIE,
    clearCookieHeader: clearCookieHeader(),
    async issueCookieSession(context, { signal } = {}) {
      if (!reviewConfigured) return deny('AUTH_UNAVAILABLE');
      if (issued) return deny('ISSUE_ALREADY_ATTEMPTED');
      issued = true;
      const result = await service.issueSession(context, { transport: 'cookie',
        lifetimeMs: WEB_SESSION_LIFETIME_MS, signal });
      if (!result.ok) return deny(result.code);
      const checkedAt = now();
      if (!time(checkedAt) || result.expiresAt <= checkedAt) return deny('AUTH_UNAVAILABLE');
      return Object.freeze({ ok: true, code: 'COOKIE_SESSION_PREPARED',
        setCookie: cookieHeader(result.credential, result.expiresAt, checkedAt),
        csrfToken: result.csrf, expiresAt: result.expiresAt });
    },
    lookupSession: lookupActiveSession,
    revokeSession: service.revokeSession,
  });
}

module.exports = {
  UPLOAD_COOKIE,
  WEB_SESSION_LIFETIME_MS,
  createCadConvexAuthWebSessionBinding,
};
