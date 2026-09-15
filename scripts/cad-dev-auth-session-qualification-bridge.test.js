const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const packet = JSON.parse(fs.readFileSync('docs/cad-dev-auth-session-qualification-bridge.json', 'utf8'));
const markdown = fs.readFileSync('docs/cad-dev-auth-session-qualification-bridge.md', 'utf8');
const binding = fs.readFileSync('convex/cadDevAuthQualificationBinding.ts', 'utf8');
const bridge = fs.readFileSync('convex/cadDevAuthQualification.ts', 'utf8');
const store = fs.readFileSync('convex/cadDevAuthQualificationStore.ts', 'utf8');
const runner = require('./cad-dev-auth-session-qualification-runner');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

test('packet records a disabled-by-default source bridge with exact development target', () => {
  assert.equal(packet.mode, 'source-only-cad-development-auth-session-qualification-bridge');
  assert.equal(packet.status, 'BRIDGE_DISABLED_BY_DEFAULT');
  assert.equal(packet.baseMainCommit, 'e02f168d85c4bf11e7a2ccf802252659c0fb66b1');
  assert.equal(packet.target.deploymentName, 'majestic-alligator-31');
  assert.equal(packet.target.kind, 'development');
  assert.equal(packet.sourceBridge.enabledByDefault, false);
  assert.equal(packet.sourceBridge.requiresSourceRebind, true);
  assert.equal(packet.sourceBridge.deleteUsersOrAccounts, false);
  assert.equal(packet.sourceBridge.retainUsersAndAccounts, true);
});

test('binding source is controlled by either the disabled bridge or a reviewed one-run rebind', () => {
  const disabled = /enabled: false/.test(binding);
  const rebound = /enabled: true/.test(binding) && /mode: 'cad-dev-auth-session-qualification-rebind-1800z'/.test(binding);
  assert.equal(disabled || rebound, true);
  if (disabled) {
    assert.match(binding, /runKeySha256: null/);
    assert.match(binding, /acceptedProjectionSha256: null/);
    assert.match(binding, /acceptanceReceiptSha256: null/);
    assert.match(binding, /windowStartMs: null/);
    assert.match(binding, /windowEndMs: null/);
  } else {
    assert.match(binding, /runKeySha256: '[a-f0-9]{64}'/);
    assert.match(binding, /acceptedProjectionSha256: '[a-f0-9]{64}'/);
    assert.match(binding, /acceptanceReceiptSha256: '[a-f0-9]{64}'/);
    assert.match(binding, /windowStartMs: 1789495200000/);
    assert.match(binding, /windowEndMs: 1789496100000/);
  }
  assert.match(binding, /deleteUsersOrAccounts: false/);
  assert.match(binding, /retainUsersAndAccounts: true/);
});

