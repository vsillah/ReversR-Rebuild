const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { checkOpeningBundle } = require('./cad-internal-admission-opening-bundle-checker');

const root = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync('docs/cad-internal-admission-human-qa-acceptance.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-human-qa-acceptance.md', 'utf8');
const candidate = JSON.parse(fs.readFileSync('docs/cad-internal-admission-candidate-opening-bundle.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

test('human QA acceptance is source-only and scoped to PR 374 candidate review', () => {
  assert.equal(receipt.mode, 'source-only-human-qa-acceptance-receipt');
  assert.equal(receipt.status, 'HUMAN_QA_ACCEPTED_CANDIDATE_BUNDLE_UPLOADS_DISABLED');
  assert.equal(receipt.sourceOnly, true);
  assert.equal(receipt.runtimeRouteChanged, false);
  assert.equal(receipt.baseCommit, '92b73ff0bf05e15e0d204a1a0303133faedcdc09');
  assert.equal(receipt.acceptedArtifact.pullRequest, 'https://github.com/vsillah/ReversR-Rebuild/pull/374');
  assert.equal(receipt.acceptedArtifact.mergeCommit, receipt.baseCommit);
  assert.equal(receipt.acceptedArtifact.reviewedPacket, 'docs/cad-internal-admission-candidate-opening-bundle.json');
  assert.equal(receipt.acceptedArtifact.humanQaAccepted, true);
});

test('QA acceptance does not become activation approval', () => {
  assert.equal(receipt.qaInterpretation.acceptsCandidateForNextDecision, true);
  assert.equal(receipt.qaInterpretation.acceptsSourceOnlyEvidenceShape, true);
  assert.equal(receipt.qaInterpretation.acceptsProductionUploadActivation, false);
  assert.equal(receipt.qaInterpretation.acceptsRequestBodyReads, false);
  assert.equal(receipt.qaInterpretation.acceptsRuntimeRouteChange, false);
  assert.equal(receipt.qaInterpretation.acceptsProviderEnvResourceBillingChanges, false);
  assert.equal(receipt.qaInterpretation.acceptsExternalMessages, false);
  assert.equal(receipt.qaInterpretation.acceptsCommercialReadinessClaim, false);
  assert.equal(receipt.nextDecisionPacket.acceptedByThisPacket, false);
  assert.match(receipt.nextDecisionPacket.note, /does not accept the activation phrase/);
});

test('route remains fail-closed and candidate checker still does not execute', () => {
  assert.equal(receipt.routeStateAfterQa.bodyAdmissionAuthorized, false);
  assert.equal(receipt.routeStateAfterQa.bodyReadAuthorized, false);
  assert.equal(receipt.routeStateAfterQa.routeMayOpenNow, false);
  assert.equal(receipt.routeStateAfterQa.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);

  const result = checkOpeningBundle(candidate, { root });
  assert.equal(result.ok, true);
  assert.equal(result.readyForSeparateActivationApproval, true);
  assert.equal(result.routeMayOpenNow, false);
  assert.equal(result.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
});

test('source bindings exist and remain sanitized', () => {
  for (const [key, fileRef] of Object.entries(receipt.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(serialized, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

test('next decision packet requires exact window and preserves hard boundaries', () => {
  for (const required of [
    'exact UTC startsAt',
    'exact UTC expiresAt',
    'exact internal cohort',
    'post-rollback fail-closed smoke requirement',
  ]) {
    assert.ok(receipt.nextDecisionPacket.minimumFieldsRequired.includes(required));
  }
  assert.match(receipt.nextDecisionPacket.draftApprovalPhrase, /candidate opening bundle/);
  assert.match(receipt.nextDecisionPacket.draftApprovalPhrase, /admission-only body validation/);
  assert.match(receipt.nextDecisionPacket.draftApprovalPhrase, /one concurrent session/);
  assert.match(receipt.nextDecisionPacket.draftApprovalPhrase, /No conversion, Sandbox dispatch, private CAD/);
});

test('receipt authorizes only source work and cleanup', () => {
  for (const key of [
    'sourceOnlyDocsAndTests',
    'localValidation',
    'draftPr',
    'greenCheckMerge',
    'normalVercelDeploymentFromMain',
    'productionFailClosedSmoke',
    'cleanup',
  ]) {
    assert.equal(receipt.authorizes[key], true, `${key} should be allowed`);
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
    assert.equal(receipt.authorizes[key], false, `${key} must remain unauthorized`);
  }
});

test('markdown keeps QA acceptance separate from activation', () => {
  assert.match(markdown, /candidate bundle accepted by human QA/);
  assert.match(markdown, /does not accept production upload activation/);
  assert.match(markdown, /still requires explicit approval/);
  assert.match(markdown, /not executable/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
});
