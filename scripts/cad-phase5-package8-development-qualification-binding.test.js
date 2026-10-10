const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CREDENTIAL_REFERENCES, ENVIRONMENT_VARIABLE_REFERENCES, LIMITS,
  QUALIFICATION_BINDING, QUALIFICATION_REVIEW_GATE, SOURCE_OPERATION_MAP,
  approvalCommitment, createCadPhase5Package8DevelopmentQualificationBinding,
} = require('../server/cadPhase5Package8DevelopmentQualificationBinding');
const { EXECUTION_BASELINE, expectedAncestryDigest, expectedApprovalIssuanceReceipt,
  expectedRuntimeReceiptDigest,
} = require('../server/cadPhase5Package8OneUseCoordinator');
const { FUNCTIONS, createCadPhase5Package8ConvexDurableInvoker }
  = require('../server/cadPhase5Package8ConvexDurableInvoker');
const { createDisabledPackage8LifecycleMonitor }
  = require('../server/cadPhase5Package8LifecycleMonitor');
const { SYNTHETIC_PRIVATE_IGES_FIXTURE }
  = require('../server/cadPhase5SyntheticPrivatePathQualification');

const root = path.resolve(__dirname, '..');
const NOW = Date.parse('2026-10-10T21:35:00.000Z');
const hash = value => createHash('sha256').update(value).digest('hex');
const CLOSED = Object.freeze({ sourceOnly: true, liveReady: false, routeMounted: false,
  bodyAdmissionAuthorized: false, providerDispatchEnabled: false,
  conversionDispatchEnabled: false, downloadRouteEnabled: false });
const result = (accepted, code, extra = {}) => ({ ...CLOSED, accepted, code, ...extra });
const OWNER = Object.freeze({ userId: 'synthetic-convex-user-id',
  shopId: 'phase5-synthetic-shop', uploadSessionId: 'phase5-synthetic-upload-session' });
const SESSION = Object.freeze({ sessionDigest: 'c'.repeat(64),
  loginSessionId: 'phase5-synthetic-login-session' });
const WINDOW = Object.freeze({ schemaVersion: 1, idDigest: 'a'.repeat(64),
  startUtc: '2026-10-10T21:34:00.000Z', endUtc: '2026-10-10T21:44:00.000Z',
  activated: true });

function executionBinding() {
  const value = { schemaVersion: 1, baseline: { ...EXECUTION_BASELINE },
    executionHeadCommit: '1'.repeat(40), executionHeadTree: '2'.repeat(40), clean: true,
    descendantOfBaseline: true, ancestryReceiptDigest: '', runtimeDeployment: {
      schemaVersion: 1, deploymentId: 'dpl_package8_development_exact', state: 'READY',
      environment: 'development', commit: '1'.repeat(40), tree: '2'.repeat(40),
      functionEquivalence: 'VERIFIED_EXACT', receiptDigest: '',
    } };
  value.ancestryReceiptDigest = expectedAncestryDigest(value);
  value.runtimeDeployment.receiptDigest = expectedRuntimeReceiptDigest(value.runtimeDeployment);
  return value;
}

function approval(overrides = {}) {
  const artifact = { schemaVersion: 1,
    kind: 'CAD_PHASE5_PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFICATION_APPROVAL',
    status: 'ISSUED_ONE_USE_DEVELOPMENT_QUALIFICATION',
    issuanceReference: 'package8-issued-once-2026-10-10', approvalIdDigest: '0'.repeat(64),
    issuedAtUtc: new Date(NOW).toISOString(), authorityExpiresAtUtc: WINDOW.endUtc,
    window: { ...WINDOW }, binding: { ...QUALIFICATION_BINDING },
    executionBinding: executionBinding(), owner: { ...OWNER }, session: { ...SESSION },
    fixture: { id: SYNTHETIC_PRIVATE_IGES_FIXTURE.id,
      sha256: SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256, projectOwned: true,
      nonproprietary: true, customerData: false }, limits: { ...LIMITS },
    credentialReferences: [...CREDENTIAL_REFERENCES],
    environmentVariableReferences: [...ENVIRONMENT_VARIABLE_REFERENCES],
    calculatedMaximumCostMicros: 8_999_999, observedCostMicros: 0,
    providerRequestsAuthorized: true, runtimeActivationAuthorized: false };
  Object.assign(artifact, overrides);
  artifact.approvalIdDigest = approvalCommitment(artifact);
  return artifact;
}

