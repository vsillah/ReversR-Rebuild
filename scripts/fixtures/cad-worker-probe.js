const { parentPort, workerData } = require('node:worker_threads');
if (workerData.mode === 'hang') { while (true) {} }
else if (workerData.mode === 'wasm-hang') {
  const binary = Buffer.from('0061736d01000000010401600000030201000707010372756e00000a0901070003400c000b0b', 'hex');
  new WebAssembly.Instance(new WebAssembly.Module(binary)).exports.run();
}
else if (workerData.mode === 'crash') throw new Error('Deliberate test failure');
else if (workerData.mode === 'exit') parentPort.close();
else if (workerData.mode === 'memory') {
  const memory = new WebAssembly.Memory({ initial: 256, maximum: 1024 });
  memory.grow(256);
  parentPort.postMessage({ wasmBytes: memory.buffer.byteLength });
  parentPort.close();
} else if (workerData.mode === 'message') {
  parentPort.postMessage(workerData.message);
  parentPort.close();
} else {
  const Module = require('node:module');
  const load = Module._load;
  const denied = new Set(['http', 'https', 'http2', 'net', 'tls', 'dns', 'dgram', 'child_process']);
  Module._load = function (name, ...args) {
    if (denied.has(name.replace(/^node:/, ''))) throw new Error('Forbidden worker transport');
    return load.call(this, name, ...args);
  };
  global.fetch = () => { throw new Error('Forbidden worker fetch'); };
  require('../../server/cadMeshWorker');
}
