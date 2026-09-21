const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-opening-review-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-opening-review-packet.md', 'utf8');
const binding = JSON.parse(fs.readFileSync('docs/cad-internal-admission-evidence-binding.json', 'utf8'));
const template = JSON.parse(fs.readFileSync('docs/cad-internal-admission-opening-bundle-template.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const costWorkbook = JSON.parse(fs.readFileSync('docs/cad-per-run-cost-workbook.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const {
  checkOpeningBundle,
} = require('./cad-internal-admission-opening-bundle-checker');

function valueAtRef(ref) {
  const [file, fragment] = ref.split('#');
  if (!fragment) return undefined;
  let source;
  if (file === 'offline/cad-convex/userUploadActivationReadiness.json') source = readiness;
  if (file === 'docs/cad-per-run-cost-workbook.json') source = costWorkbook;
  if (!source) return undefined;
  return fragment.split('.').reduce((value, key) => value?.[key], source);
}

test('review packet is source-only and does not interpret approval as activation', () => {
  assert.equal(packet.mode, 'source-only-opening-review-gap-packet');
  assert.equal(packet.status, 'NOT_READY_FOR_ACTIVATION_REVIEW_MISSING_EVIDENCE');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, 'a81e217a223d810ee727d5b1e8841a40f82d8293');
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.reviewScope.explicitUploadActivationApprovalSatisfied, false);
  assert.equal(packet.reviewScope.productionUploadActivationAuthorizedNow, false);
  assert.equal(packet.reviewScope.requestBodyReadAuthorizedNow, false);
});

test('packet source bindings exist and route remains literal fail-closed', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }

  assert.equal(packet.currentRouteState.switchImported, true);
  assert.equal(packet.currentRouteState.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentRouteState.bodyReadAuthorized, false);
  assert.equal(packet.currentRouteState.terminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.currentRouteState.routeMayOpenNow, false);
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('blocking evidence list exactly mirrors the binding slots and remains unsatisfied upstream', () => {
  assert.deepEqual(
    packet.blockingEvidence.map(item => item.id),
    binding.evidenceSlots.map(item => item.id),
  );

  for (const item of packet.blockingEvidence) {
    const bound = binding.evidenceSlots.find(slot => slot.id === item.id);
    assert.equal(item.bindingSource, bound.source);
    assert.equal(item.upstreamSatisfied, false);
    assert.equal(item.activationBlocking, true);
    assert.match(item.needed, /\S/);
    const upstream = valueAtRef(item.bindingSource);
    assert.notEqual(upstream, undefined, `${item.id} must resolve upstream`);
    assert.ok(upstream === null || upstream === false, `${item.id} must remain null or false upstream`);
  }
});

test('checked-in opening bundle template still fails checker readiness', () => {
  const result = checkOpeningBundle(template, { root });
  assert.equal(result.ok, false);
  assert.equal(result.readyForSeparateActivationApproval, false);
  assert.equal(result.terminalCodeUntilSeparateApproval, 'USER_UPLOADS_DISABLED');
  assert.equal(result.routeMayOpenNow, false);
  assert.deepEqual(packet.candidateOpeningBundleReview.expectedResultNow, {
    ok: false,
    readyForSeparateActivationApproval: false,
    terminalCodeUntilSeparateApproval: 'USER_UPLOADS_DISABLED',
    routeMayOpenNow: false,
  });
});

test('known production facts are recorded as non-activation evidence only', () => {
  assert.equal(packet.knownFactsNotActivationEvidence.latestMainCommit, packet.baseCommit);
  assert.equal(packet.knownFactsNotActivationEvidence.productionUrl, 'https://reversr.vercel.app');
  const smoke = packet.knownFactsNotActivationEvidence.latestFailClosedSmoke.routes;
  assert.ok(smoke.find(route => route.route === 'GET /' && route.status === 200));
  assert.ok(smoke.find(route => route.route === 'POST /api/cad/user-import {}' && route.status === 401 && route.code === 'USER_SESSION_REQUIRED'));
  assert.ok(smoke.find(route => route.route === 'POST /api/cad/import {}' && route.status === 401 && route.code === 'UNAUTHORIZED'));
  assert.ok(smoke.find(route => route.route === 'GET /api/cad/import-source-record' && route.status === 404));
});

test('draft human gate text is present but not accepted by the packet', () => {
  assert.equal(packet.nextHumanGateDraft.requiredBeforeUse, true);
  assert.match(packet.nextHumanGateDraft.draftApprovalPhrase, /admission-only body validation/);
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

test('markdown keeps the activation boundary clear', () => {
  assert.match(markdown, /not as production upload activation/);
  assert.match(markdown, /still fails that checker/);
  assert.match(markdown, /does not authorize request body reads/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
});
