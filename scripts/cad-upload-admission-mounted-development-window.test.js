const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const windowPacket = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json');
const readiness = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentReadiness.json');
const docsSummary = require('../docs/cad-upload-admission-mounted-development-window.json');
const { inspectUploadAdmissionMountedDevelopmentWindow } =
  require('../offline/cad-convex/uploadAdmissionMountedDevelopmentWindow');

const root = path.resolve(__dirname, '..');
const markdown = fs.readFileSync(
  path.join(root, 'docs/cad-upload-admission-mounted-development-window.md'),
  'utf8',
);

test('mounted development window binds the accepted readiness packet', () => {
  const result = inspectUploadAdmissionMountedDevelopmentWindow(windowPacket, readiness);
  assert.equal(result.structureValid, true);
  assert.equal(result.readinessBound, true);
  assert.equal(result.readyForAutopilotMountedDevelopmentWindow, true);
  assert.equal(result.liveDevelopmentRunAuthorizedByThisPacket, false);
  assert.equal(windowPacket.acceptedReadiness.sourcePr, 285);
  assert.equal(windowPacket.acceptedReadiness.readinessMergeCommit,
    'd89290c61511006c849954275602f21f57092457');
  assert.equal(windowPacket.acceptedReadiness.bodyAdmissionEvidenceSha256,
    'd5d561c9dbb69fd8c398e46290e960a9078f74c3966671dd88bef71c318ca604');
  assert.equal(windowPacket.acceptedReadiness.bodyAdmissionReceiptSha256,
    '90840cf2af29203e17ec2234ef99d662abd77518f012b3b9bbe4be74bd465b84');
});

test('window and evidence destination are bound to the 18:00Z run', () => {
  const result = inspectUploadAdmissionMountedDevelopmentWindow(windowPacket, readiness);
  assert.equal(result.windowValid, true);
  assert.equal(result.evidenceDestinationValid, true);
  assert.equal(windowPacket.acceptedWindow.runRef,
    'rrb-ref:cad-upload-admission-mounted-development-1800z');
  assert.equal(windowPacket.acceptedWindow.startUtc, '2026-09-16T18:00:00Z');
  assert.equal(windowPacket.acceptedWindow.expiresUtc, '2026-09-16T18:15:00Z');
  assert.equal(windowPacket.acceptedWindow.maxRunSeconds, 900);
  assert.equal(windowPacket.acceptedWindow.scheduleIfMoreThanFiveMinutesAway, true);
  assert.equal(windowPacket.sanitizedEvidenceDestination.root,
    '.local/cad-convex/upload-admission-mounted-development-1800z');
});

test('route gate stays source-closed and requires pre/post checks', () => {
  const result = inspectUploadAdmissionMountedDevelopmentWindow(windowPacket, readiness);
  assert.equal(result.routeGateValid, true);
  assert.equal(windowPacket.routeGate.requiredDisabledLiteral, 'const BODY_ADMISSION_AUTHORIZED = false;');
  assert.equal(windowPacket.routeGate.sourcePacketMayFlipLiteral, false);
  assert.equal(windowPacket.routeGate.preFlightDisabledCheckRequired, true);
  assert.equal(windowPacket.routeGate.postRunDisabledOrRollbackCheckRequired, true);
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route,
    /uploadAdmissionMountedDevelopmentWindow|cad-upload-admission-mounted-development-window/);
});

test('run bounds preserve one attempt, no retry and no conversion or Sandbox', () => {
  const result = inspectUploadAdmissionMountedDevelopmentWindow(windowPacket, readiness);
  assert.equal(result.boundsValid, true);
  assert.equal(windowPacket.runBounds.developmentProject, 'reversr-cad-auth-dev');
  assert.equal(windowPacket.runBounds.developmentDeployment, 'majestic-alligator-31');
  assert.equal(windowPacket.runBounds.maxAttempts, 1);
  assert.equal(windowPacket.runBounds.automaticRetry, false);
  assert.equal(windowPacket.runBounds.secondRun, false);
  assert.equal(windowPacket.runBounds.stopOnUnknownOutcome, true);
  assert.equal(windowPacket.runBounds.allInPlanningCapUsd, 50);
  assert.equal(windowPacket.runBounds.mountedDevelopmentUploadExecutionAuthorizedNow, false);
  assert.equal(windowPacket.runBounds.productionUploadActivationAuthorized, false);
  assert.equal(windowPacket.runBounds.cadConversionAuthorized, false);
  assert.equal(windowPacket.runBounds.sandboxDispatchAuthorized, false);
  assert.equal(windowPacket.runBounds.privateCadAuthorized, false);
  assert.equal(windowPacket.runBounds.realUsersAuthorized, false);
});

test('all authority flags remain closed by the exact-window packet', () => {
  const result = inspectUploadAdmissionMountedDevelopmentWindow(windowPacket, readiness);
  assert.equal(result.authoritiesClosed, true);
  for (const [gate, value] of Object.entries(windowPacket.authorityPreservedByThisPacket)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('docs summary and markdown do not authorize live execution by themselves', () => {
  assert.equal(docsSummary.source, 'offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.json');
  assert.equal(docsSummary.liveRunHappened, false);
  assert.equal(docsSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.match(docsSummary.nextSafeAction, /source-only mounted-development upload executor bridge|bounded development-only/);
  assert.match(markdown, /does not run the gate/i);
  assert.match(markdown, /does not authorize live mounted upload execution by itself/i);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
});

test('window inspector remains local and provider-free', () => {
  const source = fs.readFileSync(
    path.join(root, 'offline/cad-convex/uploadAdmissionMountedDevelopmentWindow.js'),
    'utf8',
  );
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
