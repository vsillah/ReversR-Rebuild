// Offline contract only. No SDK, network, environment selection or runtime wiring.
const fail = () => { throw new Error('AUTH_UNAVAILABLE'); };
const id = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const time = x => Number.isSafeInteger(x) && x >= 0;
const method = x => ['password', 'passkey', 'oidc'].includes(x);
function exact(x, required, optional = []) {
  if (!x || typeof x !== 'object' || Array.isArray(x)
    || !required.every(k => Object.hasOwn(x, k))
    || Object.keys(x).some(k => !required.includes(k) && !optional.includes(k))) fail();
}
const bindingFields = ['userId', 'shopId', 'loginSessionId', 'authMethod'];
const recordFields = ['schemaVersion', ...bindingFields, 'sessionId', 'cadUploadAllowed',
  'transport', 'issuedAt', 'expiresAt', 'status'];
function binding(x, upload = false) {
  exact(x, [...bindingFields, ...(upload ? ['sessionId'] : [])]);
  if (!['userId', 'shopId', 'loginSessionId', ...(upload ? ['sessionId'] : [])].every(k => id(x[k]))
    || !method(x.authMethod)) fail();
  return { ...x };
}
function record(x) {
  exact(x, recordFields, ['csrfDigest']);
  if (x.schemaVersion !== 2 || !['userId', 'shopId', 'loginSessionId', 'sessionId'].every(k => id(x[k]))
    || !method(x.authMethod) || typeof x.cadUploadAllowed !== 'boolean'
    || !['bearer', 'cookie'].includes(x.transport) || !['active', 'revoked'].includes(x.status)
    || !time(x.issuedAt) || !time(x.expiresAt) || x.expiresAt <= x.issuedAt
    || x.expiresAt - x.issuedAt > 900000
    || (x.transport === 'cookie' ? !digest(x.csrfDigest) : Object.hasOwn(x, 'csrfDigest'))) fail();
  return { ...x };
}
function payload(op, x) {
  const keys = { insertIfAbsent: ['credentialDigest', 'record'], read: ['credentialDigest'],
    revoke: ['credentialDigest', 'revokedAt'], resolveAuthorization: ['shopId'],
    refreshAuthorization: ['binding'] };
  if (!Object.hasOwn(keys, op)) fail();
  exact(x, [...keys[op], 'deadlineAt']);
  if (!time(x.deadlineAt) || ('credentialDigest' in x && !digest(x.credentialDigest))
    || ('revokedAt' in x && !time(x.revokedAt)) || ('shopId' in x && !id(x.shopId))) fail();
  return { ...x, ...(x.record ? { record: record(x.record) } : {}),
    ...(x.binding ? { binding: binding(x.binding, true) } : {}) };
}
function result(op, x) {
  if (['insertIfAbsent', 'revoke'].includes(op)) { if (typeof x !== 'boolean') fail(); return x; }
  if (x === null) return null;
  if (op === 'read') return record(x);
  exact(x, [...bindingFields, 'cadUploadAllowed', 'expiresAt']);
  binding(Object.fromEntries(bindingFields.map(k => [k, x[k]])));
  if (typeof x.cadUploadAllowed !== 'boolean' || !time(x.expiresAt)) fail();
  return { ...x };
}
module.exports = { fail, id, time, method, exact, bindingFields, recordFields, binding, record, payload, result };
