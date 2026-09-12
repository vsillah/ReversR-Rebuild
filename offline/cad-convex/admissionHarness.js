// Offline route candidate only. Not mounted/imported by server code.
// Exercises admission ordering with synthetic adapters; no CAD executor is imported.
const express = require('express');
const { createUploadSessionVerifier } = require('../../server/uploadSession');
const errors = Object.freeze({
  USER_SESSION_REQUIRED: 401, USER_AUTH_UNAVAILABLE: 503, USER_UPLOAD_FORBIDDEN: 403,
  ORIGIN_OR_CSRF_REJECTED: 403, USER_UPLOADS_DISABLED: 503, METHOD_NOT_ALLOWED: 405,
  UPLOAD_CONTROLS_UNAVAILABLE: 503, UPLOAD_LIMIT_REACHED: 429,
  MALFORMED: 400, UNSUPPORTED: 415, TOO_LARGE: 413, SYNTHETIC_ADAPTER_FAILED: 503,
});
function createAdmissionHarnessForTests({ testOnly = false, uploadsEnabled = false, sessionService,
  allowedOrigins = [], reserve, validate, dispatch, now = Date.now } = {}) {
  if (testOnly !== true) throw new Error('TEST_HARNESS_OPT_IN_REQUIRED');
  const router = express.Router();
  const verify = createUploadSessionVerifier({ lookupSession: sessionService?.lookupSession, allowedOrigins, now });
  const send = (res, code) => res.status(errors[code]).json({ schemaVersion: 1,
    status: 'error', code, message: 'Synthetic admission rejected.' });
  router.all('/user-import', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.set('Allow', 'POST'); return send(res, 'METHOD_NOT_ALLOWED'); }
    const controller = new AbortController();
    const abort = () => controller.abort();
    req.once('aborted', abort);
    res.once('close', abort);
    let lease, dispatched = false, completed = false;
    try {
      const auth = await verify(req);
      if (!auth.ok) return send(res, auth.code.startsWith('SESSION_') ? 'USER_SESSION_REQUIRED'
        : auth.code === 'CAD_PERMISSION_REQUIRED' ? 'USER_UPLOAD_FORBIDDEN'
        : auth.code === 'ORIGIN_OR_CSRF_REJECTED' ? auth.code : 'USER_AUTH_UNAVAILABLE');
      if (uploadsEnabled !== true) return send(res, 'USER_UPLOADS_DISABLED');
      if (![reserve, validate, dispatch].every(fn => typeof fn === 'function')) return send(res, 'UPLOAD_CONTROLS_UNAVAILABLE');
      lease = await reserve(auth.principal, { signal: controller.signal });
      if (lease === null) return send(res, 'UPLOAD_LIMIT_REACHED');
      if (!lease || typeof lease.release !== 'function' || typeof lease.retain !== 'function') {
        return send(res, 'UPLOAD_CONTROLS_UNAVAILABLE');
      }
      if (req.headers['content-type'] !== 'application/json' || (req.headers['content-encoding'] !== undefined
        && req.headers['content-encoding'] !== 'identity')) return send(res, 'UNSUPPORTED');
      // Streaming byte limit applies even without or with dishonest Content-Length.
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        controller.signal.throwIfAborted();
        size += chunk.length;
        if (size > 384 * 1024) return send(res, 'TOO_LARGE');
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return send(res, 'MALFORMED'); }
      const validated = await validate(body, { signal: controller.signal });
      if (validated === null) return send(res, 'MALFORMED');
      // Fresh lookup/refresh immediately before synthetic dispatch; still not atomic with dispatch.
      const current = await verify(req);
      if (!current.ok || current.principal.sessionId !== auth.principal.sessionId) return send(res, 'USER_SESSION_REQUIRED');
      controller.signal.throwIfAborted();
      dispatched = true;
      const result = await dispatch(validated, current.principal, { signal: controller.signal });
      completed = result === true; // literal acknowledgement only; never return adapter data.
      if (!completed) return send(res, 'SYNTHETIC_ADAPTER_FAILED');
      return res.status(200).json({ schemaVersion: 1, status: 'ok', code: 'SYNTHETIC_ACCEPTED' });
    } catch { if (!res.headersSent) return send(res, 'SYNTHETIC_ADAPTER_FAILED'); }
    finally {
      req.removeListener('aborted', abort); res.removeListener('close', abort);
      controller.abort();
      // Unknown dispatch outcome retains reservations. This is not a hosted quota implementation.
      try {
        if (lease && typeof lease.release === 'function' && typeof lease.retain === 'function') {
          await (dispatched && !completed ? lease.retain() : lease.release());
        }
      } catch { /* No diagnostic egress. Real reconciliation/durability remains a gate. */ }
    }
  });
  return router;
}
module.exports = { createAdmissionHarnessForTests };
