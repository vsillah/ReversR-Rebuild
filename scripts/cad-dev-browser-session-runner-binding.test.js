const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const runner = require('./cad-dev-browser-session-runner-binding');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync('scripts/cad-dev-browser-session-runner-binding.js', 'utf8');
const packet = JSON.parse(fs.readFileSync('docs/cad-dev-browser-session-runner-binding.json', 'utf8'));
const docs = fs.readFileSync('docs/cad-dev-browser-session-runner-binding.md', 'utf8');

function binding(overrides = {}) {
  const now = Date.now();
  const base = {
    schemaVersion: 1,
    mode: 'cad-dev-browser-session-qualification-run-binding',
    runId: 'cad-browser-session-fixture',
    sourceCommit: 'a7ed32a15b5082dca7bad0b24d2500e5e7151923',
    packet: {
      dependsOnPr: 315,
      mergeCommit: runner.expectedPacket.mergeCommit,
      packetMergeCommit: runner.expectedPacket.packetMergeCommit,
      markdownSha256: runner.expectedPacket.markdownSha256,
      jsonSha256: runner.expectedPacket.jsonSha256,
    },
    target: {
      exactOrigin: 'https://cad-browser-session-preview.example.invalid',
      exactBrowserRoute: '/cad/browser-session-qualification',
      sourceCommit: 'a7ed32a15b5082dca7bad0b24d2500e5e7151923',
      productionSmokeReceiptSha256: 'a'.repeat(64),
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
    authority: Object.fromEntries(runner.falseAuthorityKeys.map(key => [key, false])),
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

test('packet remains source-only and does not authorize a run', () => {
  assert.equal(packet.status, 'SOURCE_READY_RUN_BLOCKED_PENDING_ACCEPTED_BINDING');
  assert.equal(packet.runner.executableAuthorityNow, false);
  assert.equal(packet.runner.startsServer, false);
  assert.equal(packet.runner.opensBrowser, false);
  assert.equal(packet.runner.sendsNetworkRequest, false);
  for (const value of Object.values(packet.authority)) assert.equal(value, false);
  assert.match(docs, /No browser run, live request/);
  assert.match(docs, /If a reviewed\s+non-production HTTPS target is unavailable, stop at binding prep/);
});

test('runner source stays inert and source safe', () => {
  assert.doesNotMatch(source, /fetch\s*\(|https?\.request|child_process|process\.env/);
  assert.doesNotMatch(source, /Bearer |Cookie|Set-Cookie|X-Upload-CSRF|BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
  assert.doesNotMatch(source, /\/Users\//);
});

test('valid binding is accepted for review and exposes only sanitized metadata', () => {
  const accepted = binding();
  const validated = runner.validateRunBinding(accepted);
  assert.equal(validated.origin, accepted.target.exactOrigin);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-browser-binding-'));
  fs.chmodSync(dir, 0o700);
  const file = path.join(dir, 'run-binding.json');
  const bytes = JSON.stringify(accepted, null, 2) + '\n';
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  const inspected = runner.inspectBindingFile(file);
  assert.equal(inspected.status, 'BROWSER_SESSION_BINDING_ACCEPTED_FOR_REVIEW');
  assert.equal(inspected.bindingSha256, sha256(bytes));
  assert.equal(inspected.liveRunAuthorized, false);
  assert.equal(inspected.bodyAdmissionAuthorized, false);
  assert.equal(inspected.privateCadUsed, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('binding rejects production, loopback, unresolved packet and widened authority', () => {
  assert.throws(() => runner.validateRunBinding(binding({
    target: { exactOrigin: 'https://reversr.vercel.app' },
  })), /TARGET_ORIGIN_PRODUCTION_FORBIDDEN/);
  assert.throws(() => runner.validateRunBinding(binding({
    target: { exactOrigin: 'http://127.0.0.1:3000' },
  })), /TARGET_ORIGIN_NOT_HTTPS/);
  assert.throws(() => runner.validateRunBinding(binding({
    packet: { markdownSha256: '0'.repeat(64) },
  })), /PACKET_EXPECTED_DIGEST_INVALID/);
  assert.throws(() => runner.validateRunBinding(binding({
    authority: { uploadActivation: true },
  })), /AUTHORITY_uploadActivation_MUST_BE_FALSE/);
  assert.throws(() => runner.validateRunBinding(binding({
    limits: { requestBodyBytes: 1 },
  })), /LIMIT_requestBodyBytes_INVALID/);
  assert.throws(() => runner.validateRunBinding(binding({
    cost: { maxCostUsd: 1 },
  })), /COST_INVALID/);
});

test('binding file must be absolute, normalized, local private file under private directory', () => {
  assert.throws(() => runner.assertPrivateBindingFile('relative.json'), /BINDING_PATH_INVALID/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-browser-binding-mode-'));
  fs.chmodSync(dir, 0o755);
  const file = path.join(dir, 'run-binding.json');
  fs.writeFileSync(file, JSON.stringify(binding(), null, 2) + '\n', { mode: 0o600 });
  assert.throws(() => runner.inspectBindingFile(file), /BINDING_DIRECTORY_MODE_INVALID/);
  fs.chmodSync(dir, 0o700);
  fs.chmodSync(file, 0o644);
  assert.throws(() => runner.inspectBindingFile(file), /BINDING_FILE_MODE_INVALID/);
  fs.rmSync(dir, { recursive: true, force: true });
});
