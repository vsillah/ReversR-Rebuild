// Offline public fixture and synthetic metadata only. No route, provider, storage,
// Sandbox, credential, deployment, private CAD, or network access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const { CONVEX_AUTHORITY_MODEL } = require('../server/convexUploadSessionStore');
const { PUBLIC_FIXTURE, PUBLIC_DERIVED_FIXTURE, REQUIRED_DURABLE_OPERATIONS,
  createCadPhase5PublicFixtureQualificationRunner }
  = require('../server/cadPhase5PublicFixtureQualificationRunner');

const root = path.resolve(__dirname, '..');
const fixturePath = path.join(root,
  'node_modules/occt-import-js/test/testfiles/cube-10x10mm/Cube 10x10.igs');
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = character => character.repeat(64);
const SESSION_DIGEST = digest('1');
const PUBLIC_PREVIEW_BYTES = Buffer.from('{"fixture":"cube","kind":"preview"}');
const PUBLIC_STL_BYTES = Buffer.from('solid public_cube\nendsolid public_cube\n');
const owner = { userId: 'fixture-user', shopId: 'fixture-shop',
  uploadSessionId: 'fixture-upload-session' };

function derivedInput(jobId, overrides = {}) {
  return { jobId, derivedFixture: structuredClone(PUBLIC_DERIVED_FIXTURE),
    previewBytes: Buffer.from(PUBLIC_PREVIEW_BYTES), stlBytes: Buffer.from(PUBLIC_STL_BYTES),
    cleanupConfirmed: true, ...overrides };
}

