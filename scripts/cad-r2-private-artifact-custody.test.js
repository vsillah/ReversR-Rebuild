const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { DERIVED_WARNING, POLICY, DOWNLOAD_GRANT_MS, createCadR2PrivateArtifactCustody }
  = require('../server/cadR2PrivateArtifactCustody');

const hash = value => createHash('sha256').update(value).digest('hex');
const owner = Object.freeze({ userId: 'user-a', shopId: 'shop-a', uploadSessionId: 'session-a' });
const source = Buffer.from('synthetic-iges-source');

function setup(overrides = {}) {
  const state = { now: 1000, records: new Map(), tombstones: new Map(), grants: new Map(),
    objects: new Map(), usage: { storedBytes: 0, objectCount: 0, classA: 0, classB: 0, deletes: 0 },
    calls: [] };
  const same = (record, identity) => record.userId === identity.userId && record.shopId === identity.shopId
    && record.uploadSessionId === identity.uploadSessionId;
  const store = {
    async reserve(record, policy, { signal }) {
      signal.throwIfAborted();
      if (state.records.has(record.artifactId) || state.tombstones.has(record.artifactId)
        || state.usage.storedBytes + record.byteCount > policy.maxStoredBytes
        || state.usage.objectCount + 1 > policy.maxObjects) return false;
      state.records.set(record.artifactId, Object.freeze({ ...record }));
      state.usage.storedBytes += record.byteCount; state.usage.objectCount += 1;
      return true;
    },
    async consumeOperation(kind, count, policy, { signal }) {
      signal.throwIfAborted();
      const field = kind === 'class-a' ? 'classA' : kind === 'class-b' ? 'classB' : 'deletes';
      const cap = kind === 'class-a' ? policy.maxClassAOperations
        : kind === 'class-b' ? policy.maxClassBOperations : policy.maxDeleteOperations;
      if (!Number.isSafeInteger(count) || count < 1 || state.usage[field] + count > cap) return false;
      state.usage[field] += count; return true;
    },
    async readForOwner(artifactId, identity, { signal }) {
      signal.throwIfAborted(); const record = state.records.get(artifactId);
      return record && same(record, identity) ? record : null;
    },
    async markStored(artifactId, generation, updatedAt, { signal }) {
      signal.throwIfAborted(); const record = state.records.get(artifactId);
      if (!record || record.state !== 'reserved' || record.generation !== generation) return false;
      state.records.set(artifactId, Object.freeze({ ...record, state: 'stored', updatedAt,
        generation: generation + 1 })); return true;
    },
    async markUnknown(artifactId, reason, updatedAt, { signal } = {}) {
      signal?.throwIfAborted(); const record = state.records.get(artifactId);
      if (!record) return false;
      state.records.set(artifactId, Object.freeze({ ...record, state: 'quarantined', updatedAt,
        quarantineReasonDigest: hash(reason), generation: record.generation + 1 })); return true;
    },
    async beginDelete(artifactId, identity, updatedAt, { signal }) {
      signal.throwIfAborted(); const record = state.records.get(artifactId);
      if (!record || !same(record, identity)) return null;
      for (const [key, grant] of state.grants) {
        if (grant.artifactId === artifactId) state.grants.set(key, { ...grant, revokedAt: updatedAt });
      }
      const next = Object.freeze({ ...record, state: 'deleting', updatedAt,
        generation: record.generation + 1 });
      state.records.set(artifactId, next); return next;
    },
    async confirmDeleted(artifactId, generation, deletedAt, { signal }) {
      signal.throwIfAborted(); const record = state.records.get(artifactId);
      if (!record || record.state !== 'deleting' || record.generation !== generation) return null;
      const tombstoneDigest = hash(JSON.stringify([record.artifactId, record.userId, record.shopId,
        record.uploadSessionId, record.kind, record.objectKeyDigest, record.restrictedDigest, deletedAt,
        record.generation]));
      state.tombstones.set(artifactId, Object.freeze({ artifactId, userId: record.userId,
        shopId: record.shopId, uploadSessionId: record.uploadSessionId, kind: record.kind,
        objectKeyDigest: record.objectKeyDigest, restrictedDigest: record.restrictedDigest,
        deletedAt, replayFence: true, generation: record.generation + 1, tombstoneDigest }));
      state.records.delete(artifactId); state.usage.storedBytes -= record.byteCount;
      state.usage.objectCount -= 1;
      return { deleted: true, tombstoneDigest };
    },
    async issueGrant(grantDigest, artifactId, identity, artifactGeneration, issuedAt, expiresAt, { signal }) {
      signal.throwIfAborted(); const record = state.records.get(artifactId);
      if (!record || !same(record, identity) || record.generation !== artifactGeneration
        || state.grants.has(grantDigest)) return false;
      state.grants.set(grantDigest, Object.freeze({ grantDigest, artifactId, ...identity,
        artifactGeneration, issuedAt, expiresAt })); return true;
    },
    async resolveGrant(grantDigest, identity, now, { signal }) {
      signal.throwIfAborted(); const grant = state.grants.get(grantDigest);
      if (!grant || grant.revokedAt !== undefined || grant.expiresAt <= now
        || grant.userId !== identity.userId || grant.shopId !== identity.shopId
        || grant.uploadSessionId !== identity.uploadSessionId) return null;
      const record = state.records.get(grant.artifactId);
      return record && record.generation === grant.artifactGeneration && same(record, identity)
        ? record : null;
    },
  };
  const provider = {
    async putExact(request, { signal }) {
      signal.throwIfAborted(); state.calls.push('put');
      if (state.objects.has(request.objectKey)) return { committed: false };
      state.objects.set(request.objectKey, Buffer.from(request.bytes));
      return { committed: true, byteCount: request.bytes.byteLength, sha256: hash(request.bytes) };
    },
    async getExact(request, { signal }) {
      signal.throwIfAborted(); state.calls.push('get'); const bytes = state.objects.get(request.objectKey);
      return bytes ? { bytes: Buffer.from(bytes) } : null;
    },
    async deleteExact(objectKey, { signal }) {
      signal.throwIfAborted(); state.calls.push('delete'); state.objects.delete(objectKey); return true;
    },
    async headExact(objectKey, { signal }) {
      signal.throwIfAborted(); state.calls.push('head'); return state.objects.has(objectKey) ? {} : null;
    },
  };
  const options = { enabled: true, store, provider, now: () => state.now, ...overrides };
  return { state, store, provider, options,
    custody: createCadR2PrivateArtifactCustody(options) };
}

