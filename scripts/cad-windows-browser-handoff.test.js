const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(fs.readFileSync('docs/cad-windows-browser-handoff.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-windows-browser-handoff.md', 'utf8');

test('Windows browser handoff records the reviewer path and exact production link', () => {
  assert.equal(packet.packet, 'cad-windows-browser-handoff');
  assert.equal(packet.status, 'source_only_reviewer_packet_refresh_ready');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.priorCorrectionSendCompleted, true);
  assert.equal(packet.newExternalSendCompleted, false);
  assert.equal(packet.futureExternalSendAuthorized, false);
  assert.equal(packet.primarySurface, 'Windows desktop browser with production desktop shell');
  assert.deepEqual(packet.preferredBrowsers, ['Chrome', 'Edge']);
  assert.equal(packet.productionMainCommit, '38a4ca33e58f87fa38d24f4e00963f22759dcbe6');
  assert.equal(packet.desktopShellPr, 354);
  assert.match(packet.reviewerLink, /^https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-desktop-handoff$/);
  assert.deepEqual(packet.expectedRenderableExtensions, ['.igs', '.iges', '.stp', '.step', '.brep']);
  assert(packet.recognizedButPreviewPendingExtensions.includes('.stl'));
  assert(packet.recognizedButPreviewPendingExtensions.includes('.dwg'));
  assert(packet.recognizedButPreviewPendingExtensions.includes('.sldprt'));
  assert.match(markdown, /Chrome or Edge on Windows/);
  assert.match(markdown, /Choose CAD file/);
  assert.match(markdown, /Render preview/);
  assert.match(markdown, /full desktop workspace/);
});

test('walkthrough stays privacy-safe and does not imply send or activation authority', () => {
  assert.equal(packet.recording.required, true);
  assert.equal(packet.recording.usesPrivateRecipientDetails, false);
  assert.equal(packet.recording.usesGmailSend, false);
  assert.equal(packet.recording.demoFixture, 'public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS');
  assert(packet.recording.steps.includes('open production desktop preview link'));
  assert(packet.recording.steps.includes('render preview'));
  assert.equal(packet.authorizes.walkthroughRecording, true);
  assert.equal(packet.authorizes.externalSend, false);
  assert.equal(packet.authorizes.productionUploadActivation, false);
  assert.equal(packet.authorizes.conversionDispatch, false);
  assert.equal(packet.authorizes.sandboxDispatch, false);
  assert.equal(packet.authorizes.privateCad, false);
  assert.match(markdown, /not a new send/i);
});

test('known limitations remain explicit for Mark-facing instructions', () => {
  for (const limitation of [
    'not commercialization ready',
    'production upload sessions are not enabled',
    'backend conversion is not enabled',
    'Sandbox processing is not enabled',
    'private CAD workflows are not enabled',
  ]) {
    assert(packet.knownLimitations.includes(limitation));
  }
  assert.match(markdown, /not commercial readiness/i);
  assert.match(markdown, /Do not ask for private CAD/);
  assert.match(markdown, /IGES, STEP, and BREP are the formats expected to render\s+locally/);
  assert.match(markdown, /Other CAD formats may be recognized but may not render yet/);
});
