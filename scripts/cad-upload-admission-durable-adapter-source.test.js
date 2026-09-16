const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { emptyState } = require('../offline/cad-convex/sharedUploadControls');
const plan = require('../docs/cad-upload-admission-durable-adapter-plan.json');
const readiness = require('../offline/cad-convex/userUploadActivationReadiness.json');
const runManifest = require('../docs/cad-upload-activation-run-manifest.json');
const disabledManifest = require('../offline/cad-convex/disabledUploadAdmissionAdapter.json');
const adapterManifest = require('../offline/cad-convex/uploadAdmissionDurableAdapter.json');
const {
  validateDurableAdapterPlan,
  createUploadAdmissionDurableAdapter,
} = require('../offline/cad-convex/uploadAdmissionDurableAdapter');

const root = path.resolve(__dirname, '..');
const policy = () => ({
  schemaVersion: 1,
  windowId: 'source-window',
  windowStart: 100,
  windowEnd: 10000,
  userConcurrency: 1,
  shopConcurrency: 1,
  userAttempts: 2,
  shopAttempts: 2,
  leaseMs: 1000,
  maxReservationMicros: 100,
  budgetMicros: 200,
  currency: 'USD',
});
const binding = () => ({
  userId: 'source-user',
  shopId: 'source-shop',
  sessionId: 'source-session',
  loginSessionId: 'source-login',
});
const authority = () => ({ ...binding(), revision: 1, expiresAt: 9000, allowed: true, active: true });
const reserve = () => ({ type: 'reserve', binding: binding(), key: 'source-attempt', reservationMicros: 100 });
const fence = r => ({ type: 'fence', binding: binding(), key: 'source-attempt', fence: r.fence });
const unknown = r => ({ type: 'unknown', binding: binding(), key: 'source-attempt', fence: r.fence });
const reconcile = r => ({
  type: 'reconcile',
  binding: binding(),
  key: 'source-attempt',
  fence: r.fence,
  outcome: 'completed',
  actualMicros: 80,
});

test('adapter validates the reviewed plan and disabled rollback target', () => {
  assert.deepEqual(validateDurableAdapterPlan(plan, disabledManifest, readiness, runManifest),
    { ok: true, code: 'DURABLE_ADAPTER_PLAN_CLOSED' });
  assert.equal(validateDurableAdapterPlan({ ...plan, executableNow: true }, disabledManifest, readiness, runManifest).code,
    'DURABLE_ADAPTER_PLAN_NOT_CLOSED');
  assert.equal(validateDurableAdapterPlan(plan, { ...disabledManifest, enabled: true }, readiness, runManifest).code,
    'DISABLED_ROLLBACK_TARGET_NOT_CLOSED');
});

test('normal adapter calls fall back to USER_UPLOADS_DISABLED with no authority', () => {
  const adapter = createUploadAdmissionDurableAdapter({ plan, disabledAdapterManifest: disabledManifest, readiness, runManifest });
  assert.equal(adapter.ok, true);
  assert.equal(adapter.sourceOnly, true);
  assert.equal(adapter.runtimeImported, false);
  assert.equal(adapter.routeTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(adapter.admissionAuthorized, false);
  assert.deepEqual(adapter.disabledRollback(), {
    ok: false,
    code: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
  });
  assert.equal(adapter.planTransaction({ snapshot: emptyState(policy()), command: reserve(), authority: authority(), now: 101 }).code,
    'USER_UPLOADS_DISABLED');
  assert.equal(adapter.planTransaction({ snapshot: emptyState(policy()), command: reserve(), authority: authority(), now: 101,
    dryRun: true, bodyAdmissionAuthorized: true }).code, 'BODY_ADMISSION_MUST_REMAIN_FALSE');
});

test('dry-run transaction proposals use shared controls without granting live authority', () => {
  const adapter = createUploadAdmissionDurableAdapter({ plan, disabledAdapterManifest: disabledManifest, readiness, runManifest });
  let state = emptyState(policy());
  const reserved = adapter.planTransaction({ snapshot: state, command: reserve(), authority: authority(), now: 101, dryRun: true });
  assert.equal(reserved.code, 'SOURCE_ONLY_TRANSACTION_PROPOSAL');
  assert.equal(reserved.status, 'reserved');
  assert.equal(reserved.admissionAuthorized, false);
  assert.equal(reserved.storeMutationAuthorized, false);
  state = reserved.state;
  const fenced = adapter.planTransaction({ snapshot: state, command: fence(reserved), authority: authority(), now: 102, dryRun: true });
  assert.equal(fenced.status, 'fenced');
  const uncertain = adapter.planTransaction({ snapshot: fenced.state, command: unknown(reserved), authority: null, now: 103, dryRun: true });
  assert.equal(uncertain.status, 'unknown');
  const selected = adapter.selectReconciliation({ state: uncertain.state, now: 1104, limit: 32, dryRun: true });
  assert.equal(selected.code, 'SOURCE_ONLY_RECONCILIATION_SELECTION');
  assert.equal(selected.selectors.length, 1);
  const settled = adapter.planTransaction({ snapshot: uncertain.state, command: reconcile(reserved), authority: null, now: 1105, dryRun: true });
  assert.equal(settled.status, 'settled');
  assert.equal(settled.conversionAuthorized, false);
  assert.equal(settled.sandboxDispatchAuthorized, false);
});

test('manifest records disabled source-only state and no future authority', () => {
  assert.equal(adapterManifest.mode, 'source-only-cad-upload-admission-durable-adapter-source');
  assert.equal(adapterManifest.enabled, false);
  assert.equal(adapterManifest.liveReady, false);
  assert.equal(adapterManifest.runtimeImported, false);
  assert.equal(adapterManifest.bodyAdmissionAuthorized, false);
  assert.equal(adapterManifest.routeTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.ok(Object.values(adapterManifest.authorityPreserved).every(value => value === false));
  assert.ok(adapterManifest.forbiddenOperations.includes('runtime route import'));
  assert.equal(adapterManifest.nextSafeAction.branch, 'codex/cad-upload-admission-qualification-window');
});

test('runtime source does not import the source-only durable adapter', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) {
          const source = fs.readFileSync(name, 'utf8');
          assert.doesNotMatch(source, /uploadAdmissionDurableAdapter|cad-upload-admission-durable-adapter-source/);
        }
      }
    };
    visit(path.join(root, directory));
  }
});
