const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync('docs/cad-internal-admission-transport-review-packet.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-internal-admission-transport-review-packet.md', 'utf8');
const readiness = JSON.parse(fs.readFileSync('offline/cad-convex/userUploadActivationReadiness.json', 'utf8'));
const uploadSessionSource = fs.readFileSync('server/uploadSession.js', 'utf8');
const uploadSessionStoreSource = fs.readFileSync('server/uploadSessionStore.js', 'utf8');
const routeSource = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');

test('packet is source-only and does not accept either transport', () => {
  assert.equal(packet.mode, 'source-only-transport-review-requirements');
  assert.equal(packet.status, 'TRANSPORT_REVIEW_DRAFT_UPLOADS_DISABLED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.baseCommit, 'dc6c789d2e5b5524256a4514d30fe8c3539720e4');
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.currentRouteState.bodyAdmissionAuthorized, false);
  assert.equal(packet.currentRouteState.bodyReadAuthorized, false);
  assert.equal(packet.currentRouteState.browserCsrfEvidenceAccepted, false);
  assert.equal(packet.currentRouteState.nativeBearerEvidenceAccepted, false);
  assert.equal(packet.currentRouteState.routeMayOpenNow, false);
  assert.equal(packet.currentRouteState.terminalCodeUntilSeparateActivationApproval, 'USER_UPLOADS_DISABLED');
});

test('source bindings exist and the runtime route remains literal fail-closed', () => {
  for (const [key, fileRef] of Object.entries(packet.sourceBindings)) {
    const file = fileRef.split('#')[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${key} binding must exist`);
  }
  assert.equal(packet.route, readiness.route);
  assert.match(routeSource, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(routeSource, /BODY_ADMISSION_AUTHORIZED = true/);
  assert.match(routeSource, /allowedHeaders: \['Content-Type', 'Authorization', 'X-Upload-CSRF'\]/);
  assert.match(routeSource, /const result = await verify\(req\);/);
  assert.ok(
    routeSource.indexOf('const result = await verify(req);') < routeSource.indexOf('const admission = await validateRequestBody(req);'),
    'session verification must remain before request body validation',
  );
});

test('browser cookie transport evidence is currently blocked and source backed', () => {
  const evidence = readiness.gates.uploadPermission.evidence.cookieExactHttpsOriginAndSessionCsrf;
  assert.equal(evidence, null);
  assert.equal(packet.browserCookieTransportReview.accepted, false);
  assert.equal(packet.browserCookieTransportReview.evidenceSlot,
    'offline/cad-convex/userUploadActivationReadiness.json#gates.uploadPermission.evidence.cookieExactHttpsOriginAndSessionCsrf');
  assert.equal(packet.browserCookieTransportReview.cookieName, '__Host-reversr-upload-session');
  assert.deepEqual(packet.browserCookieTransportReview.requiredHeaders, ['Cookie', 'Origin', 'X-Upload-CSRF']);
  assert.equal(packet.browserCookieTransportReview.exactHttpsOriginRequired, true);
  assert.equal(packet.browserCookieTransportReview.wildcardOriginAccepted, false);
  assert.equal(packet.browserCookieTransportReview.csrfDigestRequired, true);
  assert.match(uploadSessionSource, /const COOKIE = '__Host-reversr-upload-session';/);
  assert.match(uploadSessionSource, /'x-upload-csrf'/);
  assert.match(uploadSessionSource, /credential\.transport === 'cookie'/);
  assert.match(uploadSessionSource, /!origins\.has\(credential\.origin\)/);
  assert.match(uploadSessionSource, /timingSafeEqual\(Buffer\.from\(digest\(credential\.csrf\)/);
});

test('native bearer transport evidence is currently blocked and source backed', () => {
  const evidence = readiness.gates.uploadPermission.evidence.nativeBearerTransportReview;
  assert.equal(evidence, null);
  assert.equal(packet.nativeBearerTransportReview.accepted, false);
  assert.equal(packet.nativeBearerTransportReview.evidenceSlot,
    'offline/cad-convex/userUploadActivationReadiness.json#gates.uploadPermission.evidence.nativeBearerTransportReview');
  assert.equal(packet.nativeBearerTransportReview.authorizationScheme, 'Bearer us1.<opaque-token>');
  assert.equal(packet.nativeBearerTransportReview.duplicateAuthorizationRejected, true);
  assert.equal(packet.nativeBearerTransportReview.mixedCookieAndBearerRejected, true);
  assert.equal(packet.nativeBearerTransportReview.tokenDigestOnly, true);
  assert.equal(packet.nativeBearerTransportReview.membershipPermissionRefreshRequired, true);
  assert.match(uploadSessionSource, /\^Bearer \(us1\\\.\[A-Za-z0-9_-\]\{43\}\)\$/);
  assert.match(uploadSessionSource, /cookies\.length && headers\.authorization !== undefined/);
  assert.match(uploadSessionSource, /seen\.has\(name\)/);
  assert.match(uploadSessionStoreSource, /refreshAuthorization\(binding/);
  assert.match(uploadSessionStoreSource, /cadUploadAllowed = result\.cadUploadAllowed && grant\.cadUploadAllowed/);
});

test('packet excludes activation, conversion, Sandbox, private CAD and provider changes', () => {
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
    'browserCookieTransportAccepted',
    'nativeBearerTransportAccepted',
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
  assert.match(markdown, /The next useful gate is accepting exact transport evidence/);
});
