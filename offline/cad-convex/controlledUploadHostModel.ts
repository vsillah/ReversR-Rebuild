// Pure source model: proposals never authorize IO and are not durable receipts.
import type { Infer } from 'convex/values';
import type { grantBinding, operation, role, authorityGenerations } from '../../convex/cadControlledUploadSchema';
import type { Doc, Id } from '../../convex/_generated/dataModel';
type Row<T extends keyof import('../../convex/_generated/dataModel').DataModel> = Omit<Doc<T>, '_id' | '_creationTime'>;
export type Binding = Infer<typeof grantBinding>;
export type Operation = Infer<typeof operation>;
export type Role = Infer<typeof role>;
export type Generations = Infer<typeof authorityGenerations>;
export type Grant = Row<'cadControlledUploadGrants'>;
export type Scope = Row<'cadControlledUploadScopes'>;
export type Attempt = Row<'cadControlledUploadAttempts'>;
export type Tombstone = Row<'cadControlledUploadSessionTombstones'>;
export type Receipt = Row<'cadControlledUploadReceipts'>;
export type Principal = Row<'cadControlledUploadHostPrincipals'>;
export type Snapshot = { grantId: Id<'cadControlledUploadGrants'>; scopeId: Id<'cadControlledUploadScopes'>;
  attemptId: Id<'cadControlledUploadAttempts'> | null; grant: Grant; scope: Scope;
  attempt: Attempt | null; tombstone: Tombstone | null };
export type Authority = { active: boolean; expiresAtMs: number; generations: Generations; generationsComplete: boolean };
export type Command = { operation: Operation; bindingDigest: string; expectedRevision: number;
  requestNonceDigest: string; expectedPrincipalGeneration: number; custodyEpochDigest: string };
export const OPERATIONS: readonly Operation[] = ['claimRun', 'claimAttempt', 'armRollback',
  'openBodyAdmissionFence', 'consumeAttemptBeforeBodyRead', 'markUnknown', 'closeBodyAdmissionFence', 'revokeSessionAndLateGrants'];
export const BINDING_FIELDS = ['schemaVersion', 'resourceBindingDigest', 'approvedRunId', 'cohortRef',
  'deploymentReference', 'deploymentTarget', 'gitCommitSha', 'commandCardSha256', 'installationSha256',
  'durableEvidenceSha256', 'durableServiceRef', 'credentialDigest', 'supplyReceiptSha256', 'userId', 'shopId',
  'loginSessionId', 'sessionId', 'route', 'windowStartMs', 'windowEndMs', 'grantDeadlineMs',
  'validatorEnvelopeSha256', 'approvalRecordSha256', 'maxRuns', 'maxSessions', 'maxAttempts', 'maxRetries',
  'conversionAuthorized', 'sandboxAuthorized', 'privateCredentialSupplyRef', 'productionAlias', 'sessionRef'] as const;
