const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const express = require('express');
const { createCadAuthenticatedIgsRouter } = require('../server/cadAuthenticatedIgsRouter');
const { createCadR2PrivateArtifactCustody, AUTHENTICATED_IGS_POLICY }
  = require('../server/cadR2PrivateArtifactCustody');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests }
  = require('../server/uploadSessionStore');
const { upload, meshPayload } = require('../server/cadWorkerContract');

const ORIGIN = 'https://preview.reversr.invalid';
const fixturePath = path.join(__dirname, '../public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS');
const hash = value => createHash('sha256').update(value).digest('hex');
const sameOwner = (left, right) => left.userId === right.userId && left.shopId === right.shopId
  && left.uploadSessionId === right.uploadSessionId;

function createMemoryRuntime() {
  const state = { records: new Map(), objects: new Map(), grants: new Map(), jobs: new Map(),
    idempotency: new Map(), attempts: 0, networkPolicy: null, bodyReads: 0 };
  const sessionGrant = { userId: 'user-preview', shopId: 'shop-preview', loginSessionId: 'login-preview',
    authMethod: 'password', cadUploadAllowed: true, expiresAt: Date.now() + 10 * 60_000 };
  const sessionService = createUploadSessionService({
    store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async context => context?.authorization === 'Bearer commercial-test-token'
      ? sessionGrant : null,
    refreshAuthorization: async binding => binding.loginSessionId === sessionGrant.loginSessionId
      ? sessionGrant : null,
  });
  const provider = {
    async putExact(input) {
      if (state.objects.has(input.objectKey)) return { committed: false };
      state.objects.set(input.objectKey, Buffer.from(input.bytes));
      return { committed: true, byteCount: input.bytes.length, sha256: hash(input.bytes) };
    },
    async getExact(input) {
      const bytes = state.objects.get(input.objectKey);
      return bytes ? { bytes: Buffer.from(bytes) } : null;
    },
    async deleteExact(key) { state.objects.delete(key); return true; },
    async headExact(key) { return state.objects.has(key) ? { byteCount: state.objects.get(key).length } : null; },
  };
  const storeFor = owner => ({
    async reserve(record, policy) {
      assert.equal(policy.maxOriginalBytes, 8 * 1024 * 1024);
      if (state.records.has(record.artifactId)) return false;
      state.records.set(record.artifactId, { ...record }); return true;
    },
    async consumeOperation() { return true; },
    async readForOwner(artifactId, expectedOwner) {
      const record = state.records.get(artifactId);
      return record && sameOwner(record, expectedOwner) ? { ...record } : null;
    },
    async markStored(artifactId, generation, updatedAt) {
      const record = state.records.get(artifactId);
      if (!record || !sameOwner(record, owner) || record.generation !== generation) return false;
      state.records.set(artifactId, { ...record, state: 'stored', generation: generation + 1, updatedAt });
      return true;
    },
    async markUnknown(artifactId, reason, updatedAt) {
      const record = state.records.get(artifactId);
      if (!record) return false;
      state.records.set(artifactId, { ...record, state: 'quarantined',
        generation: record.generation + 1, updatedAt, quarantineReasonDigest: hash(reason) });
      return true;
    },
    async beginDelete(artifactId, expectedOwner, updatedAt) {
      const record = state.records.get(artifactId);
      if (!record || !sameOwner(record, expectedOwner)) return null;
      const deleting = { ...record, state: 'deleting', generation: record.generation + 1, updatedAt };
      state.records.set(artifactId, deleting); return deleting;
    },
    async confirmDeleted(artifactId, generation) {
      const record = state.records.get(artifactId);
      if (!record || record.generation !== generation) return null;
      state.records.delete(artifactId);
      return { deleted: true, tombstoneDigest: hash(`deleted:${artifactId}`) };
    },
    async issueGrant(grantDigest, artifactId, expectedOwner, artifactGeneration, issuedAt, expiresAt) {
      const record = state.records.get(artifactId);
      if (!record || !sameOwner(record, expectedOwner) || record.generation !== artifactGeneration) return false;
      state.grants.set(grantDigest, { artifactId, owner: expectedOwner, issuedAt, expiresAt, consumed: false });
      return true;
    },
    async resolveGrant(grantDigest, expectedOwner, at) {
      const grant = state.grants.get(grantDigest);
      if (!grant || grant.consumed || grant.expiresAt <= at || !sameOwner(grant.owner, expectedOwner)) return null;
      grant.consumed = true;
      const record = state.records.get(grant.artifactId);
      return record ? { ...record } : null;
    },
  });
  let occtPromise;
  const executor = {
    async convert(body) {
      state.attempts += 1;
      state.networkPolicy = 'deny-all';
      const source = upload(body);
      const occt = await (occtPromise ||= require('occt-import-js')());
      const converted = occt.ReadIgesFile(source.bytes, { linearUnit: 'millimeter',
        linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 });
      assert.equal(converted.success, true);
      const meshes = converted.meshes.map(mesh => ({
        positions: Array.from(mesh.attributes.position.array), indices: Array.from(mesh.index.array),
      }));
      return { schemaVersion: 1, status: 'ready', source: { sha256: source.sha256,
        bytes: source.bytes.length, format: 'iges' }, ...meshPayload(meshes),
      execution: { boundary: 'offline-test-substitute', cleanup: 'stopped', networkPolicy: 'deny-all' } };
    },
    activeCount: () => 0,
    cleanupBlocked: () => false,
  };
  const job = {
    async claim(owner, input) {
      const priorId = state.idempotency.get(input.idempotencyDigest);
      if (priorId) return { accepted: true, duplicate: true, job: state.jobs.get(priorId).view() };
      const record = { ...input, owner, state: 'admitted', attemptCount: 0, createdAt: Date.now(),
        updatedAt: Date.now() };
      record.view = () => ({ schemaVersion: 1, jobId: input.jobId, state: record.state,
        extension: input.extension, byteCount: input.contentLength, attemptCount: record.attemptCount,
        createdAt: record.createdAt, updatedAt: record.updatedAt,
        ...(record.state === 'ready' ? { artifacts: { original: true, preview: true, stl: true } } : {}) });
      state.jobs.set(input.jobId, record); state.idempotency.set(input.idempotencyDigest, input.jobId);
      return { accepted: true, duplicate: false, job: record.view() };
    },
    async attachOriginal(owner, jobId, artifactId) {
      const record = state.jobs.get(jobId); if (!record || !sameOwner(record.owner, owner)) return false;
      record.originalArtifactId = artifactId; return true;
    },
    async claimConversion(owner, jobId) {
      const record = state.jobs.get(jobId);
      if (!record || !sameOwner(record.owner, owner) || record.state !== 'admitted'
        || record.attemptCount !== 0) return { accepted: false, code: 'CONVERSION_ALREADY_CLAIMED' };
      record.state = 'converting'; record.attemptCount = 1; record.updatedAt = Date.now();
      return { accepted: true, job: record.view() };
    },
    async complete(owner, jobId, result) {
      const record = state.jobs.get(jobId); if (!record || !sameOwner(record.owner, owner)) return false;
      Object.assign(record, result, { state: 'ready', updatedAt: Date.now() }); return true;
    },
    async fail(owner, jobId, code, quarantined) {
      const record = state.jobs.get(jobId); if (!record || !sameOwner(record.owner, owner)) return false;
      record.state = quarantined ? 'quarantined' : 'failed'; record.code = code; return true;
    },
    async read(sessionId, jobId) {
      const record = state.jobs.get(jobId);
      return record && record.owner.uploadSessionId === sessionId ? record.view() : null;
    },
    async latest(sessionId) {
      return [...state.jobs.values()].reverse().find(record => record.owner.uploadSessionId === sessionId)?.view() || null;
    },
    async artifacts(sessionId, jobId) {
      const record = state.jobs.get(jobId);
      return record && record.owner.uploadSessionId === sessionId ? { job: record.view(), owner: record.owner,
        artifactIds: {
          original: state.records.has(record.originalArtifactId) ? record.originalArtifactId : null,
          preview: state.records.has(record.previewArtifactId) ? record.previewArtifactId : null,
          stl: state.records.has(record.stlArtifactId) ? record.stlArtifactId : null,
        } } : null;
    },
    async deleted(sessionId, jobId) {
      const record = state.jobs.get(jobId); if (!record || record.owner.uploadSessionId !== sessionId) return false;
      record.state = 'deleted'; return true;
    },
  };
  return { configured: true, allowedOrigins: [ORIGIN], sessionService, job, executor, state,
    createCustody(owner) { return createCadR2PrivateArtifactCustody({ enabled: true, provider,
      runtimeEnabled: true, store: storeFor(owner), policy: AUTHENTICATED_IGS_POLICY }); } };
}

