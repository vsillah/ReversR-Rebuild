const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { POLICY, WARNING, createCadPhase5DerivedArtifactOrchestrator }
  = require('../server/cadPhase5DerivedArtifactOrchestrator');

const hash = value => createHash('sha256').update(value).digest('hex');
const fixture = fs.readFileSync(path.join(__dirname, '../public/cad-fixtures/public-cube-10x10.igs'));
const sourceDigest = hash(fixture);
const cube = Object.freeze({ positions: Object.freeze([
  -5, 0, -5, 5, 0, -5, 5, 10, -5, -5, 10, -5,
  -5, 0, 5, 5, 0, 5, 5, 10, 5, -5, 10, 5,
]), indices: Object.freeze([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
  0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7,
]) });

function initialJob() {
  return { jobId: 'job-1', attemptId: 'attempt-1', artifactId: 'original-1', userId: 'user-a',
    shopId: 'shop-a', uploadSessionId: 'session-a', originalRestrictedDigest: sourceDigest,
    state: 'admitted', conversionAuthorized: false, conversionDispatchCount: 0,
    conversionClaimCount: 0, conversionGeneration: 0, createdAt: 1, updatedAt: 1 };
}

function createJobs(state) {
  let queue = Promise.resolve();
  const serialized = operation => {
    const pending = queue.then(operation); queue = pending.catch(() => {}); return pending;
  };
  return {
    claimConversion(jobId, policy, { signal }) {
      return serialized(async () => {
        signal.throwIfAborted(); state.events.push('claim');
        const job = state.jobs.get(jobId);
        if (!job) return { status: 'terminal' };
        if (job.state === 'ready' || job.state === 'quarantined' || job.state === 'failed') {
          return { status: 'terminal' };
        }
        if (job.state === 'converting') return { status: 'duplicate' };
        if (state.forceQuota) return { status: 'rejected', code: 'CONVERSION_QUOTA_EXHAUSTED' };
        if (state.forceBudget || state.reservedMicros + policy.reservationMicros > policy.budgetMicros) {
          return { status: 'rejected', code: 'CONVERSION_BUDGET_EXHAUSTED' };
        }
        if ([...state.jobs.values()].some(row => row.state === 'converting')) {
          return { status: 'rejected', code: 'CONVERSION_CONCURRENCY_LIMIT' };
        }
        state.reservedMicros += policy.reservationMicros;
        Object.assign(job, { state: 'converting', conversionClaimCount: job.conversionClaimCount + 1,
          conversionGeneration: job.conversionGeneration + 1, updatedAt: policy.claimedAt });
        if (state.unknownClaim) throw new Error('CLAIM_ACK_LOST');
        return { status: 'claimed', job: { ...job } };
      });
    },
    async bindDerivedAndReady(jobId, generation, binding, { signal }) {
      signal.throwIfAborted(); state.events.push('ready-bind');
      if (state.unknownReady) return false;
      const job = state.jobs.get(jobId);
      if (!job || job.state !== 'converting' || job.conversionGeneration !== generation
        || job.previewArtifactId || job.stlArtifactId) return false;
      Object.assign(job, binding, { state: 'ready', updatedAt: binding.terminalAt }); return true;
    },
    async quarantine(jobId, generation, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted(); state.events.push('quarantine');
      const job = state.jobs.get(jobId);
      if (!job || job.state !== 'converting' || job.conversionGeneration !== generation) return false;
      Object.assign(job, { state: 'quarantined', quarantineReasonDigest: reasonDigest,
        terminalAt: updatedAt, updatedAt }); return true;
    },
    async quarantineByJobId(jobId, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted(); state.events.push('quarantine-by-job');
      const job = state.jobs.get(jobId);
      if (!job || !['admitted', 'converting'].includes(job.state)) return false;
      Object.assign(job, { state: 'quarantined', quarantineReasonDigest: reasonDigest,
        terminalAt: updatedAt, updatedAt }); return true;
    },
    async closeForRollback(_updatedAt, { signal }) {
      signal.throwIfAborted();
      const order = ['conversion-closed', 'sandboxes-stopped', 'uncertain-jobs-quarantined'];
      state.events.push(...order);
      for (const job of state.jobs.values()) if (job.state === 'converting') job.state = 'quarantined';
      return { closed: true, conversionAuthorized: false, order };
    },
  };
}