const generationKeys = ['login', 'user', 'membership', 'uploadSession', 'hostPrincipal', 'grant'];
export const uint = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
export const digest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const ref = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,255}$/.test(v);
// Reject accessors, symbols, custom prototypes, cycles, unsupported values and excessive depth BEFORE reading properties.
export function plain(value: unknown, depth = 0, ancestors: object[] = []): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.includes(value)) return false;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
  const fields = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(fields).some(k => typeof k !== 'string')) return false;
  if (Array.isArray(value) && (Object.keys(fields).length !== value.length + 1
    || Object.keys(fields).some(k => k !== 'length' && !/^(0|[1-9][0-9]*)$/.test(k)))) return false;
  return Object.entries(fields).every(([key, d]) => {
    if (Array.isArray(value) && key === 'length') return uint(d.value) && d.value <= 128;
    return Object.hasOwn(d, 'value') && d.enumerable && plain(d.value, depth + 1, [...ancestors, value]);
  });
}
export function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return plain(value) && value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export async function hash(values: readonly unknown[]): Promise<string> {
  // WebCrypto is used only as a deterministic digest primitive, never as host qualification.
  if (!plain(values)) throw Error('HASH_INPUT_INVALID');
  const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical)
    : v !== null && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort()
      .map(k => [k, canonical((v as Record<string, unknown>)[k])])) : v;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(values)));
  const out = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(out), n => n.toString(16).padStart(2, '0')).join('');
}
export function validBinding(raw: unknown): raw is Binding {
  if (!exact(raw, BINDING_FIELDS)) return false;
  const b = raw as Binding;
  const hashes = ['resourceBindingDigest', 'commandCardSha256', 'installationSha256', 'durableEvidenceSha256',
    'credentialDigest', 'supplyReceiptSha256', 'validatorEnvelopeSha256', 'approvalRecordSha256'] as const;
  if (!hashes.every(k => digest(b[k])) || !/^[a-f0-9]{40}$/.test(b.gitCommitSha)) return false;
  for (const key of ['deploymentTarget', 'productionAlias'] as const) {
    try { const url = new URL(b[key]); if (url.protocol !== 'https:' || url.origin !== b[key] || url.username || url.password) return false; }
    catch { return false; }
  }
  const refs = ['approvedRunId', 'cohortRef', 'deploymentReference', 'durableServiceRef', 'userId', 'shopId',
    'loginSessionId', 'sessionId', 'sessionRef', 'privateCredentialSupplyRef'] as const;
  return refs.every(k => ref(b[k])) && b.schemaVersion === 1 && b.route === 'POST /api/cad/user-import'
    && uint(b.windowStartMs) && uint(b.windowEndMs) && uint(b.grantDeadlineMs)
    && b.windowStartMs < b.grantDeadlineMs && b.grantDeadlineMs <= b.windowEndMs
    && b.windowEndMs - b.windowStartMs <= 1800000
    && b.maxRuns === 1 && b.maxSessions === 1 && b.maxAttempts === 1 && b.maxRetries === 0
    && b.conversionAuthorized === false && b.sandboxAuthorized === false;
}
export async function keys(raw: unknown) {
  if (!validBinding(raw)) throw Error('BINDING_INVALID');
  const b = clone(raw); // capture all primitives before the first await
  const bindingDigest = await hash(['controlled-binding-v1', ...BINDING_FIELDS.map(k => b[k])]);
  const scopeKey = await hash(['controlled-scope-v1', b.resourceBindingDigest, b.cohortRef]);
  return { bindingDigest, grantKey: bindingDigest, scopeKey,
    runKey: await hash(['controlled-run-v1', scopeKey, b.approvedRunId]),
    sessionKey: await hash(['controlled-session-v1', b.resourceBindingDigest, b.sessionId]) };
}
const scopeKeys = ['scopeKey','approvedRunId','runKey','grantId','sessionKey','currentBindingDigest','revision',
  'authorityGeneration','lastHostTimeMs','custodyEpochDigest','runSpent','revoked','permanentStop','stopReason','grantHistoryDigests'];
const attemptKeys = ['scopeId','grantId','runKey','sessionKey','requestNonceDigest','bindingDigest','revision','attemptSpent',
  'rollbackArmed','fenceOpenedOnce','fenceOpen','consumed','closed','revoked','unknown','deadlineMs','authorityGenerations',
  'recoveryState','recoveryDueAtMs','lastReceiptSequence'];
const tombKeys = ['sessionKey','scopeId','runKey','bindingDigest','spent','consumed','revoked','createdAtMs'];
const principalKeys = ['principalKey','verifiedIssuer','verifiedAudience','verifiedSubjectDigest','role',
  'resourceBindingDigest','active','generation','expiresAtMs','approvedPolicyDigest'];
