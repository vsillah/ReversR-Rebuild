const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createCadR2PrivateArtifactCustody, DERIVED_WARNING }
  = require('../server/cadR2PrivateArtifactCustody');
const { createCadPhase5DerivedArtifactOrchestrator }
  = require('../server/cadPhase5DerivedArtifactOrchestrator');

const hash = value => createHash('sha256').update(value).digest('hex');
const owner = Object.freeze({ userId: 'user-a', shopId: 'shop-a', uploadSessionId: 'session-a' });
const sourceDigest = hash('checksum-pinned-public-fixture');

function setupCustody(now) {
  const state = { records: new Map(), objects: new Map(), storedBytes: 0, objectCount: 0,
    classA: 0, classB: 0, deletes: 0 };
  const same = (record, identity) => record.userId === identity.userId
    && record.shopId === identity.shopId && record.uploadSessionId === identity.uploadSessionId;
  const store = {
    async reserve(record, policy, { signal }) {
      signal.throwIfAborted();
      if (state.storedBytes + record.byteCount > policy.maxStoredBytes
        || state.objectCount + 1 > policy.maxObjects) return false;
      state.records.set(record.artifactId, Object.freeze({ ...record }));
      state.storedBytes += record.byteCount; state.objectCount += 1; return true;
    },
    async consumeOperation(kind, count, _policy, { signal }) {
      signal.throwIfAborted();
      if (kind === 'class-a') state.classA += count;
      else if (kind === 'class-b') state.classB += count;
      else state.deletes += count;
      return true;
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
    async markUnknown() { return true; },
    async beginDelete() { return null; },
    async confirmDeleted() { return null; },
    async issueGrant() { return false; },
    async resolveGrant() { return null; },
  };
  const provider = {
    async putExact(request, { signal }) {
      signal.throwIfAborted(); state.objects.set(request.objectKey, Buffer.from(request.bytes));
      return { committed: true, byteCount: request.bytes.length, sha256: hash(request.bytes) };
    },
    async getExact() { return null; }, async deleteExact() { return false; },
    async headExact() { return null; },
  };
  return { state, custody: createCadR2PrivateArtifactCustody({ enabled: true, store, provider, now }) };
}

function setupJobs(now) {
  const job = { jobId: 'job-1', attemptId: 'attempt-1', artifactId: 'original-1', ...owner,
    originalRestrictedDigest: sourceDigest, state: 'admitted', conversionAuthorized: false,
    conversionDispatchCount: 0, conversionClaimCount: 0, conversionGeneration: 0 };
  return { job, port: {
    async claimConversion(jobId, policy, { signal }) {
      signal.throwIfAborted();
      if (jobId !== job.jobId || job.state !== 'admitted') return { status: 'duplicate' };
      Object.assign(job, { state: 'converting', conversionClaimCount: 1,
        conversionGeneration: 1, updatedAt: policy.claimedAt });
      return { status: 'claimed', job: { ...job } };
    },
    async bindDerivedAndReady(jobId, generation, binding, { signal }) {
      signal.throwIfAborted();
      if (jobId !== job.jobId || generation !== 1 || job.state !== 'converting') return false;
      Object.assign(job, binding, { state: 'ready' }); return true;
    },
    async quarantine(jobId, generation, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted();
      if (jobId !== job.jobId || generation !== 1) return false;
      Object.assign(job, { state: 'quarantined', reasonDigest, updatedAt }); return true;
    },
    async quarantineByJobId(jobId, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted();
      if (jobId !== job.jobId) return false;
      Object.assign(job, { state: 'quarantined', reasonDigest, updatedAt }); return true;
    },
    async closeForRollback(_updatedAt, { signal }) {
      signal.throwIfAborted(); return { closed: true, conversionAuthorized: false,
        order: ['conversion-closed', 'sandboxes-stopped', 'uncertain-jobs-quarantined'] };
    },
  } };
}

test('Package 5 derives through the actual Package 3 custody contract with exact bindings', async () => {
  let current = 1000; const now = () => current++;
  const { state, custody } = setupCustody(now);
  const { job, port: jobs } = setupJobs(now);
  const sandbox = { async convert(input, { signal }) {
    signal.throwIfAborted(); assert.equal(input.sourceDigest, sourceDigest);
    return { sourceDigest, units: 'millimeter', meshes: [{
      positions: [0, 0, 0, 10, 0, 0, 0, 10, 0], indices: [0, 1, 2],
    }], stopped: true, cleanupConfirmed: true, timedOut: false, oom: false, createdLate: false };
  } };
  const orchestrator = createCadPhase5DerivedArtifactOrchestrator({ enabled: true, jobs, custody,
    sandbox, now });
  const result = await orchestrator.derive({ jobId: job.jobId });
  assert.equal(result.ok, true); assert.equal(job.state, 'ready');
  assert.equal(state.records.size, 2); assert.equal(state.objects.size, 2); assert.equal(state.classA, 2);
  const preview = state.records.get(job.previewArtifactId);
  const stl = state.records.get(job.stlArtifactId);
  assert.equal(preview.kind, 'preview-geometry'); assert.equal(stl.kind, 'derived-stl');
  for (const record of [preview, stl]) {
    assert.equal(record.state, 'stored'); assert.equal(record.sourceArtifactId, 'original-1');
    assert.equal(record.sourceDigest, sourceDigest); assert.equal(record.geometryDigest, job.geometryDigest);
    assert.equal(record.units, 'millimeter'); assert.equal(record.warning, DERIVED_WARNING);
  }
  assert.equal((await custody.issueDownloadGrant({ ...owner, userId: 'user-b' },
    job.previewArtifactId)).code, 'CUSTODY_DENIED');
  const visible = JSON.stringify(result);
  assert.equal(visible.includes(sourceDigest), false); assert.equal(visible.includes(job.geometryDigest), false);
});
