const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const closeout = JSON.parse(fs.readFileSync('docs/cad-windows-browser-handoff-closeout.json', 'utf8'));
const handoff = JSON.parse(fs.readFileSync('docs/cad-windows-browser-handoff.json', 'utf8'));
const parallel = JSON.parse(fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'));
const sampleMatrix = JSON.parse(fs.readFileSync('docs/cad-public-sample-render-matrix.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-windows-browser-handoff-closeout.md', 'utf8');

test('Windows browser closeout binds the current reviewer link and packets', () => {
  assert.equal(closeout.packet, 'cad-windows-browser-handoff-closeout');
  assert.equal(closeout.status, 'source_only_closeout_complete');
  assert.equal(closeout.sourceOnly, true);
  assert.equal(closeout.expensesUsd, 0);
  assert.equal(closeout.closesGate, 'source-only Windows-browser handoff closeout');
  assert.equal(closeout.handoffPacket, 'docs/cad-windows-browser-handoff.json');
  assert.equal(closeout.parallelReadinessPacket, 'docs/cad-mark-feedback-parallel-readiness.json');
  assert.equal(closeout.publicSampleRenderMatrix, 'docs/cad-public-sample-render-matrix.json');
  assert.equal(closeout.reviewerLink, handoff.reviewerLink);
  assert.equal(closeout.reviewerLink, parallel.handoff.previewUrl);
  assert.match(closeout.reviewerLink, /qa=windows-desktop-handoff$/);
  assert.equal(closeout.primarySurface, handoff.primarySurface);
  assert.deepEqual(closeout.expectedRenderableExtensions, handoff.expectedRenderableExtensions);
});

test('closeout preserves no-send and no-production-activation boundaries', () => {
  assert.equal(handoff.newExternalSendCompleted, false);
  assert.equal(handoff.futureExternalSendAuthorized, false);
  assert.equal(parallel.handoff.sendAuthorizedByThisPacket, false);
  assert.equal(parallel.handoff.closeoutCompleted, true);
  assert.equal(parallel.handoff.closeoutPacket, 'docs/cad-windows-browser-handoff-closeout.json');

  for (const [key, value] of Object.entries(closeout.authorizes)) {
    if (['sourceOnlyDocsAndTests', 'localValidation', 'draftPr', 'greenCheckMerge',
      'normalVercelDeploymentFromMain', 'productionFailClosedSmoke',
      'cleanupMergedBranchAndWorktree'].includes(key)) assert.equal(value, true, key);
    else assert.equal(value, false, key);
  }

  assert.match(markdown, /No new external send is recorded/);
  assert.doesNotMatch(markdown, /sent to Mark/i);
});

test('sample matrix and Mark gates remain separate', () => {
  assert.equal(sampleMatrix.publicMaterialOnly, true);
  assert.equal(sampleMatrix.liveUploadActivated, false);
  assert.equal(sampleMatrix.productionConversionActivated, false);
  assert.equal(sampleMatrix.sandboxDispatchAllowed, false);
  assert.equal(sampleMatrix.privateCadIncluded, false);
  assert(sampleMatrix.rows.length >= 5);
  assert(closeout.closeoutFindings.some(finding => /public sample render matrix/.test(finding)));
  assert(closeout.remainingMarkGates.includes('Windows browser upload-to-preview usability'));
  assert(closeout.remainingMarkGates.includes('any statement that the CAD preview is externally validated'));
  assert.match(markdown, /Mark's response is still required/);
});

test('parallel readiness now advances past the completed closeout gate', () => {
  assert.equal(
    closeout.nextRecommendedGate,
    'continue non-conflicting internal readiness work while Mark feedback remains pending',
  );
  assert.equal(parallel.nextRecommendedGate, closeout.nextRecommendedGate);
  assert.match(parallel.handoff.currentReviewPath.productionRenderer, /qa=windows-desktop-handoff$/);
  assert.deepEqual(parallel.handoff.currentReviewPath.acceptedTestExtensions,
    ['.igs', '.iges', '.stp', '.step', '.brep']);
});

test('source avoids recipient data, private CAD and credential material', () => {
  const combined = [
    JSON.stringify(closeout, null, 2),
    fs.readFileSync('docs/cad-windows-browser-handoff-closeout.md', 'utf8'),
    fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.md', 'utf8'),
    fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'),
  ].join('\n');

  assert.doesNotMatch(combined, /meadowsms@|vsillah@gmail\.com/i);
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(combined, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.doesNotMatch(combined, /production upload activation completed/i);
});
