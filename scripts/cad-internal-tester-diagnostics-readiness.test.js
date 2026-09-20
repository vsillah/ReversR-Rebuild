const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(
  fs.readFileSync('docs/cad-internal-tester-diagnostics-readiness.json', 'utf8'),
);
const markdown = fs.readFileSync(
  'docs/cad-internal-tester-diagnostics-readiness.md',
  'utf8',
);
const markPacket = JSON.parse(
  fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'),
);

test('diagnostics packet proceeds before Mark without claiming validation', () => {
  assert.equal(packet.status, 'source_only_internal_tester_diagnostics_ready');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.upstream.markFeedbackPending, true);
  assert.equal(packet.upstream.canProceedBeforeMarkResponse, true);
  assert.ok(packet.upstream.markStillRequiredFor.includes('external validation claims'));
  assert.match(markdown, /should not freeze the internal\s+roadmap/);
  assert.match(markdown, /not required for supportability work/);
  assert.doesNotMatch(markdown, /externally validated CAD/i);
});

test('minimum capture covers device, app path, file, render and support effort', () => {
  for (const field of [
    'device model',
    'Android version if visible',
    'WebView or Chrome version if visible',
    'app install source or APK artifact reference',
    'whether Open internal CAD preview is visible',
    'whether Live upload locked appears instead of the internal preview path',
    'file name',
    'file extension',
    'approximate file size',
    'whether file picker opened',
    'whether render action appeared',
    'whether preview rendered',
    'whether zoom state persisted across orientation changes',
    'triage time spent',
    'resolved or unresolved status',
  ]) {
    assert.ok(packet.minimumCapture.includes(field), `${field} must be captured`);
  }
});

test('classification separates setup, picker, render, interpretation and commercial issues', () => {
  const classes = packet.classification.map(item => item.id);
  assert.deepEqual(classes, [
    'install-or-update',
    'file-picker',
    'local-render',
    'cad-interpretation',
    'commercial-readiness',
  ]);

  const allSignals = packet.classification.flatMap(item => item.signals).join('\n');
  for (const signal of [
    'Live upload locked',
    'Internal preview unavailable',
    'file picker does not open',
    'blank preview',
    'orientation mapping disputed',
    'asks about customer fee',
  ]) {
    assert.match(allSignals, new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('support cost hooks stay aligned with the cost workbook bucket', () => {
  assert.equal(packet.supportCostHooks.costWorkbookBucket, 'internal-tester-support');
  assert.deepEqual(packet.supportCostHooks.meters, [
    'device install support',
    'file-picker failures',
    'renderer compatibility triage',
    'tester follow-up time',
  ]);
  assert.match(packet.supportCostHooks.feePerRunImpact, /before quoting a customer fee/);
  assert.match(markdown, /customer fee per CAD run/);
});

test('implementation surface keeps diagnostics compact and tied to internal preview entry', () => {
  assert.equal(packet.implementationSurface.entryComponent, 'components/CadImportPanel.tsx');
  assert.equal(packet.implementationSurface.fallbackComponent, 'components/CadNativeInternalUploadPreview.tsx');
  assert.equal(packet.implementationSurface.entryTestId, 'cad-native-internal-preview-entry');
  assert.equal(packet.implementationSurface.diagnosticsDisclosureTestId, 'cad-internal-preview-diagnostics');
  assert.equal(packet.implementationSurface.diagnosticsListTestId, 'cad-internal-preview-diagnostics-list');
  assert.match(packet.implementationSurface.rule, /keep diagnostics collapsed/);
  assert.match(markdown, /collapsed support\s+detail/);
});

test('authorities remain closed and no private evidence leaks into source', () => {
  for (const key of [
    'externalMessages',
    'telemetryEgress',
    'privateCad',
    'uploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'realUsers',
    'providerEnvResourceBillingChanges',
    'newPaidCommitments',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain false`);
  }
  assert.equal(packet.authorizes.sourceOnlyDocsAndTests, true);
  assert.ok(packet.responseBoundaries.includes('do not store recipient addresses, private file paths or raw CAD contents in source'));

  const combined = `${markdown}\n${JSON.stringify(packet, null, 2)}`;
  assert.doesNotMatch(combined, /meadowsms@/i);
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(combined, /production upload activation completed/i);
  assert.doesNotMatch(combined, /conversion dispatched/i);
});

test('Mark parallel-work guard includes internal tester diagnostics as allowed source work', () => {
  assert.ok(markPacket.markApprovalNotRequiredFor.includes(
    'internal tester diagnostics and support-readiness updates',
  ));
  assert.ok(markPacket.parallelWorkAllowed.some(item => item.id === 'internal-tester-diagnostics'));
  assert.equal(markPacket.nextRecommendedGate, 'source-only internal tester diagnostics and support-readiness packet');
});
