// Offline synthetic contract qualification only. No network, provider,
// credential, environment, deployment, request-body, or private CAD access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAXIMUM_COST_MICROS_EXCLUSIVE, PACKAGE8_EVIDENCE_BINDING,
  PACKAGE8_EXECUTION_INTENT, PACKAGE8_POLICY, PACKAGE8_SCOPE_KEY,
  PACKAGE8_SESSION_DIGEST, RESERVATION_MICROS,
  createCadPhase5Package8ExecutionController,
} = require('../server/cadPhase5Package8ExecutionController');
const {
  REQUIRED_DURABLE_OPERATIONS, createPackage8OfflineCustodyBridge,
  createPackage8OfflineDurableCustodyStore, createPackage8OfflineSandboxBridge,
} = require('../server/cadPhase5Package8SourceBridges');
const { createCadR2PrivateArtifactCustody }
  = require('../server/cadR2PrivateArtifactCustody');
const { SYNTHETIC_OWNER, createSyntheticPrivateIgesFixture }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const NOW = Date.parse('2026-10-10T19:20:30.000Z');
const WINDOW = Object.freeze({ schemaVersion: 1, idDigest: 'a'.repeat(64),
  startUtc: '2026-10-10T19:25:00.000Z', endUtc: '2026-10-10T19:35:00.000Z',
  activated: false });
const CLOSED = Object.freeze({ sourceOnly: true, liveReady: false, routeMounted: false,
  bodyAdmissionAuthorized: false, providerDispatchEnabled: false,
  conversionDispatchEnabled: false, downloadRouteEnabled: false });
const result = (accepted, code, extra = {}) => ({ ...CLOSED, accepted, code, ...extra });
const port = methods => Object.freeze({ sourceOnly: true, offlineSynthetic: true,
  configured: false, ...methods });

