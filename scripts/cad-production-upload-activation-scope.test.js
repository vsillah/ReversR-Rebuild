const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const scope = JSON.parse(fs.readFileSync('docs/cad-production-upload-activation-scope.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-production-upload-activation-scope.md', 'utf8');
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const costWorkbook = JSON.parse(fs.readFileSync('docs/cad-per-run-cost-workbook.json', 'utf8'));
const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

function atPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}

test('activation scope is source-only and preserves the current disabled route contract', () => {
  assert.equal(scope.packet, 'cad-production-upload-activation-scope');
  assert.equal(scope.status, 'source_only_scope_ready');
  assert.equal(scope.sourceOnly, true);
  assert.equal(scope.expensesUsd, 0);
  assert.equal(scope.baseCommit, 'a2f514c2de5a080f6b13fb8aba9b3328aeb88a0e');
  assert.equal(scope.currentState.productionUserUploadRoute.route, readiness.route);
  assert.equal(scope.currentState.productionUserUploadRoute.terminalCode, readiness.currentTerminalCode);
  assert.equal(scope.currentState.productionUserUploadRoute.bodyAdmissionAuthorized, false);
  assert.equal(scope.currentState.productionUserUploadRoute.runtimeExecutorWired, false);
  assert.equal(scope.currentState.productionUserUploadRoute.conversionWired, false);
  assert.equal(scope.currentState.productionUserUploadRoute.sandboxDispatchWired, false);
  assert.equal(scope.currentState.activationReadiness.enabled, readiness.enabled);
  assert.equal(scope.currentState.activationReadiness.liveReady, readiness.liveReady);
  assert.equal(scope.currentState.activationReadiness.executable, readiness.executable);
  assert.equal(scope.currentState.costModel.feePerRunReady, costWorkbook.feePerRunReady);
  assert.equal(scope.currentState.costModel.customerFeeReady, costWorkbook.customerFeeReady);
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.match(router, /return send\(res, 'USER_UPLOADS_DISABLED'\);/);
  assert.doesNotMatch(router, /BODY_ADMISSION_AUTHORIZED = true/);
});

test('activation levels separate local preview from production admission and commercialization', () => {
  assert.deepEqual(scope.activationLevels.map(level => level.id), [
    'local-preview-only',
    'internal-production-admission-dry-run',
    'internal-production-upload-plus-conversion',
    'private-or-commercial-upload',
  ]);

  const localPreview = scope.activationLevels[0];
  assert.equal(localPreview.scope.backendUpload, false);
  assert.equal(localPreview.scope.productionRouteMayReadBodyDuringApprovedWindow, false);

  const firstProductionGate = scope.activationLevels[1];
  assert.equal(firstProductionGate.state, 'next_implementable_gate');
  assert.equal(firstProductionGate.scope.productionRouteMayReadBodyDuringApprovedWindow, true);
  assert.equal(firstProductionGate.scope.backendUpload, 'admission_only');
  assert.equal(firstProductionGate.scope.conversionDispatch, false);
  assert.equal(firstProductionGate.scope.sandboxDispatch, false);
  assert.equal(firstProductionGate.scope.durableProjectHistory, false);
  assert.equal(firstProductionGate.scope.privateCad, false);
  assert.equal(firstProductionGate.scope.realUsers, false);
  assert.ok(firstProductionGate.requiresSeparateApproval.includes('explicit upload activation approval'));

  const commercial = scope.activationLevels[3];
  assert.equal(commercial.state, 'blocked');
  assert.equal(commercial.scope.durableProjectHistory, true);
  assert.match(String(commercial.scope.privateCad), /separate/);
});

test('remaining evidence list points to readiness gaps that are still null', () => {
  const readinessGaps = scope.remainingEvidenceBeforeFirstProductionAdmission
    .filter(item => item.source === 'readiness');

  assert.ok(readinessGaps.length >= 10);
  for (const gap of readinessGaps) {
    assert.equal(atPath(readiness, gap.readinessPath), null, `${gap.id} must still be unresolved upstream`);
    assert.equal(gap.currentValue, null, `${gap.id} must not claim evidence in the scope packet`);
  }

  assert.equal(readiness.gates.activation.evidence.boundedRunAndCostManifest, 'docs/cad-upload-activation-run-manifest.json#runManifest');
  assert.equal(runManifest.runManifest.allInPlanningCapUsd, 50);
  assert.equal(runManifest.runManifest.conversionAllowed, false);
  assert.equal(runManifest.runManifest.sandboxDispatchAllowed, false);
  assert.equal(runManifest.runManifest.privateCadAllowed, false);
  assert.equal(runManifest.runManifest.realUsersAllowed, false);
});

test('cost and commercialization blockers remain explicit without creating pricing claims', () => {
  assert.equal(costWorkbook.feePerRunReady, false);
  assert.equal(costWorkbook.customerFeeReady, false);
  assert.equal(costWorkbook.currentPricingClaims, false);

  const rows = new Map(costWorkbook.workbookRows.map(row => [row.id, row]));
  assert.ok(rows.has('upload-admission'));
  assert.ok(rows.has('conversion-sandbox-compute'));
  assert.ok(rows.has('account-history-persistence'));
  assert.equal(rows.get('upload-admission').estimateUsd, null);
  assert.equal(rows.get('conversion-sandbox-compute').estimateUsd, null);
  assert.equal(rows.get('account-history-persistence').estimateUsd, null);

  const costGap = scope.remainingEvidenceBeforeFirstProductionAdmission
    .find(item => item.id === 'run-cost-and-fee-readiness');
  assert.deepEqual(costGap.currentValue, { feePerRunReady: false, customerFeeReady: false });
});

test('route strategy and authorities do not grant runtime upload, conversion or external delivery', () => {
  assert.ok(scope.routeChangeStrategy.doNot.includes('flip BODY_ADMISSION_AUTHORIZED directly to true'));
  assert.ok(scope.routeChangeStrategy.doNot.includes('wire conversion or Sandbox dispatch into the first production admission gate'));
  assert.ok(scope.routeChangeStrategy.recommendedImplementation.includes('default the route closed when manifest, cohort, window or rollback receipt is missing'));
  assert.ok(scope.rollbackRequirements.includes('verify USER_UPLOADS_DISABLED before parser, storage or executor paths'));

  for (const key of [
    'externalMessages',
    'productionUploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'privateCad',
    'realUsers',
    'providerEnvResourceBillingChanges',
    'usageBillingChanges',
    'secrets',
  ]) {
    assert.equal(scope.authorizes[key], false, `${key} must remain unauthorized`);
  }

  assert.equal(scope.nextRecommendedGate, 'source-only runtime implementation packet for internal production admission dry-run switch while preserving disabled default and no conversion or Sandbox authority');
});

test('markdown explains the product boundary without leaking secrets or claiming readiness', () => {
  assert.match(markdown, /We are not one toggle away/);
  assert.match(markdown, /Internal production admission dry-run/);
  assert.match(markdown, /does not authorize external messages/);
  assert.match(markdown, /does not authorize .*production upload activation/);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.doesNotMatch(markdown, /customer fee ready/i);
});
