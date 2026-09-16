const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const gate = require('../offline/cad-convex/uploadAdmissionQualificationGate.json');
const docSummary = require('../docs/cad-upload-admission-qualification-gate.json');
const uploadSessionCloseout = require('../docs/cad-dev-upload-session-successful-closeout.json');
const dryRunCloseout = require('../docs/cad-upload-admission-development-dry-run-closeout.json');
const { REQUIRED_INPUTS, inspectUploadAdmissionQualificationGate } =
  require('../offline/cad-convex/uploadAdmissionQualificationGate');

const root = path.resolve(__dirname, '..');

test('qualification gate binds completed upload-session and dry-run evidence', () => {
  const result = inspectUploadAdmissionQualificationGate(gate);
  assert.equal(result.structureValid, true);
  assert.equal(result.uploadSessionReady, true);
  assert.equal(result.dryRunReady, true);
  assert.equal(gate.sourceBindings.uploadSessionCloseout, REQUIRED_INPUTS.uploadSessionCloseout);
  assert.equal(gate.sourceBindings.dryRunCloseout, REQUIRED_INPUTS.dryRunCloseout);
  assert.equal(uploadSessionCloseout.runResult.runCompleted, true);
  assert.equal(uploadSessionCloseout.observedBridgeOutcome.loginSessionIdObserved, true);
  assert.equal(dryRunCloseout.dryRunCompleted, true);
  assert.equal(dryRunCloseout.unknownOutcome, false);
});

test('qualification gate preserves all execution authorities closed', () => {
  const result = inspectUploadAdmissionQualificationGate(gate);
  assert.equal(result.sourceBindingsValid, true);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.blockersPreserved, true);
  assert.equal(gate.liveRunAuthorized, false);
  assert.equal(gate.bodyAdmissionAuthorizedNow, false);
  assert.equal(gate.productionUploadActivationAuthorized, false);
  assert.equal(gate.conversionAuthorized, false);
  assert.equal(gate.sandboxDispatchAuthorized, false);
  assert.ok(Object.values(gate.authorityPreserved).every(value => value === false));
});

test('future bounded admission remains development only and stops before conversion', () => {
  const result = inspectUploadAdmissionQualificationGate(gate);
  assert.equal(result.futureRunBounded, true);
  assert.equal(gate.futureBoundedAdmissionRun.route, 'POST /api/cad/user-import');
  assert.equal(gate.futureBoundedAdmissionRun.fixtureSha256,
    '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3');
  assert.equal(gate.futureBoundedAdmissionRun.maxAllInCostUsd, 50);
  assert.equal(gate.futureBoundedAdmissionRun.stopBeforeConversion, true);
  assert.equal(gate.futureBoundedAdmissionRun.stopBeforeSandbox, true);
  assert.equal(gate.futureBoundedAdmissionRun.privateCadAllowed, false);
  assert.equal(gate.futureBoundedAdmissionRun.realUsersAllowed, false);
});

test('route remains literal-false and no live run command is introduced', () => {
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  const gateSource = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionQualificationGate.js'), 'utf8');
  assert.doesNotMatch(gateSource, /process\.env|fetch\s*\(|https?\.request|child_process|convex\/browser|node:fs/);
});

test('summary and future phrases keep the next step source-only', () => {
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionQualificationGate.json');
  assert.equal(docSummary.nextSafeAction, 'source-only bounded upload admission execution packet assembly');
  assert.equal(docSummary.liveRunAuthorized, false);
  assert.match(gate.futureApprovalPhrases.nextSourceGate, /source-only bounded upload admission execution packet assembly/);
  assert.match(gate.futureApprovalPhrases.nextSourceGate, /Do not run live tests/);
  assert.match(gate.futureApprovalPhrases.nextSourceGate, /USD 50 cap/);
  assert.doesNotMatch(gate.futureApprovalPhrases.nextSourceGate, /private CAD.*authorized/i);
});
