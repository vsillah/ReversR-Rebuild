const crypto = require('node:crypto');
const LIMITS = Object.freeze({ inputBytes: 64 * 1024, jsonBytes: 96 * 1024, outputBytes: 1024 * 1024, meshes: 16, vertices: 20000, triangles: 10000, timeoutMs: 5000, concurrency: 1 });
const ERRORS = Object.freeze({
  DISABLED: [503, 'Hosted CAD import remains disabled pending memory isolation and deployment qualification.'],
  NO_SOURCE: [400, 'Select a nonempty IGES source file.'],
  MALFORMED: [400, 'Provide a valid IGES upload as fileName and contentBase64.'],
  UNSUPPORTED: [415, 'Only standalone IGES source uploads are accepted.'],
  TOO_LARGE: [413, 'The upload exceeds the 64 KiB source or 96 KiB request limit.'],
  NO_GEOMETRY: [422, 'No triangle geometry was found.'],
  INVALID_GEOMETRY: [422, 'The model contains invalid geometry.'],
  OUTPUT_LIMIT: [413, 'The model exceeds the mesh, vertex, triangle or response limit.'],
  CONVERSION_FAILED: [422, 'The IGES source could not be converted.'],
  RUNTIME_UNAVAILABLE: [503, 'The packaged CAD worker is unavailable.'],
  TIMEOUT: [504, 'The CAD worker exceeded its time limit and was terminated.'],
  CANCELLED: [499, 'The CAD request was cancelled.'],
  BUSY: [429, 'The CAD worker is busy. Retry after it finishes.'],
});
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function failure(code) { const safeCode = Object.hasOwn(ERRORS, code) ? code : 'CONVERSION_FAILED'; return { schemaVersion: 1, status: 'error', code: safeCode, message: ERRORS[safeCode][1] }; }
function upload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('NO_SOURCE');
  if (typeof body.contentBase64 !== 'string' || !body.contentBase64) fail('NO_SOURCE');
  if (Object.keys(body).sort().join(',') !== 'contentBase64,fileName') fail('MALFORMED');
  if (typeof body.fileName !== 'string' || body.fileName.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9 _().-]*$/.test(body.fileName) || body.fileName.includes('..')) fail('MALFORMED');
  if (!/\.(igs|iges)$/i.test(body.fileName)) fail('UNSUPPORTED');
  if (body.contentBase64.length > Math.ceil(LIMITS.inputBytes / 3) * 4) fail('TOO_LARGE');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.contentBase64)) fail('MALFORMED');
  const bytes = Buffer.from(body.contentBase64, 'base64');
  if (!bytes.length) fail('NO_SOURCE');
  if (bytes.length > LIMITS.inputBytes) fail('TOO_LARGE');
  if (bytes.toString('base64') !== body.contentBase64 || bytes.some(x => x > 126 || (x < 32 && x !== 10 && x !== 13))) fail('MALFORMED');
  const rows = bytes.toString('ascii').trimEnd().split(/\r?\n/);
  const sections = rows.map(row => row[72]).join('');
  if (rows.some(row => row.length !== 80 || !/^[SGDPT][ 0-9]{7}$/.test(row.slice(72))) || !/^S+G+D+P+T$/.test(sections)) fail('MALFORMED');
  // Stock placement/assembly fidelity is not qualified in this slice.
  const directory = rows.filter(row => row[72] === 'D');
  if (directory.length % 2) fail('MALFORMED');
  for (let i = 0; i < directory.length; i += 2) {
    if ([124, 308, 408, 416].includes(Number(directory[i].slice(0, 8))) || Number(directory[i].slice(48, 56)) !== 0) fail('UNSUPPORTED');
  }
  return { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
function meshPayload(meshes) {
  if (!Array.isArray(meshes) || !meshes.length) fail('NO_GEOMETRY');
  if (meshes.length > LIMITS.meshes) fail('OUTPUT_LIMIT');
  let vertexCount = 0, triangleCount = 0;
  const safe = meshes.map(mesh => {
    const positions = mesh?.positions, indices = mesh?.indices;
    if (!Array.isArray(positions) || !Array.isArray(indices) || !positions.length || !indices.length || positions.length % 3 || indices.length % 3) fail('INVALID_GEOMETRY');
    vertexCount += positions.length / 3; triangleCount += indices.length / 3;
    if (vertexCount > LIMITS.vertices || triangleCount > LIMITS.triangles) fail('OUTPUT_LIMIT');
    if (!positions.every(value => Number.isFinite(value) && Math.abs(value) <= 1e9) || !indices.every(value => Number.isInteger(value) && value >= 0 && value < positions.length / 3)) fail('INVALID_GEOMETRY');
    return { positions, indices };
  });
  return { meshes: safe, vertexCount, triangleCount };
}
module.exports = { LIMITS, ERRORS, fail, failure, upload, meshPayload };
