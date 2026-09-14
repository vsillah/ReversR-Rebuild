// Bounded durable-engine transaction contract. The host store must execute each
// method inside one serializable transaction. No transport, environment or SDK.
const { emptyState, transition } = require('./sharedUploadControls');
const { blocked } = require('./durableAdapter');

const AUTHORITY_KINDS = Object.freeze(['login', 'upload-session', 'membership', 'permission']);
const SCOPE_KEYS = Object.freeze(['resourceBindingDigest', 'namespaceDigest', 'runDigest',
  'ledgerDigest', 'windowDigest', 'fenceDigest']);
const BINDING_KEYS = Object.freeze(['userId', 'shopId', 'sessionId', 'loginSessionId']);
const MAX_RECORDS = 64;
const MAX_PAGE = 32;
const MAX_CLAIM_MS = 60000;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const same = (a, b, keys) => keys.every(key => a[key] === b[key]);
const validScope = value => exact(value, SCOPE_KEYS) && SCOPE_KEYS.every(key => digest(value[key]));
const validBinding = value => exact(value, BINDING_KEYS) && BINDING_KEYS.every(key => id(value[key]));
const validSelector = value => exact(value, ['scope', 'binding', 'key', 'fence', 'selectorDigest'])
  && validScope(value.scope) && validBinding(value.binding) && id(value.key)
  && Number.isSafeInteger(value.fence) && value.fence > 0 && digest(value.selectorDigest);
const safe = (code, values = {}) => Object.freeze({ ...blocked(), engineAccepted: false, code, ...values });

function validPolicy(policy) {
  try {
    const state = emptyState(policy);
    return state.records.length === 0 && policy.userAttempts <= MAX_RECORDS
      && policy.shopAttempts <= MAX_RECORDS;
  } catch { return false; }
}
function validStore(store) {
  return store && ['readLedger', 'insertLedger', 'writeLedger', 'readAuthority',
    'insertAuthority', 'writeAuthority'].every(name => typeof store[name] === 'function');
}
function clock(now, deadlineAt) {
  const value = now();
  if (!integer(value) || !integer(deadlineAt) || deadlineAt <= value
    || deadlineAt - value > 5000) throw new Error('ENGINE_INVALID');
  return value;
}
function authorityRevision(rows) {
  if (!Array.isArray(rows) || rows.length !== AUTHORITY_KINDS.length) return null;
  const byKind = new Map();
  for (const row of rows) {
    if (!row || !AUTHORITY_KINDS.includes(row.kind) || byKind.has(row.kind)
      || !validBinding(row.binding) || typeof row.active !== 'boolean'
      || !integer(row.generation) || !integer(row.expiresAt)) return null;
    byKind.set(row.kind, row);
  }
  if (AUTHORITY_KINDS.some(kind => !byKind.has(kind))) return null;
  const values = [...byKind.values()];
  const revision = values.reduce((sum, row) => sum + row.generation, 0);
  return Number.isSafeInteger(revision) ? { values, revision } : null;
}
function selectorFor(ledger, binding, key, fence) {
  return ledger.selectors.find(row => row.key === key && row.fence === fence
    && same(row.binding, binding, BINDING_KEYS));
}
function recordFor(ledger, selector) {
  const stored = selectorFor(ledger, selector.binding, selector.key, selector.fence);
  if (!stored || stored.selectorDigest !== selector.selectorDigest) return null;
  const record = ledger.controlState.records.find(row => row.key === selector.key
    && row.fence === selector.fence && same(row.binding, selector.binding, BINDING_KEYS));
  return record ? { stored, record } : null;
}
function validateLedger(ledger, scope) {
  return ledger && same(ledger, scope, SCOPE_KEYS) && ledger.controlState
    && Array.isArray(ledger.selectors) && Array.isArray(ledger.receipts)
    && Array.isArray(ledger.claims) && Array.isArray(ledger.cursors)
    && typeof ledger.stopped === 'boolean';
}
function receipt(outcome, beforeRevision, afterRevision, input, code) {
  return { outcome, beforeRevision, afterRevision, selectorDigest: input.selectorDigest,
    commandDigest: input.commandDigest, proposalDigest: input.proposalDigest,
    code, recordedAt: input.recordedAt };
}