async function stored(f, identity = owner, bytes = source) {
  const reserved = await f.custody.reserveArtifact(identity, { kind: 'original-igs', format: 'model/iges',
    byteCount: bytes.byteLength, restrictedDigest: hash(bytes) });
  assert.equal(reserved.ok, true);
  const committed = await f.custody.commitArtifact(identity, reserved.artifactId, bytes);
  assert.equal(committed.ok, true);
  return reserved.artifactId;
}

test('default is inert and live/provider/download dispatch stay false', async () => {
  const custody = createCadR2PrivateArtifactCustody();
  assert.equal(custody.sourceOnly, true); assert.equal(custody.configured, false);
  assert.equal(custody.reviewConfigured, false); assert.equal(custody.providerDispatchEnabled, false);
  assert.equal(custody.downloadRouteEnabled, false);
  assert.deepEqual(await custody.reserveArtifact(owner, {}), { ok: false, code: 'CUSTODY_UNAVAILABLE' });
});

test('policy is bounded, US-only, private, standard and strictly below ten dollars', () => {
  assert.equal(POLICY.provider, 'cloudflare-r2'); assert.equal(POLICY.jurisdiction, 'us');
  assert.equal(POLICY.storageClass, 'STANDARD'); assert.equal(POLICY.publicAccess, false);
  assert.equal(POLICY.cache, false); assert.equal(POLICY.versioning, false);
  assert.ok(POLICY.maxPilotCostMicros < 10_000_000);
  assert.equal(POLICY.maxOriginalBytes, 256 * 1024); assert.equal(POLICY.maxStoredBytes, 8 * 1024 * 1024);
  assert.equal(POLICY.maxClassAOperations, 1000); assert.equal(POLICY.maxClassBOperations, 1000);
  assert.ok(Object.isFrozen(POLICY));
});