test('bridge uses supported Convex Auth helpers and never deletes users or accounts directly', () => {
  assert.match(bridge, /createAccount/);
  assert.match(bridge, /invalidateSessions/);
  assert.match(bridge, /developmentConfiguration\(process\.env\)/);
  assert.match(bridge, /QUALIFICATION_DISABLED/);
  assert.doesNotMatch(bridge, /ctx\.db\.delete/);
  assert.doesNotMatch(bridge, /authAccounts['"`][\s\S]{0,80}delete/);
  assert.doesNotMatch(bridge, /users['"`][\s\S]{0,80}delete/);
});

test('exact-session store reads current server auth identity instead of trusting decoded client claims', () => {
  assert.match(store, /getAuthSessionId\(ctx\)/);
  assert.match(store, /readExactLibrarySession\(ctx, loginSessionId, args\.validThrough\)/);
  assert.doesNotMatch(store, /jwt|decode|atob|Buffer\.from/i);
  assert.match(store, /withIndex\('providerAndAccountId'/);
  assert.match(store, /withIndex\('userIdAndProvider'/);
  assert.match(store, /withIndex\('userId'/);
  assert.match(store, /authVerifiersSelectorLimited: true/);
});

test('runner validates private local register shape without leaking raw authority into source', () => {
  const runKey = 'local-run-key-for-test-only';
  const register = {
    version: 1,
    mode: 'cad-dev-auth-session-qualification',
    convexUrl: 'https://majestic-alligator-31.convex.cloud',
    deploymentName: 'majestic-alligator-31',
    runId: 'run-test-qualification',
    runKey,
    runKeySha256: sha256(runKey),
    acceptedProjectionSha256: 'a'.repeat(64),
    acceptanceReceiptSha256: 'b'.repeat(64),
    cohort: [
      'cad-test-alpha-20260915@auth-test.invalid',
      'cad-test-beta-20260915@auth-test.invalid',
    ],
    passwords: ['synthetic-password-one', 'synthetic-password-two'],
    windowStartUtc: new Date(Date.now() - 1000).toISOString(),
    windowEndUtc: new Date(Date.now() + 60000).toISOString(),
  };
  assert.deepEqual(Object.keys(runner.validateRegister(register)).sort(), ['end', 'start']);
  assert.throws(() => runner.validateRegister({ ...register, runKeySha256: '0'.repeat(64) }), /REGISTER_KEY_INVALID/);
  assert.throws(() => runner.validateRegister({ ...register, acceptedProjectionSha256: 'nope' }), /REGISTER_DIGEST_INVALID/);
  assert.throws(() => runner.validateRegister({ ...register, cohort: ['real@example.com', register.cohort[1]] }), /REGISTER_COHORT_INVALID/);
  assert.throws(() => runner.validateRegister({ ...register, passwords: ['short', register.passwords[1]] }), /REGISTER_PASSWORD_INVALID/);
});

test('runner executes the intended synthetic sequence against injectable clients', async () => {
  const runKey = 'local-run-key-for-runner-test';
  const calls = [];
  const api = {
    cadDevAuthQualification: { provisionCohort: 'provisionCohort', revokeUsers: 'revokeUsers' },
    cadDevAuthQualificationStore: { readCurrent: 'readCurrent' },
    auth: { signIn: 'signIn', signOut: 'signOut' },
  };
  const register = {
    version: 1,
    mode: 'cad-dev-auth-session-qualification',
    convexUrl: 'https://majestic-alligator-31.convex.cloud',
    deploymentName: 'majestic-alligator-31',
    runId: 'run-test-qualification',
    runKey,
    runKeySha256: sha256(runKey),
    acceptedProjectionSha256: 'c'.repeat(64),
    acceptanceReceiptSha256: 'd'.repeat(64),
    cohort: [
      'cad-test-alpha-20260915@auth-test.invalid',
      'cad-test-beta-20260915@auth-test.invalid',
    ],
    passwords: ['synthetic-password-one', 'synthetic-password-two'],
    windowStartUtc: new Date(Date.now() - 1000).toISOString(),
    windowEndUtc: new Date(Date.now() + 60000).toISOString(),
  };
  const authed = token => ({
    action: async fn => {
      calls.push(['auth-action', fn, token]);
      return null;
    },
    query: async fn => {
      calls.push(['auth-query', fn, token]);
      if (calls.filter(c => c[0] === 'auth-query' && c[2] === token).length > 1) return null;
      return {
        userId: token === 'token-0' ? 'user-0' : 'user-1',
        loginSessionId: token === 'token-0' ? 'session-0' : 'session-1',
        authMethod: 'password',
        expiresAt: Date.now() + 10000,
        active: true,
      };
    },
  });
  const clients = {
    operator: {
      action: async (fn, args) => {
        calls.push(['operator-action', fn]);
        if (fn === 'provisionCohort') return { slots: [0, 1].map(slot => ({ slot })) };
        if (fn === 'signIn') {
          return { tokens: { token: args.params.email.includes('alpha') ? 'token-0' : 'token-1' } };
        }
        if (fn === 'revokeUsers') return { retainedUsersAndAccounts: true, after: [{ slot: 0, counts: {} }, { slot: 1, counts: {} }] };
        throw new Error('unexpected action');
      },
    },
    authenticated: authed,
  };
  const evidence = await runner.runWithClients({ register, clients, api });
  assert.equal(evidence.status, 'DEVELOPMENT_AUTH_SESSION_QUALIFICATION_EXECUTED');
  assert.equal(evidence.operations.provisioned, 2);
  assert.equal(evidence.operations.signIns, 2);
  assert.equal(evidence.operations.signOuts, 1);
  assert.equal(evidence.operations.revocations, 1);
  assert.equal(evidence.cadUploadAllowed, false);
  assert.equal(evidence.conversionAllowed, false);
});

test('docs remain source-safe and preserve hard stop boundaries', () => {
  for (const [key, value] of Object.entries(packet.preservedBoundaries)) assert.equal(value, false, key);
  assert.match(markdown, /disabled by default/i);
  assert.match(markdown, /does not delete users or accounts/i);
  assert.match(markdown, /authVerifiers.*cadUploadSessions/s);
  assert.doesNotMatch(markdown, /BEGIN PRIVATE KEY/);
  assert.doesNotMatch(markdown, /production CAD ready/i);
  assert.doesNotMatch(binding + bridge + store, /cadUploadAllowed:\s*true|conversionAllowed:\s*true/);
});