function setup(overrides = {}) {
  const job = initialJob();
  const state = { now: 100, jobs: new Map([[job.jobId, job]]), artifacts: new Map(), events: [],
    sandboxCalls: 0, reservations: 0, commits: 0, reservedMicros: 0, forceQuota: false,
    forceBudget: false, unknownReady: false, unknownClaim: false };
  Object.assign(state, overrides.state || {});
  const jobs = createJobs(state);
  const custody = {
    async reserveArtifact(owner, input, { signal }) {
      signal.throwIfAborted(); state.events.push(`reserve:${input.kind}`); state.reservations += 1;
      if (overrides.reserveAt === state.reservations) return overrides.reserveResult || null;
      const artifactId = `derived-${state.reservations}`;
      state.artifacts.set(artifactId, { owner: { ...owner }, input: { ...input }, state: 'reserved' });
      return { ok: true, artifactId };
    },
    async commitArtifact(owner, artifactId, bytes, { signal }) {
      signal.throwIfAborted(); state.events.push(`commit:${artifactId}`); state.commits += 1;
      if (overrides.commitAt === state.commits) return overrides.commitResult || null;
      const artifact = state.artifacts.get(artifactId);
      if (!artifact || artifact.owner.userId !== owner.userId
        || artifact.owner.shopId !== owner.shopId
        || artifact.input.restrictedDigest !== hash(bytes)) return { ok: false };
      artifact.state = 'stored'; artifact.bytes = Buffer.from(bytes); return { ok: true, artifactId };
    },
  };
  const sandbox = {
    async convert(input, { signal }) {
      signal.throwIfAborted(); state.events.push('sandbox'); state.sandboxCalls += 1;
      assert.equal(input.networkDenied, true); assert.equal(input.persistenceDisabled, true);
      assert.equal(input.maxRetries, 0); assert.equal(input.sourceDigest, sourceDigest);
      if (overrides.convert) return overrides.convert(input, { signal, state });
      return { sourceDigest, units: 'millimeter', meshes: [{ positions: [...cube.positions],
        indices: [...cube.indices] }], stopped: true, cleanupConfirmed: true,
      timedOut: false, oom: false, createdLate: false };
    },
  };
  const orchestrator = createCadPhase5DerivedArtifactOrchestrator({ enabled: true, jobs, custody,
    sandbox, now: () => state.now });
  return { state, jobs, custody, sandbox, orchestrator };
}

test('default contract is inert, closed, unmounted and zero retry', async () => {
  const orchestrator = createCadPhase5DerivedArtifactOrchestrator();
  assert.equal(orchestrator.configured, false); assert.equal(orchestrator.reviewConfigured, false);
  assert.equal(orchestrator.routeMounted, false); assert.equal(orchestrator.bodyAdmissionAuthorized, false);
  assert.equal(orchestrator.providerDispatchEnabled, false);
  assert.equal(orchestrator.runtimeConversionDispatchEnabled, false);
  assert.equal(orchestrator.downloadsRouted, false); assert.equal(orchestrator.maxRetries, 0);
  assert.equal(POLICY.runtimeDispatchEnabled, false);
  assert.deepEqual(await orchestrator.derive({ jobId: 'job-1' }),
    { ok: false, code: 'CONVERSION_UNAVAILABLE' });
});

