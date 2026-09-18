const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.md', 'utf8');

test('packet preserves Mark feedback as a narrow external-validation gate', () => {
  assert.equal(packet.status, 'mark_feedback_pending_parallel_work_allowed');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.handoff.sent, true);
  assert.equal(packet.handoff.walkthroughAttached, true);
  assert.match(packet.handoff.previewUrl, /^https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1/);
  assert(packet.markApprovalRequiredFor.includes('claims that the CAD preview is externally validated'));
  assert(packet.markApprovalNotRequiredFor.includes('source-only documentation and manifest updates'));
});

test('parallel work remains bounded and keeps dangerous authorities false', () => {
  const ids = packet.parallelWorkAllowed.map(item => item.id);
  assert.deepEqual(ids, [
    'preview-hardening',
    'upload-session-ux',
    'cost-attribution-planning',
    'implementation-readiness',
  ]);
  for (const key of [
    'externalMessages',
    'privateCad',
    'uploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'realUsers',
    'providerEnvResourceBillingChanges',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain false`);
  }
  assert.equal(packet.authorizes.sourceOnlyDocsAndTests, true);
  assert.equal(packet.authorizes.productionFailClosedSmoke, true);
});

test('markdown distinguishes public-material review from validated CAD', () => {
  assert.match(markdown, /public-material\s+review build/);
  assert.match(markdown, /cannot be called validated CAD/);
  assert.match(markdown, /BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(markdown, /fee-per-run model/);
  assert.doesNotMatch(markdown, /meadowsms@/);
});
