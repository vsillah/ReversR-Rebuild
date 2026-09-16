const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packet = require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
const activationCloseout = require('../offline/cad-convex/uploadAdmissionDevelopmentActivationCloseout.json');
const qualificationCloseout = require('../offline/cad-convex/uploadAdmissionQualificationCloseout.json');
const docSummary = require('../docs/cad-upload-admission-development-body-admission-packet.json');
const { inspectUploadAdmissionDevelopmentBodyAdmissionPacket } =
  require('../offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket');

const root = path.resolve(__dirname, '..');

test('body-admission packet binds activation and qualification closeouts', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout);
  assert.equal(result.structureValid, true);
  assert.equal(result.activationCloseoutAccepted, true);
  assert.equal(result.qualificationCloseoutAccepted, true);
  assert.equal(result.readyForExecutorSourceSlice, true);
  assert.equal(result.liveRunAuthorizedByThisPacket, false);
  assert.equal(packet.acceptedInputs.activationPreviewEvidenceSha256,
    '1e37b105c5adfd26ed4319bf0fed628d1b26b4cabd815dfe3f091c517cce9de6');
  assert.equal(packet.acceptedInputs.qualificationEvidenceSha256,
    'cb4619a7b0c34731047f6493a4c74d5e1ffb3cf598c1a7a6117e0525318f9ffd');
});

test('route isolation requires mounted route to stay closed', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout);
  assert.equal(result.isolationValid, true);
  assert.equal(packet.routeIsolation.mountedRouteLiteralMustRemain, 'const BODY_ADMISSION_AUTHORIZED = false;');
  assert.equal(packet.routeIsolation.executorMayUseIsolatedVmRouteCopy, true);
  assert.equal(packet.routeIsolation.executorMayModifyTrackedRoute, false);
  const route = fs.readFileSync(path.join(root, 'server/cadUserUploadRouter.js'), 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(route, /uploadAdmissionDevelopmentBodyAdmissionPacket|cad-upload-admission-development-body-admission-packet/);
});

test('bounded criteria stop before production activation conversion and Sandbox', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout);
  assert.equal(result.boundsValid, true);
  assert.equal(packet.boundedRunCriteria.maxAttempts, 1);
  assert.equal(packet.boundedRunCriteria.automaticRetry, false);
  assert.equal(packet.boundedRunCriteria.secondRun, false);
  assert.equal(packet.boundedRunCriteria.bodyReadAllowedOnlyInIsolatedRouteCopy, true);
  assert.equal(packet.boundedRunCriteria.mountedProductionBodyReadAllowed, false);
  assert.equal(packet.boundedRunCriteria.cadConversionAuthorized, false);
  assert.equal(packet.boundedRunCriteria.sandboxDispatchAuthorized, false);
  assert.equal(packet.boundedRunCriteria.storeMutationAuthorized, false);
});

test('evidence and rollback requirements preserve no-secret no-delete custody', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout);
  assert.equal(result.evidenceValid, true);
  assert.equal(result.rollbackValid, true);
  assert.equal(packet.evidenceRequirements.mustNotRecordContentBase64, true);
  assert.equal(packet.evidenceRequirements.mustNotRecordRawCredential, true);
  assert.equal(packet.evidenceRequirements.mustNotRecordPrivateCad, true);
  assert.equal(packet.rollbackAndReconciliation.rollbackTarget, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.rollbackAndReconciliation.deleteRetainedState, false);
  assert.equal(packet.rollbackAndReconciliation.postRollbackSmokeRequired, true);
});

test('all authorities remain closed by this source-only packet', () => {
  const result = inspectUploadAdmissionDevelopmentBodyAdmissionPacket(packet, activationCloseout, qualificationCloseout);
  assert.equal(result.authoritiesClosed, true);
  assert.equal(packet.authorityPreserved.developmentBodyAdmissionAuthorizedByThisPacket, false);
  assert.equal(packet.authorityPreserved.cadUploadActivationAuthorized, false);
  assert.equal(packet.authorityPreserved.productionUploadActivationAuthorized, false);
  assert.equal(packet.authorityPreserved.cadConversionAuthorized, false);
  assert.equal(packet.authorityPreserved.sandboxDispatchAuthorized, false);
  assert.equal(packet.authorityPreserved.privateCadAuthorized, false);
  assert.equal(packet.authorityPreserved.realUserAuthorized, false);
});

test('docs summary routes to executor source slice without live authority', () => {
  assert.equal(docSummary.source, 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.json');
  assert.equal(docSummary.liveRunHappened, false);
  assert.match(docSummary.nextSafeAction, /source-only development body-admission executor/);
  assert.equal(docSummary.authority.liveRunAuthorizedByThisPacket, false);
});

test('packet inspector remains local and provider-free', () => {
  const source = fs.readFileSync(path.join(root, 'offline/cad-convex/uploadAdmissionDevelopmentBodyAdmissionPacket.js'), 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\./);
});
