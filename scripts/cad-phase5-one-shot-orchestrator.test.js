const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { POLICY, createCadPhase5OneShotOrchestrator }
  = require('../server/cadPhase5OneShotOrchestrator');

const fixture = fs.readFileSync(path.join(__dirname, '../public/cad-fixtures/public-cube-10x10.igs'));
const hash = value => createHash('sha256').update(value).digest('hex');
const baseHeaders = Object.freeze({ cookie: 'synthetic-cookie', origin: 'https://app.reversr.test',
  'x-upload-csrf': 'synthetic-csrf', 'idempotency-key': 'synthetic-key-0001' });
const principal = Object.freeze({ userId: 'user-a', shopId: 'shop-a', uploadSessionId: 'session-a',
  authorityGeneration: 1, expiresAt: 10000 });
const evidence = Object.freeze({ deploymentRef: 'deployment-a', cohortRef: 'cohort-a',
  evidenceDigest: 'a'.repeat(64), retentionPolicyDigest: 'b'.repeat(64), active: true,
  expiresAt: 9000, bodyAdmissionAuthorized: true, conversionAuthorized: false });

function request(headers = baseHeaders, extraRaw = []) {
  const rawHeaders = Object.entries(headers).flatMap(([key, value]) => [key, value]).concat(extraRaw);
  return new Proxy({ headers: { ...headers }, rawHeaders }, { get(target, key) {
    if (key === 'headers' || key === 'rawHeaders') return target[key];
    throw new Error('BODY_OR_REQUEST_ACCESS_BEFORE_AUTH');
  } });
}

function createControls(state) {
  let queue = Promise.resolve();
  const serialized = operation => {
    const pending = queue.then(operation); queue = pending.catch(() => {}); return pending;
  };
  return {
    claim(record, policy, { signal }) {
      return serialized(async () => {
        signal.throwIfAborted(); state.events.push('claim');
        const existing = state.attempts.get(record.idempotencyDigest);
        if (existing) return { status: existing.state === 'quarantined' ? 'quarantined' : 'duplicate',
          attemptId: existing.attemptId, fence: existing.fence };
        if (state.forceQuota) return { status: 'rejected', code: 'ORCHESTRATION_QUOTA_EXHAUSTED' };
        if (state.forceBudget || state.reservedMicros + record.reservationMicros > policy.budgetMicros) {
          return { status: 'rejected', code: 'ORCHESTRATION_BUDGET_EXHAUSTED' };
        }
        if ([...state.attempts.values()].some(row => ['reserved', 'body-accepted'].includes(row.state))) {
          return { status: 'rejected', code: 'ORCHESTRATION_CONCURRENCY_LIMIT' };
        }
        const row = { ...record, attemptId: `attempt-${state.attempts.size + 1}`,
          fence: state.attempts.size + 1, state: 'reserved' };
        state.attempts.set(record.idempotencyDigest, row); state.byId.set(row.attemptId, row);
        state.reservedMicros += row.reservationMicros;
        return { status: 'claimed', attemptId: row.attemptId, fence: row.fence };
      });
    },
    async markBodyAccepted(attemptId, fence, body, updatedAt, { signal }) {
      signal.throwIfAborted(); state.events.push('body-accepted'); const row = state.byId.get(attemptId);
      if (!row || row.fence !== fence || row.state !== 'reserved') return false;
      Object.assign(row, { state: 'body-accepted', bodyByteCount: body.byteCount,
        restrictedDigest: body.restrictedDigest, updatedAt }); return true;
    },
    async bindArtifactAndJob(attemptId, fence, binding, { signal }) {
      signal.throwIfAborted(); state.events.push('job-bind'); const row = state.byId.get(attemptId);
      if (state.unknownJobCommit) return false;
      if (!row || row.fence !== fence || row.state !== 'body-accepted' || row.jobId) return false;
      if (state.jobs.has(binding.jobId) || [...state.jobs.values()].some(job => job.attemptId === attemptId
        || job.artifactId === binding.artifactId)) return false;
      const job = { ...binding, attemptId, userId: row.userId, shopId: row.shopId,
        uploadSessionId: row.uploadSessionId, state: 'admitted' };
      state.jobs.set(binding.jobId, job); Object.assign(row, { state: 'admitted',
        artifactId: binding.artifactId, jobId: binding.jobId, updatedAt: binding.admittedAt });
      return true;
    },
    async quarantine(attemptId, fence, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted(); state.events.push('quarantine'); const row = state.byId.get(attemptId);
      if (!row || row.fence !== fence) return false;
      Object.assign(row, { state: 'quarantined', quarantineReasonDigest: reasonDigest, updatedAt });
      if (row.jobId && state.jobs.has(row.jobId)) state.jobs.get(row.jobId).state = 'quarantined';
      return true;
    },
    async quarantineByIdempotency(idempotencyDigest, reasonDigest, updatedAt, { signal }) {
      signal.throwIfAborted(); state.events.push('quarantine-by-idempotency');
      const row = state.attempts.get(idempotencyDigest);
      if (!row || row.state === 'admitted') return false;
      Object.assign(row, { state: 'quarantined', quarantineReasonDigest: reasonDigest, updatedAt });
      return true;
    },
    async closeForRollback(_updatedAt, { signal }) {
      signal.throwIfAborted();
      const order = ['admission-closed', 'grants-revoked', 'unknown-quarantined'];
      state.events.push(...order); state.closed = true;
      for (const row of state.attempts.values()) {
        if (row.state !== 'admitted') row.state = 'quarantined';
      }
      return { closed: true, bodyAdmissionAuthorized: false, order };
    },
  };
}

