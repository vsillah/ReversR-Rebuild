const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { inspectLiveReadiness } = require('../offline/cad-convex/liveReadiness');
const packet = () => JSON.parse(fs.readFileSync(require.resolve('../offline/cad-convex/liveReadiness.json'), 'utf8'));
test('valid source worksheet never grants live or upload authority, even with exact local routes', () => {
  const p = packet();
  for (const configured of [false, true]) {
    if (configured) Object.assign(p, { appOrigin: 'http://127.0.0.1:4317', returnPath: '/auth/complete', logoutPath: '/signed-out' });
    assert.deepEqual(inspectLiveReadiness(p), { code: 'SOURCE_PACKET_VALID_LIVE_BLOCKED',
      packetValid: true, liveAuthReady: false, uploadsEnabled: false });
  }
});
test('rejects destination drift, activation, redirects, public credentials and accidental secret values', () => {
  const changes = [p => p.target.type = 'production', p => p.target.deployment = 'other',
    p => p.target.clientOrigin = p.target.issuerOrigin, p => p.target.teamId = 'other',
    p => p.gates.liveTest = true, p => p.gates.uploads = true,
    p => p.environment[0].value = 'SECRET_SENTINEL',
    p => p.environment[0].name = 'EXPO_PUBLIC_JWT_PRIVATE_KEY',
    p => p.environment[0].scope = 'all-branches', p => p.environment.push(p.environment[0]),
    p => p.environment[0] = p.environment[1], p => p.mode = 'live',
    p => p.appOrigin = 'https://*.invalid', p => p.appOrigin = 'https://*.example.com', p => p.appOrigin = 'https://production.example.com',
    p => p.appOrigin = 'http://127.0.0.1', p => p.appOrigin = 'http://user:pass@127.0.0.1:4317',
    p => p.returnPath = '//outside.invalid', p => p.logoutPath = '/done?token=SECRET_SENTINEL',
    p => p.returnPath = '/%2foutside', p => p.environment = null];
  for (const change of changes) {
    const p = packet(); change(p);
    const result = inspectLiveReadiness(p);
    assert.equal(result.packetValid, false); assert.equal(result.liveAuthReady, false);
    assert.doesNotMatch(JSON.stringify(result), /SECRET_SENTINEL/);
  }
  assert.equal(inspectLiveReadiness(null).packetValid, false);
});
test('actual runtime exact-session reader denies before database access with absent or populated env', async () => {
  const source = fs.readFileSync(require.resolve('../convex/librarySession.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const env of [{}, { JWT_PRIVATE_KEY: 'synthetic', JWKS: 'synthetic', CONVEX_SITE_URL: 'https://issuer.invalid' }]) {
    const exports = {};
    vm.runInNewContext(compiled, { exports, process: { env }, require: name => {
      if (name === './developmentAuth') return { developmentAuthReviewed: false };
      if (name === '@convex-dev/auth/server') return {
        getAuthUserId: () => { throw Error('UNEXPECTED_AUTH_READ'); },
        getAuthSessionId: () => { throw Error('UNEXPECTED_AUTH_READ'); },
      };
      throw Error('UNEXPECTED_DEPENDENCY');
    } });
    let reads = 0;
    await assert.rejects(exports.readExactLibrarySession({ db: { get() { reads++; } } }, 'synthetic-session'), /^Error: AUTH_UNAVAILABLE$/);
    assert.equal(reads, 0);
  }
});