function createDurableEngine({ store, now = Date.now, verifyIndependentEvidence = () => false } = {}) {
  if (!validStore(store) || typeof now !== 'function' || typeof verifyIndependentEvidence !== 'function')
    throw new Error('ENGINE_INVALID');
  async function ledger(scope) {
    if (!validScope(scope)) throw new Error('ENGINE_INVALID');
    const value = await store.readLedger(scope);
    return validateLedger(value, scope) ? value : null;
  }
  async function authority(value, binding, at) {
    const rows = authorityRevision(await store.readAuthority(value._id, binding));
    if (!rows || rows.values.some(row => !same(row.binding, binding, BINDING_KEYS)
      || !row.active || row.expiresAt <= at)) return null;
    return { ...binding, revision: rows.revision, active: true, allowed: true,
      expiresAt: Math.min(...rows.values.map(row => row.expiresAt)) };
  }
  return Object.freeze({
    async initialize(input) {
      try {
        if (!exact(input, ['scope', 'policy', 'binding', 'authority', 'deadlineAt'])
          || !validScope(input.scope) || !validPolicy(input.policy) || !validBinding(input.binding)
          || !Array.isArray(input.authority) || input.authority.length !== AUTHORITY_KINDS.length) throw Error();
        const at = clock(now, input.deadlineAt);
        if (await ledger(input.scope)) return safe('RUN_ALREADY_EXISTS');
        const rows = input.authority.map(row => {
          if (!exact(row, ['kind', 'generation', 'active', 'expiresAt'])
            || !AUTHORITY_KINDS.includes(row.kind) || !integer(row.generation)
            || row.active !== true || !integer(row.expiresAt) || row.expiresAt <= at) throw Error();
          return { ...row, binding: { ...input.binding } };
        });
        if (new Set(rows.map(row => row.kind)).size !== AUTHORITY_KINDS.length) throw Error();
        const created = await store.insertLedger({ ...input.scope, controlState: emptyState(input.policy),
          selectors: [], receipts: [], claims: [], cursors: [], stopped: false });
        for (const row of rows) await store.insertAuthority(created._id, row);
        return safe('RUN_INITIALIZED', { engineAccepted: true, changed: true, revision: 0 });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async readExact(input) {
      try {
        if (!exact(input, ['selector', 'deadlineAt']) || !validSelector(input.selector)) throw Error();
        clock(now, input.deadlineAt);
        const value = await ledger(input.selector.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        const found = recordFor(value, input.selector);
        if (!found) return safe('SELECTOR_NOT_FOUND', { revision: value.controlState.revision });
        return safe('SELECTOR_FOUND', { engineAccepted: true, revision: value.controlState.revision,
          fence: found.record.fence, status: found.record.status, outcome: found.record.outcome });
      } catch { return safe('ENGINE_INVALID'); }
    },
    async readAuthority(input) {
      try {
        if (!exact(input, ['scope', 'binding', 'deadlineAt']) || !validScope(input.scope)
          || !validBinding(input.binding)) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.scope);
        if (!value || value.stopped) return safe(value ? 'RUN_STOPPED' : 'RUN_NOT_FOUND');
        const current = await authority(value, input.binding, at);
        return current ? safe('AUTHORITY_ACTIVE', { engineAccepted: true,
          revision: value.controlState.revision, authorityRevision: current.revision })
          : safe('AUTHORITY_REJECTED', { revision: value.controlState.revision });
      } catch { return safe('ENGINE_INVALID'); }
    },
    async transact(input) {
      try {
        if (!exact(input, ['scope', 'expectedRevision', 'selectorDigest', 'commandDigest',
          'proposalDigest', 'command', 'deadlineAt']) || !validScope(input.scope)
          || !integer(input.expectedRevision) || !digest(input.selectorDigest)
          || !digest(input.commandDigest) || !digest(input.proposalDigest)) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        if (value.stopped) return safe('RUN_STOPPED', { revision: value.controlState.revision });
        const before = value.controlState.revision;
        if (before !== input.expectedRevision) return safe('CONFLICT', { revision: before });
        if (!input.command || !validBinding(input.command.binding) || !id(input.command.key)) throw Error();
        const current = await authority(value, input.command.binding, at);
        if (!current) return safe('AUTHORITY_REJECTED', { revision: before });
        if (input.command.type !== 'reserve') {
          const prior = selectorFor(value, input.command.binding, input.command.key, input.command.fence);
          if (!prior || prior.selectorDigest !== input.selectorDigest) return safe('SELECTOR_REJECTED', { revision: before });
        }
        const proposed = transition(value.controlState, input.command, current, at);
        if (!proposed.ok) return safe(proposed.code, { revision: before });
        if (!proposed.changed) return safe('IDEMPOTENT', { engineAccepted: true, changed: false,
          revision: before, fence: proposed.fence, status: proposed.status });
        const next = { ...value, controlState: proposed.state,
          selectors: value.selectors.map(row => ({ ...row, binding: { ...row.binding } })),
          receipts: [...value.receipts], claims: [...value.claims], cursors: [...value.cursors] };
        if (input.command.type === 'reserve') next.selectors.push({ binding: { ...input.command.binding },
          key: input.command.key, fence: proposed.fence, selectorDigest: input.selectorDigest,
          commandDigest: input.commandDigest });
        next.receipts.push(receipt('COMMITTED', before, proposed.state.revision,
          { ...input, recordedAt: at }, proposed.code));
        await store.writeLedger(value._id, next);
        return safe('COMMITTED', { engineAccepted: true, changed: true,
          revision: proposed.state.revision, fence: proposed.fence, status: proposed.status });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async changeAuthority(input) {
      try {
        if (!exact(input, ['scope', 'binding', 'kind', 'expectedGeneration', 'deadlineAt'])
          || !validScope(input.scope) || !validBinding(input.binding)
          || !AUTHORITY_KINDS.includes(input.kind) || !integer(input.expectedGeneration)) throw Error();
        clock(now, input.deadlineAt);
        const value = await ledger(input.scope);
        if (!value || value.stopped) return safe(value ? 'RUN_STOPPED' : 'RUN_NOT_FOUND');
        const rows = await store.readAuthority(value._id, input.binding);
        const row = rows.find(candidate => candidate.kind === input.kind);
        if (!row) return safe('AUTHORITY_REJECTED');
        if (row.generation !== input.expectedGeneration) return safe('CONFLICT', { authorityRevision: row.generation });
        if (!row.active) return safe('IDEMPOTENT', { engineAccepted: true, changed: false,
          authorityRevision: row.generation });
        if (row.generation === Number.MAX_SAFE_INTEGER) return safe('REVISION_EXHAUSTED');
        await store.writeAuthority(row._id, { active: false, generation: row.generation + 1 });
        return safe('AUTHORITY_REVOKED', { engineAccepted: true, changed: true,
          authorityRevision: row.generation + 1 });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async claim(input) {
      try {
        if (!exact(input, ['selector', 'expectedGeneration', 'ownerDigest', 'expiresAt', 'deadlineAt'])
          || !validSelector(input.selector) || !integer(input.expectedGeneration)
          || !digest(input.ownerDigest) || !integer(input.expiresAt)) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.selector.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        if (value.stopped) return safe('RUN_STOPPED', { revision: value.controlState.revision });
        const found = recordFor(value, input.selector);
        if (!found || found.record.status === 'settled') return safe('SELECTOR_REJECTED');
        if (input.expiresAt <= at || input.expiresAt > at + MAX_CLAIM_MS
          || input.expiresAt > value.controlState.policy.windowEnd) return safe('CLAIM_REJECTED');
        const index = value.claims.findIndex(row => row.selectorDigest === input.selector.selectorDigest);
        const prior = index < 0 ? null : value.claims[index];
        const generation = prior ? prior.generation : 0;
        if (generation !== input.expectedGeneration || (prior && prior.expiresAt > at))
          return safe('CONFLICT', { claimGeneration: generation, revision: value.controlState.revision });
        if (value.controlState.revision === Number.MAX_SAFE_INTEGER) return safe('REVISION_EXHAUSTED');
        const nextGeneration = generation + 1;
        const claim = { selectorDigest: input.selector.selectorDigest, generation: nextGeneration,
          ownerDigest: input.ownerDigest, expiresAt: input.expiresAt };
        const next = { ...value, controlState: { ...value.controlState,
          revision: value.controlState.revision + 1, lastNow: at }, claims: [...value.claims] };
        if (index < 0) next.claims.push(claim); else next.claims[index] = claim;
        await store.writeLedger(value._id, next);
        return safe('CLAIMED', { engineAccepted: true, changed: true, revision: next.controlState.revision,
          claimGeneration: nextGeneration });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async settle(input) {
      try {
        if (!exact(input, ['selector', 'claimGeneration', 'ownerDigest', 'evidence', 'deadlineAt'])
          || !validSelector(input.selector) || !integer(input.claimGeneration)
          || !digest(input.ownerDigest) || !input.evidence) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.selector.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        if (value.stopped) return safe('RUN_STOPPED', { revision: value.controlState.revision });
        const found = recordFor(value, input.selector);
        const claim = value.claims.find(row => row.selectorDigest === input.selector.selectorDigest);
        if (!found || !claim || claim.generation !== input.claimGeneration
          || claim.ownerDigest !== input.ownerDigest || claim.expiresAt <= at) return safe('CLAIM_REJECTED');
        const verified = await verifyIndependentEvidence(input.evidence, input.selector);
        if (!verified || verified.independentEvidenceVerified !== true
          || !digest(verified.evidenceDigest) || verified.evidenceDigest !== input.evidence.evidenceDigest
          || !['not-started', 'completed', 'failed'].includes(verified.outcome)
          || !integer(verified.actualMicros)) return safe('EVIDENCE_UNVERIFIED', { revision: value.controlState.revision });
        const command = { type: 'reconcile', binding: input.selector.binding, key: input.selector.key,
          fence: input.selector.fence, outcome: verified.outcome, actualMicros: verified.actualMicros };
        const proposed = transition(value.controlState, command, {}, at);
        if (!proposed.ok) return safe(proposed.code, { revision: value.controlState.revision });
        if (!proposed.changed) return safe('IDEMPOTENT', { engineAccepted: true, changed: false,
          revision: value.controlState.revision, fence: proposed.fence, status: proposed.status });
        const next = { ...value, controlState: proposed.state, receipts: [...value.receipts,
          { outcome: 'COMMITTED', beforeRevision: value.controlState.revision,
            afterRevision: proposed.state.revision, selectorDigest: input.selector.selectorDigest,
            commandDigest: input.evidence.evidenceDigest, proposalDigest: verified.evidenceDigest,
            code: proposed.code, recordedAt: at }] };
        await store.writeLedger(value._id, next);
        return safe('SETTLED', { engineAccepted: true, changed: true, revision: proposed.state.revision,
          fence: proposed.fence, status: proposed.status, outcome: verified.outcome });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async scanPage(input) {
      try {
        if (!exact(input, ['scope', 'cursor', 'limit', 'custodianDigest', 'deadlineAt'])
          || !validScope(input.scope) || !exact(input.cursor, ['after', 'through'])
          || !integer(input.cursor.after) || !integer(input.cursor.through)
          || input.cursor.through < input.cursor.after || !integer(input.limit)
          || input.limit < 1 || input.limit > MAX_PAGE || !digest(input.custodianDigest)) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        if (value.stopped) return safe('RUN_STOPPED', { revision: value.controlState.revision });
        if (input.cursor.through > value.controlState.revision) return safe('CURSOR_REJECTED');
        const eligible = value.controlState.records.filter(row => row.fence > input.cursor.after
          && row.fence <= input.cursor.through && row.status !== 'settled'
          && (row.status === 'unknown' || row.expiresAt <= at)).sort((a, b) => a.fence - b.fence);
        const rows = eligible.slice(0, input.limit);
        const selectors = rows.map(row => selectorFor(value, row.binding, row.key, row.fence))
          .filter(Boolean).map(row => ({ binding: { ...row.binding }, key: row.key,
            fence: row.fence, selectorDigest: row.selectorDigest }));
        if (selectors.length !== rows.length) return safe('SELECTOR_REJECTED');
        const nextCursor = eligible.length > input.limit
          ? { after: rows.at(-1).fence, through: input.cursor.through } : null;
        if (value.controlState.revision === Number.MAX_SAFE_INTEGER) return safe('REVISION_EXHAUSTED');
        const next = { ...value, controlState: { ...value.controlState,
          revision: value.controlState.revision + 1, lastNow: at }, cursors: [...value.cursors] };
        const index = next.cursors.findIndex(row => row.custodianDigest === input.custodianDigest);
        if (index < 0 && next.cursors.length >= 2) return safe('CURSOR_REJECTED');
        const cursor = { custodianDigest: input.custodianDigest,
          after: nextCursor?.after ?? input.cursor.through, through: input.cursor.through };
        if (index < 0) next.cursors.push(cursor); else next.cursors[index] = cursor;
        await store.writeLedger(value._id, next);
        return safe('PAGE_SCANNED', { engineAccepted: true, changed: true,
          revision: next.controlState.revision, selectors, next: nextCursor });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
    async stop(input) {
      try {
        if (!exact(input, ['scope', 'reasonDigest', 'deadlineAt']) || !validScope(input.scope)
          || !digest(input.reasonDigest)) throw Error();
        const at = clock(now, input.deadlineAt), value = await ledger(input.scope);
        if (!value) return safe('RUN_NOT_FOUND');
        if (value.stopped) return safe('RUN_STOPPED', { engineAccepted: true, changed: false,
          revision: value.controlState.revision });
        if (value.controlState.revision === Number.MAX_SAFE_INTEGER) return safe('REVISION_EXHAUSTED');
        const next = { ...value, stopped: true, stopReasonDigest: input.reasonDigest,
          controlState: { ...value.controlState, revision: value.controlState.revision + 1, lastNow: at } };
        await store.writeLedger(value._id, next);
        return safe('RUN_STOPPED', { engineAccepted: true, changed: true,
          revision: next.controlState.revision });
      } catch { throw new Error('ENGINE_ABORT'); }
    },
  });
}

module.exports = { AUTHORITY_KINDS, SCOPE_KEYS, BINDING_KEYS, MAX_RECORDS, MAX_PAGE,
  MAX_CLAIM_MS, createDurableEngine };
