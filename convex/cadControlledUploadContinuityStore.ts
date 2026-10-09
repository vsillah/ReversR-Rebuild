// Continuity operations exposed only by internal-only host functions. The fixed
// independent verifiers still return null, so registration and forward authority
// projection remain fail-closed.
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import { closed, digest, exact, hash, keys, plain, uint, validBinding, validSnapshot } from '../offline/cad-convex/controlledUploadHostModel';
import type { Attempt, Binding, Principal, Receipt, Snapshot, Tombstone } from '../offline/cad-convex/controlledUploadHostModel';
import { compareContinuityMetadata, verifyIndependentAuthorityContinuity, verifyIndependentRegistrationApproval } from '../offline/cad-convex/controlledUploadAuthorityContinuity';
import type { Observation } from '../offline/cad-convex/controlledUploadAuthorityContinuity';
import { readCandidatePrincipal } from './cadControlledUploadStore';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function one<T>(rows: T[]): T | null {
  if (rows.length > 1 || (rows.length && !plain(rows[0]))) throw Error('SOURCE_ROW_INVALID');
  return rows[0] ?? null;
}
function data<T extends { _id: unknown; _creationTime: number }>(row: T) {
  const { _id, _creationTime, ...rest } = row; return rest;
}
function select<T, K extends keyof T>(row: T | null, fields: readonly K[]): Pick<T, K> | null {
  if (!row || typeof row !== 'object') return null;
  const out = {} as Pick<T, K>;
  for (const key of fields) {
    const d = Object.getOwnPropertyDescriptor(row, key);
    if (!d || !Object.hasOwn(d, 'value') || !plain(d.value)) return null;
    out[key] = d.value;
  }
  return clone(out); // Never enumerate or inspect unrelated account/private fields.
}
function observedOne<T, K extends keyof T>(rows: T[], fields: readonly K[]) {
  if (rows.length > 1) throw Error('SOURCE_ROW_INVALID');
  return select(rows[0] ?? null, fields);
}
export async function observeAuthorityCandidate(db: DatabaseReader, binding: Binding, principal: Principal, grantGeneration: number): Promise<Observation | null> {
  if (!validBinding(binding) || !exact(principal, ['principalKey','verifiedIssuer','verifiedAudience','verifiedSubjectDigest','role',
    'resourceBindingDigest','active','generation','expiresAtMs','approvedPolicyDigest']) || !uint(grantGeneration)
    || !uint(principal.generation) || !uint(principal.expiresAtMs) || principal.resourceBindingDigest !== binding.resourceBindingDigest) return null;
  const b = clone(binding), p = clone(principal);
  if (p.role !== 'writer' && p.role !== 'grant-custodian') return null;
  const user = observedOne(await db.query('cadUserAuthority').withIndex('by_userId', q => q.eq('userId', b.userId)).take(2), ['_id','userId','enabled','generation']);
  const member = observedOne(await db.query('cadMemberships').withIndex('by_userId_and_shopId', q => q.eq('userId', b.userId).eq('shopId', b.shopId)).take(2), ['_id','userId','shopId','active','cadUploadAllowed','generation']);
  const login = select(await db.get(b.loginSessionId), ['_id','userId','expirationTime']);
  const account = select(await db.get(b.userId), ['_id']);
  const upload = observedOne(await db.query('cadUploadSessions').withIndex('by_credentialDigest', q => q.eq('credentialDigest', b.credentialDigest)).take(2),
    ['_id','userId','loginSessionId','shopId','sessionId','credentialDigest','expiresAt','userGeneration','membershipGeneration','cadUploadAllowed','status']);
  const session = observedOne(await db.query('cadUploadSessions').withIndex('by_sessionId', q => q.eq('sessionId', b.sessionId)).take(2), ['_id']);
  if (!user || !member || !login || !account || !upload || session?._id !== upload._id
    || user.userId !== b.userId || member.userId !== b.userId || member.shopId !== b.shopId
    || account._id !== b.userId || login._id !== b.loginSessionId || login.userId !== b.userId
    || upload.userId !== b.userId || upload.loginSessionId !== b.loginSessionId || upload.shopId !== b.shopId
    || upload.sessionId !== b.sessionId || upload.credentialDigest !== b.credentialDigest
    || ![user.generation,member.generation,p.generation,login.expirationTime,upload.expiresAt].every(uint)
    || upload.userGeneration !== user.generation || upload.membershipGeneration !== member.generation) return null;
  const k = await keys(b);
  return { identity: { bindingDigest: k.bindingDigest, scopeKey: k.scopeKey, runKey: k.runKey, sessionKey: k.sessionKey,
      userId: b.userId, loginSessionId: b.loginSessionId, userAuthorityId: user._id, membershipId: member._id,
      uploadRowId: upload._id, shopId: b.shopId, sessionId: b.sessionId, credentialDigest: b.credentialDigest, sessionRef: b.sessionRef },
    // A row hash binds metadata, never proves generation or custody.
    rowDigest: await hash(['controlled-authority-rows-v1',user,member,login,upload]),
    active: user.enabled === true && member.active === true && member.cadUploadAllowed === true
      && upload.cadUploadAllowed === true && upload.status === 'active' && p.active === true,
    expiresAtMs: Math.min(login.expirationTime,upload.expiresAt,p.expiresAtMs), userGeneration: user.generation,
    membershipGeneration: member.generation, principalGeneration: p.generation, grantGeneration,
    principalRole: p.role, principalDigest: await hash(['controlled-approved-principal-v1',p]) };
}

