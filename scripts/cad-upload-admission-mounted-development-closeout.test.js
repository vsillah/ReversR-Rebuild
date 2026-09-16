const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const closeout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-mounted-development-closeout.json');
const { inspectUploadAdmissionMountedDevelopmentCloseout } =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout');

const root = path.resolve(__dirname, '..');
const markdown = fs.readFileSync(
  path.join(root, 'docs/cad-upload-admission-mounted-development-closeout.md'),
  'utf8',
);

test('mounted-development closeout records the accepted PR #287 run and evidence hashes', () => {
  const result = inspectUploadAdmissionMountedDevelopmentCloseout(closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.hashesValid, true);
  assert.equal(closeout.mode, 'source-only-cad-upload-admission-mounted-development-closeout');
  assert.equal(closeout.status, 'MOUNTED_DEVELOPMENT_UPLOAD_ADMISSION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.developmentDeployment, 'local-mounted-development-harness');
  assert.equal(closeout.sourcePr, 287);
  assert.equal(closeout.mergedMainCommit, '8bcbca81d24aa0f483bbc7a95274a6590fab56ef');
  assert.equal(closeout.executorBridgeCommit, '379e47aa8ece3bf1608ef7324bdfc852ed37826e');
  assert.equal(closeout.runRef, 'rrb-ref:cad-upload-admission-mounted-development-1800z');
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    'a4e4fdeea9e874c295b63a61da9ab2b88c2cf4aaa2a06ed980000ed785436b75');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '915cc8dd609d3e55ca94146459f2b47940dadf888204b40534449ea658117e7a');
});

test('mounted-development run completed once without activation, conversion, Sandbox, stores or retry', () => {
  const result = inspectUploadAdmissionMountedDevelopmentCloseout(closeout);
  assert.equal(result.resultValid, true);
  assert.equal(result.countsValid, true);
  assert.equal(result.flagsValid, true);
  assert.equal(closeout.runResult.decision, 'UPLOAD_ADMISSION_MOUNTED_DEVELOPMENT_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(closeout.runResult.bodyAdmissionValidated, true);
  assert.equal(closeout.operationCounts.mountedRouteDisabledChecks, 2);
  assert.equal(closeout.operationCounts.mountedDevelopmentBodyValidationChecks, 1);
  assert.equal(closeout.operationCounts.uploadBodiesRead, 1);
  assert.equal(closeout.operationCounts.conversionDispatches, 0);
  assert.equal(closeout.operationCounts.sandboxDispatches, 0);
  assert.equal(closeout.operationCounts.storeMutations, 0);
  assert.equal(closeout.runFlags.automaticRetry, false);
  assert.equal(closeout.runFlags.secondRun, false);
});

test('production route smoke and evidence custody remain fail-closed and source-safe', () => {
  const result = inspectUploadAdmissionMountedDevelopmentCloseout(closeout);
  assert.equal(result.productionSmokeValid, true);
  assert.equal(result.evidenceCustodyValid, true);
  assert.equal(closeout.productionFailClosedSmoke.userImport, '401 USER_SESSION_REQUIRED');
  assert.equal(closeout.productionFailClosedSmoke.import, '401 UNAUTHORIZED');
  assert.equal(closeout.sanitizedRunEvidence.gitIgnored, true);
  assert.equal(closeout.sanitizedRunEvidence.directoryMode, '700');
  assert.equal(closeout.sanitizedRunEvidence.fileMode, '600');
  assert.equal(closeout.sanitizedRunEvidence.recordsContentBase64, false);
  assert.equal(closeout.sanitizedRunEvidence.recordsRawCredential, false);
  assert.equal(closeout.sanitizedRunEvidence.recordsPrivateCad, false);
});

test('closeout grants no activation, provider, mutation, production, retry or cleanup authority', () => {
  const result = inspectUploadAdmissionMountedDevelopmentCloseout(closeout);
  assert.equal(result.authoritiesClosed, true);
  for (const [gate, value] of Object.entries(closeout.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation
    .includes('explicit approval for any production or development upload activation'));
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation
    .includes('separate conversion and Sandbox dispatch approval'));
  assert.match(closeout.nextSafeAction.scope, /activation-readiness evidence chain/);
  assert.match(closeout.nextSafeAction.stopBefore, /production upload activation/);
});

test('docs summary matches the closeout and does not overclaim readiness', () => {
  assert.equal(docsSummary.evidenceSha256, closeout.sanitizedRunEvidence.evidenceSha256);
  assert.equal(docsSummary.receiptSha256, closeout.sanitizedRunEvidence.receiptSha256);
  assert.equal(docsSummary.authority.cadUploadActivationAuthorized, false);
  assert.equal(docsSummary.authority.conversionAuthorized, false);
  assert.match(markdown, /does not prove user-facing CAD upload readiness/i);
  assert.match(markdown, /checked-in user upload\s+route remains disabled/i);
  assert.match(markdown, /conversion dispatches: 0/i);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});

test('mounted route remains disabled and isolated from closeout source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route,
    /uploadAdmissionMountedDevelopmentCloseout|cad-upload-admission-mounted-development-closeout/);
});
