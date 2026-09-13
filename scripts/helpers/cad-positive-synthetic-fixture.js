// Local fake store and SDK identity hooks. No network, signing or Auth table mutation.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createPositiveSyntheticSession, tables } = require('../../offline/cad-convex/positiveSyntheticSession');
function source(name, dependencies) {
  const exports = {};
  const text = fs.readFileSync(require.resolve('../../convex/' + name + '.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: key => { if (!Object.hasOwn(dependencies, key)) throw Error('UNEXPECTED_IMPORT'); return dependencies[key]; } });
  return exports;
}
const cohort = Object.freeze(['cad-test-one@auth-test.invalid', 'cad-test-two@auth-test.invalid']);
const password = 'fixture-only-password-input';
function fixture(journalPath, overrides = {}) {
  let tick = 1000;
  const configuration = source('developmentAuth', { '@convex-dev/auth/providers/Password': { Password: policy => policy } });
  const policy = configuration.developmentPassword(cohort);
  const rows = new Map(), calls = [];
  const contexts = [null, null];
  const reader = source('librarySession', {
    '@convex-dev/auth/server': { getAuthUserId: async ctx => ctx.auth.userId,
      getAuthSessionId: async ctx => ctx.auth.loginSessionId },
    './developmentAuth': { developmentAuthReviewed: true },
  }).readExactLibrarySession;
  const counts = () => Object.fromEntries(tables.map(t => [t, 0]));
  const ports = {
    prepare: async () => ({ counts: counts(), passwordOnly: true, supportedRemoval: true, diagnosticsReviewed: true }),
    provision: async ({ slot, provider, account, profile, shouldLinkViaEmail, shouldLinkViaPhone, requireAbsent }) => {
      if (provider !== 'password' || account.id !== cohort[slot] || account.secret !== password
        || profile.email !== cohort[slot] || shouldLinkViaEmail !== false || shouldLinkViaPhone !== false
        || requireAbsent !== true || rows.has('owner-' + slot)) throw Error('FIXTURE_PROVISION_MISMATCH');
      rows.set('owner-' + slot, { _id: 'owner-' + slot });
      rows.set('account-' + slot, { _id: 'account-' + slot });
      return { userId: 'owner-' + slot, accountId: 'account-' + slot, created: true };
    },
    signIn: async ({ slot, params }) => {
      policy.profile(params);
      if (params.password !== password) throw Error('fixture-invalid-password');
      contexts[slot] = { userId: 'owner-' + slot, loginSessionId: 'login-' + slot };
      rows.set('login-' + slot, { _id: 'login-' + slot, userId: 'owner-' + slot, expirationTime: 5000 });
      return { ...contexts[slot] };
    },
    exactSession: async ({ slot, loginSessionId, validThrough }) => reader({ auth: contexts[slot],
      db: { get: async key => rows.get(key) ?? null } }, loginSessionId, validThrough),
    logout: async ({ slot, userId, loginSessionId }) => {
      if (userId !== 'owner-' + slot || loginSessionId !== 'login-' + slot) throw Error('FIXTURE_OWNER_MISMATCH');
      rows.delete(loginSessionId); return null;
    },
    revoke: async ({ slot, userId, ...rest }) => {
      if (userId !== 'owner-' + slot || 'except' in rest) throw Error('FIXTURE_OWNER_MISMATCH');
      rows.delete('login-' + slot); return null;
    },
    inventory: async ({ userId, accountId }) => ({ ...counts(), users: Number(rows.has(userId)), authAccounts: Number(rows.has(accountId)) }),
    remove: async ({ userId, accountId, expectedCounts }) => {
      if (expectedCounts.users !== 1 || expectedCounts.authAccounts !== 1) throw Error('FIXTURE_COUNTS_MISMATCH');
      rows.delete(userId); rows.delete(accountId); return null;
    },
    ...overrides,
  };
  const wrapped = Object.fromEntries(Object.entries(ports).map(([name, fn]) => [name, async args => { calls.push(name); return fn(args); }]));
  const run = createPositiveSyntheticSession({ testOnly: true, cohort, policy, ports: wrapped,
    ledger: { journalPath, now: () => tick, endAt: 10000, timeoutMs: 50 } });
  return { run, rows, contexts, calls, ports, policy, configuration, reader, counts, setTime: n => { tick = n; },
    params: slot => ({ flow: 'signIn', email: cohort[slot], password }) };
}
async function enrolled(f) {
  await f.run.prepare(); await f.run.provision(0, password); await f.run.provision(1, password);
  await f.run.client(0).signIn(f.params(0)); await f.run.client(1).signIn(f.params(1)); return f;
}
module.exports = { fixture, enrolled, cohort, password, source };
