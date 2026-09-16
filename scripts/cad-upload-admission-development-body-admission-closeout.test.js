const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const closeout = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-development-body-admission-closeout.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionCloseout } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout');

const root = path.resolve(__dirname, '..');
const markdown = fs.readFileSync(
  path.join(root, 'docs/cad-upload-admission-development-body-admission-closeout.md'),
  'utf8',
);

test('body-admission closeout records the accepted PR #283 run and evidence hashes', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(closeout);
  assert.equal(result.structureValid, true);
  assert.equal(result.hashesValid, true);
  assert.equal(closeout.mode, 'source-only-cad-upload-admission-development-body-admission-closeout');
  assert.equal(closeout.status, 'DEVELOPMENT_BODY_ADMISSION_COMPLETED_SOURCE_CLOSEOUT');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.production, false);
  assert.equal(closeout.developmentDeployment, 'majestic-alligator-31');
  assert.equal(closeout.mergedMainCommit, 'ce6494ca1bd250b7d0051ffcaff3e8ac86a3054d');
  assert.equal(closeout.sourcePr, 283);
  assert.equal(closeout.runRef, 'rrb-ref:cad-upload-admission-development-body-admission-1630z');
  assert.equal(closeout.sanitizedRunEvidence.evidenceSha256,
    'd5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604');
  assert.equal(closeout.sanitizedRunEvidence.receiptSha256,
    '90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84');
});

test('body-admission run completed once without upload activation, conversion, Sandbox, stores or retry', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(closeout);
  assert.equal(result.resultValid, true);
  assert.equal(result.countsValid, true);
  assert.equal(result.flagsValid, true);
  assert.equal(closeout.runResult.decision, 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED');
  assert.equal(closeout.runResult.runCompleted, true);
  assert.equal(closeout.runResult.unknownOutcome, false);
  assert.equal(closeout.runResult.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(closeout.operationCounts.mountedRouteDisabledChecks, 2);
  assert.equal(closeout.operationCounts.isolatedRouteBodyValidationChecks, 1);
  assert.equal(closeout.operationCounts.uploadBodiesRead, 1);
  assert.equal(closeout.operationCounts.conversionDispatches, 0);
  assert.equal(closeout.operationCounts.sandboxDispatches, 0);
  assert.equal(closeout.operationCounts.storeMutations, 0);
  assert.equal(closeout.runFlags.automaticRetry, false);
  assert.equal(closeout.runFlags.secondRun, false);
});

test('production route smoke and evidence custody remain fail-closed and source-safe', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(closeout);
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
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionCloseout(closeout);
  assert.equal(result.authoritiesClosed, true);
  for (const [gate, value] of Object.entries(closeout.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('separate CAD upload activation approval'));
  assert.ok(closeout.remainingGatesBeforeCadUploadActivation.includes('separate CAD conversion and Sandbox dispatch approval'));
  assert.match(closeout.nextSafeAction.scope, /source-only packet/);
  assert.match(closeout.nextSafeAction.stopBefore, /production upload activation/);
});

test('docs summary matches the closeout and does not overclaim readiness', () => {
  assert.equal(docsSummary.evidenceSha256, closeout.sanitizedRunEvidence.evidenceSha256);
  assert.equal(docsSummary.receiptSha256, closeout.sanitizedRunEvidence.receiptSha256);
  assert.equal(docsSummary.authority.cadUploadActivationAuthorized, false);
  assert.equal(docsSummary.authority.conversionAuthorized, false);
  assert.match(markdown, /does not prove user-facing CAD upload readiness/i);
  assert.match(markdown, /mounted route remains disabled/i);
  assert.match(markdown, /conversion dispatches: 0/i);
  assert.doesNotMatch(markdown, /CAD upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /production activation completed/i);
});

test('mounted route remains disabled and isolated from closeout source', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route,
    /uploadAdmissionDevelopmentBodyAdmissionCloseout|cad-upload-admission-development-body-admission-closeout/);
});
