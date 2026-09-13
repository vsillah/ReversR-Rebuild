// Bounded input validation only. No stores, logs, provider clients or conversion.
const { TextDecoder } = require('node:util');
const { LIMITS, upload } = require('./cadWorkerContract');
const admissionErrors = Object.freeze({
  UPLOAD_MALFORMED: [400, 'Provide a valid standalone IGES upload.'],
  UPLOAD_UNSUPPORTED: [415, 'Use uncompressed JSON containing a standalone IGES file.'],
  UPLOAD_TOO_LARGE: [413, 'The upload exceeds the source or request limit.'],
  UPLOAD_CANCELLED: [499, 'The upload request was cancelled.'],
  UPLOAD_TIMEOUT: [408, 'The upload request timed out.'],
});
const deny = code => ({ ok: false, code });
const safeFailure = error => deny(error?.code === 'TOO_LARGE' ? 'UPLOAD_TOO_LARGE'
  : error?.code === 'UNSUPPORTED' ? 'UPLOAD_UNSUPPORTED' : 'UPLOAD_MALFORMED');
function validatePayload(body) {
  try {
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).sort().join(',') !== 'contentBase64,fileName,mimeType') return deny('UPLOAD_MALFORMED');
    if (!['model/iges', 'application/iges', 'application/octet-stream'].includes(body.mimeType)) return deny('UPLOAD_UNSUPPORTED');
    // Discard decoded bytes and hash; never return user content or retain receipts.
    upload({ fileName: body.fileName, contentBase64: body.contentBase64 });
    return { ok: true };
  } catch (error) { return safeFailure(error); }
}
function validateRequestBody(req) {
  const headers = req.headers || {};
  if (typeof headers['content-type'] !== 'string'
    || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(headers['content-type'])
    || (headers['content-encoding'] !== undefined && headers['content-encoding'] !== 'identity')) {
    return Promise.resolve(deny('UPLOAD_UNSUPPORTED'));
  }
  const declared = headers['content-length'];
  if (declared !== undefined && (typeof declared !== 'string' || !/^(0|[1-9][0-9]*)$/.test(declared))) {
    return Promise.resolve(deny('UPLOAD_MALFORMED'));
  }
  if (declared !== undefined && Number(declared) > LIMITS.jsonBytes) return Promise.resolve(deny('UPLOAD_TOO_LARGE'));
  return new Promise(resolve => {
    let size = 0, chunks = [], done = false;
    const finish = result => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      req.pause();
      // IncomingMessage may emit an error after aborted. Keep the fixed error
      // sink on this request so that late transport errors cannot escape.
      for (const [event, listener] of listeners) if (event !== 'error') req.removeListener(event, listener);
      chunks = [];
      resolve(result);
    };
    const listeners = [
      ['data', chunk => {
        if (!Buffer.isBuffer(chunk)) return finish(deny('UPLOAD_MALFORMED'));
        size += chunk.length;
        if (size > LIMITS.jsonBytes) return finish(deny('UPLOAD_TOO_LARGE'));
        chunks.push(chunk);
      }],
      ['end', () => {
        if (declared !== undefined && Number(declared) !== size) return finish(deny('UPLOAD_MALFORMED'));
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size));
          finish(validatePayload(JSON.parse(text)));
        } catch { finish(deny('UPLOAD_MALFORMED')); }
      }],
      ['aborted', () => finish(deny('UPLOAD_CANCELLED'))],
      ['error', () => finish(deny('UPLOAD_CANCELLED'))],
      ['close', () => { if (!req.complete) finish(deny('UPLOAD_CANCELLED')); }],
    ];
    const timer = setTimeout(() => finish(deny('UPLOAD_TIMEOUT')), 10000);
    if (req.aborted || req.destroyed || req.readableEnded) return finish(deny('UPLOAD_CANCELLED'));
    for (const [event, listener] of listeners) req.on(event, listener);
  });
}
module.exports = { admissionErrors, validatePayload, validateRequestBody };
