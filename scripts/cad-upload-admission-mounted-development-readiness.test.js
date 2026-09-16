const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packet = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
const bodyAdmissionCloseout = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-mounted-development-readiness.json');
const { inspectUploadAdmissionMountedDevelopmentReadiness } =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness');

const root = path.resolve(__dirname, '..');
const markdown = fs.readFileSync(
  path.join(root, 'docs/cad-upload-admission-mounted-development-readiness.md'),
  'utf8',
);

test('mounted development readiness binds the accepted isolated body-admission closeout', () => {
  const result = inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout);
  assert.equal(result.structureValid, true);
  assert.equal(result.closeoutBound, true);
  assert.equal(result.readyForExactWindowSourcePacket, true);
  assert.equal(packet.acceptedBodyAdmissionCloseout.sourcePr, 283);
  assert.equal(packet.acceptedBodyAdmissionCloseout.closeoutPr, 284);
  assert.equal(packet.acceptedBodyAdmissionCloseout.closeoutMergeCommit,
    '0b30989c0458763aa20fa6609430e07e5bedeb60');
  assert.equal(packet.acceptedBodyAdmissionCloseout.evidenceSha256,
    'd5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604');
  assert.equal(packet.acceptedBodyAdmissionCloseout.receiptSha256,
    '90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84');
  assert.equal(packet.acceptedBodyAdmissionCloseout.runDecision,
    'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED');
});

test('mounted route gate remains disabled and no source packet can flip it', () => {
  const result = inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout);
  assert.equal(result.routeGateValid, true);
  assert.equal(packet.mountedRouteGate.requiredDisabledLiteral, 'const BODY_ADMISSION_AUTHORIZED = false;');
  assert.equal(packet.mountedRouteGate.mountedRouteCurrentlyDisabled, true);
  assert.equal(packet.mountedRouteGate.sourcePacketMayFlipLiteral, false);
  assert.equal(packet.mountedRouteGate.futureRunRequiresSeparateExactWindow, true);
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route,
    /uploadAdmissionMountedDevelopmentReadiness|cad-upload-admission-mounted-development-readiness/);
});

test('future mounted development run bounds preserve one attempt and stop-on-unknown behavior', () => {
  const result = inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout);
  assert.equal(result.readinessValid, true);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.requiresNewExactUtcWindowPacket, true);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.requiresLiveRunApproval, true);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.maxAttempts, 1);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.automaticRetry, false);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.secondRun, false);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.stopOnUnknownOutcome, true);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.allInPlanningCapUsd, 50);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.publicSyntheticFixtureOnly, true);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.cadConversionAuthorized, false);
  assert.equal(packet.readinessForFutureMountedDevelopmentRun.sandboxDispatchAuthorized, false);
});

test('evidence and rollback requirements stay sanitized and no-delete', () => {
  const result = inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout);
  assert.equal(result.evidenceValid, true);
  assert.equal(result.rollbackValid, true);
  assert.equal(packet.evidenceRequirements.gitIgnoredRequired, true);
  assert.equal(packet.evidenceRequirements.directoryMode, '700');
  assert.equal(packet.evidenceRequirements.fileMode, '600');
  assert.equal(packet.evidenceRequirements.mustNotRecordContentBase64, true);
  assert.equal(packet.evidenceRequirements.mustNotRecordRawCredential, true);
  assert.equal(packet.evidenceRequirements.mustNotRecordPrivateCad, true);
  assert.equal(packet.rollbackAndReconciliation.rollbackTarget, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.rollbackAndReconciliation.deleteRetainedState, false);
  assert.equal(packet.rollbackAndReconciliation.unknownReservationsRemainLocked, true);
});

test('all authority flags remain closed by the readiness packet', () => {
  const result = inspectUploadAdmissionMountedDevelopmentReadiness(packet, bodyAdmissionCloseout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
  assert.equal(result.uploadActivationAuthorizedByThisPacket, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
  for (const [gate, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('docs summary and markdown do not overclaim mounted upload readiness', () => {
  assert.equal(docsSummary.source, 'offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.uploadActivationHappened, false);
  assert.equal(docsSummary.authority.liveRunAuthorizedByThisPacket, false);
  assert.match(docsSummary.nextSafeAction, /source-only exact UTC window packet/);
  assert.match(markdown, /does not run, activate, or mount upload admission/i);
  assert.match(markdown, /does not prove mounted upload readiness/i);
  assert.doesNotMatch(markdown, /mounted upload activation completed/i);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
});

test('readiness inspector remains local and provider-free', () => {
  const source = fs.readFileSync(
    path.join(root, 'offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.js'),
    'utf8',
  );
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