function setup(overrides = {}) {
  const state = { now: 1000, events: [], bodyReads: 0, attempts: new Map(), byId: new Map(),
    jobs: new Map(), artifacts: new Map(), reservedMicros: 0, custodyReservations: 0,
    custodyCommits: 0, forceQuota: false, forceBudget: false, unknownJobCommit: false };
  const controls = createControls(state);
  const custody = {
    async reserveArtifact(owner, input, { signal }) {
      signal?.throwIfAborted(); state.events.push('custody-reserve'); state.custodyReservations += 1;
      if (overrides.reserveResult) return overrides.reserveResult;
      const artifactId = `artifact-${state.custodyReservations}`;
      state.artifacts.set(artifactId, { owner, input, state: 'reserved' });
      return { ok: true, artifactId };
    },
    async commitArtifact(owner, artifactId, bytes, { signal }) {
      signal?.throwIfAborted(); state.events.push('custody-commit'); state.custodyCommits += 1;
      if (overrides.commitResult) return overrides.commitResult;
      const artifact = state.artifacts.get(artifactId);
      if (!artifact || artifact.owner.userId !== owner.userId || artifact.input.restrictedDigest !== hash(bytes)) {
        return { ok: false, code: 'CUSTODY_UNKNOWN' };
      }
      artifact.state = 'stored'; return { ok: true, artifactId };
    },
  };
  const options = {
    enabled: true, request: overrides.request || request(), controls, custody, now: () => state.now,
    async authenticate(headers, { signal }) {
      signal.throwIfAborted(); state.events.push('authenticate');
      assert.equal(Object.isFrozen(headers), true); return overrides.auth === undefined ? principal : overrides.auth;
    },
    async readAdmissionEvidence(identity, { signal }) {
      signal.throwIfAborted(); state.events.push('evidence'); assert.equal(identity.userId, principal.userId);
      return overrides.evidence === undefined ? evidence : overrides.evidence;
    },
    async readBodyOnce({ maxBytes, signal }) {
      signal.throwIfAborted(); state.events.push('body-read'); state.bodyReads += 1;
      assert.equal(maxBytes, 256 * 1024);
      return overrides.body || { fileName: 'public-cube-10x10.igs', bytes: Buffer.from(fixture) };
    },
  };
  Object.assign(options, overrides.options || {});
  return { state, controls, custody, options,
    orchestrator: createCadPhase5OneShotOrchestrator(options) };
}

test('default is inert, unmounted and cannot read a request or body', async () => {
  const orchestrator = createCadPhase5OneShotOrchestrator({ request: new Proxy({}, {
    get() { throw new Error('REQUEST_READ'); },
  }) });
  assert.equal(orchestrator.configured, false); assert.equal(orchestrator.reviewConfigured, false);
  assert.equal(orchestrator.routeMounted, false); assert.equal(orchestrator.bodyAdmissionAuthorized, false);
  assert.equal(orchestrator.providerDispatchEnabled, false); assert.equal(orchestrator.conversionDispatchEnabled, false);
  assert.equal(orchestrator.maxRetries, 0);
  assert.deepEqual(await orchestrator.prepareOneShot(), { ok: false, code: 'ORCHESTRATION_UNAVAILABLE' });
});

