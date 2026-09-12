const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const express = require('express');
const { fixture, principal } = require('./helpers/cad-convex-fixture');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const { inspectPreviewConfig, createSyntheticPreviewRuntime } = require('../offline/cad-convex/previewRuntime');
const config = () => ({ mode: 'synthetic', target: 'preview', deploymentUrl: 'https://deployment.invalid',
  issuerUrl: 'https://issuer.invalid', appOrigin: 'https://app.invalid', applicationId: 'convex' });
const hash = x => createHash('sha256').update(x).digest('hex');
function setup(overrides = {}) {
  const f = fixture(), context = Object.freeze({ handle: 'synthetic-context' });
  let verified = true, checks = 0, calls = 0;
  const runtime = createSyntheticPreviewRuntime({ testOnly: true, config: config(), now: f.now,
    verifyConfiguration: async () => { checks++; return verified; },
    authenticateService: async c => c === context,
    verifyExactLogin: async c => c === context ? principal : null,
    invokeInternal: async (...args) => { calls++; return f.run(...args); }, ...overrides });
  return { f, runtime, service: runtime.forRequest({ context, shopId: principal.shopId }),
    unverify: () => { verified = false; }, checks: () => checks, calls: () => calls };
}
test('readiness rejects missing, production, live, malformed and secret-bearing configuration', () => {
  assert.equal(inspectPreviewConfig().code, 'PREVIEW_CONFIG_MISSING');
  assert.equal(inspectPreviewConfig({ mode: 'live' }).code, 'LIVE_AUTH_UNQUALIFIED');
  for (const patch of [{ target: 'production' }, { mode: 'true' }, { token: 'private-marker' },
    { deploymentUrl: 'https://real.convex.cloud' }, { issuerUrl: 'https://issuer.invalid/path' },
    { appOrigin: 'https://user:private-marker@app.invalid' }, { appOrigin: 'https://app.invalid?token=private-marker' },
    { appOrigin: 'http://app.invalid' }, { applicationId: 'other' }, { deploymentUrl: undefined }]) {
    const report = inspectPreviewConfig({ ...config(), ...patch });
    assert.equal(report.configured, false); assert.equal(report.uploadsEnabled, false);
    assert.doesNotMatch(JSON.stringify(report), /private-marker|https:/);
    assert.throws(() => setup({ config: { ...config(), ...patch } }), /^Error: AUTH_UNAVAILABLE$/);
  }
  assert.deepEqual(inspectPreviewConfig(config()), { code: 'SYNTHETIC_CONFIG_VALID', configured: true,
    liveAuthReady: false, uploadsEnabled: false });
  assert.throws(() => createSyntheticPreviewRuntime(), /TEST_PREVIEW_OPT_IN_REQUIRED/);
  assert.throws(() => setup({ verifyConfiguration: undefined }), /AUTH_UNAVAILABLE/);
});
test('configuration verification is fresh, strict and precedes session authority access', async () => {
  const a = setup();
  const issued = await a.service.issueSession({ shopId: principal.shopId });
  assert.equal(issued.ok, true);
  assert.ok(await a.service.lookupSession(hash(issued.credential)));
  assert.equal(a.checks(), a.calls());
  assert.ok(a.checks() >= 4);
  const before = a.calls(); a.unverify();
  await assert.rejects(a.service.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/);
  assert.equal((await a.service.issueSession({ shopId: principal.shopId })).ok, false);
  assert.equal(a.calls(), before);
  let verificationCount = 0;
  const expiresDuringIssue = setup({ verifyConfiguration: async () => ++verificationCount === 1 });
  assert.equal((await expiresDuringIssue.service.issueSession({ shopId: principal.shopId })).ok, false);
  assert.equal(expiresDuringIssue.calls(), 1);
  assert.equal(expiresDuringIssue.f.tables().cadUploadSessions.length, 0);
  assert.equal(JSON.stringify(a.f.tables()).includes(issued.credential), false);
  for (const verifyConfiguration of [async () => 'true', async () => { throw Error('private-marker'); }]) {
    const denied = setup({ verifyConfiguration });
    const result = await denied.service.issueSession({ shopId: principal.shopId });
    assert.equal(result.ok, false); assert.equal(denied.calls(), 0);
    assert.doesNotMatch(JSON.stringify(result), /private-marker/);
  }
});
test('preview snapshots configuration and isolates contexts, login revocation and permission changes', async () => {
  const input = config(); let observed;
  const a = setup({ config: input, verifyConfiguration: async snapshot => { observed = snapshot; return true; } });
  input.target = 'production'; input.issuerUrl = 'https://changed.invalid';
  const issued = await a.service.issueSession({ shopId: principal.shopId });
  assert.equal(issued.ok, true); assert.equal(observed.target, 'preview'); assert.ok(Object.isFrozen(observed));
  assert.throws(() => a.runtime.forRequest({ context: {}, shopId: principal.shopId }), /AUTH_UNAVAILABLE/);
  const other = a.runtime.forRequest({ context: Object.freeze({}), shopId: principal.shopId });
  await assert.rejects(other.lookupSession(hash(issued.credential)), /^Error: AUTH_UNAVAILABLE$/);
  a.f.tables().library[0].active = false;
  assert.equal(await a.service.lookupSession(hash(issued.credential)), null);
  a.f.tables().library[0].active = true;
  await a.f.policy({ enabled: false }); await a.f.policy({ enabled: true });
  assert.equal(await a.service.lookupSession(hash(issued.credential)), null);
});
test('hung verification times out without invoking backend or leaking error details', async () => {
  const a = setup({ verifyConfiguration: () => new Promise(() => {}) });
  const result = await a.service.issueSession({ shopId: principal.shopId });
  assert.equal(result.ok, false); assert.equal(a.calls(), 0);
});
test('configured preview sessions still hit real upload-disabled gate before any body read', async t => {
  const a = setup(); a.f.setTime(Date.now()); a.f.tables().library[0].expiresAt = a.f.now() + 60000;
  const issued = await a.service.issueSession({ shopId: principal.shopId }); assert.equal(issued.ok, true);
  const app = express(); let reads = 0;
  app.use((req, res, next) => {
    const on = req.on;
    req.on = function(event, ...args) {
      if (['data', 'readable'].includes(event)) { reads++; throw Error('BODY_SENTINEL'); }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', { get() { reads++; throw Error('BODY_SENTINEL'); } }); next();
  });
  app.use('/api/cad', createCadUserUploadRouter({ sessionService: a.service }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/cad/user-import`;
  const send = async () => {
    const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${issued.credential}` }, body: 'BODY_SENTINEL' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  assert.equal((await send()).code, 'USER_UPLOADS_DISABLED');
  await a.service.revokeSession(hash(issued.credential));
  assert.equal((await send()).code, 'USER_SESSION_REQUIRED');
  assert.equal(reads, 0);
});
