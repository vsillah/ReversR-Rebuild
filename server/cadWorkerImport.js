const express = require('express');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { LIMITS, ERRORS, fail, failure, upload, meshPayload } = require('./cadWorkerContract');

// Qualification dependency injection is local code only, never request/environment data.
function createWorkerService({ makeWorker = options => new Worker(path.join(__dirname, 'cadMeshWorker.js'), options), timeoutMs = LIMITS.timeoutMs } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > LIMITS.timeoutMs) throw new Error('Invalid worker timeout');
  let active = 0;
  async function convert(body, signal) {
    const source = upload(body);
    if (signal?.aborted) fail('CANCELLED');
    if (active >= LIMITS.concurrency) fail('BUSY');
    active++;
    try {
      const result = await new Promise((resolve, reject) => {
        let worker, timer, settling = false;
        const abort = () => finish('CANCELLED');
        async function finish(code, value) {
          if (settling) return;
          settling = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          try {
            if (worker) await worker.terminate();
          } catch { code = 'RUNTIME_UNAVAILABLE'; }
          if (code) reject(Object.assign(new Error(code), { code })); else resolve(value);
        }
        try {
          worker = makeWorker({ workerData: { bytes: source.bytes }, env: {}, execArgv: [],
            resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }, stdout: true, stderr: true });
          // Drain without logging raw source or runtime diagnostics.
          worker.stdout?.resume(); worker.stderr?.resume();
          timer = setTimeout(() => finish('TIMEOUT'), timeoutMs);
          worker.once('message', raw => {
            try {
              if (typeof raw !== 'string' || Buffer.byteLength(raw) > LIMITS.outputBytes) fail('OUTPUT_LIMIT');
              const data = JSON.parse(raw);
              if (data?.status === 'error') fail(Object.hasOwn(ERRORS, data.code) ? data.code : 'CONVERSION_FAILED');
              if (data?.status !== 'ready') fail('CONVERSION_FAILED');
              const payload = meshPayload(data.meshes);
              const response = { schemaVersion: 1, status: 'ready', mode: 'stock-occt-mesh-qualification',
                source: { sha256: source.sha256, bytes: source.bytes.length, format: 'iges' },
                requestedOutputUnit: 'millimeter', ...payload,
                sourceConfidence: { status: 'unqualified', reason: 'Stock tessellation only; units, topology, dimensions and source fidelity are not independently verified.' },
                unproven: ['render', 'STL export', 'source fidelity', 'hosted execution', 'WASM memory isolation'] };
              if (Buffer.byteLength(JSON.stringify(response)) > LIMITS.outputBytes) fail('OUTPUT_LIMIT');
              finish(null, response);
            } catch (error) { finish(error.code || 'CONVERSION_FAILED'); }
          });
          worker.once('error', () => finish('RUNTIME_UNAVAILABLE'));
          worker.once('exit', () => finish('CONVERSION_FAILED'));
          signal?.addEventListener('abort', abort, { once: true });
          if (signal?.aborted) abort();
        } catch { finish('RUNTIME_UNAVAILABLE'); }
      });
      return result;
    } finally { active--; }
  }
  return { convert, activeCount: () => active };
}

// Not mounted by server/index.js: memory isolation must be qualified first.
function createWorkerRouter({ qualificationEnabled = false, service = createWorkerService() } = {}) {
  const router = express.Router();
  const sendError = (res, code) => { const body = failure(code); res.status(ERRORS[body.code][0]).json(body); };
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.post('/import', (req, res, next) => qualificationEnabled ? next() : sendError(res, 'DISABLED'),
    (req, res, next) => req.is('application/json') ? next() : sendError(res, 'UNSUPPORTED'),
    express.json({ limit: LIMITS.jsonBytes, strict: true, inflate: false }), async (req, res) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.once('aborted', abort);
      res.once('close', abort);
      if (req.aborted || res.destroyed) abort();
      try { const result = await service.convert(req.body, controller.signal); if (!res.destroyed) res.json(result); }
      catch (error) { if (!res.destroyed) sendError(res, error.code); }
      finally { req.removeListener('aborted', abort); res.removeListener('close', abort); }
    });
  router.use((error, req, res, next) => sendError(res, error.type === 'entity.too.large' ? 'TOO_LARGE' : error.status === 415 ? 'UNSUPPORTED' : 'MALFORMED'));
  return router;
}
module.exports = { createWorkerService, createWorkerRouter };