test('authentication, evidence and durable claim all precede the single body read', async () => {
  const f = setup(); const result = await f.orchestrator.prepareOneShot();
  assert.equal(result.ok, true); assert.equal(result.code, 'SOURCE_ONLY_JOB_PREPARED');
  assert.equal(result.conversionAuthorized, false); assert.equal(result.conversionDispatchCount, 0);
  assert.deepEqual(f.state.events, ['authenticate', 'evidence', 'claim', 'body-read', 'body-accepted',
    'custody-reserve', 'custody-commit', 'job-bind']);
  assert.equal(f.state.bodyReads, 1); assert.equal(f.state.artifacts.size, 1); assert.equal(f.state.jobs.size, 1);
  assert.equal(JSON.stringify(result).includes(hash(fixture)), false);
});

test('missing auth or deployment/cohort evidence denies before claim and body', async () => {
  for (const overrides of [{ auth: null }, { evidence: null },
    { evidence: { ...evidence, active: false } }, { evidence: { ...evidence, expiresAt: 11000 } },
    { evidence: { ...evidence, bodyAdmissionAuthorized: false } }]) {
    const f = setup(overrides); const result = await f.orchestrator.prepareOneShot();
    assert.equal(result.ok, false); assert.equal(f.state.bodyReads, 0);
    assert.equal(f.state.attempts.size, 0); assert.equal(f.state.custodyReservations, 0);
  }
});

test('duplicate and concurrent idempotency claims create at most one artifact and one job', async () => {
  const f = setup();
  const first = f.orchestrator.prepareOneShot();
  const other = createCadPhase5OneShotOrchestrator(f.options);
  const second = other.prepareOneShot();
  const results = await Promise.all([first, second]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => result.code === 'IDEMPOTENCY_REPLAYED').length, 1);
  assert.equal(f.state.bodyReads, 1); assert.equal(f.state.artifacts.size, 1); assert.equal(f.state.jobs.size, 1);
  const restarted = createCadPhase5OneShotOrchestrator(f.options);
  assert.equal((await restarted.prepareOneShot()).code, 'IDEMPOTENCY_REPLAYED');
  assert.equal(f.state.bodyReads, 1);
});

test('quota, budget and concurrency rejection occur before body or custody', async () => {
  for (const mode of ['forceQuota', 'forceBudget', 'concurrency']) {
    const f = setup();
    if (mode === 'concurrency') {
      const row = { idempotencyDigest: 'f'.repeat(64), attemptId: 'attempt-existing', fence: 1,
        state: 'reserved', reservationMicros: POLICY.reservationMicros };
      f.state.attempts.set(row.idempotencyDigest, row); f.state.byId.set(row.attemptId, row);
    } else f.state[mode] = true;
    const result = await f.orchestrator.prepareOneShot();
    assert.equal(result.ok, false); assert.equal(f.state.bodyReads, 0);
    assert.equal(f.state.custodyReservations, 0);
  }
});

test('invalid body, custody ambiguity and job ambiguity quarantine durably with no retry', async () => {
  const cases = [
    setup({ body: { fileName: 'bad.txt', bytes: Buffer.from('bad') } }),
    setup({ reserveResult: { ok: false, code: 'CUSTODY_UNKNOWN' } }),
    setup({ commitResult: { ok: false, code: 'CUSTODY_UNKNOWN' } }),
    setup(),
  ];
  cases.at(-1).state.unknownJobCommit = true;
  for (const f of cases) {
    const result = await f.orchestrator.prepareOneShot();
    assert.equal(result.ok, false); assert.match(result.code, /BODY_REJECTED|ORCHESTRATION_QUARANTINED/);
    const row = [...f.state.attempts.values()][0]; assert.equal(row.state, 'quarantined');
    assert.equal(f.state.jobs.size, 0);
    const before = { body: f.state.bodyReads, reserve: f.state.custodyReservations,
      commit: f.state.custodyCommits };
    const restarted = createCadPhase5OneShotOrchestrator(f.options);
    assert.equal((await restarted.prepareOneShot()).code, 'ORCHESTRATION_QUARANTINED');
    assert.deepEqual({ body: f.state.bodyReads, reserve: f.state.custodyReservations,
      commit: f.state.custodyCommits }, before);
  }
});

