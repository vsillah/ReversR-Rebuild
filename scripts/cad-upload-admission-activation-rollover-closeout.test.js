const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const closeout = require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout.json');
const rollover = require('../offline/cad-convex/uploadAdmissionActivationWindowRollover.json');
const rebind = require('../offline/cad-convex/uploadAdmissionActivationRunnerRebind.json');
const docsSummary = require('../docs/cad-upload-admission-activation-rollover-closeout.json');
const { inspectUploadAdmissionActivationRolloverCloseout } =
  require('../offline/cad-convex/uploadAdmissionActivationRolloverCloseout');

const root = path.resolve(__dirname, '..');

test('closeout binds the successful rollover run and evidence hashes', () => {
  const result = inspectUploadAdmissionActivationRolloverCloseout(closeout, rollover, rebind);
  assert.equal(result.structureValid, true);
  assert.equal(result.sourceBound, true);
  assert.equal(result.hashesValid, true);
  assert.equal(result.resultValid, true);
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    '29be0ace835239dcaa46ebdb71b247a850b360e072a7043f446b0a418c7e4a8f');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '298f25e13ca43aee29432954853bd4cc13924b2c39c3767a70552575f313e847');
});

test('public synthetic body validation completed without downstream dispatch', () => {
  const result = inspectUploadAdmissionActivationRolloverCloseout(closeout, rollover, rebind);
  assert.equal(result.countsValid, true);
  assert.equal(result.flagsValid, true);
  assert.equal(closeout.runResult.bodyAdmissionValidated, true);
  assert.equal(closeout.operationCounts.uploadBodiesRead, 1);
  assert.equal(closeout.operationCounts.conversionDispatches, 0);
  assert.equal(closeout.operationCounts.sandboxDispatches, 0);
  assert.equal(closeout.operationCounts.storeMutations, 0);
});

test('production smoke and evidence custody remain fail-closed', () => {
  const result = inspectUploadAdmissionActivationRolloverCloseout(closeout, rollover, rebind);
  assert.equal(result.productionSmokeValid, true);
  assert.equal(result.evidenceCustodyValid, true);
  assert.equal(result.fixtureValid, true);
  assert.equal(closeout.productionFailClosedSmoke.userImport, '401 USER_SESSION_REQUIRED');
  assert.equal(closeout.productionFailClosedSmoke.import, '401 UNAUTHORIZED');
  assert.equal(closeout.sanitizedRunEvidence.fileMode, '600');
});

test('closeout qualifies only the bounded development synthetic upload path', () => {
  const result = inspectUploadAdmissionActivationRolloverCloseout(closeout, rollover, rebind);
  assert.equal(result.developmentSyntheticUploadPathQualified, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
  for (const [gate, value] of Object.entries(closeout.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('checked-in route stays disabled and isolated from closeout source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /uploadAdmissionActivationRolloverCloseout/);
});

test('docs preserve the production and conversion boundary', () => {
  const markdown = fs.readFileSync(
    path.join(root, 'docs/cad-upload-admission-activation-rollover-closeout.md'),
    'utf8',
  );
  assert.equal(docsSummary.runCompleted, true);
  assert.equal(docsSummary.unknownOutcome, false);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.equal(docsSummary.conversionAuthorized, false);
  assert.match(markdown, /does not mean uploads are enabled/i);
  assert.match(markdown, /source-only development conversion and Sandbox readiness decision/i);
});

test('closeout inspector remains local and provider-free', () => {
  const source = fs.readFileSync(
    path.join(root, 'offline/cad-convex/uploadAdmissionActivationRolloverCloseout.js'),
    'utf8',
  );
  assert.doesNotMatch(source,
    /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
