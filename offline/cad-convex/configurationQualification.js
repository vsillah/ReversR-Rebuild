// Offline evidence-shape qualification. Never reads env or constructs live authority.
const { inspectDevWiring } = require('./devWiring');
const SOURCE = 'cc8a45d2a7c2830e3b5ee1ecd96dbcdcb27357c8';
const CHECKS = Object.freeze({
  destination: 'development-resource', JWT_PRIVATE_KEY: 'deployment-secret',
  JWKS: 'deployment', keyPair: 'deployment', CONVEX_SITE_URL: 'platform-owned',
  SITE_URL: 'reviewed-flow-decision', providerAssembly: 'source-review',
  issuerAssembly: 'source-review', exactSession: 'source-review',
  serviceCaller: 'source-review', boundedReplay: 'source-review', rollback: 'development-only',
});
const exact = (v, names) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
/** Receipts are host-owned synthetic assertions, not verified provider evidence.
 * Explicit time makes stale/future evidence deterministic; no clock or env defaults.
 * Only fixed check IDs leave this function. No input values are echoed.
 */
function inspectConfigurationQualification(packet, nowMs) {
  const result = (code, packetValid, pending = [], failed = []) => Object.freeze({
    code, packetValid, syntheticEvidenceComplete: packetValid && !pending.length && !failed.length,
    pending: Object.freeze(pending), failed: Object.freeze(failed),
    liveAuthReady: false, configurationAuthorized: false, uploadsEnabled: false,
  });
  const invalid = () => result('CONFIGURATION_PACKET_INVALID', false);
  try {
    if (!Number.isSafeInteger(nowMs) || nowMs < 0
      || !exact(packet, ['version', 'mode', 'sourceCommit', 'wiring', 'checks'])
      || packet.version !== 1 || packet.mode !== 'synthetic-evidence-only'
      || packet.sourceCommit !== SOURCE || !inspectDevWiring(packet.wiring).packetValid
      || !Array.isArray(packet.checks) || packet.checks.length !== Object.keys(CHECKS).length
      || new Set(packet.checks.map(c => c.id)).size !== Object.keys(CHECKS).length) return invalid();
    const pending = [], failed = [];
    for (const row of packet.checks) {
      if (!exact(row, ['id', 'scope', 'evidence']) || !Object.hasOwn(CHECKS, row.id)
        || row.scope !== CHECKS[row.id]) return invalid();
      if (row.evidence === null) { pending.push(row.id); continue; }
      const e = row.evidence;
      if (!exact(e, ['kind', 'checkId', 'sourceCommit', 'deployment', 'observedAtMs', 'outcome'])
        || e.kind !== 'synthetic-only' || e.checkId !== row.id || e.sourceCommit !== SOURCE
        || e.deployment !== packet.wiring.target.deployment
        || !Number.isSafeInteger(e.observedAtMs) || e.observedAtMs < 0
        || e.observedAtMs > nowMs || nowMs - e.observedAtMs >= 300000
        || !['pass', 'fail'].includes(e.outcome)) return invalid();
      if (e.outcome === 'fail') failed.push(row.id);
    }
    return result(failed.length ? 'SYNTHETIC_CONFIGURATION_FAILED'
      : pending.length ? 'CONFIGURATION_EVIDENCE_PENDING' : 'SYNTHETIC_CONFIGURATION_COMPLETE',
    true, pending, failed);
  } catch { return invalid(); }
}
module.exports = { inspectConfigurationQualification };
