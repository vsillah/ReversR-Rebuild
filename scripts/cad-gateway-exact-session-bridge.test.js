const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const {
  INTERNAL_MARK_TEST_COHORT,
  createCadExactSessionBridge,
} = require('../server/cadExactSessionBridge');
const {
  ENV_NAMES,
  createCadUploadSessionGatewayService,
} = require('../server/cadUploadSessionGatewayService');

const digest = value => createHash('sha256').update(value).digest('hex');
const env = Object.freeze({
  [ENV_NAMES.url]: 'https://convex.example.test/cad/upload-session-gateway',
  [ENV_NAMES.token]: 't'.repeat(48),
  [ENV_NAMES.audience]: INTERNAL_MARK_TEST_COHORT,
});
const grant = Object.freeze({
  userId: 'user-mark-test',
  shopId: 'shop-mark-test',
  loginSessionId: 'login-session-a',
  authMethod: 'password',
  cadUploadAllowed: true,
  expiresAt: 61000,
});

function response(result) {
  return { status: 200, async json() { return { schemaVersion: 1, status: 'success', result }; } };
}

test('disabled exact-session bridge is inert and never calls verifier', async () => {
  let calls = 0;
  const bridge = createCadExactSessionBridge({
    verifyExactSession: async () => { calls++; return grant; },
    now: () => 1000,
  });
  assert.equal(bridge.sourceOnly, true);
  assert.equal(bridge.configured, false);
  assert.equal(await bridge.resolveAuthorization({ schemaVersion: 1 }), null);
  assert.equal(await bridge.refreshAuthorization({
    userId: grant.userId,
    shopId: grant.shopId,
    sessionId: 'upload-session-a',
    loginSessionId: grant.loginSessionId,
    authMethod: grant.authMethod,
  }), null);
  assert.equal(calls, 0);
});

