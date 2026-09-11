// Fixed entrypoint. No user-selectable module, path, URL, or runtime.
const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const { LIMITS, fail, failure, meshPayload } = require('./cadWorkerContract');
(async () => {
  try {
    const bytes = Buffer.from(workerData.bytes);
    if (!bytes.length || bytes.length > LIMITS.inputBytes) fail('TOO_LARGE');
    const wasmBinary = fs.readFileSync(require.resolve('occt-import-js/dist/occt-import-js.wasm'));
    const occt = await require('occt-import-js')({ wasmBinary, print() {}, printErr() {} });
    const result = occt.ReadIgesFile(bytes, { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 });
    if (!result.success) fail('CONVERSION_FAILED');
    if (!Array.isArray(result.meshes)) fail('NO_GEOMETRY');
    if (result.meshes.length > LIMITS.meshes) fail('OUTPUT_LIMIT');
    const payload = meshPayload(result.meshes.map(mesh => ({ positions: mesh.attributes?.position?.array, indices: mesh.index?.array })));
    const output = JSON.stringify({ status: 'ready', ...payload });
    if (Buffer.byteLength(output) > LIMITS.outputBytes - 2048) fail('OUTPUT_LIMIT');
    parentPort.postMessage(output);
  } catch (error) {
    const code = ['MODULE_NOT_FOUND', 'ENOENT', 'ERR_DLOPEN_FAILED'].includes(error.code) ? 'RUNTIME_UNAVAILABLE' : error.code;
    parentPort.postMessage(JSON.stringify(failure(code)));
  } finally { parentPort.close(); }
})();
