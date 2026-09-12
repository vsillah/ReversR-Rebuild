// Explicit offline injection only. Never selected by the default service or environment.
const v = require('./validators');
const { createGatewayContract } = require('./gateway');
const { createConvexUploadSessionStore } = require('../../server/convexUploadSessionStore');
const { createUploadSessionService } = require('../../server/uploadSessionStore');

// References are supplied by a reviewed host, never taken from request data.
const FUNCTIONS = Object.freeze({
  insertIfAbsent: Object.freeze({ name: 'cad:insertIfAbsent', kind: 'mutation' }),
  read: Object.freeze({ name: 'cad:read', kind: 'query' }),
  revoke: Object.freeze({ name: 'cad:revoke', kind: 'mutation' }),
  resolveAuthorization: Object.freeze({ name: 'cad:resolveAuthorization', kind: 'query' }),
  refreshAuthorization: Object.freeze({ name: 'cad:refreshAuthorization', kind: 'query' }),
});
function createInternalDispatcher({ references, runQuery, runMutation } = {}) {
  v.exact(references, Object.keys(FUNCTIONS));
  if (typeof runQuery !== 'function' || typeof runMutation !== 'function') v.fail();
  const refs = Object.freeze({ ...references });
  if (Object.values(refs).some(ref => ref == null)) v.fail();
  return async (operation, input, principal, options = {}) => {
    try {
      const payload = v.payload(operation, input);
      const binding = v.binding(principal);
      options.signal?.throwIfAborted();
      const invoke = FUNCTIONS[operation].kind === 'query' ? runQuery : runMutation;
      const result = await invoke(refs[operation], { ...payload, principal: binding }, options);
      options.signal?.throwIfAborted();
      return v.result(operation, result);
    } catch { v.fail(); }
  };
}

function createRequestSessionAdapterForTests({ testOnly = false, context, shopId,
  authenticateService, verifyExactLogin, invokeInternal, now = Date.now } = {}) {
  if (testOnly !== true) throw new Error('TEST_ADAPTER_OPT_IN_REQUIRED');
  if (!v.id(shopId) || typeof now !== 'function') v.fail();
  // context is an opaque, privileged per-request handle. Never spread, persist or log it.
  const gateway = createGatewayContract({ authenticateService, invokeInternal, now,
    verifyExactLogin: async (handle, options) => {
      if (typeof verifyExactLogin !== 'function') v.fail();
      const principal = await verifyExactLogin(handle, options);
      if (principal === null) return null;
      const binding = v.binding(principal);
      return binding.shopId === shopId ? binding : null;
    },
  });
  const call = (operation, payload, { signal } = {}) => gateway(operation, payload, { signal, context });
  const authorizationCall = (operation, payload, options) => {
    const n = now();
    if (!v.time(n) || !v.time(n + 800)) v.fail();
    return call(operation, { ...payload, deadlineAt: n + 800 }, options);
  };
  return createUploadSessionService({ now,
    store: createConvexUploadSessionStore({ call, now }),
    resolveAuthorization: (selector, options) => {
      v.exact(selector, ['shopId']);
      if (selector.shopId !== shopId) return null;
      return authorizationCall('resolveAuthorization', { shopId }, options);
    },
    refreshAuthorization: (binding, options) => {
      v.binding(binding, true);
      if (binding.shopId !== shopId) return null;
      return authorizationCall('refreshAuthorization', { binding }, options);
    },
  });
}
module.exports = { FUNCTIONS, createInternalDispatcher, createRequestSessionAdapterForTests };
