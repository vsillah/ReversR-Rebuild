// Reusable private Cloudflare R2 custody boundary. It has no default credentials
// or provider and dispatches only through explicitly supplied adapters.
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { IGES_SOURCE_MAX_BYTES } = require('../utils/igesAdmission');
const { AUTHENTICATED_IGES_SOURCE_MAX_BYTES }
  = require('../utils/cadAuthenticatedIgesAdmission');

const OPERATION_BUDGET_MS = 2000;
const PROVIDER_OPERATION_BUDGET_MS = 15 * 1000;
const DOWNLOAD_GRANT_MS = 60 * 1000;
const POLICY = Object.freeze({
  schemaVersion: 1,
  provider: 'cloudflare-r2',
  jurisdiction: 'us',
  storageClass: 'STANDARD',
  publicAccess: false,
  customDomain: false,
  cache: false,
  versioning: false,
  originalRetentionMs: 24 * 60 * 60 * 1000,
  derivedRetentionMs: 7 * 24 * 60 * 60 * 1000,
  temporaryQuarantineMs: 60 * 60 * 1000,
  deletionSlaMs: 15 * 60 * 1000,
  lifecycleBackstopMs: 24 * 60 * 60 * 1000,
  applicationLogRetentionMs: 7 * 24 * 60 * 60 * 1000,
  providerAccessLogging: false,
  providerBackups: false,
  maxObjectBytes: 1024 * 1024,
  maxOriginalBytes: IGES_SOURCE_MAX_BYTES,
  maxStoredBytes: 8 * 1024 * 1024,
  maxObjects: 12,
  maxClassAOperations: 1000,
  maxClassBOperations: 1000,
  maxDeleteOperations: 1000,
  maxPilotCostMicros: 9_000_000,
  incidentOwnerRole: 'ReversR security operator',
});
const AUTHENTICATED_IGS_POLICY = Object.freeze({
  ...POLICY,
  derivedRetentionMs: 24 * 60 * 60 * 1000,
  maxObjectBytes: AUTHENTICATED_IGES_SOURCE_MAX_BYTES,
  maxOriginalBytes: AUTHENTICATED_IGES_SOURCE_MAX_BYTES,
  maxStoredBytes: 12 * 1024 * 1024,
});
const KINDS = new Set(['original-igs', 'preview-geometry', 'derived-stl']);
const FORMATS = Object.freeze({
  'original-igs': new Set(['model/iges']),
  'preview-geometry': new Set(['application/vnd.reversr.preview+json']),
  'derived-stl': new Set(['model/stl']),
});
const DERIVED_WARNING = 'Inspection geometry only - not validated for manufacturing.';
const PRINCIPAL_KEYS = new Set(['userId', 'shopId', 'uploadSessionId']);
const ORIGINAL_RESERVE_KEYS = new Set(['kind', 'format', 'byteCount', 'restrictedDigest']);
const DERIVED_RESERVE_KEYS = new Set([...ORIGINAL_RESERVE_KEYS, 'sourceArtifactId', 'sourceDigest',
  'geometryDigest', 'units', 'warning']);
const RECORD_KEYS = new Set(['schemaVersion', 'artifactId', ...PRINCIPAL_KEYS, ...DERIVED_RESERVE_KEYS,
  'providerObjectKey', 'objectKeyDigest', 'state', 'createdAt', 'retainedUntil', 'generation',
  'updatedAt', 'quarantineReasonDigest']);
const fail = () => { throw new Error('CUSTODY_UNAVAILABLE'); };
const deny = code => Object.freeze({ ok: false, code });
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.size && Object.keys(value).every(key => keys.has(key));
const allowed = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => keys.has(key));
const hash = value => createHash('sha256').update(value).digest('hex');

function principal(value) {
  if (!exact(value, PRINCIPAL_KEYS) || !id(value.userId) || !id(value.shopId)
    || !id(value.uploadSessionId)) fail();
  return Object.freeze({ userId: value.userId, shopId: value.shopId,
    uploadSessionId: value.uploadSessionId });
}

async function bounded(operation, parentSignal, budgetMs = OPERATION_BUDGET_MS) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timer;
  let onAbort;
  try {
    if (parentSignal?.aborted) fail();
    parentSignal?.addEventListener('abort', abort, { once: true });
    const cancelled = new Promise((_, reject) => {
      onAbort = () => reject(new Error('CUSTODY_UNAVAILABLE'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(abort, budgetMs);
    });
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), cancelled]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
}