function loadDurableAdapter() {
  const source = fs.readFileSync(path.join(root, 'convex/cadPhase5DurableAdapters.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  const requireFixed = name => {
    if (name === 'convex/values') return require(name);
    if (name === './_generated/server') return {
      internalMutation: config => config, internalQuery: config => config,
    };
    if (name === './schema') return { custodyArtifact: require('convex/values').v.any() };
    throw Error(`SOURCE_IMPORT_NOT_ALLOWED:${name}`);
  };
  vm.runInThisContext(`(function(exports,require){${compiled}\n})`, {
    filename: 'convex/cadPhase5DurableAdapters.ts',
  })(exports, requireFixed);
  return exports;
}
const adapter = loadDurableAdapter();

function syntheticDb(seed = {}) {
  let tables = structuredClone(seed);
  let sequence = 0;
  let queue = Promise.resolve();
  const rows = table => (tables[table] ||= []);
  const db = {
    query(table) {
      const terms = [];
      return { withIndex(_name, callback) {
        const q = { eq(key, value) { terms.push([key, value]); return q; } };
        callback(q); return this;
      }, async take(limit) {
        return rows(table).filter(row => terms.every(([key, value]) => row[key] === value)).slice(0, limit);
      } };
    },
    async insert(table, value) {
      const id = `synthetic-${table}-${sequence++}`;
      rows(table).push({ _id: id, _creationTime: 1, ...structuredClone(value) });
      return id;
    },
    async patch(id, value) {
      const row = Object.values(tables).flat().find(candidate => candidate._id === id);
      if (!row) throw Error('SYNTHETIC_ROW_MISSING');
      Object.assign(row, structuredClone(value));
    },
    async delete(id) {
      for (const list of Object.values(tables)) {
        const index = list.findIndex(row => row._id === id);
        if (index >= 0) { list.splice(index, 1); return; }
      }
      throw Error('SYNTHETIC_ROW_MISSING');
    },
  };
  const transaction = operation => {
    const execute = async () => {
      const before = structuredClone(tables);
      try { return await operation(db); } catch (error) { tables = before; throw error; }
    };
    const current = queue.then(execute, execute);
    queue = current.then(() => undefined, () => undefined);
    return current;
  };
  return { db, transaction, snapshot: () => structuredClone(tables) };
}

function durablePort(store, events, { failOperation } = {}) {
  const mutations = new Set(['claimUpload', 'advanceUpload', 'reserveArtifact', 'consumeQuota',
    'transitionArtifact', 'claimConversion', 'advanceConversion', 'issueDownloadGrant',
    'closeForRollback']);
  const candidates = {
    claimUpload: adapter.claimUploadCandidate,
    advanceUpload: adapter.advanceUploadCandidate,
    reserveArtifact: adapter.reserveArtifactCandidate,
    consumeQuota: adapter.consumeQuotaCandidate,
    transitionArtifact: adapter.transitionArtifactCandidate,
    readArtifact: adapter.readArtifactCandidate,
    reconcile: adapter.reconcileCandidate,
    claimConversion: adapter.claimConversionCandidate,
    advanceConversion: adapter.advanceConversionCandidate,
    issueDownloadGrant: adapter.issueGrantCandidate,
    resolveDownloadGrant: adapter.resolveGrantCandidate,
    closeForRollback: adapter.closeForRollbackCandidate,
  };
  return Object.freeze({
    operations: REQUIRED_DURABLE_OPERATIONS,
    async call(operation, args, { signal } = {}) {
      signal?.throwIfAborted?.(); events.push(operation);
      if (operation === failOperation) throw Error('PRIVATE_SYNTHETIC_SENTINEL');
      const candidate = candidates[operation];
      if (!candidate) throw Error('UNKNOWN_DURABLE_OPERATION');
      return mutations.has(operation)
        ? store.transaction(db => candidate(db, args)) : candidate(store.db, args);
    },
  });
}

async function setup({ seed = {}, failOperation, fixtureReader } = {}) {
  const events = [];
  const state = { now: 1000, bodyReads: 0, authWrites: 0 };
  const now = () => state.now++;
  const base = createInMemoryUploadSessionStoreForTests({ testOnly: true });
  const session = { schemaVersion: 2, ...owner, loginSessionId: 'fixture-login-session',
    sessionId: owner.uploadSessionId, authMethod: 'passkey', cadUploadAllowed: true,
    transport: 'cookie', issuedAt: 900, expiresAt: 500_000, status: 'active',
    csrfDigest: digest('2') };
  await base.insertIfAbsent(SESSION_DIGEST, session, {});
  const authStore = Object.freeze({ authorityModel: CONVEX_AUTHORITY_MODEL,
    async insertIfAbsent(...args) { state.authWrites += 1; return base.insertIfAbsent(...args); },
    async read(...args) { events.push('auth-session'); return base.read(...args); },
    revoke: (...args) => base.revoke(...args),
  });
  const webAuthOptions = {
    request: { headers: { cookie: '__Host-convex-auth=public-fixture',
      origin: 'https://app.reversr.test' }, rawHeaders: ['Cookie',
      '__Host-convex-auth=public-fixture', 'Origin', 'https://app.reversr.test'] },
    allowedOrigins: ['https://app.reversr.test'],
    store: authStore,
    now,
    async readCurrentConvexAuthSession() { throw Error('SESSION_ISSUANCE_FORBIDDEN'); },
    async readConvexAuthSessionById(loginSessionId, { signal }) {
      signal?.throwIfAborted?.(); events.push('auth-login');
      return loginSessionId === session.loginSessionId ? { userId: owner.userId,
        loginSessionId, authMethod: 'passkey', active: true, expiresAt: session.expiresAt } : null;
    },
    async readCadAuthorization(identity, { signal }) {
      signal?.throwIfAborted?.(); events.push('auth-authority');
      return identity.userId === owner.userId && identity.loginSessionId === session.loginSessionId
        ? { ...identity, shopId: owner.shopId, userEnabled: true, membershipActive: true,
          cadUploadAllowed: true, userGeneration: 1, membershipGeneration: 1,
          expiresAt: session.expiresAt } : null;
    },
  };
  const store = syntheticDb(seed);
  const durable = durablePort(store, events, { failOperation });
  const options = { enabled: true, fixture: PUBLIC_FIXTURE, webAuthOptions,
    sessionDigest: SESSION_DIGEST, scopeKey: 'fixture-phase5-scope',
    quotaScopeKey: 'fixture-quota-scope', authorityGeneration: 1,
    deploymentRef: 'package7-source-only', cohortRef: 'public-fixture-cube',
    evidenceDigest: digest('3'), retentionPolicyDigest: digest('4'), durable, now,
    async readPublicFixture(descriptor, { signal } = {}) {
      signal?.throwIfAborted?.(); events.push('read-public-fixture'); state.bodyReads += 1;
      assert.deepEqual(descriptor, PUBLIC_FIXTURE);
      return fixtureReader ? fixtureReader() : fs.readFileSync(fixturePath);
    },
  };
  return { events, state, store, durable, options,
    runner: createCadPhase5PublicFixtureQualificationRunner(options),
    restart: () => createCadPhase5PublicFixtureQualificationRunner(options) };
}

async function authorizeSyntheticFixtureJob(store, jobId) {
  await store.transaction(async db => {
    const [job] = await db.query('cadUploadJobs').withIndex('by_jobId', q => q.eq('jobId', jobId)).take(2);
    assert.ok(job);
    await db.patch(job._id, { conversionAuthorized: true });
  });
}

test('default is inert and cannot inspect fixture, auth, durable state, or runtime surfaces', async () => {
  const runner = createCadPhase5PublicFixtureQualificationRunner({
    readPublicFixture() { throw Error('FIXTURE_READ'); },
    webAuthOptions: new Proxy({}, { get() { throw Error('AUTH_READ'); } }),
    durable: new Proxy({}, { get() { throw Error('DURABLE_READ'); } }),
  });
  assert.equal(runner.configured, false);
  assert.equal(runner.reviewConfigured, false);
  assert.equal(runner.qualificationMounted, false);
  assert.deepEqual([runner.routeMounted, runner.sessionIssuanceEnabled,
    runner.bodyAdmissionAuthorized, runner.providerDispatchEnabled,
    runner.conversionDispatchEnabled, runner.downloadRouteEnabled,
    runner.privateCadAuthorized], [false, false, false, false, false, false, false]);
  assert.equal(runner.maxRetries, 0);
  assert.deepEqual(await runner.preparePublicFixture(), {
    ok: false, code: 'PUBLIC_FIXTURE_UNAVAILABLE',
  });
});

test('real web binding authority and durable claim both precede one public fixture read', async () => {
  const f = await setup();
  const result = await f.runner.preparePublicFixture();
  assert.equal(result.ok, true, JSON.stringify({ result, events: f.events,
    rows: f.store.snapshot() }));
  assert.equal(result.code, 'PUBLIC_FIXTURE_ADMISSION_PREPARED');
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.maxRetries, 0);
  assert.equal(f.state.bodyReads, 1);
  assert.equal(f.state.authWrites, 0);
  const positions = Object.fromEntries(['auth-session', 'auth-login', 'auth-authority',
    'claimUpload', 'read-public-fixture'].map(name => [name, f.events.indexOf(name)]));
  assert.ok(positions['auth-session'] >= 0);
  assert.ok(positions['auth-session'] < positions['auth-login']);
  assert.ok(positions['auth-login'] < positions['auth-authority']);
  assert.ok(positions['auth-authority'] < positions.claimUpload);
  assert.ok(positions.claimUpload < positions['read-public-fixture']);
  const rows = f.store.snapshot();
  assert.equal(rows.cadUploadOrchestrationAttempts.length, 1);
  assert.equal(rows.cadUploadOrchestrationAttempts[0].maxRetries, 0);
  assert.equal(rows.cadArtifacts.length, 1);
  assert.equal(rows.cadArtifacts[0].kind, 'original-igs');
  assert.equal(rows.cadArtifacts[0].state, 'stored');
  assert.equal(rows.cadUploadJobs.length, 1);
  assert.equal(rows.cadUploadJobs[0].conversionAuthorized, false);
});