function fixture(options = {}) {
  const calls = [];
  const state = options.state || { artifacts: new Map(), tombstones: new Map(),
    grants: new Map(), objects: new Map(), claims: new Map(), control: null };
  const { artifacts, tombstones, grants, objects, claims } = state;
  let sandboxCount = 0, sessionRevoked = false;
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `ref:${name}`]));
  const durable = async (reference, input) => {
    const operation = reference.slice(4);
    calls.push(`convex:${operation}`);
    if (options.mutationUnknown === operation) throw Error('transport unknown');
    if (operation === 'claimUpload') {
      const prior = claims.get(input.attempt.idempotencyDigest);
      if (prior || state.control) return result(false,
        prior ? 'IDEMPOTENCY_REPLAYED' : 'ORCHESTRATION_CLOSED',
        { replayed: Boolean(prior), attemptId: prior?.attemptId });
      claims.set(input.attempt.idempotencyDigest, { ...input.attempt });
      return result(true, 'UPLOAD_ATTEMPT_CLAIMED', { status: 'claimed',
        attemptId: input.attempt.attemptId, fence: 1 });
    }
    if (operation === 'reserveArtifact') {
      artifacts.set(input.artifact.artifactId, { ...input.artifact });
      return result(true, 'ARTIFACT_RESERVED', { artifactId: input.artifact.artifactId,
        retainedUntil: input.artifact.retainedUntil, revision: artifacts.size });
    }
    if (operation === 'consumeQuota') return result(true, 'QUOTA_RESERVED', { revision: 1 });
    if (operation === 'readArtifact') {
      const record = artifacts.get(input.artifactId);
      return record ? result(true, 'ARTIFACT_PRESENT', { artifactId: record.artifactId,
        state: record.state, generation: record.generation, byteCount: record.byteCount,
        retainedUntil: record.retainedUntil }) : result(false, 'CUSTODY_DENIED');
    }
    if (operation === 'transitionArtifact') {
      const record = artifacts.get(input.artifactId);
      if (!record || record.generation !== input.expectedGeneration) return result(false, 'CUSTODY_STALE');
      record.state = input.transition; record.generation += 1;
      return result(true, `ARTIFACT_${input.transition.toUpperCase()}`,
        { artifactId: record.artifactId, generation: record.generation });
    }
    if (operation === 'confirmDeleted') {
      if (options.confirmUnknown) throw Error('confirm unknown');
      artifacts.delete(input.artifactId); tombstones.set(input.artifactId, input.tombstoneDigest);
      return result(true, 'ARTIFACT_DELETED', { artifactId: input.artifactId,
        deleted: true, tombstoneDigest: input.tombstoneDigest });
    }
    if (operation === 'issueDownloadGrant') {
      grants.set(input.grantDigest, { ...input, revoked: false });
      return result(true, 'DOWNLOAD_GRANT_ISSUED');
    }
    if (operation === 'resolveDownloadGrant') {
      const grant = grants.get(input.grantDigest);
      return grant && !grant.revoked ? result(true, 'DOWNLOAD_GRANT_PRESENT',
        { artifactId: grant.artifactId, expiresAt: grant.expiresAt })
        : result(false, 'DOWNLOAD_GRANT_DENIED');
    }
    if (operation === 'closeForRollback') {
      state.control = { ...input };
      for (const record of artifacts.values()) { record.state = 'quarantined'; record.generation += 1; }
      for (const grant of grants.values()) grant.revoked = true;
      return result(true, 'ROLLBACK_CLOSED_FIRST', { admissionClosed: true,
        conversionClosed: true, grantsRevoked: true, uncertainRecordsQuarantined: true,
        generation: 1 });
    }
    if (operation === 'reconcile') {
      if (options.reconcileUnknown && input.kind === options.reconcileUnknown) throw Error('query unknown');
      if (input.kind === 'control') return state.control
        ? result(true, 'RECONCILIATION_PRESENT', { state: 'closed', generation: 1,
          admissionClosed: true, conversionClosed: true, grantsRevoked: true,
          uncertainRecordsQuarantined: true }) : result(false, 'RECONCILIATION_DENIED');
      if (input.kind === 'artifact') {
        const record = artifacts.get(input.key);
        return record ? result(true, 'RECONCILIATION_PRESENT', { state: record.state,
          artifactId: record.artifactId, generation: record.generation })
          : result(false, 'RECONCILIATION_DENIED');
      }
      const tombstoneDigest = tombstones.get(input.key);
      return tombstoneDigest ? result(true, 'RECONCILIATION_PRESENT', { state: 'deleted',
        artifactId: input.key, generation: 4, deleted: true, tombstoneDigest })
        : result(false, 'RECONCILIATION_DENIED');
    }
    return result(false, 'OPERATION_NOT_USED');
  };
  const provider = {
    async putExact(input) { calls.push('r2:put'); if (options.putUnknown) return null;
      objects.set(input.objectKey, Buffer.from(input.bytes));
      return { committed: true, byteCount: input.bytes.length, sha256: hash(input.bytes) }; },
    async getExact() { calls.push('r2:get'); throw Error('not authorized'); },
    async deleteExact(objectKey) { calls.push('r2:delete'); if (options.deleteUnknown) return false;
      objects.delete(objectKey); return true; },
    async headExact(objectKey) { calls.push('r2:head'); return objects.has(objectKey) ? {} : null; },
  };
  const sessionStore = {
    async insertIfAbsent() { calls.push('session:issue'); throw Error('session issuance forbidden'); },
    async read() { calls.push('session:read'); return null; },
    async revoke(key) { calls.push('session:revoke'); sessionRevoked = key === SESSION.sessionDigest;
      return sessionRevoked; },
  };
  const sandbox = {
    async create(createOptions) {
      calls.push('sandbox:create'); sandboxCount += 1;
      assert.deepEqual(createOptions.env, {});
      for (const field of ['token', 'teamId', 'projectId']) assert.equal(createOptions[field], undefined);
      let files;
      return { persistent: false, vcpus: 1, memory: 2048, timeout: 60_000,
        networkPolicy: 'deny-all', async writeFiles(value) { files = value; },
        async runCommand() { return { exitCode: options.sandboxFailure ? 1 : 0 }; },
        async readFileToBuffer() { const bytes = files.find(file => file.path.endsWith('/source.bin')).content;
          return Buffer.from(JSON.stringify({ status: 'ready', sourceSha256: hash(bytes),
            guestMemoryBytes: 1024, meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
              indices: [0, 1, 2] }] })); },
        async stop() { calls.push('sandbox:stop'); if (options.cleanupUnknown) throw Error('stop unknown');
          return { status: 'stopped' }; },
      };
    }, loadAssets: () => [],
  };
  const sources = { convex: { references, runQuery: durable, runMutation: durable }, r2: { provider }, sandbox,
    exactSession: { async verifyExactSession() { calls.push('session:verify');
      return { userId: options.ownerMismatch ? 'different-user' : OWNER.userId,
        shopId: OWNER.shopId, loginSessionId: SESSION.loginSessionId, authMethod: 'password',
        cadUploadAllowed: true, expiresAt: Date.parse(WINDOW.endUtc) + 1 };
    }, store: sessionStore },
    approvalIssuance: { async verifyExact(request) { calls.push('approval:verify');
      if (options.issuanceUnknown) throw Error('issuer unavailable');
      if (options.issuanceMissing) return null;
      const core = { ...request, verified: true, status: 'ISSUED_ACTIVE_ONE_USE',
        revoked: false, consumed: false };
      const receipt = { ...core, receiptDigest: hash(JSON.stringify(core)) };
      if (options.issuanceRevoked) receipt.revoked = true;
      if (options.issuanceConsumed) receipt.consumed = true;
      if (options.issuanceStale) receipt.status = 'ISSUED_STALE';
      if (options.issuanceMismatch) receipt.ownerCommitment = '0'.repeat(64);
      return receipt; } },
    executionReceipt: { async verifyExact(binding) { calls.push('receipt:verify');
      if (options.receiptDrift) return { verified: false };
      return { verified: true, baselineCommit: EXECUTION_BASELINE.mergedMainCommit,
        baselineTree: EXECUTION_BASELINE.mergedMainTree,
        executionHeadCommit: binding.executionHeadCommit,
        executionHeadTree: binding.executionHeadTree, clean: true, descendantOfBaseline: true,
        deploymentId: binding.runtimeDeployment.deploymentId,
        deployedCommit: binding.executionHeadCommit, deployedTree: binding.executionHeadTree,
        deploymentState: 'READY', functionEquivalence: 'VERIFIED_EXACT' }; } },
    lifecycleMetadata: { async readSanitized() { calls.push('lifecycle:read'); return {
      convex: { teamSlug: 'vambah-sillah', projectSlug: 'reversr-cad-auth-dev',
        deploymentName: 'majestic-alligator-31', identityVerified: true,
        sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
        quotaLedgerNamespace: 'phase5-synthetic-private-path-v1', stuckJobs: 0,
        uncertainRecords: 0 },
      r2: { bucket: 'reversr-cad-package8-public-fixture-us', jurisdiction: 'US',
        storageClass: 'STANDARD', publicAccess: false, customDomains: 0,
        lifecycleDeleteAfterDays: 1, lifecycleStatus: 'ENABLED', objectCount: objects.size,
        byteCount: [...objects.values()].reduce((n, value) => n + value.length, 0),
        classAOperations: 2, classBOperations: 2, deleteOperations: 2, usageUnknown: false },
      sandbox: { runtime: 'node24', region: 'iad1', vcpus: 1, memoryMb: 2048,
        lifetimeMs: 60_000, networkPolicy: 'deny-all', persistent: false, exposedPorts: 0,
        snapshotPresent: false, attempts: 1, retries: 0, status: 'stopped', terminal: true,
        cleanupConfirmed: true, outcomeUnknown: false },
    }; } } };
  if (options.omitIssuanceVerifier) delete sources.approvalIssuance;
  const binding = createCadPhase5Package8DevelopmentQualificationBinding({ reviewOnly: true,
    approvalGate: QUALIFICATION_REVIEW_GATE, sources,
    lifecycleMonitor: createDisabledPackage8LifecycleMonitor(), now: () => NOW });
  return { binding, calls, artifacts, tombstones, objects, grants, claims,
    state, sandboxCount: () => sandboxCount, sessionRevoked: () => sessionRevoked };
}

