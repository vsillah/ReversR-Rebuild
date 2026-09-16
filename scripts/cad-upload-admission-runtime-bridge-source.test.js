const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json');
const review = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeReview.json');
const { createCadUploadAdmissionRuntimeBridge } = require('../server/cadUploadAdmissionRuntimeBridge');

const root = path.resolve(__dirname, '..');
const principal = () => Object.freeze({
  schemaVersion: 1,
  userId: 'runtime-user',
  shopId: 'runtime-shop',
  sessionId: 'runtime-session',
  cadUploadAllowed: true,
});

test('runtime bridge source is disabled by default and not mounted', async () => {
  const bridge = createCadUploadAdmissionRuntimeBridge();
  assert.equal(bridge.sourceOnly, true);
  assert.equal(bridge.runtimeMounted, false);
  assert.equal(bridge.bodyAdmissionAuthorized, false);
  assert.deepEqual(await bridge.planAdmission({ bodyAdmissionAuthorized: false }), {
    ok: false,
    code: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    bodyReadAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
    storeMutationAuthorized: false,
  });
  assert.equal((await bridge.planAdmission({ bodyAdmissionAuthorized: true })).code,
    'BODY_ADMISSION_MUST_REMAIN_FALSE');
});

test('accepted dry-run path requires a validated upload-session principal', async () => {
  let plannerCalled = false;
  const bridge = createCadUploadAdmissionRuntimeBridge({
    enabled: true,
    acceptedWindow: true,
    planTransaction() { plannerCalled = true; },
  });
  assert.equal((await bridge.planAdmission({ bodyAdmissionAuthorized: false, dryRun: true })).code,
    'SESSION_CONTEXT_REQUIRED');
  assert.equal(plannerCalled, false);
});

test('accepted dry-run path preserves false upload, conversion, Sandbox and store authority', async () => {
  let received;
  const bridge = createCadUploadAdmissionRuntimeBridge({
    enabled: true,
    acceptedWindow: true,
    planTransaction(input) {
      received = input;
      return {
        ok: true,
        code: 'SOURCE_ONLY_RUNTIME_BRIDGE_DRY_RUN_PROPOSAL',
        admissionAuthorized: false,
        conversionAuthorized: false,
        sandboxDispatchAuthorized: false,
        storeMutationAuthorized: false,
      };
    },
  });
  const result = await bridge.planAdmission({
    bodyAdmissionAuthorized: false,
    dryRun: true,
    principal: principal(),
    snapshot: { ledger: [] },
    command: { type: 'reserve' },
    authority: { revision: 1 },
    now: 1000,
  });
  assert.equal(result.code, 'SOURCE_ONLY_RUNTIME_BRIDGE_DRY_RUN_PROPOSAL');
  assert.equal(result.bodyReadAuthorized, false);
  assert.equal(result.runtimeMounted, false);
  assert.equal(received.bodyAdmissionAuthorized, false);
  assert.equal(received.dryRun, true);
  assert.deepEqual(received.principal, { schemaVersion: 1, userId: 'runtime-user',
    shopId: 'runtime-shop', sessionId: 'runtime-session' });
});

test('unsafe dry-run proposals are rejected', async () => {
  const unsafeKeys = ['admissionAuthorized', 'conversionAuthorized', 'sandboxDispatchAuthorized', 'storeMutationAuthorized'];
  for (const key of unsafeKeys) {
    const bridge = createCadUploadAdmissionRuntimeBridge({
      enabled: true,
      acceptedWindow: true,
      planTransaction() {
        return {
          ok: true,
          admissionAuthorized: false,
          conversionAuthorized: false,
          sandboxDispatchAuthorized: false,
          storeMutationAuthorized: false,
          [key]: true,
        };
      },
    });
    assert.equal((await bridge.planAdmission({ bodyAdmissionAuthorized: false, dryRun: true,
      principal: principal() })).code, 'UNSAFE_PROPOSAL_REJECTED', key);
  }
});

test('manifest binds source to review packet and preserves all authorities closed', () => {
  assert.equal(manifest.mode, 'source-only-cad-upload-admission-runtime-bridge-source');
  assert.equal(manifest.runtimeBridgeSourceImplemented, true);
  assert.equal(manifest.runtimeBridgeMountedNow, false);
  assert.equal(manifest.enabledByDefault, false);
  assert.equal(manifest.bodyAdmissionAuthorized, false);
  assert.equal(manifest.source, 'server/cadUploadAdmissionRuntimeBridge.js');
  assert.equal(manifest.sourceBindings.runtimeBridgeReview, 'offline/cad-convex/uploadAdmissionRuntimeBridgeReview.json');
  assert.equal(review.nextSafeAction.branch, 'codex/cad-upload-admission-runtime-bridge-source');
  assert.ok(Object.values(manifest.authorityPreserved).every(value => value === false));
});

test('mounted route still does not import the runtime bridge source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /if \(!BODY_ADMISSION_AUTHORIZED\) return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('runtime bridge source remains provider-free and secret-free', () => {
  const source = fs.readFileSync(path.join(root, 'server/cadUploadAdmissionRuntimeBridge.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\.|require\(['"]crypto['"]\)/);
});
