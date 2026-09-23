const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));

test('principal boundary packet keeps live dispatch and upload activation blocked', () => {
  const packet = json('docs/cad-convex-gateway-principal-boundary.json');
  assert.equal(packet.mode, 'source-only-principal-dispatch-boundary');
  assert.equal(packet.status, 'SOURCE_BOUNDARY_READY_DISPATCH_BLOCKED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeRouteChanged, false);
  assert.equal(packet.currentRuntimeBehavior.serviceEnvelopeAuthenticationImplemented, true);
  assert.equal(packet.currentRuntimeBehavior.serviceEnvelopeDispatchImplemented, false);
  assert.equal(packet.currentRuntimeBehavior.livePrincipalDerivationImplemented, false);
  assert.equal(packet.currentRuntimeBehavior.uploadSessionIssuanceEnabled, false);
  assert.equal(packet.currentRuntimeBehavior.requestBodyAdmissionEnabled, false);
  assert.equal(packet.currentRuntimeBehavior.conversionOrSandboxDispatchEnabled, false);
  assert.equal(packet.nextGate.requiredBeforeLiveDispatch, true);
  assert.equal(packet.guardrails.providerEnvResourceBillingChangesAllowed, false);
  assert.equal(packet.guardrails.secretValuesStoredByThisGate, false);
  assert.equal(packet.guardrails.productionUploadActivationAllowed, false);
  assert.equal(packet.guardrails.requestBodyReadAllowed, false);
});

test('current gateway source authenticates service envelope but cannot dispatch user authority', () => {
  const gateway = read('convex/cadUploadSessionGateway.ts');
  assert.match(gateway, /CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN_SHA256/);
  assert.match(gateway, /FORBIDDEN_PAYLOAD_KEYS/);
  assert.match(gateway, /principal/);
  assert.match(gateway, /return failUnavailable\(\);/);
  assert.doesNotMatch(gateway, /ctx\.run(Query|Mutation|Action)/);
  assert.doesNotMatch(gateway, /internal\.cad/);
  assert.doesNotMatch(gateway, /changeAuthority/);
});

test('user principal must come from exact library session review, not service token or payload', () => {
  const librarySession = read('convex/librarySession.ts');
  assert.match(librarySession, /getAuthUserId\(ctx\)/);
  assert.match(librarySession, /getAuthSessionId\(ctx\)/);
  assert.match(librarySession, /service token/);
  assert.match(librarySession, /supplied principal is never a substitute/);
  assert.match(librarySession, /session\.userId !== userId/);
  assert.match(librarySession, /session\.expirationTime <= validThrough/);
});

test('server gateway service still has no production issuer grant', () => {
  const service = read('server/cadUploadSessionGatewayService.js');
  assert.match(service, /resolveAuthorization: async \(\) => null/);
  assert.match(service, /issuanceEnabled: false/);
  assert.match(service, /CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN/);
  assert.doesNotMatch(service, /resolveAuthorization: async \(\) => \(\{/);
});

test('offline dispatcher model is only a candidate fixed-operation map', () => {
  const { FUNCTIONS } = require('../offline/cad-convex/sessionAdapter');
  assert.deepEqual(Object.keys(FUNCTIONS).sort(), [
    'insertIfAbsent',
    'read',
    'refreshAuthorization',
    'resolveAuthorization',
    'revoke',
  ]);
  assert.equal(FUNCTIONS.insertIfAbsent.kind, 'mutation');
  assert.equal(FUNCTIONS.read.kind, 'query');
  assert.equal(FUNCTIONS.refreshAuthorization.kind, 'query');
  assert.equal(FUNCTIONS.revoke.kind, 'mutation');
  assert.equal(Object.hasOwn(FUNCTIONS, 'changeAuthority'), false);
});

test('markdown does not overclaim production readiness', () => {
  const markdown = read('docs/cad-convex-gateway-principal-boundary.md');
  assert.match(markdown, /live dispatch remains blocked/i);
  assert.match(markdown, /not production wiring/i);
  assert.match(markdown, /remain separate from production upload activation/i);
  assert.doesNotMatch(markdown, /production upload activation completed/i);
  assert.doesNotMatch(markdown, /conversion dispatched/i);
  assert.doesNotMatch(markdown, /commercial readiness achieved/i);
});
