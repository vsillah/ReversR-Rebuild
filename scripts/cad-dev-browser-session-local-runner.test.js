const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const bindingValidator = require('./cad-dev-browser-session-runner-binding');
const localRunner = require('./cad-dev-browser-session-local-runner');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync('scripts/cad-dev-browser-session-local-runner.js', 'utf8');
const packet = JSON.parse(fs.readFileSync('docs/cad-dev-browser-session-local-runner.json', 'utf8'));
const docs = fs.readFileSync('docs/cad-dev-browser-session-local-runner.md', 'utf8');

function binding(overrides = {}) {
  const now = Date.now();
  const base = {
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-qualification-run-binding',
    runId: 'cad-browser-session-local-fixture',
    sourceCommit: 'd05b73805fa92e995fe4fe835a0f6b9835484e42',
    packet: {
      dependsOnPr: 315,
      mergeCommit: bindingValidator.expectedPacket.mergeCommit,
      packetMergeCommit: bindingValidator.expectedPacket.packetMergeCommit,
      markdownSha256: bindingValidator.expectedPacket.markdownSha256,
      jsonSha256: bindingValidator.expectedPacket.jsonSha256,
    },
    target: {
      kind: 'local-loopback-https',
      exactOrigin: 'https://127.0.0.1:4443',
      exactBrowserRoute: '/cad/browser-session-qualification',
      sourceCommit: 'd05b73805fa92e995fe4fe835a0f6b9835484e42',
      productionSmokeReceiptSha256: 'a'.repeat(64),
      localOnly: true,
      tls: {
        certificateSha256: '1'.repeat(64),
        privateKeySha256: '2'.repeat(64),
        privateKeyMode: '0600',
        generatedForRunOnly: true,
        trustStoreMutationAllowed: false,
      },
      browser: {
        engine: 'chromium',
        ignoreHttpsErrors: true,
        freshContext: true,
        persistentProfile: false,
        extensionsAllowed: false,
        serviceWorkersAllowed: false,
      },
    },
    auth: {
      kind: 'synthetic-server-owned-header-resolver',
      acceptanceReceiptSha256: 'b'.repeat(64),
      adapterSourceSha256: 'c'.repeat(64),
      realProviderAllowed: false,
      lifetimeMs: 60000,
    },
    rollback: {
      receiptSha256: 'd'.repeat(64),
      deletesPersistentRows: false,
    },
    custody: {
      custodian: 'Amina',
      receiptSha256: 'e'.repeat(64),
      retentionDays: 30,
    },
    cost: {
      maxCostUsd: 0,
      evidenceSha256: 'f'.repeat(64),
    },
    window: {
      startUtc: new Date(now - 1000).toISOString(),
      endUtc: new Date(now + 5 * 60 * 1000).toISOString(),
    },
    limits: {
      maxIssuerRequests: 1,
      maxDisabledUploadRequests: 1,
      requestBodyBytes: 0,
      bodyReads: 0,
      retry: false,
      secondRun: false,
      redirects: false,
    },
    authority: Object.fromEntries(bindingValidator.falseAuthorityKeys.map(key => [key, false])),
  };
  return {
    ...base,
    ...overrides,
    packet: { ...base.packet, ...(overrides.packet || {}) },
    target: { ...base.target, ...(overrides.target || {}) },
    auth: { ...base.auth, ...(overrides.auth || {}) },
    rollback: { ...base.rollback, ...(overrides.rollback || {}) },
    custody: { ...base.custody, ...(overrides.custody || {}) },
    cost: { ...base.cost, ...(overrides.cost || {}) },
    window: { ...base.window, ...(overrides.window || {}) },
    limits: { ...base.limits, ...(overrides.limits || {}) },
    authority: { ...base.authority, ...(overrides.authority || {}) },
  };
}

