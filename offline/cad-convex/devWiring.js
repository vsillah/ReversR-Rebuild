// Offline qualification contract only. No SDK, environment loader or network transport.
const BASE = '312c9f5ddc81e92e9278aa9bd43108e46acc5592';
const TARGET = Object.freeze({ team: 'vambah-sillah', teamId: '405220',
  project: 'reversr-cad-auth-dev', deployment: 'majestic-alligator-31',
  type: 'development', clientOrigin: 'https://majestic-alligator-31.convex.cloud',
  issuerOrigin: 'https://majestic-alligator-31.convex.site' });
const ENV = Object.freeze({ JWT_PRIVATE_KEY: 'deployment-secret', JWKS: 'deployment',
  CONVEX_SITE_URL: 'platform-owned', SITE_URL: 'not-used-by-offline-bearer-contract' });
const keys = (v, expected) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const same = (v, expected) => keys(v, Object.keys(expected))
  && Object.entries(expected).every(([k, value]) => v[k] === value);
const email = v => typeof v === 'string' && /^cad-test-[a-z0-9-]{1,32}@auth-test\.invalid$/.test(v);
function validManifest(m) {
  return keys(m, ['version', 'mode', 'target', 'environment', 'transport', 'cohort',
    'provisioning', 'rollback', 'limits', 'gates'])
    && m.version === 1 && m.mode === 'offline-only' && same(m.target, TARGET)
    && same(m.environment, ENV) && m.transport === 'host-injected-synthetic-bearer'
    && Array.isArray(m.cohort) && m.cohort.length >= 1 && m.cohort.length <= 8
    && m.cohort.every(email) && new Set(m.cohort).size === m.cohort.length
    && same(m.provisioning, { mode: 'fixture-only', method: 'password',
      flow: 'existing-account-signIn', delivery: false })
    && same(m.rollback, { disabledCommit: BASE, owner: 'integration-captain',
      action: 'stop-local-harness', liveMutation: false })
    && same(m.limits, { maxOperations: 8, sessionTtlMs: 60000, runTtlMs: 300000,
      maxConcurrent: 1, expenseUsd: 0 })
    && same(m.gates, { providers: false, issuers: false, sessionReader: false,
      uploads: false, conversion: false, liveTests: false });
}
function inspectDevWiring(m) {
  let valid = false;
  try { valid = Boolean(validManifest(m)); } catch { /* Sanitized projection only. */ }
  return Object.freeze({ code: valid ? 'OFFLINE_WIRING_VALID' : 'OFFLINE_WIRING_INVALID',
    packetValid: valid, liveAuthReady: false, uploadsEnabled: false });
}
/** Hooks are trusted local fixtures, never supplied from request input. This is
 * an executable contract, not a verifier, provisioning API or live transport.
 * Every admitted attempt consumes its nonce before awaiting host verification.
 * Any uncertain outcome halts the run; reconciliation requires a future design.
 */
function createDevQualificationForTests({ testOnly, manifest, readSnapshot, now = Date.now } = {}) {
  const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
  if (testOnly !== true || !inspectDevWiring(manifest).packetValid
    || typeof readSnapshot !== 'function' || typeof now !== 'function') fail();
  const cohort = new Set(manifest.cohort);
  const started = now();
  if (!Number.isSafeInteger(started) || started < 0) fail();
  const used = new Set();
  let busy = false, stopped = false, lastTime = started;
  return Object.freeze({
    async qualify(request) {
      const denied = () => Object.freeze({ code: 'AUTH_UNAVAILABLE', qualified: false,
        liveAuthReady: false, uploadsEnabled: false });
      if (stopped) return denied();
      try {
        const time = now();
        if (!Number.isSafeInteger(time) || time < lastTime || time - started >= 300000
          || busy || used.size >= 8 || !keys(request, ['nonce', 'sourceCommit', 'email'])
          || typeof request.nonce !== 'string' || !/^fixture-[a-z0-9-]{1,32}$/.test(request.nonce)
          || used.has(request.nonce) || request.sourceCommit !== BASE || !cohort.has(request.email)) {
          stopped = true; return denied();
        }
        lastTime = time;
        used.add(request.nonce);
        busy = true;
        const input = Object.freeze({ ...request });
        const s = await readSnapshot(input);
        const end = now();
        if (stopped || !Number.isSafeInteger(end) || end < time || end - started >= 300000
          || !keys(s, ['nonce', 'sourceCommit', 'email', 'userId', 'sessionId',
            'sessionOwnerId', 'method', 'provenance', 'active', 'issuedAt', 'expiresAt', 'outcome'])
          || s.nonce !== input.nonce || s.sourceCommit !== BASE || s.email !== input.email
          || typeof s.userId !== 'string' || !/^fixture-user-[a-z0-9-]{1,32}$/.test(s.userId)
          || typeof s.sessionId !== 'string' || !/^fixture-session-[a-z0-9-]{1,32}$/.test(s.sessionId)
          || s.sessionOwnerId !== s.userId || s.method !== 'password'
          || s.provenance !== 'exact-session-fixture' || s.active !== true
          || s.outcome !== 'known-read-only' || !Number.isSafeInteger(s.issuedAt)
          || !Number.isSafeInteger(s.expiresAt) || s.issuedAt < started || s.issuedAt > time
          || s.expiresAt <= end || s.expiresAt - s.issuedAt > 60000) {
          stopped = true; return denied();
        }
        lastTime = end;
        return Object.freeze({ code: 'SYNTHETIC_SNAPSHOT_QUALIFIED', qualified: true,
          liveAuthReady: false, uploadsEnabled: false });
      } catch { stopped = true; return denied(); }
      finally { busy = false; }
    },
    stop() { stopped = true; },
  });
}
module.exports = { inspectDevWiring, createDevQualificationForTests };