test('caller cancellation while body is pending uses fresh durable quarantine', async () => {
  let entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const f = setup({ options: { async readBodyOnce({ signal }) {
    f.state.events.push('body-read'); f.state.bodyReads += 1; entered();
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('private')), { once: true }));
  } } });
  const controller = new AbortController();
  const pending = f.orchestrator.prepareOneShot({ signal: controller.signal });
  await waiting; controller.abort();
  assert.equal((await pending).code, 'ORCHESTRATION_QUARANTINED');
  assert.equal([...f.state.attempts.values()][0].state, 'quarantined');
});

test('cancellation at auth, evidence, claim, custody and job boundaries fails closed', async () => {
  for (const stage of ['authenticate', 'readAdmissionEvidence', 'claim', 'reserveArtifact',
    'commitArtifact', 'bindArtifactAndJob']) {
    let entered;
    const waiting = new Promise(resolve => { entered = resolve; });
    const f = setup();
    const target = ['authenticate', 'readAdmissionEvidence'].includes(stage) ? f.options
      : stage === 'claim' || stage === 'bindArtifactAndJob' ? f.controls : f.custody;
    const original = target[stage].bind(target);
    target[stage] = async (...args) => {
      const result = ['claim', 'commitArtifact', 'bindArtifactAndJob'].includes(stage)
        ? await original(...args) : undefined;
      entered();
      const options = args.at(-1);
      await new Promise((_, reject) => options.signal.addEventListener('abort',
        () => reject(new Error('private-boundary-detail')), { once: true }));
      return result;
    };
    const orchestrator = createCadPhase5OneShotOrchestrator(f.options);
    const controller = new AbortController();
    const pending = orchestrator.prepareOneShot({ signal: controller.signal });
    await waiting; controller.abort();
    const result = await pending;
    assert.equal(result.ok, false, stage);
    assert.equal(result.code, stage === 'authenticate' || stage === 'readAdmissionEvidence'
      || stage === 'claim' ? 'ORCHESTRATION_UNAVAILABLE' : 'ORCHESTRATION_QUARANTINED', stage);
    assert.equal(f.state.bodyReads, ['authenticate', 'readAdmissionEvidence', 'claim'].includes(stage) ? 0 : 1,
      stage);
    if (!['authenticate', 'readAdmissionEvidence'].includes(stage)) {
      assert.equal([...f.state.attempts.values()][0].state, 'quarantined', stage);
    }
    if (stage === 'bindArtifactAndJob') assert.equal([...f.state.jobs.values()][0].state, 'quarantined');
  }
});

test('rollback closes admission before revocation and quarantine', async () => {
  const f = setup(); const result = await f.orchestrator.closeForRollback();
  assert.deepEqual(result, { ok: true, code: 'ROLLBACK_CLOSED_FIRST', bodyAdmissionAuthorized: false,
    order: ['admission-closed', 'grants-revoked', 'unknown-quarantined'] });
  assert.deepEqual(f.state.events, ['admission-closed', 'grants-revoked', 'unknown-quarantined']);
});

test('receipts and logs exclude headers, bytes, filenames, digests and provider details', async () => {
  const calls = []; const originals = [console.log, console.warn, console.error];
  console.log = (...args) => calls.push(args); console.warn = (...args) => calls.push(args);
  console.error = (...args) => calls.push(args);
  try {
    const f = setup(); const result = await f.orchestrator.prepareOneShot();
    const text = JSON.stringify(result);
    for (const privateValue of [fixture.toString('utf8').slice(0, 40), baseHeaders.cookie,
      baseHeaders['x-upload-csrf'], baseHeaders['idempotency-key'], hash(fixture), 'public-cube-10x10.igs']) {
      assert.equal(text.includes(privateValue), false);
    }
    assert.equal(calls.length, 0);
  } finally { [console.log, console.warn, console.error] = originals; }
});

test('actual routes remain closed and operator import stays independent', () => {
  const route = fs.readFileSync(path.join(__dirname, '../server/cadUserUploadRouter.js'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, '../server/index.js'), 'utf8');
  const bridge = fs.readFileSync(path.join(__dirname, '../utils/cadUserImportBridge.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(bridge, /const CAD_USER_IMPORT_ENABLED = false;/);
  assert.doesNotMatch(route, /cadPhase5OneShotOrchestrator/);
  assert.doesNotMatch(index, /cadPhase5OneShotOrchestrator/);
  assert.match(index, /createSandboxRouter/);
});