test('restart and replay preserve one attempt, zero retries, and zero second fixture reads', async () => {
  const f = await setup();
  const first = await f.runner.preparePublicFixture();
  const restarted = f.restart();
  const replay = await restarted.preparePublicFixture();
  assert.equal(first.ok, true);
  assert.equal(replay.code, 'IDEMPOTENCY_REPLAYED');
  assert.equal(f.state.bodyReads, 1);
  assert.equal(f.store.snapshot().cadUploadOrchestrationAttempts.length, 1);
  assert.equal(f.store.snapshot().cadArtifacts.length, 1);
  assert.equal(f.store.snapshot().cadUploadJobs.length, 1);
});

test('orchestration and custody quotas fail closed without hidden dispatch', async () => {
  const maxedAttempts = Array.from({ length: 4 }, (_, index) => ({
    _id: `attempt-${index}`, _creationTime: 1, idempotencyDigest: String(index).repeat(64),
    attemptId: `existing-attempt-${index}`, ...owner, authorityGeneration: 1,
    deploymentRef: 'package7-source-only', cohortRef: 'public-fixture-cube',
    evidenceDigest: digest('3'), retentionPolicyDigest: digest('4'), reservationMicros: 1,
    maxRetries: 0, fence: 1, createdAt: 900, expiresAt: 500_000, state: 'quarantined',
  }));
  const attemptQuota = await setup({ seed: { cadUploadOrchestrationAttempts: maxedAttempts } });
  assert.equal((await attemptQuota.runner.preparePublicFixture()).code,
    'ORCHESTRATION_QUOTA_EXHAUSTED');
  assert.equal(attemptQuota.state.bodyReads, 0);
  assert.equal(attemptQuota.store.snapshot().cadArtifacts?.length ?? 0, 0);

  const custodyQuota = await setup({ seed: { cadArtifactQuotaLedgers: [{
    _id: 'quota', _creationTime: 1, scopeKey: 'fixture-quota-scope',
    userId: owner.userId, shopId: owner.shopId, storedBytes: 0, objectCount: 12,
    classAOperations: 0, classBOperations: 0, deleteOperations: 0,
    revision: 1, stopped: false, updatedAt: 900,
  }] } });
  assert.equal((await custodyQuota.runner.preparePublicFixture()).code,
    'ORCHESTRATION_QUOTA_EXHAUSTED');
  assert.equal(custodyQuota.store.snapshot().cadArtifacts?.length ?? 0, 0);
  assert.equal(custodyQuota.events.includes('provider-dispatch'), false);
  assert.equal(custodyQuota.events.includes('conversion-dispatch'), false);
});

