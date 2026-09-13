// Source candidate only. No listener, SDK client, credential loader or runtime import.
// The authenticated transport must supply verification; never use a decoded claim.
const { createGatewayContract } = require('./gateway');
const fail = code => { throw new Error(code); };
function createDevelopmentService({ verifyService, verifyExactLogin, invokeInternal,
  serviceSubject, now = Date.now } = {}) {
  if (typeof verifyService !== 'function' || typeof verifyExactLogin !== 'function'
    || typeof invokeInternal !== 'function' || typeof serviceSubject !== 'string'
    || !serviceSubject.length) fail('AUTH_UNAVAILABLE');
  const start = now();
  if (!Number.isSafeInteger(start) || start < 0) fail('AUTH_UNAVAILABLE');
  let operations = 0, stopped = false, inFlight = false;
  const gateway = createGatewayContract({ now, verifyExactLogin, invokeInternal,
    authenticateService: async (context, options) => {
      const receipt = await verifyService(context, options);
      const n = now();
      return !!receipt && receipt.verified === true && receipt.subject === serviceSubject
        && receipt.audience === 'reversr-cad-auth-dev' && receipt.deployment === 'majestic-alligator-31'
        && receipt.revoked === false && Number.isSafeInteger(receipt.expiresAt)
        && receipt.expiresAt > n;
    },
  });
  return Object.freeze({
    async call(operation, input, options) {
      const n = now();
      if (stopped) fail('RUN_STOPPED');
      if (inFlight) fail('RUN_BUSY');
      if (!Number.isSafeInteger(n) || n < start || n >= start + 15 * 60 * 1000
        || operations >= 100) { stopped = true; fail('RUN_STOPPED'); }
      // Count attempted calls, including denials. Never retry a remote write.
      operations++;
      inFlight = true;
      try { return await gateway(operation, input, options); }
      catch {
        // A transport failure can conceal a committed mutation. Stop the entire run,
        // even for a denial; a new process is not authorization to resume/replay.
        stopped = true;
        fail(['insertIfAbsent', 'revoke'].includes(operation) ? 'OUTCOME_UNKNOWN' : 'RUN_STOPPED');
      } finally { inFlight = false; }
    },
    status: () => ({ operations, stopped, automaticRetries: 0 }),
  });
}
module.exports = { createDevelopmentService };
