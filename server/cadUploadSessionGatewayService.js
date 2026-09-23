// Server-only upload-session gateway adapter. It is fail-closed unless all
// required env values are installed by a separate approval gate.
const { createUploadSessionService } = require('./uploadSessionStore');
const { createConvexUploadSessionStore } = require('./convexUploadSessionStore');
const { createCadExactSessionBridge } = require('./cadExactSessionBridge');

const OPERATION_BUDGET_MS = 800;
const INTERNAL_MARK_TEST_COHORT = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const ENV_NAMES = Object.freeze({
  url: 'CAD_UPLOAD_SESSION_GATEWAY_URL',
  token: 'CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN',
  audience: 'CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE',
});
const OPERATIONS = new Set(['insertIfAbsent', 'read', 'revoke', 'refreshAuthorization']);

const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const safeToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{32,256}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;

function sanitizeUrl(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > 512) return null;
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.pathname === '/') return null;
    return url;
  } catch {
    return null;
  }
}

function readGatewayConfig(env = process.env) {
  const rawUrl = env[ENV_NAMES.url];
  const rawToken = env[ENV_NAMES.token];
  const rawAudience = env[ENV_NAMES.audience];
  if (!rawUrl && !rawToken && !rawAudience) {
    return Object.freeze({ ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_UNCONFIGURED' });
  }
  if (!rawUrl || !rawToken || !rawAudience) {
    return Object.freeze({ ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INCOMPLETE' });
  }
  const gatewayUrl = sanitizeUrl(rawUrl);
  if (!gatewayUrl || !safeToken(rawToken) || rawAudience !== INTERNAL_MARK_TEST_COHORT) {
    return Object.freeze({ ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID' });
  }
  return Object.freeze({
    ok: true,
    gatewayUrl,
    serviceToken: rawToken,
    audience: rawAudience,
  });
}

function createCadUploadSessionGatewayClient({ gatewayUrl, serviceToken, audience, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (!(gatewayUrl instanceof URL) || !safeToken(serviceToken) || audience !== INTERNAL_MARK_TEST_COHORT
    || typeof fetchImpl !== 'function' || typeof now !== 'function') {
    fail();
  }
  const targetUrl = gatewayUrl.href;
  async function call(operation, payload = {}, { signal } = {}) {
    if (!OPERATIONS.has(operation)) fail();
    const startedAt = now();
    if (!time(startedAt)) fail();
    const deadlineAt = Number.isSafeInteger(payload.deadlineAt)
      ? Math.min(payload.deadlineAt, startedAt + OPERATION_BUDGET_MS)
      : startedAt + OPERATION_BUDGET_MS;
    if (!time(deadlineAt) || deadlineAt <= startedAt) fail();
    const body = JSON.stringify({
      schemaVersion: 1,
      audience,
      operation,
      payload: Object.freeze({ ...payload, deadlineAt }),
    });
    const response = await fetchImpl(targetUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${serviceToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body,
      signal,
    });
    const finishedAt = now();
    if (!time(finishedAt) || finishedAt < startedAt || finishedAt >= deadlineAt) fail();
    if (!response || response.status !== 200) fail();
    let parsed;
    try {
      parsed = await response.json();
    } catch {
      fail();
    }
    const parsedAt = now();
    if (!time(parsedAt) || parsedAt < startedAt || parsedAt >= deadlineAt) fail();
    if (!parsed || parsed.schemaVersion !== 1 || parsed.status !== 'success' || !Object.hasOwn(parsed, 'result')) {
      fail();
    }
    return parsed.result;
  }
  return Object.freeze({ call });
}

function withDeadline(payload, now) {
  const startedAt = now();
  if (!time(startedAt)) fail();
  return Object.freeze({ ...payload, deadlineAt: startedAt + OPERATION_BUDGET_MS });
}

function normalizeExactSessionBridge(exactSessionBridge) {
  if (exactSessionBridge === undefined || exactSessionBridge === null) return createCadExactSessionBridge();
  if (typeof exactSessionBridge !== 'object'
    || typeof exactSessionBridge.resolveAuthorization !== 'function'
    || typeof exactSessionBridge.refreshAuthorization !== 'function') fail();
  return exactSessionBridge;
}

function createCadUploadSessionGatewayService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  exactSessionBridge,
} = {}) {
  const config = readGatewayConfig(env);
  if (!config.ok) {
    return Object.freeze({
      configured: false,
      code: config.code,
      sessionService: createUploadSessionService(),
    });
  }
  const client = createCadUploadSessionGatewayClient({ ...config, fetchImpl, now });
  const store = createConvexUploadSessionStore({ call: client.call, now });
  const bridge = normalizeExactSessionBridge(exactSessionBridge);
  const bridgeConfigured = bridge.configured === true;
  const sessionService = createUploadSessionService({
    store,
    now,
    // Default production construction still has no issuer. The source-only
    // bridge can be injected only by reviewed code/tests, never by env values.
    resolveAuthorization: bridgeConfigured
      ? (context, options) => bridge.resolveAuthorization(context, options)
      : async () => null,
    refreshAuthorization: bridgeConfigured
      ? (binding, options) => bridge.refreshAuthorization(binding, options)
      : async binding => client.call('refreshAuthorization', withDeadline({ binding }, now)),
  });
  return Object.freeze({
    configured: true,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_CONFIGURED',
    scope: INTERNAL_MARK_TEST_COHORT,
    gateway: Object.freeze({
      origin: config.gatewayUrl.origin,
      pathname: config.gatewayUrl.pathname,
      audience: config.audience,
      exactSessionBridge: bridgeConfigured ? 'source-only-injected' : 'absent',
      issuanceEnabled: bridgeConfigured,
    }),
    sessionService,
  });
}

module.exports = {
  ENV_NAMES,
  INTERNAL_MARK_TEST_COHORT,
  OPERATION_BUDGET_MS,
  readGatewayConfig,
  createCadUploadSessionGatewayClient,
  createCadUploadSessionGatewayService,
};
