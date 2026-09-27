// Opt-in server control plane. No provider, credential, session issuer or body IO.
// The production router and default runtime mount remain independently closed.
const { createHash } = require('node:crypto');
const { createCadLiveOpeningRuntimeMount, reviewRuntimeMountBinding } = require('./cadLiveOpeningRuntimeMount');

// Stable across card/window/deployment rebinds: changing a digest cannot buy a second run.
const RUN_FENCE_KEY = 'cad-production-internal-opening-v1';
const METHODS = Object.freeze([
  'verifyApproval', 'verifyDurableEvidence', 'recheckDeployment', 'verifyClosedBaseline',
  'armRollback', 'claimRun', 'verifySession', 'claimAttempt', 'openFence',
  'consumeAttempt', 'closeFence', 'revokeSessionAndLateGrants', 'postRollbackSmoke',
]);
const MUTATIONS = new Set(['armRollback', 'claimRun', 'claimAttempt', 'openFence', 'consumeAttempt']);
const CLEANUP = ['closeFence', 'revokeSessionAndLateGrants', 'postRollbackSmoke'];
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const closed = (code, extra = {}) => Object.freeze({
  ok: false, code, admissionAuthorized: false, bodyReadAuthorized: false,
  conversionAuthorized: false, sandboxDispatchAuthorized: false,
  retryAuthorized: false, secondLiveRunAuthorized: false, ...extra,
});