function setup(options = {}, shared = {}) {
  const events = [];
  const intents = shared.intents || new Set();
  const state = { claimed: false, closed: false, revoked: false, bodyReads: 0,
    artifacts: new Map(), tombstones: new Map(), grants: new Map(), objects: new Map(),
    quota: { 'class-a': 0, 'class-b': 0, delete: 0 }, sandboxAttempts: 0,
    sandboxActive: 0, cleanupBlocked: false };
  const event = (name, args) => events.push({ name, args });
  const ownerMatches = owner => ['userId', 'shopId', 'uploadSessionId']
    .every(key => owner?.[key] === SYNTHETIC_OWNER[key]);

  const durable = Object.freeze({ sourceOnly: true, offlineSynthetic: true,
    configured: false, operations: REQUIRED_DURABLE_OPERATIONS,
    async call(operation, args, { signal } = {}) {
      signal?.throwIfAborted?.();
      event(`durable:${operation}`, args);
      if (operation === 'claimUpload') {
        assert.deepEqual(Object.keys(args).sort(), ['attempt', 'policy', 'scopeKey']);
        assert.equal(args.scopeKey, PACKAGE8_SCOPE_KEY);
        assert.equal(args.attempt.reservationMicros, RESERVATION_MICROS);
        assert.deepEqual(args.policy, { maxAttempts: 1, maxConcurrent: 1,
          budgetMicros: RESERVATION_MICROS });
        if (options.claimTimeout) return new Promise(() => {});
        if (state.claimed || options.claimReplay) return result(false, 'UPLOAD_ATTEMPT_REPLAYED');
        state.claimed = true;
        return options.claimUnknown ? result(false, 'UPLOAD_ATTEMPT_UNKNOWN')
          : result(true, 'UPLOAD_ATTEMPT_CLAIMED', { status: 'claimed',
            attemptId: args.attempt.attemptId, fence: 1 });
      }
      if (operation === 'reserveArtifact') {
        if (!ownerMatches(args.owner) || options.quotaExceeded) {
          return result(false, 'QUOTA_EXHAUSTED');
        }
        state.artifacts.set(args.artifact.artifactId, { ...args.artifact });
        return result(true, 'ARTIFACT_RESERVED', { artifactId: args.artifact.artifactId,
          generation: args.artifact.generation });
      }
      if (operation === 'consumeQuota') {
        if (!ownerMatches(args.owner)) return result(false, 'QUOTA_DENIED');
        state.quota[args.operation] += args.count;
        return result(true, 'QUOTA_RESERVED', { operation: args.operation });
      }
      if (operation === 'readArtifact') {
        const artifact = state.artifacts.get(args.artifactId);
        if (!artifact || !ownerMatches(args.owner)) return result(false, 'ARTIFACT_DENIED');
        return result(true, 'ARTIFACT_PRESENT', { artifactId: artifact.artifactId,
          state: artifact.state, generation: artifact.generation,
          byteCount: artifact.byteCount, retainedUntil: artifact.retainedUntil });
      }
      if (operation === 'transitionArtifact') {
        const artifact = state.artifacts.get(args.artifactId);
        if (!artifact || !ownerMatches(args.owner)
          || artifact.generation !== args.expectedGeneration) {
          return result(false, 'ARTIFACT_DENIED');
        }
        artifact.state = args.transition;
        artifact.generation += 1;
        artifact.updatedAt = args.now;
        if (args.reasonDigest) artifact.quarantineReasonDigest = args.reasonDigest;
        return result(true, 'ARTIFACT_TRANSITIONED', { artifactId: artifact.artifactId,
          state: artifact.state, generation: artifact.generation });
      }
      if (operation === 'issueDownloadGrant') {
        const artifact = state.artifacts.get(args.artifactId);
        if (!artifact || artifact.state !== 'stored' || !ownerMatches(args.owner)
          || artifact.generation !== args.artifactGeneration) {
          return result(false, 'DOWNLOAD_GRANT_DENIED');
        }
        state.grants.set(args.grantDigest, { artifactId: args.artifactId,
          generation: args.artifactGeneration, revoked: false });
        return result(true, 'DOWNLOAD_GRANT_ISSUED');
      }
      if (operation === 'resolveDownloadGrant') {
        const grant = state.grants.get(args.grantDigest);
        if (!grant || grant.revoked || !ownerMatches(args.owner)) {
          return result(false, 'DOWNLOAD_GRANT_DENIED');
        }
        return result(true, 'DOWNLOAD_GRANT_RESOLVED', {
          artifactId: options.grantMismatch ? 'other-artifact' : grant.artifactId,
          generation: grant.generation });
      }
      if (operation === 'closeForRollback') {
        assert.deepEqual(Object.keys(args).sort(), ['now', 'reasonDigest', 'scopeKey',
          'shopId', 'uploadSessionId', 'userId']);
        assert.equal(Object.hasOwn(args, 'owner'), false);
        state.closed = true;
        for (const artifact of state.artifacts.values()) {
          if (artifact.state !== 'quarantined') {
            artifact.state = 'quarantined';
            artifact.generation += 1;
          }
        }
        for (const grant of state.grants.values()) grant.revoked = true;
        return result(true, 'ROLLBACK_CLOSED_FIRST', { admissionClosed: true,
          conversionClosed: true, grantsRevoked: true,
          uncertainRecordsQuarantined: true, generation: 1 });
      }
      if (operation === 'reconcile') {
        if (options.reconcileOwnerMismatch || args.userId !== SYNTHETIC_OWNER.userId
          || args.shopId !== SYNTHETIC_OWNER.shopId
          || args.uploadSessionId !== SYNTHETIC_OWNER.uploadSessionId) {
          return result(false, 'RECONCILIATION_DENIED');
        }
        if (args.kind === 'control') return state.closed
          ? result(true, 'RECONCILIATION_PRESENT', { state: 'closed', generation: 1,
            admissionClosed: true, conversionClosed: true, grantsRevoked: true,
            uncertainRecordsQuarantined: true })
          : result(false, 'RECONCILIATION_DENIED');
        if (args.kind === 'artifact') {
          const artifact = state.artifacts.get(args.key);
          return artifact ? result(true, 'RECONCILIATION_PRESENT', {
            artifactId: artifact.artifactId, state: artifact.state,
            generation: artifact.generation }) : result(false, 'RECONCILIATION_DENIED');
        }
        if (args.kind === 'tombstone') {
          const digest = state.tombstones.get(args.key);
          return digest ? result(true, 'RECONCILIATION_PRESENT', { state: 'deleted',
            artifactId: args.key, deleted: true, tombstoneDigest: digest, generation: 1 })
            : result(false, 'RECONCILIATION_DENIED');
        }
      }
      if (operation === 'confirmDeleted') {
        const artifact = state.artifacts.get(args.artifactId);
        if (!artifact || artifact.generation !== args.expectedGeneration
          || !ownerMatches(args.owner)) return result(false, 'DELETE_DENIED');
        state.artifacts.delete(args.artifactId);
        state.tombstones.set(args.artifactId, args.tombstoneDigest);
        return result(true, 'ARTIFACT_DELETED', { deleted: true,
          artifactId: args.artifactId, tombstoneDigest: args.tombstoneDigest });
      }
      return result(false, 'OPERATION_DENIED');
    },
  });

  const store = createPackage8OfflineDurableCustodyStore({ testOnly: true, durable,
    scopeKey: PACKAGE8_SCOPE_KEY, owner: SYNTHETIC_OWNER, now: () => NOW });
  const provider = Object.freeze({
    async putExact(input, { signal } = {}) {
      signal?.throwIfAborted?.(); event('provider:putExact', input);
      if (options.providerAckUnknown && input.contentType === 'model/iges') {
        return { committed: false };
      }
      state.objects.set(input.objectKey, Buffer.from(input.bytes));
      return { committed: true, byteCount: input.bytes.length, sha256: hash(input.bytes) };
    },
    async getExact(input, { signal } = {}) {
      signal?.throwIfAborted?.();
      const bytes = state.objects.get(input.objectKey);
      return bytes ? { bytes: Buffer.from(bytes) } : null;
    },
    async deleteExact(objectKey, { signal } = {}) {
      signal?.throwIfAborted?.(); event('provider:deleteExact', { objectKey });
      if (options.deleteUnknown) return false;
      state.objects.delete(objectKey); return true;
    },
    async headExact(objectKey, { signal } = {}) {
      signal?.throwIfAborted?.();
      return state.objects.has(objectKey) ? { present: true } : null;
    },
  });
  const custody = createPackage8OfflineCustodyBridge({ testOnly: true,
    custody: createCadR2PrivateArtifactCustody({ enabled: true, provider, store,
      now: () => NOW }) });
  const executor = Object.freeze({
    async convert(body, signal) {
      signal?.throwIfAborted?.(); event('sandbox:convert', { fileName: body.fileName });
      state.sandboxAttempts += 1; state.sandboxActive = 1;
      if (options.sandboxTimeout) return new Promise(() => {});
      state.sandboxActive = 0;
      if (options.sandboxUnknown) return { status: 'unknown' };
      if (options.cleanupUnknown) state.cleanupBlocked = true;
      return { status: 'ready', source: { sha256: hash(body.bytes) },
        meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }],
        execution: { cleanup: 'stopped' } };
    },
    activeCount() { return state.sandboxActive; },
    cleanupBlocked() { return state.cleanupBlocked; },
  });
  const sandbox = createPackage8OfflineSandboxBridge({ testOnly: true, executor });
  const authority = port({ async verifyExact(value, { signal } = {}) {
    signal?.throwIfAborted?.(); event('authority', value);
    assert.equal(value.sessionDigest, PACKAGE8_SESSION_DIGEST);
    assert.deepEqual(value.evidenceBinding, PACKAGE8_EVIDENCE_BINDING);
    return { authorized: true, ...SYNTHETIC_OWNER,
      ...(options.authorityMismatch ? { shopId: 'other-shop' } : {}),
      authorityGeneration: 7, expiresAt: Date.parse(WINDOW.endUtc) + 1,
      reservationMicros: options.reservationMicros ?? RESERVATION_MICROS,
      calculatedMaximumCostMicros: options.calculatedMaximumCostMicros ?? 7705,
      observedCostMicros: options.observedCostMicros ?? 0, windowActivated: false };
  } });
  const intentLedger = port({ async consumeOnce(value, { signal } = {}) {
    signal?.throwIfAborted?.(); event('intent', value);
    assert.equal(value.commitmentDigest, PACKAGE8_EXECUTION_INTENT.commitmentDigest);
    if (intents.has(value.commitmentDigest)) return { accepted: false,
      code: 'PACKAGE8_INTENT_REPLAYED', commitmentDigest: value.commitmentDigest };
    intents.add(value.commitmentDigest);
    return { accepted: true, code: 'PACKAGE8_INTENT_CONSUMED',
      commitmentDigest: value.commitmentDigest };
  } });
  const sessionRevoker = port({ async revokeExact(value, { signal } = {}) {
    signal?.throwIfAborted?.(); event('session:revokeExact', value); state.revoked = true;
    return { revoked: true, uploadSessionId: SYNTHETIC_OWNER.uploadSessionId };
  } });
  const fixtureReader = port({ async readExact(value, { signal } = {}) {
    signal?.throwIfAborted?.(); event('fixture:readExact', value); state.bodyReads += 1;
    const fixture = createSyntheticPrivateIgesFixture();
    if (!options.fixtureDrift) return fixture.bytes;
    const drift = Buffer.from(fixture.bytes); drift[0] ^= 1; return drift;
  } });
  const lifecycleMetadata = port({ async readSanitized(_value, { signal } = {}) {
    signal?.throwIfAborted?.(); event('lifecycle:readSanitized');
    const convex = { teamSlug: 'vambah-sillah', projectSlug: 'reversr-cad-auth-dev',
      deploymentName: 'majestic-alligator-31', identityVerified: true,
      sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
      quotaLedgerNamespace: PACKAGE8_SCOPE_KEY, stuckJobs: 0, uncertainRecords: 0 };
    return options.duplicateMetadata ? { convex: [convex, convex], r2: {}, sandbox: {} } : {
      convex,
      r2: { bucket: 'reversr-cad-package8-public-fixture-us', jurisdiction: 'US',
        storageClass: 'STANDARD', publicAccess: false, customDomains: 0,
        lifecycleDeleteAfterDays: 1, lifecycleStatus: 'ENABLED', objectCount: 0,
        byteCount: 0, classAOperations: state.quota['class-a'],
        classBOperations: state.quota['class-b'], deleteOperations: state.quota.delete,
        usageUnknown: false },
      sandbox: { runtime: 'node24', region: 'iad1', vcpus: 1, memoryMb: 2048,
        lifetimeMs: 60000, networkPolicy: 'deny-all', persistent: false,
        exposedPorts: 0, snapshotPresent: false, attempts: 1, retries: 0,
        status: 'stopped', terminal: true, cleanupConfirmed: true,
        outcomeUnknown: false },
    };
  } });
  const controllerOptions = { reviewOnly: true, authority, intentLedger, durable, custody,
    sandbox, sessionRevoker, fixtureReader, lifecycleMetadata, now: () => NOW,
    operationBudgetMs: options.operationBudgetMs ?? 25 };
  return { events, intents, state, controllerOptions,
    controller: createCadPhase5Package8ExecutionController(controllerOptions),
    restart: () => createCadPhase5Package8ExecutionController(controllerOptions) };
}

