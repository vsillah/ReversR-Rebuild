const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packet = require('../offline/cad-convex/uploadAdmissionExecutionPacket.json');
const docSummary = require('../docs/cad-upload-admission-execution-packet.json');
const qualificationGate = require('../offline/cad-convex/uploadAdmissionQualificationGate.json');
const { REQUIRED_BINDINGS, inspectUploadAdmissionExecutionPacket, sha256 } =
  require('../offline/cad-convex/uploadAdmissionExecutionPacket');

const root = path.resolve(__dirname, '..');

test('execution packet binds PR 273 source, deployment and prerequisite evidence', () => {
  const result = inspectUploadAdmissionExecutionPacket(packet);
  assert.equal(result.structureValid, true);
  assert.equal(result.sourceBindingsValid, true);
  assert.equal(result.deploymentBound, true);
  assert.equal(packet.sourceBindings.qualificationGate, REQUIRED_BINDINGS.qualificationGate);
  assert.equal(packet.acceptedEvidenceBindings.uploadSessionEvidenceSha256,
    qualificationGate.inputs.uploadSessionCloseout.evidenceSha256);
  assert.equal(packet.acceptedEvidenceBindings.dryRunEvidenceSha256,
    qualificationGate.inputs.dryRunCloseout.evidenceSha256);
});

test('execution packet binds a fresh future window and public synthetic fixture only', () => {
  const result = inspectUploadAdmissionExecutionPacket(packet);
  assert.equal(result.futureWindowBound, true);
  assert.equal(result.fixtureBound, true);
  assert.equal(packet.futureRunWindow.runRef, 'rrb-ref:cad-upload-admission-qualification-1100z');
  assert.equal(packet.publicSyntheticFixture.privateCad, false);
  assert.equal(packet.publicSyntheticFixture.conversionAuthorized, false);
  assert.equal(packet.publicSyntheticFixture.sandboxDispatchAuthorized, false);
});

test('command templates are digest-bound and evidence output is local sanitized', () => {
  const result = inspectUploadAdmissionExecutionPacket(packet);
  assert.equal(result.commandsBound, true);
  assert.equal(result.sanitizedEvidenceBound, true);
  for (const command of Object.values(packet.commandManifest)) {
    assert.equal(command.sha256, sha256(command.template));
  }
  assert.match(packet.sanitizedEvidenceDestination.root, /^\.local\/cad-convex\//);
  assert.equal(packet.sanitizedEvidenceDestination.privatePatternLeakAllowed, false);
});

test('route remains source-closed and packet does not authorize execution', () => {
  const result = inspectUploadAdmissionExecutionPacket(packet);
  assert.equal(result.routeRemainsClosed, true);
  assert.equal(result.boundariesClosed, true);
  assert.equal(result.blockersPreserved, true);
  assert.equal(packet.liveRunAuthorizedByThisPacket, false);
  assert.equal(packet.bodyAdmissionExecutableNow, false);
  assert.ok(Object.values(packet.authorityPreserved).every(value => value === false));
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('docs summary points to the next source-only executor gate', () => {
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionExecutionPacket.json');
  assert.equal(docSummary.nextSafeAction, 'source-only bounded upload admission executor gate');
  assert.equal(docSummary.liveRunHappened, false);
  assert.match(packet.futureApprovalPhrases.nextSourceGate, /source-only bounded upload admission executor gate/);
  assert.match(packet.futureApprovalPhrases.nextSourceGate, /Do not run live tests/);
  assert.match(packet.futureApprovalPhrases.nextSourceGate, /USD 50 cap/);
  assert.doesNotMatch(packet.futureApprovalPhrases.nextSourceGate, /private CAD.*authorized/i);
});