function createCadLiveOpeningRuntimeActivation({
  enabled = false, commandCardBytes, commandCardSha256, sessionId,
  durableEvidenceSha256, adapter, now = Date.now,
} = {}) {
  const defaultMount = createCadLiveOpeningRuntimeMount();
  let attempted = false;
  // Snapshot data at construction. No object serializers/accessors from a caller's card.
  let card;
  try {
    if (typeof commandCardBytes === 'string' && commandCardBytes.length <= 65536) {
      card = JSON.parse(commandCardBytes);
    }
  } catch { /* Invalid card stays closed. */ }
  const bytesMatch = typeof commandCardBytes === 'string' && SHA.test(commandCardSha256 || '')
    && createHash('sha256').update(commandCardBytes).digest('hex') === commandCardSha256;
  const binding = card && reviewRuntimeMountBinding({
    commandCardDraft: card, commandCardSha256,
    currentDeploymentReference: card.productionDeploymentReference,
  });
  // This source-only draft describes bounds; it is never execution authority.
  // Authority must come from the independently reviewed adapter's fresh approval verifier.
  const configured = bytesMatch && binding?.bindingAccepted === true
    && ID.test(sessionId || '') && SHA.test(durableEvidenceSha256 || '')
    && card.evidencePacketSha256 === durableEvidenceSha256
    && adapter && METHODS.every(name => typeof adapter[name] === 'function')
    && typeof now === 'function';
  const context = configured ? Object.freeze({
    runFenceKey: RUN_FENCE_KEY, commandCardSha256, durableEvidenceSha256, sessionId,
    deploymentReference: card.productionDeploymentReference,
    origin: card.productionOrigin, route: card.productionRoute, cohortRef: card.cohortRef,
    startUtc: card.openingWindow.startUtc, expiresUtc: card.openingWindow.expiresUtc,
    maxSessions: 1, maxAttempts: 1, retries: 0, secondRuns: 0,
    bodyReadAuthorized: false,
  }) : null;
  // Bind methods once; swapping adapter methods during a run cannot change its contract.
  const calls = configured ? Object.fromEntries(METHODS.map(name => [name, adapter[name].bind(adapter)])) : {};

  async function runActivation() {
    if (enabled !== true) return closed('RUNTIME_ACTIVATION_DISABLED');
    if (attempted) return closed('ATTEMPT_ALREADY_SPENT');
    attempted = true; // Local concurrent calls and retries stop before the first await.
    if (!configured) return closed('RUNTIME_ACTIVATION_INPUTS_INVALID');
    let lastTime = -Infinity;
    let rollbackRequired = false;
    let failure = null;
    const completed = [];
    const cleanupFailures = [];
    function clockCheck(cleanup = false) {
      const stamp = now();
      const valid = Number.isFinite(stamp) && stamp >= lastTime;
      lastTime = stamp;
      const inWindow = valid && stamp >= Date.parse(context.startUtc) && stamp < Date.parse(context.expiresUtc);
      // Revocation/closure must still happen after expiry or clock failure.
      if (!cleanup && !inWindow) throw Error('WINDOW_OR_CLOCK_INVALID');
      return { checkedAtMs: Number.isFinite(stamp) ? stamp : null, inWindow, clockValid: valid };
    }
    function receiptValid(receipt, name) {
      if (!receipt || receipt.ok !== true || receipt.operation !== name
        || receipt.commandCardSha256 !== context.commandCardSha256
        || receipt.deploymentReference !== context.deploymentReference
        || receipt.sessionId !== context.sessionId || receipt.runFenceKey !== RUN_FENCE_KEY) return false;
      if (MUTATIONS.has(name) && (receipt.durable !== true || receipt.expiryCheckedAtomically !== true)) return false;
      if (name === 'verifyApproval' && (receipt.explicitLiveGateApproved !== true
        || receipt.startUtc !== context.startUtc || receipt.expiresUtc !== context.expiresUtc
        || receipt.cohortRef !== context.cohortRef)) return false;
      if (name === 'verifyDurableEvidence' && (receipt.evidenceSha256 !== durableEvidenceSha256
        || receipt.independentExpiryEnforced !== true || receipt.atomicClaims !== true
        || receipt.durableRollbackEnforced !== true)) return false;
      if (name === 'recheckDeployment' && receipt.immutableCurrent !== true) return false;
      if (name === 'verifyClosedBaseline' && receipt.failClosed !== true) return false;
      if (name === 'armRollback' && (receipt.armed !== true || receipt.expiresUtc !== context.expiresUtc)) return false;
      if (['claimRun', 'claimAttempt'].includes(name) && receipt.claimed !== true) return false;
      if (name === 'verifySession' && (receipt.bounded !== true || receipt.cohortRef !== context.cohortRef
        || receipt.expiresUtc !== context.expiresUtc || receipt.concurrentSessions !== 1)) return false;
      if (name === 'openFence' && (receipt.open !== true || receipt.expiresUtc !== context.expiresUtc)) return false;
      if (name === 'consumeAttempt' && receipt.consumed !== true) return false;
      if (name === 'closeFence' && (receipt.closed !== true || receipt.durable !== true)) return false;
      if (name === 'revokeSessionAndLateGrants' && (receipt.revoked !== true || receipt.durable !== true)) return false;
      if (name === 'postRollbackSmoke' && (receipt.failClosed !== true || receipt.bodyReads !== 0
        || receipt.sessionGrants !== 0 || receipt.fenceClosed !== true)) return false;
      return true;
    }
    async function step(name, cleanup = false) {
      let clock;
      try { clock = clockCheck(cleanup); } catch (error) {
        if (!cleanup) throw error;
        clock = { checkedAtMs: null, inWindow: false, clockValid: false };
      }
      // Only sanitized, immutable bounds enter the trusted adapter, never card data or payloads.
      const receipt = await calls[name](Object.freeze({ ...context, ...clock, cleanup }));
      if (!receiptValid(receipt, name)) throw Error('RECEIPT_REJECTED');
      completed.push(name);
      if (!cleanup) clockCheck(); // A slow effect cannot extend the next effect's authority.
    }
    try {
      for (const name of ['verifyApproval', 'verifyDurableEvidence', 'recheckDeployment', 'verifyClosedBaseline']) {
        await step(name);
      }
      // Consume the global run before arming anything: a losing caller must not roll back its winner.
      await step('claimRun');
      // Arm independent durable expiry before any opening. An uncertain arm needs rollback too.
      rollbackRequired = true;
      for (const name of ['armRollback', 'verifySession', 'claimAttempt']) await step(name);
      await step('recheckDeployment'); // Reject deployment changes immediately before opening.
      await step('openFence');
      await step('consumeAttempt'); // Durable consumption; this module never reads a body.
    } catch {
      failure = 'ACTIVATION_STOPPED_NO_RETRY';
    } finally {
      if (rollbackRequired) {
        // Each is attempted once even if an earlier rollback step failed. Never delete spent claims.
        for (const name of CLEANUP) {
          try { await step(name, true); } catch { cleanupFailures.push(name); }
        }
      }
    }
    return closed(cleanupFailures.length ? 'ROLLBACK_OR_SMOKE_UNKNOWN_NO_RETRY'
      : failure || 'CONTROL_PLANE_COMPLETED_BODY_GATE_CLOSED', {
      controlPlaneCompleted: !failure && cleanupFailures.length === 0,
      rollbackRequired, rollbackVerified: rollbackRequired && cleanupFailures.length === 0,
      unknownOutcome: Boolean(failure || cleanupFailures.length),
      completed: Object.freeze(completed), cleanupFailures: Object.freeze(cleanupFailures),
    });
  }
  return Object.freeze({ ...defaultMount, runActivation });
}

module.exports = { RUN_FENCE_KEY, METHODS, createCadLiveOpeningRuntimeActivation };
