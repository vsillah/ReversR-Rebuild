const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../utils/cadAuthenticatedIgsBrowser.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function loadBrowserClient(location) {
  const module = { exports: {} };
  const storage = new Map();
  const window = { location, sessionStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }, setTimeout };
  const context = vm.createContext({ module, exports: module.exports, window, crypto: webcrypto,
    Response, Blob, URL, console, setTimeout, clearTimeout,
    require: id => {
      if (id === './apiBase') return { getApiBase: () => 'https://reversr.vercel.app' };
      if (id === './cadInternalTesterPreview') {
        return require('../utils/cadInternalTesterPreview');
      }
      throw new Error(`Unexpected import: ${id}`);
    } });
  vm.runInContext(compiled, context, { filename: sourcePath });
  return module.exports;
}

test('browser uploads bind to the exact preview origin and commit the selected bytes', async () => {
  const previous = {
    enabled: process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED,
    environment: process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT,
  };
  process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED = 'true';
  process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT = 'preview';
  try {
    const origin = 'https://reversr-git-live-vsillahs-projects.vercel.app';
    const exported = loadBrowserClient({ hostname: new URL(origin).hostname, origin,
      search: '?cadPreview=authenticated-igs-live-v1' });
    const calls = [];
    const bytes = Buffer.from('SYNTHETIC IGES COMMITMENT');
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/authenticated-upload-session')) {
        return new Response(JSON.stringify({ session: { csrfToken: 's'.repeat(43),
          expiresAt: Date.now() + 60_000 } }), { status: 200,
          headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ message: 'stop after upload request' }), { status: 400,
        headers: { 'content-type': 'application/json' } });
    };
    const client = exported.createCadAuthenticatedIgsBrowserClient({ fetchImpl, storage: null,
      getAuthorizationHeaders: async () => ({ Authorization: 'Bearer synthetic' }) });
    const file = { name: 'fixture.igs', size: bytes.length, type: 'model/iges',
      arrayBuffer: async () => Uint8Array.from(bytes).buffer };
    await assert.rejects(client.upload(file), /stop after upload request/);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, `${origin}/api/cad/authenticated-upload-session`);
    assert.equal(calls[1].url, `${origin}/api/cad/authenticated-import`);
    assert.equal(calls[1].init.headers['X-ReversR-CAD-Content-SHA256'],
      createHash('sha256').update(bytes).digest('hex'));
    assert.ok(calls.every(call => !call.url.startsWith('https://reversr.vercel.app')));

    const production = loadBrowserClient({ hostname: 'reversr.vercel.app',
      origin: 'https://reversr.vercel.app', search: '?cadPreview=authenticated-igs-live-v1' });
    assert.throws(() => production.createCadAuthenticatedIgsBrowserClient({ fetchImpl, storage: null,
      getAuthorizationHeaders: async () => ({}) }), /transport is unavailable/);
  } finally {
    if (previous.enabled === undefined) delete process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED;
    else process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED = previous.enabled;
    if (previous.environment === undefined) delete process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT;
    else process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT = previous.environment;
  }
});
