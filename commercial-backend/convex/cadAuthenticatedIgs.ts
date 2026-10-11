import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation } from './_generated/server';
import type { DatabaseWriter, MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { canUseAuthenticatedCadUpload } from './catalog';
import { membership } from './session';

const SOURCE_MAX_BYTES = 8 * 1024 * 1024;
const STORED_MAX_BYTES = 12 * 1024 * 1024;
const MAX_OBJECTS = 12;
const MAX_DAILY_ATTEMPTS = 4;
const MAX_DAILY_ADMITTED_BYTES = 32 * 1024 * 1024;
const COST_PER_ATTEMPT_MICROS = 2_000_000;
const MAX_DAILY_RESERVED_COST_MICROS = 9_000_000;
const MAX_CLASS_A_OPERATIONS = 1000;
const MAX_CLASS_B_OPERATIONS = 1000;
const MAX_DELETE_OPERATIONS = 1000;
const STALE_CONVERSION_MS = 60_000;
const DERIVED_WARNING = 'Inspection geometry only - not validated for manufacturing.';
const HEX = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

type Plain = Record<string, unknown>;
type Owner = { userId: Id<'users'>; shopId: Id<'shops'>; uploadSessionId: string };

const runtimeEnabled = () => process.env.CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED === 'true'
  && ['development', 'preview'].includes(process.env.CAD_AUTHENTICATED_IGS_ENVIRONMENT || '');
const safeTime = (value: unknown): value is number => typeof value === 'number'
  && Number.isSafeInteger(value) && value >= 0;
const positive = (value: unknown): value is number => safeTime(value) && value > 0;
const digest = (value: unknown): value is string => typeof value === 'string' && HEX.test(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
const plain = (value: unknown): value is Plain => Boolean(value) && typeof value === 'object'
  && !Array.isArray(value);
const exact = (value: Plain, keys: readonly string[]) => Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const parse = (value: string) => {
  if (value.length > 32_000) throw new ConvexError('CAD_SERVICE_INVALID');
  const parsed: unknown = JSON.parse(value);
  if (!plain(parsed)) throw new ConvexError('CAD_SERVICE_INVALID');
  return parsed;
};
const serialize = (value: unknown) => JSON.stringify(value);
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

function normalizeId<TableName extends 'users' | 'shops' | 'authSessions'>(
  db: DatabaseWriter,
  table: TableName,
  value: unknown,
) {
  return typeof value === 'string' ? db.normalizeId(table, value) : null;
}

async function unique<T>(promise: Promise<T[]>) {
  const rows = await promise;
  if (rows.length > 1) throw new ConvexError('CAD_DURABLE_CONFLICT');
  return rows[0] ?? null;
}

const sessionByCredential = (db: DatabaseWriter, credentialDigest: string) => unique(db
  .query('cadUploadSessions').withIndex('by_credentialDigest', q => q
    .eq('credentialDigest', credentialDigest)).take(2));
const sessionById = (db: DatabaseWriter, sessionId: string) => unique(db
  .query('cadUploadSessions').withIndex('by_sessionId', q => q.eq('sessionId', sessionId)).take(2));
const jobById = (db: DatabaseWriter, jobId: string) => unique(db
  .query('cadAuthenticatedIgsJobs').withIndex('by_jobId', q => q.eq('jobId', jobId)).take(2));
const artifactById = (db: DatabaseWriter, artifactId: string) => unique(db
  .query('cadAuthenticatedIgsArtifacts').withIndex('by_artifactId', q => q
    .eq('artifactId', artifactId)).take(2));
const quotaByScope = (db: DatabaseWriter, scopeKey: string) => unique(db
  .query('cadAuthenticatedIgsQuota').withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));

async function currentAuthority(ctx: MutationCtx) {
  if (!runtimeEnabled()) throw new ConvexError('CAD_PREVIEW_DISABLED');
  const { user, shop, member, sessionId, expiresAt } = await membership(ctx);
  if (!canUseAuthenticatedCadUpload(shop.planId)) throw new ConvexError('CAD_ENTITLEMENT_REQUIRED');
  return { userId: user._id, shopId: shop._id, loginSessionId: sessionId,
    authMethod: 'password' as const, cadUploadAllowed: member.active, expiresAt };
}

async function refreshAuthority(db: DatabaseWriter, value: Plain, now: number) {
  const userId = normalizeId(db, 'users', value.userId);
  const shopId = normalizeId(db, 'shops', value.shopId);
  const loginSessionId = normalizeId(db, 'authSessions', value.loginSessionId);
  if (!userId || !shopId || !loginSessionId || value.authMethod !== 'password') return null;
  const [user, shop, login, member] = await Promise.all([
    db.get(userId), db.get(shopId), db.get(loginSessionId),
    unique(db.query('memberships').withIndex('by_userId', q => q.eq('userId', userId)).take(2)),
  ]);
  if (!user || !shop || !login || login.userId !== userId || login.expirationTime <= now
    || !member || !member.active || member.shopId !== shopId
    || !canUseAuthenticatedCadUpload(shop.planId)) return null;
  return { userId: String(userId), shopId: String(shopId), loginSessionId: String(loginSessionId),
    authMethod: 'password', cadUploadAllowed: true, expiresAt: login.expirationTime };
}

async function activeUploadSession(db: DatabaseWriter, sessionIdValue: unknown, now: number) {
  if (!identifier(sessionIdValue)) return null;
  const record = await sessionById(db, sessionIdValue);
  if (!record || record.status !== 'active' || record.expiresAt <= now) return null;
  const authority = await refreshAuthority(db, record, now);
  return authority ? record : null;
}

function projectUploadSession(record: Doc<'cadUploadSessions'>) {
  return { schemaVersion: 2, userId: String(record.userId), shopId: String(record.shopId),
    sessionId: record.sessionId, loginSessionId: String(record.loginSessionId),
    authMethod: record.authMethod, cadUploadAllowed: record.cadUploadAllowed,
    transport: record.transport, issuedAt: record.issuedAt, expiresAt: record.expiresAt,
    status: record.status, csrfDigest: record.csrfDigest };
}

function projectJob(record: Doc<'cadAuthenticatedIgsJobs'>) {
  return { schemaVersion: 1, jobId: record.jobId, state: record.state,
    extension: record.extension, byteCount: record.contentLength, attemptCount: record.attemptCount,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    ...(record.safeCode ? { code: record.safeCode } : {}),
    ...(record.state === 'ready' ? { artifacts: { original: true, preview: true, stl: true } } : {}) };
}

function projectArtifact(record: Doc<'cadAuthenticatedIgsArtifacts'>) {
  const { _id: _discardId, _creationTime: _discardCreationTime, ...artifact } = record;
  return { ...artifact, userId: String(record.userId), shopId: String(record.shopId) };
}

function ownerFrom(db: DatabaseWriter, value: unknown): Owner | null {
  if (!plain(value)) return null;
  const userId = normalizeId(db, 'users', value.userId);
  const shopId = normalizeId(db, 'shops', value.shopId);
  return userId && shopId && identifier(value.uploadSessionId)
    ? { userId, shopId, uploadSessionId: value.uploadSessionId }
    : null;
}

function sameOwner(record: { userId: Id<'users'>; shopId: Id<'shops'>; uploadSessionId: string }, owner: Owner) {
  return record.userId === owner.userId && record.shopId === owner.shopId
    && record.uploadSessionId === owner.uploadSessionId;
}

async function authorizeOwner(db: DatabaseWriter, owner: Owner, now: number) {
  const session = await activeUploadSession(db, owner.uploadSessionId, now);
  return Boolean(session && session.userId === owner.userId && session.shopId === owner.shopId);
}

async function ensureQuota(db: DatabaseWriter, owner: Owner, now: number) {
  const scopeKey = String(owner.shopId);
  const periodKey = dayKey(now);
  let quota = await quotaByScope(db, scopeKey);
  if (!quota) {
    const id = await db.insert('cadAuthenticatedIgsQuota', { scopeKey,
      shopId: owner.shopId, periodKey, admittedBytes: 0, attemptCount: 0,
      reservedCostMicros: 0, storedBytes: 0, objectCount: 0, classAOperations: 0,
      classBOperations: 0, deleteOperations: 0, revision: 1, stopped: false, updatedAt: now });
    quota = (await db.get(id))!;
  }
  if (quota.shopId !== owner.shopId || quota.stopped) return null;
  if (quota.periodKey !== periodKey) {
    await db.patch(quota._id, { periodKey, admittedBytes: 0, attemptCount: 0,
      reservedCostMicros: 0, revision: quota.revision + 1, updatedAt: now });
    quota = { ...quota, periodKey, admittedBytes: 0, attemptCount: 0,
      reservedCostMicros: 0, revision: quota.revision + 1, updatedAt: now };
  }
  return quota;
}

function policyValid(value: unknown) {
  return plain(value) && value.maxStoredBytes === STORED_MAX_BYTES && value.maxObjects === MAX_OBJECTS
    && value.maxClassAOperations === MAX_CLASS_A_OPERATIONS
    && value.maxClassBOperations === MAX_CLASS_B_OPERATIONS
    && value.maxDeleteOperations === MAX_DELETE_OPERATIONS;
}

function artifactRecord(db: DatabaseWriter, raw: unknown) {
  if (!plain(raw)) return null;
  const owner = ownerFrom(db, raw);
  const keys = ['schemaVersion', 'artifactId', 'userId', 'shopId', 'uploadSessionId', 'kind', 'format',
    'byteCount', 'restrictedDigest', 'providerObjectKey', 'objectKeyDigest', 'state', 'createdAt',
    'retainedUntil', 'generation'];
  const optional = ['sourceArtifactId', 'sourceDigest', 'geometryDigest', 'units', 'warning',
    'updatedAt', 'quarantineReasonDigest'];
  if (!owner || Object.keys(raw).some(key => !keys.includes(key) && !optional.includes(key))
    || raw.schemaVersion !== 1 || !identifier(raw.artifactId)
    || !['original-igs', 'preview-geometry', 'derived-stl'].includes(String(raw.kind))
    || !['model/iges', 'application/vnd.reversr.preview+json', 'model/stl'].includes(String(raw.format))
    || !positive(raw.byteCount) || raw.byteCount > SOURCE_MAX_BYTES
    || !digest(raw.restrictedDigest) || typeof raw.providerObjectKey !== 'string'
    || !/^phase5\/[a-f0-9]{64}$/.test(raw.providerObjectKey) || !digest(raw.objectKeyDigest)
    || raw.state !== 'reserved' || !safeTime(raw.createdAt) || !positive(raw.retainedUntil)
    || raw.retainedUntil <= raw.createdAt || raw.generation !== 1) return null;
  const derived = raw.kind !== 'original-igs';
  if (derived !== Boolean(identifier(raw.sourceArtifactId) && digest(raw.sourceDigest)
    && digest(raw.geometryDigest) && raw.units === 'millimeter' && raw.warning === DERIVED_WARNING)) return null;
  return { schemaVersion: 1 as const, artifactId: raw.artifactId, ...owner,
    kind: raw.kind as 'original-igs' | 'preview-geometry' | 'derived-stl', format: raw.format as string,
    byteCount: raw.byteCount, restrictedDigest: raw.restrictedDigest,
    ...(derived ? { sourceArtifactId: raw.sourceArtifactId as string,
      sourceDigest: raw.sourceDigest as string, geometryDigest: raw.geometryDigest as string,
      units: 'millimeter' as const, warning: DERIVED_WARNING } : {}),
    providerObjectKey: raw.providerObjectKey, objectKeyDigest: raw.objectKeyDigest,
    state: 'reserved' as const, createdAt: raw.createdAt, retainedUntil: raw.retainedUntil,
    generation: 1 };
}

async function serviceOperation(db: DatabaseWriter, operation: string, payload: Plain, now: number) {
  if (!runtimeEnabled() || !safeTime(now)) throw new ConvexError('CAD_SERVICE_DISABLED');

  if (operation === 'session.insert') {
    if (!exact(payload, ['credentialDigest', 'record']) || !digest(payload.credentialDigest)
      || !plain(payload.record)) return false;
    const record = payload.record;
    const userId = normalizeId(db, 'users', record.userId);
    const shopId = normalizeId(db, 'shops', record.shopId);
    const loginSessionId = normalizeId(db, 'authSessions', record.loginSessionId);
    if (!userId || !shopId || !loginSessionId || record.schemaVersion !== 2
      || !identifier(record.sessionId) || record.authMethod !== 'password'
      || record.cadUploadAllowed !== true || record.transport !== 'cookie'
      || !safeTime(record.issuedAt) || !positive(record.expiresAt) || record.expiresAt <= record.issuedAt
      || record.status !== 'active' || !digest(record.csrfDigest)
      || await sessionByCredential(db, payload.credentialDigest)
      || await sessionById(db, record.sessionId)) return false;
    const authority = await refreshAuthority(db, { userId, shopId, loginSessionId,
      authMethod: 'password' }, now);
    if (!authority || record.expiresAt > authority.expiresAt) return false;
    await db.insert('cadUploadSessions', { schemaVersion: 2, credentialDigest: payload.credentialDigest,
      userId, shopId, loginSessionId, sessionId: record.sessionId, authMethod: 'password',
      cadUploadAllowed: true, transport: 'cookie', issuedAt: record.issuedAt,
      expiresAt: record.expiresAt, status: 'active', csrfDigest: record.csrfDigest });
    return true;
  }

  if (operation === 'session.read') {
    if (!exact(payload, ['credentialDigest']) || !digest(payload.credentialDigest)) return null;
    const record = await sessionByCredential(db, payload.credentialDigest);
    if (!record) return null;
    if (record.status !== 'active' || record.expiresAt <= now
      || !await refreshAuthority(db, record, now)) return null;
    return projectUploadSession(record);
  }

  if (operation === 'session.revoke') {
    if (!exact(payload, ['credentialDigest', 'revokedAt']) || !digest(payload.credentialDigest)
      || !safeTime(payload.revokedAt)) return false;
    const record = await sessionByCredential(db, payload.credentialDigest);
    if (!record) return false;
    if (record.status !== 'revoked') await db.patch(record._id, { status: 'revoked', revokedAt: payload.revokedAt });
    return true;
  }

  if (operation === 'authorization.refresh') {
    if (!exact(payload, ['binding']) || !plain(payload.binding)) return null;
    return refreshAuthority(db, payload.binding, now);
  }

  if (operation === 'job.claim') {
    const keys = ['owner', 'jobId', 'idempotencyDigest', 'requestDigest', 'extension', 'contentLength'];
    if (!exact(payload, keys)) return { accepted: false, code: 'UPLOAD_INVALID' };
    const owner = ownerFrom(db, payload.owner);
    if (!owner || !await authorizeOwner(db, owner, now) || !identifier(payload.jobId)
      || !digest(payload.idempotencyDigest) || !digest(payload.requestDigest)
      || !['igs', 'iges'].includes(String(payload.extension)) || !positive(payload.contentLength)
      || payload.contentLength > SOURCE_MAX_BYTES) return { accepted: false, code: 'UPLOAD_DENIED' };
    const prior = await unique(db.query('cadAuthenticatedIgsJobs')
      .withIndex('by_shopId_and_idempotencyDigest', q => q.eq('shopId', owner.shopId)
        .eq('idempotencyDigest', payload.idempotencyDigest as string)).take(2));
    if (prior) return prior.userId === owner.userId && prior.requestDigest === payload.requestDigest
      ? { accepted: true, duplicate: true, job: projectJob(prior) }
      : { accepted: false, code: 'IDEMPOTENCY_CONFLICT' };
    const quota = await ensureQuota(db, owner, now);
    if (!quota || quota.attemptCount >= MAX_DAILY_ATTEMPTS
      || quota.admittedBytes + payload.contentLength > MAX_DAILY_ADMITTED_BYTES
      || quota.reservedCostMicros + COST_PER_ATTEMPT_MICROS > MAX_DAILY_RESERVED_COST_MICROS) {
      return { accepted: false, code: 'UPLOAD_QUOTA_EXHAUSTED' };
    }
    await db.patch(quota._id, { admittedBytes: quota.admittedBytes + payload.contentLength,
      attemptCount: quota.attemptCount + 1,
      reservedCostMicros: quota.reservedCostMicros + COST_PER_ATTEMPT_MICROS,
      revision: quota.revision + 1, updatedAt: now });
    await db.insert('cadAuthenticatedIgsJobs', { jobId: payload.jobId as string,
      idempotencyDigest: payload.idempotencyDigest as string,
      requestDigest: payload.requestDigest as string, userId: owner.userId, shopId: owner.shopId,
      uploadSessionId: owner.uploadSessionId, extension: payload.extension as 'igs' | 'iges',
      contentLength: payload.contentLength as number, state: 'admitted', attemptCount: 0,
      reservedCostMicros: COST_PER_ATTEMPT_MICROS, createdAt: now, updatedAt: now });
    const job = await jobById(db, payload.jobId as string);
    return { accepted: true, duplicate: false, job: projectJob(job!) };
  }

  if (operation === 'job.attachOriginal') {
    if (!exact(payload, ['owner', 'jobId', 'artifactId'])) return false;
    const owner = ownerFrom(db, payload.owner);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    const artifact = identifier(payload.artifactId) ? await artifactById(db, payload.artifactId) : null;
    const attached = identifier(payload.artifactId) ? await unique(db.query('cadAuthenticatedIgsJobs')
      .withIndex('by_originalArtifactId', q => q.eq('originalArtifactId', payload.artifactId as string)).take(2)) : null;
    if (!owner || !job || !artifact || !sameOwner(job, owner) || !sameOwner(artifact, owner)
      || job.state !== 'admitted' || job.originalArtifactId || artifact.kind !== 'original-igs'
      || artifact.state !== 'stored' || attached) return false;
    await db.patch(job._id, { originalArtifactId: artifact.artifactId, updatedAt: now });
    return true;
  }

  if (operation === 'job.claimConversion') {
    if (!exact(payload, ['owner', 'jobId'])) return { accepted: false, code: 'CONVERSION_INVALID' };
    const owner = ownerFrom(db, payload.owner);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    if (!owner || !job || !sameOwner(job, owner) || !await authorizeOwner(db, owner, now)) {
      return { accepted: false, code: 'CONVERSION_DENIED' };
    }
    if (job.state !== 'admitted' || !job.originalArtifactId || job.attemptCount !== 0) {
      return { accepted: false, code: ['ready', 'failed', 'quarantined'].includes(job.state)
        ? 'CONVERSION_TERMINAL' : 'CONVERSION_ALREADY_CLAIMED' };
    }
    const active = await db.query('cadAuthenticatedIgsJobs').withIndex('by_shopId_and_state', q => q
      .eq('shopId', owner.shopId).eq('state', 'converting')).take(2);
    let busy = false;
    for (const candidate of active) {
      if (now - candidate.updatedAt >= STALE_CONVERSION_MS) {
        await db.patch(candidate._id, { state: 'quarantined', safeCode: 'CONVERSION_OUTCOME_UNKNOWN',
          updatedAt: now, terminalAt: now });
      } else busy = true;
    }
    if (busy) return { accepted: false, code: 'CONVERSION_BUSY' };
    await db.patch(job._id, { state: 'converting', attemptCount: 1, updatedAt: now });
    return { accepted: true, job: projectJob({ ...job, state: 'converting', attemptCount: 1,
      updatedAt: now }) };
  }

  if (operation === 'job.complete') {
    const keys = ['owner', 'jobId', 'previewArtifactId', 'stlArtifactId', 'geometryDigest'];
    if (!exact(payload, keys)) return false;
    const owner = ownerFrom(db, payload.owner);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    const preview = identifier(payload.previewArtifactId) ? await artifactById(db, payload.previewArtifactId) : null;
    const stl = identifier(payload.stlArtifactId) ? await artifactById(db, payload.stlArtifactId) : null;
    if (!owner || !job || !preview || !stl || !sameOwner(job, owner)
      || !sameOwner(preview, owner) || !sameOwner(stl, owner) || job.state !== 'converting'
      || job.attemptCount !== 1 || !job.originalArtifactId || preview.state !== 'stored'
      || stl.state !== 'stored' || preview.kind !== 'preview-geometry' || stl.kind !== 'derived-stl'
      || preview.sourceArtifactId !== job.originalArtifactId || stl.sourceArtifactId !== job.originalArtifactId
      || !digest(payload.geometryDigest) || preview.geometryDigest !== payload.geometryDigest
      || stl.geometryDigest !== payload.geometryDigest) return false;
    await db.patch(job._id, { state: 'ready', previewArtifactId: preview.artifactId,
      stlArtifactId: stl.artifactId, geometryDigest: payload.geometryDigest, updatedAt: now,
      terminalAt: now });
    return true;
  }

  if (operation === 'job.fail') {
    if (!exact(payload, ['owner', 'jobId', 'code', 'quarantined'])) return false;
    const owner = ownerFrom(db, payload.owner);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    if (!owner || !job || !sameOwner(job, owner) || !identifier(payload.code)
      || typeof payload.quarantined !== 'boolean') return false;
    if (['ready', 'failed', 'quarantined'].includes(job.state)) return true;
    await db.patch(job._id, { state: payload.quarantined ? 'quarantined' : 'failed',
      safeCode: payload.code, updatedAt: now, terminalAt: now });
    return true;
  }

  if (operation === 'job.read' || operation === 'job.artifacts') {
    if (!exact(payload, ['currentSessionId', 'jobId'])) return null;
    const session = await activeUploadSession(db, payload.currentSessionId, now);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    if (!session || !job || job.userId !== session.userId || job.shopId !== session.shopId) return null;
    if (job.state === 'converting' && now - job.updatedAt >= STALE_CONVERSION_MS) {
      await db.patch(job._id, { state: 'quarantined', safeCode: 'CONVERSION_OUTCOME_UNKNOWN',
        updatedAt: now, terminalAt: now });
      job.state = 'quarantined'; job.safeCode = 'CONVERSION_OUTCOME_UNKNOWN'; job.updatedAt = now;
    }
    if (operation === 'job.artifacts') {
      const [original, preview, stl] = await Promise.all([
        job.originalArtifactId ? artifactById(db, job.originalArtifactId) : null,
        job.previewArtifactId ? artifactById(db, job.previewArtifactId) : null,
        job.stlArtifactId ? artifactById(db, job.stlArtifactId) : null,
      ]);
      const ownedId = (artifact: Doc<'cadAuthenticatedIgsArtifacts'> | null) =>
        artifact && artifact.userId === job.userId && artifact.shopId === job.shopId
          && artifact.uploadSessionId === job.uploadSessionId ? artifact.artifactId : null;
      return { job: projectJob(job), owner: { userId: String(job.userId), shopId: String(job.shopId),
        uploadSessionId: job.uploadSessionId }, artifactIds: { original: ownedId(original),
        preview: ownedId(preview), stl: ownedId(stl) } };
    }
    return projectJob(job);
  }

  if (operation === 'job.latest') {
    if (!exact(payload, ['currentSessionId'])) return null;
    const session = await activeUploadSession(db, payload.currentSessionId, now);
    if (!session) return null;
    const [job] = await db.query('cadAuthenticatedIgsJobs')
      .withIndex('by_userId_and_shopId_and_updatedAt', q => q.eq('userId', session.userId)
        .eq('shopId', session.shopId)).order('desc').take(1);
    return job ? projectJob(job) : null;
  }

  if (operation === 'job.deleted') {
    if (!exact(payload, ['currentSessionId', 'jobId'])) return false;
    const session = await activeUploadSession(db, payload.currentSessionId, now);
    const job = identifier(payload.jobId) ? await jobById(db, payload.jobId) : null;
    if (!session || !job || job.userId !== session.userId || job.shopId !== session.shopId) return false;
    await db.patch(job._id, { state: 'deleted', safeCode: 'ARTIFACTS_DELETED',
      updatedAt: now, terminalAt: now });
    return true;
  }

  if (operation === 'artifact.reserve') {
    if (!exact(payload, ['scopeKey', 'owner', 'record', 'policy']) || !policyValid(payload.policy)) return false;
    const owner = ownerFrom(db, payload.owner);
    const record = artifactRecord(db, payload.record);
    if (!owner || !record || !sameOwner(record, owner) || !await authorizeOwner(db, owner, now)
      || payload.scopeKey !== String(owner.shopId) || await artifactById(db, record.artifactId)) return false;
    if (record.kind !== 'original-igs') {
      const source = await artifactById(db, record.sourceArtifactId!);
      if (!source || !sameOwner(source, owner) || source.kind !== 'original-igs'
        || source.state !== 'stored' || source.restrictedDigest !== record.sourceDigest) return false;
    }
    const quota = await ensureQuota(db, owner, now);
    if (!quota || quota.storedBytes + record.byteCount > STORED_MAX_BYTES
      || quota.objectCount + 1 > MAX_OBJECTS) return false;
    await db.insert('cadAuthenticatedIgsArtifacts', record);
    await db.patch(quota._id, { storedBytes: quota.storedBytes + record.byteCount,
      objectCount: quota.objectCount + 1, revision: quota.revision + 1, updatedAt: now });
    return true;
  }

  if (operation === 'artifact.consumeOperation') {
    if (!exact(payload, ['scopeKey', 'owner', 'kind', 'count', 'policy']) || !policyValid(payload.policy)) return false;
    const owner = ownerFrom(db, payload.owner);
    if (!owner || payload.scopeKey !== String(owner.shopId) || !await authorizeOwner(db, owner, now)
      || !['class-a', 'class-b', 'delete'].includes(String(payload.kind))
      || !positive(payload.count)) return false;
    const quota = await ensureQuota(db, owner, now);
    if (!quota) return false;
    const field = payload.kind === 'class-a' ? 'classAOperations'
      : payload.kind === 'class-b' ? 'classBOperations' : 'deleteOperations';
    const maximum = payload.kind === 'class-a' ? MAX_CLASS_A_OPERATIONS
      : payload.kind === 'class-b' ? MAX_CLASS_B_OPERATIONS : MAX_DELETE_OPERATIONS;
    if (quota[field] + payload.count > maximum) return false;
    await db.patch(quota._id, { [field]: quota[field] + payload.count,
      revision: quota.revision + 1, updatedAt: now });
    return true;
  }

  if (operation === 'artifact.read') {
    if (!exact(payload, ['artifactId', 'owner'])) return null;
    const owner = ownerFrom(db, payload.owner);
    const artifact = identifier(payload.artifactId) ? await artifactById(db, payload.artifactId) : null;
    return owner && artifact && sameOwner(artifact, owner) ? projectArtifact(artifact) : null;
  }

  if (operation === 'artifact.transition') {
    const keys = ['artifactId', 'owner', 'expectedGeneration', 'transition', 'reasonDigest'];
    if (!exact(payload, keys)) return false;
    const owner = ownerFrom(db, payload.owner);
    const artifact = identifier(payload.artifactId) ? await artifactById(db, payload.artifactId) : null;
    if (!owner || !artifact || !sameOwner(artifact, owner) || artifact.generation !== payload.expectedGeneration
      || !['stored', 'quarantined', 'deleting'].includes(String(payload.transition))) return false;
    const allowed = payload.transition === 'stored' && artifact.state === 'reserved'
      || payload.transition === 'quarantined' && ['reserved', 'stored', 'deleting'].includes(artifact.state)
      || payload.transition === 'deleting' && ['stored', 'quarantined'].includes(artifact.state);
    if (!allowed || payload.transition === 'quarantined' && !digest(payload.reasonDigest)
      || payload.transition !== 'quarantined' && payload.reasonDigest !== null) return false;
    await db.patch(artifact._id, { state: payload.transition as 'stored' | 'quarantined' | 'deleting',
      generation: artifact.generation + 1, updatedAt: now,
      ...(payload.transition === 'quarantined' ? { quarantineReasonDigest: payload.reasonDigest as string } : {}) });
    if (payload.transition === 'quarantined') {
      const grants = await db.query('cadAuthenticatedIgsGrants').withIndex('by_owner_and_artifactId', q => q
        .eq('userId', owner.userId).eq('shopId', owner.shopId).eq('artifactId', artifact.artifactId)).take(50);
      for (const grant of grants) if (grant.revokedAt === undefined) await db.patch(grant._id, { revokedAt: now });
    }
    return true;
  }

  if (operation === 'artifact.confirmDeleted') {
    if (!exact(payload, ['scopeKey', 'artifactId', 'owner', 'expectedGeneration', 'tombstoneDigest'])
      || !digest(payload.tombstoneDigest)) return null;
    const owner = ownerFrom(db, payload.owner);
    const artifact = identifier(payload.artifactId) ? await artifactById(db, payload.artifactId) : null;
    if (!owner || !artifact || !sameOwner(artifact, owner) || payload.scopeKey !== String(owner.shopId)
      || artifact.state !== 'deleting' || artifact.generation !== payload.expectedGeneration) return null;
    const quota = await ensureQuota(db, owner, now);
    if (!quota || quota.storedBytes < artifact.byteCount || quota.objectCount < 1) return null;
    await db.delete(artifact._id);
    await db.patch(quota._id, { storedBytes: quota.storedBytes - artifact.byteCount,
      objectCount: quota.objectCount - 1, revision: quota.revision + 1, updatedAt: now });
    return { deleted: true, tombstoneDigest: payload.tombstoneDigest };
  }

  if (operation === 'grant.issue') {
    const keys = ['grantDigest', 'artifactId', 'owner', 'artifactGeneration', 'issuedAt', 'expiresAt'];
    if (!exact(payload, keys) || !digest(payload.grantDigest) || !safeTime(payload.issuedAt)
      || !positive(payload.expiresAt) || payload.expiresAt <= payload.issuedAt) return false;
    const owner = ownerFrom(db, payload.owner);
    const artifact = identifier(payload.artifactId) ? await artifactById(db, payload.artifactId) : null;
    if (!owner || !artifact || !sameOwner(artifact, owner) || artifact.state !== 'stored'
      || artifact.generation !== payload.artifactGeneration || artifact.retainedUntil < payload.expiresAt
      || await unique(db.query('cadAuthenticatedIgsGrants').withIndex('by_grantDigest', q => q
        .eq('grantDigest', payload.grantDigest as string)).take(2))) return false;
    await db.insert('cadAuthenticatedIgsGrants', { grantDigest: payload.grantDigest as string,
      artifactId: artifact.artifactId, ...owner, artifactGeneration: payload.artifactGeneration as number,
      issuedAt: payload.issuedAt, expiresAt: payload.expiresAt });
    return true;
  }

  if (operation === 'grant.resolve') {
    if (!exact(payload, ['grantDigest', 'owner']) || !digest(payload.grantDigest)) return null;
    const owner = ownerFrom(db, payload.owner);
    const grant = await unique(db.query('cadAuthenticatedIgsGrants').withIndex('by_grantDigest', q => q
      .eq('grantDigest', payload.grantDigest as string)).take(2));
    if (!owner || !grant || grant.userId !== owner.userId || grant.shopId !== owner.shopId
      || grant.uploadSessionId !== owner.uploadSessionId || grant.revokedAt !== undefined
      || grant.consumedAt !== undefined || grant.expiresAt <= now) return null;
    const artifact = await artifactById(db, grant.artifactId);
    if (!artifact || !sameOwner(artifact, owner) || artifact.state !== 'stored'
      || artifact.generation !== grant.artifactGeneration || artifact.retainedUntil <= now) return null;
    await db.patch(grant._id, { consumedAt: now });
    return projectArtifact(artifact);
  }

  throw new ConvexError('CAD_SERVICE_OPERATION_UNSUPPORTED');
}

export const authorizeCurrent = mutation({
  args: {},
  returns: v.object({ userId: v.string(), shopId: v.string(), loginSessionId: v.string(),
    authMethod: v.literal('password'), cadUploadAllowed: v.boolean(), expiresAt: v.number() }),
  handler: async ctx => {
    const authority = await currentAuthority(ctx);
    return { ...authority, userId: String(authority.userId), shopId: String(authority.shopId),
      loginSessionId: String(authority.loginSessionId) };
  },
});

export const service = internalMutation({
  args: { operation: v.string(), payloadJson: v.string(), now: v.number() },
  returns: v.object({ resultJson: v.string() }),
  handler: async (ctx, args) => {
    try {
      const result = await serviceOperation(ctx.db, args.operation, parse(args.payloadJson), args.now);
      return { resultJson: serialize(result) };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      throw new ConvexError('CAD_SERVICE_UNAVAILABLE');
    }
  },
});

export const AUTHENTICATED_IGS_LIMITS = Object.freeze({ SOURCE_MAX_BYTES, STORED_MAX_BYTES,
  MAX_OBJECTS, MAX_DAILY_ATTEMPTS, MAX_DAILY_ADMITTED_BYTES, COST_PER_ATTEMPT_MICROS,
  MAX_DAILY_RESERVED_COST_MICROS, MAX_CLASS_A_OPERATIONS, MAX_CLASS_B_OPERATIONS,
  MAX_DELETE_OPERATIONS, STALE_CONVERSION_MS });
