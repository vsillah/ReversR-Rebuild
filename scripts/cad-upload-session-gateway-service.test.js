const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const express = require('express');
const {
  ENV_NAMES,
  INTERNAL_MARK_TEST_COHORT,
  readGatewayConfig,
  createCadUploadSessionGatewayClient,
  createCadUploadSessionGatewayService,
} = require('../server/cadUploadSessionGatewayService');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');

const digest = value => createHash('sha256').update(value).digest('hex');
const env = Object.freeze({
  [ENV_NAMES.url]: 'https://convex.example.test/cad/upload-session-gateway',
  [ENV_NAMES.token]: 's'.repeat(48),
  [ENV_NAMES.audience]: INTERNAL_MARK_TEST_COHORT,
});

test('gateway env is all-or-nothing and scoped to the internal Mark cohort', () => {
  assert.deepEqual(readGatewayConfig({}), { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_UNCONFIGURED' });
  assert.deepEqual(readGatewayConfig({ [ENV_NAMES.url]: env[ENV_NAMES.url] }), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_INCOMPLETE',
  });
  assert.deepEqual(readGatewayConfig({ ...env, [ENV_NAMES.url]: 'http://convex.example.test/cad/upload-session-gateway' }), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID',
  });
  assert.deepEqual(readGatewayConfig({ ...env, [ENV_NAMES.url]: `${env[ENV_NAMES.url]}?token=blocked` }), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID',
  });
  assert.deepEqual(readGatewayConfig({ ...env, [ENV_NAMES.audience]: 'rrb-ref:other' }), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID',
  });
  const parsed = readGatewayConfig(env);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.gatewayUrl.href, env[ENV_NAMES.url]);
  assert.equal(parsed.serviceToken, env[ENV_NAMES.token]);
  assert.equal(parsed.audience, INTERNAL_MARK_TEST_COHORT);
});

test('configured client sends a bounded service request without echoing secrets in the body', async () => {
  const calls = [];
  const client = createCadUploadSessionGatewayClient({
    gatewayUrl: new URL(env[ENV_NAMES.url]),
    serviceToken: env[ENV_NAMES.token],
    audience: INTERNAL_MARK_TEST_COHORT,
    now: () => 1000,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return { status: 200, async json() { return { schemaVersion: 1, status: 'success', result: null }; } };
    },
  });
  assert.equal(await client.call('read', { credentialDigest: digest('synthetic'), deadlineAt: 1800 }), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, env[ENV_NAMES.url]);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.authorization, `Bearer ${env[ENV_NAMES.token]}`);
  assert.doesNotMatch(calls[0].init.body, new RegExp(env[ENV_NAMES.token]));
  assert.match(calls[0].init.body, /"operation":"read"/);
  assert.match(calls[0].init.body, new RegExp(INTERNAL_MARK_TEST_COHORT));
});

test('client rejects unsupported operations and ambiguous gateway responses', async () => {
  const base = { gatewayUrl: new URL(env[ENV_NAMES.url]), serviceToken: env[ENV_NAMES.token],
    audience: INTERNAL_MARK_TEST_COHORT, now: () => 1000 };
  const client = createCadUploadSessionGatewayClient({ ...base, fetchImpl: async () => {
    throw Error('unexpected');
  } });
  await assert.rejects(client.call('resolveAuthorization', {}), /^Error: AUTH_UNAVAILABLE$/);
  for (const response of [
    { status: 503, async json() { return { schemaVersion: 1, status: 'success', result: null }; } },
    { status: 200, async json() { return { schemaVersion: 1, status: 'error', code: 'PRIVATE_DETAIL' }; } },
    { status: 200, async json() { return { schemaVersion: 1, status: 'success' }; } },
  ]) {
    const failing = createCadUploadSessionGatewayClient({ ...base, fetchImpl: async () => response });
    await assert.rejects(failing.call('read', { credentialDigest: digest('synthetic'), deadlineAt: 1800 }), /^Error: AUTH_UNAVAILABLE$/);
  }
});

test('service stays unconfigured without env and cannot issue sessions even when gateway env exists', async () => {
  const closed = createCadUploadSessionGatewayService({ env: {} });
  assert.equal(closed.configured, false);
  assert.equal(closed.code, 'CAD_UPLOAD_SESSION_GATEWAY_UNCONFIGURED');
  await assert.rejects(closed.sessionService.lookupSession(digest('synthetic')), /^Error: AUTH_UNAVAILABLE$/);

  let calls = 0;
  const opened = createCadUploadSessionGatewayService({
    env,
    now: () => 1000,
    fetchImpl: async (_url, init) => {
      calls++;
      assert.doesNotMatch(init.body, /s{48}/);
      return { status: 200, async json() { return { schemaVersion: 1, status: 'success', result: null }; } };
    },
  });
  assert.equal(opened.configured, true);
  assert.equal(opened.gateway.issuanceEnabled, false);
  assert.deepEqual(await opened.sessionService.issueSession({ userId: 'user-test' }), {
    ok: false,
    code: 'AUTHORIZATION_REQUIRED',
  });
  assert.equal(calls, 0, 'issuer remains disabled before a separate production gate');
  assert.equal(await opened.sessionService.lookupSession(digest('synthetic')), null);
  assert.equal(calls, 1);
});

test('user-import route remains fail-closed and does not read bodies with absent gateway env', async t => {
  let bodyReads = 0;
  const runtime = createCadUploadSessionGatewayService({ env: {} });
  const app = express();
  app.use((req, _res, next) => {
    const on = req.on;
    req.on = function (event, ...args) {
      if (event === 'data' || event === 'readable') { bodyReads++; throw Error('SENTINEL_BODY_READ'); }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', { get() { bodyReads++; throw Error('SENTINEL_BODY_READ'); } });
    next();
  });
  app.use('/api/cad', createCadUserUploadRouter({ sessionService: runtime.sessionService }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
    assert.equal(bodyReads, 0);
  });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, {
    method: 'POST',
    headers: { authorization: `Bearer us1.${randomBytes(32).toString('base64url')}`, 'content-type': 'application/json' },
    body: '{"sentinel":true}',
  });
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.code, 'USER_AUTH_UNAVAILABLE');
  assert.deepEqual(Object.keys(payload).sort(), ['code', 'message', 'schemaVersion', 'status']);
});

test('implementation manifest documents source-only guardrails and exact env names', () => {
  const manifest = require('../docs/cad-internal-upload-session-gateway-implementation.json');
  assert.equal(manifest.mode, 'source-only-server-authenticated-gateway-support');
  assert.equal(manifest.status, 'IMPLEMENTED_FAIL_CLOSED_PENDING_ENV_AND_ISSUER_GATE');
  assert.equal(manifest.envManifest.valuesInstalledByThisGate, false);
  assert.equal(manifest.envManifest.secretValuesStoredByThisGate, false);
  assert.equal(manifest.envManifest.providerSettingsChangedByThisGate, false);
  assert.equal(manifest.runtimeBehavior.bodyAdmissionAuthorized, false);
  assert.equal(manifest.runtimeBehavior.requestBodyReadAuthorized, false);
  assert.equal(manifest.runtimeBehavior.uploadSessionIssuanceEnabled, false);
  assert.equal(manifest.guardrails.productionUploadActivationAllowed, false);
  assert.deepEqual(manifest.envManifest.requiredTogether, Object.values(ENV_NAMES));
});