function validPolicy(policy) {
  return policy && typeof policy === 'object' && !Array.isArray(policy)
    && policy.schemaVersion === POLICY.schemaVersion
    && policy.provider === POLICY.provider
    && policy.jurisdiction === POLICY.jurisdiction
    && policy.storageClass === POLICY.storageClass
    && policy.publicAccess === false && policy.customDomain === false
    && policy.cache === false && policy.versioning === false
    && policy.providerAccessLogging === false && policy.providerBackups === false
    && [policy.originalRetentionMs, policy.derivedRetentionMs, policy.temporaryQuarantineMs,
      policy.deletionSlaMs, policy.lifecycleBackstopMs, policy.applicationLogRetentionMs,
      policy.maxObjectBytes, policy.maxOriginalBytes, policy.maxStoredBytes, policy.maxObjects,
      policy.maxClassAOperations, policy.maxClassBOperations, policy.maxDeleteOperations,
      policy.maxPilotCostMicros].every(value => Number.isSafeInteger(value) && value > 0)
    && policy.maxOriginalBytes <= policy.maxObjectBytes
    && policy.maxObjectBytes <= AUTHENTICATED_IGES_SOURCE_MAX_BYTES
    && policy.maxStoredBytes >= policy.maxObjectBytes
    && policy.maxPilotCostMicros < 10_000_000
    && policy.incidentOwnerRole === POLICY.incidentOwnerRole;
}

function validateRecord(record, policy = POLICY) {
  const derived = record?.kind === 'preview-geometry' || record?.kind === 'derived-stl';
  const bindingValid = derived
    ? id(record.sourceArtifactId) && digest(record.sourceDigest) && digest(record.geometryDigest)
      && record.units === 'millimeter' && record.warning === DERIVED_WARNING
    : record?.kind === 'original-igs' && ![...DERIVED_RESERVE_KEYS]
      .filter(key => !ORIGINAL_RESERVE_KEYS.has(key)).some(key => Object.hasOwn(record, key));
  if (!allowed(record, RECORD_KEYS) || record.schemaVersion !== 1 || !id(record.artifactId) || !id(record.userId)
    || !id(record.shopId) || !id(record.uploadSessionId) || !KINDS.has(record.kind)
    || !FORMATS[record.kind].has(record.format) || !Number.isSafeInteger(record.byteCount)
    || record.byteCount <= 0 || record.byteCount > policy.maxObjectBytes
    || (record.kind === 'original-igs' && record.byteCount > policy.maxOriginalBytes)
    || !digest(record.restrictedDigest) || !digest(record.objectKeyDigest)
    || typeof record.providerObjectKey !== 'string'
    || !/^phase5\/[a-f0-9]{64}$/.test(record.providerObjectKey)
    || hash(record.providerObjectKey) !== record.objectKeyDigest
    || !['reserved', 'stored', 'quarantined', 'deleting'].includes(record.state)
    || !time(record.createdAt) || !time(record.retainedUntil) || record.retainedUntil <= record.createdAt
    || !Number.isSafeInteger(record.generation) || record.generation < 1
    || (record.updatedAt !== undefined && !time(record.updatedAt))
    || (record.quarantineReasonDigest !== undefined && !digest(record.quarantineReasonDigest))
    || !bindingValid) fail();
  return record;
}

