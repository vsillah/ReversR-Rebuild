const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { Readable } = require('node:stream');
const { once } = require('node:events');
const express = require('express');
const { validatePayload, validateRequestBody } = require('../server/cadUserUploadAdmission');
const { LIMITS } = require('../server/cadWorkerContract');
const { createUploadSessionService, createInMemoryUploadSessionStoreForTests } = require('../server/uploadSessionStore');
const row = (section, text = '') => text.padEnd(72, ' ') + section + '      1';
const payload = (entity = 110) => ({ fileName: 'synthetic.igs', mimeType: 'model/iges', contentBase64:
  Buffer.from([row('S'), row('G'), row('D', String(entity).padStart(8)), row('D'), row('P'), row('T')].join('\n')).toString('base64') });
const stream = (chunks, headers = {}) => Object.assign(Readable.from(chunks), { headers: { 'content-type': 'application/json', ...headers } });

test('strict three-field admission rejects unsafe and non-IGES input without returning content', () => {
  for (const mimeType of ['model/iges', 'application/iges', 'application/octet-stream'])
    assert.deepEqual(validatePayload({ ...payload(), mimeType }), { ok: true });
  const cases = [null, [], {}, { ...payload(), extra: 'SENTINEL' },
    ...['../secret.igs', '/private.igs', 'a\\b.igs', 'a\u0000.igs', 'x'.repeat(121)].map(fileName => ({ ...payload(), fileName })),
    ...['', '%%%%', 'Zh==', 'Zg==\n', Buffer.from('SENTINEL').toString('base64')].map(contentBase64 => ({ ...payload(), contentBase64 }))];
  for (const body of cases) assert.equal(validatePayload(body).code, 'UPLOAD_MALFORMED');
  for (const body of [payload(416), { ...payload(), mimeType: 'image/png' }, { ...payload(), fileName: 'x.step' }])
    assert.equal(validatePayload(body).code, 'UPLOAD_UNSUPPORTED');
  for (const contentBase64 of ['A'.repeat(Math.ceil(LIMITS.inputBytes / 3) * 4 + 4), Buffer.alloc(LIMITS.inputBytes + 1, 65).toString('base64')])
    assert.equal(validatePayload({ ...payload(), contentBase64 }).code, 'UPLOAD_TOO_LARGE');
});

test('streaming limits cover chunked bodies, dishonest lengths, UTF-8 and malformed JSON', async () => {
  const valid = Buffer.from(JSON.stringify(payload()));
  assert.deepEqual(await validateRequestBody(stream([valid.subarray(0, 11), valid.subarray(11)])), { ok: true });
  assert.deepEqual(await validateRequestBody(stream([valid], { 'content-length': String(valid.length) })), { ok: true });
  const boundary = Buffer.concat([valid, Buffer.alloc(LIMITS.jsonBytes - valid.length, 32)]);
  assert.deepEqual(await validateRequestBody(stream([boundary])), { ok: true });
  for (const headers of [{}, { 'content-length': '1' }])
    assert.equal((await validateRequestBody(stream([boundary, Buffer.from(' ')], headers))).code, 'UPLOAD_TOO_LARGE');
  for (const bytes of [Buffer.from('{SENTINEL'), Buffer.from([0xff]), Buffer.alloc(0)])
    assert.equal((await validateRequestBody(stream([bytes]))).code, 'UPLOAD_MALFORMED');
  assert.equal((await validateRequestBody(stream([valid], { 'content-length': '1' }))).code, 'UPLOAD_MALFORMED');
});

test('header failures never subscribe to body data; cancellation is sanitized', async () => {
  for (const [headers, code] of [
    [{ 'content-type': 'multipart/form-data' }, 'UPLOAD_UNSUPPORTED'],
    [{ 'content-encoding': 'gzip' }, 'UPLOAD_UNSUPPORTED'],
    [{ 'content-length': String(LIMITS.jsonBytes + 1) }, 'UPLOAD_TOO_LARGE'],
    [{ 'content-length': 'SENTINEL' }, 'UPLOAD_MALFORMED'],
  ]) {
    const req = { headers: { 'content-type': 'application/json', ...headers }, on() { throw Error('body read'); } };
    assert.equal((await validateRequestBody(req)).code, code);
  }
  const req = stream([]); req._read = () => {};
  const result = validateRequestBody(req); req.emit('error', Error('SENTINEL_PRIVATE'));
  assert.deepEqual(await result, { ok: false, code: 'UPLOAD_CANCELLED' });
  assert.equal(req.listenerCount('data'), 0);
});