test('exact-session bridge accepts only opaque issue context and projects sanitized grants', async () => {
  const verifierCalls = [];
  const bridge = createCadExactSessionBridge({
    enabled: true,
    verifyExactSession: async message => {
      verifierCalls.push(message);
      return { ...grant, privateSentinel: 'blocked' };
    },
    now: () => 1000,
  });
  const projected = await bridge.resolveAuthorization({
    schemaVersion: 1,
    cohort: INTERNAL_MARK_TEST_COHORT,
    requestRef: 'request-alpha',
    shopId: grant.shopId,
    loginSessionRef: 'login-session-ref-a',
    transport: 'bearer',
  });
  assert.deepEqual(projected, grant);
  assert.equal(Object.isFrozen(projected), true);
  assert.deepEqual(Object.keys(projected).sort(), [
    'authMethod',
    'cadUploadAllowed',
    'expiresAt',
    'loginSessionId',
    'shopId',
    'userId',
  ]);
  assert.equal(verifierCalls.length, 1);
  assert.deepEqual(verifierCalls[0], {
    schemaVersion: 1,
    purpose: 'issue',
    issueContext: {
      schemaVersion: 1,
      cohort: INTERNAL_MARK_TEST_COHORT,
      requestRef: 'request-alpha',
      shopId: grant.shopId,
      loginSessionRef: 'login-session-ref-a',
      transport: 'bearer',
    },
  });

  for (const context of [
    { schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-alpha', shopId: grant.shopId, userId: grant.userId },
    { schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-alpha', shopId: grant.shopId, principal: { userId: grant.userId } },
    { schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-alpha', shopId: grant.shopId, body: 'blocked' },
    { schemaVersion: 1, cohort: INTERNAL_MARK_TEST_COHORT, requestRef: 'request-alpha', shopId: grant.shopId, unknown: true },
  ]) {
    await assert.rejects(bridge.resolveAuthorization(context), /^Error: AUTH_UNAVAILABLE$/);
  }
});

test('exact-session bridge refresh requires binding match and preserves permission loss', async () => {
  const bridge = createCadExactSessionBridge({
    enabled: true,
    verifyExactSession: async message => {
      assert.equal(message.purpose, 'refresh');
      assert.equal(message.binding.sessionId, 'upload-session-a');
      return { ...grant, cadUploadAllowed: false };
    },
    now: () => 1000,
  });
  const refreshed = await bridge.refreshAuthorization({
    userId: grant.userId,
    shopId: grant.shopId,
    sessionId: 'upload-session-a',
    loginSessionId: grant.loginSessionId,
    authMethod: grant.authMethod,
  });
  assert.equal(refreshed.cadUploadAllowed, false);

  const mismatch = createCadExactSessionBridge({
    enabled: true,
    verifyExactSession: async () => ({ ...grant, shopId: 'shop-other' }),
    now: () => 1000,
  });
  assert.equal(await mismatch.refreshAuthorization({
    userId: grant.userId,
    shopId: grant.shopId,
    sessionId: 'upload-session-a',
    loginSessionId: grant.loginSessionId,
    authMethod: grant.authMethod,
  }), null);
});

test('gateway service can use injected exact-session bridge in local source-only mode', async () => {
  const records = new Map();
  const gatewayCalls = [];
  const bridgeCalls = [];
  const bridge = createCadExactSessionBridge({
    enabled: true,
    verifyExactSession: async message => {
      bridgeCalls.push(message);
      return grant;
    },
    now: () => 1000,
  });
  const service = createCadUploadSessionGatewayService({
    env,
    now: () => 1000,
    exactSessionBridge: bridge,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      gatewayCalls.push(body.operation);
      assert.doesNotMatch(init.body, new RegExp(env[ENV_NAMES.token]));
      if (body.operation === 'insertIfAbsent') {
        const { credentialDigest, record } = body.payload;
        assert.equal(records.has(credentialDigest), false);
        records.set(credentialDigest, record);
        return response(true);
      }
      if (body.operation === 'read') return response(records.get(body.payload.credentialDigest) ?? null);
      if (body.operation === 'revoke') {
        const record = records.get(body.payload.credentialDigest);
        if (!record) return response(false);
        records.set(body.payload.credentialDigest, { ...record, status: 'revoked' });
        return response(true);
      }
      throw new Error(`unexpected operation ${body.operation}`);
    },
  });
  assert.equal(service.gateway.issuanceEnabled, true);
  assert.equal(service.gateway.exactSessionBridge, 'source-only-injected');
  const issued = await service.sessionService.issueSession({
    schemaVersion: 1,
    cohort: INTERNAL_MARK_TEST_COHORT,
    requestRef: 'request-alpha',
    shopId: grant.shopId,
  });
  assert.equal(issued.ok, true);
  assert.match(issued.credential, /^us1\./);
  assert.deepEqual(gatewayCalls, ['insertIfAbsent']);
  assert.equal(bridgeCalls[0].purpose, 'issue');

  const lookedUp = await service.sessionService.lookupSession(digest(issued.credential));
  assert.equal(lookedUp.userId, grant.userId);
  assert.equal(lookedUp.shopId, grant.shopId);
  assert.equal(lookedUp.cadUploadAllowed, true);
  assert.equal(Object.hasOwn(lookedUp, 'loginSessionId'), false);
  assert.deepEqual(gatewayCalls, ['insertIfAbsent', 'read']);
  assert.equal(bridgeCalls[1].purpose, 'refresh');

  assert.deepEqual(await service.sessionService.revokeSession(digest(issued.credential)), { ok: true });
  const revoked = await service.sessionService.lookupSession(digest(issued.credential));
  assert.equal(revoked.status, 'revoked');
  assert.deepEqual(gatewayCalls, ['insertIfAbsent', 'read', 'revoke', 'read']);
});

test('bridge packet records source-only status and blocked live authority', () => {
  const packet = require('../docs/cad-gateway-exact-session-bridge.json');
  assert.equal(packet.mode, 'source-only-exact-session-bridge');
  assert.equal(packet.status, 'IMPLEMENTED_SOURCE_ONLY_INJECTION_DEFAULT_CLOSED');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.runtimeBehavior.defaultGatewayIssuanceEnabled, false);
  assert.equal(packet.runtimeBehavior.envCanSelectBridge, false);
  assert.equal(packet.runtimeBehavior.injectedBridgeCanIssueOnlyInReviewedSourceHarness, true);
  for (const value of Object.values(packet.guardrails)) assert.equal(value, false);
});
