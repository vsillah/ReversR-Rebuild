// Offline gateway shape. No HTTP listener, authentication implementation or SDK client.
const v = require('./validators');
function createGatewayContract({ authenticateService, verifyExactLogin, invokeInternal, now = Date.now } = {}) {
  return async function call(operation, input, { signal, context } = {}) {
    let timer;
    const controller = new AbortController();
    const abort = () => controller.abort();
    let onAbort;
    try {
      const p = v.payload(operation, input);
      const started = now();
      if (![authenticateService, verifyExactLogin, invokeInternal].every(f => typeof f === 'function')
        || !v.time(started) || signal?.aborted || p.deadlineAt <= started) v.fail();
      const deadlineAt = Math.min(p.deadlineAt, started + 800);
      const check = () => {
        const n = now();
        if (controller.signal.aborted || !v.time(n) || n < started || n >= deadlineAt) v.fail();
      };
      signal?.addEventListener('abort', abort, { once: true });
      const cancelled = new Promise((_, reject) => {
        onAbort = () => reject(new Error('AUTH_UNAVAILABLE'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(abort, deadlineAt - started);
      });
      return await Promise.race([cancelled, (async () => {
        check();
        if (await authenticateService(context, { signal: controller.signal, deadlineAt }) !== true) v.fail();
        check();
        // Trusted verifier must independently validate exact login + upstream liveness on every call.
        // Requested shop is only a selector. Caller bindings never override verified principal.
        const shopId = p.shopId ?? p.record?.shopId ?? p.binding?.shopId;
        const principal = await verifyExactLogin(context, { shopId, signal: controller.signal, deadlineAt });
        check();
        if (principal === null) {
          if (['read', 'resolveAuthorization', 'refreshAuthorization'].includes(operation)) return null;
          v.fail();
        }
        const binding = v.binding(principal);
        const result = await invokeInternal(operation, { ...p, deadlineAt }, binding, { signal: controller.signal });
        check();
        return v.result(operation, result);
      })()]);
    } catch { v.fail(); }
    finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (onAbort) controller.signal.removeEventListener('abort', onAbort);
      controller.abort();
    }
  };
}
module.exports = { createGatewayContract };
