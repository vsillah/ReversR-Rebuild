// Source-only adapters that connect the reviewed Package 8 Convex invoker,
// private R2 custody, and bounded Sandbox executor. Nothing imports this file
// from a route or runtime bootstrap.
const { createHash } = require('node:crypto');
const { POLICY: CUSTODY_POLICY } = require('./cadR2PrivateArtifactCustody');
const { createInspectionStl, normalizeGeometry }
  = require('./cadPhase5DerivedArtifactOrchestrator');

const hash = value => createHash('sha256').update(value).digest('hex');
const SAME_OWNER_KEYS = Object.freeze(['userId', 'shopId', 'uploadSessionId']);
const REQUIRED_DURABLE_OPERATIONS = Object.freeze([
  'claimUpload',
  'reserveArtifact',
  'consumeQuota',
  'readArtifact',
  'transitionArtifact',
  'confirmDeleted',
  'issueDownloadGrant',
  'resolveDownloadGrant',
  'closeForRollback',
  'reconcile',
]);
const safeResult = value => Boolean(value && typeof value === 'object'
  && !Array.isArray(value) && value.sourceOnly === true && value.routeMounted === false
  && value.bodyAdmissionAuthorized === false && value.providerDispatchEnabled === false
  && value.conversionDispatchEnabled === false && value.downloadRouteEnabled === false);
const sameOwner = (left, right) => SAME_OWNER_KEYS.every(key => left?.[key] === right?.[key]);
const validOwner = value => SAME_OWNER_KEYS.every(key => typeof value?.[key] === 'string'
  && value[key].length > 0);
const validInvoker = value => Boolean(value?.status?.().configured === true
  && REQUIRED_DURABLE_OPERATIONS.every(operation => typeof value[operation] === 'function'));

function createCadPhase5Package8DurableCustodyStore({
  durable,
  cleanupDurable,
  scopeKey,
  owner,
  now = Date.now,
} = {}) {
  const reviewConfigured = validInvoker(durable) && validInvoker(cleanupDurable)
    && typeof scopeKey === 'string' && scopeKey.length > 0 && validOwner(owner)
    && typeof now === 'function';
  const records = new Map();
  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0) throw Error('PACKAGE8_STORE_UNAVAILABLE');
    return value;
  };
  const invoke = async (target, operation, args, signal) => {
    signal?.throwIfAborted?.();
    const result = await target[operation](Object.freeze(args));
    signal?.throwIfAborted?.();
    if (!safeResult(result)) throw Error('PACKAGE8_STORE_UNAVAILABLE');
    return result;
  };
  const requireRecord = (artifactId, expectedOwner) => {
    const record = records.get(artifactId);
    return record && sameOwner(record, expectedOwner) ? record : null;
  };
  const quotaPolicy = Object.freeze({
    maxStoredBytes: CUSTODY_POLICY.maxStoredBytes,
    maxObjects: CUSTODY_POLICY.maxObjects,
    maxClassAOperations: CUSTODY_POLICY.maxClassAOperations,
    maxClassBOperations: CUSTODY_POLICY.maxClassBOperations,
    maxDeleteOperations: CUSTODY_POLICY.maxDeleteOperations,
  });
  const matchesQuotaPolicy = policy => Object.entries(quotaPolicy)
    .every(([key, value]) => policy?.[key] === value);

  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    routeMounted: false,
    providerDispatchEnabled: false,
    automaticRetries: 0,
    durableOperations: REQUIRED_DURABLE_OPERATIONS,
    quotaPolicy,
    async reserve(record, policy, { signal } = {}) {
      if (!reviewConfigured || !sameOwner(record, owner) || !matchesQuotaPolicy(policy)) return false;
      const result = await invoke(durable, 'reserveArtifact', {
        scopeKey, owner, artifact: record, policy: quotaPolicy, now: record.createdAt,
      }, signal);
      if (result.accepted !== true || result.code !== 'ARTIFACT_RESERVED'
        || result.artifactId !== record.artifactId) return false;
      records.set(record.artifactId, { ...record });
      return true;
    },
    async consumeOperation(operation, count, policy, { signal } = {}) {
      if (!reviewConfigured || !matchesQuotaPolicy(policy)) return false;
      const target = operation === 'class-a' ? durable : cleanupDurable;
      const result = await invoke(target, 'consumeQuota', {
        scopeKey, owner, operation, count, policy: quotaPolicy, now: clock(),
      }, signal);
      return result.accepted === true && result.code === 'QUOTA_RESERVED';
    },
    async readForOwner(artifactId, expectedOwner, { signal } = {}) {
      if (!reviewConfigured || !sameOwner(expectedOwner, owner)) return null;
      const record = requireRecord(artifactId, expectedOwner);
      if (!record) return null;
      const result = await invoke(durable, 'readArtifact', { artifactId, owner }, signal);
      if (result.accepted !== true || result.artifactId !== artifactId
        || result.byteCount !== record.byteCount || !Number.isSafeInteger(result.generation)) return null;
      const refreshed = { ...record, state: result.state, generation: result.generation,
        retainedUntil: result.retainedUntil };
      records.set(artifactId, refreshed);
      return { ...refreshed };
    },
    async markStored(artifactId, expectedGeneration, updatedAt, { signal } = {}) {
      if (!reviewConfigured) return false;
      const record = requireRecord(artifactId, owner);
      if (!record || record.generation !== expectedGeneration) return false;
      const result = await invoke(durable, 'transitionArtifact', { artifactId, owner,
        expectedGeneration, transition: 'stored', now: updatedAt }, signal);
      if (result.accepted !== true || result.artifactId !== artifactId
        || !Number.isSafeInteger(result.generation)) return false;
      records.set(artifactId, { ...record, state: 'stored', generation: result.generation,
        updatedAt });
      return true;
    },
    async markUnknown(artifactId, reason, updatedAt, { signal } = {}) {
      if (!reviewConfigured) return false;
      const record = requireRecord(artifactId, owner);
      if (!record) return false;
      const reasonDigest = hash(`package8-custody:${reason}`);
      const result = await invoke(cleanupDurable, 'transitionArtifact', { artifactId, owner,
        expectedGeneration: record.generation, transition: 'quarantined',
        reasonDigest, now: updatedAt }, signal);
      if (result.accepted !== true || !Number.isSafeInteger(result.generation)) return false;
      records.set(artifactId, { ...record, state: 'quarantined',
        generation: result.generation, updatedAt, quarantineReasonDigest: reasonDigest });
      return true;
    },
    async beginDelete(artifactId, expectedOwner, updatedAt, { signal } = {}) {
      if (!reviewConfigured || !sameOwner(expectedOwner, owner)) return null;
      let record = requireRecord(artifactId, owner);
      if (!record) return null;
      const reconciled = await invoke(cleanupDurable, 'reconcile', { kind: 'artifact',
        key: artifactId, userId: owner.userId, shopId: owner.shopId,
        uploadSessionId: owner.uploadSessionId }, signal);
      if (reconciled.accepted !== true || reconciled.artifactId !== artifactId
        || reconciled.state !== 'quarantined' || !Number.isSafeInteger(reconciled.generation)) return null;
      record = { ...record, state: reconciled.state, generation: reconciled.generation,
        updatedAt };
      records.set(artifactId, record);
      const result = await invoke(cleanupDurable, 'transitionArtifact', { artifactId, owner,
        expectedGeneration: record.generation, transition: 'deleting', now: updatedAt }, signal);
      if (result.accepted !== true || !Number.isSafeInteger(result.generation)) return null;
      const deleting = { ...record, state: 'deleting', generation: result.generation, updatedAt };
      records.set(artifactId, deleting);
      return { ...deleting };
    },
    async confirmDeleted(artifactId, expectedGeneration, deletedAt, { signal } = {}) {
      if (!reviewConfigured) return null;
      const record = requireRecord(artifactId, owner);
      if (!record || record.generation !== expectedGeneration || record.state !== 'deleting') return null;
      const tombstoneDigest = hash(`package8-deleted:${artifactId}:${record.objectKeyDigest}`);
      const result = await invoke(cleanupDurable, 'confirmDeleted', { scopeKey, artifactId,
        owner, expectedGeneration, tombstoneDigest, now: deletedAt }, signal);
      if (result.accepted !== true || result.deleted !== true
        || result.tombstoneDigest !== tombstoneDigest) return null;
      records.delete(artifactId);
      return { deleted: true, tombstoneDigest };
    },
    async issueGrant(grantDigest, artifactId, expectedOwner, artifactGeneration,
      issuedAt, expiresAt, { signal } = {}) {
      if (!reviewConfigured || !sameOwner(expectedOwner, owner)) return false;
      const result = await invoke(durable, 'issueDownloadGrant', { grantDigest,
        artifactId, owner, artifactGeneration, issuedAt, expiresAt }, signal);
      return result.accepted === true && result.code === 'DOWNLOAD_GRANT_ISSUED';
    },
    async resolveGrant(grantDigest, expectedOwner, at, { signal } = {}) {
      if (!reviewConfigured || !sameOwner(expectedOwner, owner)) return null;
      const result = await invoke(durable, 'resolveDownloadGrant', {
        grantDigest, owner, now: at,
      }, signal);
      if (result.accepted !== true || typeof result.artifactId !== 'string') return null;
      const record = requireRecord(result.artifactId, owner);
      return record ? { ...record } : null;
    },
  });
}

