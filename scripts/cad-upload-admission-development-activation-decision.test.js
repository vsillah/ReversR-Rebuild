const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const decision = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision.json');
const closeout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const { inspectUploadAdmissionDevelopmentActivationDecision } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentActivationDecision');

const root = path.resolve(__dirname, '..');

test('activation decision binds accepted qualification closeout evidence', () => {
  const result = inspectUploadAdmissionDevelopmentActivationDecision(decision);
  assert.equal(result.structureValid, true);
  assert.equal(result.inputsValid, true);
  assert.equal(decision.acceptedInputs.qualificationCloseout,
    'offline/cad-convex/uploadAdmissionQualificationCloseout.json');
  assert.equal(closeout.result.decision, 'UPLOAD_ADMISSION_EXECUTOR_GATE_EXECUTED');
  assert.equal(closeout.evidence.sanitizedEvidenceSha256,
    decision.acceptedInputs.qualificationEvidenceSha256);
  assert.equal(closeout.evidence.sanitizedReceiptSha256,
    decision.acceptedInputs.qualificationReceiptSha256);
});

test('source guards keep mounted production upload route disabled', () => {
  const result = inspectUploadAdmissionDevelopmentActivationDecision(decision);
  const router = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  const bridgeSource = require('../offline/cad-convex/uploadAdmissionRuntimeBridgeSource.json');
  assert.equal(result.sourceGuardsValid, true);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.equal(bridgeSource.runtimeBridgeMountedNow, false);
  assert.equal(bridgeSource.bodyAdmissionAuthorized, false);
});

test('future bounds allow only one development-only public-fixture attempt later', () => {
  const result = inspectUploadAdmissionDevelopmentActivationDecision(decision);
  assert.equal(result.boundsValid, true);
  assert.equal(decision.futureDevelopmentActivationBounds.developmentOnly, true);
  assert.equal(decision.futureDevelopmentActivationBounds.productionAllowed, false);
  assert.equal(decision.futureDevelopmentActivationBounds.fixtureScope, 'public synthetic cube fixture only');
  assert.equal(decision.futureDevelopmentActivationBounds.maxAttempts, 1);
  assert.equal(decision.futureDevelopmentActivationBounds.maxAllInCostUsd, 50);
});

test('decision packet grants no live execution or sensitive authority', () => {
  const result = inspectUploadAdmissionDevelopmentActivationDecision(decision);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(decision.executionAuthorizedByThisPacket, false);
  assert.equal(result.uploadActivationAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
});

test('markdown frames next step as source-only executor, not activation', () => {
  const markdown = fs.readFileSync(path.join(root, 'docs/cad-upload-admission-development-activation-decision.md'), 'utf8');
  assert.match(markdown, /source-only decision packet/);
  assert.match(markdown, /authorizes no execution/);
  assert.match(markdown, /must keep the mounted production route disabled/);
  assert.doesNotMatch(markdown, /upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion completed/i);
});