test('default and incomplete bindings remain unmounted and disabled', async () => {
  const absent = createCadPhase5Package8DevelopmentQualificationBinding();
  assert.equal(absent.reviewConfigured, false);
  assert.equal((await absent.reviewOneUse({ approvalArtifact: approval() })).code,
    'PACKAGE8_QUALIFICATION_BINDING_DISABLED');
  for (const flag of ['configured', 'enabled', 'mounted', 'routeMounted', 'sessionIssuanceEnabled',
    'requestBodyAdmissionAuthorized', 'providerDispatchEnabled', 'storageDispatchEnabled',
    'conversionDispatchEnabled', 'downloadDispatchEnabled', 'runtimeActivationAllowed',
    'liveBindingsAccepted', 'productionBehaviorChanged']) assert.equal(absent[flag], false, flag);
});

test('review composition uses actual factories and all Convex references without activity', async () => {
  const f = fixture();
  assert.equal(f.binding.reviewConfigured, true);
  assert.equal(f.binding.sourceComposition.actualReviewedFactoriesComposed, true);
  assert.equal(f.binding.sourceComposition.approvalBoundComposition, true);
  assert.equal(f.binding.sourceComposition.independentApprovalIssuanceRequired, true);
  assert.equal(f.binding.sourceComposition.executableAdaptersExposed, false);
  assert.deepEqual(f.binding.sourceComposition.convexOperations, FUNCTIONS);
  assert.deepEqual(f.calls, []);
  const calls = [];
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(name => [name, `ref:${name}`]));
  const invoke = kind => async (reference, input) => { calls.push({ kind, reference, input });
    return result(true, 'RECONCILIATION_PRESENT'); };
  const adapter = createCadPhase5Package8ConvexDurableInvoker({ references,
    runQuery: invoke('query'), runMutation: invoke('mutation') });
  for (const [name, kind] of Object.entries(FUNCTIONS)) { await adapter[name]({ operation: name });
    assert.deepEqual(calls.at(-1), { kind, reference: `ref:${name}`, input: { operation: name } }); }
});