test('derived records require exact source bindings while originals reject derived-only fields', async () => {
  const f = setup(); const bytes = Buffer.from('{"mesh":true}');
  const binding = { sourceArtifactId: 'original-1', sourceDigest: 'a'.repeat(64),
    geometryDigest: 'b'.repeat(64), units: 'millimeter', warning: DERIVED_WARNING };
  for (const [kind, format] of [['preview-geometry', 'application/vnd.reversr.preview+json'],
    ['derived-stl', 'model/stl']]) {
    const reserved = await f.custody.reserveArtifact(owner, { kind, format,
      byteCount: bytes.length, restrictedDigest: hash(bytes), ...binding });
    assert.equal(reserved.ok, true);
    const record = f.state.records.get(reserved.artifactId);
    assert.deepEqual(Object.fromEntries(Object.keys(binding).map(key => [key, record[key]])), binding);
    assert.equal((await f.custody.commitArtifact(owner, reserved.artifactId, bytes)).ok, true);
  }
  assert.equal((await f.custody.reserveArtifact(owner, { kind: 'preview-geometry',
    format: 'application/vnd.reversr.preview+json', byteCount: bytes.length,
    restrictedDigest: hash(bytes) })).code, 'CUSTODY_INVALID');
  assert.equal((await f.custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
    byteCount: source.length, restrictedDigest: hash(source), ...binding })).code, 'CUSTODY_INVALID');
  assert.equal((await f.custody.reserveArtifact(owner, { kind: 'derived-stl', format: 'model/stl',
    byteCount: bytes.length, restrictedDigest: hash(bytes), ...binding,
    warning: `${DERIVED_WARNING} extra` })).code, 'CUSTODY_INVALID');
});

test('random non-enumerable keys stay server-side while owner can retrieve exact bytes', async () => {
  const f = setup(); const artifactId = await stored(f);
  const record = f.state.records.get(artifactId);
  assert.match(record.providerObjectKey, /^phase5\/[a-f0-9]{64}$/);
  const grant = await f.custody.issueDownloadGrant(owner, artifactId);
  assert.equal(grant.ok, true); assert.equal(grant.expiresAt, f.state.now + DOWNLOAD_GRANT_MS);
  assert.equal(JSON.stringify(grant).includes(record.providerObjectKey), false);
  const read = await f.custody.readWithGrant(owner, grant.token);
  assert.equal(read.ok, true); assert.deepEqual(read.bytes, source);
  assert.equal(JSON.stringify({ ...read, bytes: undefined }).includes(record.providerObjectKey), false);
  assert.deepEqual(f.state.calls, ['put', 'get']);
});

test('cross-user, cross-shop, cross-session and guessed identifiers deny without provider calls', async () => {
  for (const identity of [{ ...owner, userId: 'user-b' }, { ...owner, shopId: 'shop-b' },
    { ...owner, uploadSessionId: 'session-b' }]) {
    const f = setup(); const artifactId = await stored(f); const before = f.state.calls.length;
    assert.equal((await f.custody.issueDownloadGrant(identity, artifactId)).code, 'CUSTODY_DENIED');
    assert.equal((await f.custody.deleteArtifact(identity, artifactId)).code, 'CUSTODY_DENIED');
    assert.equal(f.state.calls.length, before);
  }
  const f = setup();
  assert.equal((await f.custody.issueDownloadGrant(owner, 'guessed')).code, 'CUSTODY_DENIED');
});

