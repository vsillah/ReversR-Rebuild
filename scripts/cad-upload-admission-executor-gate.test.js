const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const gate = require('../offline/cad-convex/uploadAdmissionExecutorGate.json');
const packet = require('../offline/cad-convex/uploadAdmissionExecutionPacket.json');
const docSummary = require('../docs/cad-upload-admission-executor-gate.json');
const {
  inspectUploadAdmissionExecutorGate,
  summarizeExecutorResult,
} = require('../offline/cad-convex/uploadAdmissionExecutorGate');
const {
  executeUploadAdmissionExecutorGate,
  materializeFixture,
} = require('./run-cad-upload-admission-executor-gate');

const root = path.resolve(__dirname, '..');

test('executor gate binds the accepted packet, window and public fixture', () => {
  const inspected = inspectUploadAdmissionExecutorGate(gate, packet);
  assert.equal(inspected.structureValid, true);
  assert.equal(inspected.sourceBindingsValid, true);
  assert.equal(inspected.windowBound, true);
  assert.equal(inspected.fixtureBound, true);
  assert.equal(gate.acceptedWindow.startUtc, '2026-09-16T11:00:00Z');
  assert.equal(gate.publicFixtureMaterialization.privateCad, false);
});

test('public fixture materializes from installed dependency with expected digest', () => {
  const fixture = materializeFixture(gate);
  assert.equal(fixture.bytes.length, 11562);
  assert.equal(fixture.digest, '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3');
  assert.equal(fixture.payload.fileName, 'public-cube.igs');
  assert.equal(fixture.payload.mimeType, 'model/iges');
});

test('executor gate executes only inside the accepted window and records safe summary', async () => {
  const before = await executeUploadAdmissionExecutorGate({
    now: () => Date.parse('2026-09-16T10:59:59Z'),
    writeEvidence: false,
  });
  assert.equal(before.code, 'WINDOW_NOT_OPEN');

  const result = await executeUploadAdmissionExecutorGate({
    now: () => Date.parse('2026-09-16T11:00:05Z'),
    writeEvidence: false,
  });
  assert.equal(result.decision, 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.uploadBodyValidated, true);
  assert.equal(result.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(result.counts.mountedRouteDisabledChecks, 2);
  assert.equal(result.counts.isolatedRouteBodyValidationChecks, 1);
  assert.equal(result.counts.conversionDispatches, 0);
  assert.equal(result.counts.sandboxDispatches, 0);
  assert.equal(result.counts.storeMutations, 0);
  assert.equal(result.recordsContentBase64, false);
  assert.deepEqual(summarizeExecutorResult(result), {
    runCompleted: true,
    unknownOutcome: false,
    terminalCode: 'USER_UPLOADS_DISABLED',
    uploadBodyValidated: true,
    conversionDispatches: 0,
    sandboxDispatches: 0,
    privateCadUsed: false,
  });

  const after = await executeUploadAdmissionExecutorGate({
    now: () => Date.parse('2026-09-16T11:15:00Z'),
    writeEvidence: false,
  });
  assert.equal(after.code, 'WINDOW_EXPIRED');
});

test('mounted route remains source-closed and runner stays out of production wiring', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /run-cad-upload-admission-executor-gate|uploadAdmissionExecutorGate/);
  const runner = fs.readFileSync(path.join(root, 'scripts/run-cad-upload-admission-executor-gate.js'), 'utf8');
  assert.doesNotMatch(runner, /process\.env|convex\/browser|cadSandboxExecutor|sendgrid|twilio|slack/i);
});

test('docs summary keeps next action bounded and not live by this packet', () => {
  const inspected = inspectUploadAdmissionExecutorGate(gate, packet);
  assert.equal(inspected.isolatedRouteBound, true);
  assert.equal(inspected.evidenceBound, true);
  assert.equal(inspected.boundsClosed, true);
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionExecutorGate.json');
  assert.equal(docSummary.liveRunHappened, false);
  assert.match(gate.futureApprovalPhrases.run, /one bounded development-only CAD upload admission qualification run/);
  assert.match(gate.futureApprovalPhrases.run, /Keep production CAD uploads disabled/);
});
