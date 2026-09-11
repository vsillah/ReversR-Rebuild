// Uploaded fixed program, executed only inside the isolated Sandbox guest.
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { LIMITS, fail, failure, meshPayload } = require('./cadWorkerContract');
function fileEvidence(path) {
  const bytes = fs.readFileSync(path);
  return { bytes, evidence: { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } };
}
(async () => {
  let output;
  const diagnostic = { phase: 'start' };
  try {
    diagnostic.phase = 'source_read';
    const { bytes, evidence: source } = fileEvidence('/vercel/sandbox/source.bin');
    diagnostic.source = source;
    if (!bytes.length || bytes.length > LIMITS.inputBytes) fail('TOO_LARGE');
    diagnostic.phase = 'asset_read';
    diagnostic.occtJs = fileEvidence('/vercel/sandbox/occt.js').evidence;
    const { bytes: wasmBinary, evidence: wasm } = fileEvidence('/vercel/sandbox/occt.wasm');
    diagnostic.wasm = wasm;
    diagnostic.phase = 'occt_load';
    const occt = await require('./occt.js')({ wasmBinary, print() {}, printErr() {} });
    diagnostic.phase = 'read_iges';
    const result = occt.ReadIgesFile(bytes, { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 });
    diagnostic.occtResult = { success: Boolean(result?.success), meshCount: Array.isArray(result?.meshes) ? result.meshes.length : undefined };
    if (!result.success) fail('CONVERSION_FAILED');
    if (!Array.isArray(result.meshes)) fail('NO_GEOMETRY');
    if (result.meshes.length > LIMITS.meshes) fail('OUTPUT_LIMIT');
    const array = value => ArrayBuffer.isView(value) ? Array.from(value) : value;
    output = { status: 'ready', sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      ...meshPayload(result.meshes.map(mesh => ({ positions: array(mesh.attributes?.position?.array), indices: array(mesh.index?.array) }))),
      guestMemoryBytes: os.totalmem() };
    if (Buffer.byteLength(JSON.stringify(output)) > LIMITS.outputBytes - 2048) fail('OUTPUT_LIMIT');
  } catch (error) {
    output = { ...failure(error.code), diagnostic: { ...diagnostic, error: error.code || 'RUNTIME_UNAVAILABLE' } };
  }
  fs.writeFileSync('/vercel/sandbox/result.json', JSON.stringify(output), { mode: 0o600, flag: 'wx' });
})().catch(() => { process.exitCode = 1; });
