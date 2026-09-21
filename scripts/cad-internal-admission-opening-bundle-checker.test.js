const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const binding = JSON.parse(fs.readFileSync('docs/cad-internal-admission-evidence-binding.json', 'utf8'));
const template = JSON.parse(fs.readFileSync('docs/cad-internal-admission-opening-bundle-template.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-opening-bundle-checker.md', 'utf8');
const checkerSource = fs.readFileSync('scripts/cad-internal-admission-opening-bundle-checker.js', 'utf8');
const {
  buildOpeningBundleTemplate,
  checkOpeningBundle,
} = require('./cad-internal-admission-opening-bundle-checker');

function filledBundle() {
  const bundle = buildOpeningBundleTemplate({ baseCommit: 'reviewed-runtime-commit' });
  bundle.status = 'CANDIDATE_READY_FOR_SEPARATE_APPROVAL_REVIEW';
  bundle.requiredEvidence = bundle.requiredEvidence.map(item => ({
    ...item,
    receiptRef: `rrb-ref:${item.id}-receipt`,
    reviewerRef: 'rrb-reviewer:vambah',
    satisfied: true,
  }));
  bundle.openingBundleRequirements = {
    exactRuntimeCommit: 'rrb-ref:reviewed-runtime-commit',
    productionUrlAndRoute: 'rrb-ref:production-route-user-import',
    startsAtUtc: 'rrb-ref:starts-at',
    expiresAtUtc: 'rrb-ref:expires-at',
    internalCohortRef: 'rrb-ref:internal-cohort-mark',
    explicitUploadActivationPhrase: 'rrb-ref:separate-human-approval-phrase',
    concurrentSessionRevocationFence: 'rrb-ref:concurrent-session-revocation-fence',
    browserCookieTransportReview: 'rrb-ref:browser-cookie-origin-csrf-review',
    nativeBearerTransportReview: 'rrb-ref:native-bearer-transport-review',
    rollbackSessionRevocationEvidence: 'rrb-ref:rollback-session-revocation',
    retentionDisposition: 'rrb-ref:bounded-retention-disposition',
    durablePrivateRegisterAndLockout: 'rrb-ref:durable-private-register-lockout',
    environmentDeploymentTestApprovals: 'rrb-ref:environment-deployment-test-approval-split',
    allInCostCapEvidence: 'rrb-ref:cost-cap-evidence',
    conversionSandboxApprovalSplit: 'rrb-ref:conversion-sandbox-approval-split',
    stopOnUnknownOutcome: true,
    postRollbackSmokeRefs: ['rrb-ref:post-rollback-smoke'],
  };
  return bundle;
}

test('checked-in template matches the evidence binding and stays non-executable', () => {
  assert.equal(template.mode, 'source-only-guarded-switch-opening-bundle-template');
  assert.equal(template.sourceOnly, true);
  assert.equal(template.runtimeRouteChanged, false);
  assert.equal(template.evidenceBinding, 'docs/cad-internal-admission-evidence-binding.json');
  assert.equal(template.route, binding.route);
  assert.deepEqual(
    template.requiredEvidence.map(item => item.id),
    binding.evidenceSlots.map(slot => slot.id),
  );
  for (const item of template.requiredEvidence) {
    const boundSlot = binding.evidenceSlots.find(slot => slot.id === item.id);
    assert.equal(item.bindingSource, boundSlot.source);
    assert.equal(item.receiptRef, null);
    assert.equal(item.reviewerRef, null);
    assert.equal(item.satisfied, false);
  }
  assert.equal(template.requestedOpening.executableNow, false);
  assert.equal(template.requestedOpening.requestBodyReadAuthorizedNow, false);
  assert.equal(template.requestedOpening.requiresSeparateActivationApproval, true);
});

test('generated template follows the same slots and forbidden runtime flags', () => {
  const generated = buildOpeningBundleTemplate({ baseCommit: 'test-base' });
  assert.equal(generated.baseCommit, 'test-base');
  assert.equal(generated.route, binding.route);
  assert.deepEqual(
    generated.requiredEvidence.map(item => item.id),
    template.requiredEvidence.map(item => item.id),
  );
  for (const flag of [
    'executableNow',
    'requestBodyReadAuthorizedNow',
    'conversionAllowed',
    'sandboxDispatchAllowed',
    'storeMutationAllowed',
    'privateCadAllowed',
    'realUsersAllowed',
    'commercialReadinessClaimAllowed',
  ]) {
    assert.equal(generated.requestedOpening[flag], false, `${flag} must default false`);
  }
});

test('checked-in template fails readiness until every future evidence slot is filled', () => {
  const result = checkOpeningBundle(template);
  assert.equal(result.ok, false);
  assert.equal(result.readyForSeparateActivationApproval, false);
  assert.equal(result.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.equal(result.routeMayOpenNow, false);
  assert.ok(result.problems.some(problem => problem.includes('reviewed-runtime-implementation-commit.receiptRef')));
  assert.ok(result.problems.some(problem => problem.includes('openingBundleRequirements.exactRuntimeCommit')));
});

test('complete sanitized admission-only bundle is review-ready but still cannot execute', () => {
  const result = checkOpeningBundle(filledBundle());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(result.readyForSeparateActivationApproval, true);
  assert.equal(result.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.equal(result.routeMayOpenNow, false);
});

test('checker rejects runtime activation, conversion, Sandbox, store or user expansion flags', () => {
  for (const [section, key] of [
    ['requestedOpening', 'requestBodyReadAuthorizedNow'],
    ['requestedOpening', 'conversionAllowed'],
    ['requestedOpening', 'sandboxDispatchAllowed'],
    ['requestedOpening', 'storeMutationAllowed'],
    ['requestedOpening', 'privateCadAllowed'],
    ['requestedOpening', 'realUsersAllowed'],
    ['authorizes', 'productionUploadActivation'],
    ['authorizes', 'requestBodyRead'],
    ['authorizes', 'conversionDispatch'],
    ['authorizes', 'sandboxDispatch'],
    ['authorizes', 'storeMutation'],
    ['authorizes', 'externalMessages'],
  ]) {
    const bundle = filledBundle();
    bundle[section][key] = true;
    const result = checkOpeningBundle(bundle);
    assert.equal(result.ok, false, `${section}.${key} must fail`);
    assert.ok(result.problems.some(problem => problem.includes(`${section}.${key}`)));
  }
});

test('checker rejects missing or stale binding slots', () => {
  const missing = filledBundle();
  missing.requiredEvidence = missing.requiredEvidence.filter(item => item.id !== 'cost-workbook-fee-readiness');
  assert.ok(checkOpeningBundle(missing).problems.includes('requiredEvidence.cost-workbook-fee-readiness is missing'));

  const stale = filledBundle();
  stale.requiredEvidence.push({
    id: 'unexpected-extra-slot',
    bindingSource: 'docs/example.json#noop',
    receiptRef: 'rrb-ref:extra',
    reviewerRef: 'rrb-reviewer:vambah',
    satisfied: true,
  });
  const result = checkOpeningBundle(stale);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.includes('requiredEvidence.unexpected-extra-slot is not part of the current binding'));
});

test('checker source and docs remain local-only and do not claim activation', () => {
  assert.doesNotMatch(checkerSource, /fetch\s*\(|https?\.request|process\.env|child_process|convex\/browser|cadSandbox/i);
  assert.match(markdown, /review tool, not an activation mechanism/);
  assert.match(markdown, /does not open the route/);
  assert.match(markdown, /The checked-in template is intentionally incomplete/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