function writePrivateBinding(value = binding()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-browser-local-runner-'));
  fs.chmodSync(dir, 0o700);
  const file = path.join(dir, 'run-binding.json');
  const bytes = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  const bindingSha256 = sha256(bytes);
  const receipt = {
    schemaVersion: 1,
    mode: 'cad-browser-session-local-binding-acceptance-receipt',
    status: 'ACCEPTED_LOCAL_LOOPBACK_BINDING_SOURCE_ONLY',
    bindingSha256,
    liveRunAuthorized: false,
    uploadActivation: false,
    bodyAdmission: false,
    conversion: false,
    sandboxDispatch: false,
    privateCad: false,
    realUsers: false,
    retry: false,
    secondRun: false,
  };
  const receiptFile = path.join(dir, 'local-binding-acceptance-receipt.json');
  const receiptBytes = JSON.stringify(receipt, null, 2) + '\n';
  fs.writeFileSync(receiptFile, receiptBytes, { mode: 0o600 });
  return { dir, file, bytes, bindingSha256, receiptSha256: sha256(receiptBytes) };
}

test('packet remains source-only and blocks run authority until exact future approval', () => {
  assert.equal(packet.status, 'SOURCE_READY_LOCAL_BROWSER_EXECUTOR_REVIEWED_NO_RUN');
  assert.equal(packet.runner.executableAuthorityNow, false);
  assert.equal(packet.runner.executableImplemented, true);
  assert.equal(packet.runner.startsServerOnlyAfterExactFutureApproval, true);
  assert.equal(packet.runner.opensBrowserOnlyAfterExactFutureApproval, true);
  assert.equal(packet.runner.sendsNetworkRequestOnlyToRunOwnedLoopbackAfterExactFutureApproval, true);
  assert.equal(packet.runner.acceptsExecuteFlagNow, false);
  for (const value of Object.values(packet.authority)) assert.equal(value, false);
  assert.match(docs, /No browser qualification run is/);
  assert.match(docs, /Execution remains blocked/);
});

