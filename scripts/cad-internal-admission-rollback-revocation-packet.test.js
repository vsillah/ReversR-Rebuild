const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-rollback-revocation-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-rollback-revocation-packet.md', 'utf8');
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const runManifest = JSON.parse(fs.readFileSync('docs/cad-upload-activation-run-manifest.json', 'utf8'));
const storeSource = fs.readFileSync('server/uploadSessionStore.js', 'utf8');
const verifierSource = fs.readFileSync('server/uploadSession.js', 'utf8');
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
const storeTest = fs.readFileSync('scripts/cad-upload-session-store.test.js', 'utf8');
const verifierTest = fs.readFileSync('scripts/cad-upload-session.test.js', 'utf8');
const issuerBridgeTest = fs.readFileSync('scripts/cad-dev-auth-session-issuer-bridge.test.js', 'utf8');

test('packet is source-only and does not accept rollback revocation evidence', () => {
  assert.equal(packet.mode, 'source-only-rollback-session-revocation-requirements');
  assert.equal(packet.status, 'ROLLBACK_REVOCATION_DRAFT_UPLOADS_DISABLED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, '857eacd1177f86b14e0a63b08fcc5b8eec0ccc7f');
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.currentRouteState.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentRouteState.bodyReadAuthorized, false);
  assert.equal(packet.currentRouteState.sessionRevocationEvidenceAccepted, false);
  assert.equal(packet.currentRouteState.concurrentRevocationFenceAccepted, false);
  assert.equal(packet.currentRouteState.routeMayOpenNow, false);
  assert.equal(packet.currentRouteState.terminalCodeUntilSeparateActivationApproval, 'USER_UPLOADS_DISABLED');
});

test('source bindings exist and route remains fail-closed before body validation', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  assert.equal(packet.route, readiness.route);
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.ok(
    routeSource.indexOf('const result = await verify(req);') < routeSource.indexOf('const admission = await validateRequestBody(req);'),
    'session verification must remain before request body validation',
  );
});

test('rollback readiness slots remain unaccepted upstream', () => {
  assert.equal(readiness.gates.rollback.evidence.sessionRevocationEvidence, null);
  assert.equal(readiness.gates.exactSessionAuthority.evidence.concurrentRevocationFence, null);
  assert.equal(packet.rollbackRevocationReview.accepted, false);
  assert.equal(packet.rollbackRevocationReview.evidenceSlot,
    'offline/cad-convex/userUploadActivationReadiness.json#gates.rollback.evidence.sessionRevocationEvidence');
  assert.equal(packet.rollbackRevocationReview.companionFenceSlot,
    'offline/cad-convex/userUploadActivationReadiness.json#gates.exactSessionAuthority.evidence.concurrentRevocationFence');
});

test('source and tests prove revocation is digest-only, immediate and reread', () => {
  assert.match(storeSource, /async function revokeSession\(key\)/);
  assert.match(storeSource, /store\.revoke\(key, clock\(\), \{ signal \}\)/);
  assert.match(storeSource, /records\.set\(key, Object\.freeze\(\{ \.\.\.record, status: 'revoked', revokedAt \}\)\)/);
  assert.match(verifierSource, /record\.status === 'revoked'/);
  assert.match(verifierSource, /return deny\('SESSION_REVOKED'\)/);
  assert.match(storeTest, /revocation is immediate across service instances sharing a store; no positive cache/);
  assert.match(storeTest, /other\.revokeSession\(hash\(issued\.credential\)\)/);
  assert.match(storeTest, /SESSION_REVOKED/);
  assert.match(verifierTest, /revocation and entitlement changes are re-read on every call/);
  assert.match(verifierTest, /stored = \{ \.\.\.base, status: 'revoked' \}/);
});

test('development issuer bridge evidence remains closed at the upload route', () => {
  assert.match(issuerBridgeTest, /store revocation, login revocation, entitlement loss, expiry and CSRF are rechecked/);
  assert.match(issuerBridgeTest, /SESSION_REVOKED/);
  assert.match(issuerBridgeTest, /configured development route issues a browser session while upload admission remains closed/);
  assert.match(issuerBridgeTest, /USER_UPLOADS_DISABLED/);
  assert.equal(runManifest.rollback.sessionRevocationEvidenceRequired, true);
  assert.equal(runManifest.rollback.closeAdmissionBeforeDrain, true);
  assert.equal(runManifest.rollback.rollbackCanDeleteRows, false);
  assert.equal(runManifest.rollback.unknownReservationsRemainLocked, true);
});

test('rollback projection and authorizations do not open activation or mutation paths', () => {
  assert.equal(packet.rollbackPlanProjection.firstAction, 'close admission before drain');
  assert.equal(packet.rollbackPlanProjection.requiredTerminalCode, 'USER_UPLOADS_DISABLED');
  assert.equal(packet.rollbackPlanProjection.deleteRowsWithoutDisposition, false);
  assert.equal(packet.rollbackPlanProjection.unknownReservationsRemainLocked, true);
  assert.equal(packet.rollbackPlanProjection.rollbackCanOpenRoute, false);
  for (const key of [
    'requestBodyReadAuthorizedNow',
    'productionUploadActivationAuthorizedNow',
    'conversionAllowed',
    'sandboxDispatchAllowed',
    'storeMutationAllowed',
    'privateCadAllowed',
    'realUsersAllowed',
    'providerEnvResourceBillingChangesAllowed',
    'externalMessagesAllowed',
  ]) {
    assert.equal(packet.guardrails[key], false, `${key} must remain false`);
  }
  for (const key of [
    'rollbackEvidenceAccepted',
    'concurrentRevocationFenceAccepted',
    'requestBodyRead',
    'productionUploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'providerEnvResourceBillingChanges',
    'storeMutation',
    'privateCad',
    'realUsers',
    'externalMessages',
    'secrets',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain unauthorized`);
  }
});

test('packet contains no secrets, identities or activation claims', () => {
  const serialized = JSON.stringify(packet);
  assert.doesNotMatch(serialized, /@|\+\d{7,}|BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
  assert.match(markdown, /does not authorize request body reads/);
  assert.match(markdown, /No production sessions were issued/);
});
