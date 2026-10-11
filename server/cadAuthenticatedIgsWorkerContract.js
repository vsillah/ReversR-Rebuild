const crypto = require('node:crypto');
const { inspectIgesFileName } = require('../utils/igesAdmission');
const { AUTHENTICATED_IGES_SOURCE_MAX_BYTES, inspectAuthenticatedIgesSource }
  = require('../utils/cadAuthenticatedIgesAdmission');
const { meshPayload } = require('./cadWorkerContract');

const LIMITS = Object.freeze({
  inputBytes: AUTHENTICATED_IGES_SOURCE_MAX_BYTES,
  jsonBytes: Math.ceil(AUTHENTICATED_IGES_SOURCE_MAX_BYTES / 3) * 4 + 1024,
  outputBytes: 1024 * 1024,
  meshes: 16,
  vertices: 20000,
  triangles: 10000,
  timeoutMs: 5000,
  concurrency: 1,
});

const ERRORS = Object.freeze({
  NO_SOURCE: [400, 'Select a nonempty IGES source file.'],
  MALFORMED: [400, 'Provide a valid IGES upload as fileName and contentBase64.'],
  UNSUPPORTED: [415, 'Only standalone IGES source uploads are accepted.'],
  TOO_LARGE: [413, 'The upload exceeds the 8 MiB source limit.'],
  NO_GEOMETRY: [422, 'No triangle geometry was found.'],
  INVALID_GEOMETRY: [422, 'The model contains invalid geometry.'],
  OUTPUT_LIMIT: [413, 'The model exceeds the mesh, vertex, triangle or response limit.'],
  CONVERSION_FAILED: [422, 'The IGES source could not be converted.'],
  RUNTIME_UNAVAILABLE: [503, 'The packaged CAD worker is unavailable.'],
  TIMEOUT: [504, 'The CAD worker exceeded its time limit and was terminated.'],
  CANCELLED: [499, 'The CAD request was cancelled.'],
  BUSY: [429, 'The CAD worker is busy. Retry after it finishes.'],
  CLEANUP_FAILED: [503, 'The CAD Sandbox cleanup could not be confirmed.'],
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function failure(code) {
  const safeCode = Object.hasOwn(ERRORS, code) ? code : 'CONVERSION_FAILED';
  return { schemaVersion: 1, status: 'error', code: safeCode, message: ERRORS[safeCode][1] };
}

function upload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('NO_SOURCE');
  if (typeof body.contentBase64 !== 'string' || !body.contentBase64) fail('NO_SOURCE');
  if (Object.keys(body).sort().join(',') !== 'contentBase64,fileName') fail('MALFORMED');
  const fileNameInspection = inspectIgesFileName(body.fileName);
  if (!fileNameInspection.ok) fail(fileNameInspection.code);
  if (body.contentBase64.length > Math.ceil(LIMITS.inputBytes / 3) * 4) fail('TOO_LARGE');
  const bytes = Buffer.from(body.contentBase64, 'base64');
  if (bytes.length > LIMITS.inputBytes) fail('TOO_LARGE');
  if (bytes.toString('base64') !== body.contentBase64) fail('MALFORMED');
  const inspection = inspectAuthenticatedIgesSource({ fileName: body.fileName, bytes });
  if (!inspection.ok) fail(inspection.code);
  return { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

module.exports = { ERRORS, LIMITS, fail, failure, meshPayload, upload };
