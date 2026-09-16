const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readiness = require('../offline/cad-convex/userUploadActivationReadiness.json');
const runManifest = require('../docs/cad-upload-activation-run-manifest.json');
const adapterManifest = require('../offline/cad-convex/disabledUploadAdmissionAdapter.json');
const { REQUIRED_REFS, validateReadiness, validateRunManifest,
  createDisabledAdmissionAdapter } = require('../offline/cad-convex/disabledUploadAdmissionAdapter');

const root = path.resolve(__dirname, '..');

test('adapter validates the reviewed manifest refs while keeping readiness closed', () => {
  assert.deepEqual(validateReadiness(readiness), { ok: true, code: 'READINESS_CLOSED' });
  assert.deepEqual(validateRunManifest(runManifest), { ok: true, code: 'RUN_MANIFEST_CLOSED' });
  assert.equal(readiness.gates.providerReadiness.evidence.reviewedExactCommandManifest, REQUIRED_REFS.commandManifest);
  assert.equal(readiness.gates.rollback.evidence.namedExecutorAndBackup, REQUIRED_REFS.operators);
  assert.equal(readiness.gates.activation.evidence.boundedRunAndCostManifest, REQUIRED_REFS.runManifest);
  for (const gate of Object.values(readiness.gates)) assert.equal(gate.approved, false);
  assert.ok(Object.values(readiness.authority).every(value => value === null));
});

test('disabled adapter can only return USER_UPLOADS_DISABLED and never grants dispatch authority', () => {
  const adapter = createDisabledAdmissionAdapter({ readiness, runManifest });
  assert.equal(adapter.ok, true);
  assert.equal(adapter.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(adapter.admissionAuthorized, false);
  assert.equal(adapter.conversionAuthorized, false);
  assert.equal(adapter.sandboxDispatchAuthorized, false);
  assert.deepEqual(adapter.planAdmission(), {
    ok: false,
    code: 'USER_UPLOADS_DISABLED',
    admissionAuthorized: false,
    conversionAuthorized: false,
    sandboxDispatchAuthorized: false,
  });
  assert.equal(createDisabledAdmissionAdapter({ readiness, runManifest, bodyAdmissionAuthorized: true }).code,
    'BODY_ADMISSION_MUST_REMAIN_FALSE');
});

test('adapter manifest is closed and runtime route remains literal-false disabled', () => {
  assert.equal(adapterManifest.mode, 'source-only-disabled-upload-admission-adapter');
  assert.equal(adapterManifest.enabled, false);
  assert.equal(adapterManifest.liveReady, false);
  assert.equal(adapterManifest.runtimeImported, false);
  assert.equal(adapterManifest.bodyAdmissionAuthorized, false);
  assert.equal(adapterManifest.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.ok(Object.values(adapterManifest.authorityPreserved).every(value => value === false));
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(route, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(route, /disabledUploadAdmissionAdapter|createDisabledAdmissionAdapter/);
});

test('runtime source does not import the source-only disabled adapter', () => {
  for (const directory of ['server', 'app', 'hooks', 'components', 'convex']) {
    const visit = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(name);
        else if (/\.[cm]?[jt]sx?$/.test(name)) {
          const source = fs.readFileSync(name, 'utf8');
          assert.doesNotMatch(source, /disabledUploadAdmissionAdapter|source-only-disabled-upload-admission-adapter/);
        }
      }
    };
    visit(path.join(root, directory));
  }
});