function createCadR2PrivateArtifactCustody({ enabled = false, runtimeEnabled = false,
  provider, store, now = Date.now, policy = POLICY } = {}) {
  const storeMethods = ['reserve', 'consumeOperation', 'readForOwner', 'markStored', 'markUnknown', 'beginDelete',
    'confirmDeleted', 'issueGrant', 'resolveGrant'];
  const providerMethods = ['putExact', 'getExact', 'deleteExact', 'headExact'];
  const reviewConfigured = enabled === true && validPolicy(policy)
    && storeMethods.every(name => typeof store?.[name] === 'function')
    && providerMethods.every(name => typeof provider?.[name] === 'function') && typeof now === 'function';
  const runtimeConfigured = reviewConfigured && runtimeEnabled === true
    && policy === AUTHENTICATED_IGS_POLICY;
  const clock = () => { const value = now(); if (!time(value)) fail(); return value; };

  async function quarantine(artifactId, reason) {
    try {
      await bounded(signal => store.markUnknown(artifactId, reason, clock(), { signal }));
    } catch { /* Remain denied; independent reconciliation is still required. */ }
  }

  return Object.freeze({
    sourceOnly: !runtimeConfigured,
    configured: runtimeConfigured,
    reviewConfigured,
    providerDispatchEnabled: runtimeConfigured,
    downloadRouteEnabled: runtimeConfigured,
    policy,
    async reserveArtifact(identity, input, { signal } = {}) {
      try {
        if (!reviewConfigured) return deny('CUSTODY_UNAVAILABLE');
        const owner = principal(identity);
        const reserveKeys = input?.kind === 'original-igs' ? ORIGINAL_RESERVE_KEYS : DERIVED_RESERVE_KEYS;
        const derived = input?.kind === 'preview-geometry' || input?.kind === 'derived-stl';
        if (!exact(input, reserveKeys) || !KINDS.has(input.kind)
          || !FORMATS[input.kind].has(input.format) || !Number.isSafeInteger(input.byteCount)
          || input.byteCount <= 0 || input.byteCount > policy.maxObjectBytes
          || (input.kind === 'original-igs' && input.byteCount > policy.maxOriginalBytes)
          || !digest(input.restrictedDigest) || (derived && (!id(input.sourceArtifactId)
            || !digest(input.sourceDigest) || !digest(input.geometryDigest)
            || input.units !== 'millimeter' || input.warning !== DERIVED_WARNING))) {
          return deny('CUSTODY_INVALID');
        }
        const createdAt = clock();
        const retention = input.kind === 'original-igs' ? policy.originalRetentionMs : policy.derivedRetentionMs;
        const providerObjectKey = `phase5/${randomBytes(32).toString('hex')}`;
        const record = Object.freeze({ schemaVersion: 1, artifactId: randomUUID(), ...owner,
          kind: input.kind, format: input.format, byteCount: input.byteCount,
          restrictedDigest: input.restrictedDigest,
          ...(derived ? { sourceArtifactId: input.sourceArtifactId, sourceDigest: input.sourceDigest,
            geometryDigest: input.geometryDigest, units: input.units, warning: input.warning } : {}), providerObjectKey,
          objectKeyDigest: hash(providerObjectKey), state: 'reserved', createdAt,
          retainedUntil: createdAt + retention, generation: 1 });
        const accepted = await bounded(s => store.reserve(record, policy, { signal: s }), signal);
        if (accepted !== true) return deny('CUSTODY_QUOTA_EXHAUSTED');
        return Object.freeze({ ok: true, code: 'ARTIFACT_RESERVED', artifactId: record.artifactId,
          retainedUntil: record.retainedUntil });
      } catch { return deny('CUSTODY_UNAVAILABLE'); }
    },
    async commitArtifact(identity, artifactId, bytes, { signal } = {}) {
      let record;
      try {
        if (!reviewConfigured) return deny('CUSTODY_UNAVAILABLE');
        const owner = principal(identity);
        if (!id(artifactId) || !Buffer.isBuffer(bytes)) return deny('CUSTODY_INVALID');
        const owned = await bounded(s => store.readForOwner(artifactId, owner, { signal: s }), signal);
        if (owned == null) return deny('CUSTODY_DENIED');
        record = validateRecord(owned, policy);
        if (record.state !== 'reserved' || record.byteCount !== bytes.byteLength
          || record.restrictedDigest !== hash(bytes) || record.retainedUntil <= clock()) {
          return deny('CUSTODY_DENIED');
        }
        if (await bounded(s => store.consumeOperation('class-a', 1, policy, { signal: s }), signal) !== true) {
          return deny('CUSTODY_QUOTA_EXHAUSTED');
        }
        const result = await bounded(s => provider.putExact(Object.freeze({
          objectKey: record.providerObjectKey, bytes, contentType: record.format,
          storageClass: policy.storageClass, ifNoneMatch: '*', cacheControl: 'no-store',
        }), { signal: s }), signal, PROVIDER_OPERATION_BUDGET_MS);
        if (!result || result.committed !== true || result.byteCount !== record.byteCount
          || result.sha256 !== record.restrictedDigest) {
          await quarantine(record.artifactId, 'put-unknown');
          return deny('CUSTODY_UNKNOWN');
        }
        const marked = await bounded(s => store.markStored(record.artifactId, record.generation,
          clock(), { signal: s }), signal);
        if (marked !== true) {
          await quarantine(record.artifactId, 'metadata-commit-unknown');
          return deny('CUSTODY_UNKNOWN');
        }
        return Object.freeze({ ok: true, code: 'ARTIFACT_STORED', artifactId: record.artifactId,
          byteCount: record.byteCount, retainedUntil: record.retainedUntil });
      } catch {
        if (record) await quarantine(record.artifactId, 'put-unknown');
        return deny(record ? 'CUSTODY_UNKNOWN' : 'CUSTODY_UNAVAILABLE');
      }
    },
    async issueDownloadGrant(identity, artifactId, { signal } = {}) {
      try {
        if (!reviewConfigured) return deny('CUSTODY_UNAVAILABLE');
        const owner = principal(identity);
        if (!id(artifactId)) return deny('CUSTODY_INVALID');
        const owned = await bounded(s => store.readForOwner(artifactId, owner, { signal: s }), signal);
        if (owned == null) return deny('CUSTODY_DENIED');
        const record = validateRecord(owned, policy);
        const issuedAt = clock();
        if (record.state !== 'stored' || record.retainedUntil <= issuedAt) return deny('CUSTODY_DENIED');
        const token = `dg1.${randomBytes(32).toString('base64url')}`;
        const expiresAt = Math.min(issuedAt + DOWNLOAD_GRANT_MS, record.retainedUntil);
        const accepted = await bounded(s => store.issueGrant(hash(token), record.artifactId,
          owner, record.generation, issuedAt, expiresAt, { signal: s }), signal);
        if (accepted !== true) return deny('CUSTODY_DENIED');
        return Object.freeze({ ok: true, code: 'DOWNLOAD_GRANT_ISSUED', token, expiresAt });
      } catch { return deny('CUSTODY_UNAVAILABLE'); }
    },
    async readWithGrant(identity, token, { signal } = {}) {
      try {
        if (!reviewConfigured) return deny('CUSTODY_UNAVAILABLE');
        const owner = principal(identity);
        if (typeof token !== 'string' || !/^dg1\.[A-Za-z0-9_-]{43}$/.test(token)) {
          return deny('DOWNLOAD_GRANT_INVALID');
        }
        const granted = await bounded(s => store.resolveGrant(hash(token), owner,
          clock(), { signal: s }), signal);
        if (granted == null) return deny('CUSTODY_DENIED');
        const record = validateRecord(granted, policy);
        if (record.state !== 'stored' || record.retainedUntil <= clock()) return deny('CUSTODY_DENIED');
        if (await bounded(s => store.consumeOperation('class-b', 1, policy, { signal: s }), signal) !== true) {
          return deny('CUSTODY_QUOTA_EXHAUSTED');
        }
        const result = await bounded(s => provider.getExact(Object.freeze({
          objectKey: record.providerObjectKey, expectedBytes: record.byteCount,
          expectedSha256: record.restrictedDigest,
        }), { signal: s }), signal, PROVIDER_OPERATION_BUDGET_MS);
        if (!result || !Buffer.isBuffer(result.bytes) || result.bytes.byteLength !== record.byteCount
          || hash(result.bytes) !== record.restrictedDigest) return deny('CUSTODY_UNKNOWN');
        return Object.freeze({ ok: true, code: 'ARTIFACT_READ', artifactId: record.artifactId,
          kind: record.kind, bytes: result.bytes, format: record.format, byteCount: record.byteCount });
      } catch { return deny('CUSTODY_UNAVAILABLE'); }
    },
    async deleteArtifact(identity, artifactId, { signal } = {}) {
      let record;
      try {
        if (!reviewConfigured) return deny('CUSTODY_UNAVAILABLE');
        const owner = principal(identity);
        if (!id(artifactId)) return deny('CUSTODY_INVALID');
        const deletable = await bounded(s => store.beginDelete(artifactId, owner,
          clock(), { signal: s }), signal);
        if (deletable == null) return deny('CUSTODY_DENIED');
        record = validateRecord(deletable, policy);
        if (!['deleting', 'quarantined'].includes(record.state)) return deny('CUSTODY_DENIED');
        if (await bounded(s => store.consumeOperation('delete', 1, policy, { signal: s }), signal) !== true) {
          return deny('CUSTODY_QUOTA_EXHAUSTED');
        }
        const deleted = await bounded(s => provider.deleteExact(record.providerObjectKey,
          { signal: s }), signal, PROVIDER_OPERATION_BUDGET_MS);
        if (deleted !== true) throw new Error('DELETE_UNKNOWN');
        if (await bounded(s => store.consumeOperation('class-b', 1, policy, { signal: s }), signal) !== true) {
          throw new Error('CUSTODY_QUOTA_EXHAUSTED');
        }
        const remaining = await bounded(s => provider.headExact(record.providerObjectKey,
          { signal: s }), signal, PROVIDER_OPERATION_BUDGET_MS);
        if (remaining !== null) throw new Error('DELETE_UNCONFIRMED');
        const receipt = await bounded(s => store.confirmDeleted(record.artifactId,
          record.generation, clock(), { signal: s }), signal);
        if (!receipt || receipt.deleted !== true || !digest(receipt.tombstoneDigest)) fail();
        return Object.freeze({ ok: true, code: 'ARTIFACT_DELETED', artifactId: record.artifactId,
          tombstoneDigest: receipt.tombstoneDigest });
      } catch {
        if (record) await quarantine(record.artifactId, 'delete-unknown');
        return deny(record ? 'CUSTODY_UNKNOWN' : 'CUSTODY_UNAVAILABLE');
      }
    },
  });
}

module.exports = { AUTHENTICATED_IGS_POLICY, DERIVED_WARNING, DOWNLOAD_GRANT_MS,
  OPERATION_BUDGET_MS, POLICY, PROVIDER_OPERATION_BUDGET_MS,
  createCadR2PrivateArtifactCustody };
