const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CLOSE_FIRST_ACTIONS,
  createDisabledPackage8LifecycleMonitor,
  evaluatePackage8LifecycleMetadata,
} = require('../server/cadPhase5Package8LifecycleMonitor');

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

function snapshot() {
  return {
    schemaVersion: 1,
    observedAtUtc: '2026-10-10T19:20:00.000Z',
    window: {
      idDigest: DIGEST_A,
      startUtc: '2026-10-10T19:15:00.000Z',
      endUtc: '2026-10-10T19:25:00.000Z',
      activated: true,
    },
    fixture: {
      id: 'reversr-phase5-synthetic-private-line-v1',
      sha256: '0bdb42a7c58f4d51eee7eec2befae6ba590e43e0ecce34350cef9db4345c4c70',
      owner: 'ReversR test project',
      projectOwned: true,
      nonproprietary: true,
      customerData: false,
    },
    operation: { sessions: 1, files: 1, attempts: 1, retries: 0, unknownOutcome: false },
    authority: { freshAuthorizationVerified: true, bodyReadsBeforeFreshAuthorization: 0 },
    ownership: {
      ownerCommitment: DIGEST_A,
      shopCommitment: DIGEST_B,
      crossOwnerAttempts: 0,
      mismatchCount: 0,
    },
    targets: {
      convex: [{
        teamSlug: 'vambah-sillah',
        projectSlug: 'reversr-cad-auth-dev',
        deploymentName: 'majestic-alligator-31',
        identityVerified: true,
        sourceToDeploymentFunctionEquivalence: 'NOT_CLAIMED',
        quotaLedgerNamespace: 'phase5-synthetic-private-path-v1',
        stuckJobs: 0,
        uncertainRecords: 0,
      }],
      r2: [{
        bucket: 'reversr-cad-package8-public-fixture-us',
        jurisdiction: 'US',
        storageClass: 'STANDARD',
        publicAccess: false,
        customDomains: 0,
        lifecycleDeleteAfterDays: 1,
        lifecycleStatus: 'ENABLED',
        objectCount: 0,
        byteCount: 0,
        classAOperations: 0,
        classBOperations: 0,
        deleteOperations: 0,
        usageUnknown: false,
      }],
      sandbox: [{
        runtime: 'node24',
        region: 'iad1',
        vcpus: 1,
        memoryMb: 2048,
        lifetimeMs: 60000,
        networkPolicy: 'deny-all',
        persistent: false,
        exposedPorts: 0,
        snapshotPresent: false,
        attempts: 1,
        retries: 0,
        status: 'stopped',
        terminal: true,
        cleanupConfirmed: true,
        outcomeUnknown: false,
      }],
    },
    budget: {
      currency: 'USD',
      calculatedMaximumCostUsd: 0.00770450625,
      observedCostUsd: 0,
      usageUnknown: false,
    },
    evidence: {
      restrictedDestination: '.local/cad-phase5-package8/readiness-monitoring-reconciliation/',
      publicSafeDestination: 'docs/cad-phase5-package8-public-evidence/',
      metadataOnly: true,
      rawProviderOutputPersisted: false,
      sensitiveFieldsPresent: false,
      r2DataAccessLogsAvailable: false,
      monitoringEquivalenceClaimed: false,
    },
  };
}

const clone = value => JSON.parse(JSON.stringify(value));
const evaluate = value => evaluatePackage8LifecycleMetadata(value, {
  nowMs: Date.parse('2026-10-10T19:20:30.000Z'),
});

test('the exact sanitized synthetic snapshot may continue only inside the reviewed window', () => {
  const result = evaluate(snapshot());
  assert.equal(result.status, 'CONTINUE_WITHIN_REVIEWED_WINDOW');
  assert.deepEqual(result.stopCodes, []);
  assert.equal(result.providerRequests, 0);
});

test('the monitor remains permanently unwired and cannot observe providers', async () => {
  const monitor = createDisabledPackage8LifecycleMonitor();
  assert.equal(monitor.configured, false);
  assert.equal(monitor.dispatchEnabled, false);
  assert.deepEqual(await monitor.observe(), { ok: false, code: 'PACKAGE8_MONITOR_DISABLED' });
});

