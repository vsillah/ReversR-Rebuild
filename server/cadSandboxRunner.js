// Uploaded fixed program, executed only inside the isolated Sandbox guest.
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { LIMITS, fail, failure, meshPayload } = require('./cadWorkerContract');
(async () => {
  let output;
  try {
    const bytes = fs.readFileSync('/vercel/sandbox/source.bin');
    if (!bytes.length || bytes.length > LIMITS.inputBytes) fail('TOO_LARGE');
    const wasmBinary = fs.readFileSync('/vercel/sandbox/occt.wasm');
    const occt = await require('./occt.js')({ wasmBinary, print() {}, printErr() {} });
    const result = occt.ReadIgesFile(bytes, { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 });
    if (!result.success) fail('CONVERSION_FAILED');
    if (!Array.isArray(result.meshes)) fail('NO_GEOMETRY');
    if (result.meshes.length > LIMITS.meshes) fail('OUTPUT_LIMIT');
    const array = value => ArrayBuffer.isView(value) ? Array.from(value) : value;
    output = { status: 'ready', sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      ...meshPayload(result.meshes.map(mesh => ({ positions: array(mesh.attributes?.position?.array), indices: array(mesh.index?.array) }))),
      guestMemoryBytes: os.totalmem() };
    if (Buffer.byteLength(JSON.stringify(output)) > LIMITS.outputBytes - 2048) fail('OUTPUT_LIMIT');
  } catch (error) { output = failure(error.code); }
  fs.writeFileSync('/vercel/sandbox/result.json', JSON.stringify(output), { mode: 0o600, flag: 'wx' });
})().catch(() => { process.exitCode = 1; });
