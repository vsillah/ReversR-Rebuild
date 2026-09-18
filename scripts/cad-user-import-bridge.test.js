const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  CAD_USER_IMPORT_ENABLED,
  CAD_USER_IMPORT_PATH,
  CAD_UPLOAD_SESSION_MAX_LIFETIME_MS,
  createCadUploadSessionAdapter,
  parseCadUploadSessionResponse,
  prepareCadFileMetadata,
  mapCadImportError,
} = require('../utils/cadUserImportBridge');
const csrf = 'c'.repeat(43);
const success = expiresAt => ({ schemaVersion: 1, status: 'success', session: { transport: 'cookie', expiresAt, csrfToken: csrf } });
test('source closed and route compatible, with no client transport or body builder', () => {
  assert.equal(CAD_USER_IMPORT_ENABLED, false);
  assert.equal(CAD_USER_IMPORT_PATH, '/api/cad/user-import');
  const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  assert.match(router, /BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(router, /router.all\('\/user-import'/);
  assert.doesNotMatch(fs.readFileSync('utils/cadUserImportBridge.js', 'utf8'), /fetch\(|XMLHttpRequest|FormData|FileReader/);
  assert.doesNotMatch(fs.readFileSync('components/PhaseOne.tsx', 'utf8'), /uploadSessionAdapter=/);
});
test('strict browser success contract accepts only bounded cookie sessions and never enables upload', () => {
  const now = 1000;
  const result = parseCadUploadSessionResponse(success(now + 60000), { now });
  assert.equal(result.ok, true);
  assert.equal(result.code, 'SESSION_READY');
  assert.equal(result.canSubmit, false);
  assert.deepEqual(result.session, { transport: 'cookie', expiresAt: 61000, csrfToken: csrf });
  assert.equal(Object.isFrozen(result.session), true);
  assert.equal(CAD_USER_IMPORT_ENABLED, false);
});
test('success parser rejects expiry, overlong lifetime, bearer credentials, identity leakage and unknown keys', () => {
  const now = 1000;
  const invalid = [
    success(now),
    success(now + CAD_UPLOAD_SESSION_MAX_LIFETIME_MS + 1),
    { schemaVersion: 1, status: 'success', session: { transport: 'bearer', expiresAt: now + 1, csrfToken: csrf } },
    { schemaVersion: 1, status: 'success', session: { transport: 'cookie', expiresAt: now + 1, csrfToken: 'short' } },
    { ...success(now + 1), credential: 'us1.secret' },
    { schemaVersion: 1, status: 'success', session: { ...success(now + 1).session, userId: 'claimed' } },
    { schemaVersion: 1, status: 'success', session: { ...success(now + 1).session, token: 'secret' } },
  ];
  for (const response of invalid) {
    const result = parseCadUploadSessionResponse(response, { now });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'UNKNOWN');
    assert.equal(result.canSubmit, false);
  }
});
test('injected issuer is called once, receives only a signal and preserves sanitized errors', async () => {
  let calls = 0;
  const adapter = createCadUploadSessionAdapter({ now: () => 1000, issue: async options => {
    calls++;
    assert.deepEqual(Object.keys(options), ['signal']);
    assert.equal(options.signal instanceof AbortSignal, true);
    return success(2000);
  } });
  assert.equal((await adapter.connect()).ok, true);
  assert.equal(calls, 1);
  const denied = await createCadUploadSessionAdapter({ issue: async () => ({ schemaVersion: 1, status: 'error', code: 'USER_UPLOAD_FORBIDDEN', message: 'SECRET' }) }).connect();
  assert.equal(denied.code, 'USER_UPLOAD_FORBIDDEN');
  assert.ok(!denied.message.includes('SECRET'));
});
test('unconfigured, cancelled, timed-out, thrown and malformed issuers fail closed without retry', async () => {
  assert.equal((await createCadUploadSessionAdapter().connect()).code, 'USER_AUTH_UNAVAILABLE');
  const cancelled = new AbortController(); cancelled.abort();
  assert.equal((await createCadUploadSessionAdapter({ issue: async () => success(Date.now() + 1) }).connect({ signal: cancelled.signal })).code, 'UPLOAD_CANCELLED');
  let calls = 0;
  const timedOut = createCadUploadSessionAdapter({ timeoutMs: 1, issue: ({ signal }) => new Promise(resolve => {
    calls++;
    signal.addEventListener('abort', () => resolve(success(Date.now() + 1000)), { once: true });
  }) });
  assert.equal((await timedOut.connect()).code, 'UPLOAD_TIMEOUT');
  assert.equal(calls, 1);
  calls = 0;
  const thrown = createCadUploadSessionAdapter({ issue: async () => { calls++; throw Error('SECRET'); } });
  assert.equal((await thrown.connect()).code, 'USER_AUTH_UNAVAILABLE');
  assert.equal(calls, 1);
  calls = 0;
  const malformed = createCadUploadSessionAdapter({ issue: async () => { calls++; return { schemaVersion: 1, status: 'success' }; } });
  assert.equal((await malformed.connect()).code, 'UNKNOWN');
  assert.equal(calls, 1);
});
test('metadata preparation cannot read body or retain private filename; invalid selection recovers', () => {
  const file = { name: 'synthetic.iges', size: 64 };
  for (const key of ['text', 'arrayBuffer', 'stream', 'slice', 'body']) Object.defineProperty(file, key, { get() { throw Error('Body access prohibited'); } });
  assert.deepEqual(prepareCadFileMetadata(file).metadata, { format: 'IGES', bytes: 64 });
  for (const input of [{ name: 'bad.zip', size: 64 }, { name: 'empty.igs', size: 0 }]) assert.equal(prepareCadFileMetadata(input).metadata, null);
  assert.ok(prepareCadFileMetadata(file).metadata);
});
test('all router errors map to closed recovery; malformed and success responses never grant admission', () => {
  const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  const admission = fs.readFileSync('server/cadUserUploadAdmission.js', 'utf8');
  const codes = [...(router + admission).matchAll(/^  ([A-Z_]+): \[/gm)].map(m => m[1]);
  for (const code of codes) {
    const result = mapCadImportError({ schemaVersion: 1, status: 'error', code, message: 'SECRET' });
    assert.equal(result.code, code); assert.equal(result.canSubmit, false); assert.ok(!result.message.includes('SECRET'));
  }
  for (const response of [null, {}, { schemaVersion: 1, status: 'success' }, { schemaVersion: 2, status: 'error', code: 'USER_SESSION_REQUIRED' }, { schemaVersion: 1, status: 'error', code: '__proto__' }]) {
    assert.equal(mapCadImportError(response).code, 'UNKNOWN');
    assert.equal(mapCadImportError(response).canSubmit, false);
  }
});
