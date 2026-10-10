// Internal-only Package 7 durable metadata adapters. This module does not mount
// HTTP, issue sessions, read request bodies, dispatch providers/Sandbox, or
// authorize downloads or conversion. Every mutation is one Convex transaction.
import { internalMutation, internalQuery } from './_generated/server';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { custodyArtifact } from './schema';

export const PACKAGE7_BINDING = Object.freeze({
  gateSha256: '7668624b8149c2e7943152aaa1222618460caac79d1f656a727895c9ac1c28a9',
  deployment: 'majestic-alligator-31',
  verifiedFunctionCount: 37,
  sourceOnly: true,
  runtimeActivationAuthorized: false,
});
export const PACKAGE7_VERIFIED_FUNCTIONS = Object.freeze([
  'auth.js:isAuthenticated', 'auth.js:signIn', 'auth.js:signOut', 'auth.js:store',
  'cad.js:changeAuthority', 'cad.js:insertIfAbsent', 'cad.js:read', 'cad.js:refreshAuthorization',
  'cad.js:resolveAuthorization', 'cad.js:revoke',
  'cadControlledUploadDevQualification.js:qualifyOnce', 'cadControlledUploadDevQualification.js:readSanitized',
  'cadControlledUploadHost.js:persistRestriction', 'cadControlledUploadHost.js:projectAuthenticatedAuthority',
  'cadControlledUploadHost.js:readReceipt', 'cadControlledUploadHost.js:readState',
  'cadControlledUploadHost.js:recordIndependentSmoke', 'cadControlledUploadHost.js:registerApprovedGrantAndScope',
  'cadControlledUploadHost.js:transact', 'cadDevAuthQualification.js:provisionCohort',
  'cadDevAuthQualification.js:revokeUsers', 'cadDevAuthQualificationStore.js:inventory',
  'cadDevAuthQualificationStore.js:readCurrent', 'cadDevUploadSessionQualification.js:issueReadRevoke',
  'cadDevUploadSessionQualification.js:issueReadRevokeWithSyntheticAuthority',
  'cadDevUploadSessionQualificationAuthority.js:provisionSyntheticAuthority',
  'cadDevUploadSessionQualificationAuthority.js:revokeSyntheticAuthority',
  'cadDevUploadSessionQualificationSession.js:readCurrent', 'cadDurableEngine.js:changeAuthority',
  'cadDurableEngine.js:claim', 'cadDurableEngine.js:initialize', 'cadDurableEngine.js:readAuthority',
  'cadDurableEngine.js:readExact', 'cadDurableEngine.js:scanPage', 'cadDurableEngine.js:settle',
  'cadDurableEngine.js:stop', 'cadDurableEngine.js:transact',
]);
export const PACKAGE7_CEILINGS = Object.freeze({
  maxStoredBytes: 8 * 1024 * 1024, maxObjects: 12, maxClassAOperations: 1000,
  maxClassBOperations: 1000, maxDeleteOperations: 1000, budgetMicros: 9_000_000,
  maxAttempts: 4, maxConcurrent: 1,
});

const MAX_ROLLBACK_ROWS = 100;
const owner = v.object({ userId: v.id('users'), shopId: v.string(), uploadSessionId: v.string() });
const quotaPolicy = v.object({ maxStoredBytes: v.number(), maxObjects: v.number(),
  maxClassAOperations: v.number(), maxClassBOperations: v.number(), maxDeleteOperations: v.number() });
const operationKind = v.union(v.literal('class-a'), v.literal('class-b'), v.literal('delete'));
const closedFields = {
  sourceOnly: v.literal(true), liveReady: v.literal(false), routeMounted: v.literal(false),
  bodyAdmissionAuthorized: v.literal(false), providerDispatchEnabled: v.literal(false),
  conversionDispatchEnabled: v.literal(false), downloadRouteEnabled: v.literal(false),
};
const adapterResult = v.object({ ...closedFields, accepted: v.boolean(), code: v.string(),
  status: v.optional(v.string()), artifactId: v.optional(v.string()), attemptId: v.optional(v.string()),
  jobId: v.optional(v.string()), fence: v.optional(v.number()), generation: v.optional(v.number()),
  retainedUntil: v.optional(v.number()), byteCount: v.optional(v.number()), expiresAt: v.optional(v.number()),
  deleted: v.optional(v.boolean()), tombstoneDigest: v.optional(v.string()),
  state: v.optional(v.string()), replayed: v.optional(v.boolean()), revision: v.optional(v.number()),
  admissionClosed: v.optional(v.boolean()), conversionClosed: v.optional(v.boolean()),
  grantsRevoked: v.optional(v.boolean()), uncertainRecordsQuarantined: v.optional(v.boolean()),
});
type Result = {
  sourceOnly: true; liveReady: false; routeMounted: false; bodyAdmissionAuthorized: false;
  providerDispatchEnabled: false; conversionDispatchEnabled: false; downloadRouteEnabled: false;
  accepted: boolean; code: string; [key: string]: unknown;
};
type WithoutSystem<T> = T extends unknown ? Omit<T, '_id' | '_creationTime'> : never;
type NewArtifact = WithoutSystem<Doc<'cadArtifacts'>>;
const result = (accepted: boolean, code: string, extra: Record<string, unknown> = {}): Result => ({
  sourceOnly: true, liveReady: false, routeMounted: false, bodyAdmissionAuthorized: false,
  providerDispatchEnabled: false, conversionDispatchEnabled: false, downloadRouteEnabled: false,
  accepted, code, ...extra,
});
const safe = async (operation: () => Promise<Result>, code = 'DURABLE_ADAPTER_UNAVAILABLE') => {
  try { return await operation(); } catch { return result(false, code); }
};
const isUint = (value: number) => Number.isSafeInteger(value) && value >= 0;
const isIncrementable = (value: number) => isUint(value) && value < Number.MAX_SAFE_INTEGER;
const isPositiveIntAtMost = (value: number, maximum: number) => Number.isSafeInteger(value)
  && value > 0 && value <= maximum;