function validGenerations(g: unknown): g is Generations { return exact(g, generationKeys) && Object.values(g).every(uint); }
export async function validSnapshot(raw: unknown): Promise<boolean> {
  if (!exact(raw, ['grantId','scopeId','attemptId','grant','scope','attempt','tombstone'])) return false;
  const s = clone(raw) as Snapshot;
  if (!ref(s.grantId) || !ref(s.scopeId) || (s.attemptId !== null && !ref(s.attemptId))
    || !exact(s.grant, ['grantKey','scopeKey','runKey','bindingDigest','binding','installedByPrincipalId','installedAtMs'])
    || !validBinding(s.grant.binding) || !uint(s.grant.installedAtMs) || !ref(s.grant.installedByPrincipalId)
    || !exact(s.scope, scopeKeys)) return false;
  const k = await keys(s.grant.binding), q = s.scope;
  if (s.grant.grantKey !== k.grantKey || s.grant.bindingDigest !== k.bindingDigest || s.grant.runKey !== k.runKey
    || s.grant.scopeKey !== k.scopeKey || q.scopeKey !== k.scopeKey || q.runKey !== k.runKey
    || q.sessionKey !== k.sessionKey || q.currentBindingDigest !== k.bindingDigest || q.grantId !== s.grantId
    || q.approvedRunId !== s.grant.binding.approvedRunId || !uint(q.revision) || !uint(q.authorityGeneration)
    || !uint(q.lastHostTimeMs) || !digest(q.custodyEpochDigest)
    || ![q.runSpent,q.revoked,q.permanentStop].every(v => typeof v === 'boolean')
    || ![null,'unknown','clock-regression','restore','duplicate','revoked','expired'].includes(q.stopReason)
    || (q.stopReason !== null) !== q.permanentStop || (q.revoked && !q.permanentStop)
    || !Array.isArray(q.grantHistoryDigests) || q.grantHistoryDigests.length !== 1 || q.grantHistoryDigests[0] !== k.bindingDigest) return false;
  if (!q.runSpent) return s.attempt === null && s.tombstone === null && s.attemptId === null;
  const a = s.attempt, t = s.tombstone;
  if (!a || !t || !s.attemptId || !exact(a, attemptKeys) || !exact(t, tombKeys)) return false;
  if (a.scopeId !== s.scopeId || a.grantId !== s.grantId || a.runKey !== k.runKey || a.sessionKey !== k.sessionKey
    || a.bindingDigest !== k.bindingDigest || t.scopeId !== s.scopeId || t.runKey !== k.runKey
    || t.sessionKey !== k.sessionKey || t.bindingDigest !== k.bindingDigest || t.spent !== true
    || !digest(a.requestNonceDigest) || !uint(a.revision) || a.revision !== q.revision
    || !uint(a.lastReceiptSequence) || a.lastReceiptSequence !== q.revision || !uint(a.deadlineMs)
    || a.deadlineMs > s.grant.binding.grantDeadlineMs || a.deadlineMs <= s.grant.binding.windowStartMs
    || !uint(a.recoveryDueAtMs) || !uint(t.createdAtMs) || !validGenerations(a.authorityGenerations)
    || ![a.attemptSpent,a.rollbackArmed,a.fenceOpenedOnce,a.fenceOpen,a.consumed,a.closed,a.revoked,a.unknown,t.consumed,t.revoked].every(v => typeof v === 'boolean')) return false;
  return (!a.rollbackArmed || a.attemptSpent) && (!a.fenceOpenedOnce || a.rollbackArmed)
    && (!a.fenceOpen || (a.fenceOpenedOnce && !a.closed && !a.revoked && !a.unknown))
    && (!a.consumed || a.fenceOpenedOnce) && a.consumed === t.consumed && a.revoked === t.revoked
    && (!a.revoked || (a.closed && q.revoked)) && (!a.unknown || q.permanentStop)
    && (a.recoveryState === 'pending' || a.recoveryState === 'unknown'
      || (a.recoveryState === 'closed-revoked' && a.closed && a.revoked));
}
export const closed = (code = 'CONTROLLED_UPLOAD_HOST_UNQUALIFIED') => Object.freeze({
  code, sourceOnly: true as const, modelAccepted: false, hostQualified: false as const,
  bodyAdmissionAuthorized: false as const, liveReady: false as const, costs: 0 as const,
});
export type Plan = { scope: Scope; attempt: Attempt; tombstone: Tombstone;
  receipt: Omit<Receipt, 'attemptId'> };
