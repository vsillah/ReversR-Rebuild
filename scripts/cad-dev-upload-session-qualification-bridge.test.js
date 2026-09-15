const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-bridge.json', 'utf8'));
const executor = JSON.parse(fs.readFileSync('docs/cad-dev-upload-session-qualification-executor.json', 'utf8'));
const closeout = JSON.parse(fs.readFileSync('docs/cad-dev-auth-session-run-closeout.json', 'utf8'));
const binding = fs.readFileSync('convex/cadDevUploadSessionQualificationBinding.ts', 'utf8');
const source = fs.readFileSync('convex/cadDevUploadSessionQualification.ts', 'utf8');
const route = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const markdown = fs.readFileSync('docs/cad-dev-upload-session-qualification-bridge.md', 'utf8');

test('bridge packet binds to executor and completed Auth/session closeout', () => {
  assert.equal(packet.mode, 'source-only-cad-dev-upload-session-qualification-bridge');
  assert.equal(packet.status, 'SOURCE_ONLY_UPLOAD_SESSION_QUALIFICATION_BRIDGE_READY');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.liveRunAuthorizedByThisPacket, false);
  assert.equal(packet.dependsOn.executorPacket.status, executor.status);
  assert.equal(packet.dependsOn.authSessionCloseout.status, closeout.status);
  assert.equal(packet.dependsOn.authSessionCloseout.evidenceSha256,
    closeout.sanitizedRunEvidence.evidenceSha256);
});

test('binding is disabled by default or bound to one exact reviewed run tuple', () => {
  const disabledDefault = /enabled: false/.test(binding)
    && /cad-dev-upload-session-disabled-pending-register/.test(binding)
    && /runKeySha256: null/.test(binding)
    && /acceptedProjectionSha256: null/.test(binding)
    && /acceptanceReceiptSha256: null/.test(binding)
    && /windowStartMs: null/.test(binding)
    && /windowEndMs: null/.test(binding);
  const exactRebind = /enabled: true/.test(binding)
    && /cad-dev-upload-session-2130z-rebind/.test(binding)
    && /ce5f7f60202f6ee08ab10e9efa21ab90b25799ddc77be995d5b2810f259bfa8d/.test(binding)
    && /9ba800eb47ccec11923149a0af9f3c05558abbce38a2a9c0c856db75783cf036/.test(binding)
    && /de8c962603a1ccace7f899b8b00a6771ade6acd63a7c4437b761ab90feca17dc/.test(binding)
    && /windowStartMs: 1789507800000/.test(binding)
    && /windowEndMs: 1789508700000/.test(binding);
  assert.equal(disabledDefault || exactRebind, true);
  assert.match(binding, /bodyAdmissionAuthorized: false/);
});

test('public action is digest-only and limited to insert read revoke internals', () => {
  assert.match(source, /export const issueReadRevoke = action/);
  assert.match(source, /internal\.cad\.insertIfAbsent/);
  assert.match(source, /internal\.cad\.read/);
  assert.match(source, /internal\.cad\.revoke/);
  assert.doesNotMatch(source, /internal\.cad\.changeAuthority/);
  assert.doesNotMatch(source, /credential:\s*v\.string|runKey:\s*v\.bytes|passwords|createAccount|invalidateSessions/);
  assert.match(source, /credentialDigest: v\.string/);
  assert.match(source, /QUALIFICATION_DISABLED/);
  assert.match(source, /QUALIFICATION_WINDOW_CLOSED/);
});

test('source preserves disabled upload and no-live-run authority', () => {
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.match(markdown, /disabled-by-default public action/);
  assert.match(markdown, /does not authorize a live run/i);
  assert.equal(packet.bridge.defaultBindingEnabled, false);
  assert.equal(packet.bridge.rawCredentialAccepted, false);
  assert.equal(packet.bridge.bodyAdmissionAuthorized, false);
  for (const [gate, value] of Object.entries(packet.authorityPreserved)) {
    assert.equal(value, false, `${gate} must remain false`);
  }
});

test('source-safe packet contains no obvious credential or secret material', () => {
  const combined = [JSON.stringify(packet), markdown, binding, source].join('\n');
  assert.doesNotMatch(combined, /us1\.[A-Za-z0-9_-]{43}/);
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|sk_live_|github_pat_|ghp_/);
  assert.doesNotMatch(combined, /private CAD file/i);
});
