const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const executor = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json');
const packet = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
const activationCloseout = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json');
const qualificationCloseout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const docSummary = require('../docs/cad-upload-admission-development-body-admission-executor.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionExecutor } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor');
const {
  executeUploadAdmissionDevelopmentBodyAdmission,
  materializePublicFixture,
} = require('./run-cad-upload-admission-development-body-admission-executor');

const root = path.resolve(__dirname, '..');
const acceptedWindow = Object.freeze({
  runRef: 'rrb-ref:test-body-admission-window',
  startUtc: '2026-09-16T15:10:00Z',
  expiresUtc: '2026-09-16T15:25:00Z',
  maxRunSeconds: 900,
  evidenceRoot: '.local/cad-convex/upload-admission-development-body-admission-test-window',
});

test('body-admission executor binds the accepted source packet and remains source-only', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionExecutor(
    executor,
    packet,
    activationCloseout,
    qualificationCloseout,
  );
  assert.equal(result.structureValid, true);
  assert.equal(result.bindingsValid, true);
  assert.equal(result.packetReady, true);
  assert.equal(result.capabilitiesValid, true);
  assert.equal(result.prerequisitesValid, true);
  assert.equal(result.evidenceValid, true);
  assert.equal(result.expectedResultValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.readyForSourceMerge, true);
  assert.equal(result.readyForLiveRun, false);
  assert.equal(executor.acceptedWindow, null);
  assert.equal(executor.liveRunAuthorizedByThisPacket, false);
});

test('public fixture materializes with the accepted digest', () => {
  const fixture = materializePublicFixture(packet);
  assert.equal(fixture.bytes.length, packet.acceptedInputs.publicFixtureBytes);
  assert.equal(fixture.digest, packet.acceptedInputs.publicFixtureSha256);
  assert.equal(fixture.payload.fileName, 'public-cube.igs');
  assert.equal(fixture.payload.mimeType, 'model/iges');
});

test('default executor blocks until a separate exact window packet is accepted', async () => {
  const result = await executeUploadAdmissionDevelopmentBodyAdmission({
    now: () => Date.parse('2026-09-16T15:15:00Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'BLOCKED');
  assert.equal(result.code, 'BODY_ADMISSION_WINDOW_NOT_ACCEPTED');
  assert.equal(result.runCompleted, false);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
});

test('executor only runs within an accepted window and keeps mounted route disabled', async () => {
  const before = await executeUploadAdmissionDevelopmentBodyAdmission({
    acceptedWindow,
    now: () => Date.parse('2026-09-16T15:09:59Z'),
    writeEvidence: false,
  });
  assert.equal(before.code, 'WINDOW_NOT_OPEN');

  const result = await executeUploadAdmissionDevelopmentBodyAdmission({
    acceptedWindow,
    now: () => Date.parse('2026-09-16T15:10:05Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_DEVELOPMENT_BODY_ADMISSION_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.bodyAdmissionValidated, true);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.counts.mountedRouteDisabledChecks, 2);
  assert.equal(result.counts.isolatedRouteBodyValidationChecks, 1);
  assert.ok(result.counts.uploadBodiesRead >= 1);
  assert.equal(result.counts.conversionDispatches, 0);
  assert.equal(result.counts.sandboxDispatches, 0);
  assert.equal(result.counts.storeMutations, 0);
  assert.equal(result.recordsContentBase64, false);
  assert.equal(result.recordsRawCredential, false);
  assert.equal(result.recordsPrivateCad, false);

  const after = await executeUploadAdmissionDevelopmentBodyAdmission({
    acceptedWindow,
    now: () => Date.parse('2026-09-16T15:25:00Z'),
    writeEvidence: false,
  });
  assert.equal(after.code, 'WINDOW_EXPIRED');
});

test('mounted route remains source-closed and does not import the executor', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /run-cad-upload-admission-development-body-admission-executor|uploadAdmissionDevelopmentBodyAdmissionExecutor/);
});

test('docs summary points to a bounded window packet, not live activation', () => {
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionExecutor.json');
  assert.equal(docSummary.executorReady, true);
  assert.equal(docSummary.acceptedWindow, null);
  assert.equal(docSummary.liveRunAuthorizedByThisPacket, false);
  assert.equal(docSummary.productionUploadActivationAuthorized, false);
  assert.match(docSummary.nextSafeAction, /exact UTC window packet/);
});