export async function projectAuthenticatedAuthorityCandidate(db: DatabaseReader, input: unknown, now: unknown) {
  if (!exact(input, ['binding','principalKey','evidence']) || !validBinding(input.binding) || !digest(input.principalKey) || !uint(now)) return closed('INPUT_INVALID');
  const captured = clone(input);
  // This fixed verifier always returns null. No local row/hash or caller flag can enable it.
  const verified = verifyIndependentAuthorityContinuity(captured.evidence);
  if (!verified) return closed('INDEPENDENT_CUSTODY_UNAVAILABLE');
  try {
    const verifiedCopy = clone(verified);
    const principal = await readCandidatePrincipal(db, captured.principalKey as string);
    if (!principal || principal.role !== 'writer' || principal.active !== true || !uint(principal.expiresAtMs) || principal.expiresAtMs <= now
      || principal.resourceBindingDigest !== (captured.binding as Binding).resourceBindingDigest
      || principal.verifiedSubjectDigest !== verifiedCopy.envelope.writerSubjectDigest
      || principal.principalKey !== await hash(['controlled-principal-v1',principal.verifiedIssuer,principal.verifiedAudience,
        principal.verifiedSubjectDigest,principal.role,principal.resourceBindingDigest])) return closed('AUTHORITY_MISSING');
    const observation = await observeAuthorityCandidate(db, captured.binding as Binding, principal, verifiedCopy.envelope.authorityGenerations.grant);
    const result = await compareContinuityMetadata(captured.binding, observation, verifiedCopy.envelope, verifiedCopy.anchor, now);
    // Even an eventual trusted projection cannot authorize the stream or qualify the host.
    return { ...closed(result.code), metadataMatches: 'metadataMatches' in result };
  } catch { return closed('AUTHORITY_REJECTED'); }
}

