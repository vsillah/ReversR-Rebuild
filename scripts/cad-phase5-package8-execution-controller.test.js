// Offline synthetic ports only. No network, provider, credential, environment,
// deployment, request-body, private CAD, or production access occurs here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAXIMUM_COST_MICROS_EXCLUSIVE,
  PACKAGE8_EVIDENCE_BINDING,
  PACKAGE8_EXECUTION_INTENT,
  PACKAGE8_POLICY,
  PACKAGE8_SCOPE_KEY,
  PACKAGE8_SESSION_DIGEST,
  RESERVATION_MICROS,
  createCadPhase5Package8ExecutionController,
} = require('../server/cadPhase5Package8ExecutionController');
const {
  SYNTHETIC_OWNER,
  createSyntheticPrivateIgesFixture,
} = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const NOW = Date.parse('2026-10-10T19:20:30.000Z');
const WINDOW = Object.freeze({
  schemaVersion: 1,
  idDigest: 'a'.repeat(64),
  startUtc: '2026-10-10T19:25:00.000Z',
  endUtc: '2026-10-10T19:35:00.000Z',
  activated: false,
});
const STL_BYTES = Buffer.from('solid package8_fixture\nendsolid package8_fixture\n');
const clone = value => structuredClone(value);

function setup(options = {}, shared = {}) {
  const events = [];
  const intents = shared.intents || new Set();
  const state = {
    claimed: false,
    closed: false,
    revoked: false,
    bodyReads: 0,
    sandboxAttempts: 0,
    sandboxStopped: false,
    artifacts: new Map(),
    tombstones: new Map(),
    grants: new Map(),
  };
  const event = (name, details = {}) => events.push({ name, ...details });
  const port = methods => Object.freeze({ offlineSynthetic: true, ...methods });

  const intentLedger = port({
    async consumeOnce(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('intent');
      assert.equal(value.commitmentDigest, PACKAGE8_EXECUTION_INTENT.commitmentDigest);
      assert.equal(value.windowDigest, WINDOW.idDigest);
      if (intents.has(value.commitmentDigest)) return { accepted: false,
        code: 'PACKAGE8_INTENT_REPLAYED', commitmentDigest: value.commitmentDigest };
      intents.add(value.commitmentDigest);
      return { accepted: true, code: 'PACKAGE8_INTENT_CONSUMED',
        commitmentDigest: value.commitmentDigest };
    },
  });
  const authority = port({
    async verifyExact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('authority');
      assert.deepEqual(value.owner, SYNTHETIC_OWNER);
      assert.equal(value.sessionDigest, PACKAGE8_SESSION_DIGEST);
      assert.deepEqual(value.evidenceBinding, PACKAGE8_EVIDENCE_BINDING);
      assert.equal(value.reservationMicros, RESERVATION_MICROS);
      return { authorized: true, ...SYNTHETIC_OWNER,
        ...(options.authorityMismatch ? { shopId: 'other-shop' } : {}),
        authorityGeneration: 7, expiresAt: Date.parse(WINDOW.endUtc) + 1,
        reservationMicros: options.reservationMicros ?? RESERVATION_MICROS,
        calculatedMaximumCostMicros: options.calculatedMaximumCostMicros ?? 7705,
        observedCostMicros: options.observedCostMicros ?? 0,
        windowActivated: false };
    },
  });
  const durable = port({
    async claimExecution(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('claim');
      if (options.claimTimeout) return new Promise(() => {});
      if (state.claimed || options.claimReplay) return { accepted: false, code: 'CLAIM_REPLAYED' };
      state.claimed = true;
      if (options.claimUnknown) return { accepted: false, code: 'CLAIM_UNKNOWN' };
      return { accepted: true, code: 'PACKAGE8_EXECUTION_CLAIMED',
        claimId: 'package8-claim', fence: 1, reservationMicros: value.reservationMicros,
        maximumAttempts: value.maximumAttempts, maximumRetries: value.maximumRetries,
        ...SYNTHETIC_OWNER };
    },
    async closeForRollback(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('close');
      state.closed = true;
      for (const artifact of state.artifacts.values()) artifact.state = 'quarantined';
      for (const grant of state.grants.values()) grant.revoked = true;
      return { accepted: true, admissionClosed: true, conversionClosed: true,
        grantsRevoked: true, uncertainRecordsQuarantined: true,
        order: ['admission-closed', 'conversion-closed', 'grants-revoked',
          'unknown-quarantined'] };
    },
    async reconcile(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event(`reconcile:${value.kind}`);
      if (value.kind === 'control') return state.closed
        ? { accepted: true, state: 'closed', admissionClosed: true,
          conversionClosed: true, grantsRevoked: true,
          uncertainRecordsQuarantined: true }
        : { accepted: false, code: 'RECONCILIATION_DENIED' };
      if (value.kind === 'artifact') {
        const artifact = state.artifacts.get(value.key);
        if (!artifact) return { accepted: false, code: 'RECONCILIATION_DENIED' };
        return { accepted: true, artifactId: value.key, ...artifact,
          ...(options.reconcileOwnerMismatch ? { shopId: 'other-shop' } : {}) };
      }
      if (value.kind === 'tombstone') {
        const tombstoneDigest = state.tombstones.get(value.key);
        return tombstoneDigest ? { accepted: true, deleted: true,
          artifactId: value.key, tombstoneDigest } : { accepted: false };
      }
      return { accepted: false, code: 'RECONCILIATION_DENIED' };
    },
    async resolveDownloadGrant(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('resolve-grant');
      const grant = state.grants.get(value.grantDigest);
      if (!grant || grant.revoked) return { accepted: false, code: 'CUSTODY_DENIED' };
      return { accepted: true, artifactId: options.grantMismatch
        ? 'other-artifact' : grant.artifactId, ...SYNTHETIC_OWNER };
    },
    async readLifecycleMetadata(_value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('metadata:convex');
      const metadata = { teamSlug: 'vambah-sillah', projectSlug: 'reversr-cad-auth-dev',
        deploymentName: 'majestic-alligator-31', identityVerified: true,
        sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
        quotaLedgerNamespace: PACKAGE8_SCOPE_KEY, stuckJobs: 0, uncertainRecords: 0 };
      return options.duplicateMetadata ? [metadata, clone(metadata)] : metadata;
    },
  });

  let artifactSequence = 0;
  const custody = port({
    async reserveArtifact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('quota-reserve', { kind: value.input.kind });
      if (options.quotaExceeded) return { ok: false, code: 'CUSTODY_QUOTA_EXHAUSTED' };
      const artifactId = value.input.kind === 'original-igs'
        ? 'package8-original' : `package8-stl-${++artifactSequence}`;
      state.artifacts.set(artifactId, { ...SYNTHETIC_OWNER, ...clone(value.input),
        artifactId, state: 'reserved' });
      return { ok: true, code: 'ARTIFACT_RESERVED', artifactId };
    },
    async commitArtifact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      const artifact = state.artifacts.get(value.artifactId);
      event('provider-commit', { kind: artifact?.kind });
      if (!artifact) return { ok: false, code: 'CUSTODY_DENIED' };
      if (options.providerAckUnknown === artifact.kind) {
        return { ok: false, code: 'CUSTODY_UNKNOWN' };
      }
      assert.equal(value.bytes.length, artifact.byteCount);
      assert.equal(hash(value.bytes), artifact.restrictedDigest);
      artifact.state = 'stored';
      return { ok: true, code: 'ARTIFACT_STORED', artifactId: value.artifactId };
    },
    async issueDownloadGrant(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('grant', { artifactId: value.artifactId });
      const token = `dg1.${value.artifactId.includes('original') ? 'A' : 'B'}`.padEnd(47,
        value.artifactId.includes('original') ? 'A' : 'B');
      state.grants.set(hash(token), { artifactId: value.artifactId, revoked: false });
      return { ok: true, code: 'DOWNLOAD_GRANT_ISSUED', token };
    },
    async deleteArtifact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('provider-delete', { artifactId: value.artifactId });
      const artifact = state.artifacts.get(value.artifactId);
      if (!artifact || !state.closed || artifact.state !== 'quarantined'
        || !Object.entries(SYNTHETIC_OWNER).every(([key, expected]) => artifact[key] === expected)) {
        return { ok: false, code: 'CUSTODY_DENIED' };
      }
      if (options.deleteUnknown === value.artifactId) return { ok: false, code: 'CUSTODY_UNKNOWN' };
      const tombstoneDigest = hash(`deleted:${value.artifactId}`);
      state.artifacts.delete(value.artifactId);
      state.tombstones.set(value.artifactId, tombstoneDigest);
      return { ok: true, code: 'ARTIFACT_DELETED', artifactId: value.artifactId,
        tombstoneDigest };
    },
    async readLifecycleMetadata(_value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('metadata:r2');
      return { bucket: 'reversr-cad-package8-public-fixture-us', jurisdiction: 'US',
        storageClass: 'STANDARD', publicAccess: false, customDomains: 0,
        lifecycleDeleteAfterDays: 1, lifecycleStatus: 'ENABLED',
        objectCount: state.artifacts.size, byteCount: [...state.artifacts.values()]
          .reduce((total, value) => total + value.byteCount, 0),
        classAOperations: 4, classBOperations: 4,
        deleteOperations: state.tombstones.size, usageUnknown: false };
    },
  });
  const sandbox = port({
    async convert(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('sandbox-convert');
      state.sandboxAttempts += 1;
      if (options.sandboxTimeout) return new Promise(() => {});
      if (options.sandboxUnknown) return { status: 'unknown', outcomeUnknown: true };
      return { status: 'ready', sourceSha256: hash(value.bytes),
        stlBytes: Buffer.from(STL_BYTES), geometryDigest: '9'.repeat(64),
        cleanupConfirmed: true, outcomeUnknown: false, attempts: 1, retries: 0 };
    },
    async stopKnown(_value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('sandbox-stop');
      state.sandboxStopped = true;
      return options.cleanupUnknown
        ? { stopped: false, cleanupConfirmed: false, outcomeUnknown: true }
        : { stopped: true, cleanupConfirmed: true, outcomeUnknown: false };
    },
    async readLifecycleMetadata(_value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('metadata:sandbox');
      return { runtime: 'node24', region: 'iad1', vcpus: 1, memoryMb: 2048,
        lifetimeMs: 60000, networkPolicy: 'deny-all', persistent: false,
        exposedPorts: 0, snapshotPresent: false, attempts: 1, retries: 0,
        status: 'stopped', terminal: true, cleanupConfirmed: true,
        outcomeUnknown: false };
    },
  });
  const sessionRevoker = port({
    async revokeExact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('revoke-session');
      assert.equal(value.sessionDigest, PACKAGE8_SESSION_DIGEST);
      assert.deepEqual(value.owner, SYNTHETIC_OWNER);
      state.revoked = true;
      return { revoked: true, uploadSessionId: SYNTHETIC_OWNER.uploadSessionId };
    },
  });
  const fixtureReader = port({
    async readExact(value, { signal } = {}) {
      signal?.throwIfAborted?.();
      event('fixture-read');
      state.bodyReads += 1;
      assert.equal(value.descriptor.id, 'reversr-phase5-synthetic-private-line-v1');
      const fixture = createSyntheticPrivateIgesFixture();
      if (!options.fixtureDrift) return fixture.bytes;
      const drifted = Buffer.from(fixture.bytes);
      drifted[0] ^= 1;
      return drifted;
    },
  });
  const controllerOptions = { reviewOnly: true, authority, intentLedger, durable, custody,
    sandbox, sessionRevoker, fixtureReader, now: () => NOW,
    operationBudgetMs: options.operationBudgetMs ?? 25 };
  return { events, intents, state, controllerOptions,
    controller: createCadPhase5Package8ExecutionController(controllerOptions),
    restart: () => createCadPhase5Package8ExecutionController(controllerOptions) };
}

