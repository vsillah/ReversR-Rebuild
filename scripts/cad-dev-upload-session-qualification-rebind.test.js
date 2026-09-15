const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-rebind.json', 'utf8'));
const bridgePacket = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-bridge.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-upload-session-qualification-rebind.md', 'utf8');
const bindingSource = fs.readFileSync('convex/cadDevUploadSessionQualificationBinding.ts', 'utf8');
const bridgeSource = fs.readFileSync('convex/cadDevUploadSessionQualification.ts', 'utf8');

test('rebind packet binds to PR 248 bridge without authorizing a live run', () => {
  assert.equal(packet.mode, 'source-only-cad-dev-upload-session-qualification-rebind');
  assert.equal(packet.status, 'SOURCE_ONLY_UPLOAD_SESSION_QUALIFICATION_REBIND_READY');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.liveRunAuthorizedByThisPacket, false);
  assert.equal(packet.dependsOn.bridgePacket.status, bridgePacket.status);
  assert.equal(packet.binding.action, bridgePacket.bridge.publicAction);
  assert.match(markdown, /does not authorize a live run by itself/i);
});

test('binding uses the exact accepted run tuple and bounded window', () => {
  assert.equal(packet.binding.enabled, true);
  assert.match(bindingSource, /enabled: true/);
  assert.match(bindingSource, new RegExp(packet.run.runKeySha256));
  assert.match(bindingSource, new RegExp(packet.run.acceptedProjectionSha256));
  assert.match(bindingSource, new RegExp(packet.run.acceptanceReceiptSha256));
  assert.match(bindingSource, new RegExp(String(packet.run.windowStartMs)));
  assert.match(bindingSource, new RegExp(String(packet.run.windowEndMs)));
  assert.equal(packet.run.windowEndMs - packet.run.windowStartMs, 15 * 60 * 1000);
  assert.equal(new Date(packet.run.windowStartMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    packet.run.windowStartUtc);
  assert.equal(new Date(packet.run.windowEndMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    packet.run.windowEndUtc);
});

test('public source contains no raw run key or credential and keeps upload gates disabled', () => {
  const publicText = [JSON.stringify(packet), markdown, bindingSource, bridgeSource].join('\n');
  assert.doesNotMatch(publicText, /us1\.[A-Za-z0-9_-]{43}/);
  assert.doesNotMatch(publicText, /BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
  assert.doesNotMatch(publicText, /"runKey"\s*:/);
  assert.doesNotMatch(publicText, /rawRunKey/);
  assert.match(publicText, /bodyAdmissionAuthorized.*false/i);
  assert.match(publicText, /conversionAllowed.*false/i);
  assert.match(bridgeSource, /internal\.cad\.insertIfAbsent/);
  assert.match(bridgeSource, /internal\.cad\.read/);
  assert.match(bridgeSource, /internal\.cad\.revoke/);
});

test('all preserved authority flags remain false', () => {
  for (const [gate, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
  assert.equal(packet.ignoredLocalArtifacts.gitIgnored, true);
  assert.equal(packet.ignoredLocalArtifacts.directoryMode, '0700');
  assert.equal(packet.ignoredLocalArtifacts.fileMode, '0600');
});