test('public fixture geometry becomes two source-bound durable artifacts only after cleanup', async () => {
  assert.equal(sourceDigest, '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3');
  const { state, orchestrator } = setup();
  const result = await orchestrator.derive({ jobId: 'job-1' });
  assert.equal(result.ok, true); assert.equal(result.conversionDispatchCount, 0);
  const job = state.jobs.get('job-1');
  assert.equal(job.state, 'ready'); assert.equal(job.cleanupConfirmed, true);
  assert.equal(job.conversionClaimCount, 1); assert.equal(job.conversionDispatchCount, 0);
  assert.deepEqual(state.events, ['claim', 'sandbox', 'reserve:preview-geometry', 'commit:derived-1',
    'reserve:derived-stl', 'commit:derived-2', 'ready-bind']);
  const previewArtifact = state.artifacts.get(job.previewArtifactId);
  const stlArtifact = state.artifacts.get(job.stlArtifactId);
  assert.equal(previewArtifact.input.sourceArtifactId, 'original-1');
  assert.equal(previewArtifact.input.sourceDigest, sourceDigest);
  assert.equal(previewArtifact.input.geometryDigest, stlArtifact.input.geometryDigest);
  assert.equal(previewArtifact.input.warning, WARNING); assert.equal(stlArtifact.input.warning, WARNING);
  assert.equal(previewArtifact.input.units, 'millimeter'); assert.equal(stlArtifact.input.units, 'millimeter');
  const preview = JSON.parse(previewArtifact.bytes.toString('utf8'));
  assert.deepEqual(preview.meshes[0].positions, [...cube.positions]);
  assert.equal(preview.triangleCount, 12); assert.equal(preview.warning, WARNING);
  const stl = stlArtifact.bytes.toString('utf8');
  assert.equal((stl.match(/facet normal/g) || []).length, preview.triangleCount);
  assert.match(stl, /reversr_inspection_geometry_mm__inspection_only__not_validated_for_manufacturing/);
  for (let index = 0; index < cube.indices.length; index += 1) {
    const vertex = cube.indices[index] * 3;
    assert.match(stl, new RegExp(`vertex ${cube.positions[vertex]} ${cube.positions[vertex + 1]} ${cube.positions[vertex + 2]}`));
  }
});

test('preview and STL bytes are deterministic for identical accepted geometry', async () => {
  const first = setup(); const second = setup();
  assert.equal((await first.orchestrator.derive({ jobId: 'job-1' })).ok, true);
  assert.equal((await second.orchestrator.derive({ jobId: 'job-1' })).ok, true);
  const firstJob = first.state.jobs.get('job-1'); const secondJob = second.state.jobs.get('job-1');
  assert.deepEqual(first.state.artifacts.get(firstJob.previewArtifactId).bytes,
    second.state.artifacts.get(secondJob.previewArtifactId).bytes);
  assert.deepEqual(first.state.artifacts.get(firstJob.stlArtifactId).bytes,
    second.state.artifacts.get(secondJob.stlArtifactId).bytes);
  assert.equal(firstJob.geometryDigest, secondJob.geometryDigest);
  assert.equal(firstJob.stlDigest, secondJob.stlDigest);
});

test('duplicate race and restart/replay perform one conversion and never overwrite ready', async () => {
  const { state, jobs, custody, sandbox, orchestrator } = setup();
  const [first, second] = await Promise.all([
    orchestrator.derive({ jobId: 'job-1' }), orchestrator.derive({ jobId: 'job-1' }),
  ]);
  assert.equal([first, second].filter(result => result.ok).length, 1);
  assert.equal(state.sandboxCalls, 1); assert.equal(state.reservations, 2); assert.equal(state.commits, 2);
  const before = { ...state.jobs.get('job-1') };
  const restarted = createCadPhase5DerivedArtifactOrchestrator({ enabled: true, jobs, custody,
    sandbox, now: () => 101 });
  assert.deepEqual(await restarted.derive({ jobId: 'job-1' }),
    { ok: false, code: 'CONVERSION_TERMINAL' });
  assert.deepEqual(state.jobs.get('job-1'), before); assert.equal(state.sandboxCalls, 1);
});

