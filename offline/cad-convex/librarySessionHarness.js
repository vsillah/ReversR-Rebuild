// Synthetic-only candidate for the exact-session snapshot boundary. No runtime imports.
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const id = value => typeof value === 'string' && value.length > 0;
const time = value => Number.isSafeInteger(value) && value >= 0;
function createLibrarySessionReaderForTests({ testOnly = false, verifyExactLogin, now = Date.now } = {}) {
  if (testOnly !== true) throw new Error('TEST_SESSION_OPT_IN_REQUIRED');
  if (typeof verifyExactLogin !== 'function' || typeof now !== 'function') fail();
  return async (ctx, loginSessionId) => {
    try {
      if (!id(loginSessionId)) fail();
      // Trusted harness hook, never JWT decoding or request-supplied identity/method.
      const verified = await verifyExactLogin(ctx);
      if (verified === null) return null;
      if (!verified || verified.verified !== true || !id(verified.userId)
        || !id(verified.loginSessionId)
        || !['password', 'passkey', 'oidc'].includes(verified.authMethod)) fail();
      if (verified.loginSessionId !== loginSessionId) return null;
      const session = await ctx.db.get(loginSessionId);
      if (session === null) return null;
      if (session._id !== loginSessionId || !id(session.userId) || !time(session.expirationTime)) fail();
      const n = now(); if (!time(n)) fail();
      if (session.userId !== verified.userId || session.expirationTime <= n) return null;
      // Point-read the owner in the SAME snapshot. Library tables remain library-owned.
      const owner = await ctx.db.get(session.userId);
      if (!owner || owner._id !== verified.userId) return null;
      const end = now(); if (!time(end) || end < n) fail();
      if (session.expirationTime <= end) return null;
      return { userId: owner._id, loginSessionId, authMethod: verified.authMethod,
        expiresAt: session.expirationTime, active: true };
    } catch { fail(); }
  };
}
module.exports = { createLibrarySessionReaderForTests };