async function mounted(t) {
  const runtime = createMemoryRuntime();
  const app = express();
  app.use((req, _res, next) => {
    const original = req.on;
    req.on = function instrument(event, ...args) {
      if (event === 'data' || event === 'readable') runtime.state.bodyReads += 1;
      return original.call(this, event, ...args);
    };
    next();
  });
  app.use('/api/cad', createCadAuthenticatedIgsRouter({ runtime }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { runtime, base: `http://127.0.0.1:${server.address().port}/api/cad` };
}

async function issue(base) {
  const response = await fetch(`${base}/authenticated-upload-session`, { method: 'POST', headers: {
    origin: ORIGIN, authorization: 'Bearer commercial-test-token',
  } });
  assert.equal(response.status, 200);
  const body = await response.json();
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: body.session.csrfToken };
}

test('denied requests never subscribe to private bytes and duplicate credentials fail closed', async t => {
  const { runtime, base } = await mounted(t);
  const source = fs.readFileSync(fixturePath);
  const missing = await fetch(`${base}/authenticated-import`, { method: 'POST', headers: {
    origin: ORIGIN, 'content-type': 'model/iges', 'content-length': String(source.length),
    'x-reversr-cad-extension': 'igs', 'x-reversr-idempotency-key': 'a'.repeat(32),
  }, body: source });
  assert.equal(missing.status, 401);
  assert.equal(runtime.state.bodyReads, 0);
  assert.equal(runtime.state.attempts, 0);
  const auth = await issue(base);
  const duplicateCredentials = await fetch(`${base}/authenticated-import`, { method: 'POST', headers: {
    origin: ORIGIN, cookie: auth.cookie, authorization: 'Bearer commercial-test-token',
    'x-upload-csrf': auth.csrf, 'content-type': 'model/iges',
    'content-length': String(source.length), 'x-reversr-cad-extension': 'igs',
    'x-reversr-idempotency-key': 'd'.repeat(32),
  }, body: source });
  assert.equal(duplicateCredentials.status, 401);
  assert.equal(runtime.state.bodyReads, 0);
  const noCsrf = await fetch(`${base}/authenticated-import`, { method: 'POST', headers: {
    origin: ORIGIN, cookie: auth.cookie, 'content-type': 'model/iges',
    'content-length': String(source.length), 'x-reversr-cad-extension': 'igs',
    'x-reversr-idempotency-key': 'b'.repeat(32),
  }, body: source });
  assert.equal(noCsrf.status, 403);
  assert.equal(runtime.state.bodyReads, 0);
  assert.equal(runtime.state.jobs.size, 0);
  const unsupportedMethod = await fetch(`${base}/authenticated-import`, { method: 'PUT', headers: {
    origin: ORIGIN, cookie: auth.cookie, 'x-upload-csrf': auth.csrf,
    'content-type': 'model/iges', 'content-length': String(source.length),
  }, body: source });
  assert.equal(unsupportedMethod.status, 405);
  assert.equal(runtime.state.bodyReads, 0);
});

test('mounted preview route converts the public dispenser fixture once and serves owner grants offline', async t => {
  const before = fs.readFileSync(fixturePath);
  const beforeDigest = hash(before);
  const { runtime, base } = await mounted(t);
  const auth = await issue(base);
  const uploadResponse = await fetch(`${base}/authenticated-import`, { method: 'POST', headers: {
    origin: ORIGIN, cookie: auth.cookie, 'x-upload-csrf': auth.csrf,
    'content-type': 'model/iges', 'content-length': String(before.length),
    'x-reversr-cad-extension': 'igs', 'x-reversr-idempotency-key': 'c'.repeat(32),
  }, body: before });
  const uploaded = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, JSON.stringify(uploaded));
  assert.equal(uploaded.job.state, 'ready');
  assert.equal(uploaded.job.attemptCount, 1);
  assert.equal(runtime.state.attempts, 1);
  assert.equal(runtime.state.networkPolicy, 'deny-all');
  assert.ok(runtime.state.bodyReads > 0);
  const headers = { origin: ORIGIN, cookie: auth.cookie, 'x-upload-csrf': auth.csrf };
  const originalGrantResponse = await fetch(
    `${base}/authenticated-import/${uploaded.job.jobId}/grants/original`,
    { method: 'POST', headers },
  );
  const originalGrant = await originalGrantResponse.json();
  assert.equal(originalGrantResponse.status, 200, JSON.stringify(originalGrant));
  const crossKind = await fetch(
    `${base}/authenticated-artifacts/${uploaded.job.jobId}/preview`,
    { headers: { ...headers, 'x-reversr-download-grant': originalGrant.grant.token } },
  );
  assert.equal(crossKind.status, 403);
  const readArtifact = async kind => {
    const grantResponse = await fetch(`${base}/authenticated-import/${uploaded.job.jobId}/grants/${kind}`,
      { method: 'POST', headers });
    const grant = await grantResponse.json();
    assert.equal(grantResponse.status, 200, JSON.stringify(grant));
    const response = await fetch(`${base}${grant.grant.url.replace('/api/cad', '')}`, { headers: {
      ...headers, 'x-reversr-download-grant': grant.grant.token,
    } });
    assert.equal(response.status, 200);
    return Buffer.from(await response.arrayBuffer());
  };
  const preview = JSON.parse((await readArtifact('preview')).toString('utf8'));
  assert.equal(preview.format, 'reversr-inspection-mesh-v1');
  assert.ok(preview.meshes.length > 0 && preview.vertexCount > 0 && preview.triangleCount > 0);
  const stl = await readArtifact('stl');
  assert.ok(stl.length > 100 && stl.toString('utf8', 0, 5) === 'solid');
  assert.deepEqual(await readArtifact('original'), before);
  const after = fs.readFileSync(fixturePath);
  assert.equal(hash(after), beforeDigest);
  assert.equal(after.length, before.length);
  const deletion = await fetch(`${base}/authenticated-import/${uploaded.job.jobId}`, {
    method: 'DELETE', headers,
  });
  assert.equal(deletion.status, 200);
  assert.equal(runtime.state.objects.size, 0);
  assert.equal(runtime.state.records.size, 0);
  const repeatedDeletion = await fetch(`${base}/authenticated-import/${uploaded.job.jobId}`, {
    method: 'DELETE', headers,
  });
  assert.equal(repeatedDeletion.status, 200);
});
