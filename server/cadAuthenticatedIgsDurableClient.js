const { createHash } = require('node:crypto');
const { ConvexHttpClient } = require('convex/browser');
const { makeFunctionReference } = require('convex/server');
const { createUploadSessionService } = require('./uploadSessionStore');

const OPERATION_BUDGET_MS = 1500;
const SERVICE_PATH = '/cad/authenticated-igs-service';
const hash = value => createHash('sha256').update(value).digest('hex');
const safeToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43,256}$/.test(value);
const safeOrigin = value => {
  try {
    const url = new URL(value);
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    return (url.protocol === 'https:' || local) && url.origin === value ? value : null;
  } catch { return null; }
};
const originMatchesEnvironment = (origin, environment) => {
  try {
    const url = new URL(origin);
    if (environment === 'development') {
      return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    }
    return environment === 'preview' && url.protocol === 'https:'
      && url.hostname.endsWith('.vercel.app') && url.hostname !== 'reversr.vercel.app';
  } catch { return false; }
};

function readConfig(env = process.env) {
  const url = env.COMMERCIAL_CONVEX_URL;
  const issuer = env.COMMERCIAL_CONVEX_ISSUER;
  const serviceToken = env.CAD_AUTHENTICATED_IGS_SERVICE_TOKEN;
  const environment = env.CAD_AUTHENTICATED_IGS_ENVIRONMENT;
  const environmentBound = environment === 'development'
    ? env.NODE_ENV !== 'production' && env.VERCEL_ENV !== 'production'
    : environment === 'preview' && env.VERCEL_ENV === 'preview';
  const origins = String(env.CAD_AUTHENTICATED_IGS_ALLOWED_ORIGINS || '').split(',')
    .map(value => value.trim()).filter(Boolean).map(safeOrigin);
  if (env.CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED !== 'true'
    || !environmentBound
    || env.COMMERCIAL_BACKEND !== 'convex'
    || !url || !/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url)
    || issuer !== url.replace('.convex.cloud', '.convex.site')
    || !safeToken(serviceToken) || !origins.length
    || origins.some(origin => !origin || !originMatchesEnvironment(origin, environment))) return null;
  return { url, issuer, serviceToken, environment, allowedOrigins: origins,
    gatewayUrl: `${issuer}${SERVICE_PATH}` };
}

async function bounded(operation, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timer;
  try {
    if (parentSignal?.aborted) throw new Error('CAD_DURABLE_UNAVAILABLE');
    parentSignal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(abort, OPERATION_BUDGET_MS);
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () =>
        reject(new Error('CAD_DURABLE_UNAVAILABLE')), { once: true })),
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

