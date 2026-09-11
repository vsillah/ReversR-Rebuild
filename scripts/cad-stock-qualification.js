// Offline qualification only; never loaded by the request path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const factory = require('occt-import-js');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

async function qualify() {
  const deny = () => { throw new Error('NETWORK_FORBIDDEN'); };
  global.fetch = deny;
  for (const name of ['node:http', 'node:https']) {
    const transport = require(name);
    transport.request = deny;
    transport.get = deny;
  }
  require('node:net').Socket.prototype.connect = deny;
  require('node:tls').connect = deny;

  // Use the package's public cube, never a supplied file or research fixture.
  const packageRoot = path.dirname(require.resolve('occt-import-js/package.json'));
  const directory = path.join(packageRoot, 'test', 'testfiles', 'cube-10x10mm');
  const candidates = fs.readdirSync(directory).filter(name => /\.igs$/i.test(name));
  assert.equal(candidates.length, 1);
  const bytes = fs.readFileSync(path.join(directory, candidates[0]));
  assert.ok(bytes.length < 64 * 1024);
  assert.equal(sha(bytes), '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3');
  const wasmBinary = fs.readFileSync(require.resolve('occt-import-js/dist/occt-import-js.wasm'));
  const requestedMemory = new WebAssembly.Memory({ initial: 256, maximum: 4096 });
  const occt = await factory({ wasmBinary, wasmMemory: requestedMemory, print() {}, printErr() {} });
  const options = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 };
  let timerFired = false;
  const timer = setTimeout(() => { timerFired = true; }, 1);
  const started = performance.now();
  const result = occt.ReadIgesFile(bytes, options);
  const elapsedMs = performance.now() - started;
  clearTimeout(timer);
  assert.equal(result.success, true);
  assert.ok(result.meshes.length > 0);
  let triangles = 0;
  for (const mesh of result.meshes) {
    const vertices = mesh.attributes.position.array;
    const indices = mesh.index.array;
    assert.ok(vertices.length > 0 && vertices.length <= 180000 && vertices.length % 3 === 0);
    assert.ok(vertices.every(Number.isFinite));
    assert.ok(indices.length > 0 && indices.length % 3 === 0);
    assert.ok(indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices.length / 3));
    triangles += indices.length / 3;
  }
  assert.equal(triangles, 12);
  const geometry = result.meshes.map(mesh => ({ positions: mesh.attributes.position.array, indices: mesh.index.array }));
  const repeated = occt.ReadIgesFile(bytes, options);
  assert.equal(repeated.success, true);
  assert.equal(sha(JSON.stringify(geometry)), sha(JSON.stringify(repeated.meshes.map(mesh => ({ positions: mesh.attributes.position.array, indices: mesh.index.array })))));
  const memoryOverrideHonored = occt.HEAPU8.buffer === requestedMemory.buffer;
  const report = {
    packageVersion: require('occt-import-js/package.json').version,
    fixtureBytes: bytes.length, fixtureSha256: sha(bytes), wasmSha256: sha(wasmBinary),
    conversionSucceeded: true, triangles, deterministicGeometry: true,
    elapsedMs: Math.round(elapsedMs), timerFiredDuringConversion: timerFired,
    requestedMemoryLimitBytes: 256 * 1024 * 1024, memoryOverrideHonored,
    enabled: false, routeMounted: false,
    blocker: 'IN_PROCESS_EXECUTION_LIMITS_UNENFORCEABLE',
  };
  assert.equal(timerFired, false);
  assert.equal(memoryOverrideHonored, false);
  console.log(JSON.stringify(report, null, 2));
  if (!process.argv.includes('--expect-blocked')) {
    throw new Error('IN_PROCESS_EXECUTION_LIMITS_UNENFORCEABLE: synchronous WASM prevents timer/abort callbacks during conversion; the stock loader ignores the supplied capped memory.');
  }
}
qualify().catch(error => { console.error(error.message); process.exitCode = 1; });
