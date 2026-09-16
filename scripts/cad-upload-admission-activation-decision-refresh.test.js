const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const refresh = require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh.json');
const mountedCloseout = require('../offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
const docsSummary = require('../docs/cad-upload-admission-activation-decision-refresh.json');
const { inspectUploadAdmissionActivationDecisionRefresh } =
  require('../offline/cad-convex/uploadAdmissionActivationDecisionRefresh');

const root = path.resolve(__dirname, '..');

test('activation decision refresh binds the accepted mounted-development closeout', () => {
  const result = inspectUploadAdmissionActivationDecisionRefresh(refresh);
  assert.equal(result.structureValid, true);
  assert.equal(result.mountedCloseoutValid, true);
  assert.equal(refresh.acceptedMountedDevelopmentCloseout.closeoutSource,
    'offline/cad-convex/uploadAdmissionMountedDevelopmentCloseout.json');
  assert.equal(mountedCloseout.runResult.decision,
    refresh.acceptedMountedDevelopmentCloseout.decision);
  assert.equal(mountedCloseout.sanitizedRunEvidence.evidenceSha256,
    refresh.acceptedMountedDevelopmentCloseout.evidenceSha256);
  assert.equal(mountedCloseout.sanitizedRunEvidence.receiptSha256,
    refresh.acceptedMountedDevelopmentCloseout.receiptSha256);
});

test('source guards keep checked-in production upload admission disabled', () => {
  const result = inspectUploadAdmissionActivationDecisionRefresh(refresh);
  const router = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.equal(result.sourceGuardsValid, true);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.equal(refresh.sourceGuards.runtimeBridgeMountedNow, false);
  assert.equal(refresh.sourceGuards.productionBodyAdmissionAuthorizedNow, false);
});

test('decision only permits a future source-only exact-window packet', () => {
  const result = inspectUploadAdmissionActivationDecisionRefresh(refresh);
  assert.equal(result.decisionValid, true);
  assert.equal(refresh.decision.developmentSyntheticUploadPathCanProceedToExactWindowPacket, true);
  assert.equal(refresh.decision.requiresExactUtcWindowBeforeRun, true);
  assert.equal(refresh.decision.productionUploadActivationReady, false);
  assert.equal(refresh.decision.privateCadReady, false);
  assert.equal(refresh.decision.conversionSandboxReady, false);
});

test('future bounds remain development-only, public fixture only and one attempt', () => {
  const result = inspectUploadAdmissionActivationDecisionRefresh(refresh);
  assert.equal(result.futureBoundsValid, true);
  assert.equal(refresh.futureRunBounds.developmentOnly, true);
  assert.equal(refresh.futureRunBounds.productionAllowed, false);
  assert.equal(refresh.futureRunBounds.fixtureScope, 'public synthetic cube fixture only');
  assert.equal(refresh.futureRunBounds.maxAttempts, 1);
  assert.equal(refresh.futureRunBounds.maxAllInCostUsd, 50);
});

test('refresh grants no live, upload, conversion, Sandbox, private CAD or real-user authority', () => {
  const result = inspectUploadAdmissionActivationDecisionRefresh(refresh);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(result.liveRunAuthorized, false);
  assert.equal(result.productionUploadActivationAuthorized, false);
  assert.equal(result.conversionAuthorized, false);
  assert.equal(result.sandboxDispatchAuthorized, false);
  assert.equal(result.privateCadAuthorized, false);
});

test('docs summary matches refresh and does not overclaim activation readiness', () => {
  const markdown = fs.readFileSync(path.join(root, 'docs/cad-upload-admission-activation-decision-refresh.md'), 'utf8');
  assert.equal(docsSummary.mountedDevelopmentEvidenceSha256,
    refresh.acceptedMountedDevelopmentCloseout.evidenceSha256);
  assert.equal(docsSummary.developmentRunAuthorizedByThisPacket, false);
  assert.equal(docsSummary.productionUploadActivationAuthorized, false);
  assert.match(markdown, /authorizes no execution/i);
  assert.match(markdown, /source-only exact-window\s+packet/i);
  assert.doesNotMatch(markdown, /production upload activation ready/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
});
