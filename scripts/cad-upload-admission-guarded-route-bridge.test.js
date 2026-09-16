const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { emptyState } = require('../offline/cad-convex/sharedUploadControls');
const qualificationWindow = require('../docs/cad-upload-admission-qualification-window.json');
const plan = require('../docs/cad-upload-admission-durable-adapter-plan.json');
const disabledAdapterManifest = require('../offline/cad-convex/disabledUploadAdmissionAdapter.json');
const readiness = require('../offline/cad-convex/userUploadActivationReadiness.json');
const runManifest = require('../docs/cad-upload-activation-run-manifest.json');
const bridgeManifest = require('../offline/cad-convex/uploadAdmissionGuardedRouteBridge.json');
const {
  validateQualificationWindow,
  createUploadAdmissionGuardedRouteBridge,
} = require('../offline/cad-convex/uploadAdmissionGuardedRouteBridge');

const root = path.resolve(__dirname, '..');
const policy = () => ({
  schemaVersion: 1,
  windowId: 'bridge-window',
  windowStart: 100,
  windowEnd: 10000,
  userConcurrency: 1,
  shopConcurrency: 1,
  userAttempts: 1,
  shopAttempts: 1,
  leaseMs: 1000,
  maxReservationMicros: 100,
  budgetMicros: 100,
  currency: 'USD',
});
const binding = () => ({
  userId: 'bridge-user',
  shopId: 'bridge-shop',
  sessionId: 'bridge-session',
  loginSessionId: 'bridge-login',
});
const authority = () => ({ ...binding(), revision: 1, expiresAt: 9000, allowed: true, active: true });
const reserve = () => ({ type: 'reserve', binding: binding(), key: 'bridge-attempt', reservationMicros: 100 });

function bridge(overrides = {}) {
  return createUploadAdmissionGuardedRouteBridge({
    qualificationWindow,
    plan,
    disabledAdapterManifest,
    readiness,
    runManifest,
    ...overrides,
  });
}

test('qualification window must remain closed before bridge dry-run', () => {
  assert.deepEqual(validateQualificationWindow(qualificationWindow), { ok: true, code: 'QUALIFICATION_WINDOW_CLOSED' });
  assert.equal(validateQualificationWindow({ ...qualificationWindow, bodyAdmissionAuthorized: true }).code,
    'QUALIFICATION_WINDOW_NOT_CLOSED');
  assert.equal(validateQualificationWindow({ ...qualificationWindow,
    qualificationBounds: { ...qualificationWindow.qualificationBounds, acceptedNow: true } }).code,
    'QUALIFICATION_WINDOW_NOT_CLOSED');
});

test('unaccepted bridge returns disabled route decision only', () => {
  const model = bridge();
  assert.equal(model.ok, true);
  assert.equal(model.runtimeMounted, false);
  assert.equal(model.bridgeEnabled, false);
  assert.equal(model.bodyAdmissionAuthorized, false);
  assert.deepEqual(model.planRouteDecision({ bodyAdmissionAuthorized: false }), {
    ok: false,
    code: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
  });
  assert.equal(model.planRouteDecision({ bodyAdmissionAuthorized: true }).code, 'BODY_ADMISSION_MUST_REMAIN_FALSE');
});

test('accepted dry-run can preview shared-control proposal without live authority', () => {
  const model = bridge({ bridgeEnabled: true, acceptedWindow: true });
  const planned = model.planRouteDecision({
    bodyAdmissionAuthorized: false,
    dryRun: true,
    snapshot: emptyState(policy()),
    command: reserve(),
    authority: authority(),
    now: 101,
  });
  assert.equal(planned.code, 'SOURCE_ONLY_TRANSACTION_PROPOSAL');
  assert.equal(planned.status, 'reserved');
  assert.equal(planned.admissionAuthorized, false);
  assert.equal(planned.conversionAuthorized, false);
  assert.equal(planned.sandboxDispatchAuthorized, false);
  assert.equal(planned.storeMutationAuthorized, false);
});

test('bridge manifest stays disabled and points to runtime review as next source-only slice', () => {
  assert.equal(bridgeManifest.mode, 'source-only-cad-upload-admission-guarded-route-bridge');
  assert.equal(bridgeManifest.enabled, false);
  assert.equal(bridgeManifest.runtimeMounted, false);
  assert.equal(bridgeManifest.bodyAdmissionAuthorized, false);
  assert.equal(bridgeManifest.routeTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.ok(Object.values(bridgeManifest.authorityPreserved).every(value => value === false));
  assert.equal(bridgeManifest.nextSafeAction.branch, 'codex/cad-upload-admission-runtime-bridge-review');
});

test('runtime route remains unmounted and literal-false disabled', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(route, /uploadAdmissionGuardedRouteBridge|cad-upload-admission-guarded-route-bridge/);
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) {
          const source = fs.readFileSync(name, 'utf8');
          assert.doesNotMatch(source, /uploadAdmissionGuardedRouteBridge|cad-upload-admission-guarded-route-bridge/);
        }
      }
    };
    visit(path.join(root, directory));
  }
});
