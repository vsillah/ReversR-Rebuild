const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const plan = require('../docs/cad-upload-admission-durable-adapter-plan.json');
const disabledAdapterManifest = require('../offline/cad-convex/disabledUploadAdmissionAdapter.json');
const readiness = require('../offline/cad-convex/userUploadActivationReadiness.json');
const runManifest = require('../docs/cad-upload-activation-run-manifest.json');

const root = path.resolve(__dirname, '..');

test('durable adapter plan is source-only and preserves closed authority', () => {
  assert.equal(plan.mode, 'source-only-cad-upload-admission-durable-adapter-plan');
  assert.equal(plan.sourceOnly, true);
  assert.equal(plan.runtimeImported, false);
  assert.equal(plan.bodyAdmissionAuthorized, false);
  assert.equal(plan.executableNow, false);
  assert.equal(plan.liveRunAuthorizedNow, false);
  assert.equal(plan.target.currentTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(plan.target.route, 'POST /api/cad/user-import');
  assert.ok(Object.values(plan.planGates).every(value => value === false));
  assert.ok(Object.values(plan.authorityPreserved).every(value => value === false));
});

test('plan binds exact disabled rollback target and reviewed source refs', () => {
  assert.equal(disabledAdapterManifest.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(disabledAdapterManifest.enabled, false);
  assert.equal(disabledAdapterManifest.runtimeImported, false);
  assert.equal(plan.bindings.disabledAdapter.source, 'offline/cad-convex/disabledUploadAdmissionAdapter.js');
  assert.equal(plan.bindings.disabledAdapter.manifest, 'offline/cad-convex/disabledUploadAdmissionAdapter.json');
  assert.equal(plan.bindings.disabledAdapter.rollbackTarget, true);
  assert.equal(plan.bindings.activationReadiness.manifest, 'offline/cad-convex/userUploadActivationReadiness.json');
  assert.equal(plan.bindings.runManifest.manifest, 'docs/cad-upload-activation-run-manifest.json');
  assert.equal(plan.bindings.sharedControls.model, 'offline/cad-convex/sharedUploadControls.js');
  assert.equal(plan.bindings.sessionAuthority.source, 'docs/cad-dev-upload-session-successful-closeout.json');
});

test('bound readiness and run manifest remain closed before implementation', () => {
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.liveReady, false);
  assert.equal(readiness.executable, false);
  assert.equal(readiness.currentTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.ok(Object.values(readiness.gates).every(gate => gate.approved === false));
  assert.equal(runManifest.runManifest.allInPlanningCapUsd, 50);
  assert.equal(runManifest.runManifest.executableNow, false);
  assert.equal(runManifest.runManifest.activationApprovalAccepted, false);
  assert.equal(runManifest.runManifest.conversionAllowed, false);
  assert.equal(runManifest.runManifest.sandboxDispatchAllowed, false);
  assert.equal(runManifest.rollback.unknownReservationsRemainLocked, true);
  assert.equal(runManifest.rollback.rollbackCanDeleteRows, false);
});

test('durable design requires atomic reservation and no-delete rollback custody', () => {
  assert.deepEqual(plan.durableAdapterDesign.adapterMustWriteAtomically, [
    'admission reservation',
    'attempt accounting',
    'cost hold',
    'concurrency leases',
    'selector fence',
    'sanitized evidence reference',
  ]);
  assert.ok(plan.durableAdapterDesign.transactionRequirements.includes('serializable read of exact authority and ledger'));
  assert.ok(plan.durableAdapterDesign.transactionRequirements.includes('unknown commit outcome reconciliation by original selector only'));
  assert.ok(plan.durableAdapterDesign.rollbackCompatibility.includes('fall back to disabled adapter returning USER_UPLOADS_DISABLED'));
  assert.ok(plan.durableAdapterDesign.rollbackCompatibility.includes('never delete retained state without separate reviewed disposition'));
});

test('runtime stays closed and does not import the source-only plan', () => {
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
          assert.doesNotMatch(source, /cad-upload-admission-durable-adapter-plan|uploadAdmissionDurableAdapterPlan/);
        }
      }
    };
    visit(path.join(root, directory));
  }
});
