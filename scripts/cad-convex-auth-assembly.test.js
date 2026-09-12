const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createLibrarySessionReaderForTests } = require('../offline/cad-convex/librarySessionHarness');
const { loadSource } = require('./helpers/cad-convex-source-loader');
const { fixture, principal } = require('./helpers/cad-convex-fixture');
function setup() {
  let evidence = { verified: true, ...principal }, tick = 1000;
  const rows = new Map([
    [principal.loginSessionId, { _id: principal.loginSessionId, userId: principal.userId, expirationTime: 60000 }],
    [principal.userId, { _id: principal.userId }],
  ]);
  const reads = [];
  const ctx = { db: { get: async id => { reads.push(id); return rows.get(id) ?? null; } } };
  const reader = createLibrarySessionReaderForTests({ testOnly: true, now: () => tick,
    verifyExactLogin: async actual => { assert.equal(actual, ctx); return evidence; } });
  return { rows, reads, ctx, reader, set: v => { evidence = v; }, time: n => { tick = n; },
    read: (id = principal.loginSessionId) => reader(ctx, id) };
}
test('assembly registers library exports, no login providers or trusted JWT issuers, no CAD HTTP handler', () => {
  const cache = {}, calls = [], router = {};
  const auth = { addHttpRoutes: value => { assert.equal(value, router); calls.push('library-routes'); } };
  function load(name) {
    if (cache[name]) return cache[name];
    const exports = {}; cache[name] = exports;
    const source = fs.readFileSync(require.resolve('../convex/' + name + '.ts'), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(output, { exports, require: dependency => {
      if (dependency === '@convex-dev/auth/server') return { convexAuth: config => {
        assert.equal(JSON.stringify(config), '{"providers":[]}');
        return { auth, signIn: {}, signOut: {}, store: {}, isAuthenticated: {} };
      } };
      if (dependency === 'convex/server') return { httpRouter: () => router };
      if (dependency === './auth') return load('auth');
      throw Error('UNEXPECTED_DEPENDENCY');
    } }); // No process/env/network capability in this assembly test.
    return exports;
  }
  assert.equal(JSON.stringify(load('auth.config').default), '{"providers":[]}');
  assert.deepEqual(Object.keys(load('auth')).sort(), ['auth', 'isAuthenticated', 'signIn', 'signOut', 'store']);
  assert.equal(load('http').default, router); assert.deepEqual(calls, ['library-routes']);
});
test('synthetic reader requires explicit harness and fresh verified exact-login evidence before DB access', async () => {
  assert.throws(() => createLibrarySessionReaderForTests(), /TEST_SESSION_OPT_IN_REQUIRED/);
  assert.throws(() => createLibrarySessionReaderForTests({ testOnly: true }), /AUTH_UNAVAILABLE/);
  for (const value of [undefined, {}, { ...principal }, { verified: 'true', ...principal },
    { verified: true, ...principal, authMethod: 'anonymous' }]) {
    const f = setup(); f.set(value);
    await assert.rejects(f.read(), /^Error: AUTH_UNAVAILABLE$/); assert.equal(f.reads.length, 0);
  }
  const f = setup(); f.set(null); assert.equal(await f.read(), null); assert.equal(f.reads.length, 0);
  f.set({ verified: true, ...principal, loginSessionId: 'different' });
  assert.equal(await f.read(), null); assert.equal(f.reads.length, 0);
});
test('candidate point-reads exact library session and owner; revocation, expiry and wrong owner deny', async () => {
  const f = setup();
  assert.deepEqual(await f.read(), { userId: principal.userId, loginSessionId: principal.loginSessionId,
    authMethod: principal.authMethod, active: true, expiresAt: 60000 });
  assert.deepEqual(f.reads, [principal.loginSessionId, principal.userId]);
  f.rows.delete(principal.userId); assert.equal(await f.read(), null);
  f.rows.set(principal.userId, { _id: principal.userId });
  f.rows.get(principal.loginSessionId).userId = 'other'; assert.equal(await f.read(), null);
  f.rows.get(principal.loginSessionId).userId = principal.userId;
  f.time(60000); assert.equal(await f.read(), null);
  f.time(1000); f.rows.delete(principal.loginSessionId); assert.equal(await f.read(), null);
});
test('corrupt session and verification outages fail closed with sanitized errors', async () => {
  for (const patch of [{ expirationTime: NaN }, { expirationTime: Infinity }, { expirationTime: -1 }, { _id: 'wrong' }]) {
    const f = setup(); Object.assign(f.rows.get(principal.loginSessionId), patch);
    await assert.rejects(f.read(), /^Error: AUTH_UNAVAILABLE$/);
  }
  const reader = createLibrarySessionReaderForTests({ testOnly: true,
    verifyExactLogin: async () => { throw Error('synthetic-private-marker'); } });
  await assert.rejects(reader({}, principal.loginSessionId), /^Error: AUTH_UNAVAILABLE$/);
});
test('candidate works with actual CAD source only through test-loader injection; default still denies', async () => {
  const f = fixture();
  const reader = createLibrarySessionReaderForTests({ testOnly: true, now: f.now,
    verifyExactLogin: async () => ({ verified: true, ...principal }) });
  const source = loadSource({ now: f.now, readExactLibrarySession: reader });
  const args = { principal, shopId: principal.shopId, deadlineAt: 1800 };
  const run = cad => f.transaction(ctx => {
    ctx.db.get = async id => id === principal.loginSessionId
      ? { _id: id, userId: principal.userId, expirationTime: 60000 }
      : id === principal.userId ? { _id: id } : null;
    return cad.resolveAuthorization.invoke(ctx, args);
  });
  assert.deepEqual(await run(source.cad), { ...principal, cadUploadAllowed: true, expiresAt: 60000 });
  await assert.rejects(run(loadSource({ now: f.now }).cad), /AUTH_UNAVAILABLE/);
  assert.equal(f.tables().cadUploadSessions.length, 0);
});
