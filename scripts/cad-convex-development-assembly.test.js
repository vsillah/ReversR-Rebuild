const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createDevelopmentService } = require('../offline/cad-convex/developmentService');
const { principal } = require('./helpers/cad-convex-fixture');
function load(file, dependencies = {}, tick = () => 1000) {
  const exports = {};
  const source = fs.readFileSync(require.resolve('../convex/' + file + '.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Date: { now: tick }, require: name => {
      if (!(name in dependencies)) throw Error('UNEXPECTED_DEPENDENCY');
      return dependencies[name];
    } });
  return exports;
}
const configuration = () => load('developmentAuth', {
  '@convex-dev/auth/providers/Password': { Password: policy => policy },
});
test('source gate rejects env activation; reviewed candidate requires exact origin, issuer and nonempty key rows', () => {
  const c = configuration();
  assert.equal(c.developmentConfiguration({}), null);
  const env = { CONVEX_SITE_URL: c.developmentIssuer, SITE_URL: c.developmentOrigin,
    JWT_PRIVATE_KEY: 'fixture-presence-only', JWKS: 'fixture-presence-only' };
  assert.equal(c.developmentConfiguration(env), null);
  c.developmentAuthReviewed = true; // VM-only toggle; production source remains false.
  assert.equal(c.developmentConfiguration(env).origin, 'http://localhost:5001');
  for (const name of Object.keys(env)) {
    assert.throws(() => c.developmentConfiguration({ ...env, [name]: '' }), /AUTH_UNAVAILABLE/);
    assert.throws(() => c.developmentConfiguration({ ...env, [name]: undefined }), /AUTH_UNAVAILABLE/);
  }
  assert.throws(() => c.developmentConfiguration({ ...env, SITE_URL: 'http://127.0.0.1:5001' }));
  assert.throws(() => c.developmentConfiguration({ ...env, CONVEX_SITE_URL: 'https://other.convex.site' }));
});
test('Password restricts existing synthetic cohort and every alternate flow; redirects use exact root', () => {
  const c = configuration(), email = 'cad-test-one@auth-test.invalid';
  assert.throws(() => c.developmentPassword([]));
  const policy = c.developmentPassword([email]);
  const params = { email, password: 'fixture-only-input', flow: 'signIn' };
  assert.equal(policy.profile(params).email, email);
  for (const flow of ['signUp', 'reset', 'reset-verification', 'email-verification', undefined])
    assert.throws(() => policy.profile({ ...params, flow }));
  assert.throws(() => policy.profile({ ...params, email: 'cad-test-other@auth-test.invalid' }));
  assert.throws(() => policy.profile({ ...params, redirectTo: '/' }));
  assert.throws(() => policy.validatePasswordRequirements());
  assert.equal(c.developmentRedirect({ redirectTo: '/' }), c.developmentOrigin + '/');
  for (const redirectTo of ['//outside.invalid', 'http://localhost:5001.evil/', '/?next=x', '/logout', 'reversr://x'])
    assert.throws(() => c.developmentRedirect({ redirectTo }));
});
test('actual session source uses verified exact identity plus bounded point reads, deletion and owner checks', async () => {
  let tick = 1000, user = 'owner', session = 'login';
  const rows = new Map([['owner', { _id: 'owner' }], ['login', { _id: 'login', userId: 'owner', expirationTime: 2000 }]]);
  const reads = [], ctx = { db: { get: async id => { reads.push(id); return rows.get(id) ?? null; } } };
  const reader = load('librarySession', {
    '@convex-dev/auth/server': { getAuthUserId: async () => user, getAuthSessionId: async () => session },
    './developmentAuth': { developmentAuthReviewed: true },
  }, () => tick).readExactLibrarySession;
  assert.equal((await reader(ctx, 'login')).authMethod, 'password');
  assert.deepEqual(reads, ['login', 'owner']);
  reads.length = 0; session = 'different'; assert.equal(await reader(ctx, 'login'), null); assert.equal(reads.length, 0);
  session = 'login'; user = 'other'; assert.equal(await reader(ctx, 'login'), null);
  user = 'owner'; tick = 2000; assert.equal(await reader(ctx, 'login'), null);
  tick = 1000; rows.delete('owner'); assert.equal(await reader(ctx, 'login'), null);
  rows.set('owner', { _id: 'owner' }); rows.delete('login'); assert.equal(await reader(ctx, 'login'), null);
});
function service(overrides = {}) {
  let calls = 0;
  const instance = createDevelopmentService({ serviceSubject: 'fixture-service', now: () => 1000,
    verifyService: async () => ({ verified: true, subject: 'fixture-service', audience: 'reversr-cad-auth-dev',
      deployment: 'majestic-alligator-31', revoked: false, expiresAt: 2000 }),
    verifyExactLogin: async () => principal,
    invokeInternal: async () => { calls++; return null; }, ...overrides });
  return { instance, calls: () => calls };
}
const input = { shopId: principal.shopId, deadlineAt: 1800 };
test('service boundary denies unverified/revoked/wrong callers before invocation', async () => {
  for (const receipt of [null, {}, { verified: true, subject: 'wrong' }]) {
    const f = service({ verifyService: async () => receipt });
    await assert.rejects(f.instance.call('resolveAuthorization', input), /RUN_STOPPED/);
    assert.equal(f.calls(), 0);
  }
});
test('service budgets cap operations and unknown write outcomes stop without replay', async () => {
  const f = service();
  for (let i = 0; i < 100; i++) assert.equal(await f.instance.call('resolveAuthorization', input), null);
  await assert.rejects(f.instance.call('resolveAuthorization', input), /RUN_STOPPED/);
  assert.equal(f.calls(), 100);
  let writes = 0;
  const unknown = service({ invokeInternal: async () => { writes++; throw Error('private-marker'); } });
  await assert.rejects(unknown.instance.call('revoke', { credentialDigest: 'a'.repeat(64), revokedAt: 1000, deadlineAt: 1800 }), /OUTCOME_UNKNOWN/);
  await assert.rejects(unknown.instance.call('resolveAuthorization', input), /RUN_STOPPED/);
  assert.equal(unknown.instance.status().automaticRetries, 0);
  assert.equal(writes, 1);
});
test('service rejects wrong audience, deployment, revocation and expired verification; time bound stops dispatch', async () => {
  const valid = { verified: true, subject: 'fixture-service', audience: 'reversr-cad-auth-dev',
    deployment: 'majestic-alligator-31', revoked: false, expiresAt: 2000 };
  for (const patch of [{ verified: false }, { audience: 'other' }, { deployment: 'other' },
    { revoked: true }, { expiresAt: 1000 }, { expiresAt: NaN }]) {
    const f = service({ verifyService: async () => ({ ...valid, ...patch }) });
    await assert.rejects(f.instance.call('resolveAuthorization', input), /RUN_STOPPED/);
    assert.equal(f.calls(), 0);
  }
  let tick = 1000;
  const f = service({ now: () => tick }); tick += 900000;
  await assert.rejects(f.instance.call('resolveAuthorization', input), /RUN_STOPPED/);
  assert.equal(f.calls(), 0);
});
test('concurrent client cannot dispatch while first operation is unresolved', async () => {
  let release;
  const f = service({ invokeInternal: () => new Promise(resolve => { release = resolve; }) });
  const first = f.instance.call('resolveAuthorization', input);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.instance.call('resolveAuthorization', input), /RUN_BUSY/);
  release(null); assert.equal(await first, null);
  assert.equal(f.instance.status().operations, 1);
});
test('execution worksheet leaves every live gate closed and blockers explicit', () => {
  const manifest = require('../offline/cad-convex/developmentExecution.json');
  assert.equal(manifest.executable, false);
  assert.equal(manifest.auth.sourceGate, false);
  assert.deepEqual(manifest.auth.cohort, []);
  for (const gate of Object.values(manifest.gates)) assert.equal(gate.approved, false);
  assert.ok(Object.values(manifest.uploads).every(value => value === false));
  assert.equal(manifest.service.transport, null);
  assert.equal(manifest.reconciliation.resumeInNewProcess, false);
});
