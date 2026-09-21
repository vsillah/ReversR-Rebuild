const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(fs.readFileSync('docs/cad-windows-browser-handoff.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-windows-browser-handoff.md', 'utf8');

test('Windows browser handoff records the reviewer path and exact production link', () => {
  assert.equal(packet.packet, 'cad-windows-browser-handoff');
  assert.equal(packet.status, 'source_only_reviewer_packet_sent');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.sendCompleted, true);
  assert.equal(packet.futureExternalSendAuthorized, false);
  assert.equal(packet.primarySurface, 'Windows desktop browser');
  assert.deepEqual(packet.preferredBrowsers, ['Chrome', 'Edge']);
  assert.match(packet.reviewerLink, /^https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1&cadPhase=input&qa=windows-browser-handoff$/);
  assert.deepEqual(packet.acceptedReviewerExtensions, ['.igs', '.iges']);
  assert.match(markdown, /Chrome or Edge on Windows/);
  assert.match(markdown, /Choose CAD file/);
  assert.match(markdown, /Render preview/);
});

test('walkthrough stays privacy-safe and does not imply send or activation authority', () => {
  assert.equal(packet.recording.required, true);
  assert.equal(packet.recording.usesPrivateRecipientDetails, false);
  assert.equal(packet.recording.usesGmailSend, true);
  assert.equal(packet.recording.demoFixture, 'public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS');
  assert(packet.recording.steps.includes('click production preview link'));
  assert(packet.recording.steps.includes('render preview'));
  assert.equal(packet.authorizes.walkthroughRecording, true);
  assert.equal(packet.authorizes.externalSend, false);
  assert.equal(packet.authorizes.productionUploadActivation, false);
  assert.equal(packet.authorizes.conversionDispatch, false);
  assert.equal(packet.authorizes.sandboxDispatch, false);
  assert.equal(packet.authorizes.privateCad, false);
  assert.match(markdown, /sent after separate explicit approval/);
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
});