test('conversion stays denied until independently pre-authorized, then binds original and STL with cleanup', async () => {
  const f = await setup();
  const admission = await f.runner.preparePublicFixture();
  const derived = derivedInput(admission.jobId);
  const denied = await f.runner.qualifyDerivedState(derived);
  assert.equal(denied.code, 'CONVERSION_NOT_AUTHORIZED');
  assert.equal(f.store.snapshot().cadArtifacts.length, 1);
  assert.equal(f.events.includes('conversion-dispatch'), false);

  await authorizeSyntheticFixtureJob(f.store, admission.jobId);
  const ready = await f.runner.qualifyDerivedState(derived);
  assert.equal(ready.code, 'PUBLIC_FIXTURE_DERIVED_STATE_READY');
  assert.equal(ready.cleanupConfirmed, true);
  assert.equal(ready.conversionDispatchEnabled, false);
  const rows = f.store.snapshot();
  const original = rows.cadArtifacts.find(row => row.artifactId === ready.originalArtifactId);
  const stl = rows.cadArtifacts.find(row => row.artifactId === ready.stlArtifactId);
  const job = rows.cadUploadJobs.find(row => row.jobId === admission.jobId);
  assert.equal(original.kind, 'original-igs');
  assert.equal(stl.kind, 'derived-stl');
  assert.equal(stl.sourceArtifactId, original.artifactId);
  assert.equal(stl.sourceDigest, original.restrictedDigest);
  assert.equal(job.stlArtifactId, stl.artifactId);
  assert.equal(job.cleanupConfirmed, true);
  assert.equal(job.state, 'ready');
});

test('derived fixture mismatches fail before any durable read, claim, reservation, quota, or mutation', async () => {
  const f = await setup();
  const admission = await f.runner.preparePublicFixture();
  const beforeEvents = [...f.events];
  const beforeRows = f.store.snapshot();
  const previewChanged = Buffer.from(PUBLIC_PREVIEW_BYTES);
  previewChanged[0] ^= 1;
  const stlChanged = Buffer.from(PUBLIC_STL_BYTES);
  stlChanged[0] ^= 1;
  const wrongGeometry = structuredClone(PUBLIC_DERIVED_FIXTURE);
  wrongGeometry.geometryDigest = digest('8');
  const wrongLength = structuredClone(PUBLIC_DERIVED_FIXTURE);
  wrongLength.preview.byteCount += 1;
  const wrongShape = structuredClone(PUBLIC_DERIVED_FIXTURE);
  delete wrongShape.stl.sha256;
  const unexpectedField = structuredClone(PUBLIC_DERIVED_FIXTURE);
  unexpectedField.provenance = 'unreviewed';
  const cases = [
    derivedInput(admission.jobId, { previewBytes: previewChanged }),
    derivedInput(admission.jobId, { stlBytes: stlChanged }),
    derivedInput(admission.jobId, { previewBytes: PUBLIC_PREVIEW_BYTES.subarray(0,
      PUBLIC_PREVIEW_BYTES.length - 1) }),
    derivedInput(admission.jobId, { derivedFixture: wrongGeometry }),
    derivedInput(admission.jobId, { derivedFixture: wrongLength }),
    derivedInput(admission.jobId, { derivedFixture: wrongShape }),
    derivedInput(admission.jobId, { derivedFixture: unexpectedField }),
    { ...derivedInput(admission.jobId), geometryDigest: PUBLIC_DERIVED_FIXTURE.geometryDigest },
  ];
  for (const value of cases) {
    assert.deepEqual(await f.runner.qualifyDerivedState(value), {
      ok: false, code: 'PUBLIC_FIXTURE_DERIVED_INVALID',
    });
  }
  assert.deepEqual(f.events, beforeEvents);
  assert.deepEqual(f.store.snapshot(), beforeRows);
  assert.equal(f.events.filter(event => event === 'claimConversion').length, 0);
});

