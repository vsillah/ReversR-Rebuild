const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const express = require('express');
const { fixture, principal } = require('./helpers/cad-convex-fixture');
const { FUNCTIONS, createInternalDispatcher, createRequestSessionAdapterForTests } = require('../offline/cad-convex/sessionAdapter');
const { createAdmissionHarnessForTests } = require('../offline/cad-convex/admissionHarness');
const { createCadUserUploadRouter } = require('../server/cadUserUploadRouter');
const hash = x => createHash('sha256').update(x).digest('hex');
function adapter(f, overrides = {}) {
  const context = Object.freeze({ handle: 'synthetic-context' });
  const calls = [];
  const service = createRequestSessionAdapterForTests({ testOnly: true, context, shopId: principal.shopId,
    now: f.now, authenticateService: async c => c === context,
    verifyExactLogin: async c => c === context ? principal : null,
    invokeInternal: async (op, p, b) => { calls.push(structuredClone(p)); return f.run(op, p, b); }, ...overrides });
  return { service, calls };
}
async function issued(f, overrides) {
  const a = adapter(f, overrides);
  const token = await a.service.issueSession({ shopId: principal.shopId });
  assert.equal(token.ok, true);
  return { ...a, token, headers: { authorization: `Bearer ${token.credential}`, 'content-type': 'application/json' } };
}
async function listener(t, router, guard = false) {
  let reads = 0;
  const app = express();
  if (guard) app.use((req, res, next) => {
    const on = req.on;
    req.on = function(event, ...args) {
      if (['data', 'readable'].includes(event)) { reads++; throw Error('BODY_SENTINEL'); }
      return on.call(this, event, ...args);
    };
    Object.defineProperty(req, 'body', { get() { reads++; throw Error('BODY_SENTINEL'); } });
    next();
  });
  app.use('/api/cad', router);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); if (guard) assert.equal(reads, 0); });
  return async (headers, body = '{BODY_SENTINEL') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, { method: 'POST', headers, body });
    const text = await response.text();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(text, /BODY_SENTINEL|synthetic-user|synthetic-shop|us1\.|provider-detail|contentBase64/);
    return JSON.parse(text).code;
  };
}
test('adapter opt-in, strict selectors, context isolation and digest-only records', async () => {
  assert.throws(() => createRequestSessionAdapterForTests(), /TEST_ADAPTER_OPT_IN_REQUIRED/);
  const f = fixture(), a = await issued(f);
  assert.ok(await a.service.lookupSession(hash(a.token.credential)));
  assert.equal(JSON.stringify(a.calls).includes(a.token.credential), false);
  assert.equal(JSON.stringify(f.tables()).includes(a.token.credential), false);
  for (const selector of [{ shopId: principal.shopId, userId: principal.userId }, { shopId: 'another' }, null]) {
    assert.equal((await a.service.issueSession(selector)).ok, false);
  }
  const wrongShop = adapter(f, { verifyExactLogin: async () => ({ ...principal, shopId: 'other-shop' }) });
  assert.equal(await wrongShop.service.lookupSession(hash(a.token.credential)), null);
  const other = adapter(f, { verifyExactLogin: async () => ({ ...principal, loginSessionId: 'other-login' }) });
  assert.equal(await other.service.lookupSession(hash(a.token.credential)), null);
  assert.equal((await other.service.revokeSession(hash(a.token.credential))).ok, false);
});
test('fixed function dispatch rejects arbitrary names, malformed returns and aborts', async () => {
  const calls = [];
  const references = Object.fromEntries(Object.entries(FUNCTIONS).map(([op, value]) => [op, value.name]));
  const invoke = async (ref, args) => { calls.push(ref); assert.deepEqual(args.principal, principal); return ref.endsWith('revoke') ? true : null; };
  const dispatch = createInternalDispatcher({ references, runQuery: invoke, runMutation: invoke });
  references.read = 'evil';
  assert.equal(await dispatch('read', { credentialDigest: 'a'.repeat(64), deadlineAt: 1800 }, principal), null);
  assert.equal(await dispatch('revoke', { credentialDigest: 'a'.repeat(64), revokedAt: 1000, deadlineAt: 1800 }, principal), true);
  for (const op of ['constructor', 'changeAuthority', 'delete']) await assert.rejects(dispatch(op, {}, principal), /AUTH_UNAVAILABLE/);
  const c = new AbortController(); c.abort();
  await assert.rejects(dispatch('read', { credentialDigest: 'a'.repeat(64), deadlineAt: 1800 }, principal, { signal: c.signal }), /AUTH_UNAVAILABLE/);
  assert.deepEqual(calls, ['cad:read', 'cad:revoke']);
  const bad = createInternalDispatcher({ references, runQuery: async () => ({ providerToken: 'provider-detail' }), runMutation: invoke });
  await assert.rejects(bad('read', { credentialDigest: 'a'.repeat(64), deadlineAt: 1800 }, principal), /^Error: AUTH_UNAVAILABLE$/);
});
test('actual mounted router with gateway adapter rejects absent/expired/revoked authority before any body read', async t => {
  const f = fixture(); f.setTime(Date.now()); f.tables().library[0].expiresAt = f.now() + 60000;
  const a = await issued(f);
  const request = await listener(t, createCadUserUploadRouter({ sessionService: a.service }), true);
  assert.equal(await request({}), 'USER_SESSION_REQUIRED');
  assert.equal(await request(a.headers), 'USER_UPLOADS_DISABLED');
  f.setTime(a.token.expiresAt);
  assert.equal(await request(a.headers), 'USER_SESSION_REQUIRED');
  f.setTime(a.token.expiresAt - 60000);
  f.tables().library[0].expiresAt = f.now();
  assert.equal(await request(a.headers), 'USER_SESSION_REQUIRED');
  f.tables().library[0].expiresAt = f.now() + 60000;
  await a.service.revokeSession(hash(a.token.credential));
  assert.equal(await request(a.headers), 'USER_SESSION_REQUIRED');
  f.tables().library.length = 0;
  assert.equal(await request(a.headers), 'USER_SESSION_REQUIRED');
});
test('revoke between read and refresh and permission deny/regrant never admit old sessions', async () => {
  const f = fixture(); let revokeAfterRead = false;
  const a = await issued(f, { invokeInternal: async (op, p, b) => {
    const result = await f.run(op, p, b);
    if (op === 'read' && revokeAfterRead) await f.run('revoke', { credentialDigest: p.credentialDigest, revokedAt: f.now() }, b);
    return result;
  } });
  revokeAfterRead = true;
  assert.equal(await a.service.lookupSession(hash(a.token.credential)), null);
  const b = await issued(f);
  await f.policy({ enabled: false }); await f.policy({ enabled: true });
  assert.equal(await b.service.lookupSession(hash(b.token.credential)), null);
});
test('enabled synthetic harness checks gates, validates, rechecks revocation and retains uncertain dispatch', async t => {
  assert.throws(() => createAdmissionHarnessForTests(), /TEST_HARNESS_OPT_IN_REQUIRED/);
  const f = fixture(), a = await issued(f);
  let decodes = 0, dispatches = 0, releases = 0, retains = 0, blocked = false, revoke = false, uncertain = false;
  const options = { testOnly: true, uploadsEnabled: true, sessionService: a.service, now: f.now,
    reserve: async () => blocked ? null : { release: async () => { releases++; }, retain: async () => { retains++; } },
    validate: async body => { decodes++; if (revoke) await a.service.revokeSession(hash(a.token.credential));
      return body && Object.keys(body).join() === 'fixture' && body.fixture === 'synthetic' ? true : null; },
    dispatch: async () => { dispatches++; if (uncertain) throw Error('provider-detail'); return true; } };
  const disabled = await listener(t, createAdmissionHarnessForTests({ ...options, uploadsEnabled: false }), true);
  assert.equal(await disabled(a.headers), 'USER_UPLOADS_DISABLED');
  assert.equal(decodes, 0); assert.equal(dispatches, 0);
  const noControls = await listener(t, createAdmissionHarnessForTests({ ...options, reserve: undefined }), true);
  assert.equal(await noControls(a.headers), 'UPLOAD_CONTROLS_UNAVAILABLE');
  const request = await listener(t, createAdmissionHarnessForTests(options));
  blocked = true; assert.equal(await request(a.headers), 'UPLOAD_LIMIT_REACHED'); blocked = false;
  assert.equal(decodes, 0); assert.equal(dispatches, 0);
  assert.equal(await request({ ...a.headers, 'content-type': 'text/plain' }), 'UNSUPPORTED');
  assert.equal(await request(a.headers), 'MALFORMED');
  assert.equal(await request(a.headers, 'x'.repeat(384 * 1024 + 1)), 'TOO_LARGE');
  assert.equal(await request(a.headers, JSON.stringify({ contentBase64: 'BODY_SENTINEL' })), 'MALFORMED');
  assert.equal(await request(a.headers, JSON.stringify({ fixture: 'synthetic' })), 'SYNTHETIC_ACCEPTED');
  assert.equal(dispatches, 1);
  uncertain = true;
  assert.equal(await request(a.headers, JSON.stringify({ fixture: 'synthetic' })), 'SYNTHETIC_ADAPTER_FAILED');
  assert.equal(retains, 1);
  revoke = true;
  assert.equal(await request(a.headers, JSON.stringify({ fixture: 'synthetic' })), 'USER_SESSION_REQUIRED');
  assert.equal(dispatches, 2); assert.ok(releases >= 4);
});