test('inactive, excessive, stale, and duplicate metadata fail closed', () => {
  const inactive = clone(snapshot());
  inactive.window.activated = false;
  assert.ok(evaluate(inactive).stopCodes.includes('WINDOW_INVALID_OR_INACTIVE'));

  const retry = clone(snapshot());
  retry.operation.retries = 1;
  assert.ok(evaluate(retry).stopCodes.includes('RETRY_OR_ATTEMPT_LIMIT'));

  const stale = clone(snapshot());
  stale.observedAtUtc = '2026-10-10T19:10:00.000Z';
  assert.ok(evaluate(stale).stopCodes.includes('EVIDENCE_STALE'));

  const duplicate = clone(snapshot());
  duplicate.targets.r2.push(clone(duplicate.targets.r2[0]));
  assert.ok(evaluate(duplicate).stopCodes.includes('METADATA_SHAPE_UNKNOWN'));
});

test('private data, cross-owner access, and authority-order violations stop', () => {
  const privateFixture = clone(snapshot());
  privateFixture.fixture.nonproprietary = false;
  privateFixture.fixture.customerData = true;
  assert.ok(evaluate(privateFixture).stopCodes.includes('FIXTURE_OUT_OF_SCOPE'));

  const owner = clone(snapshot());
  owner.ownership.crossOwnerAttempts = 1;
  assert.ok(evaluate(owner).stopCodes.includes('CROSS_OWNER_ACCESS'));

  const authority = clone(snapshot());
  authority.authority.bodyReadsBeforeFreshAuthorization = 1;
  assert.ok(evaluate(authority).stopCodes.includes('AUTHORITY_ORDER_VIOLATION'));
});

test('target drift, durable uncertainty, and quota or budget exhaustion stop', () => {
  const target = clone(snapshot());
  target.targets.convex[0].deploymentName = 'wrong-target';
  assert.ok(evaluate(target).stopCodes.includes('SOURCE_OR_TARGET_DRIFT'));

  const stuck = clone(snapshot());
  stuck.targets.convex[0].stuckJobs = 1;
  assert.ok(evaluate(stuck).stopCodes.includes('STUCK_OR_UNCERTAIN_DURABLE_STATE'));

  const quota = clone(snapshot());
  quota.targets.r2[0].objectCount = 13;
  assert.ok(evaluate(quota).stopCodes.includes('R2_EXPOSURE_LIFECYCLE_OR_USAGE'));

  const budget = clone(snapshot());
  budget.budget.observedCostUsd = 9;
  assert.ok(evaluate(budget).stopCodes.includes('BUDGET_LIMIT_OR_UNKNOWN'));
});

test('Sandbox mismatch and unknown cleanup produce the close-first stop sequence', () => {
  const sandbox = clone(snapshot());
  sandbox.targets.sandbox[0].networkPolicy = 'allow-all';
  sandbox.targets.sandbox[0].cleanupConfirmed = false;
  const result = evaluate(sandbox);
  assert.equal(result.status, 'STOP_REQUIRED');
  assert.ok(result.stopCodes.includes('SANDBOX_POLICY_OR_CLEANUP'));
  assert.deepEqual(result.closeFirstActions, CLOSE_FIRST_ACTIONS);
});

test('R2 Data Access Logs and raw or sensitive evidence can never be claimed', () => {
  const logs = clone(snapshot());
  logs.evidence.r2DataAccessLogsAvailable = true;
  assert.ok(evaluate(logs).stopCodes.includes('EVIDENCE_PRIVACY_RISK'));

  const raw = clone(snapshot());
  raw.evidence.rawProviderOutputPersisted = true;
  raw.evidence.sensitiveFieldsPresent = true;
  assert.ok(evaluate(raw).stopCodes.includes('EVIDENCE_PRIVACY_RISK'));

  const extra = clone(snapshot());
  extra.targets.r2[0].rawRow = 'forbidden';
  assert.ok(evaluate(extra).stopCodes.includes('METADATA_SHAPE_UNKNOWN'));
});

test('unserializable or otherwise unknown metadata stops without leaking an exception', () => {
  const cyclic = snapshot();
  cyclic.loop = cyclic;
  const result = evaluate(cyclic);
  assert.equal(result.status, 'STOP_REQUIRED');
  assert.ok(result.stopCodes.includes('METADATA_SHAPE_UNKNOWN'));
  assert.ok(result.stopCodes.includes('UNKNOWN_OUTCOME'));
  assert.match(result.snapshotDigest, /^[a-f0-9]{64}$/);
});
