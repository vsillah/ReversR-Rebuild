const AUTHENTICATED_IGS_CORS_HEADERS = Object.freeze([
  'Authorization',
  'Content-Type',
  'X-Upload-CSRF',
  'X-ReversR-CAD-Extension',
  'X-ReversR-CAD-Content-SHA256',
  'X-ReversR-Idempotency-Key',
  'X-ReversR-Download-Grant',
]);
const HEADER_SET = new Set(AUTHENTICATED_IGS_CORS_HEADERS.map(name => name.toLowerCase()));

function methodsForPath(pathname) {
  if (pathname === '/authenticated-upload-session'
    || pathname === '/authenticated-import') return ['POST'];
  if (pathname === '/authenticated-import/latest') return ['GET'];
  if (/^\/authenticated-import\/[^/]+\/grants\/(?:original|preview|stl)$/.test(pathname)) {
    return ['POST'];
  }
  if (/^\/authenticated-import\/[^/]+$/.test(pathname)) return ['GET', 'DELETE'];
  if (/^\/authenticated-artifacts\/[^/]+\/(?:original|preview|stl)$/.test(pathname)) {
    return ['GET'];
  }
  return null;
}

function duplicatePreflightHeaders(req) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) return true;
  const relevant = new Set(['origin', 'access-control-request-method',
    'access-control-request-headers']);
  const seen = new Set();
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    const name = String(req.rawHeaders[index]).toLowerCase();
    if (relevant.has(name) && seen.has(name)) return true;
    seen.add(name);
  }
  return false;
}

function requestedHeaders(value) {
  if (value === undefined) return [];
  if (typeof value !== 'string' || value.length > 1024) return null;
  const names = value.split(',').map(name => name.trim().toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length
    || names.some(name => !/^[a-z0-9-]+$/.test(name) || !HEADER_SET.has(name))) return null;
  return names;
}

function setAuthenticatedIgsCorsHeaders(req, res, allowedOrigins) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !allowedOrigins.includes(origin)) return false;
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Vary', 'Origin');
  return true;
}

function createCadAuthenticatedIgsPreflight({ configured = false, allowedOrigins = [] } = {}) {
  const origins = Array.isArray(allowedOrigins) ? [...allowedOrigins] : [];
  return (req, res, next) => {
    if (req.method !== 'OPTIONS') return next();
    const methods = methodsForPath(req.path);
    if (!methods) return next();
    const requestedMethod = req.headers['access-control-request-method'];
    const headers = requestedHeaders(req.headers['access-control-request-headers']);
    if (!configured || duplicatePreflightHeaders(req) || headers === null
      || typeof requestedMethod !== 'string' || !methods.includes(requestedMethod.toUpperCase())
      || !setAuthenticatedIgsCorsHeaders(req, res, origins)) {
      return res.status(403).set('Cache-Control', 'no-store').json({ schemaVersion: 1,
        status: 'error', code: 'ORIGIN_OR_CSRF_REJECTED',
        message: 'The upload origin or request token was rejected.' });
    }
    res.set('Cache-Control', 'no-store');
    res.set('Access-Control-Allow-Methods', methods.join(', '));
    res.set('Access-Control-Allow-Headers', AUTHENTICATED_IGS_CORS_HEADERS.join(', '));
    res.append('Vary', 'Access-Control-Request-Method');
    res.append('Vary', 'Access-Control-Request-Headers');
    res.set('Access-Control-Max-Age', '300');
    return res.status(204).end();
  };
}

module.exports = { AUTHENTICATED_IGS_CORS_HEADERS, createCadAuthenticatedIgsPreflight,
  methodsForPath, requestedHeaders, setAuthenticatedIgsCorsHeaders };
