// Offline source execution only: VM dependencies and database are strict local fakes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const review = require('../offline/cad-convex/removalRetentionReview.json');
const { createSyntheticRemovalBoundary } = require('../offline/cad-convex/syntheticRemovalBoundary');
const sdk = path.resolve(__dirname, '../node_modules/@convex-dev/auth');
const read = name => fs.readFileSync(path.join(sdk, name), 'utf8');

test('reviewed SDK lifecycle files match installed package and lockfile exactly', () => {
  assert.equal(review.sdkVersion, '0.0.95');
  assert.equal(JSON.parse(read('package.json')).version, review.sdkVersion);
  assert.equal(require('../package.json').dependencies['@convex-dev/auth'], review.sdkVersion);
  assert.equal(require('../package-lock.json').packages['node_modules/@convex-dev/auth'].version, review.sdkVersion);
  assert.equal(Object.keys(review.sdkFiles).length, 11);
  for (const [name, hash] of Object.entries(review.sdkFiles))
    assert.equal(crypto.createHash('sha256').update(read(name)).digest('hex'), hash, 'SDK_REVIEW_REQUIRED: ' + name);
  for (const file of ['src/server/index.ts', 'dist/server/index.js']) {
    assert.doesNotMatch(read(file), /(?:remove|delete)(?:User|Account)/);
    assert.match(read(file), /invalidateSessions/);
  }
});

test('retention recommendations and forged approvals cannot grant removal or provisioning', () => {
  assert.equal(review.decision, 'KEEP_PROVISIONING_BLOCKED');
  for (const key of ['supportedUserRemoval', 'liveReady', 'retentionApproved']) assert.equal(review[key], false);
  assert.deepEqual(Object.keys(review.alternatives).sort(), ['bounded-quarantine', 'disposable-resource-retirement', 'supported-removal-adapter']);
  for (const alternative of Object.values(review.alternatives)) assert.deepEqual(alternative, { enabled: false, approved: false });
  for (const mode of ['pinned-sdk', 'retention-approved', ...Object.keys(review.alternatives)]) {
    const boundary = createSyntheticRemovalBoundary({ testOnly: true, mode,
      retentionApproved: true, supportedRemoval: true, liveReady: true });
    assert.equal(boundary.inspect().supportedRemoval, false);
    assert.equal(boundary.inspect().retentionOverride, false);
    assert.equal(boundary.inspect().liveReady, false);
    assert.throws(() => boundary.requireProvisioning(), /REMOVAL_UNAVAILABLE/);
    assert.throws(() => boundary.requireRemoval(), /REMOVAL_UNAVAILABLE/);
  }
  assert.equal(createSyntheticRemovalBoundary({ testOnly: true, mode: 'offline-fixture' }).inspect().liveReady, false);
});

function load(name, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('src/server/implementation/' + name + '.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: key => {
    if (!Object.hasOwn(dependencies, key)) throw Error('FORBIDDEN_SDK_DEPENDENCY');
    return dependencies[key];
  } });
  return exports;
}
function lifecycle() {
  const utils = { LOG_LEVELS: { DEBUG: 0 }, logWithLevel() {}, TOKEN_SUB_CLAIM_DIVIDER: '|' };
  const refresh = load('refreshTokens', { './utils.js': utils });
  const sessions = load('sessions', { './utils.js': utils, './tokens.js': {}, './refreshTokens.js': refresh });
  const v = { id: () => ({}), array: () => ({}), optional: () => ({}), object: () => ({}) };
  const revoke = load('mutations/invalidateSessions', { 'convex/values': { v }, '../sessions.js': sessions, '../utils.js': utils });
  const logout = load('mutations/signOut', { '../sessions.js': sessions });
  const tables = {
    users: [{ _id: 'u1' }, { _id: 'u2' }],
    authAccounts: [{ _id: 'a1', userId: 'u1' }],
    authSessions: [{ _id: 's1', userId: 'u1' }, { _id: 's2', userId: 'u1' }, { _id: 's3', userId: 'u2' }],
    authRefreshTokens: [{ _id: 'r1', sessionId: 's1' }, { _id: 'r2', sessionId: 's2' }, { _id: 'r3', sessionId: 's3' }],
    authVerificationCodes: [{ _id: 'c1', accountId: 'a1' }],
    authVerifiers: [{ _id: 'v1', sessionId: 's1' }],
    authRateLimits: [{ _id: 'l1', identifier: 'a1' }],
  };
  const ctx = { auth: { getUserIdentity: async () => ({ subject: 'u1|s1' }) }, db: {
    get: async id => Object.values(tables).flat().find(row => row._id === id) ?? null,
    delete: async id => {
      const table = Object.keys(tables).find(key => tables[key].some(row => row._id === id));
      assert.ok(['authSessions', 'authRefreshTokens'].includes(table));
      tables[table] = tables[table].filter(row => row._id !== id);
    },
    query: table => ({ withIndex: (index, select) => {
      assert.equal(index, table === 'authSessions' ? 'userId' : 'sessionIdAndParentRefreshTokenId');
      const terms = []; const q = { eq: (key, value) => { terms.push([key, value]); return q; } }; select(q);
      return { collect: async () => tables[table].filter(row => terms.every(([key, value]) => row[key] === value)) };
    } }),
  } };
  return { revoke, logout, ctx, tables };
}

test('actual pinned invalidation deletes user sessions and refresh tokens, retaining account graph', async () => {
  const f = lifecycle();
  const retained = JSON.stringify(Object.fromEntries(Object.entries(f.tables).filter(([key]) => !['authSessions', 'authRefreshTokens'].includes(key))));
  await f.revoke.invalidateSessionsImpl(f.ctx, { userId: 'u1' });
  assert.deepEqual(f.tables.authSessions.map(r => r._id), ['s3']);
  assert.deepEqual(f.tables.authRefreshTokens.map(r => r._id), ['r3']);
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.tables).filter(([key]) => !['authSessions', 'authRefreshTokens'].includes(key)))), retained);
});

test('actual pinned signOut removes only current session; repeated absence is not user cleanup', async () => {
  const f = lifecycle();
  await f.logout.signOutImpl(f.ctx);
  assert.deepEqual(f.tables.authSessions.map(r => r._id), ['s2', 's3']);
  assert.deepEqual(f.tables.authRefreshTokens.map(r => r._id), ['r2', 'r3']);
  assert.equal(await f.logout.signOutImpl(f.ctx), null);
  assert.equal(f.tables.users.length, 2); assert.equal(f.tables.authAccounts.length, 1);
});