export async function transition(snapshot: unknown, command: unknown, principal: unknown, authority: unknown, now: number)
  : Promise<Omit<ReturnType<typeof closed>, 'modelAccepted'> & { modelAccepted: boolean; plan?: Plan }> {
  try {
    if (!plain(snapshot) || !exact(command, ['operation','bindingDigest','expectedRevision','requestNonceDigest','expectedPrincipalGeneration','custodyEpochDigest'])
      || !exact(principal, principalKeys) || !exact(authority, ['active','expiresAtMs','generations','generationsComplete']) || !uint(now)) return closed('INPUT_INVALID');
    const s = clone(snapshot) as Snapshot, c = clone(command) as Command, p = clone(principal) as Principal,
      auth = clone(authority) as Authority;
    if (!await validSnapshot(s)) return closed('STATE_INVALID');
    const recovery = ['markUnknown','closeBodyAdmissionFence','revokeSessionAndLateGrants'].includes(c.operation);
    if (!OPERATIONS.includes(c.operation) || !uint(c.expectedRevision) || !digest(c.requestNonceDigest)
      || !uint(c.expectedPrincipalGeneration) || !digest(c.custodyEpochDigest) || c.bindingDigest !== s.grant.bindingDigest
      || c.custodyEpochDigest !== s.scope.custodyEpochDigest || c.expectedRevision !== s.scope.revision) return closed('BINDING_OR_REVISION_REJECTED');
    if (!ref(p.verifiedIssuer) || !ref(p.verifiedAudience) || !digest(p.verifiedSubjectDigest) || !digest(p.approvedPolicyDigest)
      || !digest(p.principalKey) || p.active !== true || !uint(p.generation) || p.generation !== c.expectedPrincipalGeneration
      || !uint(p.expiresAtMs) || p.expiresAtMs <= now || p.resourceBindingDigest !== s.grant.binding.resourceBindingDigest
      || p.role !== (recovery ? 'recovery' : 'writer')) return closed('PRINCIPAL_REJECTED');
    if (p.principalKey !== await hash(['controlled-principal-v1',p.verifiedIssuer,p.verifiedAudience,p.verifiedSubjectDigest,p.role,p.resourceBindingDigest])) return closed('PRINCIPAL_REJECTED');
    if (s.scope.revision >= Number.MAX_SAFE_INTEGER || (c.operation === 'revokeSessionAndLateGrants'
      && s.scope.authorityGeneration >= Number.MAX_SAFE_INTEGER)) return closed('REVISION_EXHAUSTED');
    if (!recovery && (s.scope.permanentStop || s.scope.revoked || now < s.scope.lastHostTimeMs
      || now < s.grant.binding.windowStartMs || now >= s.grant.binding.grantDeadlineMs
      || auth.active !== true || auth.generationsComplete !== true || !uint(auth.expiresAtMs) || now >= auth.expiresAtMs
      || !validGenerations(auth.generations) || auth.generations.hostPrincipal !== p.generation
      || auth.generations.grant !== s.scope.authorityGeneration)) return closed('AUTHORITY_OR_TIME_REJECTED');
    if (!recovery && s.attempt && generationKeys.some(k => auth.generations[k as keyof Generations] !== s.attempt!.authorityGenerations[k as keyof Generations])) return closed('GENERATION_CHANGED');
    let a = s.attempt, t = s.tombstone;
    if (c.operation === 'claimRun') {
      if (s.scope.runSpent || a || t) return closed('RUN_SPENT');
      s.scope.runSpent = true;
      a = { scopeId: s.scopeId, grantId: s.grantId, runKey: s.scope.runKey, sessionKey: s.scope.sessionKey,
        requestNonceDigest: c.requestNonceDigest, bindingDigest: c.bindingDigest, revision: 0,
        attemptSpent: false, rollbackArmed: false, fenceOpenedOnce: false, fenceOpen: false, consumed: false,
        closed: false, revoked: false, unknown: false, deadlineMs: Math.min(s.grant.binding.grantDeadlineMs, auth.expiresAtMs),
        authorityGenerations: clone(auth.generations), recoveryState: 'pending', recoveryDueAtMs: now, lastReceiptSequence: 0 };
      t = { sessionKey: s.scope.sessionKey, scopeId: s.scopeId, runKey: s.scope.runKey,
        bindingDigest: c.bindingDigest, spent: true, consumed: false, revoked: false, createdAtMs: now };
    } else {
      if (!a || !t || a.requestNonceDigest !== c.requestNonceDigest) return closed('ATTEMPT_MISSING_OR_MISMATCHED');
      if (!recovery && (a.closed || a.revoked || a.unknown || a.consumed || now >= a.deadlineMs)) return closed('ATTEMPT_TERMINAL');
      if (c.operation === 'claimAttempt') { if (a.attemptSpent) return closed('ATTEMPT_SPENT'); a.attemptSpent = true; }
      if (c.operation === 'armRollback') { if (!a.attemptSpent || a.rollbackArmed) return closed('SEQUENCE_REJECTED'); a.rollbackArmed = true; }
      if (c.operation === 'openBodyAdmissionFence') {
        if (!a.rollbackArmed || a.fenceOpenedOnce) return closed('SEQUENCE_REJECTED'); a.fenceOpenedOnce = true; a.fenceOpen = true;
      }
      if (c.operation === 'consumeAttemptBeforeBodyRead') {
        if (!a.rollbackArmed || !a.fenceOpen || a.consumed) return closed('SEQUENCE_REJECTED'); a.consumed = true; t.consumed = true;
      }
      if (c.operation === 'markUnknown') { a.unknown = true; a.fenceOpen = false; a.recoveryState = 'unknown'; s.scope.permanentStop = true; s.scope.stopReason = 'unknown'; }
      if (c.operation === 'closeBodyAdmissionFence') { a.closed = true; a.fenceOpen = false; }
      if (c.operation === 'revokeSessionAndLateGrants') {
        a.closed = true; a.fenceOpen = false; a.revoked = true; t.revoked = true;
        s.scope.revoked = true; s.scope.permanentStop = true; s.scope.stopReason = 'revoked'; s.scope.authorityGeneration++;
      }
    }
    if (a.closed && a.revoked) a.recoveryState = 'closed-revoked';
    const beforeRevision = s.scope.revision++;
    s.scope.lastHostTimeMs = Math.max(s.scope.lastHostTimeMs, now);
    a.revision = s.scope.revision; a.lastReceiptSequence = s.scope.revision;
    const receipt: Plan['receipt'] = {
      operationKey: await hash(['controlled-operation-v1',s.scope.runKey,c.operation,c.requestNonceDigest]),
      scopeId: s.scopeId, bindingDigest: c.bindingDigest, requestNonceDigest: c.requestNonceDigest,
      operation: c.operation, sequence: s.scope.revision, beforeRevision, afterRevision: s.scope.revision,
      authorityGeneration: s.scope.authorityGeneration, principalGeneration: p.generation, evaluatedAtMs: now,
      deadlineMs: a.deadlineMs, outcome: recovery ? 'committed-restrictive' : 'committed-forward',
      resultDigest: await hash(['controlled-result-v1', s.scope, a, t]), custodyEpochDigest: c.custodyEpochDigest, commitOrdering: null,
    };
    // No read permit, independent verifier approval, or live durable claim is produced.
    return { ...closed('SYNTHETIC_SOURCE_PLAN'), modelAccepted: true, plan: { scope: s.scope, attempt: a, tombstone: t, receipt } };
  } catch { return closed('SOURCE_MODEL_REJECTED'); }
}
