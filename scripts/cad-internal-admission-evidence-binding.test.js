const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-evidence-binding.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-evidence-binding.md', 'utf8');
const switchPacket = JSON.parse(fs.readFileSync('docs/cad-default-closed-admission-switch.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const costWorkbook = JSON.parse(fs.readFileSync('docs/cad-per-run-cost-workbook.json', 'utf8'));
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const switchSource = fs.readFileSync('server/cadInternalProductionAdmissionSwitch.js', 'utf8');

function valueAtRef(ref) {
  const [file, fragment] = ref.split('#');
  if (!fragment) return undefined;
  let source;
  if (file === 'offline/cad-convex/userUploadActivationReadiness.json') source = readiness;
  if (file === 'docs/cad-per-run-cost-workbook.json') source = costWorkbook;
  if (!source) return undefined;
  return fragment.split('.').reduce((value, key) => value?.[key], source);
}

test('packet is source-only and binds to existing evidence sources', () => {
  assert.equal(packet.mode, 'source-only-internal-admission-evidence-binding');
  assert.equal(packet.status, 'EVIDENCE_BINDING_READY_SWITCH_STILL_DISABLED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, 'f1901fd04cc1e323391d872f5d8f508e0d552f2e');
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.route, 'POST /api/cad/user-import');

  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must point at an existing file`);
  }
});

test('current state matches the imported default-closed switch and fail-closed route', () => {
  assert.equal(switchPacket.runtimeRouteChanged, true);
  assert.equal(switchPacket.status, 'DEFAULT_CLOSED_SWITCH_IMPORTED_UPLOADS_DISABLED');
  assert.equal(switchPacket.bodyAdmissionAuthorized, false);
  assert.equal(switchPacket.defaultDecision.bodyReadAuthorized, false);
  assert.equal(switchPacket.defaultDecision.conversionAuthorized, false);
  assert.equal(switchPacket.defaultDecision.sandboxDispatchAuthorized, false);
  assert.equal(switchPacket.defaultDecision.storeMutationAuthorized, false);
  assert.equal(packet.currentState.switchImported, true);
  assert.equal(packet.currentState.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentState.bodyReadAuthorized, false);
  assert.equal(packet.currentState.terminalCode, 'USER_UPLOADS_DISABLED');
});

test('route source preserves the literal closed gate before request body validation', () => {
  assert.match(routeSource, /createCadInternalProductionAdmissionSwitch/);
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(routeSource, /if \(!BODY_ADMISSION_AUTHORIZED\) return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.ok(routeSource.indexOf('admissionSwitch.decide') < routeSource.indexOf('validateRequestBody(req)'));
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(routeSource, /process\.env\.[A-Z0-9_]*BODY_ADMISSION|BODY_ADMISSION_AUTHORIZED\s*=\s*req\./);
});

test('switch source stays provider-free, store-free and disabled', () => {
  assert.doesNotMatch(switchSource, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser|console\.|cadSandbox/i);
  assert.match(switchSource, /disabledDecision/);
  assert.match(switchSource, /bodyAdmissionAuthorized: false/);
  assert.match(switchSource, /bodyReadAuthorized: false/);
  assert.match(switchSource, /conversionAuthorized: false/);
  assert.match(switchSource, /sandboxDispatchAuthorized: false/);
  assert.match(switchSource, /storeMutationAuthorized: false/);
});

test('all bound evidence slots remain unsatisfied upstream', () => {
  assert.ok(packet.evidenceSlots.length >= 12);

  for (const slot of packet.evidenceSlots) {
    assert.equal(slot.satisfiedNow, false, `${slot.id} must not be satisfied yet`);
    assert.equal(slot.opensWhat, 'nothing', `${slot.id} must not open behavior`);
    const upstreamValue = valueAtRef(slot.source);
    assert.notEqual(upstreamValue, undefined, `${slot.id} must resolve to upstream evidence`);
    assert.ok(upstreamValue === null || upstreamValue === false, `${slot.id} must remain null or false upstream`);
  }

  assert.equal(readiness.enabled, false);
  assert.equal(readiness.liveReady, false);
  assert.equal(readiness.executable, false);
  assert.equal(readiness.gates.activation.evidence.reviewedRuntimeImplementationCommit, null);
  assert.equal(readiness.gates.activation.evidence.exactDeploymentAndRoute, null);
  assert.equal(readiness.gates.activation.evidence.exactCohortAndWindow, null);
  assert.equal(readiness.gates.activation.evidence.explicitUploadActivationApproval, null);
  assert.equal(readiness.gates.activation.evidence.separateConversionAndSandboxApproval, null);
  assert.equal(costWorkbook.feePerRunReady, false);
  assert.equal(costWorkbook.customerFeeReady, false);
});

test('run manifest and future opening still exclude upload commercialization and conversion paths', () => {
  assert.equal(runManifest.productionUploadActivationAuthorized, false);
  assert.equal(runManifest.productionConversionAuthorized, false);
  assert.equal(runManifest.sandboxDispatchAuthorized, false);
  assert.equal(runManifest.runManifest.executableNow, false);
  assert.equal(runManifest.runManifest.activationApprovalAccepted, false);
  assert.equal(runManifest.runManifest.admissionOnly, true);
  assert.equal(runManifest.runManifest.conversionAllowed, false);
  assert.equal(runManifest.runManifest.sandboxDispatchAllowed, false);
  assert.equal(runManifest.runManifest.privateCadAllowed, false);
  assert.equal(runManifest.runManifest.realUsersAllowed, false);

  assert.match(packet.firstFutureAllowedOpening.scope, /admission-only/);
  assert.equal(packet.firstFutureAllowedOpening.conversionAllowed, false);
  assert.equal(packet.firstFutureAllowedOpening.sandboxDispatchAllowed, false);
  assert.equal(packet.firstFutureAllowedOpening.storeMutationAllowed, false);
  assert.equal(packet.firstFutureAllowedOpening.privateCadAllowed, false);
  assert.equal(packet.firstFutureAllowedOpening.realUsersAllowed, false);
  assert.equal(packet.firstFutureAllowedOpening.commercialReadinessClaimAllowed, false);
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

test('markdown states the boundary without claiming readiness or exposing secrets', () => {
  assert.match(markdown, /does not fill those slots/);
  assert.match(markdown, /only valid production route outcome is still `USER_UPLOADS_DISABLED`/);
  assert.match(markdown, /None of these slots are satisfied by this packet/);
  assert.match(markdown, /does not authorize request body reads/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
});
