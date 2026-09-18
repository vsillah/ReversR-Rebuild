// Source-only client projection. No body builder, default transport, or upload activation.
const CAD_USER_IMPORT_PATH = '/api/cad/user-import';
const CAD_USER_IMPORT_ENABLED = false;
const CAD_UPLOAD_SESSION_MAX_LIFETIME_MS = 15 * 60 * 1000;
const CAD_UPLOAD_SESSION_TIMEOUT_MS = 8000;
const csrfPattern = /^[A-Za-z0-9_-]{43}$/;
const messages = Object.freeze({
  USER_SESSION_REQUIRED: 'No upload session. Development sign-in is not connected; keep the file local.',
  USER_AUTH_UNAVAILABLE: 'Development session unavailable. Session access must be connected before import can proceed.',
  USER_UPLOAD_FORBIDDEN: 'CAD import permission is unavailable. Keep the file local and contact your operator.',
  ORIGIN_OR_CSRF_REJECTED: 'Session validation failed. Keep the file local; the operator must review session access.',
  USER_UPLOADS_DISABLED: 'Admission disabled. File contents remain on your device.',
  METHOD_NOT_ALLOWED: 'Import route unavailable. Contact your operator before trying again.',
  UPLOAD_MALFORMED: 'File preparation was rejected. Clear the selection and choose a standalone IGES file.',
  UPLOAD_UNSUPPORTED: 'Unsupported format. Choose an .igs or .iges file.',
  UPLOAD_TOO_LARGE: 'File exceeds the import limit. Choose a smaller public or synthetic file.',
  UPLOAD_CANCELLED: 'Request cancelled. Clear the selection to start again locally.',
  UPLOAD_TIMEOUT: 'Request timed out. Keep the file local and check service status.',
});
function mapCadImportError(response) {
  const code = response?.schemaVersion === 1 && response?.status === 'error'
    && Object.hasOwn(messages, response.code) ? response.code : 'UNKNOWN';
  return { code, message: messages[code] || 'Import status unavailable. Keep the file local and check service status.', canSubmit: false };
}
function closed(code = 'UNKNOWN') {
  const mapped = mapCadImportError({ schemaVersion: 1, status: 'error', code });
  return { ok: false, ...mapped };
}
function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function parseCadUploadSessionResponse(response, { now = Date.now() } = {}) {
  if (!Number.isSafeInteger(now) || now < 0) return closed('USER_AUTH_UNAVAILABLE');
  if (response?.schemaVersion === 1 && response?.status === 'error') return closed(response.code);
  if (!exactKeys(response, ['schemaVersion', 'status', 'session'])
    || response.schemaVersion !== 1 || response.status !== 'success'
    || !exactKeys(response.session, ['transport', 'expiresAt', 'csrfToken'])
    || response.session.transport !== 'cookie'
    || !Number.isSafeInteger(response.session.expiresAt)
    || response.session.expiresAt <= now
    || response.session.expiresAt - now > CAD_UPLOAD_SESSION_MAX_LIFETIME_MS
    || !csrfPattern.test(response.session.csrfToken)) return closed();
  const session = Object.freeze({
    transport: 'cookie',
    expiresAt: response.session.expiresAt,
    csrfToken: response.session.csrfToken,
  });
  return Object.freeze({
    ok: true,
    code: 'SESSION_READY',
    message: 'Development upload session connected. Upload admission remains disabled.',
    canSubmit: false,
    session,
  });
}
function createCadUploadSessionAdapter({ issue, now = Date.now, timeoutMs = CAD_UPLOAD_SESSION_TIMEOUT_MS } = {}) {
  const configured = typeof issue === 'function' && typeof now === 'function'
    && Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= CAD_UPLOAD_SESSION_TIMEOUT_MS;
  return Object.freeze({
    async connect({ signal } = {}) {
      if (!configured) return closed('USER_AUTH_UNAVAILABLE');
      if (signal?.aborted) return closed('UPLOAD_CANCELLED');
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      signal?.addEventListener?.('abort', abort, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        const response = await Promise.race([
          Promise.resolve().then(() => issue({ signal: controller.signal })),
          new Promise(resolve => controller.signal.addEventListener('abort', () => resolve(null), { once: true })),
        ]);
        if (controller.signal.aborted) return closed(timedOut ? 'UPLOAD_TIMEOUT' : 'UPLOAD_CANCELLED');
        let current;
        try { current = now(); } catch { return closed('USER_AUTH_UNAVAILABLE'); }
        return parseCadUploadSessionResponse(response, { now: current });
      } catch {
        return closed(controller.signal.aborted
          ? (timedOut ? 'UPLOAD_TIMEOUT' : 'UPLOAD_CANCELLED')
          : 'USER_AUTH_UNAVAILABLE');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener?.('abort', abort);
      }
    },
  });
}
function prepareCadFileMetadata(file) {
  // Read only name and size. Never retain the File or read its contents.
  const format = file.name.split('.').pop()?.toLowerCase();
  if (!['igs', 'iges'].includes(format)) return { metadata: null, message: messages.UPLOAD_UNSUPPORTED };
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return { metadata: null, message: 'This file is empty or has an invalid size. Choose another IGES file.' };
  return { metadata: { format: format.toUpperCase(), bytes: file.size }, message: 'File prepared locally. No request body was created; nothing was uploaded or converted.' };
}
module.exports = {
  CAD_USER_IMPORT_PATH,
  CAD_USER_IMPORT_ENABLED,
  CAD_UPLOAD_SESSION_MAX_LIFETIME_MS,
  createCadUploadSessionAdapter,
  parseCadUploadSessionResponse,
  mapCadImportError,
  prepareCadFileMetadata,
};
