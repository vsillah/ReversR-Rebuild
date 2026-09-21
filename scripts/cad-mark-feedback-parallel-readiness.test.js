const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.md', 'utf8');

test('packet pivots Mark feedback to the Windows browser review path', () => {
  assert.equal(packet.status, 'mark_feedback_pending_parallel_work_allowed');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.handoff.priorSent, true);
  assert.equal(packet.handoff.correctionSent, true);
  assert.equal(packet.handoff.sendAuthorizedByThisPacket, false);
  assert.match(packet.handoff.previewUrl, /^https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1/);
  assert.equal(packet.handoff.currentReviewPath.surface, 'Windows desktop browser CAD upload-to-preview path');
  assert.equal(packet.handoff.currentReviewPath.expectedBrowser, 'Chrome or Edge on Windows');
  assert.equal(packet.handoff.currentReviewPath.expectedEntry, 'Email link -> production browser preview -> Choose CAD file');
  assert.deepEqual(packet.handoff.currentReviewPath.expectedChoices, ['Choose CAD file', 'Use public sample']);
  assert.deepEqual(packet.handoff.currentReviewPath.acceptedTestExtensions, ['.igs', '.iges']);
  assert.match(packet.handoff.currentReviewPath.productionRenderer, /qa=windows-browser-handoff/);
  assert.equal(packet.handoff.currentReviewPath.secondaryPath, 'installed Android internal preview remains internal fallback context only');
  assert(packet.markApprovalRequiredFor.includes('Windows browser upload-to-preview usability'));
  assert(packet.markApprovalNotRequiredFor.includes('source-only documentation and manifest updates'));
  assert(packet.markApprovalNotRequiredFor.includes('feedback intake and triage packet updates'));
});

test('parallel work remains bounded and keeps dangerous authorities false', () => {
  const ids = packet.parallelWorkAllowed.map(item => item.id);
  assert.deepEqual(ids, [
    'preview-hardening',
    'upload-session-ux',
    'cost-attribution-planning',
    'implementation-readiness',
    'feedback-intake-triage',
    'browser-tester-diagnostics',
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

test('markdown distinguishes browser local preview from validated CAD', () => {
  assert.match(markdown, /Windows desktop\s+browser path first/);
  assert.match(markdown, /Choose CAD file/);
  assert.match(markdown, /public-material\s+review build/);
  assert.match(markdown, /cannot be called validated CAD/);
  assert.match(markdown, /BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(markdown, /no longer the primary Mark handoff/);
  assert.doesNotMatch(markdown, /meadowsms@/);
});

test('feedback intake triages Windows browser issues without opening production gates', () => {
  const classes = packet.feedbackIntake.triageClasses.map(item => item.id);
  assert.deepEqual(classes, [
    'link-or-browser-access',
    'file-picker',
    'local-render',
    'cad-interpretation',
    'commercial-readiness',
  ]);
  assert(packet.feedbackIntake.minimumFields.includes('Windows version if visible'));
  assert(packet.feedbackIntake.minimumFields.includes('browser name'));
  assert(packet.feedbackIntake.minimumFields.includes('file name'));
  assert(packet.feedbackIntake.minimumFields.includes('screenshot or short clip when possible'));
  assert(packet.feedbackIntake.responseRules.includes('do not ask Mark for private CAD in this review path'));
  assert(packet.feedbackIntake.responseRules.includes('do not claim a backend upload, conversion or Sandbox failure from a local preview symptom'));
  assert.match(packet.nextRecommendedGate, /Windows-browser handoff closeout/);
});
