// Typed store implementation reached only through internal-only host functions.
// Forward operations remain denied while independent authority generations are unavailable.
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { closed, digest, exact, hash, plain, transition, uint, validSnapshot } from '../offline/cad-convex/controlledUploadHostModel';
import type { Authority, Binding, Command, Principal, Snapshot } from '../offline/cad-convex/controlledUploadHostModel';

function singleton<T>(rows: T[]): T | null {
  if (rows.length > 1) throw Error('CONTROLLED_HOST_DUPLICATE');
  if (rows.length && !plain(rows[0])) throw Error('CONTROLLED_HOST_METADATA_INVALID');
  return rows[0] ?? null;
}
function data<T extends { _id: unknown; _creationTime: number }>(row: T): Omit<T, '_id' | '_creationTime'> {
  const { _id, _creationTime, ...rest } = row;
  return rest;
}
export async function readCandidateState(db: DatabaseReader, scopeKey: string): Promise<Snapshot | null> {
  if (!digest(scopeKey)) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  const scope = singleton(await db.query('cadControlledUploadScopes').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
  if (!scope) return null;
  const runScope = singleton(await db.query('cadControlledUploadScopes').withIndex('by_runKey', q => q.eq('runKey', scope.runKey)).take(2));
  const grant = singleton(await db.query('cadControlledUploadGrants').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
  if (!grant || grant._id !== scope.grantId || runScope?._id !== scope._id) throw Error('CONTROLLED_HOST_STATE_INVALID');
  const exactGrant = singleton(await db.query('cadControlledUploadGrants').withIndex('by_grantKey', q => q.eq('grantKey', grant.grantKey)).take(2));
  if (exactGrant?._id !== grant._id) throw Error('CONTROLLED_HOST_STATE_INVALID');
  const attempt = singleton(await db.query('cadControlledUploadAttempts').withIndex('by_runKey', q => q.eq('runKey', scope.runKey)).take(2));
  const sessionAttempt = singleton(await db.query('cadControlledUploadAttempts').withIndex('by_sessionKey', q => q.eq('sessionKey', scope.sessionKey)).take(2));
  if (attempt?._id !== sessionAttempt?._id) throw Error('CONTROLLED_HOST_STATE_INVALID');
  const tombstone = singleton(await db.query('cadControlledUploadSessionTombstones').withIndex('by_sessionKey', q => q.eq('sessionKey', scope.sessionKey)).take(2));
  const state: Snapshot = { grantId: grant._id, scopeId: scope._id, attemptId: attempt?._id ?? null,
    grant: data(grant), scope: data(scope), attempt: attempt ? data(attempt) : null, tombstone: tombstone ? data(tombstone) : null };
  if (!await validSnapshot(state)) throw Error('CONTROLLED_HOST_STATE_INVALID');
  return state;
}
export async function readCandidatePrincipal(db: DatabaseReader, principalKey: string): Promise<Principal | null> {
  if (!digest(principalKey)) throw Error('CONTROLLED_HOST_INPUT_INVALID');
  const row = singleton(await db.query('cadControlledUploadHostPrincipals').withIndex('by_principalKey', q => q.eq('principalKey', principalKey)).take(2));
  if (!row) return null;
  // Reject duplicate roles and overlapping writer/recovery vs independent verifier subjects.
  const roles = ['writer','recovery','independent-reader','smoke-verifier','grant-custodian'] as const;
  const principals: Doc<'cadControlledUploadHostPrincipals'>[] = [];
  for (const role of roles) {
    const found = singleton(await db.query('cadControlledUploadHostPrincipals').withIndex('by_resourceBindingDigest_and_role', q =>
      q.eq('resourceBindingDigest', row.resourceBindingDigest).eq('role', role)).take(2));
    if (found) principals.push(found);
  }
  if (!principals.some(p => p._id === row._id)) throw Error('CONTROLLED_HOST_PRINCIPAL_INVALID');
  const independent = (p: Doc<'cadControlledUploadHostPrincipals'>) => ['independent-reader','smoke-verifier'].includes(p.role);
  if (principals.some(p => principals.some(other => p.active && other.active && independent(p) !== independent(other)
    && p.verifiedIssuer === other.verifiedIssuer && p.verifiedSubjectDigest === other.verifiedSubjectDigest))) throw Error('CONTROLLED_HOST_ROLE_OVERLAP');
  return data(row);
}
export async function readCandidateAuthority(db: DatabaseReader, b: Binding, principal: Principal, grantGeneration: number, now: number): Promise<Authority> {
  const user = singleton(await db.query('cadUserAuthority').withIndex('by_userId', q => q.eq('userId', b.userId)).take(2));
  const member = singleton(await db.query('cadMemberships').withIndex('by_userId_and_shopId', q => q.eq('userId', b.userId).eq('shopId', b.shopId)).take(2));
  const login = await db.get(b.loginSessionId);
  const account = await db.get(b.userId);
  const upload = singleton(await db.query('cadUploadSessions').withIndex('by_credentialDigest', q => q.eq('credentialDigest', b.credentialDigest)).take(2));
  const bySession = singleton(await db.query('cadUploadSessions').withIndex('by_sessionId', q => q.eq('sessionId', b.sessionId)).take(2));
  const active = !!(uint(now) && user && member && login && account && upload && bySession?._id === upload._id
    && user.enabled && member.active && member.cadUploadAllowed && upload.cadUploadAllowed
    && login.userId === b.userId && upload.userId === b.userId && upload.shopId === b.shopId
    && upload.loginSessionId === b.loginSessionId && upload.sessionId === b.sessionId && upload.status === 'active'
    && uint(user.generation) && uint(member.generation) && upload.userGeneration === user.generation
    && upload.membershipGeneration === member.generation && uint(login.expirationTime) && uint(upload.expiresAt)
    && login.expirationTime > now && upload.expiresAt > now);
  return { active, expiresAtMs: active ? Math.min(login!.expirationTime, upload!.expiresAt) : 0,
    // Existing login/upload tables have no independent generation/restore proof.
    // Zeros are unavailable projections, NOT inferred authority. Forward model rejects incomplete generations.
    generationsComplete: false,
    generations: { login: 0, uploadSession: 0, user: user?.generation ?? 0,
      membership: member?.generation ?? 0, hostPrincipal: principal.generation, grant: grantGeneration } };
}

// Must only run inside a single host mutation transaction. No network/clock reads.
// Neither this method nor a supplied principalKey authenticates a host transport.
// The registered internal host remains unable to execute forward operations until
// independent authority generations are supplied by a separately reviewed source.
export async function applyCandidateTransaction(db: DatabaseWriter, input: unknown, now: number) {
  if (!exact(input, ['scopeKey','principalKey','command']) || !plain(input) || !uint(now)) return closed('INPUT_INVALID');
  const captured = JSON.parse(JSON.stringify(input)) as { scopeKey: string; principalKey: string; command: Command };
  try {
    const s = await readCandidateState(db, captured.scopeKey);
    const p = await readCandidatePrincipal(db, captured.principalKey);
    if (!s || !p) return closed('STATE_OR_PRINCIPAL_MISSING');
    const auth = await readCandidateAuthority(db, s.grant.binding, p, s.scope.authorityGeneration, now);
    const proposal = await transition(s, captured.command, p, auth, now);
    if (!proposal.plan) return proposal;
    const plan = proposal.plan;
    const prior = singleton(await db.query('cadControlledUploadReceipts').withIndex('by_operationKey', q => q.eq('operationKey', plan.receipt.operationKey)).take(2));
    if (prior) return closed('OPERATION_ALREADY_SPENT');
    const sequence = singleton(await db.query('cadControlledUploadReceipts').withIndex('by_scopeId_and_sequence', q =>
      q.eq('scopeId', s.scopeId).eq('sequence', plan.receipt.sequence)).take(2));
    if (sequence) throw Error('CONTROLLED_HOST_DUPLICATE');
    const tomb = singleton(await db.query('cadControlledUploadSessionTombstones').withIndex('by_sessionKey', q => q.eq('sessionKey', s.scope.sessionKey)).take(2));
    const attemptId = s.attemptId ?? await db.insert('cadControlledUploadAttempts', plan.attempt);
    if (s.attemptId) await db.patch(s.attemptId, plan.attempt);
    if (tomb) await db.patch(tomb._id, plan.tombstone);
    else await db.insert('cadControlledUploadSessionTombstones', plan.tombstone);
    await db.patch(s.scopeId, plan.scope);
    if (captured.command.operation === 'revokeSessionAndLateGrants') {
      const sessions = await db.query('cadUploadSessions').withIndex('by_sessionId', q => q.eq('sessionId', s.grant.binding.sessionId)).take(2);
      if (sessions.length > 1) throw Error('CONTROLLED_HOST_DUPLICATE');
      for (const session of sessions) await db.patch(session._id, { status: 'revoked', revokedAt: now });
      // The stable scope's permanentStop denies every later grant for this slot.
    }
    // Same transaction as state/tombstone writes; a failure MUST abort all writes.
    // Ordering is left null until independently qualified; do not invent commit time.
    await db.insert('cadControlledUploadReceipts', { ...plan.receipt, attemptId });
    return { ...closed('SOURCE_TRANSACTION_PROPOSED'), modelAccepted: true };
  } catch { throw Error('CONTROLLED_HOST_TRANSACTION_ABORT'); }
}

export async function readCandidateReceipt(db: DatabaseReader, operationKey: string) {
  if (!digest(operationKey)) return null;
  const row = singleton(await db.query('cadControlledUploadReceipts').withIndex('by_operationKey', q => q.eq('operationKey', operationKey)).take(2));
  if (row && (!exact(data(row), ['operationKey','scopeId','attemptId','bindingDigest','requestNonceDigest','operation',
    'sequence','beforeRevision','afterRevision','authorityGeneration','principalGeneration','evaluatedAtMs','deadlineMs',
    'outcome','resultDigest','custodyEpochDigest','commitOrdering']) || !digest(row.resultDigest)
    || !uint(row.afterRevision) || !uint(row.beforeRevision) || row.afterRevision !== row.beforeRevision + 1)) throw Error('CONTROLLED_HOST_RECEIPT_INVALID');
  // Diagnostic identity only. This is never independent evidence or a read permit.
  return row ? { operationKey: row.operationKey, revision: row.afterRevision,
    resultDigest: row.resultDigest, bodyAdmissionAuthorized: false as const } : null;
}
