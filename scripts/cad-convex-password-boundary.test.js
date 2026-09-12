const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createLibrarySessionReaderForTests } = require('../offline/cad-convex/librarySessionHarness');
const { loadSource } = require('./helpers/cad-convex-source-loader');
const { fixture, principal } = require('./helpers/cad-convex-fixture');
const source = fs.readFileSync(require.resolve('../offline/cad-convex/passwordPolicy.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsForTest = {};
// Type-only imports disappear; policy execution has no runtime capabilities.
vm.runInNewContext(compiled, { exports: exportsForTest });
const create = exportsForTest.createPasswordPolicyForTests;
const email = 'cad-test-one@auth-test.invalid';
const credentials = () => ({ flow: 'signIn', email, password: 'x'.repeat(16) });
const options = () => ({ testOnly: true, syntheticEmails: [email] });
const denied = /^Error: AUTH_UNAVAILABLE$/;

test('Password candidate requires bounded exact synthetic cohort and snapshots host configuration', () => {
  for (const input of [undefined, {}, { ...options(), testOnly: false },
    { ...options(), syntheticEmails: [] }, { ...options(), syntheticEmails: [email, email] },
    { ...options(), syntheticEmails: ['real@example.com'] },
    { ...options(), syntheticEmails: Array.from({ length: 9 }, (_, n) => `cad-test-${n}@auth-test.invalid`) }]) {
    assert.throws(() => create(input), denied);
  }
  const input = options(), policy = create(input);
  input.syntheticEmails[0] = 'cad-test-two@auth-test.invalid';
  assert.equal(policy.profile(credentials()).email, email);
  assert.throws(() => policy.profile({ ...credentials(), email: input.syntheticEmails[0] }), denied);
  assert.equal(Object.isFrozen(policy), true);
  assert.deepEqual(Object.keys(policy).sort(), ['id', 'profile', 'validatePasswordRequirements']);
});

test('Password policy denies signup, delivery, identity claims, redirects and malformed credentials', () => {
  const policy = create(options());
  for (const flow of ['signUp', 'reset', 'reset-verification', 'email-verification', '', undefined]) {
    assert.throws(() => policy.profile({ ...credentials(), flow }), denied);
  }
  assert.throws(() => policy.validatePasswordRequirements('x'.repeat(16)), denied);
  for (const patch of [{ email: email.toUpperCase() }, { email: ' ' + email },
    { email: 'cad-test-two@auth-test.invalid' }, { password: null }, { password: 'x'.repeat(11) },
    { password: 'x'.repeat(129) }, { userId: 'claimed' }, { loginSessionId: 'claimed' },
    { cadUploadAllowed: true }, { redirectTo: 'https://outside.invalid' }]) {
    assert.throws(() => policy.profile({ ...credentials(), ...patch }), denied);
  }
});

test('pinned Password executes policy before any account operation for denied flows', async () => {
  const { Password } = await import('@convex-dev/auth/providers/Password');
  // Pinned SDK stores materialized credentials behavior in options; no convexAuth
  // registration, keys, hashing, network, or provider session execution is used.
  const provider = Password(create(options()));
  const authorize = provider.options.authorize;
  let calls = 0;
  const ctx = { runMutation: async () => { calls++; throw Error('synthetic-provider-detail'); } };
  for (const flow of ['signUp', 'reset', 'reset-verification', 'email-verification', 'unknown']) {
    await assert.rejects(authorize({ ...credentials(), flow }, ctx), denied);
  }
  await assert.rejects(authorize({ ...credentials(), userId: 'claimed' }, ctx), denied);
  assert.equal(calls, 0);
  // Allowed signIn reaches the library's account check; policy is not a verifier.
  await assert.rejects(authorize(credentials(), ctx), /synthetic-provider-detail/);
  assert.equal(calls, 1);
  assert.ok(provider.options.extraProviders.every(value => value === undefined));
});

test('synthetic Password exact-session evidence never authorizes another login or revives logout', async () => {
  const f = fixture();
  const verified = { verified: true, ...principal, authMethod: 'password' };
  const rows = new Map([
    [principal.userId, { _id: principal.userId }],
    [principal.loginSessionId, { _id: principal.loginSessionId, userId: principal.userId, expirationTime: 60000 }],
  ]);
  const reader = createLibrarySessionReaderForTests({ testOnly: true, now: f.now,
    verifyExactLogin: async () => verified });
  const cad = loadSource({ now: f.now, readExactLibrarySession: reader }).cad;
  const args = { principal: { ...principal, authMethod: 'password' }, shopId: principal.shopId, deadlineAt: 1800 };
  const run = () => f.transaction(ctx => {
    ctx.db.get = async id => rows.get(id) ?? null;
    return cad.resolveAuthorization.invoke(ctx, args);
  });
  assert.equal((await run()).authMethod, 'password');
  verified.loginSessionId = 'different-login';
  assert.equal(await run(), null);
  verified.loginSessionId = principal.loginSessionId;
  rows.delete(principal.loginSessionId); // Synthetic model of library signOut deletion.
  assert.equal(await run(), null); // Stale JWT-shaped evidence has no positive cache.
  rows.set('different-login', { _id: 'different-login', userId: principal.userId, expirationTime: 60000 });
  assert.equal(await run(), null);
  assert.equal(f.tables().cadUploadSessions.length, 0);
});
