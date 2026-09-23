// Source-review adapter only. Never mounted or selected from environment.
const { createCadExactSessionBridge, INTERNAL_MARK_TEST_COHORT } = require('./cadExactSessionBridge');
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;

// Login credentials stay in this request-local closure and never enter the
// gateway envelope. Bearer-only source contract; cookies require a separate review.
function snapshotLoginHeaders(request) {
  const headers = request?.headers;
  if (!headers || headers.cookie !== undefined) fail();
  const authorization = headers.authorization;
  if (typeof authorization !== 'string' || authorization.length > 8192
    || !/^Bearer [A-Za-z0-9._~-]+$/.test(authorization)) fail();
  if (request.rawHeaders !== undefined) {
    if (!Array.isArray(request.rawHeaders) || request.rawHeaders.length % 2) fail();
    let count = 0;
    for (let i = 0; i < request.rawHeaders.length; i += 2) {
      if (typeof request.rawHeaders[i] !== 'string') fail();
      const key = request.rawHeaders[i].toLowerCase();
      if (key === 'cookie') fail();
      if (key === 'authorization') {
        if (++count > 1 || request.rawHeaders[i + 1] !== authorization) fail();
      }
    }
    if (count !== 1) fail();
  }
  return Object.freeze({ authorization });
}

/**
 * Trusted server dependencies, never request fields:
 * readAuthenticatedSession must cryptographically verify the login token and
 * freshly read its exact live session/owner in the authenticated user context.
 * readAuthorization must freshly read membership and CAD permission for that
 * identity. It cannot infer permission from JWT/profile/client claims.
 * No production implementation is accepted or wired by this source slice.
 */
function createCadProductionSessionVerifierBinding({
  reviewEnabled = false, request, readAuthenticatedSession, readAuthorization, now = Date.now,
} = {}) {
  const reviewConfigured = reviewEnabled === true && typeof readAuthenticatedSession === 'function'
    && typeof readAuthorization === 'function' && typeof now === 'function';
  let headers;
  if (reviewConfigured) {
    try { headers = snapshotLoginHeaders(request); } catch { /* Fail closed without exposing credentials. */ }
  }
  const bridge = createCadExactSessionBridge({
    enabled: reviewConfigured && Boolean(headers),
    now,
    async verifyExactSession(message, options) {
      try {
        options.signal?.throwIfAborted?.();
        const startedAt = now();
        if (!time(startedAt)) fail();
        // Re-read on every resolve/refresh; never reuse a cached principal.
        const session = await readAuthenticatedSession(headers, options);
        options.signal?.throwIfAborted?.();
        if (session == null) return null;
        if (!id(session.userId) || !id(session.loginSessionId)
          || !['password', 'passkey', 'oidc'].includes(session.authMethod)
          || !time(session.expiresAt) || session.active !== true) fail();
        if (session.expiresAt <= startedAt) return null;
        const identity = Object.freeze({ userId: session.userId, loginSessionId: session.loginSessionId,
          authMethod: session.authMethod });
        const context = message.purpose === 'issue' ? message.issueContext : message.binding;
        // loginSessionRef has no accepted production mapping. Reject it instead
        // of silently treating an opaque caller reference as session authority.
        if (message.purpose === 'issue' && context.loginSessionRef !== undefined) fail();
        if (message.purpose === 'refresh' && ['userId', 'loginSessionId', 'authMethod']
          .some(key => context[key] !== identity[key])) return null;
        const grant = await readAuthorization(Object.freeze({ ...identity,
          shopId: context.shopId, cohort: INTERNAL_MARK_TEST_COHORT }), options);
        options.signal?.throwIfAborted?.();
        if (grant == null) return null;
        if (['userId', 'loginSessionId', 'authMethod'].some(key => grant[key] !== identity[key])
          || grant.shopId !== context.shopId) return null;
        const finishedAt = now();
        if (!time(finishedAt) || finishedAt < startedAt || !time(grant.expiresAt)
          || typeof grant.cadUploadAllowed !== 'boolean') fail();
        const expiresAt = Math.min(session.expiresAt, grant.expiresAt);
        if (expiresAt <= finishedAt) return null;
        return Object.freeze({ ...identity, shopId: context.shopId,
          cadUploadAllowed: grant.cadUploadAllowed, expiresAt });
      } catch { fail(); }
    },
  });
  return Object.freeze({
    sourceOnly: true,
    // Deliberately incompatible with the gateway's configured=true issuer gate.
    // Review success cannot activate issuance, even with all gateway env values.
    configured: false,
    reviewConfigured: bridge.configured,
    productionVerifierAccepted: false,
    resolveAuthorization: bridge.resolveAuthorization,
    refreshAuthorization: bridge.refreshAuthorization,
  });
}
module.exports = { createCadProductionSessionVerifierBinding };