const validDigest = (value: string) => /^[a-f0-9]{64}$/.test(value);
const validQuotaPolicy = (policy: {
  maxStoredBytes: number; maxObjects: number; maxClassAOperations: number;
  maxClassBOperations: number; maxDeleteOperations: number;
}) => isPositiveIntAtMost(policy.maxStoredBytes, PACKAGE7_CEILINGS.maxStoredBytes)
  && isPositiveIntAtMost(policy.maxObjects, PACKAGE7_CEILINGS.maxObjects)
  && isPositiveIntAtMost(policy.maxClassAOperations, PACKAGE7_CEILINGS.maxClassAOperations)
  && isPositiveIntAtMost(policy.maxClassBOperations, PACKAGE7_CEILINGS.maxClassBOperations)
  && isPositiveIntAtMost(policy.maxDeleteOperations, PACKAGE7_CEILINGS.maxDeleteOperations);
const validUploadPolicy = (policy: {
  maxAttempts: number; maxConcurrent: number; budgetMicros: number;
}) => isPositiveIntAtMost(policy.maxAttempts, PACKAGE7_CEILINGS.maxAttempts)
  && isPositiveIntAtMost(policy.maxConcurrent, PACKAGE7_CEILINGS.maxConcurrent)
  && isPositiveIntAtMost(policy.budgetMicros, PACKAGE7_CEILINGS.budgetMicros);
const sameOwner = (row: { userId: Id<'users'>; shopId: string; uploadSessionId?: string }, value: {
  userId: Id<'users'>; shopId: string; uploadSessionId: string;
}) => row.userId === value.userId && row.shopId === value.shopId
  && (row.uploadSessionId === undefined || row.uploadSessionId === value.uploadSessionId);
async function unique<T>(promise: Promise<T[]>): Promise<T | null> {
  const rows = await promise;
  if (rows.length > 1) throw Error('DUPLICATE_DURABLE_ROW');
  return rows[0] ?? null;
}
const artifactById = (db: DatabaseReader, artifactId: string) => unique(
  db.query('cadArtifacts').withIndex('by_artifactId', q => q.eq('artifactId', artifactId)).take(2));
const attemptById = (db: DatabaseReader, attemptId: string) => unique(
  db.query('cadUploadOrchestrationAttempts').withIndex('by_attemptId', q => q.eq('attemptId', attemptId)).take(2));
const jobById = (db: DatabaseReader, jobId: string) => unique(
  db.query('cadUploadJobs').withIndex('by_jobId', q => q.eq('jobId', jobId)).take(2));
const controlByScope = (db: DatabaseReader, scopeKey: string) => unique(
  db.query('cadPhase5ControlState').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));