test('default stays permanently disabled with no route, body, provider, runtime, or production authority', async () => {
  const controller = createCadPhase5Package8ExecutionController();
  assert.equal(controller.configured, false);
  assert.equal(controller.reviewConfigured, false);
  assert.deepEqual([controller.routeMounted, controller.sessionIssuanceEnabled,
    controller.requestBodyAdmissionAuthorized, controller.providerDispatchEnabled,
    controller.conversionDispatchEnabled, controller.runtimeActivationAllowed,
    controller.productionBehaviorChanged], [false, false, false, false, false, false, false]);
  assert.deepEqual(await controller.reviewOneUse({ window: WINDOW }), {
    ok: false, code: 'PACKAGE8_CONTROLLER_DISABLED', sourceOnly: true,
    developmentOnly: true, maxRetries: 0, providerRequests: 0 });
});

test('policy is one-session, one-file, one-attempt, zero-retry, inactive-window, and strictly below nine dollars', () => {
  assert.deepEqual(PACKAGE8_POLICY, {
    schemaVersion: 1, developmentOnly: true, maximumSessions: 1, maximumFiles: 1,
    maximumAttempts: 1, maximumRetries: 0, maximumWindowMs: 900000,
    maximumCostMicrosExclusive: 9000000, reservationMicros: 8999999, currency: 'USD',
    routeMounted: false, sessionIssuanceEnabled: false,
    requestBodyAdmissionAuthorized: false, providerDispatchEnabled: false,
    runtimeActivationAllowed: false, productionBehaviorChanged: false });
  assert.ok(RESERVATION_MICROS < MAXIMUM_COST_MICROS_EXCLUSIVE);
  assert.equal(WINDOW.activated, false);
  assert.ok(Date.parse(WINDOW.startUtc) > NOW);
  assert.ok(Date.parse(WINDOW.endUtc) - Date.parse(WINDOW.startUtc) <= 15 * 60_000);
});

