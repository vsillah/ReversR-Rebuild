const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-exact-opening-decision-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-exact-opening-decision-packet.md', 'utf8');
const humanQa = JSON.parse(fs.readFileSync('docs/cad-internal-admission-human-qa-acceptance.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

test('decision packet is source-only and follows accepted human QA receipt', () => {
  assert.equal(packet.mode, 'source-only-exact-opening-decision-request');
  assert.equal(packet.status, 'EXACT_OPENING_DECISION_DRAFT_UPLOADS_DISABLED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, '92db313ed4c3452e98c72ac16bf1bf16e84159f7');
  assert.equal(packet.acceptedPredecessor.humanQaReceipt, 'docs/cad-internal-admission-human-qa-acceptance.json');
  assert.equal(packet.acceptedPredecessor.candidateOpeningBundle, 'docs/cad-internal-admission-candidate-opening-bundle.json');
  assert.equal(packet.acceptedPredecessor.humanQaAccepted, true);
  assert.equal(packet.acceptedPredecessor.productionUploadActivationAccepted, false);
  assert.equal(humanQa.acceptedArtifact.humanQaAccepted, true);
});

test('proposed opening has exact UTC bounds but is not accepted by this packet', () => {
  assert.equal(packet.proposedOpening.acceptedByThisPacket, false);
  assert.equal(packet.proposedOpening.cohortRef, 'rrb-ref:cad-upload-internal-mark-test-cohort-v1');
  assert.equal(packet.proposedOpening.startsAtUtc, '2026-09-22T17:00:00Z');
  assert.equal(packet.proposedOpening.expiresAtUtc, '2026-09-22T18:00:00Z');
  assert.equal(packet.proposedOpening.maxDurationMinutes, 60);
  assert.equal(packet.proposedOpening.maxConcurrentUploadSessions, 1);
  assert.equal(packet.proposedOpening.maxUploadAttempts, 1);
  assert.equal(packet.proposedOpening.retry, false);
  assert.equal(packet.proposedOpening.secondRun, false);
  assert.equal(packet.proposedOpening.stopOnUnknownOutcome, true);
  assert.equal(packet.proposedOpening.privateCadAllowed, false);
  assert.equal(packet.proposedOpening.realUsersAllowed, false);
  assert.equal(packet.proposedOpening.commercialUseAllowed, false);
});

test('approval phrase is exact and explicitly not accepted', () => {
  assert.equal(packet.exactApprovalPhrase.requiredBeforeUse, true);
  assert.equal(packet.exactApprovalPhrase.acceptedByThisPacket, false);
  assert.match(packet.exactApprovalPhrase.draft, /92db313ed4c3452e98c72ac16bf1bf16e84159f7/);
  assert.match(packet.exactApprovalPhrase.draft, /2026-09-22T17:00:00Z/);
  assert.match(packet.exactApprovalPhrase.draft, /2026-09-22T18:00:00Z/);
  assert.match(packet.exactApprovalPhrase.draft, /one concurrent session/);
  assert.match(packet.exactApprovalPhrase.draft, /one upload attempt/);
  assert.match(packet.exactApprovalPhrase.draft, /No conversion, Sandbox dispatch, private CAD/);
  assert.match(packet.exactApprovalPhrase.note, /Generic proceed is not this approval/);
});

test('route remains closed and pre-activation checklist requires smokes and rollback', () => {
  assert.equal(packet.routeState.bodyAdmissionAuthorized, false);
  assert.equal(packet.routeState.bodyReadAuthorized, false);
  assert.equal(packet.routeState.routeMayOpenNow, false);
  assert.equal(packet.routeState.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.equal(packet.preActivationChecklist.requiresSeparateRuntimeImplementation, true);
  assert.equal(packet.preActivationChecklist.requiresExactActivationApproval, true);
  assert.equal(packet.preActivationChecklist.requiresPreWindowFailClosedSmoke, true);
  assert.equal(packet.preActivationChecklist.requiresPostRollbackFailClosedSmoke, true);
  assert.equal(packet.preActivationChecklist.requiresImmediateRollbackOnUnknownOutcome, true);
  assert.equal(packet.preActivationChecklist.requiresNoConversionOrSandbox, true);
  assert.equal(packet.preActivationChecklist.requiresNoPrivateCad, true);
  assert.equal(packet.preActivationChecklist.requiresNoRealUsers, true);
});

test('source bindings exist and packet remains sanitized', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  const serialized = JSON.stringify(packet);
  assert.doesNotMatch(serialized, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(serialized, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

test('packet authorizes no runtime activation path', () => {
  for (const key of [
    'sourceOnlyDocsAndTests',
    'localValidation',
    'draftPr',
    'greenCheckMerge',
    'normalVercelDeploymentFromMain',
    'productionFailClosedSmoke',
    'cleanup',
  ]) {
    assert.equal(packet.authorizes[key], true, `${key} should be allowed`);
  }
  for (const key of [
    'requestBodyRead',
    'productionUploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'providerEnvResourceBillingChanges',
    'storeMutation',
    'privateCad',
    'realUsers',
    'externalMessages',
    'secrets',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain unauthorized`);
  }
});

test('production smoke evidence is fail-closed and markdown separates the gate', () => {
  assert.equal(packet.latestProductionFailClosedSmoke.commit, packet.baseCommit);
  assert.ok(packet.latestProductionFailClosedSmoke.results.find(result => (
    result.route === 'POST /api/cad/user-import {}'
    && result.status === 401
    && result.code === 'USER_SESSION_REQUIRED'
  )));
  assert.ok(packet.latestProductionFailClosedSmoke.results.find(result => (
    result.route === 'GET /api/cad/import-source-record'
    && result.status === 404
  )));
  assert.match(markdown, /Generic `proceed` is not enough for activation/);
  assert.match(markdown, /does not activate production uploads/);
  assert.match(markdown, /remains closed behind `USER_UPLOADS_DISABLED`/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
});
