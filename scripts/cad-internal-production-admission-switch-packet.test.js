const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-production-admission-switch-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-production-admission-switch-packet.md', 'utf8');
const activationScope = JSON.parse(fs.readFileSync('docs/cad-production-upload-activation-scope.json', 'utf8'));
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const costWorkbook = JSON.parse(fs.readFileSync('docs/cad-per-run-cost-workbook.json', 'utf8'));
const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const runtimeBridge = fs.readFileSync('server/cadUploadAdmissionRuntimeBridge.js', 'utf8');

function valueAtReadinessSource(source) {
  const fragment = source.split('#')[1];
  if (!fragment || fragment.includes(' and ')) return undefined;
  return fragment.split('.').reduce((value, key) => value?.[key], readiness);
}

test('packet defines a source-only default-closed switch and preserves current route state', () => {
  assert.equal(packet.mode, 'source-only-internal-production-admission-switch');
  assert.equal(packet.status, 'SOURCE_ONLY_SWITCH_PACKET_READY_DISABLED_DEFAULT');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.baseCommit, 'a68e7d36ddb752df60238fe8b356818c56aef0ad');
  assert.equal(packet.currentRouteState.route, readiness.route);
  assert.equal(packet.currentRouteState.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentRouteState.terminalCode, readiness.currentTerminalCode);
  assert.equal(packet.currentRouteState.runtimeBridgeMounted, false);
  assert.equal(packet.currentRouteState.activationSwitchMounted, false);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(router, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(router, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('switch model matches the activation-scope next gate without granting body or conversion authority', () => {
  const level = activationScope.activationLevels.find(item => item.id === packet.switchModel.firstEligibleLevel);
  assert.equal(level.id, 'internal-production-admission-dry-run');
  assert.equal(level.state, 'next_implementable_gate');
  assert.equal(packet.switchModel.defaultDecision, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.switchModel.closedWhenAnyGuardMissing, true);
  assert.equal(packet.switchModel.serverOwned, true);
  assert.equal(packet.switchModel.requestOwnedFlagsAccepted, false);
  assert.equal(packet.switchModel.envOnlyActivationAccepted, false);
  assert.equal(packet.switchModel.bodyReadOnlyAfterAllGuardsPass, true);
  assert.equal(packet.switchModel.conversionAllowed, false);
  assert.equal(packet.switchModel.sandboxDispatchAllowed, false);
  assert.equal(packet.switchModel.durableProjectHistoryAllowed, false);
  assert.equal(packet.switchModel.privateCadAllowed, false);
  assert.equal(packet.switchModel.realUsersAllowed, false);
});

test('all switch-opening guards remain unsatisfied in current evidence', () => {
  assert.ok(packet.guardsRequiredBeforeSwitchCanOpen.length >= 9);
  for (const guard of packet.guardsRequiredBeforeSwitchCanOpen) {
    assert.equal(guard.satisfiedNow, false, `${guard.id} must not be marked satisfied`);
    const evidenceValue = valueAtReadinessSource(guard.source);
    if (evidenceValue !== undefined) assert.equal(evidenceValue, null, `${guard.id} must still be null upstream`);
  }
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.liveReady, false);
  assert.equal(readiness.executable, false);
  assert.equal(readiness.gates.activation.evidence.reviewedRuntimeImplementationCommit, null);
  assert.equal(readiness.gates.activation.evidence.explicitUploadActivationApproval, null);
  assert.equal(costWorkbook.feePerRunReady, false);
  assert.equal(costWorkbook.customerFeeReady, false);
});

test('source bindings point at existing closed models and runtime bridge stays unmounted', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} source binding must exist`);
  }

  assert.equal(runManifest.runManifest.executableNow, false);
  assert.equal(runManifest.runManifest.conversionAllowed, false);
  assert.equal(runManifest.runManifest.sandboxDispatchAllowed, false);
  assert.equal(runManifest.runManifest.privateCadAllowed, false);
  assert.equal(runManifest.runManifest.realUsersAllowed, false);
  assert.match(runtimeBridge, /runtimeMounted: false/);
  assert.match(runtimeBridge, /bodyAdmissionAuthorized: false/);
  assert.match(runtimeBridge, /USER_UPLOADS_DISABLED/);
  assert.doesNotMatch(router, /cadUploadAdmissionRuntimeBridge|createCadUploadAdmissionRuntimeBridge/);
});

test('future dry-run scope and rollback plan exclude conversion, Sandbox, stores and private CAD', () => {
  assert.match(packet.futureInternalDryRunBehavior.eligibleMaterials, /public, synthetic/);
  assert.equal(packet.futureInternalDryRunBehavior.bodyRead, 'allowed only after exact approved switch guards pass');
  assert.ok(packet.futureInternalDryRunBehavior.notResult.includes('converted CAD output'));
  assert.ok(packet.futureInternalDryRunBehavior.notResult.includes('Sandbox job'));
  assert.ok(packet.futureInternalDryRunBehavior.notResult.includes('durable reconstruction history'));
  assert.equal(packet.rollbackPlan.firstAction, 'close switch before drain');
  assert.equal(packet.rollbackPlan.requiredTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.rollbackPlan.deleteRowsWithoutDisposition, false);
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
    'runtimeRouteMount',
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
  assert.match(packet.nextRecommendedGate, /default-closed runtime switch implementation/);
});

test('markdown keeps the boundary clear without leaking secrets or claiming readiness', () => {
  assert.match(markdown, /does not mount the switch/);
  assert.match(markdown, /None of those guards are satisfied by this packet/);
  assert.match(markdown, /It does not authorize runtime route mounting/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
});
