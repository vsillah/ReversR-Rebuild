// Source-only exact-session bridge. It is never selected from environment.
const INTERNAL_MARK_TEST_COHORT = 'rrb-ref:cad-upload-internal-mark-test-cohort-v1';
const AUTH_METHODS = new Set(['password', 'passkey', 'oidc']);
const ISSUE_CONTEXT_KEYS = new Set(['schemaVersion', 'cohort', 'requestRef', 'shopId', 'loginSessionRef', 'transport']);
const BINDING_KEYS = new Set(['userId', 'shopId', 'sessionId', 'loginSessionId', 'authMethod']);
const FORBIDDEN_CONTEXT_KEYS = new Set([
  'authorization',
  'body',
  'cadUploadAllowed',
  'content',
  'contentBase64',
  'credential',
  'csrf',
  'expiresAt',
  'file',
  'fileName',
  'loginSessionId',
  'principal',
  'secret',
  'serviceToken',
  'token',
  'uploadCredential',
  'user',
  'userId',
]);

const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;

function assertExactObject(value, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) fail();
  }
}

function projectIssueContext(context) {
  assertExactObject(context, ISSUE_CONTEXT_KEYS);
  for (const key of Object.keys(context)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) fail();
  }
  if (context.schemaVersion !== 1 || context.cohort !== INTERNAL_MARK_TEST_COHORT
    || !id(context.requestRef) || !id(context.shopId)
    || (context.loginSessionRef !== undefined && !id(context.loginSessionRef))
    || (context.transport !== undefined && !['bearer', 'cookie'].includes(context.transport))) fail();
  return Object.freeze({
    schemaVersion: 1,
    cohort: context.cohort,
    requestRef: context.requestRef,
    shopId: context.shopId,
    ...(context.loginSessionRef ? { loginSessionRef: context.loginSessionRef } : {}),
    ...(context.transport ? { transport: context.transport } : {}),
  });
}

function projectBinding(binding) {
  assertExactObject(binding, BINDING_KEYS);
  if (!id(binding.userId) || !id(binding.shopId) || !id(binding.sessionId)
    || !id(binding.loginSessionId) || !AUTH_METHODS.has(binding.authMethod)) fail();
  return Object.freeze({
    userId: binding.userId,
    shopId: binding.shopId,
    sessionId: binding.sessionId,
    loginSessionId: binding.loginSessionId,
    authMethod: binding.authMethod,
  });
}

function projectGrant(grant, expected, { requireUploadAllowed, now }) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)
    || !id(grant.userId) || !id(grant.shopId) || !id(grant.loginSessionId)
    || !AUTH_METHODS.has(grant.authMethod) || typeof grant.cadUploadAllowed !== 'boolean'
    || !time(grant.expiresAt) || grant.expiresAt <= now()) fail();
  if (requireUploadAllowed && grant.cadUploadAllowed !== true) return null;
  if (expected.shopId && grant.shopId !== expected.shopId) return null;
  if (expected.userId && grant.userId !== expected.userId) return null;
  if (expected.loginSessionId && grant.loginSessionId !== expected.loginSessionId) return null;
  if (expected.authMethod && grant.authMethod !== expected.authMethod) return null;
  return Object.freeze({
    userId: grant.userId,
    shopId: grant.shopId,
    loginSessionId: grant.loginSessionId,
    authMethod: grant.authMethod,
    cadUploadAllowed: grant.cadUploadAllowed,
    expiresAt: grant.expiresAt,
  });
}

function createCadExactSessionBridge({
  enabled = false,
  cohort = INTERNAL_MARK_TEST_COHORT,
  verifyExactSession,
  now = Date.now,
} = {}) {
  const configured = enabled === true && cohort === INTERNAL_MARK_TEST_COHORT
    && typeof verifyExactSession === 'function' && typeof now === 'function';
  return Object.freeze({
    sourceOnly: true,
    configured,
    cohort: INTERNAL_MARK_TEST_COHORT,
    async resolveAuthorization(context, options = {}) {
      if (!configured) return null;
      try {
        options.signal?.throwIfAborted?.();
        const issueContext = projectIssueContext(context);
        const grant = await verifyExactSession(Object.freeze({
          schemaVersion: 1,
          purpose: 'issue',
          issueContext,
        }), options);
        options.signal?.throwIfAborted?.();
        return projectGrant(grant, issueContext, { requireUploadAllowed: true, now });
      } catch {
        fail();
      }
    },
    async refreshAuthorization(binding, options = {}) {
      if (!configured) return null;
      try {
        options.signal?.throwIfAborted?.();
        const exactBinding = projectBinding(binding);
        const grant = await verifyExactSession(Object.freeze({
          schemaVersion: 1,
          purpose: 'refresh',
          cohort: INTERNAL_MARK_TEST_COHORT,
          binding: exactBinding,
        }), options);
        options.signal?.throwIfAborted?.();
        return projectGrant(grant, exactBinding, { requireUploadAllowed: false, now });
      } catch {
        fail();
      }
    },
  });
}

module.exports = { INTERNAL_MARK_TEST_COHORT, createCadExactSessionBridge };
