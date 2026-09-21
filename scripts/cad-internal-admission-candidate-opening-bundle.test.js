const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { checkOpeningBundle } = require('./cad-internal-admission-opening-bundle-checker');

const root = path.resolve(__dirname, '..');
const candidate = JSON.parse(fs.readFileSync('docs/cad-internal-admission-candidate-opening-bundle.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-candidate-opening-bundle.md', 'utf8');
const binding = JSON.parse(fs.readFileSync('docs/cad-internal-admission-evidence-binding.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

test('candidate bundle is source-only and cannot execute by itself', () => {
  assert.equal(candidate.packet, 'cad-internal-admission-candidate-opening-bundle');
  assert.equal(candidate.mode, 'source-only-guarded-switch-opening-bundle-template');
  assert.equal(candidate.status, 'CANDIDATE_READY_FOR_SEPARATE_HUMAN_REVIEW_UPLOADS_DISABLED');
  assert.equal(candidate.sourceOnly, true);
  assert.equal(candidate.runtimeRouteChanged, false);
  assert.equal(candidate.baseCommit, '0c8f676d9eeedb188db94223f6b46c52167c1295');
  assert.equal(candidate.expensesUsd, 0);
  assert.equal(candidate.route, 'POST /api/cad/user-import');
  assert.equal(candidate.reviewDisposition.candidatePreparedForHumanReview, true);
  assert.equal(candidate.reviewDisposition.humanApprovalAccepted, false);
  assert.equal(candidate.reviewDisposition.openingBundleAccepted, false);
  assert.equal(candidate.reviewDisposition.activationApprovalAccepted, false);
  assert.equal(candidate.reviewDisposition.routeMayOpenNow, false);
  assert.equal(candidate.reviewDisposition.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.equal(candidate.reviewDisposition.requestBodyReadAuthorizedNow, false);
  assert.equal(candidate.reviewDisposition.productionUploadActivationAuthorizedNow, false);
});

test('source bindings exist and runtime route stays literal fail-closed', () => {
  for (const [key, fileRef] of Object.entries(candidate.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.match(routeSource, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
});

test('candidate required evidence mirrors binding slots with sanitized references', () => {
  assert.deepEqual(
    candidate.requiredEvidence.map(item => item.id),
    binding.evidenceSlots.map(item => item.id),
  );
  for (const item of candidate.requiredEvidence) {
    const slot = binding.evidenceSlots.find(expected => expected.id === item.id);
    assert.equal(item.bindingSource, slot.source);
    assert.equal(item.satisfied, true);
    assert.match(item.receiptRef, /^rrb-ref:/);
    assert.match(item.reviewerRef, /^rrb-reviewer:/);
    assert.doesNotMatch(item.receiptRef, /@|BEGIN PRIVATE KEY|PRIVATE KEY-----/);
    assert.doesNotMatch(item.reviewerRef, /@|BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  }
});

test('checker marks structure review-ready while keeping the route closed', () => {
  const result = checkOpeningBundle(candidate, { root });
  assert.equal(result.ok, true);
  assert.equal(result.readyForSeparateActivationApproval, true);
  assert.equal(result.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.equal(result.routeMayOpenNow, false);
  assert.deepEqual(result.problems, []);
});

test('candidate authorizes only source work and production fail-closed smoke', () => {
  for (const key of [
    'sourceOnlyDocsAndTests',
    'localValidation',
    'draftPr',
    'greenCheckMerge',
    'normalVercelDeploymentFromMain',
    'productionFailClosedSmoke',
    'cleanup',
  ]) {
    assert.equal(candidate.authorizes[key], true, `${key} should be allowed`);
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
    assert.equal(candidate.authorizes[key], false, `${key} must remain unauthorized`);
  }
});

test('human approval phrase is draft-only and excludes commercialization paths', () => {
  assert.equal(candidate.nextHumanGateDraft.requiredBeforeUse, true);
  assert.match(candidate.nextHumanGateDraft.draftApprovalPhrase, /admission-only body validation/);
  assert.match(candidate.nextHumanGateDraft.draftApprovalPhrase, /one concurrent session/);
  assert.match(candidate.nextHumanGateDraft.draftApprovalPhrase, /post-rollback fail-closed smoke/);
  assert.match(candidate.nextHumanGateDraft.draftApprovalPhrase, /No conversion, Sandbox dispatch, private CAD/);
  assert.match(candidate.nextHumanGateDraft.note, /draft only/);
});

test('production evidence remains fail-closed and markdown avoids activation claims', () => {
  assert.equal(candidate.latestProductionFailClosedSmoke.commit, candidate.baseCommit);
  assert.ok(candidate.latestProductionFailClosedSmoke.results.find(result => (
    result.route === 'POST /api/cad/user-import {}'
    && result.status === 401
    && result.code === 'USER_SESSION_REQUIRED'
  )));
  assert.ok(candidate.latestProductionFailClosedSmoke.results.find(result => (
    result.route === 'GET /api/cad/import-source-record'
    && result.status === 404
  )));
  assert.match(markdown, /not an activation packet/);
  assert.match(markdown, /does not authorize request body reads/);
  assert.match(markdown, /only valid route outcome remains closed/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
