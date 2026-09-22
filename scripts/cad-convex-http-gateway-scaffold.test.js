const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash, webcrypto } = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadGateway(env = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, 'convex/cadUploadSessionGateway.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    fileName: 'convex/cadUploadSessionGateway.ts',
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  assert.equal(output.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(output.outputText, {
    exports,
    require: dependency => {
      if (dependency === './_generated/server') {
        return { env, httpAction: handler => ({ kind: 'httpAction', handler }) };
      }
      throw Error(`UNEXPECTED_DEPENDENCY: ${dependency}`);
    },
    crypto: webcrypto,
    TextEncoder,
    Response,
    Uint8Array,
    console,
  });
  return exports;
}

function gatewayEnv(token = 'S'.repeat(48)) {
  const gateway = loadGateway();
  return Object.freeze({
    [gateway.CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES.audience]: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE,
    [gateway.CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES.tokenHash]: digest(token),
  });
}

function fakeRequest({ method = 'POST', authorization, contentType = 'application/json', json } = {}) {
  return {
    method,
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (key === 'authorization') return authorization ?? null;
        if (key === 'content-type') return contentType ?? null;
        return null;
      },
    },
    json,
  };
}

async function payload(response) {
  return JSON.parse(await response.text());
}

test('gateway config is all-or-nothing, hashed, and scoped to the internal Mark cohort', () => {
  const gateway = loadGateway();
  const names = gateway.CAD_UPLOAD_SESSION_GATEWAY_ENV_NAMES;
  assert.deepEqual(plain(gateway.readCadUploadSessionGatewayConfig({})), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_UNCONFIGURED',
  });
  assert.deepEqual(plain(gateway.readCadUploadSessionGatewayConfig({ [names.audience]: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE })), {
    ok: false,
    code: 'CAD_UPLOAD_SESSION_GATEWAY_INCOMPLETE',
  });
  assert.deepEqual(plain(gateway.readCadUploadSessionGatewayConfig({
    [names.audience]: 'rrb-ref:other',
    [names.tokenHash]: digest('S'.repeat(48)),
  })), { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID' });
  assert.deepEqual(plain(gateway.readCadUploadSessionGatewayConfig({
    [names.audience]: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE,
    [names.tokenHash]: 'S'.repeat(48),
  })), { ok: false, code: 'CAD_UPLOAD_SESSION_GATEWAY_INVALID' });
  assert.deepEqual(plain(gateway.readCadUploadSessionGatewayConfig(gatewayEnv())), {
    ok: true,
    audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE,
    tokenHash: digest('S'.repeat(48)),
  });
});

test('gateway fails closed before body reads when env is absent or bearer auth is invalid', async () => {
  for (const { env, authorization } of [
    { env: {}, authorization: 'Bearer ' + 'S'.repeat(48) },
    { env: gatewayEnv(), authorization: null },
    { env: gatewayEnv(), authorization: 'Bearer too-short' },
    { env: gatewayEnv(), authorization: 'Bearer ' + 'X'.repeat(48) },
  ]) {
    let bodyReads = 0;
    const gateway = loadGateway(env);
    const response = await gateway.handleCadUploadSessionGatewayRequest({}, fakeRequest({
      authorization,
      json() {
        bodyReads += 1;
        throw Error('BODY_READ');
      },
    }));
    assert.equal(response.status, 503);
    assert.equal((await payload(response)).code, 'AUTH_UNAVAILABLE');
    assert.equal(bodyReads, 0);
  }
});

test('gateway validates the authenticated JSON envelope and leaves dispatch disabled', async () => {
  const token = 'S'.repeat(48);
  const gateway = loadGateway(gatewayEnv(token));
  const response = await gateway.handleCadUploadSessionGatewayRequest({
    runQuery() { throw Error('DISPATCH_SHOULD_NOT_RUN'); },
    runMutation() { throw Error('DISPATCH_SHOULD_NOT_RUN'); },
  }, new Request('https://convex.example.test/cad/upload-session-gateway', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      schemaVersion: 1,
      audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE,
      operation: 'read',
      payload: { credentialDigest: digest('synthetic'), deadlineAt: 2000 },
    }),
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await payload(response), { schemaVersion: 1, status: 'error', code: 'AUTH_UNAVAILABLE' });
});

test('gateway rejects unsupported operations, client principal overrides, and wrong methods', async () => {
  const token = 'S'.repeat(48);
  const gateway = loadGateway(gatewayEnv(token));
  async function post(body) {
    return gateway.handleCadUploadSessionGatewayRequest({}, new Request('https://convex.example.test/cad/upload-session-gateway', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));
  }
  for (const body of [
    { schemaVersion: 1, audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE, operation: 'resolveAuthorization', payload: { deadlineAt: 2000 } },
    { schemaVersion: 1, audience: 'rrb-ref:other', operation: 'read', payload: { deadlineAt: 2000 } },
    { schemaVersion: 1, audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE, operation: 'read', payload: { deadlineAt: 2000, principal: {} } },
    { schemaVersion: 1, audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE, operation: 'read', payload: { deadlineAt: 2000, token: 'S'.repeat(48) } },
    { schemaVersion: 1, audience: gateway.CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE, operation: 'read', payload: { deadlineAt: 0 } },
  ]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.equal((await payload(response)).code, 'INVALID_GATEWAY_ENVELOPE');
  }
  const methodResponse = await gateway.handleCadUploadSessionGatewayRequest({}, fakeRequest({
    method: 'GET',
    authorization: `Bearer ${token}`,
    json() {
      throw Error('BODY_READ');
    },
  }));
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get('allow'), 'POST');
});

test('gateway source packet documents source-only guardrails and env names', () => {
  const manifest = require('../docs/cad-convex-http-gateway-scaffold.json');
  assert.equal(manifest.mode, 'source-only-convex-http-gateway-scaffold');
  assert.equal(manifest.status, 'IMPLEMENTED_FAIL_CLOSED_PENDING_ENV_AND_DISPATCH_GATE');
  assert.equal(manifest.route, 'POST /cad/upload-session-gateway');
  assert.equal(manifest.runtimeBehavior.dispatchEnabled, false);
  assert.equal(manifest.runtimeBehavior.uploadSessionIssuanceEnabled, false);
  assert.equal(manifest.guardrails.requestBodyAdmissionAllowed, false);
  assert.equal(manifest.guardrails.providerEnvResourceBillingChangesAllowed, false);
  assert.deepEqual(manifest.envManifest.requiredTogether, [
    'CAD_UPLOAD_SESSION_GATEWAY_AUDIENCE',
    'CAD_UPLOAD_SESSION_GATEWAY_SERVICE_TOKEN_SHA256',
  ]);
});