test('sandbox crash, timeout, OOM, late create and cleanup uncertainty quarantine without retry', async t => {
  const cases = [
    ['crash', async () => { throw new Error('SANDBOX_CRASH'); }],
    ['timeout', async () => ({ sourceDigest, units: 'millimeter', meshes: [cube], stopped: true,
      cleanupConfirmed: true, timedOut: true, oom: false, createdLate: false })],
    ['oom', async () => ({ sourceDigest, units: 'millimeter', meshes: [cube], stopped: true,
      cleanupConfirmed: true, timedOut: false, oom: true, createdLate: false })],
    ['late-create', async () => ({ sourceDigest, units: 'millimeter', meshes: [cube], stopped: true,
      cleanupConfirmed: true, timedOut: false, oom: false, createdLate: true })],
    ['cleanup-uncertain', async () => ({ sourceDigest, units: 'millimeter', meshes: [cube], stopped: false,
      cleanupConfirmed: false, timedOut: false, oom: false, createdLate: false })],
  ];
  for (const [name, convert] of cases) await t.test(name, async () => {
    const { state, orchestrator } = setup({ convert });
    assert.deepEqual(await orchestrator.derive({ jobId: 'job-1' }),
      { ok: false, code: 'CONVERSION_QUARANTINED' });
    assert.equal(state.jobs.get('job-1').state, 'quarantined');
    assert.equal(state.sandboxCalls, 1); assert.equal(state.reservations, 0);
  });
});

test('malformed, empty, nonfinite, excessive and out-of-bounds geometry quarantine', async t => {
  const geometries = [null, [], [{ positions: [], indices: [] }],
    [{ positions: [NaN, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }],
    [{ positions: [1_000_001, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }],
    Array(17).fill({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }),
  ];
  for (const [index, meshes] of geometries.entries()) await t.test(`case-${index + 1}`, async () => {
    const { state, orchestrator } = setup({ convert: async () => ({ sourceDigest,
      units: 'millimeter', meshes, stopped: true, cleanupConfirmed: true,
      timedOut: false, oom: false, createdLate: false }) });
    assert.equal((await orchestrator.derive({ jobId: 'job-1' })).code, 'CONVERSION_QUARANTINED');
    assert.equal(state.jobs.get('job-1').state, 'quarantined'); assert.equal(state.reservations, 0);
  });
});

test('derived output byte limit quarantines an otherwise bounded triangle set', async () => {
  const indices = Array.from({ length: 10_000 }, () => [0, 1, 2]).flat();
  const { state, orchestrator } = setup({ convert: async () => ({ sourceDigest,
    units: 'millimeter', meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices }],
    stopped: true, cleanupConfirmed: true, timedOut: false, oom: false, createdLate: false }) });
  assert.equal((await orchestrator.derive({ jobId: 'job-1' })).code, 'CONVERSION_QUARANTINED');
  assert.equal(state.jobs.get('job-1').state, 'quarantined'); assert.equal(state.reservations, 0);
});

test('source mismatch and unexpected sandbox fields quarantine before custody', async t => {
  for (const [name, mutate] of [['source', value => ({ ...value, sourceDigest: 'f'.repeat(64) })],
    ['shape', value => ({ ...value, providerSecret: 'must-not-pass' })]]) await t.test(name, async () => {
    const { state, orchestrator } = setup({ convert: async () => mutate({ sourceDigest,
      units: 'millimeter', meshes: [cube], stopped: true, cleanupConfirmed: true,
      timedOut: false, oom: false, createdLate: false }) });
    assert.equal((await orchestrator.derive({ jobId: 'job-1' })).code, 'CONVERSION_QUARANTINED');
    assert.equal(state.reservations, 0); assert.equal(state.jobs.get('job-1').state, 'quarantined');
  });
});

test('custody reservation and commit ambiguities never publish partial ready', async t => {
  for (const options of [{ reserveAt: 1 }, { commitAt: 1 }, { reserveAt: 2 }, { commitAt: 2 }]) {
    await t.test(JSON.stringify(options), async () => {
      const { state, orchestrator } = setup(options);
      assert.equal((await orchestrator.derive({ jobId: 'job-1' })).code, 'CONVERSION_QUARANTINED');
      const job = state.jobs.get('job-1'); assert.equal(job.state, 'quarantined');
      assert.equal(job.previewArtifactId, undefined); assert.equal(job.stlArtifactId, undefined);
    });
  }
});

