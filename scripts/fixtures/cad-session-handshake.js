// Synthetic test support only. Never imported by a shipped app route.
const { createCadUploadSessionAdapter } = require('../../utils/cadUserImportBridge');
const scenarios = Object.freeze(['success', 'revoked', 'error', 'malformed', 'timeout', 'cancel']);
function createSyntheticSessionHandshake({ scenario = 'success', timeoutMs = 1000, now = Date.now } = {}) {
  if (!scenarios.includes(scenario)) throw new Error('Unknown synthetic scenario');
  let calls = 0, active, finishPending;
  // Public dummy copied from the canonical tests. Not a credential or generated secret.
  const success = () => ({ schemaVersion: 1, status: 'success', session: {
    transport: 'cookie', expiresAt: now() + 60000, csrfToken: 'c'.repeat(43),
  } });
  const canonical = createCadUploadSessionAdapter({ timeoutMs, now, issue: ({ signal }) => {
    calls++;
    if (!(signal instanceof AbortSignal)) throw new Error('Signal required');
    if (scenario === 'success') return success();
    if (scenario === 'revoked') return { schemaVersion: 1, status: 'error', code: 'USER_SESSION_REQUIRED' };
    if (scenario === 'error') throw new Error('Synthetic issuer unavailable');
    if (scenario === 'malformed') return { schemaVersion: 1, status: 'success' };
    // Deliberately ignore abort: the canonical adapter must settle independently.
    return new Promise(resolve => { finishPending = () => resolve(success()); });
  } });
  const adapter = Object.freeze({ async connect({ signal } = {}) {
    const run = new AbortController();
    active = run;
    const abort = () => run.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    try { return await canonical.connect({ signal: run.signal }); }
    finally {
      signal?.removeEventListener('abort', abort);
      if (active === run) active = undefined;
    }
  } });
  return Object.freeze({ adapter, cancel: () => active?.abort(),
    settlePending: () => finishPending?.(), get calls() { return calls; } });
}
module.exports = { createSyntheticSessionHandshake, scenarios };
