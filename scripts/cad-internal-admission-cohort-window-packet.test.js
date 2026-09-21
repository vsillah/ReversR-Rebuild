const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-cohort-window-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-cohort-window-packet.md', 'utf8');
const reviewPacket = JSON.parse(fs.readFileSync('docs/cad-internal-admission-opening-review-packet.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

test('packet is source-only and does not accept cohort or window', () => {
  assert.equal(packet.mode, 'source-only-exact-cohort-window-draft');
  assert.equal(packet.status, 'COHORT_WINDOW_DRAFT_NOT_ACCEPTED_UPLOADS_DISABLED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, 'f712cc98712284a35006c2fa576d78370bf3b667');
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.cohortDraft.accepted, false);
  assert.equal(packet.windowDraft.accepted, false);
  assert.equal(packet.windowDraft.startsAtUtc, null);
  assert.equal(packet.windowDraft.expiresAtUtc, null);
});

test('source bindings exist and route remains literal fail-closed', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  assert.equal(packet.route, reviewPacket.route);
  assert.equal(packet.guardrails.bodyAdmissionAuthorized, false);
  assert.equal(packet.guardrails.requestBodyReadAuthorizedNow, false);
  assert.equal(packet.guardrails.productionUploadActivationAuthorizedNow, false);
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('draft cohort is bounded to the existing internal tester ref without exposing contact data', () => {
  assert.equal(runManifest.operators.testerReviewerRef, 'rrb-ref:cad-upload-internal-tester-reviewer-mark');
  assert.deepEqual(packet.cohortDraft.participantRefs, [runManifest.operators.testerReviewerRef]);
  assert.equal(packet.cohortDraft.participantCount, 1);
  assert.equal(packet.cohortDraft.maxConcurrentUploadSessions, 1);
  assert.equal(packet.cohortDraft.maxUploadAttempts, 1);
  assert.equal(packet.cohortDraft.privateCadAllowed, false);
  assert.equal(packet.cohortDraft.realUsersAllowed, false);
  assert.equal(packet.cohortDraft.externalDeliveryAllowed, false);
  assert.doesNotMatch(JSON.stringify(packet), /@|\+\d{7,}|BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});

test('window shape stays single-run and cannot satisfy activation readiness yet', () => {
  assert.equal(packet.windowDraft.maxDurationMinutes, 60);
  assert.equal(packet.windowDraft.singleWindowOnly, true);
  assert.equal(packet.windowDraft.retry, false);
  assert.equal(packet.windowDraft.secondRun, false);
  assert.equal(packet.windowDraft.stopOnUnknownOutcome, true);
  assert.equal(packet.windowDraft.requiresFreshApprovalWhenExpired, true);
  assert.equal(readiness.gates.activation.evidence.exactCohortAndWindow, null);
  assert.equal(packet.activationReadinessProjection.upstreamSlotCurrentlySatisfied, false);
  assert.equal(packet.activationReadinessProjection.openingBundleReceiptRef, null);
  assert.equal(packet.activationReadinessProjection.checkerReadyForSeparateActivationApproval, false);
  assert.equal(packet.activationReadinessProjection.routeMayOpenNow, false);
  assert.equal(packet.activationReadinessProjection.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
});

test('guardrails exclude conversion, Sandbox, stores, private CAD, real users and provider changes', () => {
  for (const key of [
    'conversionAllowed',
    'sandboxDispatchAllowed',
    'storeMutationAllowed',
    'privateCadAllowed',
    'realUsersAllowed',
    'providerEnvResourceBillingChangesAllowed',
    'externalMessagesAllowed',
  ]) {
    assert.equal(packet.guardrails[key], false, `${key} must remain false`);
  }
});

test('draft human gate text is present but not accepted by this packet', () => {
  assert.equal(packet.nextHumanGateDraft.requiredBeforeUse, true);
  assert.match(packet.nextHumanGateDraft.draftApprovalPhrase, /startsAtUtc and expiresAtUtc exactly as named/);
  assert.match(packet.nextHumanGateDraft.draftApprovalPhrase, /one attempt, one concurrent session/);
  assert.match(packet.nextHumanGateDraft.draftApprovalPhrase, /No conversion, Sandbox dispatch/);
  assert.match(packet.nextHumanGateDraft.note, /draft only/);
});

test('packet authorizes only source work and production fail-closed smoke', () => {
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
    'cohortAccepted',
    'windowAccepted',
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

test('markdown keeps the boundary clear', () => {
  assert.match(markdown, /does not accept the cohort/);
  assert.match(markdown, /`BODY_ADMISSION_AUTHORIZED` remains `false`/);
  assert.match(markdown, /Execution remains blocked/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