test('one issued authority runs once, closes first, revokes, deletes and returns sanitized evidence', async () => {
  const f = fixture();
  const artifact = approval();
  const value = await f.binding.reviewOneUse({ approvalArtifact: artifact });
  assert.equal(value.ok, true); assert.equal(value.code, 'PACKAGE8_ONE_USE_DEVELOPMENT_QUALIFIED_CLOSED');
  assert.equal(value.deletedArtifactCount, 2); assert.equal(value.sessionCount, 1);
  assert.equal(value.fileCount, 1); assert.equal(value.attemptCount, 1);
  assert.equal(value.automaticRetries, 0); assert.equal(value.maximumCostMicrosExclusive, 9_000_000);
  assert.equal(value.reservationMicros, 8_999_999); assert.equal(value.routeMounted, false);
  assert.equal(value.runtimeActivationAllowed, false); assert.equal(f.sessionRevoked(), true);
  assert.equal(f.sandboxCount(), 1); assert.equal(f.objects.size, 0);
  assert.equal(f.artifacts.size, 0); assert.equal(f.tombstones.size, 2);
  assert.equal(f.calls.filter(call => call === 'r2:put').length, 2);
  assert.equal(f.calls.filter(call => call === 'r2:delete').length, 2);
  assert.equal(f.calls.includes('r2:get'), false); assert.equal(f.calls.includes('session:issue'), false);
  assert.equal(f.calls[0], 'approval:verify');
  assert.ok(f.calls.indexOf('approval:verify') < f.calls.indexOf('receipt:verify'));
  assert.ok(f.calls.indexOf('receipt:verify') < f.calls.indexOf('session:verify'));
  assert.ok(f.calls.indexOf('convex:closeForRollback') < f.calls.indexOf('session:revoke'));
  assert.ok(f.calls.indexOf('session:revoke') < f.calls.indexOf('r2:delete'));
  assert.equal(Object.keys(value).some(key => /token|secret|objectKey|userId|shopId/i.test(key)), false);
  const issuance = expectedApprovalIssuanceReceipt(artifact);
  const exactClaimDigest = hash([issuance.issuanceReference, issuance.receiptDigest,
    artifact.approvalIdDigest, artifact.window.idDigest,
    artifact.executionBinding.executionHeadCommit].join('|'));
  assert.equal(f.claims.has(exactClaimDigest), true);
  assert.equal(f.claims.get(exactClaimDigest).evidenceDigest,
    hash([issuance.receiptDigest,
      artifact.executionBinding.runtimeDeployment.receiptDigest].join('|')));
  const restarted = fixture({ state: f.state });
  const replay = await restarted.binding.reviewOneUse({ approvalArtifact: artifact });
  assert.equal(replay.code, 'PACKAGE8_ATTEMPT_CONSUMED');
  assert.equal(restarted.sandboxCount(), 0); assert.equal(f.sandboxCount(), 1);
});

