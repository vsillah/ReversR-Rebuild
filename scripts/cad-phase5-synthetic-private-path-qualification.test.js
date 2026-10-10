// Offline, project-owned synthetic bytes and metadata only. No provider,
// network, credentials, request body, storage, conversion, or runtime mount.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { inspectIgesSource } = require('../utils/igesAdmission');
const {
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
  SYNTHETIC_PRIVATE_PATH_POLICY,
  SYNTHETIC_OWNER,
  SYNTHETIC_SCOPE_KEY,
  SYNTHETIC_SESSION_DIGEST,
  SYNTHETIC_GRANT_DIGEST,
  SYNTHETIC_ATTEMPT_ID,
  SYNTHETIC_JOB_ID,
  SYNTHETIC_ARTIFACT_IDS,
  SYNTHETIC_QUALIFICATION_INTENT,
  REQUIRED_DURABLE_OPERATIONS,
  createSyntheticPrivateIgesFixture,
  createCadPhase5SyntheticPrivatePathQualification,
} = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = character => character.repeat(64);
const DERIVED_WARNING = 'Inspection geometry only - not validated for manufacturing.';

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
        return rows(table).filter(record => terms.every(([key, value]) => record[key] === value))
          .slice(0, limit);
      } };
    },
    async insert(table, value) {
      const id = `synthetic-${table}-${sequence++}`;
      rows(table).push({ _id: id, _creationTime: 1, ...structuredClone(value) });
      return id;
    },
    async patch(id, value) {
      const record = Object.values(tables).flat().find(candidate => candidate._id === id);
      if (!record) throw Error('SYNTHETIC_ROW_MISSING');
      Object.assign(record, structuredClone(value));
    },
    async delete(id) {
      for (const list of Object.values(tables)) {
        const index = list.findIndex(record => record._id === id);
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

function artifact({ artifactId, kind, byteCount, restrictedDigest, keyDigit }) {
  const originalId = SYNTHETIC_ARTIFACT_IDS[0];
  return { _id: `row-${artifactId}`, _creationTime: 1, schemaVersion: 1, artifactId,
    ...SYNTHETIC_OWNER, kind,
    format: kind === 'original-igs' ? 'model/iges'
      : kind === 'preview-geometry' ? 'application/vnd.reversr.preview+json' : 'model/stl',
    byteCount, restrictedDigest, providerObjectKey: `phase5/${keyDigit.repeat(64)}`,
    objectKeyDigest: digest(String(Number(keyDigit) + 3)), state: 'stored', createdAt: 500,
    retainedUntil: 500_000, generation: 2,
    ...(kind === 'original-igs' ? {} : { sourceArtifactId: originalId,
      sourceDigest: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256, geometryDigest: digest('9'),
      units: 'millimeter', warning: DERIVED_WARNING }),
  };
}

function seed() {
  const fixture = createSyntheticPrivateIgesFixture();
  const artifacts = [
    artifact({ artifactId: SYNTHETIC_ARTIFACT_IDS[0], kind: 'original-igs',
      byteCount: fixture.bytes.length, restrictedDigest: fixture.descriptor.sha256, keyDigit: '1' }),
    artifact({ artifactId: SYNTHETIC_ARTIFACT_IDS[1], kind: 'preview-geometry',
      byteCount: 35, restrictedDigest: digest('5'), keyDigit: '2' }),
    artifact({ artifactId: SYNTHETIC_ARTIFACT_IDS[2], kind: 'derived-stl',
      byteCount: 39, restrictedDigest: digest('6'), keyDigit: '3' }),
  ];
  const storedBytes = artifacts.reduce((total, value) => total + value.byteCount, 0);
  return {
    cadArtifacts: [...artifacts, artifact({ artifactId: 'other-owner-artifact', kind: 'original-igs',
      byteCount: 10, restrictedDigest: digest('7'), keyDigit: '4' })].map((value, index) => index === 3
      ? { ...value, userId: 'other-user', shopId: 'other-shop', uploadSessionId: 'other-session' }
      : value),
    cadArtifactQuotaLedgers: [{ _id: 'ledger', _creationTime: 1,
      scopeKey: SYNTHETIC_SCOPE_KEY, userId: SYNTHETIC_OWNER.userId, shopId: SYNTHETIC_OWNER.shopId,
      storedBytes, objectCount: 3, classAOperations: 3, classBOperations: 1,
      deleteOperations: 0, revision: 1, stopped: false, updatedAt: 500 }],
    cadArtifactDownloadGrants: [
      { _id: 'grant', _creationTime: 1, grantDigest: SYNTHETIC_GRANT_DIGEST,
        artifactId: SYNTHETIC_ARTIFACT_IDS[0], ...SYNTHETIC_OWNER,
        artifactGeneration: 2, issuedAt: 600, expiresAt: 500_000 },
      { _id: 'other-session-grant', _creationTime: 1, grantDigest: digest('c'),
        artifactId: 'other-session-artifact', userId: SYNTHETIC_OWNER.userId,
        shopId: SYNTHETIC_OWNER.shopId, uploadSessionId: 'other-session',
        artifactGeneration: 1, issuedAt: 600, expiresAt: 500_000 },
    ],
    cadUploadOrchestrationAttempts: [{ _id: 'attempt', _creationTime: 1,
      idempotencyDigest: digest('d'), attemptId: SYNTHETIC_ATTEMPT_ID, ...SYNTHETIC_OWNER,
      authorityGeneration: 1, deploymentRef: 'source-only-no-deployment',
      cohortRef: 'synthetic-private-path', evidenceDigest: digest('e'),
      retentionPolicyDigest: digest('f'), reservationMicros: 1, maxRetries: 0,
      fence: 1, createdAt: 500, expiresAt: 500_000, state: 'admitted',
      bodyByteCount: fixture.bytes.length, restrictedDigest: fixture.descriptor.sha256,
      artifactId: SYNTHETIC_ARTIFACT_IDS[0], jobId: SYNTHETIC_JOB_ID }],
    cadUploadJobs: [{ _id: 'job', _creationTime: 1, jobId: SYNTHETIC_JOB_ID,
      attemptId: SYNTHETIC_ATTEMPT_ID, artifactId: SYNTHETIC_ARTIFACT_IDS[0],
      ...SYNTHETIC_OWNER, originalRestrictedDigest: fixture.descriptor.sha256,
      state: 'converting', conversionAuthorized: true, conversionDispatchCount: 0,
      conversionClaimCount: 1, conversionGeneration: 2, createdAt: 500, updatedAt: 600 }],
  };
}

function durablePort(store, events, { failOperation } = {}) {
  const mutations = new Set(['closeForRollback', 'transitionArtifact', 'confirmDeleted']);
  const candidates = {
    closeForRollback: adapter.closeForRollbackCandidate,
    reconcile: adapter.reconcileCandidate,
    transitionArtifact: adapter.transitionArtifactCandidate,
    confirmDeleted: adapter.confirmDeletedCandidate,
    resolveDownloadGrant: adapter.resolveGrantCandidate,
  };
  return Object.freeze({ operations: REQUIRED_DURABLE_OPERATIONS,
    async call(operation, args, { signal } = {}) {
      signal?.throwIfAborted?.();
      events.push({ operation, mutation: mutations.has(operation), domain: 'application' });
      if (operation === failOperation) throw Error('PRIVATE_SYNTHETIC_SENTINEL');
      const candidate = candidates[operation];
      if (!candidate) throw Error('UNKNOWN_DURABLE_OPERATION');
      return mutations.has(operation)
        ? store.transaction(db => candidate(db, args)) : candidate(store.db, args);
    } });
}

function setup({ failOperation, sessionFailure = false } = {}) {
  const store = syntheticDb(seed());
  const events = [];
  const durable = durablePort(store, events, { failOperation });
  let time = 1000;
  const revoked = new Set();
  const intents = new Set();
  const intentLedger = Object.freeze({ async consumeOnce(value, { signal } = {}) {
    signal?.throwIfAborted?.();
    assert.deepEqual(value, SYNTHETIC_QUALIFICATION_INTENT);
    const replayed = intents.has(value.commitmentDigest);
    events.push({ operation: 'consumeQualificationIntent', mutation: !replayed,
      domain: 'qualification-intent' });
    if (replayed) return { accepted: false, code: 'QUALIFICATION_INTENT_REPLAYED',
      commitmentDigest: value.commitmentDigest };
    intents.add(value.commitmentDigest);
    return { accepted: true, code: 'QUALIFICATION_INTENT_CONSUMED',
      commitmentDigest: value.commitmentDigest };
  } });
  const sessionRevoker = Object.freeze({ async revokeExact(value) {
    events.push({ operation: 'revokeExactSession', mutation: true, domain: 'session', value });
    if (sessionFailure) throw Error('PRIVATE_SESSION_SENTINEL');
    assert.equal(value.sessionDigest, SYNTHETIC_SESSION_DIGEST);
    assert.equal(value.uploadSessionId, SYNTHETIC_OWNER.uploadSessionId);
    assert.deepEqual(value.owner, SYNTHETIC_OWNER);
    revoked.add(value.uploadSessionId);
    return { revoked: true, uploadSessionId: value.uploadSessionId };
  } });
  const options = { enabled: true, durable, sessionRevoker, intentLedger, now: () => time++ };
  return { store, events, revoked, intents, options,
    runner: createCadPhase5SyntheticPrivatePathQualification(options),
    restart: () => createCadPhase5SyntheticPrivatePathQualification(options) };
}

test('default remains inert and exposes no route, issuer, body, provider, conversion, download, or Package 8 authority', async () => {
  const runner = createCadPhase5SyntheticPrivatePathQualification({
    durable: new Proxy({}, { get() { throw Error('DURABLE_READ'); } }),
    sessionRevoker: new Proxy({}, { get() { throw Error('SESSION_READ'); } }),
  });
  assert.equal(runner.configured, false);
  assert.equal(runner.reviewConfigured, false);
  assert.deepEqual([runner.routeMounted, runner.sessionIssuanceEnabled,
    runner.bodyAdmissionAuthorized, runner.storageDispatchEnabled,
    runner.conversionDispatchEnabled, runner.downloadRouteEnabled,
    runner.providerDispatchEnabled, runner.package8Authorized],
  [false, false, false, false, false, false, false, false]);
  assert.deepEqual(await runner.qualify(), {
    ok: false, code: 'SYNTHETIC_PRIVATE_PATH_UNAVAILABLE',
  });
});

test('project-owned fixture is deterministic, exact, private-path classified, nonproprietary, and accepted offline', () => {
  const first = createSyntheticPrivateIgesFixture();
  const second = createSyntheticPrivateIgesFixture();
  assert.notEqual(first.bytes, second.bytes);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.bytes.length, SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount);
  assert.equal(hash(first.bytes), SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256);
  assert.equal(inspectIgesSource({ fileName: first.descriptor.fileName, bytes: first.bytes }).ok, true);
  assert.equal(first.descriptor.classification, 'RESTRICTED_SYNTHETIC_TEST');
  assert.equal(first.descriptor.owner, 'ReversR test project');
  assert.equal(first.descriptor.projectOwned, true);
  assert.equal(first.descriptor.nonproprietary, true);
  assert.equal(first.descriptor.customerData, false);
  assert.equal(first.descriptor.privatePathOnly, true);
  assert.equal(first.descriptor.publicDistributionAuthorized, false);
  assert.equal(Object.isFrozen(SYNTHETIC_PRIVATE_IGES_FIXTURE), true);
  assert.deepEqual(Object.keys(SYNTHETIC_QUALIFICATION_INTENT), ['schemaVersion', 'runDigest',
    'protocolDigest', 'targetDigest', 'ownerDigest', 'commitmentDigest']);
  for (const key of ['runDigest', 'protocolDigest', 'targetDigest', 'ownerDigest',
    'commitmentDigest']) assert.match(SYNTHETIC_QUALIFICATION_INTENT[key], /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(SYNTHETIC_QUALIFICATION_INTENT),
    /phase5-synthetic-(?:user|shop|upload-session)/);
  assert.deepEqual(SYNTHETIC_PRIVATE_PATH_POLICY, {
    schemaVersion: 1, maxSessions: 1, maxFiles: 1, maxAttempts: 1, maxRetries: 0,
    budgetMicros: 9_000_000, currency: 'USD', routeMounted: false,
    sessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    storageDispatchEnabled: false, conversionDispatchEnabled: false,
    downloadRouteEnabled: false, package8Authorized: false,
  });
});

test('fixture drift and descriptor widening fail before durable or session mutation', async () => {
  const cases = [];
  const fixture = createSyntheticPrivateIgesFixture();
  const changed = Buffer.from(fixture.bytes); changed[0] ^= 1;
  cases.push({ descriptor: fixture.descriptor, bytes: changed });
  cases.push({ descriptor: fixture.descriptor, bytes: fixture.bytes.subarray(0, fixture.bytes.length - 1) });
  cases.push({ descriptor: { ...fixture.descriptor, sha256: digest('0') }, bytes: fixture.bytes });
  cases.push({ descriptor: { ...fixture.descriptor, public: true }, bytes: fixture.bytes });
  cases.push({ descriptor: { ...fixture.descriptor, proprietary: true }, bytes: fixture.bytes });
  for (const value of cases) {
    const f = setup();
    assert.deepEqual(await f.runner.qualify(value), {
      ok: false, code: 'SYNTHETIC_PRIVATE_FIXTURE_INVALID',
    });
    assert.equal(f.events.filter(event => event.domain === 'application'
      || event.domain === 'session').length, 0);
    assert.equal(f.intents.size, 1);
    assert.equal(f.revoked.size, 0);
  }
});

test('qualification closes first, revokes the exact session and grants, quarantines ambiguity, reconciles read-only, and deletes fixture artifacts', async () => {
  const f = setup();
  const fixture = createSyntheticPrivateIgesFixture();
  const result = await f.runner.qualify(fixture);
  assert.equal(result.ok, true, JSON.stringify({ result, events: f.events }));
  assert.deepEqual(result, { ok: true, code: 'SYNTHETIC_PRIVATE_PATH_CONTROL_QUALIFIED',
    sourceOnly: true, classification: 'RESTRICTED_SYNTHETIC_TEST', sessionCount: 1,
    fileCount: 1, attemptCount: 1, maxRetries: 0, budgetMicros: 9_000_000,
    admissionClosed: true, conversionClosed: true, sessionRevoked: true,
    grantsRevoked: true, uncertainRecordsQuarantined: true, deletedArtifactCount: 3,
    readOnlyReconciliationConfirmed: true, providerDispatchEnabled: false,
    conversionDispatchEnabled: false, package8Authorized: false });
  assert.equal(f.events[0].operation, 'consumeQualificationIntent');
  assert.equal(f.intents.size, 1);
  const firstMutation = f.events.find(event => event.mutation && event.domain === 'application');
  assert.equal(firstMutation.operation, 'closeForRollback');
  assert.equal(f.revoked.has(SYNTHETIC_OWNER.uploadSessionId), true);
  assert.equal(f.events.filter(event => event.operation === 'closeForRollback').length, 1);
  assert.equal(f.events.some(event => event.operation === 'providerDispatch'), false);
  assert.equal(f.events.some(event => event.operation === 'conversionDispatch'), false);
  const rows = f.store.snapshot();
  assert.equal(rows.cadArtifacts.some(value => SYNTHETIC_ARTIFACT_IDS.includes(value.artifactId)), false);
  assert.equal(rows.cadArtifacts.find(value => value.artifactId === 'other-owner-artifact').state, 'stored');
  assert.equal(rows.cadArtifactTombstones.length, 3);
  assert.equal(rows.cadArtifactDownloadGrants.find(value => value.grantDigest === SYNTHETIC_GRANT_DIGEST)
    .revokedAt !== undefined, true);
  assert.equal(rows.cadArtifactDownloadGrants.find(value => value.grantDigest === digest('c'))
    .revokedAt, undefined);
  assert.equal(rows.cadUploadOrchestrationAttempts[0].state, 'quarantined');
  assert.equal(rows.cadUploadJobs[0].state, 'quarantined');
  assert.equal(rows.cadPhase5ControlState[0].admissionClosed, true);
  assert.equal(rows.cadPhase5ControlState[0].conversionClosed, true);
  assert.equal(rows.cadArtifactQuotaLedgers[0].storedBytes, 0);
  assert.equal(rows.cadArtifactQuotaLedgers[0].objectCount, 0);
  const eventCount = f.events.length;
  assert.deepEqual(await f.runner.qualify(fixture), {
    ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED',
  });
  assert.equal(f.events.length, eventCount);
});

test('independent intent consumption refuses duplicate use and process restart before adapter activity', async () => {
  const f = setup();
  const fixture = createSyntheticPrivateIgesFixture();
  assert.equal((await f.runner.qualify(fixture)).ok, true);
  const applicationMutationsBefore = f.events.filter(event => event.mutation
    && (event.domain === 'application' || event.domain === 'session')).length;
  const durableCallsBefore = f.events.filter(event => event.domain === 'application').length;
  const restarted = f.restart();
  assert.deepEqual(await restarted.qualify(fixture), {
    ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED',
  });
  assert.equal(f.events.filter(event => event.mutation
    && (event.domain === 'application' || event.domain === 'session')).length,
  applicationMutationsBefore);
  assert.equal(f.events.filter(event => event.domain === 'application').length, durableCallsBefore);
  assert.equal(f.events.at(-1).operation, 'consumeQualificationIntent');
  assert.equal(f.events.at(-1).mutation, false);
});

test('restart after initial reconciliation failure is fenced before a second adapter or session call', async () => {
  const f = setup({ failOperation: 'reconcile' });
  const fixture = createSyntheticPrivateIgesFixture();
  assert.deepEqual(await f.runner.qualify(fixture), {
    ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ROLLBACK_UNKNOWN',
  });
  assert.equal(f.intents.size, 1);
  assert.equal(f.events.filter(event => event.domain === 'application').length, 1);
  assert.equal(f.events.filter(event => event.operation === 'reconcile').length, 1);
  assert.equal(f.events.filter(event => event.operation === 'closeForRollback').length, 0);
  assert.equal(f.events.filter(event => event.domain === 'session').length, 0);
  const restarted = f.restart();
  assert.deepEqual(await restarted.qualify(fixture), {
    ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED',
  });
  assert.equal(f.events.filter(event => event.domain === 'application').length, 1);
  assert.equal(f.events.filter(event => event.operation === 'reconcile').length, 1);
  assert.equal(f.events.filter(event => event.operation === 'closeForRollback').length, 0);
  assert.equal(f.events.filter(event => event.domain === 'session').length, 0);
  assert.equal(f.events.at(-1).operation, 'consumeQualificationIntent');
  assert.equal(f.events.at(-1).mutation, false);
});

test('rollback, session, and deletion ambiguity stop without retry or leaked detail', async () => {
  for (const options of [
    { failOperation: 'closeForRollback' },
    { sessionFailure: true },
    { failOperation: 'confirmDeleted' },
  ]) {
    const f = setup(options);
    const fixture = createSyntheticPrivateIgesFixture();
    const result = await f.runner.qualify(fixture);
    assert.deepEqual(result, { ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ROLLBACK_UNKNOWN' });
    assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC_SENTINEL'), false);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SESSION_SENTINEL'), false);
    const counts = Object.fromEntries(f.events.map(event => [event.operation,
      f.events.filter(value => value.operation === event.operation).length]));
    assert.deepEqual(await f.runner.qualify(fixture), {
      ok: false, code: 'SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED',
    });
    for (const [operation, count] of Object.entries(counts)) {
      assert.equal(f.events.filter(value => value.operation === operation).length, count);
    }
  }
});

test('source remains internal, unrouted, offline, and isolated from public-fixture semantics', () => {
  const sourcePath = path.join(root, 'server/cadPhase5SyntheticPrivatePathQualification.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|https?\.request|issueCookieSession\s*\(|sandbox\.convert|putExact|readWithGrant/);
  assert.doesNotMatch(source, /process\.env|request\.body|cadPhase5PublicFixtureQualificationRunner/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js']) {
    if (fs.existsSync(path.join(root, runtime))) {
      assert.equal(fs.readFileSync(path.join(root, runtime), 'utf8')
        .includes('cadPhase5SyntheticPrivatePathQualification'), false, runtime);
    }
  }
  assert.deepEqual(REQUIRED_DURABLE_OPERATIONS, ['closeForRollback', 'reconcile',
    'transitionArtifact', 'confirmDeleted', 'resolveDownloadGrant']);
});