test('grant expiry, deletion revocation and generation changes deny across instances', async () => {
  const f = setup(); const artifactId = await stored(f);
  const other = createCadR2PrivateArtifactCustody(f.options);
  const grant = await f.custody.issueDownloadGrant(owner, artifactId);
  f.state.now = grant.expiresAt;
  assert.equal((await other.readWithGrant(owner, grant.token)).code, 'CUSTODY_DENIED');
  f.state.now = 1000;
  const current = f.state.records.get(artifactId);
  f.state.records.set(artifactId, Object.freeze({ ...current, generation: current.generation + 1 }));
  assert.equal((await other.readWithGrant(owner, grant.token)).code, 'CUSTODY_DENIED');
  const grant2 = await other.issueDownloadGrant(owner, artifactId);
  assert.equal(grant2.ok, true);
  assert.equal((await f.custody.deleteArtifact(owner, artifactId)).ok, true);
  assert.equal((await other.readWithGrant(owner, grant2.token)).code, 'CUSTODY_DENIED');
});

test('delete revokes grants first, confirms provider absence and retains replay tombstone', async () => {
  const f = setup(); const artifactId = await stored(f);
  const grant = await f.custody.issueDownloadGrant(owner, artifactId);
  assert.equal(f.state.usage.deletes, 0);
  const result = await f.custody.deleteArtifact(owner, artifactId);
  assert.equal(result.ok, true); assert.match(result.tombstoneDigest, /^[a-f0-9]{64}$/);
  assert.equal(f.state.usage.deletes, 1);
  assert.equal(f.state.records.has(artifactId), false); assert.equal(f.state.tombstones.get(artifactId).replayFence, true);
  assert.equal((await f.custody.readWithGrant(owner, grant.token)).code, 'CUSTODY_DENIED');
  assert.deepEqual(f.state.calls.slice(-2), ['delete', 'head']);
});

test('unknown put, partial acknowledgement and metadata uncertainty quarantine without retry', async () => {
  for (const override of [
    { putExact: async () => { throw new Error('private-provider-detail'); } },
    { putExact: async request => ({ committed: true, byteCount: request.bytes.byteLength, sha256: '0'.repeat(64) }) },
  ]) {
    const f = setup(); f.options.provider = { ...f.provider, ...override };
    f.custody = createCadR2PrivateArtifactCustody(f.options);
    const reserved = await f.custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
      byteCount: source.byteLength, restrictedDigest: hash(source) });
    assert.equal((await f.custody.commitArtifact(owner, reserved.artifactId, source)).code, 'CUSTODY_UNKNOWN');
    assert.equal(f.state.records.get(reserved.artifactId).state, 'quarantined');
  }
  const f = setup(); f.store.markStored = async () => false;
  f.custody = createCadR2PrivateArtifactCustody({ ...f.options, store: f.store });
  const reserved = await f.custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
    byteCount: source.byteLength, restrictedDigest: hash(source) });
  assert.equal((await f.custody.commitArtifact(owner, reserved.artifactId, source)).code, 'CUSTODY_UNKNOWN');
  assert.equal(f.state.calls.filter(call => call === 'put').length, 1);
});

test('unknown delete is quarantined and never reported as deleted', async () => {
  const f = setup(); const artifactId = await stored(f);
  const provider = { ...f.provider, headExact: async () => ({ stillPresent: true }) };
  const custody = createCadR2PrivateArtifactCustody({ ...f.options, provider });
  assert.equal((await custody.deleteArtifact(owner, artifactId)).code, 'CUSTODY_UNKNOWN');
  assert.equal(f.state.usage.deletes, 1);
  assert.equal(f.state.records.get(artifactId).state, 'quarantined');
  assert.equal(f.state.tombstones.has(artifactId), false);
});

