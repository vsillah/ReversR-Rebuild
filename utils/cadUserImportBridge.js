// Source-only client projection. No credentials, body builder, transport, or success contract.
const CAD_USER_IMPORT_PATH = '/api/cad/user-import';
const CAD_USER_IMPORT_ENABLED = false;
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
function prepareCadFileMetadata(file) {
  // Read only name and size. Never retain the File or read its contents.
  const format = file.name.split('.').pop()?.toLowerCase();
  if (!['igs', 'iges'].includes(format)) return { metadata: null, message: messages.UPLOAD_UNSUPPORTED };
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return { metadata: null, message: 'This file is empty or has an invalid size. Choose another IGES file.' };
  return { metadata: { format: format.toUpperCase(), bytes: file.size }, message: 'File prepared locally. No request body was created; nothing was uploaded or converted.' };
}
module.exports = { CAD_USER_IMPORT_PATH, CAD_USER_IMPORT_ENABLED, mapCadImportError, prepareCadFileMetadata };