test('authority, durable claim, and quota reservation all precede the one fixture read', async () => {
  const f = setup();
  const result = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(result.ok, true, JSON.stringify({ result, events: f.events }));
  const index = name => f.events.findIndex(value => value.name === name);
  assert.ok(index('authority') < index('claim'));
  assert.ok(index('claim') < index('quota-reserve'));
  assert.ok(index('quota-reserve') < index('fixture-read'));
  assert.equal(f.state.bodyReads, 1);
  assert.equal(f.state.sandboxAttempts, 1);
  assert.equal(f.events.filter(value => value.name === 'sandbox-convert').length, 1);
  assert.equal(result.sourceToDeploymentFunctionEquivalence, 'NOT_CLAIMED');
  assert.equal(result.productionEvidenceDeploymentId,
    'dpl_9x1ENTXP4qefJKdMQaHKD1CXRjaj');
  assert.equal(result.reconciliationPacketSha256,
    'ebebc571d8ee1756ebb408b6612662a1f0d748627a14f6bea66695a11d89966c');
  assert.equal(result.providerRequests, 0);
});

test('success binds original and STL grants, closes first, revokes, reconciles, and deletes exact owned artifacts', async () => {
  const f = setup();
  const result = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(result.code, 'PACKAGE8_DEVELOPMENT_REVIEW_QUALIFIED_CLOSED');
  assert.equal(result.originalGrantQualified, true);
  assert.equal(result.stlGrantQualified, true);
  assert.equal(result.deletedArtifactCount, 2);
  assert.equal(result.admissionClosed, true);
  assert.equal(result.conversionClosed, true);
  assert.equal(result.sessionRevoked, true);
  assert.equal(result.grantsRevoked, true);
  assert.equal(result.uncertainRecordsQuarantined, true);
  assert.deepEqual(result.lifecycleStopCodes, ['WINDOW_INVALID_OR_INACTIVE']);
  assert.equal(f.state.artifacts.size, 0);
  assert.equal(f.state.tombstones.size, 2);
  const close = f.events.findIndex(value => value.name === 'close');
  assert.ok(close >= 0);
  assert.equal(f.events[close + 1].name, 'revoke-session');
  assert.equal(f.events[close + 2].name, 'sandbox-stop');
  const grants = f.events.filter(value => value.name === 'grant').map(value => value.artifactId);
  assert.equal(grants.some(value => value === 'package8-original'), true);
  assert.equal(grants.some(value => value.startsWith('package8-stl-')), true);
});