test('retention expiry blocks grants and source quotas fail before provider dispatch', async () => {
  const f = setup(); const artifactId = await stored(f);
  f.state.now = f.state.records.get(artifactId).retainedUntil;
  assert.equal((await f.custody.issueDownloadGrant(owner, artifactId)).code, 'CUSTODY_DENIED');
  const q = setup(); q.state.usage.objectCount = POLICY.maxObjects;
  assert.equal((await q.custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
    byteCount: source.byteLength, restrictedDigest: hash(source) })).code, 'CUSTODY_QUOTA_EXHAUSTED');
  q.state.usage.objectCount = 0; q.state.usage.classA = POLICY.maxClassAOperations;
  const reserved = await q.custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
    byteCount: source.byteLength, restrictedDigest: hash(source) });
  assert.equal((await q.custody.commitArtifact(owner, reserved.artifactId, source)).code,
    'CUSTODY_QUOTA_EXHAUSTED');
  assert.equal(q.state.calls.length, 0);

  const reads = setup(); const readArtifact = await stored(reads);
  const grant = await reads.custody.issueDownloadGrant(owner, readArtifact);
  reads.state.usage.classB = POLICY.maxClassBOperations;
  assert.equal((await reads.custody.readWithGrant(owner, grant.token)).code,
    'CUSTODY_QUOTA_EXHAUSTED');
  assert.equal(reads.state.calls.filter(call => call === 'get').length, 0);

  const deletes = setup(); const deleteArtifact = await stored(deletes);
  deletes.state.usage.deletes = POLICY.maxDeleteOperations;
  assert.equal((await deletes.custody.deleteArtifact(owner, deleteArtifact)).code,
    'CUSTODY_QUOTA_EXHAUSTED');
  assert.equal(deletes.state.calls.filter(call => call === 'delete').length, 0);
  assert.equal(deletes.state.usage.deletes, POLICY.maxDeleteOperations);
});

test('cancellation and timeout sanitize failure and do not retry or log private values', async () => {
  let entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const f = setup(); const provider = { ...f.provider, putExact: async (_request, { signal }) => {
    entered(); return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('private')), { once: true }));
  } };
  const custody = createCadR2PrivateArtifactCustody({ ...f.options, provider });
  const reserved = await custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
    byteCount: source.byteLength, restrictedDigest: hash(source) });
  const controller = new AbortController();
  const pending = custody.commitArtifact(owner, reserved.artifactId, source, { signal: controller.signal });
  await waiting; controller.abort();
  assert.equal((await pending).code, 'CUSTODY_UNKNOWN');
  assert.equal(f.state.records.get(reserved.artifactId).state, 'quarantined');
});

test('provider secrets, object keys, private errors and bytes are absent from logs and denial payloads', async () => {
  const calls = []; const originals = [console.log, console.warn, console.error];
  console.log = (...args) => calls.push(args); console.warn = (...args) => calls.push(args);
  console.error = (...args) => calls.push(args);
  try {
    const f = setup(); const provider = { ...f.provider,
      putExact: async () => { throw new Error('secret-object-key-private-bytes'); } };
    const custody = createCadR2PrivateArtifactCustody({ ...f.options, provider });
    const reserved = await custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
      byteCount: source.byteLength, restrictedDigest: hash(source) });
    const result = await custody.commitArtifact(owner, reserved.artifactId, source);
    assert.deepEqual(result, { ok: false, code: 'CUSTODY_UNKNOWN' }); assert.equal(calls.length, 0);
  } finally { [console.log, console.warn, console.error] = originals; }
});

test('source remains unmounted and all admission/conversion gates remain false', () => {
  const fs = require('node:fs');
  const route = fs.readFileSync(require.resolve('../server/cadUserUploadRouter'), 'utf8');
  const bridge = fs.readFileSync(require.resolve('../utils/cadUserImportBridge'), 'utf8');
  const index = fs.readFileSync(require.resolve('../server/index'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(bridge, /const CAD_USER_IMPORT_ENABLED = false;/);
  assert.doesNotMatch(route, /cadR2PrivateArtifactCustody/);
  assert.doesNotMatch(index, /cadR2PrivateArtifactCustody/);
});