test('default is permanently disabled and has no runtime or provider authority', async () => {
  const controller = createCadPhase5Package8ExecutionController();
  assert.deepEqual([controller.configured, controller.reviewConfigured, controller.routeMounted,
    controller.providerDispatchEnabled, controller.conversionDispatchEnabled,
    controller.runtimeActivationAllowed, controller.productionBehaviorChanged],
  [false, false, false, false, false, false, false]);
  assert.equal((await controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_CONTROLLER_DISABLED');
});

test('policy remains one-file, one-attempt, zero-retry, inactive, and below nine dollars', () => {
  assert.equal(PACKAGE8_POLICY.maximumFiles, 1);
  assert.equal(PACKAGE8_POLICY.maximumAttempts, 1);
  assert.equal(PACKAGE8_POLICY.maximumRetries, 0);
  assert.equal(PACKAGE8_POLICY.maximumCostMicrosExclusive, 9_000_000);
  assert.ok(RESERVATION_MICROS < MAXIMUM_COST_MICROS_EXCLUSIVE);
  assert.equal(WINDOW.activated, false);
});

test('claimUpload and reserveArtifact precede fixture read; commit consumes quota', async () => {
  const f = setup();
  const value = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(value.ok, true, JSON.stringify({ value, events: f.events }));
  const index = name => f.events.findIndex(item => item.name === name);
  assert.ok(index('authority') < index('durable:claimUpload'));
  assert.ok(index('durable:claimUpload') < index('durable:reserveArtifact'));
  assert.ok(index('durable:reserveArtifact') < index('fixture:readExact'));
  assert.ok(index('fixture:readExact') < index('durable:consumeQuota'));
  assert.equal(f.state.bodyReads, 1);
  assert.equal(f.state.quota['class-a'], 2);
  assert.equal(value.sourceToDeploymentFunctionEquivalence, 'NOT_CLAIMED');
});

test('success binds both artifacts, closes first, revokes, deletes, and reconciles', async () => {
  const f = setup();
  const value = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(value.code, 'PACKAGE8_DEVELOPMENT_REVIEW_QUALIFIED_CLOSED');
  assert.equal(value.originalGrantQualified, true);
  assert.equal(value.stlGrantQualified, true);
  assert.equal(value.deletedArtifactCount, 2);
  assert.equal(f.state.artifacts.size, 0);
  assert.equal(f.state.tombstones.size, 2);
  assert.equal(f.state.revoked, true);
  const close = f.events.findIndex(item => item.name === 'durable:closeForRollback');
  assert.ok(close >= 0);
  assert.equal(f.events[close + 1].name, 'session:revokeExact');
  assert.equal(value.productionEvidenceDeploymentId,
    'dpl_99Gfdd69ZTCGKYpbFgLDzMiwQGd9');
  assert.equal(value.reconciliationPacketSha256,
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c');
});

test('provider uncertainty quarantines with no retry or Sandbox dispatch', async () => {
  const f = setup({ providerAckUnknown: true });
  assert.equal((await f.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(f.events.filter(item => item.name === 'provider:putExact').length, 1);
  assert.equal(f.events.filter(item => item.name === 'sandbox:convert').length, 0);
  assert.equal(f.events.filter(item => item.name === 'durable:closeForRollback').length, 1);
});

test('lost claim acknowledgement closes the flat exact scope before body read', async () => {
  const f = setup({ claimTimeout: true, operationBudgetMs: 5 });
  assert.equal((await f.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(f.state.bodyReads, 0);
  assert.equal(f.events.filter(item => item.name === 'durable:closeForRollback').length, 1);
});

test('Sandbox unknown, cleanup uncertainty, and timeout are fail-closed and zero-retry', async () => {
  for (const options of [{ sandboxUnknown: true }, { cleanupUnknown: true },
    { sandboxTimeout: true, operationBudgetMs: 5 }]) {
    const f = setup(options);
    assert.equal((await f.controller.reviewOneUse({ window: WINDOW })).code,
      'PACKAGE8_EXECUTION_QUARANTINED');
    assert.equal(f.state.sandboxAttempts, 1);
    assert.equal(f.events.filter(item => item.name === 'sandbox:convert').length, 1);
  }
});

test('cancellation, restart, replay, and concurrency stay consumed', async () => {
  const cancelled = setup();
  const control = new AbortController(); control.abort();
  assert.equal((await cancelled.controller.reviewOneUse({ window: WINDOW,
    signal: control.signal })).code, 'PACKAGE8_EXECUTION_UNAVAILABLE');
  const shared = { intents: new Set() };
  const a = setup({}, shared); const b = setup({}, shared);
  const values = await Promise.all([a.controller.reviewOneUse({ window: WINDOW }),
    b.controller.reviewOneUse({ window: WINDOW })]);
  assert.equal(values.filter(value => value.ok === true).length, 1);
  assert.equal(values.filter(value => value.code === 'PACKAGE8_ATTEMPT_CONSUMED').length, 1);
  assert.equal((await a.restart().reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');
});

test('owner, shop, grant, fixture, deletion, and metadata drift fail closed and sanitized', async () => {
  for (const options of [{ authorityMismatch: true }, { reconcileOwnerMismatch: true },
    { grantMismatch: true }, { fixtureDrift: true }, { deleteUnknown: true },
    { duplicateMetadata: true }]) {
    const f = setup(options);
    const value = await f.controller.reviewOneUse({ window: WINDOW });
    assert.equal(value.ok, false, JSON.stringify(options));
    assert.doesNotMatch(JSON.stringify(value), /phase5-synthetic-(?:user|shop|upload-session)|dg1\./);
  }
});

test('cost and quota limits stop before fixture bytes', async () => {
  for (const options of [{ calculatedMaximumCostMicros: 9_000_000 },
    { observedCostMicros: 9_000_000 }, { reservationMicros: 9_000_000 },
    { quotaExceeded: true }]) {
    const f = setup(options);
    assert.equal((await f.controller.reviewOneUse({ window: WINDOW })).ok, false);
    assert.equal(f.state.bodyReads, 0);
  }
});

test('invalid, active, expired, and overlong windows consume no intent', async () => {
  for (const window of [{ ...WINDOW, activated: true },
    { ...WINDOW, startUtc: '2026-10-10T19:10:00.000Z' },
    { ...WINDOW, endUtc: '2026-10-10T19:45:01.000Z' }]) {
    const f = setup();
    assert.equal((await f.controller.reviewOneUse({ window })).code, 'PACKAGE8_WINDOW_INVALID');
    assert.equal(f.intents.size, 0);
  }
});

test('bridges track exact reviewed durable, custody, Sandbox, and rollback contracts', () => {
  const durable = fs.readFileSync(path.join(root, 'convex/cadPhase5DurableAdapters.ts'), 'utf8');
  for (const operation of REQUIRED_DURABLE_OPERATIONS) {
    assert.match(durable, new RegExp(`export const ${operation}\\s*=`), operation);
  }
  assert.match(durable, /closeForRollback[^]*scopeKey: v\.string\(\), userId: v\.id\('users'\),[^]*shopId: v\.string\(\), uploadSessionId: v\.string\(\)/);
  const custody = fs.readFileSync(path.join(root, 'server/cadR2PrivateArtifactCustody.js'), 'utf8');
  assert.match(custody, /reserveArtifact\(identity, input, \{ signal \} = \{\}\)/);
  assert.match(custody, /commitArtifact\(identity, artifactId, bytes, \{ signal \} = \{\}\)/);
  assert.match(custody, /issueDownloadGrant\(identity, artifactId, \{ signal \} = \{\}\)/);
  assert.match(custody, /deleteArtifact\(identity, artifactId, \{ signal \} = \{\}\)/);
  const sandbox = fs.readFileSync(path.join(root, 'server/cadSandboxExecutor.js'), 'utf8');
  assert.match(sandbox, /async function convert\(body, signal\)/);
  assert.match(sandbox, /activeCount:\s*\(\)\s*=>\s*Number\(active\)/);
  assert.match(sandbox, /cleanupBlocked:\s*\(\)\s*=>\s*cleanupBlocked/);
  const controller = fs.readFileSync(path.join(root,
    'server/cadPhase5Package8ExecutionController.js'), 'utf8');
  assert.doesNotMatch(controller, /claimExecution|stopKnown/);
});

test('Package 8 files remain offline, internal, unrouted, and credential-free', () => {
  for (const name of ['server/cadPhase5Package8ExecutionController.js',
    'server/cadPhase5Package8SourceBridges.js']) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|child_process|request\.body/);
  }
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    const source = fs.readFileSync(path.join(root, runtime), 'utf8');
    assert.equal(source.includes('cadPhase5Package8ExecutionController'), false, runtime);
    assert.equal(source.includes('cadPhase5Package8SourceBridges'), false, runtime);
  }
});

module.exports = { NOW, WINDOW, setup };
