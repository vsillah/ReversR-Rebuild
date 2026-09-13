// Source-only, in-memory fixture adapters. No provider, persistence, credentials or live activation.
const { inspectRetainedTerminalFixture } = require('./retainedTerminalState');
const shape = (v, names) => v && Object.getPrototypeOf(v) === Object.prototype
  && Reflect.ownKeys(v).length === names.length && names.every(k =>
    Object.hasOwn(v, k) && Object.hasOwn(Object.getOwnPropertyDescriptor(v, k), 'value'));
const ref = v => typeof v === 'string' && /^fixture:[a-z0-9-]{1,64}$/.test(v);
const uint = v => Number.isSafeInteger(v) && v >= 0;
const array = (v, max) => Array.isArray(v) && v.length <= max
  && Reflect.ownKeys(v).length === v.length + 1 && [...v].every(ref) && new Set(v).size === v.length;
const fail = code => { throw Error(code); };
const flags = Object.freeze({ liveReady: false, executable: false, cadUploadAllowed: false,
  retentionOverride: false, cleanupVerified: false, deleted: false });
const bindingKeys = ['runRef', 'sourceSha', 'projectRef', 'destinationRef', 'operatorRef', 'custodianRef'];
function validBinding(b) {
  return shape(b, bindingKeys) && bindingKeys.filter(k => k !== 'sourceSha').every(k => ref(b[k]))
    && typeof b.sourceSha === 'string' && /^[a-f0-9]{40}$/.test(b.sourceSha);
}
const sameBinding = (a, b) => validBinding(b) && bindingKeys.every(k => a[k] === b[k]);
const entryPoints = Object.freeze(['signIn', 'sessionCreation', 'refresh', 'signup', 'reset', 'verification', 'protectedReader']);
function inspectRollbackFixture(candidate, fence) {
  const safe = shape(candidate, ['testOnly', 'readsRetainedVersion', 'enforcesFence', 'enforcesEpoch',
    'enforcesCustody', 'entryPoints', 'passwordEnabled']) && candidate.testOnly === true
    && candidate.readsRetainedVersion === 1 && candidate.enforcesFence === true
    && candidate.enforcesEpoch === true && candidate.enforcesCustody === true && candidate.passwordEnabled === false
    && Array.isArray(candidate.entryPoints) && candidate.entryPoints.length === entryPoints.length
    && entryPoints.every(p => candidate.entryPoints.includes(p))
    && shape(fence, ['version', 'epoch', 'denied']) && fence.version === 1 && uint(fence.epoch) && fence.denied === true;
  return { ...flags, packetValid: Boolean(safe), code: safe ? 'FIXTURE_ROLLBACK_COMPATIBLE' : 'UNSAFE_ROLLBACK' };
}
function createLockoutPrivateFixture({ testOnly, binding, startAt, reviewAt, expiresAt } = {}) {
  if (testOnly !== true || !validBinding(binding)) fail('BINDING_REQUIRED');
  if (![startAt, reviewAt, expiresAt].every(uint) || !(startAt < reviewAt && reviewAt < expiresAt)
    || expiresAt - startAt > 86400000) fail('CUSTODY_WINDOW_INVALID');
  const saved = { ...binding }; let lastTime = startAt, sequence = 0, pending = null, stopped = false;
  let epoch = 0, fenced = false, captured = false, drained = false;
  const owners = [null, null], sessionRefs = [[], []];
  const receipts = new Set();
  const check = (b, at) => {
    if (!sameBinding(saved, b)) fail('BINDING_MISMATCH');
    if (!uint(at) || at < lastTime || at < startAt || at >= reviewAt || at >= expiresAt) {
      stopped = true; fail('CUSTODY_WINDOW_INVALID');
    }
    lastTime = at;
  };
  const running = () => { if (stopped) fail('RECONCILIATION_REQUIRED'); };
  const owner = slot => { if ((slot !== 0 && slot !== 1) || !owners[slot]) fail('COHORT_OWNERSHIP_REQUIRED'); return owners[slot]; };
  const snapshot = () => ({ ...flags, state: stopped ? 'FIXTURE_BLOCKED_RECONCILIATION_REQUIRED' : 'FIXTURE_PENDING',
    epoch, fenced, captured, drained, pending: pending ? { ...pending } : null });
  return Object.freeze({
    status: snapshot,
    // This records the pending intent before returning a dispatch envelope; it never dispatches.
    pendingBeforeDispatch(b, at, intent) {
      check(b, at); running();
      if (pending || sequence >= 100 || fenced) fail('PENDING_OPERATION_REQUIRED');
      if (!shape(intent, ['slot', 'operationRef', 'absenceRef', 'collisionRef', 'passwordAccountRef'])
        || ![0, 1].includes(intent.slot) || owners[intent.slot]
        || !['operationRef', 'absenceRef', 'collisionRef', 'passwordAccountRef'].every(k => ref(intent[k]))
        || new Set([intent.operationRef, intent.absenceRef, intent.collisionRef]).size !== 3
        || receipts.has(intent.operationRef)) fail('OWNERSHIP_EVIDENCE_REQUIRED');
      receipts.add(intent.operationRef);
      pending = { ...intent, sequence: ++sequence, at };
      return { ...flags, ...pending, ...saved };
    },
    postWriteOwnership(b, at, receipt) {
      check(b, at); running();
      if (!pending) fail('PENDING_OPERATION_REQUIRED');
      const keys = ['sequence', 'operationRef', 'slot', 'userRef', 'accountRef', 'passwordAccountRef', 'provider', 'ownershipRef', 'rateLimitRef', 'verifiers', 'uploadRefs'];
      if (!shape(receipt, keys) || receipt.sequence !== pending.sequence || receipt.operationRef !== pending.operationRef
        || receipt.slot !== pending.slot || receipt.passwordAccountRef !== pending.passwordAccountRef || receipt.provider !== 'password'
        || !['userRef', 'accountRef', 'passwordAccountRef', 'ownershipRef'].every(k => ref(receipt[k]))) {
        stopped = true; fail('OWNERSHIP_MISMATCH');
      }
      if ((receipt.rateLimitRef !== null && !ref(receipt.rateLimitRef))
        || !array(receipt.uploadRefs, 18) || !Array.isArray(receipt.verifiers) || receipt.verifiers.length > 18
        || receipt.verifiers.some(v => !shape(v, ['id', 'signatureRef']) || !ref(v.id) || !ref(v.signatureRef))
        || 2 + receipt.uploadRefs.length + receipt.verifiers.length + (receipt.rateLimitRef ? 1 : 0) > 20) {
        stopped = true; fail('OWNERSHIP_EVIDENCE_REQUIRED');
      }
      const ids = ['userRef', 'accountRef', 'passwordAccountRef', 'ownershipRef'];
      if (new Set(ids.map(k => receipt[k])).size !== ids.length
        || owners.some(o => o && ids.some(k => ids.some(j => o[j] === receipt[k])))) {
        stopped = true; fail('OWNERSHIP_COLLISION');
      }
      const allIds = [...ids.map(k => receipt[k]), ...receipt.uploadRefs,
        ...receipt.verifiers.flatMap(v => [v.id, v.signatureRef]), ...(receipt.rateLimitRef ? [receipt.rateLimitRef] : [])];
      if (new Set(allIds).size !== allIds.length || owners.some(o => o && o.allIds.some(id => allIds.includes(id)))) {
        stopped = true; fail('OWNERSHIP_COLLISION');
      }
      owners[receipt.slot] = { ...receipt, uploadRefs: [...receipt.uploadRefs],
        verifiers: receipt.verifiers.map(v => ({ ...v })), allIds }; pending = null;
      return { ...flags, code: 'FIXTURE_OWNERSHIP_RECORDED' };
    },
    pendingReconciliationPlan(b, at) {
      check(b, at);
      if (!stopped || !pending) fail('PENDING_OPERATION_REQUIRED');
      return { ...flags, ...saved, pending: { ...pending }, maxOperations: 1, maxBackendReads: 21,
        query: { table: 'authAccounts', index: 'providerAndAccountId',
          equal: { provider: 'password', accountId: pending.passwordAccountRef }, take: 21 },
        ownershipEstablished: false, replayAllowed: false };
    },
    unknownOutcome(b, at) { check(b, at); if (!pending) fail('PENDING_OPERATION_REQUIRED'); stopped = true; return snapshot(); },
    denyAdmission(b, at, nextEpoch) {
      check(b, at); running();
      if (pending || owners.some(o => !o)) fail('COHORT_OWNERSHIP_REQUIRED');
      if (!uint(nextEpoch) || nextEpoch !== epoch + 1) fail('FENCE_EPOCH_INVALID');
      epoch = nextEpoch; fenced = true; drained = false; captured = false;
      return { ...flags, version: 1, epoch, denied: true };
    },
    // Generic outward denial; diagnostic codes belong only in a private offline report.
    admission(b, at, request) {
      try {
        check(b, at);
        if (!shape(request, ['entryPoint', 'slot', 'epoch']) || !entryPoints.includes(request.entryPoint)
          || ![0, 1].includes(request.slot) || request.epoch !== epoch) fail('ADMISSION_DENIED');
      } catch { /* All malformed, stale, noncohort and unavailable states deny. */ }
      return { ...flags, allowed: false, code: 'AUTH_UNAVAILABLE' };
    },
    captureSelectors(b, at, selectors) {
      check(b, at); running();
      if (!fenced || captured) fail('FENCE_SEQUENCE_INVALID');
      if (!Array.isArray(selectors) || selectors.length !== 2 || !selectors.every(a => array(a, 20))
        || new Set(selectors.flat()).size !== selectors.flat().length) fail('SESSION_SELECTORS_REQUIRED');
      for (let i = 0; i < 2; i++) {
        if (sessionRefs[i].some(s => !selectors[i].includes(s))) fail('SELECTOR_DRIFT');
        if (selectors[i].some(s => owners.some(o => o.allIds.includes(s)))
          || 2 + owners[i].uploadRefs.length + owners[i].verifiers.length
            + (owners[i].rateLimitRef ? 1 : 0) + selectors[i].length > 20) fail('INVENTORY_OVERFLOW');
      }
      for (let i = 0; i < 2; i++) sessionRefs[i] = [...selectors[i]];
      captured = true;
    },
    drainAdmissions(b, at, receipt) {
      check(b, at); running();
      if (!captured || !shape(receipt, ['epoch', 'inFlight', 'evidenceRef']) || receipt.epoch !== epoch
        || receipt.inFlight !== 0 || !ref(receipt.evidenceRef)) fail('ADMISSION_DRAIN_REQUIRED');
      drained = true;
      return { ...flags, code: 'FIXTURE_DRAIN_ASSERTED' };
    },
    // Exact query specifications only; caller cannot substitute a selector or issue a broad scan.
    reconciliationPlan(b, at, slot) {
      check(b, at); const o = owner(slot);
      if (!captured || !drained) fail('ADMISSION_DRAIN_REQUIRED');
      const plan = [];
      const add = (table, index, equal) => plan.push({ table, index, equal, take: 21 });
      add('users', 'point', { id: o.userRef });
      add('authAccounts', 'providerAndAccountId', { provider: 'password', accountId: o.passwordAccountRef });
      add('authAccounts', 'userIdAndProvider', { userId: o.userRef, provider: 'password' });
      add('authSessions', 'userId', { userId: o.userRef });
      for (const sessionId of sessionRefs[slot]) add('authRefreshTokens', 'sessionIdAndParentRefreshTokenId', { sessionId });
      add('authVerificationCodes', 'accountId', { accountId: o.accountRef });
      for (const v of o.verifiers) add('authVerifiers', 'point', { id: v.id, signatureRef: v.signatureRef });
      for (const id of o.uploadRefs) add('cadUploadSessions', 'point', { id });
      // Optional sessionId and expiry-wide scans never establish ownership.
      add('authRateLimits', 'identifier', { identifier: o.passwordAccountRef });
      add('cadUserAuthority', 'by_userId', { userId: o.userRef });
      add('cadMemberships', 'by_userId_and_shopId', { userId: o.userRef });
      return { ...flags, epoch, slot, queries: plan, maxOperations: plan.length, maxBackendReads: plan.length * 21,
        unregisteredRows: 'GLOBAL_ABSENCE_UNPROVEN' };
    },
    inspectReconciliation(b, at, slot, responses) {
      const plan = this.reconciliationPlan(b, at, slot), o = owner(slot);
      const deny = code => { stopped = true; return { ...flags, packetValid: false, code }; };
      if (!Array.isArray(responses) || responses.length !== plan.queries.length) return deny('BOUNDED_READ_REQUIRED');
      const seen = new Map(); let total = 0;
      for (let i = 0; i < responses.length; i++) {
        const r = responses[i], q = plan.queries[i];
        if (!shape(r, ['query', 'rows', 'complete', 'backendReads'])
          || JSON.stringify(r.query) !== JSON.stringify(q) || r.complete !== true
          || !uint(r.backendReads) || r.backendReads > q.take || !Array.isArray(r.rows)
          || r.rows.length > r.backendReads) return deny('BOUNDED_READ_REQUIRED');
        if (r.rows.length >= q.take) return deny('INVENTORY_OVERFLOW');
        const queryIds = new Set();
        for (const row of r.rows) {
          if (!shape(row, ['id', ...Object.keys(q.equal).filter(k => k !== 'id'), 'ownershipRef'])
            || !ref(row.id) || row.ownershipRef !== o.ownershipRef
            || Object.entries(q.equal).some(([k, v]) => row[k] !== v)) return deny('SELECTOR_OWNERSHIP_INVALID');
          if (q.table === 'authAccounts' && row.id !== o.accountRef) return deny('OWNERSHIP_COLLISION');
          if (q.table === 'authRateLimits' && row.id !== o.rateLimitRef) return deny('RATE_LIMIT_PROVENANCE_REQUIRED');
          if (q.table === 'authSessions' && !sessionRefs[slot].includes(row.id)) return deny('SELECTOR_DRIFT');
          const key = q.table + ':' + row.id;
          if (queryIds.has(row.id)) return deny('INVENTORY_DRIFT');
          queryIds.add(row.id);
          if (!seen.has(key)) { seen.set(key, row.ownershipRef); total++; }
          else if (seen.get(key) !== row.ownershipRef) return deny('INVENTORY_DRIFT');
        }
        if (total > 20) return deny('INVENTORY_OVERFLOW');
      }
      // Unindexed tables and external writes remain unproven; this is never terminal acceptance.
      return { ...flags, packetValid: true, code: 'FIXTURE_INDEXED_INVENTORY_ONLY', selectedRecords: total,
        terminalReady: false, unregisteredRows: plan.unregisteredRows };
    },
    inspectRetained(b, at, packet) {
      check(b, at); running();
      const deny = code => ({ ...flags, packetValid: false, code, state: 'FIXTURE_BLOCKED_RECONCILIATION_REQUIRED' });
      if (!drained || pending) return deny('ADMISSION_DRAIN_REQUIRED');
      const result = inspectRetainedTerminalFixture(packet, at);
      if (!result.packetValid) return result;
      const m = packet.retention;
      if (m.runRef !== saved.runRef || m.sourceSha !== saved.sourceSha || m.destinationRef !== saved.destinationRef
        || m.custodianRef !== saved.custodianRef || Date.parse(m.createdAtUtc) !== startAt
        || Date.parse(m.reviewAtUtc) !== reviewAt || Date.parse(m.expiresAtUtc) !== expiresAt) return deny('BINDING_MISMATCH');
      for (let slot = 0; slot < 2; slot++) {
        const s = m.slots[slot], o = owner(slot);
        if (s.ownershipRef !== o.ownershipRef || s.selectors.users[0] !== o.userRef
          || s.selectors.authAccounts[0] !== o.accountRef
          || (s.counts.authRateLimits === 1 && s.selectors.authRateLimits[0] !== o.rateLimitRef)) return deny('RETAINED_OWNERSHIP_UNPROVEN');
        if (packet.receipts.slice(1).some(r => JSON.stringify(r.sessionSelectorRefs[slot]) !== JSON.stringify(sessionRefs[slot])))
          return deny('SELECTOR_DRIFT');
      }
      return { ...flags, ...result };
    },
  });
}
module.exports = { createLockoutPrivateFixture, inspectRollbackFixture, entryPoints };