test('download grants remain owner scoped and rollback closes first, revokes, and survives restart', async () => {
  const f = await setup();
  const admission = await f.runner.preparePublicFixture();
  const grantDigest = digest('7');
  const grant = await f.runner.qualifyDownloadGrant({ artifactId: admission.artifactId, grantDigest });
  assert.equal(grant.code, 'PUBLIC_FIXTURE_GRANT_QUALIFIED');
  assert.equal((await f.runner.resolveDownloadGrant({ grantDigest, owner })).ok, true);
  assert.equal((await f.runner.resolveDownloadGrant({ grantDigest,
    owner: { ...owner, shopId: 'other-shop' } })).code, 'CUSTODY_DENIED');
  const closed = await f.runner.closeForRollback();
  assert.equal(closed.code, 'PUBLIC_FIXTURE_ROLLBACK_CLOSED_FIRST');
  assert.deepEqual(closed.order, ['admission-closed', 'grants-revoked', 'unknown-quarantined']);
  assert.equal((await f.runner.resolveDownloadGrant({ grantDigest, owner })).code, 'CUSTODY_DENIED');
  const rows = f.store.snapshot();
  assert.equal(rows.cadArtifactDownloadGrants[0].revokedAt !== undefined, true);
  assert.equal(rows.cadArtifacts[0].state, 'quarantined');
  const restarted = f.restart();
  assert.equal((await restarted.preparePublicFixture()).code, 'ORCHESTRATION_QUARANTINED');
  assert.equal(f.state.bodyReads, 1);
});

test('owner and shop substitutions deny durable reads and fixture grants', async () => {
  const f = await setup();
  const admission = await f.runner.preparePublicFixture();
  const denied = await f.durable.call('reconcile', { kind: 'artifact', key: admission.artifactId,
    userId: 'other-user', shopId: 'other-shop', uploadSessionId: owner.uploadSessionId }, {});
  assert.equal(denied.code, 'RECONCILIATION_DENIED');
  assert.equal((await f.runner.resolveDownloadGrant({ grantDigest: digest('8'),
    owner: { ...owner, userId: 'other-user' } })).code, 'CUSTODY_DENIED');
});

test('private internal failures are sanitized and do not trigger retry, body read, or dispatch', async () => {
  const f = await setup({ failOperation: 'claimUpload' });
  const result = await f.runner.preparePublicFixture();
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC_SENTINEL'), false);
  assert.equal(f.state.bodyReads, 0);
  assert.equal(f.events.filter(event => event === 'claimUpload').length, 1);
  assert.equal(f.events.includes('provider-dispatch'), false);
  assert.equal(f.events.includes('conversion-dispatch'), false);
});

test('source remains public-fixture-only, internal, and absent from runtime imports', () => {
  const sourcePath = path.join(root, 'server/cadPhase5PublicFixtureQualificationRunner.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|https?\.request|issueCookieSession\s*\(|sandbox\.convert|putExact|readWithGrant/);
  assert.doesNotMatch(source, /process\.env|private[-_ ]cad|multipart|request\.body/i);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js']) {
    if (fs.existsSync(path.join(root, runtime))) {
      assert.equal(fs.readFileSync(path.join(root, runtime), 'utf8')
        .includes('cadPhase5PublicFixtureQualificationRunner'), false, runtime);
    }
  }
  assert.equal(PUBLIC_FIXTURE.public, true);
  assert.equal(PUBLIC_FIXTURE.sha256, hash(fs.readFileSync(fixturePath)));
  assert.equal(Object.isFrozen(PUBLIC_DERIVED_FIXTURE), true);
  assert.equal(Object.isFrozen(PUBLIC_DERIVED_FIXTURE.preview), true);
  assert.equal(Object.isFrozen(PUBLIC_DERIVED_FIXTURE.stl), true);
  assert.deepEqual(PUBLIC_DERIVED_FIXTURE.preview, {
    format: 'application/vnd.reversr.preview+json',
    byteCount: PUBLIC_PREVIEW_BYTES.length, sha256: hash(PUBLIC_PREVIEW_BYTES),
  });
  assert.deepEqual(PUBLIC_DERIVED_FIXTURE.stl, {
    format: 'model/stl', byteCount: PUBLIC_STL_BYTES.length, sha256: hash(PUBLIC_STL_BYTES),
  });
  assert.deepEqual(REQUIRED_DURABLE_OPERATIONS, ['claimUpload', 'advanceUpload', 'reserveArtifact',
    'consumeQuota', 'transitionArtifact', 'readArtifact', 'reconcile', 'claimConversion', 'advanceConversion',
    'issueDownloadGrant', 'resolveDownloadGrant', 'closeForRollback']);
});
