const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const closeout = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json');
const { inspectUploadAdmissionDevelopmentActivationCloseout } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout');

const root = path.resolve(__dirname, '..');

test('activation preview closeout records successful preview and evidence hashes', () => {
  const result = inspectUploadAdmissionDevelopmentActivationCloseout(closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.hashesValid, true);
  assert.equal(result.resultValid, true);
  assert.equal(closeout.result.previewCompleted, true);
  assert.equal(closeout.result.activationExecuted, false);
  assert.equal(closeout.result.liveRunStarted, false);
  assert.equal(closeout.result.unknownOutcome, false);
  assert.equal(closeout.evidence.sanitizedEvidenceSha256,
    '1e37b105c5adfd26ed4319bf0fed628d1b26b4cabd815dfe3f091c517cce9de6');
  assert.equal(closeout.evidence.sanitizedReceiptSha256,
    '1375b54ee2df2305138ee775f8906db81d94a45aa15d6cd12f7f62b991bbb3a2');
});

test('activation preview kept all execution authorities closed', () => {
  const result = inspectUploadAdmissionDevelopmentActivationCloseout(closeout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.uploadActivationAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
  assert.equal(closeout.result.bodyReadAuthorized, false);
  assert.equal(closeout.result.admissionAuthorized, false);
  assert.equal(closeout.result.storeMutationAuthorized, false);
  assert.equal(closeout.result.uploadBodiesRead, 0);
  assert.equal(closeout.result.conversionDispatches, 0);
  assert.equal(closeout.result.sandboxDispatches, 0);
  assert.equal(closeout.result.storeMutations, 0);
});

test('production smoke and evidence custody are recorded fail-closed', () => {
  const result = inspectUploadAdmissionDevelopmentActivationCloseout(closeout);
  assert.equal(result.productionSmokeValid, true);
  assert.equal(result.evidenceCustodyValid, true);
  assert.equal(closeout.productionFailClosedSmoke.userImport, '401 USER_SESSION_REQUIRED');
  assert.equal(closeout.productionFailClosedSmoke.import, '401 UNAUTHORIZED');
  assert.equal(closeout.evidence.directoryMode, '700');
  assert.equal(closeout.evidence.fileMode, '600');
  assert.equal(closeout.evidence.gitIgnored, true);
});

test('mounted production route stays disabled and isolated from closeout source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentActivationCloseout|cad-upload-admission-development-activation-closeout/);
  assert.doesNotMatch(route, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('closeout source remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