test('unknown ready commit quarantines and cannot report success', async () => {
  const { state, orchestrator } = setup({ state: { unknownReady: true } });
  assert.deepEqual(await orchestrator.derive({ jobId: 'job-1' }),
    { ok: false, code: 'CONVERSION_QUARANTINED' });
  assert.equal(state.jobs.get('job-1').state, 'quarantined');
  assert.equal(state.artifacts.size, 2);
});

test('lost conversion-claim acknowledgement quarantines by job id with a fresh signal', async () => {
  const { state, orchestrator } = setup({ state: { unknownClaim: true } });
  assert.deepEqual(await orchestrator.derive({ jobId: 'job-1' }),
    { ok: false, code: 'CONVERSION_QUARANTINED' });
  assert.equal(state.jobs.get('job-1').state, 'quarantined');
  assert.deepEqual(state.events, ['claim', 'quarantine-by-job']);
  assert.equal(state.sandboxCalls, 0); assert.equal(state.reservations, 0);
});

test('quota and cost budget rejection occur before sandbox and custody', async t => {
  for (const [key, code] of [['forceQuota', 'CONVERSION_QUOTA_EXHAUSTED'],
    ['forceBudget', 'CONVERSION_BUDGET_EXHAUSTED']]) await t.test(key, async () => {
    const { state, orchestrator } = setup({ state: { [key]: true } });
    assert.deepEqual(await orchestrator.derive({ jobId: 'job-1' }), { ok: false, code });
    assert.equal(state.sandboxCalls, 0); assert.equal(state.reservations, 0);
    assert.equal(state.jobs.get('job-1').state, 'admitted');
  });
});

test('owner bindings remain exact and cross-owner artifact reads are denied by custody boundary', async () => {
  const { state, orchestrator } = setup();
  assert.equal((await orchestrator.derive({ jobId: 'job-1' })).ok, true);
  const job = state.jobs.get('job-1');
  const read = (artifactId, owner) => {
    const artifact = state.artifacts.get(artifactId);
    return Boolean(artifact && artifact.owner.userId === owner.userId
      && artifact.owner.shopId === owner.shopId && artifact.owner.uploadSessionId === owner.uploadSessionId);
  };
  assert.equal(read(job.previewArtifactId,
    { userId: 'user-a', shopId: 'shop-a', uploadSessionId: 'session-a' }), true);
  assert.equal(read(job.previewArtifactId,
    { userId: 'user-b', shopId: 'shop-a', uploadSessionId: 'session-a' }), false);
  assert.equal(read(job.stlArtifactId,
    { userId: 'user-a', shopId: 'shop-b', uploadSessionId: 'session-a' }), false);
});

test('cancellation quarantines the claimed job and creates no artifacts', async () => {
  const controller = new AbortController();
  const { state, orchestrator } = setup({ convert: async (_input, { signal }) => {
    controller.abort(); signal.throwIfAborted();
  } });
  assert.deepEqual(await orchestrator.derive({ jobId: 'job-1', signal: controller.signal }),
    { ok: false, code: 'CONVERSION_QUARANTINED' });
  assert.equal(state.jobs.get('job-1').state, 'quarantined'); assert.equal(state.artifacts.size, 0);
});

test('rollback closes conversion first, stops sandboxes, then quarantines uncertainty', async () => {
  const { state, orchestrator } = setup();
  state.jobs.get('job-1').state = 'converting';
  const result = await orchestrator.closeForRollback();
  assert.equal(result.ok, true); assert.equal(result.conversionAuthorized, false);
  assert.deepEqual(result.order, ['conversion-closed', 'sandboxes-stopped', 'uncertain-jobs-quarantined']);
  assert.equal(state.jobs.get('job-1').state, 'quarantined');
});

test('public result and logs contain no source digest, geometry, bytes, owner or provider detail', async () => {
  const { state, orchestrator } = setup();
  const result = await orchestrator.derive({ jobId: 'job-1' });
  const visible = JSON.stringify({ result, events: state.events });
  for (const sentinel of [sourceDigest, 'user-a', 'shop-a', 'session-a', 'positions',
    'indices', 'providerSecret']) assert.equal(visible.includes(sentinel), false);
});
