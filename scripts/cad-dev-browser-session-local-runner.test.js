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
  return { dir, file, bytes };
}

test('packet remains source-only and blocks execution authority', () => {
  assert.equal(packet.status, 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED_NO_RUN');
  assert.equal(packet.runner.executableAuthorityNow, false);
  assert.equal(packet.runner.startsServer, false);
  assert.equal(packet.runner.opensBrowser, false);
  assert.equal(packet.runner.sendsNetworkRequest, false);
  assert.equal(packet.runner.acceptsExecuteFlagNow, false);
  for (const value of Object.values(packet.authority)) assert.equal(value, false);
  assert.match(docs, /does not start the server/);
  assert.match(docs, /Execution remains blocked/);
});

test('runner source stays inert and source safe', () => {
  assert.doesNotMatch(source, /fetch\s*\(|https?\.request|require\(['"]express['"]\)|playwright|puppeteer|process\.env/);
  assert.doesNotMatch(source, /Bearer |Cookie|Set-Cookie|X-Upload-CSRF|BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
  assert.doesNotMatch(source, /\/Users\//);
});

test('local runner plan accepts only a private local-loopback HTTPS binding', () => {
  const fixture = writePrivateBinding();
  const plan = localRunner.buildLocalRunnerPlan(fixture.file, { generatedAtUtc: '2026-09-18T00:00:00Z' });
  assert.equal(plan.status, 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED');
  assert.equal(plan.bindingSha256, sha256(fixture.bytes));
  assert.equal(plan.target.origin, 'https://127.0.0.1:4443');
  assert.equal(plan.target.port, 4443);
  assert.equal(plan.guards.executeFlagAcceptedNow, false);
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

test('cli prints sanitized plan and refuses execution flags', () => {
  const fixture = writePrivateBinding();
  const planRun = spawnSync(process.execPath, ['scripts/cad-dev-browser-session-local-runner.js', '--plan', fixture.file],
    { encoding: 'utf8' });
  assert.equal(planRun.status, 0, planRun.stderr);
  const plan = JSON.parse(planRun.stdout);
  assert.equal(plan.status, 'SOURCE_READY_LOCAL_BROWSER_RUNNER_REVIEWED');
  assert.equal(plan.target.origin, 'https://127.0.0.1:4443');
  assert.equal(plan.liveRunAuthorized, undefined);
  assert.doesNotMatch(planRun.stdout, /BEGIN PRIVATE KEY|Bearer |Cookie|us1\./);

  const executeRun = spawnSync(process.execPath, ['scripts/cad-dev-browser-session-local-runner.js', '--execute-approved-once', fixture.file],
    { encoding: 'utf8' });
  assert.notEqual(executeRun.status, 0);
  assert.match(executeRun.stderr, /LOCAL_BROWSER_EXECUTION_NOT_AUTHORIZED_IN_SOURCE_PACKET/);
  fs.rmSync(fixture.dir, { recursive: true, force: true });
});
