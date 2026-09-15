const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-auth-session-immediate-rebind.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-auth-session-immediate-rebind.md', 'utf8');
const binding = fs.readFileSync('convex/cadDevAuthQualificationBinding.ts', 'utf8');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

test('rebind packet binds one exact development target and UTC window', () => {
  assert.equal(packet.status, 'REBIND_READY_FOR_ONE_DEVELOPMENT_WINDOW_NO_RUN_EXECUTED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.production, false);
  assert.equal(packet.baseMainCommit, '199c6c8ebe444d614728735d53c1685bc12073f0');
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
  assert.equal(packet.target.kind, 'development');
  assert.equal(packet.window.startUtc, '2026-09-15T19:25:00Z');
  assert.equal(packet.window.endUtc, '2026-09-15T19:40:00Z');
  assert.equal(packet.window.endMs - packet.window.startMs, 15 * 60 * 1000);
});

test('source-safe projection digest matches accepted binding digest', () => {
  const projectionBytes = JSON.stringify(packet.sourceSafeProjection, null, 2) + '\n';
  assert.equal(sha256(projectionBytes), packet.acceptedProjectionSha256);
  assert.equal(packet.ignoredLocalArtifacts.rawRunKeyInSource, false);
  assert.equal(packet.ignoredLocalArtifacts.rawPasswordsInSource, false);
  assert.equal(packet.ignoredLocalArtifacts.directoryMode, '700');
  assert.equal(packet.ignoredLocalArtifacts.fileMode, '600');
});

test('binding is enabled only for the accepted one-run digest/window tuple', () => {
  assert.match(binding, /enabled: true/);
  assert.match(binding, /mode: 'cad-dev-auth-session-immediate-rebind-1925z'/);
  assert.match(binding, /runId: 'cad-dev-auth-session-qualification-1925z'/);
  assert.match(binding, new RegExp(`runKeySha256: '${packet.runKeySha256}'`));
  assert.match(binding, new RegExp(`acceptedProjectionSha256: '${packet.acceptedProjectionSha256}'`));
  assert.match(binding, new RegExp(`acceptanceReceiptSha256: '${packet.acceptanceReceiptSha256}'`));
  assert.match(binding, /windowStartMs: 1789500300000/);
  assert.match(binding, /windowEndMs: 1789501200000/);
  assert.match(binding, /deleteUsersOrAccounts: false/);
  assert.match(binding, /retainUsersAndAccounts: true/);
});

test('rebind preserves hard-stop boundaries and source safety', () => {
  for (const [key, value] of Object.entries(packet.authorityPreserved)) assert.equal(value, false, key);
  assert.match(markdown, /does not run the qualification/i);
  assert.match(markdown, /without deleting users or accounts/i);
  assert.match(markdown, /automatic retry and second runs remain outside/i);
  assert.doesNotMatch(binding + markdown + JSON.stringify(packet), /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(binding + markdown + JSON.stringify(packet), /cadUploadAllowed:\s*true|conversionAllowed:\s*true/);
});