// Instrument an isolated copy of the actual route, never expose a runtime enable
// option. No production imports consume this source transformation.
function instrumentedRouter() {
  const file = require.resolve('../server/cadUserUploadRouter');
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(source.split('const BODY_ADMISSION_AUTHORIZED = false;').length, 2);
  const context = { module: { exports: {} }, require: createRequire(file) };
  vm.runInNewContext(source.replace('const BODY_ADMISSION_AUTHORIZED = false;', 'const BODY_ADMISSION_AUTHORIZED = true;'), context);
  return context.module.exports.createCadUserUploadRouter;
}

test('actual route instrumentation preserves auth precedence and terminal disabled behavior', async t => {
  let grant = { loginSessionId: 'exact-login', userId: 'synthetic-user', shopId: 'synthetic-shop', authMethod: 'password', cadUploadAllowed: true, expiresAt: Date.now() + 60000 };
  let unavailable = false;
  const sessionService = createUploadSessionService({ store: createInMemoryUploadSessionStoreForTests({ testOnly: true }),
    resolveAuthorization: async () => grant, refreshAuthorization: async () => { if (unavailable) throw Error('SENTINEL_PRIVATE'); return grant; } });
  const issued = await sessionService.issueSession(null);
  assert.equal(issued.ok, true);
  let reads = 0;
  const app = express();
  app.use((req, res, next) => { const on = req.on; req.on = function(event, ...args) { if (event === 'data') reads++; return on.call(this, event, ...args); }; next(); });
  app.use('/api/cad', instrumentedRouter()({ sessionService }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  async function request(body, authenticated = true) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/cad/user-import`, { method: 'POST',
      headers: { 'content-type': 'application/json', ...(authenticated ? { authorization: `Bearer ${issued.credential}` } : {}) }, body });
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const text = await res.text(); assert.doesNotMatch(text, /SENTINEL|synthetic-user|synthetic-shop|us1\.|contentBase64|fileName/);
    const result = JSON.parse(text); assert.deepEqual(Object.keys(result).sort(), ['code', 'message', 'schemaVersion', 'status']); return result.code;
  }
  assert.equal(await request('{SENTINEL', false), 'USER_SESSION_REQUIRED'); assert.equal(reads, 0);
  grant = { ...grant, loginSessionId: 'another-active-login' };
  assert.equal(await request('{SENTINEL'), 'USER_SESSION_REQUIRED'); assert.equal(reads, 0);
  grant = { ...grant, loginSessionId: 'exact-login', cadUploadAllowed: false };
  assert.equal(await request('{SENTINEL'), 'USER_UPLOAD_FORBIDDEN'); assert.equal(reads, 0);
  unavailable = true;
  assert.equal(await request('{SENTINEL'), 'USER_AUTH_UNAVAILABLE'); assert.equal(reads, 0);
  unavailable = false; grant = { ...grant, cadUploadAllowed: true };
  assert.equal(await request('{SENTINEL'), 'UPLOAD_MALFORMED');
  assert.equal(await request(JSON.stringify(payload())), 'USER_UPLOADS_DISABLED');
  assert.equal(reads, 2);
});

test('runtime has no enable option or executor and manifest keeps prerequisites closed', () => {
  const manifest = require('../offline/cad-convex/disabledUploadAdmission.json');
  assert.equal(manifest.bodyAdmissionAuthorized, false);
  assert.equal(manifest.conversionAvailable, false);
  assert.ok(Object.values(manifest.prerequisites).every(value => value === false));
  for (const name of ['cadUserUploadRouter', 'cadUserUploadAdmission']) {
    const source = fs.readFileSync(require.resolve(`../server/${name}`), 'utf8');
    assert.doesNotMatch(source, /process\.env|console\.|cadSandboxExecutor|\.convert\(|\.dispatch\(/);
  }
});


test('stalled and aborted streams stop with fixed errors and release buffered listeners', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const aborted of [false, true]) {
    const req = new Readable({ read() {} });
    req.headers = { 'content-type': 'application/json' };
    const result = validateRequestBody(req);
    if (aborted) { req.emit('aborted'); req.emit('error', Error('SENTINEL_LATE')); } else t.mock.timers.tick(10000);
    assert.deepEqual(await result, { ok: false, code: aborted ? 'UPLOAD_CANCELLED' : 'UPLOAD_TIMEOUT' });
    assert.equal(req.listenerCount('data'), 0);
    assert.equal(req.listenerCount('end'), 0);
    req.destroy();
  }
});
