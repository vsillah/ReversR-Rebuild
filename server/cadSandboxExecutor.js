const crypto = require('node:crypto');
const { LIMITS, fail, upload, meshPayload } = require('./cadWorkerContract');
const { SANDBOX_LIMITS, credentialOptions, assets } = require('./cadSandboxConfig');

function abortable(operation, signal) {
  if (signal.aborted) return Promise.reject(Object.assign(new Error('Aborted'), { code: signal.reason }));
  return new Promise((resolve, reject) => {
    const abort = () => reject(Object.assign(new Error('Aborted'), { code: signal.reason }));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
async function readBounded(stream, signal) {
  let size = 0;
  const chunks = [];
  const push = value => {
    const chunk = Buffer.from(value);
    size += chunk.length;
    if (size > LIMITS.outputBytes) fail('OUTPUT_LIMIT');
    chunks.push(chunk);
  };
  if (typeof stream?.[Symbol.asyncIterator] === 'function') {
    try {
      const iterator = stream[Symbol.asyncIterator]();
      while (true) {
        const part = await abortable(iterator.next(), signal);
        if (part.done) break;
        push(part.value);
      }
    } finally { stream.destroy?.(); }
    return Buffer.concat(chunks, size);
  }
  if (typeof stream?.on !== 'function') fail('RUNTIME_UNAVAILABLE');
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener('abort', abort);
      stream.off?.('data', data);
      stream.off?.('end', end);
      stream.off?.('error', error);
    };
    const done = fn => value => { cleanup(); fn(value); };
    const abort = done(() => { stream.destroy?.(); reject(Object.assign(new Error('Aborted'), { code: signal.reason })); });
    const error = done(reject);
    const end = done(() => resolve(Buffer.concat(chunks, size)));
    const data = value => {
      try { push(value); } catch (err) { cleanup(); stream.destroy?.(); reject(err); }
    };
    signal.addEventListener('abort', abort, { once: true });
    stream.on('data', data); stream.on('end', end); stream.on('error', error);
  });
}
async function readResult(sandbox, signal) {
  if (typeof sandbox.readFileToBuffer === 'function') {
    const buffer = await abortable(sandbox.readFileToBuffer({ path: '/vercel/sandbox/result.json' }, { signal }), signal);
    if (!buffer) fail('CONVERSION_FAILED');
    if (buffer.length > LIMITS.outputBytes) fail('OUTPUT_LIMIT');
    return Buffer.from(buffer);
  }
  const stream = await abortable(sandbox.readFile({ path: '/vercel/sandbox/result.json' }, { signal }), signal);
  if (!stream) fail('CONVERSION_FAILED');
  return readBounded(stream, signal);
}
function createSandboxExecutor({ env = process.env, create = options => require('@vercel/sandbox').Sandbox.create(options), loadAssets = assets, requestMs = SANDBOX_LIMITS.requestMs, cleanupMs = SANDBOX_LIMITS.cleanupMs } = {}) {
  if (![requestMs, cleanupMs].every(value => Number.isInteger(value) && value > 0) || requestMs > SANDBOX_LIMITS.requestMs || cleanupMs > SANDBOX_LIMITS.cleanupMs) throw new Error('Invalid deadline');
  let active = false, cleanupBlocked = false;
  const stops = new WeakMap();
  const policyMode = policy => typeof policy === 'string' ? policy : policy?.mode;
  const finite = value => Number.isFinite(value) ? value : undefined;
  const sessionFor = sandbox => typeof sandbox.currentSession === 'function' ? sandbox.currentSession() : sandbox;
  function stop(sandbox) {
    if (!stops.has(sandbox)) stops.set(sandbox, (async () => {
      const control = new AbortController();
      const timer = setTimeout(() => control.abort('CLEANUP_FAILED'), cleanupMs);
      try {
        const receipt = await abortable(sandbox.stop({ signal: control.signal }), control.signal);
        if (receipt?.status !== 'stopped' || receipt.snapshot) fail('CLEANUP_FAILED');
      } catch { cleanupBlocked = true; fail('CLEANUP_FAILED'); }
      finally { clearTimeout(timer); }
    })());
    return stops.get(sandbox);
  }
  async function convert(body, signal) {
    const source = upload(body);
    if (signal?.aborted) fail('CANCELLED');
    if (cleanupBlocked) fail('CLEANUP_FAILED');
    if (active) fail('BUSY');
    let files;
    try { files = loadAssets(); } catch { fail('RUNTIME_UNAVAILABLE'); }
    active = true;
    const control = new AbortController();
    const timer = setTimeout(() => control.abort('TIMEOUT'), requestMs);
    const abort = () => control.abort('CANCELLED');
    signal?.addEventListener('abort', abort, { once: true });
    let sandbox;
    try {
      if (signal?.aborted) abort();
      if (control.signal.aborted) fail('CANCELLED');
      const creation = Promise.resolve(create({ ...credentialOptions(env), name: `cad-${crypto.randomUUID()}`,
        runtime: 'node24', region: 'iad1', resources: { vcpus: SANDBOX_LIMITS.vcpus },
        timeout: SANDBOX_LIMITS.lifetimeMs, networkPolicy: 'deny-all', persistent: false, ports: [], env: {}, signal: control.signal,
      })).then(async value => {
        // Creation can resolve after cancellation. Stop that VM too, without uploading source.
        if (control.signal.aborted) { await stop(value); fail(control.signal.reason); }
        return value;
      });
      sandbox = await abortable(creation, control.signal);
      const session = sessionFor(sandbox);
      const reportedVcpus = finite(session.vcpus) ?? finite(sandbox.vcpus);
      const reportedMemory = finite(session.memory) ?? finite(sandbox.memory);
      const reportedTimeout = finite(session.timeout) ?? finite(sandbox.timeout);
      const reportedPolicy = policyMode(session.networkPolicy) ?? policyMode(sandbox.networkPolicy);
      if (sandbox.persistent !== false || reportedVcpus !== 1 || !reportedMemory || reportedMemory > SANDBOX_LIMITS.memoryMb || reportedTimeout !== SANDBOX_LIMITS.lifetimeMs || (reportedPolicy && reportedPolicy !== 'deny-all')) fail('RUNTIME_UNAVAILABLE');
      await abortable(sandbox.writeFiles([...files, { path: '/vercel/sandbox/source.bin', content: source.bytes, mode: 0o600 }], { signal: control.signal }), control.signal);
      if (control.signal.aborted) fail(control.signal.reason);
      const command = await abortable(sandbox.runCommand({ cmd: 'node', args: ['--max-old-space-size=128', '/vercel/sandbox/runner.js'], cwd: '/vercel/sandbox', env: {}, sudo: false, timeoutMs: SANDBOX_LIMITS.commandMs, signal: control.signal }), control.signal);
      if (command.exitCode !== 0) fail('CONVERSION_FAILED');
      const raw = JSON.parse((await readResult(sandbox, control.signal)).toString('utf8'));
      if (raw.status === 'error') fail(raw.code);
      if (raw.status !== 'ready' || raw.sourceSha256 !== source.sha256) fail('INVALID_GEOMETRY');
      if (!Number.isFinite(raw.guestMemoryBytes) || raw.guestMemoryBytes <= 0 || raw.guestMemoryBytes > SANDBOX_LIMITS.memoryMb * 1024 * 1024 * 1.05) fail('RUNTIME_UNAVAILABLE');
      const response = { schemaVersion: 1, status: 'ready', mode: 'sandbox-stock-occt-mesh-beta', source: { sha256: source.sha256, bytes: source.bytes.length, format: 'iges' },
        ...meshPayload(raw.meshes), requestedOutputUnit: 'millimeter',
        sourceConfidence: { status: 'unqualified', reason: 'Stock tessellation; source fidelity, dimensions and manufacturing use are not independently verified.' },
        execution: { boundary: 'sandbox-microvm', vcpus: reportedVcpus, memoryMb: reportedMemory, guestMemoryBytes: raw.guestMemoryBytes, cleanup: 'stopped' },
        unproven: ['STL export', 'render', 'source fidelity'] };
      if (Buffer.byteLength(JSON.stringify(response)) > LIMITS.outputBytes) fail('OUTPUT_LIMIT');
      return response;
    } catch (error) {
      if (control.signal.aborted) { if (!sandbox) cleanupBlocked = true; fail(control.signal.reason); }
      fail(error.code || 'RUNTIME_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      try { if (sandbox) await stop(sandbox); } finally { active = false; }
    }
  }
  return { convert, activeCount: () => Number(active), cleanupBlocked: () => cleanupBlocked };
}
module.exports = { createSandboxExecutor };
