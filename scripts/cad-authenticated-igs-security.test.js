const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const { createCadAuthenticatedIgsDurableClient, readConfig: readDurableConfig }
  = require('../server/cadAuthenticatedIgsDurableClient');
const { createCadR2S3Provider } = require('../server/cadR2S3Provider');
const { inspectAuthenticatedIgsPreview } = require('../utils/cadInternalTesterPreview');

const hash = value => createHash('sha256').update(value).digest('hex');
const durableEnvironment = overrides => ({
  CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED: 'true',
  CAD_AUTHENTICATED_IGS_ENVIRONMENT: 'development',
  CAD_AUTHENTICATED_IGS_SERVICE_TOKEN: 't'.repeat(43),
  CAD_AUTHENTICATED_IGS_ALLOWED_ORIGINS: 'http://localhost:5001',
  COMMERCIAL_BACKEND: 'convex',
  COMMERCIAL_CONVEX_URL: 'https://commercial-synthetic.convex.cloud',
  COMMERCIAL_CONVEX_ISSUER: 'https://commercial-synthetic.convex.site',
  NODE_ENV: 'development',
  ...overrides,
});

test('server and browser feature gates allow only development or a Vercel preview, never production', () => {
  assert.equal(readDurableConfig(durableEnvironment()).environment, 'development');
  assert.equal(readDurableConfig(durableEnvironment({ NODE_ENV: 'production' })), null);
  assert.equal(readDurableConfig(durableEnvironment({
    CAD_AUTHENTICATED_IGS_ENVIRONMENT: 'preview', NODE_ENV: 'production', VERCEL_ENV: 'preview',
    CAD_AUTHENTICATED_IGS_ALLOWED_ORIGINS: 'https://reversr-feature.vercel.app',
  })).environment, 'preview');
  assert.equal(readDurableConfig(durableEnvironment({
    CAD_AUTHENTICATED_IGS_ENVIRONMENT: 'preview', NODE_ENV: 'production', VERCEL_ENV: 'production',
    CAD_AUTHENTICATED_IGS_ALLOWED_ORIGINS: 'https://reversr-feature.vercel.app',
  })), null);
  assert.equal(readDurableConfig(durableEnvironment({
    CAD_AUTHENTICATED_IGS_ENVIRONMENT: 'preview', NODE_ENV: 'production', VERCEL_ENV: 'preview',
    CAD_AUTHENTICATED_IGS_ALLOWED_ORIGINS: 'https://reversr.vercel.app',
  })), null);

  const previous = {
    enabled: process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED,
    environment: process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT,
  };
  process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED = 'true';
  process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT = 'preview';
  try {
    const search = '?cadPreview=authenticated-igs-live-v1';
    assert.equal(inspectAuthenticatedIgsPreview({ hostname: 'reversr-feature.vercel.app', search }).enabled, true);
    assert.equal(inspectAuthenticatedIgsPreview({ hostname: 'reversr.vercel.app', search }).enabled, false);
    assert.equal(inspectAuthenticatedIgsPreview({ hostname: 'REVERSR.VERCEL.APP', search }).enabled, false);
  } finally {
    if (previous.enabled === undefined) delete process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED;
    else process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_PREVIEW_ENABLED = previous.enabled;
    if (previous.environment === undefined) delete process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT;
    else process.env.EXPO_PUBLIC_CAD_AUTHENTICATED_IGS_ENVIRONMENT = previous.environment;
  }
});

test('login and CAD entitlement denials stay distinct and sanitized at the durable authority edge', async () => {
  const clientFor = code => createCadAuthenticatedIgsDurableClient({ env: durableEnvironment(),
    fetchImpl: async () => { throw new Error('unused'); }, userClientFactory: () => ({
      setAuth() {}, async mutation() { throw { data: code }; }, async close() {},
    }) });
  assert.deepEqual(await clientFor('LOGIN_REQUIRED').authorize('Bearer token'),
    { ok: false, code: 'AUTHORIZATION_REQUIRED' });
  assert.deepEqual(await clientFor('CAD_ENTITLEMENT_REQUIRED').authorize('Bearer token'),
    { ok: false, code: 'CAD_PERMISSION_REQUIRED' });
  assert.deepEqual(await clientFor('ACCOUNT_REQUIRED').authorize('Bearer token'),
    { ok: false, code: 'CAD_PERMISSION_REQUIRED' });
});

test('R2 adapter uses private conditional writes, verifies bytes, and confirms deletion offline', async () => {
  const state = { bytes: null, sha256: null, calls: [] };
  const client = { async send(command) {
    state.calls.push({ name: command.constructor.name, input: command.input });
    if (command.constructor.name === 'PutObjectCommand') {
      state.bytes = Buffer.from(command.input.Body); state.sha256 = command.input.Metadata.sha256;
      return {};
    }
    if (command.constructor.name === 'GetObjectCommand') {
      return { Body: { transformToByteArray: async () => Uint8Array.from(state.bytes) } };
    }
    if (command.constructor.name === 'DeleteObjectCommand') { state.bytes = null; return {}; }
    if (command.constructor.name === 'HeadObjectCommand') {
      if (!state.bytes) throw Object.assign(new Error('missing'), { name: 'NotFound' });
      return { ContentLength: state.bytes.length, Metadata: { sha256: state.sha256 } };
    }
    throw new Error('unexpected command');
  } };
  const provider = createCadR2S3Provider({ env: { CAD_R2_BUCKET: 'private-cad-fixtures' }, client });
  const bytes = Buffer.from('private synthetic CAD bytes');
  const committed = await provider.putExact({ objectKey: `phase5/${'a'.repeat(64)}`, bytes,
    contentType: 'model/iges', storageClass: 'STANDARD', ifNoneMatch: '*', cacheControl: 'no-store' });
  assert.deepEqual(committed, { committed: true, byteCount: bytes.length, sha256: hash(bytes) });
  const put = state.calls.find(call => call.name === 'PutObjectCommand').input;
  assert.equal(put.IfNoneMatch, '*');
  assert.equal(put.CacheControl, 'no-store');
  assert.equal(put.ContentLength, bytes.length);
  assert.deepEqual((await provider.getExact({ objectKey: put.Key, expectedBytes: bytes.length,
    expectedSha256: hash(bytes) })).bytes, bytes);
  assert.equal(await provider.deleteExact(put.Key), true);
  assert.equal(await provider.headExact(put.Key), null);
});