function createCadAuthenticatedIgsDurableClient({ env = process.env, fetchImpl = globalThis.fetch,
  now = Date.now, userClientFactory = url => new ConvexHttpClient(url) } = {}) {
  const config = readConfig(env);
  if (!config || typeof fetchImpl !== 'function' || typeof now !== 'function') {
    return Object.freeze({ configured: false, code: 'CAD_AUTHENTICATED_IGS_UNCONFIGURED' });
  }

  async function serviceCall(operation, payload, { signal } = {}) {
    return bounded(async operationSignal => {
      const startedAt = now();
      const deadlineAt = startedAt + OPERATION_BUDGET_MS;
      const response = await fetchImpl(config.gatewayUrl, { method: 'POST', redirect: 'error',
        signal: operationSignal, headers: { authorization: `Bearer ${config.serviceToken}`,
          'content-type': 'application/json; charset=utf-8', accept: 'application/json' },
        body: JSON.stringify({ schemaVersion: 1, operation, payloadJson: JSON.stringify(payload), deadlineAt }) });
      if (!response || response.status !== 200 || now() >= deadlineAt) throw new Error('CAD_DURABLE_UNAVAILABLE');
      const body = await response.json();
      if (!body || body.schemaVersion !== 1 || body.status !== 'success'
        || !Object.hasOwn(body, 'result')) throw new Error('CAD_DURABLE_UNAVAILABLE');
      return body.result;
    }, signal);
  }

  async function authorize(authorization, { signal } = {}) {
    const match = /^Bearer (\S+)$/.exec(authorization || '');
    if (!match || match[1].length > 8192) return { ok: false, code: 'AUTHORIZATION_REQUIRED' };
    return bounded(async () => {
      const client = userClientFactory(config.url);
      try {
        client.setAuth(match[1]);
        let result;
        try {
          result = await client.mutation(makeFunctionReference('cadAuthenticatedIgs:authorizeCurrent'), {});
        } catch (error) {
          const code = String(error?.data || error?.message || '');
          if (/CAD_ENTITLEMENT_REQUIRED|ACCOUNT_REQUIRED/.test(code)) {
            return { ok: false, code: 'CAD_PERMISSION_REQUIRED' };
          }
          if (/LOGIN_REQUIRED|SESSION_EXPIRED/.test(code)) {
            return { ok: false, code: 'AUTHORIZATION_REQUIRED' };
          }
          throw error;
        }
        if (!result || typeof result !== 'object' || result.authMethod !== 'password'
          || result.cadUploadAllowed !== true || !Number.isSafeInteger(result.expiresAt)
          || ![result.userId, result.shopId, result.loginSessionId].every(value =>
            typeof value === 'string' && value.length > 0)) throw new Error('CAD_DURABLE_UNAVAILABLE');
        return result;
      } finally { await client.close?.(); }
    }, signal);
  }

  const sessionStore = Object.freeze({
    insertIfAbsent: (credentialDigest, record, options) => serviceCall('session.insert', {
      credentialDigest, record,
    }, options),
    read: (credentialDigest, options) => serviceCall('session.read', { credentialDigest }, options),
    revoke: (credentialDigest, revokedAt, options) => serviceCall('session.revoke', {
      credentialDigest, revokedAt,
    }, options),
  });
  const sessionService = createUploadSessionService({ store: sessionStore, now, operationBudgetMs: 4000,
    resolveAuthorization: (context, options) => authorize(context?.authorization, options),
    refreshAuthorization: (binding, options) => serviceCall('authorization.refresh', { binding }, options) });

  const job = Object.freeze({
    claim: (owner, input, options) => serviceCall('job.claim', { owner, ...input }, options),
    attachOriginal: (owner, jobId, artifactId, options) => serviceCall('job.attachOriginal', {
      owner, jobId, artifactId,
    }, options),
    claimConversion: (owner, jobId, options) => serviceCall('job.claimConversion', {
      owner, jobId,
    }, options),
    complete: (owner, jobId, result, options) => serviceCall('job.complete', {
      owner, jobId, ...result,
    }, options),
    fail: (owner, jobId, code, quarantined, options) => serviceCall('job.fail', {
      owner, jobId, code, quarantined,
    }, options),
    read: (currentSessionId, jobId, options) => serviceCall('job.read', {
      currentSessionId, jobId,
    }, options),
    latest: (currentSessionId, options) => serviceCall('job.latest', { currentSessionId }, options),
    artifacts: (currentSessionId, jobId, options) => serviceCall('job.artifacts', {
      currentSessionId, jobId,
    }, options),
    deleted: (currentSessionId, jobId, options) => serviceCall('job.deleted', {
      currentSessionId, jobId,
    }, options),
  });

  function custodyStore(owner) {
    const scopeKey = owner.shopId;
    let cached = new Map();
    const read = async (artifactId, options) => {
      const record = await serviceCall('artifact.read', { artifactId, owner }, options);
      if (record) cached.set(artifactId, record);
      return record;
    };
    return Object.freeze({
      async reserve(record, policy, options) {
        const accepted = await serviceCall('artifact.reserve', { scopeKey, owner, record, policy }, options);
        if (accepted) cached.set(record.artifactId, record);
        return accepted;
      },
      consumeOperation: (kind, count, policy, options) => serviceCall('artifact.consumeOperation', {
        scopeKey, owner, kind, count, policy,
      }, options),
      readForOwner: (artifactId, expectedOwner, options) => expectedOwner.userId === owner.userId
        && expectedOwner.shopId === owner.shopId && expectedOwner.uploadSessionId === owner.uploadSessionId
        ? read(artifactId, options) : null,
      async markStored(artifactId, expectedGeneration, updatedAt, options) {
        const accepted = await serviceCall('artifact.transition', { artifactId, owner,
          expectedGeneration, transition: 'stored', reasonDigest: null }, options);
        if (accepted && cached.has(artifactId)) cached.set(artifactId, { ...cached.get(artifactId),
          state: 'stored', generation: expectedGeneration + 1, updatedAt });
        return accepted;
      },
      async markUnknown(artifactId, reason, updatedAt, options) {
        const record = cached.get(artifactId) || await read(artifactId, options);
        if (!record) return false;
        const accepted = await serviceCall('artifact.transition', { artifactId, owner,
          expectedGeneration: record.generation, transition: 'quarantined',
          reasonDigest: hash(`authenticated-igs:${reason}`) }, options);
        if (accepted) cached.set(artifactId, { ...record, state: 'quarantined',
          generation: record.generation + 1, updatedAt });
        return accepted;
      },
      async beginDelete(artifactId, expectedOwner, updatedAt, options) {
        if (expectedOwner.userId !== owner.userId || expectedOwner.shopId !== owner.shopId
          || expectedOwner.uploadSessionId !== owner.uploadSessionId) return null;
        const record = await read(artifactId, options);
        if (!record) return null;
        const accepted = await serviceCall('artifact.transition', { artifactId, owner,
          expectedGeneration: record.generation, transition: 'deleting', reasonDigest: null }, options);
        if (!accepted) return null;
        const deleting = { ...record, state: 'deleting', generation: record.generation + 1, updatedAt };
        cached.set(artifactId, deleting);
        return deleting;
      },
      async confirmDeleted(artifactId, expectedGeneration, deletedAt, options) {
        const record = cached.get(artifactId) || await read(artifactId, options);
        if (!record) return null;
        const tombstoneDigest = hash(`authenticated-igs-deleted:${artifactId}:${record.objectKeyDigest}`);
        const result = await serviceCall('artifact.confirmDeleted', { scopeKey, artifactId, owner,
          expectedGeneration, tombstoneDigest }, options);
        if (result?.deleted) cached.delete(artifactId);
        return result;
      },
      issueGrant: (grantDigest, artifactId, expectedOwner, artifactGeneration,
        issuedAt, expiresAt, options) => expectedOwner.userId === owner.userId
        && expectedOwner.shopId === owner.shopId && expectedOwner.uploadSessionId === owner.uploadSessionId
        ? serviceCall('grant.issue', { grantDigest, artifactId, owner, artifactGeneration,
          issuedAt, expiresAt }, options) : false,
      resolveGrant: (grantDigest, expectedOwner, at, options) => expectedOwner.userId === owner.userId
        && expectedOwner.shopId === owner.shopId && expectedOwner.uploadSessionId === owner.uploadSessionId
        ? serviceCall('grant.resolve', { grantDigest, owner }, options) : null,
    });
  }

  return Object.freeze({ configured: true, code: 'CAD_AUTHENTICATED_IGS_CONFIGURED',
    environment: config.environment, allowedOrigins: config.allowedOrigins,
    authorize, sessionService, job, custodyStore, serviceCall });
}

module.exports = { OPERATION_BUDGET_MS, SERVICE_PATH,
  createCadAuthenticatedIgsDurableClient, readConfig };