test('provider acknowledgement uncertainty quarantines and stops without retry or cap transfer', async () => {
  const f = setup({ providerAckUnknown: 'original-igs' });
  const result = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(result.code, 'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(f.events.filter(value => value.name === 'provider-commit').length, 1);
  assert.equal(f.events.filter(value => value.name === 'sandbox-convert').length, 0);
  assert.equal(f.events.filter(value => value.name === 'close').length, 1);
  assert.equal(f.state.revoked, true);
  assert.deepEqual(await f.controller.reviewOneUse({ window: WINDOW }), {
    ok: false, code: 'PACKAGE8_ATTEMPT_CONSUMED', sourceOnly: true,
    developmentOnly: true, maxRetries: 0, providerRequests: 0 });
});

test('lost durable-claim acknowledgement closes the exact scope before any fixture read', async () => {
  const f = setup({ claimTimeout: true, operationBudgetMs: 5 });
  const result = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(result.code, 'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(f.state.bodyReads, 0);
  assert.equal(f.events.filter(value => value.name === 'claim').length, 1);
  assert.equal(f.events.filter(value => value.name === 'close').length, 1);
  assert.equal(f.events.filter(value => value.name === 'revoke-session').length, 1);
});

test('Sandbox unknown outcome and cleanup uncertainty both quarantine with zero retries', async () => {
  for (const options of [{ sandboxUnknown: true }, { cleanupUnknown: true }]) {
    const f = setup(options);
    const result = await f.controller.reviewOneUse({ window: WINDOW });
    assert.equal(result.code, 'PACKAGE8_EXECUTION_QUARANTINED');
    assert.equal(f.events.filter(value => value.name === 'sandbox-convert').length, 1);
    assert.equal(f.events.filter(value => value.name === 'close').length, 1);
    assert.equal(f.events.filter(value => value.name === 'sandbox-stop').length, 1);
    assert.equal(f.state.sandboxAttempts, 1);
  }
});

test('timeout and cancellation remain consumed, close-first, and restart-safe', async () => {
  const timed = setup({ sandboxTimeout: true, operationBudgetMs: 5 });
  assert.equal((await timed.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(timed.events.filter(value => value.name === 'close').length, 1);
  assert.equal((await timed.restart().reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_ATTEMPT_CONSUMED');

  const cancelled = setup();
  const control = new AbortController();
  const originalConvert = cancelled.controllerOptions.sandbox.convert;
  cancelled.controllerOptions.sandbox = Object.freeze({
    ...cancelled.controllerOptions.sandbox,
    async convert(value, context) { control.abort(); return originalConvert(value, context); },
  });
  const controller = createCadPhase5Package8ExecutionController(cancelled.controllerOptions);
  assert.equal((await controller.reviewOneUse({ window: WINDOW, signal: control.signal })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(cancelled.events.filter(value => value.name === 'close').length, 1);
});

test('process restart, replay, and concurrent use consume one durable intent and one claim', async () => {
  const shared = { intents: new Set() };
  const first = setup({}, shared);
  const restarted = setup({}, shared);
  const [a, b] = await Promise.all([
    first.controller.reviewOneUse({ window: WINDOW }),
    restarted.controller.reviewOneUse({ window: WINDOW }),
  ]);
  assert.equal([a, b].filter(value => value.ok === true).length, 1);
  assert.equal([a, b].filter(value => value.code === 'PACKAGE8_ATTEMPT_CONSUMED').length, 1);
  assert.equal(first.events.filter(value => value.name === 'claim').length
    + restarted.events.filter(value => value.name === 'claim').length, 1);
  assert.equal(shared.intents.size, 1);
});

test('owner and shop mismatches fail closed before body or before deletion', async () => {
  const authority = setup({ authorityMismatch: true });
  assert.equal((await authority.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_UNAVAILABLE');
  assert.equal(authority.state.bodyReads, 0);
  assert.equal(authority.events.some(value => value.name === 'claim'), false);

  const reconciliation = setup({ reconcileOwnerMismatch: true });
  assert.equal((await reconciliation.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(reconciliation.events.some(value => value.name === 'provider-delete'), false);
});

test('cost, reservation, and quota limits stop before fixture bytes are read', async () => {
  for (const options of [
    { calculatedMaximumCostMicros: 9_000_000 },
    { observedCostMicros: 9_000_000 },
    { reservationMicros: 9_000_000 },
  ]) {
    const f = setup(options);
    assert.equal((await f.controller.reviewOneUse({ window: WINDOW })).code,
      'PACKAGE8_EXECUTION_UNAVAILABLE');
    assert.equal(f.state.bodyReads, 0);
  }
  const quota = setup({ quotaExceeded: true });
  assert.equal((await quota.controller.reviewOneUse({ window: WINDOW })).code,
    'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(quota.state.bodyReads, 0);
  assert.equal(quota.events.filter(value => value.name === 'close').length, 1);
});

test('fixture drift, grant binding drift, and deletion uncertainty fail closed and sanitized', async () => {
  for (const options of [
    { fixtureDrift: true },
    { grantMismatch: true },
    { deleteUnknown: 'package8-original' },
  ]) {
    const f = setup(options);
    const result = await f.controller.reviewOneUse({ window: WINDOW });
    assert.equal(result.code, 'PACKAGE8_EXECUTION_QUARANTINED');
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /phase5-synthetic-(?:user|shop|upload-session)/);
    assert.doesNotMatch(serialized, /dg1\.|provider-commit|Dispenser\.IGS|PRIVATE KEY/);
  }
});

test('duplicate or unknown lifecycle metadata cannot become public evidence', async () => {
  const f = setup({ duplicateMetadata: true });
  const result = await f.controller.reviewOneUse({ window: WINDOW });
  assert.equal(result.code, 'PACKAGE8_EXECUTION_QUARANTINED');
  assert.equal(result.providerRequests, 0);
  assert.equal(f.events.filter(value => value.name === 'metadata:convex').length, 1);
  assert.equal(f.state.artifacts.size, 0);
});

test('invalid, active, expired, or overlong windows remain inactive and consume no intent', async () => {
  for (const window of [
    { ...WINDOW, activated: true },
    { ...WINDOW, startUtc: '2026-10-10T19:10:00.000Z' },
    { ...WINDOW, endUtc: '2026-10-10T19:45:01.000Z' },
  ]) {
    const f = setup();
    assert.equal((await f.controller.reviewOneUse({ window })).code, 'PACKAGE8_WINDOW_INVALID');
    assert.equal(f.intents.size, 0);
    assert.equal(f.events.length, 0);
  }
});

test('source remains offline, internal, unrouted, credential-free, and absent from runtime imports', () => {
  const sourceName = 'server/cadPhase5Package8ExecutionController.js';
  const source = fs.readFileSync(path.join(root, sourceName), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process/);
  assert.doesNotMatch(source, /@vercel\/sandbox|cadR2PrivateArtifactCustody|request\.body/);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.equal(fs.readFileSync(path.join(root, runtime), 'utf8')
      .includes('cadPhase5Package8ExecutionController'), false, runtime);
  }
  assert.equal(source.includes('sourceToDeploymentFunctionEquivalence: \'NOT_CLAIMED\''), true);
});