test('stale authority, cost widening, source drift and owner mismatch stop before provider work', async () => {
  const missing = fixture();
  assert.equal((await missing.binding.reviewOneUse()).code, 'PACKAGE8_APPROVAL_INVALID');
  assert.deepEqual(missing.calls, []);
  const stale = approval({ issuedAtUtc: new Date(NOW - 120_001).toISOString() });
  stale.approvalIdDigest = approvalCommitment(stale);
  for (const artifact of [stale, approval({ calculatedMaximumCostMicros: 9_000_000 })]) {
    const f = fixture(); const value = await f.binding.reviewOneUse({ approvalArtifact: artifact });
    assert.match(value.code, /PACKAGE8_APPROVAL_(?:STALE|INVALID)/); assert.deepEqual(f.calls, []);
  }
  for (const options of [{ receiptDrift: true }, { ownerMismatch: true }]) {
    const f = fixture(options); const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
    assert.equal(value.ok, false); assert.equal(f.calls.includes('r2:put'), false);
    assert.equal(f.calls.includes('sandbox:create'), false);
  }
});

test('self-hash, missing verifier and uncertain or inactive issuance stop before adapter activity', async () => {
  const selfHashed = approval();
  assert.equal(selfHashed.approvalIdDigest, approvalCommitment(selfHashed));

  const omitted = fixture({ omitIssuanceVerifier: true });
  assert.equal(omitted.binding.reviewConfigured, false);
  assert.equal((await omitted.binding.reviewOneUse({ approvalArtifact: selfHashed })).code,
    'PACKAGE8_QUALIFICATION_BINDING_DISABLED');
  assert.deepEqual(omitted.calls, []);

  for (const options of [{ issuanceMissing: true }, { issuanceUnknown: true },
    { issuanceMismatch: true }, { issuanceStale: true }, { issuanceRevoked: true },
    { issuanceConsumed: true }]) {
    const f = fixture(options);
    const value = await f.binding.reviewOneUse({ approvalArtifact: selfHashed });
    assert.equal(value.code, 'PACKAGE8_EXECUTION_UNAVAILABLE', JSON.stringify(options));
    assert.deepEqual(f.calls, ['approval:verify']);
  }
});

