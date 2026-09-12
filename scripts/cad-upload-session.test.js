const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { createUploadSessionVerifier, verifyUploadSession } = require('../server/uploadSession');
const hash = value => createHash('sha256').update(value).digest('hex');
const token = `us1.${randomBytes(32).toString('base64url')}`;
const csrf = randomBytes(32).toString('base64url');
const cookieName = '__Host-reversr-upload-session';
const base = { schemaVersion: 1, userId: 'user-test', shopId: 'shop-test', sessionId: 'session-test',
  expiresAt: 2000, authMethod: 'passkey', status: 'active', transport: 'bearer', cadUploadAllowed: true };
function request(headers = { authorization: `Bearer ${token}` }) {
  // A body getter and stream methods would fail any attempt to consume a body.
  return new Proxy({ headers }, { get(target, key) {
    if (key === 'headers' || key === 'rawHeaders') return target[key];
    throw new Error(`Request access forbidden: ${String(key)}`);
  } });
}
function verifier(record = base, extra = {}) {
  return createUploadSessionVerifier({ now: () => 1000,
    lookupSession: async key => key === hash(token) ? record : null, ...extra });
}
async function code(verify, req, expected) {
  assert.deepEqual(await verify(req), { ok: false, code: expected });
}
test('unconfigured default and invalid configuration fail closed', async () => {
  await code(verifyUploadSession, request(), 'AUTH_UNAVAILABLE');
  for (const allowedOrigins of [['*'], ['http://app.test'], ['https://app.test/'], null]) {
    await code(verifier(base, { allowedOrigins }), request(), 'AUTH_UNAVAILABLE');
  }
});
test('missing credentials and profile/operator credentials cannot bypass verification', async () => {
  for (const headers of [{}, { 'x-reversr-client-id': 'user-test', 'x-reversr-profile-email': 'test@example.invalid',
    'x-reversr-shop-name': 'shop-test', 'x-reversr-access-password': 'synthetic-password',
    'x-cad-sandbox-access-token': token }]) await code(verifier(), request(headers), 'SESSION_MISSING');
  await code(verifier(), request({ authorization: 'Bearer operator-token' }), 'SESSION_MALFORMED');
});
test('valid synthetic session passes without body access and strips adapter extras', async () => {
  const result = await verifier({ ...base, credential: 'synthetic-private-extra' })(request());
  const { status, ...principal } = base;
  assert.deepEqual(result, { ok: true, principal });
  assert.equal(Object.isFrozen(result.principal), true);
});
test('forged credential, expiry boundary, revocation and missing permission fail closed', async () => {
  const forged = `${token.slice(0, 4)}${token[4] === 'A' ? 'B' : 'A'}${token.slice(5)}`;
  await code(verifier(), request({ authorization: `Bearer ${forged}` }), 'SESSION_INVALID');
  for (const [patch, expected] of [[{ expiresAt: 1000 }, 'SESSION_EXPIRED'], [{ expiresAt: 999 }, 'SESSION_EXPIRED'],
    [{ status: 'revoked' }, 'SESSION_REVOKED'], [{ cadUploadAllowed: false }, 'CAD_PERMISSION_REQUIRED']]) {
    await code(verifier({ ...base, ...patch }), request(), expected);
  }
});
test('malformed credentials and ambiguous transports never reach store', async () => {
  const verify = verifier(base, { lookupSession: () => { assert.fail('store must not run'); } });
  for (const headers of [{ authorization: ['Bearer x'] }, { authorization: '' },
    { authorization: `Bearer ${token} ` }, { authorization: `Bearer us2.${token.slice(4)}` },
    { authorization: 'Bearer us1.' + 'A'.repeat(42) + 'B' },
    { authorization: `Bearer ${token}`, cookie: `${cookieName}=${token}` },
    { cookie: `${cookieName}=${token}; ${cookieName}=${token}` }, { cookie: ['bad'] },
    { authorization: 'x'.repeat(8193) }]) await code(verify, request(headers), 'SESSION_MALFORMED');
  await code(verify, { headers: { authorization: `Bearer ${token}` },
    rawHeaders: ['Authorization', `Bearer ${token}`, 'authorization', `Bearer ${token}`] }, 'SESSION_MALFORMED');
});
test('invalid authoritative records cannot establish a principal', async () => {
  for (const patch of [{ schemaVersion: 2 }, { userId: '' }, { shopId: null }, { sessionId: [] },
    { authMethod: 'profile' }, { status: undefined }, { expiresAt: Infinity }, { expiresAt: '2000' },
    { cadUploadAllowed: 'true' }, { cadUploadAllowed: undefined }, { transport: 'cookie' }]) {
    await code(verifier({ ...base, ...patch }), request(), 'SESSION_INVALID');
  }
});
test('revocation and entitlement changes are re-read on every call; store sees only digest', async () => {
  let stored = { ...base }, calls = 0;
  const verify = verifier(base, { lookupSession: async (key, { signal }) => {
    assert.equal(key, hash(token)); assert.equal(signal.aborted, false); calls++; return stored;
  } });
  assert.equal((await verify(request())).ok, true);
  stored = { ...base, status: 'revoked' };
  await code(verify, request(), 'SESSION_REVOKED');
  stored = { ...base, cadUploadAllowed: false };
  await code(verify, request(), 'CAD_PERMISSION_REQUIRED');
  assert.equal(calls, 3);
});
test('cookie sessions require exact HTTPS origin and session-bound CSRF', async () => {
  const record = { ...base, transport: 'cookie', csrfDigest: hash(csrf) };
  const verify = verifier(record, { allowedOrigins: ['https://app.test'] });
  const headers = { cookie: `${cookieName}=${token}`, origin: 'https://app.test', 'x-upload-csrf': csrf };
  assert.equal((await verify(request(headers))).ok, true);
  for (const patch of [{ origin: undefined }, { origin: 'https://app.test.evil.invalid' },
    { origin: 'http://app.test' }, { origin: 'null' }, { 'x-upload-csrf': undefined },
    { 'x-upload-csrf': randomBytes(32).toString('base64url') }]) {
    await code(verify, request({ ...headers, ...patch }), 'ORIGIN_OR_CSRF_REJECTED');
  }
  await code(verifier(record), request(headers), 'ORIGIN_OR_CSRF_REJECTED');
  await code(verifier(record), request(), 'SESSION_INVALID');
  await code(verifier({ ...record, csrfDigest: undefined }, { allowedOrigins: ['https://app.test'] }),
    request(headers), 'ORIGIN_OR_CSRF_REJECTED');
});
test('adapter errors, stalls and invalid clocks return only safe codes', async () => {
  await code(verifier(base, { lookupSession: () => { throw new Error('synthetic-secret-sentinel'); } }), request(), 'AUTH_UNAVAILABLE');
  let signal;
  await code(verifier(base, { lookupSession: (_key, options) => {
    signal = options.signal; return new Promise(() => {});
  } }), request(), 'AUTH_UNAVAILABLE');
  assert.equal(signal.aborted, true);
  for (const value of [NaN, Infinity, -1]) await code(verifier(base, { now: () => value }), request(), 'AUTH_UNAVAILABLE');
});
