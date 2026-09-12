const express = require('express');
const crypto = require('node:crypto');
const { LIMITS, ERRORS, failure } = require('./cadWorkerContract');
const { getCadReadiness } = require('./cadReadiness');
const { sandboxReadiness } = require('./cadSandboxConfig');
const { createSandboxExecutor } = require('./cadSandboxExecutor');
function createSandboxRouter({ env = process.env, executor = createSandboxExecutor({ env }) } = {}) {
  const router = express.Router();
  // Capture operator configuration once; requests cannot select or alter execution gates.
  const readiness = sandboxReadiness(env);
  const accessToken = env.CAD_SANDBOX_ACCESS_TOKEN || '';
  const authorized = value => {
    if (typeof value !== 'string' || value.length > 160) return false;
    const actual = Buffer.from(value), expected = Buffer.from(`Bearer ${accessToken}`);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  };
  const boundedDiagnostic = diagnostic => {
    if (!diagnostic || typeof diagnostic !== 'object' || Array.isArray(diagnostic)) return undefined;
    const serialized = JSON.stringify(diagnostic);
    if (serialized.length > 4096) return { truncated: true, bytes: serialized.length };
    return diagnostic;
  };
  const sendError = (res, code, diagnostic) => {
    const payload = failure(code);
    const safeDiagnostic = boundedDiagnostic(diagnostic);
    if (safeDiagnostic) payload.diagnostic = safeDiagnostic;
    res.status(ERRORS[payload.code][0]).json(payload);
  };
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/capabilities', (req, res) => {
    const cleanupBlocked = executor.cleanupBlocked?.();
    const configured = readiness.configured;
    const base = getCadReadiness();
    res.json({ ...base,
      enabled: configured && !cleanupBlocked, routeMounted: true, configured,
      mode: configured ? 'sandbox-stock-occt-mesh-beta' : 'sandbox-pending-qualification',
      workerQualification: { ...base.workerQualification, hostedPackagingQualified: configured,
        livePublicFixtureMatrixQualified: configured },
      executor: { kind: 'sandbox', authentication: readiness.credentials, liveQualification: readiness.liveQualification },
      proven: configured ? [
        ...base.proven,
        'Live hosted public fixture matrix converted five public IGES fixture inputs across seven successful Sandbox dispatches.',
        'Malformed, unsupported, auth and disabled-gate cases returned expected errors without hosted Sandbox dispatch.',
        'Each live hosted dispatch reported 1 vCPU, 2048 MB, deny-all networking, 60s lifetime and confirmed cleanup.',
      ] : base.proven,
      unproven: configured
        ? ['Private CAD readiness', 'Arbitrary-model source fidelity', 'Render and STL export', 'Dimensional/manufacturing certification']
        : ['Live Sandbox resource isolation, network denial and expiry', 'Hosted asset packaging and production smoke', 'Source fidelity, render and STL export'],
      blocker: cleanupBlocked ? { code: 'CLEANUP_FAILED', reason: 'Cleanup or creation outcome is uncertain; this instance is blocked.' } : configured ? null : { code: 'SANDBOX_GATE_MISSING', reason: 'Sandbox execution requires operator configuration and an approved live qualification.', missing: readiness.missing },
      sandbox: readiness,
      nextGate: configured
        ? 'Private CAD, arbitrary-model fidelity, render/STL claims and user-facing exposure remain separate gates requiring explicit approval and evidence.'
        : 'Approve and pass a live public-fixture diagnostic before attesting qualification, configuring the protected route and performing production smoke.',
    });
  });
  router.post('/import', (req, res, next) => {
    if (!readiness.configured) return sendError(res, 'DISABLED');
    if (!authorized(req.headers.authorization)) return sendError(res, 'UNAUTHORIZED');
    if (!req.is('application/json')) return sendError(res, 'UNSUPPORTED');
    next();
  }, express.json({ limit: LIMITS.jsonBytes, strict: true, inflate: false }), async (req, res) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    req.once('aborted', abort); res.once('close', abort);
    if (req.aborted || res.destroyed) abort();
    try { const result = await executor.convert(req.body, controller.signal); if (!res.destroyed) res.json(result); }
    catch (error) { if (!res.destroyed) sendError(res, error.code, error.diagnostic); }
    finally { req.removeListener('aborted', abort); res.removeListener('close', abort); }
  });
  router.use((error, req, res, next) => sendError(res, error.type === 'entity.too.large' ? 'TOO_LARGE' : error.status === 415 ? 'UNSUPPORTED' : 'MALFORMED'));
  return router;
}
module.exports = { createSandboxRouter };
