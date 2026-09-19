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
  assert.equal(packet.handoff.correctionSentMessageIdRef, 'rrb-ref:gmail-1a0b9f517d8ed94e');
  assert.match(packet.handoff.previewUrl, /^https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1/);
  assert.equal(packet.handoff.currentReviewPath.surface, 'installed Android internal IGS upload-render preview');
  assert.equal(packet.handoff.currentReviewPath.expectedEntry, 'Import -> Open internal IGS preview');
  assert.deepEqual(packet.handoff.currentReviewPath.expectedChoices, ['Choose IGES file', 'Use public sample']);
  assert.match(packet.handoff.currentReviewPath.productionRenderer, /qa=native-internal-upload-render/);
  assert(packet.markApprovalRequiredFor.includes('claims that the CAD preview is externally validated'));
  assert(packet.markApprovalNotRequiredFor.includes('source-only documentation and manifest updates'));
  assert(packet.markApprovalNotRequiredFor.includes('feedback intake and triage packet updates'));
  assert(packet.markApprovalNotRequiredFor.includes('internal tester diagnostics and support-readiness updates'));
});

test('parallel work remains bounded and keeps dangerous authorities false', () => {
  const ids = packet.parallelWorkAllowed.map(item => item.id);
  assert.deepEqual(ids, [
    'preview-hardening',
    'upload-session-ux',
    'cost-attribution-planning',
    'implementation-readiness',
    'feedback-intake-triage',
    'internal-tester-diagnostics',
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
  assert.match(markdown, /installed Android internal IGS upload-render/);
  assert.match(markdown, /cannot be called validated CAD/);
  assert.match(markdown, /BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(markdown, /internal tester diagnostics/);
  assert.doesNotMatch(markdown, /meadowsms@/);
});

test('feedback intake triages tester issues without opening production gates', () => {
  const classes = packet.feedbackIntake.triageClasses.map(item => item.id);
  assert.deepEqual(classes, [
    'install-or-update',
    'file-picker',
    'local-render',
    'cad-interpretation',
    'commercial-readiness',
  ]);
  assert(packet.feedbackIntake.minimumFields.includes('device model'));
  assert(packet.feedbackIntake.minimumFields.includes('file name'));
  assert(packet.feedbackIntake.minimumFields.includes('screenshot or short clip when possible'));
  assert(packet.feedbackIntake.responseRules.includes('do not ask Mark for private CAD in this review path'));
  assert(packet.feedbackIntake.responseRules.includes('do not claim a backend upload, conversion or Sandbox failure from a local preview symptom'));
});