test('provider, cleanup, deletion and reconciliation uncertainty fail closed with zero retries', async () => {
  for (const options of [{ putUnknown: true }, { cleanupUnknown: true }, { deleteUnknown: true },
    { reconcileUnknown: 'control' }, { confirmUnknown: true }]) {
    const f = fixture(options); const value = await f.binding.reviewOneUse({ approvalArtifact: approval() });
    assert.equal(value.ok, false, JSON.stringify(options));
    assert.match(value.code, /PACKAGE8_EXECUTION_(?:QUARANTINED|UNAVAILABLE)/);
    assert.equal(value.automaticRetries, 0);
    assert.equal(f.calls.filter(call => call === 'sandbox:create').length <= 1, true);
    assert.equal(f.calls.includes('convex:closeForRollback'), true);
    assert.equal(f.calls.includes('session:revoke'), true);
  }
});

test('source remains unmounted, environment-empty, credential-name-only and absent from runtimes', () => {
  const sources = ['server/cadPhase5Package8DevelopmentQualificationBinding.js',
    'server/cadPhase5Package8OneUseAdapters.js', 'server/cadPhase5Package8OneUseCoordinator.js']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  for (const factory of ['createCadPhase5Package8ConvexDurableInvoker',
    'createCadR2PrivateArtifactCustody', 'createSandboxExecutor', 'createCadExactSessionBridge',
    'createUploadSessionService']) assert.match(sources, new RegExp(factory));
  assert.doesNotMatch(sources,
    /createCadPhase5Package8InternalRunner|OFFLINE_REVIEW_GATE|offlineSynthetic|process\.env|fetch\s*\(|https?\.request/);
  assert.match(sources, /env:\s*EMPTY_ENVIRONMENT/);
  assert.deepEqual(SOURCE_OPERATION_MAP.r2Provider, ['putExact', 'getExact', 'deleteExact', 'headExact']);
  for (const runtime of ['server/index.js', 'server/cadUserUploadRouter.js',
    'server/cadProductionExecutionBinding.js', 'server/cadLiveOpeningRuntimeActivation.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, runtime), 'utf8'),
      /cadPhase5Package8DevelopmentQualificationBinding|cadPhase5Package8OneUseCoordinator/);
  }
});