// Reserves scope/run/session irreversibly in the SAME candidate transaction as
// grant + attempt + tombstone + receipt. Registration includes run reservation;
// it never opens a fence or issues a session. The independent verifier is absent.
export async function registerGrantCandidate(db: DatabaseWriter, input: unknown, now: unknown) {
  if (!exact(input, ['binding','principalKey','evidence','requestNonceDigest']) || !validBinding(input.binding)
    || !digest(input.principalKey) || !digest(input.requestNonceDigest) || !uint(now)) return closed('INPUT_INVALID');
  const captured = clone(input), b = captured.binding as Binding;
  const verified = verifyIndependentRegistrationApproval(captured.evidence);
  if (!verified) return closed('INDEPENDENT_REGISTRATION_APPROVAL_UNAVAILABLE');
  try {
    const v = clone(verified), k = await keys(b);
    const principal = await readCandidatePrincipal(db, captured.principalKey as string);
    if (!principal || principal.role !== 'grant-custodian' || principal.active !== true || principal.expiresAtMs <= now
      || !uint(principal.expiresAtMs) || principal.resourceBindingDigest !== b.resourceBindingDigest || principal.verifiedSubjectDigest !== v.envelope.custodianSubjectDigest
      || principal.principalKey !== await hash(['controlled-principal-v1',principal.verifiedIssuer,principal.verifiedAudience,
        principal.verifiedSubjectDigest,principal.role,principal.resourceBindingDigest])) return closed('REGISTRATION_PRINCIPAL_REJECTED');
    const observation = await observeAuthorityCandidate(db, b, principal, v.envelope.authorityGenerations.grant);
    const metadata = await compareContinuityMetadata(b, observation, v.envelope, v.anchor, now);
    if (!('metadataMatches' in metadata) || v.envelope.scopeRevision !== 0 || v.anchor.minimumScopeRevision !== 0
      || v.envelope.requestNonceDigest !== captured.requestNonceDigest) return closed('REGISTRATION_EVIDENCE_REJECTED');
    // Empty rows are only a collision check, never continuity or approval proof.
    const occupied = [
      // Conservative legacy guard: prior registrations may predate permanent
      // session reservation. Without a scope/session index, ANY existing scope
      // or grant blocks insertion; never assume a different cohort is unused.
      one(await db.query('cadControlledUploadScopes').withIndex('by_scopeKey', q => q).take(2)),
      one(await db.query('cadControlledUploadGrants').withIndex('by_scopeKey', q => q).take(2)),
      one(await db.query('cadControlledUploadScopes').withIndex('by_scopeKey', q => q.eq('scopeKey', k.scopeKey)).take(2)),
      one(await db.query('cadControlledUploadScopes').withIndex('by_runKey', q => q.eq('runKey', k.runKey)).take(2)),
      one(await db.query('cadControlledUploadGrants').withIndex('by_scopeKey', q => q.eq('scopeKey', k.scopeKey)).take(2)),
      one(await db.query('cadControlledUploadGrants').withIndex('by_grantKey', q => q.eq('grantKey', k.grantKey)).take(2)),
      one(await db.query('cadControlledUploadAttempts').withIndex('by_runKey', q => q.eq('runKey', k.runKey)).take(2)),
      one(await db.query('cadControlledUploadAttempts').withIndex('by_sessionKey', q => q.eq('sessionKey', k.sessionKey)).take(2)),
      one(await db.query('cadControlledUploadSessionTombstones').withIndex('by_sessionKey', q => q.eq('sessionKey', k.sessionKey)).take(2)),
    ];
    if (occupied.some(Boolean)) return closed('REGISTRATION_SLOT_UNAVAILABLE');
    const principalRow = one(await db.query('cadControlledUploadHostPrincipals').withIndex('by_principalKey', q => q.eq('principalKey', principal.principalKey)).take(2));
    if (!principalRow) return closed('REGISTRATION_PRINCIPAL_REJECTED');
    const operationKey = await hash(['controlled-registration-reservation-v1',k.scopeKey,k.runKey,k.sessionKey]);
    if (one(await db.query('cadControlledUploadReceipts').withIndex('by_operationKey', q => q.eq('operationKey', operationKey)).take(2))) return closed('REGISTRATION_SLOT_UNAVAILABLE');
    const grantId = await db.insert('cadControlledUploadGrants', { grantKey: k.grantKey, scopeKey: k.scopeKey, runKey: k.runKey,
      bindingDigest: k.bindingDigest, binding: b, installedByPrincipalId: principalRow._id, installedAtMs: now });
    const scope = { scopeKey: k.scopeKey, approvedRunId: b.approvedRunId, runKey: k.runKey, grantId, sessionKey: k.sessionKey,
      currentBindingDigest: k.bindingDigest, revision: 1, authorityGeneration: v.envelope.authorityGenerations.grant,
      lastHostTimeMs: now, custodyEpochDigest: v.envelope.epochDigest, runSpent: true, revoked: false,
      permanentStop: false, stopReason: null, grantHistoryDigests: [k.bindingDigest] };
    const scopeId = await db.insert('cadControlledUploadScopes', scope);
    const attempt: Attempt = { scopeId, grantId, runKey: k.runKey, sessionKey: k.sessionKey,
      requestNonceDigest: captured.requestNonceDigest as string, bindingDigest: k.bindingDigest, revision: 1,
      attemptSpent: false, rollbackArmed: false, fenceOpenedOnce: false, fenceOpen: false, consumed: false,
      closed: false, revoked: false, unknown: false, deadlineMs: Math.min(v.envelope.expiresAtMs,b.grantDeadlineMs),
      authorityGenerations: clone(v.envelope.authorityGenerations), recoveryState: 'pending', recoveryDueAtMs: now, lastReceiptSequence: 1 };
    const attemptId = await db.insert('cadControlledUploadAttempts', attempt);
    const tombstone: Tombstone = { sessionKey: k.sessionKey, scopeId, runKey: k.runKey, bindingDigest: k.bindingDigest,
      spent: true, consumed: false, revoked: false, createdAtMs: now };
    await db.insert('cadControlledUploadSessionTombstones', tombstone);
    await db.insert('cadControlledUploadReceipts', { operationKey, scopeId, attemptId, bindingDigest: k.bindingDigest,
      requestNonceDigest: captured.requestNonceDigest as string, operation: 'claimRun', sequence: 1, beforeRevision: 0,
      afterRevision: 1, authorityGeneration: scope.authorityGeneration, principalGeneration: principal.generation,
      evaluatedAtMs: now, deadlineMs: attempt.deadlineMs, outcome: 'committed-restrictive',
      resultDigest: await hash(['controlled-registration-reservation-v1',scope,attempt,tombstone]),
      custodyEpochDigest: scope.custodyEpochDigest, commitOrdering: null });
    return { ...closed('SOURCE_REGISTRATION_RESERVED'), candidateWritten: true as const };
  } catch { throw Error('SOURCE_REGISTRATION_TRANSACTION_ABORT'); }
}