test('runner source is bounded to local execution and avoids durable secret literals', () => {
  assert.match(source, /--execute-approved-once/);
  assert.match(source, /require\('node:https'\)/);
  assert.match(source, /require\('playwright'\)/);
  assert.doesNotMatch(source, /Bearer synthetic|Cookie:|Set-Cookie:|X-Upload-CSRF:|BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
  assert.doesNotMatch(source, /\/Users\//);
});

test('local runner plan accepts only a private local-loopback HTTPS binding', () => {
  const fixture = writePrivateBinding();
  const plan = localRunner.buildLocalRunnerPlan(fixture.file, { generatedAtUtc: '2026-09-18T00:00:00Z' });
  assert.equal(plan.status, 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED');
  assert.equal(plan.bindingSha256, fixture.bindingSha256);
  assert.equal(plan.target.origin, 'https://127.0.0.1:4443');
  assert.equal(plan.target.port, 4443);
  assert.equal(plan.guards.liveRunAuthorizedNow, false);
  assert.equal(plan.guards.maxIssuerRequests, 1);
  assert.equal(plan.guards.maxDisabledUploadRequests, 1);
  assert.equal(plan.guards.requestBodyBytes, 0);
  assert.equal(plan.authority.liveRunAuthorized, false);
  assert.equal(plan.authority.uploadActivation, false);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});

test('local runner rejects reviewed preview bindings for this gate', () => {
  const fixture = writePrivateBinding(binding({
    target: {
      kind: 'reviewed-preview-https',
      exactOrigin: 'https://cad-browser-session-preview.example.invalid',
      localOnly: undefined,
      tls: undefined,
      browser: undefined,
    },
  }));
  assert.throws(() => localRunner.buildLocalRunnerPlan(fixture.file), /LOCAL_RUNNER_TARGET_KIND_INVALID/);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});

test('execution requires exact binding and acceptance receipt digests', async () => {
  const fixture = writePrivateBinding();
  await assert.rejects(() => localRunner.executeLocalBrowserQualification(fixture.file, {
    acceptedBindingSha256: '0'.repeat(64),
    acceptedReceiptSha256: fixture.receiptSha256,
    now: () => Date.now(),
  }), /ACCEPTED_BINDING_SHA_MISMATCH/);
  await assert.rejects(() => localRunner.executeLocalBrowserQualification(fixture.file, {
    acceptedBindingSha256: fixture.bindingSha256,
    acceptedReceiptSha256: '0'.repeat(64),
    now: () => Date.now(),
  }), /ACCEPTANCE_RECEIPT_SHA_MISMATCH/);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});

test('execution uses fake adapters to prove success evidence without launching browser', async () => {
  const fixture = writePrivateBinding();
  let closed = false;
  const evidence = await localRunner.executeLocalBrowserQualification(fixture.file, {
    acceptedBindingSha256: fixture.bindingSha256,
    acceptedReceiptSha256: fixture.receiptSha256,
    now: () => Date.now(),
    serverStarter: async () => ({
      authHeader: 'Bearer redacted-test-token',
      bodyReads: 0,
      resolveCalls: 1,
      close: async () => { closed = true; },
    }),
    browserRunner: async ({ target, authHeader }) => {
      assert.equal(target.origin, 'https://127.0.0.1:4443');
      assert.equal(authHeader, 'Bearer redacted-test-token');
      return {
        issuerStatus: 200,
        issuerCode: 'SESSION_READY',
        uploadStatus: 503,
        uploadCode: 'USER_UPLOADS_DISABLED',
        browserCookiesObserved: true,
      };
    },
  });
  assert.equal(closed, true);
  assert.equal(evidence.status, 'DEVELOPMENT_BROWSER_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(evidence.runCompleted, true);
  assert.equal(evidence.unknownOutcome, false);
  assert.equal(evidence.cadUploadsDisabled, true);
  assert.equal(evidence.bodyAdmissionAuthorized, false);
  assert.equal(evidence.conversionAllowed, false);
  assert.equal(evidence.sandboxDispatchAllowed, false);
  assert.equal(evidence.privateCadUsed, false);
  assert.equal(evidence.retry, false);
  assert.equal(evidence.secondRun, false);
  assert.equal(evidence.operationCounts.issuerRequests, 1);
  assert.equal(evidence.operationCounts.disabledUploadRequests, 1);
  assert.equal(evidence.operationCounts.bodyReads, 0);
  assert.equal(evidence.rawAuthorizationRecorded, false);
  assert.equal(evidence.rawCookieRecorded, false);
  assert.equal(evidence.rawCsrfRecorded, false);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});

test('execution fails closed on unexpected disabled upload result and still closes server', async () => {
  const fixture = writePrivateBinding();
  let closed = false;
  await assert.rejects(() => localRunner.executeLocalBrowserQualification(fixture.file, {
    acceptedBindingSha256: fixture.bindingSha256,
    acceptedReceiptSha256: fixture.receiptSha256,
    now: () => Date.now(),
    serverStarter: async () => ({
      authHeader: 'Bearer redacted-test-token',
      bodyReads: 0,
      resolveCalls: 1,
      close: async () => { closed = true; },
    }),
    browserRunner: async () => ({
      issuerStatus: 200,
      issuerCode: 'SESSION_READY',
      uploadStatus: 200,
      uploadCode: 'UNEXPECTED_OPEN',
    }),
  }), /DISABLED_UPLOAD_CHECK_FAILED/);
  assert.equal(closed, true);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});

test('cli prints sanitized plan and rejects malformed execute arguments before browser work', () => {
  const fixture = writePrivateBinding();
  const planRun = spawnSync(process.execPath, ['scripts/cad-dev-browser-session-local-runner.js', '--plan', fixture.file],
    { encoding: 'utf8' });
  assert.equal(planRun.status, 0, planRun.stderr);
  const plan = JSON.parse(planRun.stdout);
  assert.equal(plan.status, 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED');
  assert.equal(plan.target.origin, 'https://127.0.0.1:4443');
  assert.doesNotMatch(planRun.stdout, /BEGIN PRIVATE KEY|Bearer |Cookie|us1\./);

  const executeRun = spawnSync(process.execPath, ['scripts/cad-dev-browser-session-local-runner.js',
    '--execute-approved-once', fixture.file, '--binding-sha256', fixture.bindingSha256],
  { encoding: 'utf8' });
  assert.notEqual(executeRun.status, 0);
  assert.match(executeRun.stderr, /ACCEPTANCE_RECEIPT_SHA_INVALID/);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});