function createCadPhase5Package8SandboxAdapter({ executor } = {}) {
  const reviewConfigured = typeof executor?.convert === 'function'
    && typeof executor?.activeCount === 'function'
    && typeof executor?.cleanupBlocked === 'function';
  let attempts = 0;
  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    routeMounted: false,
    providerDispatchEnabled: false,
    automaticRetries: 0,
    async convert(bytes, fileName, signal) {
      if (!reviewConfigured || attempts !== 0 || !Buffer.isBuffer(bytes)) {
        throw Error('PACKAGE8_SANDBOX_UNAVAILABLE');
      }
      attempts += 1;
      const result = await executor.convert(Object.freeze({
        fileName,
        contentBase64: bytes.toString('base64'),
      }), signal);
      if (result?.status !== 'ready' || result?.source?.sha256 !== hash(bytes)
        || result?.execution?.cleanup !== 'stopped' || !Array.isArray(result.meshes)) {
        throw Error('PACKAGE8_SANDBOX_UNAVAILABLE');
      }
      const geometry = normalizeGeometry(result.meshes);
      const geometryDigest = hash(JSON.stringify(geometry.meshes));
      const stlBytes = createInspectionStl(geometry);
      return Object.freeze({ status: 'ready', sourceSha256: result.source.sha256,
        stlBytes, geometryDigest, cleanupConfirmed: true, outcomeUnknown: false,
        attempts: 1, retries: 0 });
    },
    cleanupStatus() {
      const activeCount = executor.activeCount();
      const blocked = executor.cleanupBlocked();
      return Object.freeze({ stopped: activeCount === 0,
        cleanupConfirmed: activeCount === 0 && blocked === false,
        outcomeUnknown: blocked === true });
    },
    attemptCount: () => attempts,
  });
}

module.exports = {
  REQUIRED_DURABLE_OPERATIONS,
  createCadPhase5Package8DurableCustodyStore,
  createCadPhase5Package8SandboxAdapter,
};
