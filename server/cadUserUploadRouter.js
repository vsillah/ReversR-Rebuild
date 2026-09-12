const express = require('express');
const cors = require('cors');
const { createUploadSessionVerifier } = require('./uploadSession');
const { uploadSessionService } = require('./uploadSessionStore');

const errors = Object.freeze({
  USER_SESSION_REQUIRED: [401, 'A valid upload session is required.'],
  USER_AUTH_UNAVAILABLE: [503, 'Upload authentication is unavailable.'],
  USER_UPLOAD_FORBIDDEN: [403, 'CAD upload permission is required.'],
  ORIGIN_OR_CSRF_REJECTED: [403, 'Upload origin or CSRF validation failed.'],
  USER_UPLOADS_DISABLED: [503, 'User CAD uploads are disabled.'],
  METHOD_NOT_ALLOWED: [405, 'Use POST for this endpoint.'],
});
const sessionFailures = new Set(['SESSION_MISSING', 'SESSION_MALFORMED', 'SESSION_INVALID', 'SESSION_REVOKED', 'SESSION_EXPIRED']);

// Server-only injection consumes the shared service contract. No enable switch,
// body parser, issuer endpoint, executor dependency or conversion path exists.
function createCadUserUploadRouter({ sessionService = uploadSessionService, allowedOrigins = [], corsOrigins = [] } = {}) {
  const router = express.Router();
  const verify = createUploadSessionVerifier({ lookupSession: sessionService.lookupSession, allowedOrigins });
  const send = (res, code) => res.status(errors[code][0]).json({ schemaVersion: 1, status: 'error', code, message: errors[code][1] });
  const corsMiddleware = cors({ origin: true, methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Upload-CSRF'] });
  router.all('/user-import', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Match API origin policy, but never echo rejected origins in errors.
    if (req.headers.origin && corsOrigins.length && !corsOrigins.includes('*') && !corsOrigins.includes(req.headers.origin)) {
      return send(res, 'ORIGIN_OR_CSRF_REJECTED');
    }
    return corsMiddleware(req, res, next);
  }, async (req, res) => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST, OPTIONS');
      return send(res, 'METHOD_NOT_ALLOWED');
    }
    const result = await verify(req);
    if (!result.ok) {
      const code = sessionFailures.has(result.code) ? 'USER_SESSION_REQUIRED'
        : result.code === 'CAD_PERMISSION_REQUIRED' ? 'USER_UPLOAD_FORBIDDEN'
        : result.code === 'ORIGIN_OR_CSRF_REJECTED' ? result.code : 'USER_AUTH_UNAVAILABLE';
      return send(res, code);
    }
    return send(res, 'USER_UPLOADS_DISABLED');
  });
  return router;
}
module.exports = { createCadUserUploadRouter };