const stopReasons = ['unknown','clock-regression','restore','duplicate','revoked','expired'] as const;
type StopReason = typeof stopReasons[number];
// Only monotonic restriction: no authenticated-authority claim and no Auth writes.
// A successful denial RETURNS so its writes commit. Receipt/write failure THROWS
// to abort the entire transaction; ambiguous identity/corrupt anchors stay unresolved.
export async function persistRestrictionCandidate(db: DatabaseWriter, input: unknown) {
  if (!exact(input, ['scopeKey','reason','clockObservation']) || !digest(input.scopeKey)
    || !stopReasons.includes(input.reason as StopReason)
    || !(input.clockObservation === null || uint(input.clockObservation))) return closed('INPUT_INVALID');
  const captured = clone(input), scopeKey = captured.scopeKey as string;
  try {
    const row = one(await db.query('cadControlledUploadScopes').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
    if (!row) return closed('STOP_ANCHOR_UNRESOLVED');
    const sameRun = one(await db.query('cadControlledUploadScopes').withIndex('by_runKey', q => q.eq('runKey', row.runKey)).take(2));
    const grant = one(await db.query('cadControlledUploadGrants').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
    if (!grant || sameRun?._id !== row._id || row.grantId !== grant._id || !digest(row.runKey) || !digest(row.sessionKey)) return closed('STOP_ANCHOR_UNRESOLVED');
    const sameGrant = one(await db.query('cadControlledUploadGrants').withIndex('by_grantKey', q => q.eq('grantKey', grant.grantKey)).take(2));
    if (sameGrant?._id !== grant._id) return closed('STOP_ANCHOR_UNRESOLVED');
    const attempt = one(await db.query('cadControlledUploadAttempts').withIndex('by_runKey', q => q.eq('runKey', row.runKey)).take(2));
    const sessionAttempt = one(await db.query('cadControlledUploadAttempts').withIndex('by_sessionKey', q => q.eq('sessionKey', row.sessionKey)).take(2));
    const tomb = one(await db.query('cadControlledUploadSessionTombstones').withIndex('by_sessionKey', q => q.eq('sessionKey', row.sessionKey)).take(2));
    if (attempt?._id !== sessionAttempt?._id) return closed('STOP_ANCHOR_UNRESOLVED');
    const scope = data(row), g = data(grant);
    // A spent slot with missing history cannot safely be reconstructed as unused.
    if (scope.runSpent ? !attempt || !tomb : !!attempt || !!tomb) return closed('STOP_HISTORY_UNRESOLVED');
    // Validate grant/scope identity independently of corrupt attempt state.
    const identitySnapshot: Snapshot = { scopeId: row._id, grantId: grant._id, attemptId: null, grant: g,
      scope: { ...scope, runSpent: false }, attempt: null, tombstone: null };
    if (!await validSnapshot(identitySnapshot) || scope.revision >= Number.MAX_SAFE_INTEGER
      || (attempt && (attempt.scopeId !== row._id || attempt.grantId !== grant._id || attempt.runKey !== scope.runKey
        || attempt.sessionKey !== scope.sessionKey || attempt.bindingDigest !== scope.currentBindingDigest))
      || (tomb && (tomb.scopeId !== row._id || tomb.runKey !== scope.runKey || tomb.sessionKey !== scope.sessionKey
        || tomb.bindingDigest !== scope.currentBindingDigest || tomb.spent !== true))) return closed('STOP_ANCHOR_UNRESOLVED');
    const beforeRevision = scope.revision;
    // Do not substitute caller/zero time as live authority. Keep the stored high water
    // unchanged on missing/regressed clocks. These timestamps are source metadata only.
    const evaluatedAtMs = scope.lastHostTimeMs;
    const reason: StopReason = captured.clockObservation === null || (captured.clockObservation as number) < scope.lastHostTimeMs
      ? 'clock-regression' : captured.reason as StopReason;
    if (scope.permanentStop && scope.revoked && attempt?.closed === true && attempt?.fenceOpen === false
      && attempt?.unknown === true && attempt?.revoked === true && tomb?.revoked === true) return closed('SOURCE_STOP_ALREADY_PERSISTED');
    scope.permanentStop = true; scope.revoked = true; scope.runSpent = true; scope.revision++;
    scope.stopReason = scope.stopReason ?? reason; // Never erase the original stop reason.
    const nonce = attempt && digest(attempt.requestNonceDigest) ? attempt.requestNonceDigest
      : await hash(['controlled-stop-nonce-v1',scopeKey,scope.runKey]);
    // A restrictive reservation may fill a missing record, never creates permission.
    const a: Attempt = attempt ? { ...data(attempt), revision: scope.revision, lastReceiptSequence: scope.revision,
      fenceOpen: false, closed: true, revoked: true, unknown: true, recoveryState: 'unknown' } : {
      scopeId: row._id, grantId: grant._id, runKey: scope.runKey, sessionKey: scope.sessionKey,
      bindingDigest: scope.currentBindingDigest, requestNonceDigest: nonce, revision: scope.revision,
      attemptSpent: false, rollbackArmed: false, fenceOpenedOnce: false, fenceOpen: false, consumed: false,
      closed: true, revoked: true, unknown: true, deadlineMs: g.binding.grantDeadlineMs,
      // Unavailable generations stay unavailable; this terminal row cannot be reused.
      authorityGenerations: { login: 0,user: 0,membership: 0,uploadSession: 0,hostPrincipal: 0,grant: scope.authorityGeneration },
      recoveryState: 'unknown', recoveryDueAtMs: evaluatedAtMs, lastReceiptSequence: scope.revision };
    const t: Tombstone = { ...(tomb ? data(tomb) : {}), sessionKey: scope.sessionKey, scopeId: row._id, runKey: scope.runKey,
      bindingDigest: scope.currentBindingDigest, spent: true, consumed: tomb ? tomb.consumed : a.consumed, revoked: true,
      createdAtMs: tomb && uint(tomb.createdAtMs) ? tomb.createdAtMs : evaluatedAtMs };
    // Preserve factual forward history and known generations. Only fence/terminal
    // flags are repaired; untrustworthy historical fields cannot be invented.
    if (!await validSnapshot({ grantId: grant._id, scopeId: row._id, attemptId: attempt?._id ?? 'source-stop-placeholder',
      grant: g, scope, attempt: a, tombstone: t })) return closed('STOP_HISTORY_UNRESOLVED');
    const operationKey = await hash(['controlled-permanent-stop-v1',scopeKey,beforeRevision,scope.stopReason]);
    if (one(await db.query('cadControlledUploadReceipts').withIndex('by_operationKey', q => q.eq('operationKey', operationKey)).take(2))
      || one(await db.query('cadControlledUploadReceipts').withIndex('by_scopeId_and_sequence', q => q.eq('scopeId', row._id).eq('sequence', scope.revision)).take(2))) return closed('STOP_RECEIPT_CONFLICT_UNRESOLVED');
    const attemptId = attempt?._id ?? await db.insert('cadControlledUploadAttempts', a);
    if (attempt) await db.patch(attempt._id, a);
    if (tomb) await db.patch(tomb._id, t); else await db.insert('cadControlledUploadSessionTombstones', t);
    await db.patch(row._id, scope);
    const receipt: Receipt = { operationKey, scopeId: row._id, attemptId, bindingDigest: scope.currentBindingDigest,
      requestNonceDigest: nonce, operation: 'markUnknown', sequence: scope.revision, beforeRevision, afterRevision: scope.revision,
      authorityGeneration: scope.authorityGeneration, principalGeneration: 0, evaluatedAtMs, deadlineMs: a.deadlineMs,
      outcome: 'committed-restrictive', resultDigest: await hash(['controlled-permanent-stop-v1',scope,a,t]),
      custodyEpochDigest: scope.custodyEpochDigest, commitOrdering: null };
    await db.insert('cadControlledUploadReceipts', receipt);
    // RETURN the denial after writing. Throwing here would lose the permanent stop.
    return { ...closed('SOURCE_STOP_PERSISTED'), candidateWritten: true as const, stopReason: scope.stopReason };
  } catch { throw Error('SOURCE_STOP_TRANSACTION_ABORT'); }
}