export async function reserveArtifactCandidate(db: DatabaseWriter, args: {
  scopeKey: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  artifact: NewArtifact; policy: {
    maxStoredBytes: number; maxObjects: number; maxClassAOperations: number;
    maxClassBOperations: number; maxDeleteOperations: number;
  }; now: number;
}): Promise<Result> {
  const { artifact, policy } = args;
  if (!validQuotaPolicy(policy)) return result(false, 'CUSTODY_POLICY_INVALID');
  if (!sameOwner(artifact, args.owner) || artifact.state !== 'reserved' || artifact.generation !== 1
    || !isUint(args.now) || artifact.createdAt !== args.now || artifact.retainedUntil <= args.now
    || !Number.isSafeInteger(artifact.retainedUntil) || !Number.isSafeInteger(artifact.byteCount)
    || artifact.byteCount <= 0 || !validDigest(artifact.restrictedDigest)
    || !validDigest(artifact.objectKeyDigest)
    || !/^phase5\/[a-f0-9]{64}$/.test(artifact.providerObjectKey)) return result(false, 'CUSTODY_INVALID');
  const existing = await artifactById(db, artifact.artifactId);
  const tombstone = await unique(db.query('cadArtifactTombstones')
    .withIndex('by_artifactId', q => q.eq('artifactId', artifact.artifactId)).take(2));
  if (tombstone) return result(false, 'CUSTODY_TOMBSTONED');
  if (existing) return result(false, sameOwner(existing, args.owner)
    ? 'CUSTODY_REPLAYED' : 'CUSTODY_DENIED', { replayed: sameOwner(existing, args.owner) });
  if (artifact.kind !== 'original-igs') {
    const source = await artifactById(db, artifact.sourceArtifactId);
    if (!source || !sameOwner(source, args.owner) || source.kind !== 'original-igs'
      || source.state !== 'stored' || source.restrictedDigest !== artifact.sourceDigest) {
      return result(false, 'CUSTODY_DENIED');
    }
  }
  let ledger = await unique(db.query('cadArtifactQuotaLedgers')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', args.scopeKey)).take(2));
  if (ledger && (ledger.userId !== args.owner.userId || ledger.shopId !== args.owner.shopId || ledger.stopped)) {
    return result(false, 'CUSTODY_DENIED');
  }
  if (ledger && (![ledger.storedBytes, ledger.objectCount, ledger.classAOperations,
    ledger.classBOperations, ledger.deleteOperations].every(isUint) || !isIncrementable(ledger.revision))) {
    return result(false, 'CUSTODY_DENIED');
  }
  const current = ledger ?? { storedBytes: 0, objectCount: 0, classAOperations: 0,
    classBOperations: 0, deleteOperations: 0, revision: 0 };
  if (current.storedBytes + artifact.byteCount > policy.maxStoredBytes
    || current.objectCount + 1 > policy.maxObjects) return result(false, 'CUSTODY_QUOTA_EXHAUSTED');
  await db.insert('cadArtifacts', artifact);
  const quotaPatch = { userId: args.owner.userId, shopId: args.owner.shopId,
    storedBytes: current.storedBytes + artifact.byteCount, objectCount: current.objectCount + 1,
    classAOperations: current.classAOperations, classBOperations: current.classBOperations,
    deleteOperations: current.deleteOperations, revision: current.revision + 1, stopped: false,
    updatedAt: args.now };
  if (ledger) await db.patch(ledger._id, quotaPatch);
  else await db.insert('cadArtifactQuotaLedgers', { scopeKey: args.scopeKey, ...quotaPatch });
  return result(true, 'ARTIFACT_RESERVED', { artifactId: artifact.artifactId,
    retainedUntil: artifact.retainedUntil, revision: current.revision + 1 });
}

export async function consumeQuotaCandidate(db: DatabaseWriter, args: {
  scopeKey: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  operation: 'class-a' | 'class-b' | 'delete'; count: number; policy: {
    maxStoredBytes: number; maxObjects: number; maxClassAOperations: number;
    maxClassBOperations: number; maxDeleteOperations: number;
  }; now: number;
}): Promise<Result> {
  if (!validQuotaPolicy(args.policy) || !isUint(args.now)) return result(false, 'CUSTODY_POLICY_INVALID');
  const ledger = await unique(db.query('cadArtifactQuotaLedgers')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', args.scopeKey)).take(2));
  if (!ledger || ledger.userId !== args.owner.userId || ledger.shopId !== args.owner.shopId
    || ledger.stopped || !Number.isSafeInteger(args.count) || args.count < 1) return result(false, 'CUSTODY_DENIED');
  const field = args.operation === 'class-a' ? 'classAOperations'
    : args.operation === 'class-b' ? 'classBOperations' : 'deleteOperations';
  const maximum = args.operation === 'class-a' ? args.policy.maxClassAOperations
    : args.operation === 'class-b' ? args.policy.maxClassBOperations : args.policy.maxDeleteOperations;
  if (!isIncrementable(ledger.revision) || !isUint(ledger[field])
    || !Number.isSafeInteger(ledger[field] + args.count)) return result(false, 'CUSTODY_DENIED');
  if (ledger[field] + args.count > maximum) return result(false, 'CUSTODY_QUOTA_EXHAUSTED');
  await db.patch(ledger._id, { [field]: ledger[field] + args.count,
    revision: ledger.revision + 1, updatedAt: args.now });
  return result(true, 'QUOTA_RESERVED', { revision: ledger.revision + 1 });
}

export async function readArtifactCandidate(db: DatabaseReader, args: {
  artifactId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
}): Promise<Result> {
  const artifact = await artifactById(db, args.artifactId);
  if (!artifact || !sameOwner(artifact, args.owner)) return result(false, 'CUSTODY_DENIED');
  return result(true, 'ARTIFACT_PRESENT', { artifactId: artifact.artifactId,
    state: artifact.state, generation: artifact.generation, byteCount: artifact.byteCount,
    retainedUntil: artifact.retainedUntil });
}

export async function transitionArtifactCandidate(db: DatabaseWriter, args: {
  artifactId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  expectedGeneration: number; transition: 'stored' | 'quarantined' | 'deleting';
  reasonDigest?: string; now: number;
}): Promise<Result> {
  if (!isIncrementable(args.expectedGeneration) || args.expectedGeneration < 1 || !isUint(args.now)) {
    return result(false, 'CUSTODY_INVALID');
  }
  const artifact = await artifactById(db, args.artifactId);
  if (!artifact || !sameOwner(artifact, args.owner)) return result(false, 'CUSTODY_DENIED');
  if (artifact.generation !== args.expectedGeneration) return result(false, 'CUSTODY_STALE');
  const allowed = (args.transition === 'stored' && artifact.state === 'reserved')
    || (args.transition === 'quarantined' && ['reserved', 'stored', 'deleting'].includes(artifact.state))
    || (args.transition === 'deleting' && ['stored', 'quarantined'].includes(artifact.state));
  if (!allowed || (args.transition === 'quarantined' && !validDigest(args.reasonDigest ?? ''))) {
    return result(false, 'CUSTODY_DENIED');
  }
  const generation = artifact.generation + 1;
  await db.patch(artifact._id, { state: args.transition, generation, updatedAt: args.now,
    ...(args.transition === 'quarantined' ? { quarantineReasonDigest: args.reasonDigest } : {}) });
  if (args.transition === 'quarantined') {
    const grants = await db.query('cadArtifactDownloadGrants')
      .withIndex('by_owner_shop_artifactId', q => q.eq('userId', args.owner.userId)
        .eq('shopId', args.owner.shopId).eq('artifactId', args.artifactId)).take(MAX_ROLLBACK_ROWS + 1);
    if (grants.length > MAX_ROLLBACK_ROWS) throw Error('GRANT_BOUND_EXCEEDED');
    for (const grant of grants) if (grant.revokedAt === undefined) await db.patch(grant._id, { revokedAt: args.now });
  }
  return result(true, `ARTIFACT_${args.transition.toUpperCase()}`, { artifactId: artifact.artifactId, generation });
}

export async function confirmDeletedCandidate(db: DatabaseWriter, args: {
  scopeKey: string; artifactId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  expectedGeneration: number; tombstoneDigest: string; now: number;
}): Promise<Result> {
  if (!isIncrementable(args.expectedGeneration) || args.expectedGeneration < 1 || !isUint(args.now)) {
    return result(false, 'CUSTODY_INVALID');
  }
  const prior = await unique(db.query('cadArtifactTombstones')
    .withIndex('by_artifactId', q => q.eq('artifactId', args.artifactId)).take(2));
  if (prior) return sameOwner(prior, args.owner) && prior.scopeKey === args.scopeKey
    && prior.tombstoneDigest === args.tombstoneDigest
    ? result(true, 'ARTIFACT_DELETED', { artifactId: args.artifactId, deleted: true,
      tombstoneDigest: prior.tombstoneDigest, replayed: true }) : result(false, 'CUSTODY_DENIED');
  const artifact = await artifactById(db, args.artifactId);
  const ledger = await unique(db.query('cadArtifactQuotaLedgers')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', args.scopeKey)).take(2));
  if (!artifact || !ledger || !sameOwner(artifact, args.owner)
    || ledger.userId !== args.owner.userId || ledger.shopId !== args.owner.shopId
    || artifact.state !== 'deleting' || artifact.generation !== args.expectedGeneration
    || !validDigest(args.tombstoneDigest) || !isIncrementable(ledger.revision)
    || !isUint(ledger.storedBytes) || !isUint(ledger.objectCount)) return result(false, 'CUSTODY_DENIED');
  await db.insert('cadArtifactTombstones', { artifactId: artifact.artifactId,
    userId: artifact.userId, shopId: artifact.shopId, uploadSessionId: artifact.uploadSessionId,
    kind: artifact.kind, objectKeyDigest: artifact.objectKeyDigest,
    restrictedDigest: artifact.restrictedDigest, deletedAt: args.now, replayFence: true,
    generation: artifact.generation + 1, tombstoneDigest: args.tombstoneDigest,
    scopeKey: args.scopeKey });
  const grants = await db.query('cadArtifactDownloadGrants')
    .withIndex('by_owner_shop_artifactId', q => q.eq('userId', args.owner.userId)
      .eq('shopId', args.owner.shopId).eq('artifactId', args.artifactId)).take(MAX_ROLLBACK_ROWS + 1);
  if (grants.length > MAX_ROLLBACK_ROWS) throw Error('GRANT_BOUND_EXCEEDED');
  for (const grant of grants) if (grant.revokedAt === undefined) await db.patch(grant._id, { revokedAt: args.now });
  await db.patch(ledger._id, { storedBytes: Math.max(0, ledger.storedBytes - artifact.byteCount),
    objectCount: Math.max(0, ledger.objectCount - 1), revision: ledger.revision + 1, updatedAt: args.now });
  await db.delete(artifact._id);
  return result(true, 'ARTIFACT_DELETED', { artifactId: args.artifactId, deleted: true,
    tombstoneDigest: args.tombstoneDigest });
}

export async function issueGrantCandidate(db: DatabaseWriter, args: {
  grantDigest: string; artifactId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  artifactGeneration: number; issuedAt: number; expiresAt: number;
}): Promise<Result> {
  if (!Number.isSafeInteger(args.artifactGeneration) || args.artifactGeneration < 1
    || !isUint(args.issuedAt) || !isUint(args.expiresAt)) return result(false, 'CUSTODY_INVALID');
  const prior = await unique(db.query('cadArtifactDownloadGrants')
    .withIndex('by_grantDigest', q => q.eq('grantDigest', args.grantDigest)).take(2));
  if (prior) return result(false, 'DOWNLOAD_GRANT_REPLAYED', { replayed: true });
  const controls = await db.query('cadPhase5ControlState')
    .withIndex('by_owner_shop_scopeKey', q => q.eq('userId', args.owner.userId).eq('shopId', args.owner.shopId))
    .take(MAX_ROLLBACK_ROWS + 1);
  if (controls.length > MAX_ROLLBACK_ROWS) throw Error('CONTROL_BOUND_EXCEEDED');
  if (controls.some(control => control.uploadSessionId === args.owner.uploadSessionId && control.grantsRevoked)) {
    return result(false, 'CUSTODY_DENIED');
  }
  const artifact = await artifactById(db, args.artifactId);
  if (!artifact || !sameOwner(artifact, args.owner) || artifact.state !== 'stored'
    || artifact.generation !== args.artifactGeneration || args.expiresAt <= args.issuedAt
    || args.expiresAt > artifact.retainedUntil || !validDigest(args.grantDigest)) {
    return result(false, 'CUSTODY_DENIED');
  }
  await db.insert('cadArtifactDownloadGrants', { grantDigest: args.grantDigest,
    artifactId: args.artifactId, ...args.owner, artifactGeneration: args.artifactGeneration,
    issuedAt: args.issuedAt, expiresAt: args.expiresAt });
  return result(true, 'DOWNLOAD_GRANT_RECORDED', { expiresAt: args.expiresAt });
}

export async function resolveGrantCandidate(db: DatabaseReader, args: {
  grantDigest: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string }; now: number;
}): Promise<Result> {
  if (!isUint(args.now)) return result(false, 'CUSTODY_INVALID');
  const grant = await unique(db.query('cadArtifactDownloadGrants')
    .withIndex('by_grantDigest', q => q.eq('grantDigest', args.grantDigest)).take(2));
  if (!grant || !sameOwner(grant, args.owner) || grant.revokedAt !== undefined || grant.expiresAt <= args.now) {
    return result(false, 'CUSTODY_DENIED');
  }
  const artifact = await artifactById(db, grant.artifactId);
  if (!artifact || !sameOwner(artifact, args.owner) || artifact.state !== 'stored'
    || artifact.generation !== grant.artifactGeneration || artifact.retainedUntil <= args.now) {
    return result(false, 'CUSTODY_DENIED');
  }
  return result(true, 'DOWNLOAD_GRANT_PRESENT', { artifactId: artifact.artifactId,
    generation: artifact.generation, byteCount: artifact.byteCount, retainedUntil: artifact.retainedUntil });
}

export async function claimUploadCandidate(db: DatabaseWriter, args: {
  scopeKey: string; attempt: Omit<Doc<'cadUploadOrchestrationAttempts'>, '_id' | '_creationTime' | 'fence' | 'state'>;
  policy: { maxAttempts: number; maxConcurrent: number; budgetMicros: number };
}): Promise<Result> {
  if (!validUploadPolicy(args.policy)) return result(false, 'ORCHESTRATION_POLICY_INVALID');
  if (!validDigest(args.attempt.idempotencyDigest) || !validDigest(args.attempt.evidenceDigest)
    || !validDigest(args.attempt.retentionPolicyDigest) || args.attempt.maxRetries !== 0
    || !Number.isSafeInteger(args.attempt.authorityGeneration) || args.attempt.authorityGeneration < 1
    || !isUint(args.attempt.createdAt) || !isUint(args.attempt.expiresAt)
    || args.attempt.expiresAt <= args.attempt.createdAt
    || !Number.isSafeInteger(args.attempt.reservationMicros) || args.attempt.reservationMicros < 1) {
    return result(false, 'ORCHESTRATION_INVALID');
  }
  const prior = await unique(db.query('cadUploadOrchestrationAttempts')
    .withIndex('by_idempotencyDigest', q => q.eq('idempotencyDigest', args.attempt.idempotencyDigest)).take(2));
  if (prior) return result(false, prior.state === 'quarantined' ? 'ORCHESTRATION_QUARANTINED' : 'IDEMPOTENCY_REPLAYED',
    { status: prior.state === 'quarantined' ? 'quarantined' : 'duplicate', attemptId: prior.attemptId,
      fence: prior.fence, replayed: true });
  const control = await controlByScope(db, args.scopeKey);
  if (control && (control.userId !== args.attempt.userId || control.shopId !== args.attempt.shopId
    || control.uploadSessionId !== args.attempt.uploadSessionId || control.admissionClosed)) {
    return result(false, 'ORCHESTRATION_CLOSED');
  }
  const rows: Doc<'cadUploadOrchestrationAttempts'>[] = [];
  for (const state of ['reserved', 'body-accepted', 'admitted', 'quarantined'] as const) {
    rows.push(...await db.query('cadUploadOrchestrationAttempts').withIndex('by_owner_state', q => q
      .eq('userId', args.attempt.userId).eq('shopId', args.attempt.shopId).eq('state', state))
      .take(args.policy.maxAttempts + 1));
  }
  if (rows.length >= args.policy.maxAttempts) return result(false, 'ORCHESTRATION_QUOTA_EXHAUSTED');
  const active = rows.filter(row => ['reserved', 'body-accepted'].includes(row.state) && row.expiresAt > args.attempt.createdAt);
  if (active.length >= args.policy.maxConcurrent) return result(false, 'ORCHESTRATION_CONCURRENCY_LIMIT');
  if (rows.reduce((sum, row) => sum + row.reservationMicros, 0) + args.attempt.reservationMicros
    > args.policy.budgetMicros) return result(false, 'ORCHESTRATION_BUDGET_EXHAUSTED');
  if (await attemptById(db, args.attempt.attemptId)) return result(false, 'IDEMPOTENCY_REPLAYED');
  await db.insert('cadUploadOrchestrationAttempts', { ...args.attempt, fence: 1, state: 'reserved' });
  return result(true, 'UPLOAD_ATTEMPT_CLAIMED', { status: 'claimed',
    attemptId: args.attempt.attemptId, fence: 1 });
}

export async function advanceUploadCandidate(db: DatabaseWriter, args: {
  attemptId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  fence: number; command: 'body-accepted' | 'admitted' | 'quarantined'; now: number;
  byteCount?: number; restrictedDigest?: string; artifactId?: string; jobId?: string;
  reasonDigest?: string;
}): Promise<Result> {
  if (!isIncrementable(args.fence) || args.fence < 1 || !isUint(args.now)) {
    return result(false, 'ORCHESTRATION_INVALID');
  }
  const attempt = await attemptById(db, args.attemptId);
  if (!attempt || !sameOwner(attempt, args.owner) || attempt.fence !== args.fence) {
    return result(false, 'ORCHESTRATION_DENIED');
  }
  if (attempt.state === 'quarantined') return result(args.command === 'quarantined', 'ORCHESTRATION_QUARANTINED',
    { status: 'quarantined', attemptId: attempt.attemptId, fence: attempt.fence, replayed: true });
  if (args.command === 'body-accepted') {
    if (attempt.state !== 'reserved' || !isUint(args.byteCount ?? -1) || (args.byteCount ?? 0) < 1
      || !validDigest(args.restrictedDigest ?? '')) return result(false, 'ORCHESTRATION_DENIED');
    await db.patch(attempt._id, { state: 'body-accepted', bodyByteCount: args.byteCount,
      restrictedDigest: args.restrictedDigest, updatedAt: args.now });
    return result(true, 'UPLOAD_BODY_RECORDED', { attemptId: attempt.attemptId, fence: attempt.fence });
  }
  if (args.command === 'quarantined') {
    if (!validDigest(args.reasonDigest ?? '')) return result(false, 'ORCHESTRATION_DENIED');
    await db.patch(attempt._id, { state: 'quarantined', quarantineReasonDigest: args.reasonDigest,
      updatedAt: args.now, fence: attempt.fence + 1 });
    return result(true, 'UPLOAD_ATTEMPT_QUARANTINED', { attemptId: attempt.attemptId,
      fence: attempt.fence + 1, status: 'quarantined' });
  }
  if (attempt.state !== 'body-accepted' || !args.artifactId || !args.jobId
    || await jobById(db, args.jobId)) return result(false, 'ORCHESTRATION_DENIED');
  const artifact = await artifactById(db, args.artifactId);
  if (!artifact || !sameOwner(artifact, args.owner) || artifact.state !== 'stored'
    || artifact.restrictedDigest !== attempt.restrictedDigest) return result(false, 'ORCHESTRATION_DENIED');
  await db.insert('cadUploadJobs', { jobId: args.jobId, attemptId: attempt.attemptId,
    artifactId: artifact.artifactId, ...args.owner, originalRestrictedDigest: artifact.restrictedDigest,
    state: 'admitted', conversionAuthorized: false, conversionDispatchCount: 0,
    conversionClaimCount: 0, conversionGeneration: 0, createdAt: args.now, updatedAt: args.now });
  await db.patch(attempt._id, { state: 'admitted', artifactId: artifact.artifactId,
    jobId: args.jobId, updatedAt: args.now });
  return result(true, 'UPLOAD_JOB_BOUND', { attemptId: attempt.attemptId,
    artifactId: artifact.artifactId, jobId: args.jobId });
}

export async function claimConversionCandidate(db: DatabaseWriter, args: {
  scopeKey: string; jobId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  expectedGeneration: number; now: number;
}): Promise<Result> {
  if (!isIncrementable(args.expectedGeneration) || !isUint(args.now)) {
    return result(false, 'CONVERSION_INVALID');
  }
  const control = await controlByScope(db, args.scopeKey);
  const job = await jobById(db, args.jobId);
  if (!job || !sameOwner(job, args.owner) || (control && (control.userId !== args.owner.userId
    || control.shopId !== args.owner.shopId || control.uploadSessionId !== args.owner.uploadSessionId
    || control.conversionClosed))) return result(false, 'CONVERSION_DENIED');
  if (job.conversionAuthorized !== true) return result(false, 'CONVERSION_NOT_AUTHORIZED');
  if (job.state === 'converting') return result(false, 'CONVERSION_ALREADY_CLAIMED', { status: 'duplicate' });
  if (job.state !== 'admitted' || job.conversionGeneration !== args.expectedGeneration) {
    return result(false, ['ready', 'failed', 'quarantined'].includes(job.state)
      ? 'CONVERSION_TERMINAL' : 'CONVERSION_DENIED', { status: 'terminal' });
  }
  const generation = job.conversionGeneration + 1;
  await db.patch(job._id, { state: 'converting', conversionClaimCount: job.conversionClaimCount + 1,
    conversionGeneration: generation, updatedAt: args.now });
  return result(true, 'CONVERSION_CLAIM_RECORDED', { status: 'claimed', jobId: job.jobId,
    generation });
}

export async function advanceConversionCandidate(db: DatabaseWriter, args: {
  jobId: string; owner: { userId: Id<'users'>; shopId: string; uploadSessionId: string };
  expectedGeneration: number; command: 'ready' | 'quarantined'; now: number;
  previewArtifactId?: string; stlArtifactId?: string; geometryDigest?: string;
  previewDigest?: string; stlDigest?: string; cleanupConfirmed?: boolean; reasonDigest?: string;
}): Promise<Result> {
  if (!isUint(args.expectedGeneration) || !isUint(args.now)) {
    return result(false, 'CONVERSION_INVALID');
  }
  const job = await jobById(db, args.jobId);
  if (!job || !sameOwner(job, args.owner) || job.conversionGeneration !== args.expectedGeneration) {
    return result(false, 'CONVERSION_DENIED');
  }
  if (job.state === 'quarantined') return result(args.command === 'quarantined', 'CONVERSION_QUARANTINED',
    { status: 'quarantined', replayed: true });
  if (args.command === 'quarantined') {
    if (!validDigest(args.reasonDigest ?? '')) return result(false, 'CONVERSION_DENIED');
    await db.patch(job._id, { state: 'quarantined', quarantineReasonDigest: args.reasonDigest,
      terminalAt: args.now, updatedAt: args.now });
    return result(true, 'CONVERSION_QUARANTINED', { jobId: job.jobId, status: 'quarantined' });
  }
  if (job.conversionAuthorized !== true || job.state !== 'converting'
    || !args.previewArtifactId || !args.stlArtifactId
    || !validDigest(args.geometryDigest ?? '') || !validDigest(args.previewDigest ?? '')
    || !validDigest(args.stlDigest ?? '') || args.cleanupConfirmed !== true) {
    return result(false, 'CONVERSION_DENIED');
  }
  const preview = await artifactById(db, args.previewArtifactId);
  const stl = await artifactById(db, args.stlArtifactId);
  if (!preview || !stl || !sameOwner(preview, args.owner) || !sameOwner(stl, args.owner)
    || preview.state !== 'stored' || stl.state !== 'stored' || preview.kind !== 'preview-geometry'
    || stl.kind !== 'derived-stl' || preview.sourceArtifactId !== job.artifactId
    || stl.sourceArtifactId !== job.artifactId || preview.geometryDigest !== args.geometryDigest
    || stl.geometryDigest !== args.geometryDigest || preview.restrictedDigest !== args.previewDigest
    || stl.restrictedDigest !== args.stlDigest) return result(false, 'CONVERSION_DENIED');
  await db.patch(job._id, { state: 'ready', previewArtifactId: preview.artifactId,
    stlArtifactId: stl.artifactId, geometryDigest: args.geometryDigest,
    previewDigest: args.previewDigest, stlDigest: args.stlDigest, cleanupConfirmed: true,
    terminalAt: args.now, updatedAt: args.now });
  return result(true, 'CONVERSION_READY_RECORDED', { jobId: job.jobId, status: 'ready' });
}

export async function closeForRollbackCandidate(db: DatabaseWriter, args: {
  scopeKey: string; userId: Id<'users'>; shopId: string; uploadSessionId: string;
  reasonDigest: string; now: number;
}): Promise<Result> {
  if (!validDigest(args.reasonDigest) || !isUint(args.now)) return result(false, 'ROLLBACK_INVALID');
  const prior = await controlByScope(db, args.scopeKey);
  if (prior && (prior.userId !== args.userId || prior.shopId !== args.shopId
    || prior.uploadSessionId !== args.uploadSessionId)) {
    return result(false, 'ROLLBACK_DENIED');
  }
  const grants = await db.query('cadArtifactDownloadGrants')
    .withIndex('by_owner_shop_artifactId', q => q.eq('userId', args.userId).eq('shopId', args.shopId))
    .take(MAX_ROLLBACK_ROWS + 1);
  const artifactRows = await db.query('cadArtifacts').withIndex('by_uploadSessionId', q => q
    .eq('uploadSessionId', args.uploadSessionId)).take(MAX_ROLLBACK_ROWS + 1);
  const artifacts = artifactRows.filter(row => row.userId === args.userId && row.shopId === args.shopId);
  const attempts: Doc<'cadUploadOrchestrationAttempts'>[] = [];
  for (const state of ['reserved', 'body-accepted', 'admitted'] as const) attempts.push(...await db
    .query('cadUploadOrchestrationAttempts').withIndex('by_owner_state', q => q.eq('userId', args.userId)
      .eq('shopId', args.shopId).eq('state', state)).take(MAX_ROLLBACK_ROWS + 1));
  const jobs: Doc<'cadUploadJobs'>[] = [];
  for (const state of ['admitted', 'converting'] as const) jobs.push(...await db.query('cadUploadJobs')
    .withIndex('by_owner_state', q => q.eq('userId', args.userId).eq('shopId', args.shopId)
      .eq('state', state)).take(MAX_ROLLBACK_ROWS + 1));
  if ([grants.length, artifactRows.length, attempts.length, jobs.length].some(count => count > MAX_ROLLBACK_ROWS)) {
    throw Error('ROLLBACK_BOUND_EXCEEDED');
  }
  if (prior && !isIncrementable(prior.generation)
    || artifacts.some(artifact => artifact.state !== 'quarantined' && !isIncrementable(artifact.generation))
    || attempts.some(attempt => attempt.uploadSessionId === args.uploadSessionId && !isIncrementable(attempt.fence))) {
    throw Error('ROLLBACK_STATE_INVALID');
  }
  const control = { scopeKey: args.scopeKey, userId: args.userId, shopId: args.shopId,
    uploadSessionId: args.uploadSessionId,
    admissionClosed: true, conversionClosed: true, grantsRevoked: true,
    uncertainRecordsQuarantined: true, generation: (prior?.generation ?? 0) + 1,
    closedAt: args.now, reasonDigest: args.reasonDigest };
  if (prior) await db.patch(prior._id, control); else await db.insert('cadPhase5ControlState', control);
  for (const grant of grants) if (grant.uploadSessionId === args.uploadSessionId
    && grant.revokedAt === undefined) await db.patch(grant._id, { revokedAt: args.now });
  for (const artifact of artifacts) if (artifact.state !== 'quarantined') await db.patch(artifact._id, {
    state: 'quarantined', quarantineReasonDigest: args.reasonDigest,
    generation: artifact.generation + 1, updatedAt: args.now });
  for (const attempt of attempts) if (attempt.uploadSessionId === args.uploadSessionId) await db.patch(attempt._id, { state: 'quarantined',
    quarantineReasonDigest: args.reasonDigest, fence: attempt.fence + 1, updatedAt: args.now });
  for (const job of jobs) if (job.uploadSessionId === args.uploadSessionId) await db.patch(job._id, { state: 'quarantined',
    quarantineReasonDigest: args.reasonDigest, terminalAt: args.now, updatedAt: args.now });
  return result(true, 'ROLLBACK_CLOSED_FIRST', { admissionClosed: true, conversionClosed: true,
    grantsRevoked: true, uncertainRecordsQuarantined: true, generation: control.generation });
}

export async function reconcileCandidate(db: DatabaseReader, args: {
  kind: 'artifact' | 'tombstone' | 'attempt' | 'job' | 'control'; key: string;
  userId: Id<'users'>; shopId: string; uploadSessionId?: string;
}): Promise<Result> {
  if (args.kind === 'control') {
    const row = await controlByScope(db, args.key);
    if (!row || row.userId !== args.userId || row.shopId !== args.shopId
      || (args.uploadSessionId !== undefined && row.uploadSessionId !== args.uploadSessionId)) {
      return result(false, 'RECONCILIATION_DENIED');
    }
    return result(true, 'RECONCILIATION_PRESENT', { state: 'closed', generation: row.generation,
      admissionClosed: row.admissionClosed, conversionClosed: row.conversionClosed,
      grantsRevoked: row.grantsRevoked, uncertainRecordsQuarantined: row.uncertainRecordsQuarantined });
  }
  if (args.kind === 'tombstone') {
    const row = await unique(db.query('cadArtifactTombstones')
      .withIndex('by_artifactId', q => q.eq('artifactId', args.key)).take(2));
    if (!row || row.userId !== args.userId || row.shopId !== args.shopId
      || (args.uploadSessionId !== undefined && row.uploadSessionId !== args.uploadSessionId)) {
      return result(false, 'RECONCILIATION_DENIED');
    }
    return result(true, 'RECONCILIATION_PRESENT', { state: 'deleted', artifactId: row.artifactId,
      generation: row.generation, deleted: true, tombstoneDigest: row.tombstoneDigest });
  }
  const row = args.kind === 'artifact' ? await artifactById(db, args.key)
    : args.kind === 'attempt' ? await attemptById(db, args.key) : await jobById(db, args.key);
  if (!row || row.userId !== args.userId || row.shopId !== args.shopId
    || (args.uploadSessionId !== undefined && row.uploadSessionId !== args.uploadSessionId)) {
    return result(false, 'RECONCILIATION_DENIED');
  }
  const generation = 'generation' in row ? row.generation
    : 'fence' in row ? row.fence : row.conversionGeneration;
  return result(true, 'RECONCILIATION_PRESENT', { state: row.state, generation,
    ...('artifactId' in row ? { artifactId: row.artifactId } : {}),
    ...('attemptId' in row ? { attemptId: row.attemptId } : {}),
    ...('jobId' in row ? { jobId: row.jobId } : {}) });
}

const run = async (operation: (db: DatabaseWriter) => Promise<Result>, db: DatabaseWriter) => {
  try { return await operation(db); } catch { throw Error('DURABLE_ADAPTER_TRANSACTION_ABORT'); }
};
export const reserveArtifact = internalMutation({ args: { scopeKey: v.string(), owner,
  artifact: custodyArtifact, policy: quotaPolicy, now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => reserveArtifactCandidate(db, args), ctx.db) });
export const consumeQuota = internalMutation({ args: { scopeKey: v.string(), owner,
  operation: operationKind, count: v.number(), policy: quotaPolicy, now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => consumeQuotaCandidate(db, args), ctx.db) });
export const readArtifact = internalQuery({ args: { artifactId: v.string(), owner }, returns: adapterResult,
  handler: (ctx, args) => safe(() => readArtifactCandidate(ctx.db, args)) });
export const transitionArtifact = internalMutation({ args: { artifactId: v.string(), owner,
  expectedGeneration: v.number(), transition: v.union(v.literal('stored'), v.literal('quarantined'),
    v.literal('deleting')), reasonDigest: v.optional(v.string()), now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => transitionArtifactCandidate(db, args), ctx.db) });
export const confirmDeleted = internalMutation({ args: { scopeKey: v.string(), artifactId: v.string(), owner,
  expectedGeneration: v.number(), tombstoneDigest: v.string(), now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => confirmDeletedCandidate(db, args), ctx.db) });
export const issueDownloadGrant = internalMutation({ args: { grantDigest: v.string(), artifactId: v.string(),
  owner, artifactGeneration: v.number(), issuedAt: v.number(), expiresAt: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => issueGrantCandidate(db, args), ctx.db) });
export const resolveDownloadGrant = internalQuery({ args: { grantDigest: v.string(), owner, now: v.number() },
  returns: adapterResult, handler: (ctx, args) => safe(() => resolveGrantCandidate(ctx.db, args)) });
const attemptInput = v.object({ idempotencyDigest: v.string(), attemptId: v.string(), userId: v.id('users'),
  shopId: v.string(), uploadSessionId: v.string(), authorityGeneration: v.number(), deploymentRef: v.string(),
  cohortRef: v.string(), evidenceDigest: v.string(), retentionPolicyDigest: v.string(), reservationMicros: v.number(),
  maxRetries: v.literal(0), createdAt: v.number(), expiresAt: v.number(), bodyByteCount: v.optional(v.number()),
  restrictedDigest: v.optional(v.string()), artifactId: v.optional(v.string()), jobId: v.optional(v.string()),
  quarantineReasonDigest: v.optional(v.string()), updatedAt: v.optional(v.number()) });
export const claimUpload = internalMutation({ args: { scopeKey: v.string(), attempt: attemptInput,
  policy: v.object({ maxAttempts: v.number(), maxConcurrent: v.number(), budgetMicros: v.number() }) },
returns: adapterResult, handler: (ctx, args) => run(db => claimUploadCandidate(db, args), ctx.db) });
export const advanceUpload = internalMutation({ args: { attemptId: v.string(), owner, fence: v.number(),
  command: v.union(v.literal('body-accepted'), v.literal('admitted'), v.literal('quarantined')),
  now: v.number(), byteCount: v.optional(v.number()), restrictedDigest: v.optional(v.string()),
  artifactId: v.optional(v.string()), jobId: v.optional(v.string()), reasonDigest: v.optional(v.string()) },
returns: adapterResult, handler: (ctx, args) => run(db => advanceUploadCandidate(db, args), ctx.db) });
export const claimConversion = internalMutation({ args: { scopeKey: v.string(), jobId: v.string(), owner,
  expectedGeneration: v.number(), now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => claimConversionCandidate(db, args), ctx.db) });
export const advanceConversion = internalMutation({ args: { jobId: v.string(), owner,
  expectedGeneration: v.number(), command: v.union(v.literal('ready'), v.literal('quarantined')),
  now: v.number(), previewArtifactId: v.optional(v.string()), stlArtifactId: v.optional(v.string()),
  geometryDigest: v.optional(v.string()), previewDigest: v.optional(v.string()),
  stlDigest: v.optional(v.string()), cleanupConfirmed: v.optional(v.boolean()),
  reasonDigest: v.optional(v.string()) }, returns: adapterResult,
handler: (ctx, args) => run(db => advanceConversionCandidate(db, args), ctx.db) });
export const closeForRollback = internalMutation({ args: { scopeKey: v.string(), userId: v.id('users'),
  shopId: v.string(), uploadSessionId: v.string(), reasonDigest: v.string(), now: v.number() }, returns: adapterResult,
handler: (ctx, args) => run(db => closeForRollbackCandidate(db, args), ctx.db) });
export const reconcile = internalQuery({ args: { kind: v.union(v.literal('artifact'), v.literal('attempt'),
  v.literal('tombstone'), v.literal('job'), v.literal('control')), key: v.string(), userId: v.id('users'), shopId: v.string(),
  uploadSessionId: v.optional(v.string()) }, returns: adapterResult,
handler: (ctx, args) => safe(() => reconcileCandidate(ctx.db, args)) });
