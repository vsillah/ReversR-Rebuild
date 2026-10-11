const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createCadAuthenticatedIgsDurableClient, readConfig: readDurableConfig }
  = require('../server/cadAuthenticatedIgsDurableClient');
const { R2_JURISDICTION, R2_PROVIDER_PHASE_BUDGET_MS, classifyR2Error,
  createCadR2S3Provider, r2Endpoint }
  = require('../server/cadR2S3Provider');
const { createCadAuthenticatedIgsSandboxExecutor }
  = require('../server/cadAuthenticatedIgsSandboxExecutor');
const { authenticatedAssets, SANDBOX_LIMITS }
  = require('../server/cadAuthenticatedIgsSandboxConfig');
const { AUTHENTICATED_IGS_POLICY } = require('../server/cadR2PrivateArtifactCustody');
const { LIMITS } = require('../server/cadAuthenticatedIgsWorkerContract');
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

test('R2 adapter separates write and acknowledgement budgets with privacy-safe failures', async () => {
  assert.equal(R2_PROVIDER_PHASE_BUDGET_MS, 15 * 1000);
  assert.equal(R2_JURISDICTION, 'us');
  assert.equal(r2Endpoint('a'.repeat(32)),
    `https://${'a'.repeat(32)}.us.r2.cloudflarestorage.com`);
  const signals = [];
  const client = { async send(command, options) {
    signals.push({ name: command.constructor.name, signal: options.abortSignal });
    if (command.constructor.name === 'PutObjectCommand') return {};
    if (command.constructor.name === 'HeadObjectCommand') {
      return { ContentLength: 3, Metadata: { sha256: hash(Buffer.from('igs')) } };
    }
    throw new Error('unexpected command');
  } };
  const provider = createCadR2S3Provider({ env: { CAD_R2_BUCKET: 'private-cad-fixtures' }, client });
  assert.deepEqual(await provider.putExact({ objectKey: `phase5/${'b'.repeat(64)}`,
    bytes: Buffer.from('igs'), contentType: 'model/iges', storageClass: 'STANDARD',
    ifNoneMatch: '*', cacheControl: 'no-store' }), {
    committed: true, byteCount: 3, sha256: hash(Buffer.from('igs')),
  });
  assert.deepEqual(signals.map(call => call.name), ['PutObjectCommand', 'HeadObjectCommand']);
  assert.notEqual(signals[0].signal, signals[1].signal);

  assert.equal(classifyR2Error({ name: 'AccessDenied', $metadata: { httpStatusCode: 403 } }),
    'R2_AUTH_REJECTED');
  assert.equal(classifyR2Error({ name: 'SignatureDoesNotMatch' }), 'R2_AUTH_REJECTED');
  assert.equal(classifyR2Error({ name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 } }),
    'R2_TARGET_MISMATCH');
  assert.equal(classifyR2Error({ name: 'NotFound', $metadata: { httpStatusCode: 404 } }),
    'R2_OBJECT_ABSENT');
  assert.equal(classifyR2Error({ name: 'Error', code: 'ENOTFOUND' }), 'R2_NETWORK_UNAVAILABLE');
  assert.equal(classifyR2Error({ name: 'TimeoutError', code: 'ETIMEDOUT' }), 'R2_TIMEOUT');
});

test('R2 adapter consumes a GET response body before aborting its request signal', async () => {
  const bytes = Buffer.from('streamed private synthetic CAD bytes');
  let getSignal;
  const client = { async send(command, options) {
    if (command.constructor.name !== 'GetObjectCommand') throw new Error('unexpected command');
    getSignal = options.abortSignal;
    return { Body: { async transformToByteArray() {
      await Promise.resolve();
      if (getSignal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      return Uint8Array.from(bytes);
    } } };
  } };
  const provider = createCadR2S3Provider({ env: { CAD_R2_BUCKET: 'private-cad-fixtures' }, client });
  const result = await provider.getExact({ objectKey: `phase5/${'d'.repeat(64)}`,
    expectedBytes: bytes.length, expectedSha256: hash(bytes) });
  assert.deepEqual(result.bytes, bytes);
  assert.equal(getSignal.aborted, true);
});

test('R2 adapter never treats a missing bucket as an absent object', async () => {
  const client = { async send() {
    throw Object.assign(new Error('private provider detail'), {
      name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 },
    });
  } };
  const provider = createCadR2S3Provider({ env: { CAD_R2_BUCKET: 'private-cad-fixtures' }, client });
  await assert.rejects(provider.headExact(`phase5/${'c'.repeat(64)}`),
    error => error.name === 'NoSuchBucket');
});

test('authenticated source and derived retention never exceed the one-day R2 lifecycle backstop', () => {
  const day = 24 * 60 * 60 * 1000;
  assert.equal(AUTHENTICATED_IGS_POLICY.lifecycleBackstopMs, day);
  assert.ok(AUTHENTICATED_IGS_POLICY.originalRetentionMs <= day);
  assert.ok(AUTHENTICATED_IGS_POLICY.derivedRetentionMs <= day);
});

test('authenticated asset pack keeps the 8 MiB contract inside one deny-all Sandbox dispatch', async () => {
  assert.equal(LIMITS.inputBytes, 8 * 1024 * 1024);
  const pack = authenticatedAssets();
  const paths = pack.map(file => file.path);
  for (const expected of ['/vercel/sandbox/runner.js',
    '/vercel/sandbox/cadAuthenticatedIgsWorkerContract.js',
    '/vercel/utils/cadAuthenticatedIgesAdmission.js']) assert.ok(paths.includes(expected));
  assert.ok(pack.reduce((total, file) => total + file.content.length, 0)
    < SANDBOX_LIMITS.assetBytes);

  const fixture = fs.readFileSync(path.join(__dirname,
    '../public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS'));
  const calls = [];
  let sourceBytes;
  const sandbox = { persistent: false, vcpus: 1, memory: 2048,
    timeout: SANDBOX_LIMITS.lifetimeMs, networkPolicy: 'deny-all',
    async writeFiles(files) {
      calls.push('write');
      sourceBytes = Buffer.from(files.find(file => file.path.endsWith('/source.bin')).content);
    },
    async runCommand() { calls.push('run'); return { exitCode: 0 }; },
    async readFileToBuffer() {
      calls.push('read');
      return Buffer.from(JSON.stringify({ status: 'ready', sourceSha256: hash(sourceBytes),
        guestMemoryBytes: 1024 * 1024, meshes: [{
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2],
        }] }));
    },
    async stop() { calls.push('stop'); return { status: 'stopped' }; },
  };
  let creations = 0;
  const executor = createCadAuthenticatedIgsSandboxExecutor({
    create: async options => {
      creations += 1;
      assert.equal(options.networkPolicy, 'deny-all');
      assert.equal(options.persistent, false);
      assert.equal(options.resources.vcpus, 1);
      return sandbox;
    },
  });
  const result = await executor.convert({ fileName: 'Dispenser.IGS',
    contentBase64: fixture.toString('base64') });
  assert.equal(result.status, 'ready');
  assert.equal(creations, 1);
  assert.deepEqual(calls, ['write', 'run', 'read', 'stop']);
  assert.equal(executor.activeCount(), 0);
  assert.equal(executor.cleanupBlocked(), false);
});
