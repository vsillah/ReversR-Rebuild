const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildOpeningBundleTemplate,
  checkOpeningBundle,
} = require('./cad-internal-admission-opening-bundle-checker');

const root = path.resolve(__dirname, '..');
const bundle = JSON.parse(fs.readFileSync('docs/cad-internal-admission-readiness-bundle.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-readiness-bundle.md', 'utf8');
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const template = JSON.parse(fs.readFileSync('docs/cad-internal-admission-opening-bundle-template.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const lockoutDoc = fs.readFileSync('docs/cad-lockout-retained-terminal-state.md', 'utf8');

const newRequirementKeys = [
  'concurrentSessionRevocationFence',
  'browserCookieTransportReview',
  'nativeBearerTransportReview',
  'durablePrivateRegisterAndLockout',
  'environmentDeploymentTestApprovals',
  'conversionSandboxApprovalSplit',
];

function filledBundle() {
  const candidate = buildOpeningBundleTemplate({ baseCommit: 'reviewed-runtime-commit' });
  candidate.requiredEvidence = candidate.requiredEvidence.map(item => ({
    ...item,
    receiptRef: `rrb-ref:${item.id}-receipt`,
    reviewerRef: 'rrb-reviewer:vambah',
    satisfied: true,
  }));
  candidate.openingBundleRequirements = {
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
  return candidate;
}

test('readiness bundle is source-only and keeps the route closed', () => {
  assert.equal(bundle.mode, 'source-only-internal-admission-readiness-bundle');
  assert.equal(bundle.status, 'READINESS_BUNDLE_DRAFT_UPLOADS_DISABLED');
  assert.equal(bundle.sourceOnly, true);
  assert.equal(bundle.runtimeRouteChanged, false);
  assert.equal(bundle.baseCommit, 'c591c853cb353815cdd526270ef715efd6deb19f');
  assert.equal(bundle.expensesUsd, 0);
  assert.equal(bundle.currentRouteState.bodyAdmissionAuthorized, false);
  assert.equal(bundle.currentRouteState.bodyReadAuthorized, false);
  assert.equal(bundle.currentRouteState.routeMayOpenNow, false);
  assert.equal(bundle.currentRouteState.terminalCodeUntilSeparateActivationApproval, 'USER_UPLOADS_DISABLED');
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('source bindings exist and upstream evidence slots remain unaccepted', () => {
  for (const [key, fileRef] of Object.entries(bundle.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  assert.equal(readiness.gates.exactSessionAuthority.evidence.concurrentRevocationFence, null);
  assert.equal(readiness.gates.uploadPermission.evidence.cookieExactHttpsOriginAndSessionCsrf, null);
  assert.equal(readiness.gates.uploadPermission.evidence.nativeBearerTransportReview, null);
  assert.equal(readiness.gates.rollback.evidence.sessionRevocationEvidence, null);
  assert.equal(readiness.gates.providerReadiness.evidence.supportedDispositionOrApprovedBoundedRetention, null);
  assert.equal(readiness.gates.providerReadiness.evidence.durablePrivateRegisterAndLockout, null);
  assert.equal(readiness.gates.providerReadiness.evidence.separateEnvironmentDeploymentTestApprovals, null);
  assert.equal(readiness.gates.activation.evidence.reviewedRuntimeImplementationCommit, null);
  assert.equal(readiness.gates.activation.evidence.exactDeploymentAndRoute, null);
  assert.equal(readiness.gates.activation.evidence.exactCohortAndWindow, null);
  assert.equal(readiness.gates.activation.evidence.explicitUploadActivationApproval, null);
  assert.equal(readiness.gates.activation.evidence.separateConversionAndSandboxApproval, null);
});

test('retained state and private register reviews stay unaccepted and no-delete', () => {
  assert.equal(bundle.retainedStateDispositionReview.accepted, false);
  assert.equal(bundle.privateRegisterLockoutReview.accepted, false);
  assert.equal(bundle.privateRegisterLockoutReview.privateCadAllowed, false);
  assert.equal(runManifest.rollback.rollbackCanDeleteRows, false);
  assert.equal(runManifest.rollback.unknownReservationsRemainLocked, true);
  assert.equal(runManifest.rollback.safeRetainedStateDispositionRequired, true);
  assert.match(lockoutDoc, /Private ownership requires source SHA/);
  assert.match(lockoutDoc, /Never expose addresses, tokens or hashes/);
  assert.match(lockoutDoc, /Missing lockout/);
});

test('environment deployment and test approvals are split from normal deployment', () => {
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.accepted, false);
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.deploymentApprovalSeparate, true);
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.liveTestApprovalSeparate, true);
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.providerEnvResourceChangeApprovalSeparate, true);
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.productionUploadActivationApprovalSeparate, true);
  assert.equal(bundle.environmentDeploymentTestApprovalSplit.currentNormalDeploymentDoesNotSatisfyActivation, true);
});

test('opening bundle checker and template include the larger requirement set', () => {
  for (const key of newRequirementKeys) {
    assert.ok(Object.hasOwn(template.openingBundleRequirements, key), `${key} must exist in template`);
    assert.equal(template.openingBundleRequirements[key], null);
    assert.ok(bundle.openingBundleRollup.newRequirementKeys.includes(key));
  }
  const incomplete = checkOpeningBundle(template);
  assert.equal(incomplete.ok, false);
  for (const key of newRequirementKeys) {
    assert.ok(incomplete.problems.some(problem => problem.includes(`openingBundleRequirements.${key}`)));
  }
  const ready = checkOpeningBundle(filledBundle());
  assert.equal(ready.ok, true);
  assert.equal(ready.readyForSeparateActivationApproval, true);
  assert.equal(ready.routeMayOpenNow, false);
  assert.equal(ready.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
});

test('bundle excludes activation, private CAD, stores, providers and external messages', () => {
  for (const key of [
    'requestBodyReadAuthorizedNow',
    'productionUploadActivationAuthorizedNow',
    'conversionAllowed',
    'sandboxDispatchAllowed',
    'storeMutationAllowed',
    'privateCadAllowed',
    'realUsersAllowed',
    'providerEnvResourceBillingChangesAllowed',
    'externalMessagesAllowed',
    'commercialReadinessClaimAllowed',
  ]) {
    assert.equal(bundle.guardrails[key], false, `${key} must remain false`);
  }
  for (const key of [
    'retainedStateDispositionAccepted',
    'privateRegisterLockoutAccepted',
    'environmentDeploymentTestSplitAccepted',
    'openingBundleAccepted',
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
    assert.equal(bundle.authorizes[key], false, `${key} must remain unauthorized`);
  }
});

test('bundle text stays sanitized and does not claim activation', () => {
  const serialized = JSON.stringify(bundle);
  assert.doesNotMatch(serialized, /@|\+\d{7,}|BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.match(markdown, /does not authorize request body reads/);
  assert.match(markdown, /candidate opening bundle for human approval review only/);
});
