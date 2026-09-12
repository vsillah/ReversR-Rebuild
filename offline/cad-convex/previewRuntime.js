// Offline composition only. No env loader, SDK client, HTTP listener or production import.
const { createRequestSessionAdapterForTests } = require('./sessionAdapter');
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const fields = ['mode', 'target', 'deploymentUrl', 'issuerUrl', 'appOrigin', 'applicationId'];
function syntheticOrigin(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && /^[a-z0-9-]+\.invalid$/.test(u.hostname)
      && !u.username && !u.password && !u.port && !u.search && !u.hash
      && u.pathname === '/' && u.origin === value;
  } catch { return false; }
}
/** Structural readiness is never provider verification or upload authority. */
function inspectPreviewConfig(config) {
  let code = 'PREVIEW_CONFIG_INVALID';
  try {
    if (config == null) code = 'PREVIEW_CONFIG_MISSING';
    else if (config.mode === 'live') code = 'LIVE_AUTH_UNQUALIFIED';
    else if (Object.keys(config).length === fields.length
      && fields.every(k => Object.hasOwn(config, k))
      && config.mode === 'synthetic' && ['local', 'preview'].includes(config.target)
      && ['deploymentUrl', 'issuerUrl', 'appOrigin'].every(k => syntheticOrigin(config[k]))
      && config.applicationId === 'convex') code = 'SYNTHETIC_CONFIG_VALID';
  } catch { /* Configuration errors must not expose input values. */ }
  return Object.freeze({ code, configured: code === 'SYNTHETIC_CONFIG_VALID',
    liveAuthReady: false, uploadsEnabled: false });
}
/** Trusted host hooks only; never take these or context from a request body.
 * verifyConfiguration revalidates this exact snapshot before EVERY operation.
 * The synthetic marker is an explicit opt-in, not authentication evidence.
 */
function createSyntheticPreviewRuntime({ testOnly = false, config, verifyConfiguration,
  authenticateService, verifyExactLogin, invokeInternal, now = Date.now } = {}) {
  if (testOnly !== true) throw new Error('TEST_PREVIEW_OPT_IN_REQUIRED');
  // Snapshot once; later host mutation cannot change destinations/target/mode.
  let snapshot;
  try { snapshot = Object.freeze({ ...config }); } catch { fail(); }
  const readiness = inspectPreviewConfig(snapshot);
  if (!readiness.configured
    || ![verifyConfiguration, authenticateService, verifyExactLogin, invokeInternal, now]
      .every(fn => typeof fn === 'function')) fail();
  const guardedAuthenticate = async (context, options) => {
    if (await verifyConfiguration(snapshot, options) !== true) fail();
    options.signal?.throwIfAborted();
    return authenticateService(context, options);
  };
  return Object.freeze({ readiness,
    forRequest({ context, shopId } = {}) {
      if (!context || typeof context !== 'object' || !Object.isFrozen(context)) fail();
      return createRequestSessionAdapterForTests({ testOnly: true, context, shopId,
        authenticateService: guardedAuthenticate, verifyExactLogin, invokeInternal, now });
    },
  });
}
module.exports = { inspectPreviewConfig, createSyntheticPreviewRuntime };
