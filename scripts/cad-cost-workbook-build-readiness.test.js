const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const workbook = JSON.parse(fs.readFileSync('docs/cad-per-run-cost-workbook.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-per-run-cost-workbook.md', 'utf8');
const readinessPacket = JSON.parse(
  fs.readFileSync('docs/cad-cost-attribution-implementation-readiness.json', 'utf8'),
);
const { CAD_COST_WORKBOOK, CAD_BUILD_READINESS } = require('../utils/cadCostWorkbook');

test('workbook is source-only and refuses fee or current-pricing claims', () => {
  assert.equal(workbook.sourceOnly, true);
  assert.equal(workbook.expensesUsd, 0);
  assert.equal(workbook.approvedDevelopmentCeilingUsd, 50);
  assert.equal(workbook.currentPricingClaims, false);
  assert.equal(workbook.pricingEvidenceRequired, true);
  assert.equal(workbook.feePerRunReady, false);
  assert.equal(workbook.customerFeeReady, false);
  assert.match(markdown, /not a customer price/);
  assert.match(markdown, /not a unit cost/);
});

test('checked-in workbook and UI model stay aligned', () => {
  assert.equal(CAD_COST_WORKBOOK.packet, workbook.packet);
  assert.equal(CAD_COST_WORKBOOK.unit, workbook.unit);
  assert.equal(CAD_COST_WORKBOOK.approvedDevelopmentCeilingUsd, workbook.approvedDevelopmentCeilingUsd);
  assert.equal(CAD_COST_WORKBOOK.currentPricingClaims, workbook.currentPricingClaims);
  assert.equal(CAD_COST_WORKBOOK.pricingEvidenceRequired, workbook.pricingEvidenceRequired);
  assert.deepEqual(
    CAD_COST_WORKBOOK.buckets.map(bucket => bucket.id),
    workbook.workbookRows.map(row => row.id),
  );
});

test('cost model covers required CAD run buckets and keeps unresolved estimates null', () => {
  const ids = workbook.workbookRows.map(row => row.id);
  assert.deepEqual(ids, [
    'convex-auth-session-store',
    'vercel-web-api',
    'upload-admission',
    'conversion-sandbox-compute',
    'preview-render-retention',
    'internal-tester-support',
    'account-history-persistence',
    'commercial-buffer',
  ]);

  for (const row of workbook.workbookRows) {
    assert.equal(row.estimateUsd, null, `${row.id} estimate must remain unresolved`);
    assert.ok(row.requiredEvidence.length >= 4, `${row.id} needs explicit evidence requirements`);
  }
});

test('Build readiness surface explains ready, missing, and blocked states', () => {
  assert.match(CAD_BUILD_READINESS.headline, /Build stays locked/);
  assert.deepEqual(CAD_BUILD_READINESS.productReady, workbook.readinessSurface.productReady);
  assert.deepEqual(CAD_BUILD_READINESS.costEvidenceNeeded, workbook.readinessSurface.costEvidenceNeeded);
  assert.deepEqual(CAD_BUILD_READINESS.blockedOutputs, workbook.readinessSurface.blockedOutputs);
  assert.ok(CAD_BUILD_READINESS.summaryCards.some(card => card.label === 'Fee per run' && card.value === 'Evidence pending'));
  assert.ok(CAD_BUILD_READINESS.productReady.includes('Desktop/browser and installed-app internal CAD preview controls'));
  assert.ok(CAD_BUILD_READINESS.productReady.includes('Local CAD source chooser with IGES, STEP and BREP render support'));
  assert.ok(CAD_BUILD_READINESS.costEvidenceNeeded.includes('Account-backed history persistence and preview-to-project retention policy'));
  assert.ok(CAD_BUILD_READINESS.costEvidenceNeeded.includes('Internal tester browser, device and file-compatibility support'));
  assert.ok(CAD_BUILD_READINESS.blockedOutputs.includes('Durable account-backed reconstruction history'));
  assert.match(markdown, /Build phase can now explain three things/);
});

test('workbook records current preview support without overpromising commercialization', () => {
  assert.equal(workbook.baseCommit, '205b23fb82b8ca01cab096d3d83c2fc51fce61a4');
  assert.match(markdown, /production-hosted desktop browser/);
  assert.match(markdown, /installed internal app build/);
  assert.match(markdown, /picker recognizes common CAD extensions/);
  assert.match(markdown, /local renderer supports IGES, STEP and BREP preview only/);
  assert.match(markdown, /Saved reconstruction history is still a commercialization dependency/);
  assert.match(markdown, /Normal\s+app updates should preserve local `AsyncStorage`/);
  assert.doesNotMatch(markdown, /Mark can choose an `\.igs` or `\.iges` file locally on the Android device/);
});

test('dangerous authorities remain closed in workbook and upstream readiness packet', () => {
  for (const key of [
    'currentPricingClaim',
    'customerFeeQuote',
    'liveRun',
    'uploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'privateCad',
    'realUsers',
    'providerEnvResourceBillingChanges',
    'externalMessages',
  ]) {
    assert.equal(workbook.authorizes[key], false, `${key} must remain false`);
  }

  assert.equal(readinessPacket.costPolicy.currentPricingClaims, false);
  assert.equal(readinessPacket.costPolicy.pricingEvidenceRequired, true);
  assert.equal(readinessPacket.nextRecommendedGate, 'source-only per-run cost workbook and Build-phase readiness surface');
});

test('source files avoid secrets, recipient data, and activation drift', () => {
  const component = fs.readFileSync('components/CadWorkflow.tsx', 'utf8');
  const combined = `${markdown}\n${JSON.stringify(workbook, null, 2)}\n${component}`;
  assert.match(component, /CAD_BUILD_READINESS/);
  assert.match(component, /CAD_COST_WORKBOOK/);
  assert.doesNotMatch(combined, /meadowsms@/i);
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(combined, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(combined, /production upload activation completed/i);
  assert.doesNotMatch(combined, /customer fee ready/i);
});
