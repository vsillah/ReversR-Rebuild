const express = require('express');
const { createHash, randomUUID, timingSafeEqual } = require('node:crypto');
const { createCadAuthenticatedIgsSessionVerifier } = require('./cadAuthenticatedIgsSessionVerifier');
const { createCadAuthenticatedIgsDurableClient }
  = require('./cadAuthenticatedIgsDurableClient');
const { createCadR2PrivateArtifactCustody, AUTHENTICATED_IGS_POLICY, DERIVED_WARNING }
  = require('./cadR2PrivateArtifactCustody');
const { createCadR2S3Provider } = require('./cadR2S3Provider');
const { createCadAuthenticatedIgsSandboxExecutor }
  = require('./cadAuthenticatedIgsSandboxExecutor');
const { authenticatedSandboxReadiness }
  = require('./cadAuthenticatedIgsSandboxConfig');
const { LIMITS } = require('./cadAuthenticatedIgsWorkerContract');
const { createInspectionStl, normalizeGeometry }
  = require('./cadPhase5DerivedArtifactOrchestrator');
const { inspectAuthenticatedIgesSource }
  = require('../utils/cadAuthenticatedIgesAdmission');
const { createCadAuthenticatedIgsPreflight, setAuthenticatedIgsCorsHeaders }
  = require('./cadAuthenticatedIgsCors');

const COOKIE = '__Host-reversr-upload-session';
const SESSION_LIFETIME_MS = 5 * 60 * 1000;
const BODY_TIMEOUT_MS = 10_000;
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'origin', 'content-length',
  'content-type', 'content-encoding', 'transfer-encoding', 'x-upload-csrf',
  'x-reversr-cad-extension', 'x-reversr-cad-content-sha256',
  'x-reversr-idempotency-key', 'x-reversr-download-grant']);
const hash = value => createHash('sha256').update(value).digest('hex');
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);

const ERRORS = Object.freeze({
  CAD_PREVIEW_DISABLED: [404, 'Authenticated CAD import is not available in this build.'],
  USER_SESSION_REQUIRED: [401, 'Sign in again to continue the CAD import.'],
  USER_UPLOAD_FORBIDDEN: [403, 'Your current shop plan does not include authenticated CAD import.'],
  ORIGIN_OR_CSRF_REJECTED: [403, 'The upload origin or request token was rejected.'],
  METHOD_NOT_ALLOWED: [405, 'Use the documented method for this endpoint.'],
  UPLOAD_MALFORMED: [400, 'Choose a valid standalone .igs or .iges file.'],
  UPLOAD_UNSUPPORTED: [415, 'Only standalone .igs and .iges files are accepted.'],
  UPLOAD_TOO_LARGE: [413, 'The CAD source exceeds the 8 MiB limit.'],
  UPLOAD_DIGEST_MISMATCH: [400, 'The CAD source did not match its upload commitment.'],
  UPLOAD_QUOTA_EXHAUSTED: [429, 'The shop CAD import quota is exhausted for this period.'],
  IDEMPOTENCY_CONFLICT: [409, 'This upload request key was already used for different input.'],
  CONVERSION_BUSY: [429, 'Another shop conversion is already running.'],
  CONVERSION_FAILED: [422, 'The CAD source could not be converted into review geometry.'],
  ARTIFACT_NOT_READY: [409, 'The requested private artifact is not ready.'],
  ARTIFACT_ACCESS_DENIED: [403, 'The private artifact grant is invalid or expired.'],
  CAD_RUNTIME_UNAVAILABLE: [503, 'Authenticated CAD import is temporarily unavailable.'],
});

const sendError = (res, code) => {
  const safeCode = Object.hasOwn(ERRORS, code) ? code : 'CAD_RUNTIME_UNAVAILABLE';
  const [status, message] = ERRORS[safeCode];
  return res.status(status).json({ schemaVersion: 1, status: 'error', code: safeCode, message });
};

function hasDuplicateSensitiveHeaders(req) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) return true;
  const seen = new Set();
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    const rawName = req.rawHeaders[index];
    if (typeof rawName !== 'string') return true;
    const name = rawName.toLowerCase();
    if (SENSITIVE_HEADERS.has(name) && seen.has(name)) return true;
    seen.add(name);
  }
  return false;
}

function createPreviewBytes(geometry) {
  return Buffer.from(JSON.stringify({ schemaVersion: 1, format: 'reversr-inspection-mesh-v1',
    units: 'millimeter', warning: DERIVED_WARNING, vertexCount: geometry.vertexCount,
    triangleCount: geometry.triangleCount, meshes: geometry.meshes.map((mesh, index) => ({
      name: `mesh-${index + 1}`, positions: mesh.positions, indices: mesh.indices,
    })) }), 'utf8');
}

function readExactBody(req, expectedBytes) {
  return new Promise((resolve, reject) => {
    let complete = false;
    let size = 0;
    let chunks = [];
    const finish = (error, value) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      for (const [event, listener] of listeners) req.removeListener(event, listener);
      if (error) {
        for (const chunk of chunks) chunk.fill(0);
        chunks = [];
        reject(error);
      } else resolve(value);
    };
    const failure = code => Object.assign(new Error(code), { code });
    const listeners = [
      ['data', chunk => {
        if (!Buffer.isBuffer(chunk)) return finish(failure('UPLOAD_MALFORMED'));
        size += chunk.length;
        if (size > expectedBytes || size > LIMITS.inputBytes) return finish(failure('UPLOAD_TOO_LARGE'));
        chunks.push(chunk);
      }],
      ['end', () => {
        if (size !== expectedBytes) return finish(failure('UPLOAD_MALFORMED'));
        finish(null, Buffer.concat(chunks, size));
        chunks = [];
      }],
      ['aborted', () => finish(failure('UPLOAD_MALFORMED'))],
      ['error', () => finish(failure('UPLOAD_MALFORMED'))],
      ['close', () => { if (!req.complete) finish(failure('UPLOAD_MALFORMED')); }],
    ];
    const timer = setTimeout(() => finish(failure('UPLOAD_MALFORMED')), BODY_TIMEOUT_MS);
    if (req.aborted || req.destroyed || req.readableEnded) return finish(failure('UPLOAD_MALFORMED'));
    for (const [event, listener] of listeners) req.on(event, listener);
  });
}

function uploadHeaders(req) {
  if (hasDuplicateSensitiveHeaders(req)) return { ok: false, code: 'UPLOAD_MALFORMED' };
  const extension = req.headers['x-reversr-cad-extension'];
  const contentSha256 = req.headers['x-reversr-cad-content-sha256'];
  const idempotencyKey = req.headers['x-reversr-idempotency-key'];
  const contentType = req.headers['content-type'];
  const contentLength = req.headers['content-length'];
  if (!['igs', 'iges'].includes(extension)) return { ok: false, code: 'UPLOAD_UNSUPPORTED' };
  if (!['model/iges', 'application/iges', 'application/octet-stream'].includes(contentType)) {
    return { ok: false, code: 'UPLOAD_UNSUPPORTED' };
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity'
    || req.headers['transfer-encoding'] !== undefined) return { ok: false, code: 'UPLOAD_UNSUPPORTED' };
  if (typeof contentLength !== 'string' || !/^[1-9][0-9]*$/.test(contentLength)) {
    return { ok: false, code: 'UPLOAD_MALFORMED' };
  }
  const byteCount = Number(contentLength);
  if (!Number.isSafeInteger(byteCount) || byteCount > LIMITS.inputBytes) {
    return { ok: false, code: 'UPLOAD_TOO_LARGE' };
  }
  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(idempotencyKey)) {
    return { ok: false, code: 'UPLOAD_MALFORMED' };
  }
  if (typeof contentSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(contentSha256)) {
    return { ok: false, code: 'UPLOAD_MALFORMED' };
  }
  return { ok: true, extension, contentSha256,
    idempotencyDigest: hash(idempotencyKey), byteCount,
    requestDigest: hash(`${extension}:${byteCount}:${contentSha256}`) };
}

function issuanceCookieAccepted(value) {
  if (value === undefined) return true;
  if (typeof value !== 'string' || value.length > 8192) return false;
  const cookies = value.split(';').map(part => part.trim()).filter(Boolean);
  if (cookies.length !== 1) return false;
  const prefix = `${COOKIE}=`;
  return cookies[0].startsWith(prefix)
    && /^us1\.[A-Za-z0-9_-]{43}$/.test(cookies[0].slice(prefix.length));
}

function issuanceBodyEmpty(req) {
  const contentLength = req.headers['content-length'];
  return req.headers['transfer-encoding'] === undefined
    && req.headers['content-encoding'] === undefined
    && (contentLength === undefined || contentLength === '0');
}

function uploadSessionCookie(credential, expiresAt, now = Date.now()) {
  if (typeof credential !== 'string' || !/^us1\.[A-Za-z0-9_-]{43}$/.test(credential)
    || !Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(now)) return null;
  const lifetimeMs = Math.min(SESSION_LIFETIME_MS, expiresAt - now);
  if (lifetimeMs < 1000) return null;
  return `${COOKIE}=${credential}; Max-Age=${Math.floor(lifetimeMs / 1000)}; Path=/; Secure; HttpOnly; SameSite=None`;
}

function clearUploadSessionCookie(res) {
  res.set('Set-Cookie', `${COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=None`);
}

function sessionError(code) {
  if (['SESSION_MISSING', 'SESSION_MALFORMED', 'SESSION_INVALID', 'SESSION_REVOKED',
    'SESSION_EXPIRED'].includes(code)) return 'USER_SESSION_REQUIRED';
  if (code === 'CAD_PERMISSION_REQUIRED') return 'USER_UPLOAD_FORBIDDEN';
  if (code === 'ORIGIN_OR_CSRF_REJECTED') return code;
  return 'CAD_RUNTIME_UNAVAILABLE';
}

function createCadAuthenticatedIgsRuntime({ env = process.env,
  durable = createCadAuthenticatedIgsDurableClient({ env }),
  provider = createCadR2S3Provider({ env }), executor } = {}) {
  const readiness = authenticatedSandboxReadiness(env);
  const sandbox = executor
    || (readiness.configured ? createCadAuthenticatedIgsSandboxExecutor({ env }) : null);
  if (!durable?.configured || !provider || !sandbox
    || typeof sandbox.convert !== 'function' || typeof sandbox.activeCount !== 'function'
    || typeof sandbox.cleanupBlocked !== 'function') {
    return Object.freeze({ configured: false, code: 'CAD_AUTHENTICATED_IGS_UNAVAILABLE' });
  }
  return Object.freeze({ configured: true, allowedOrigins: durable.allowedOrigins,
    sessionService: durable.sessionService, job: durable.job, executor: sandbox,
    createCustody(owner) {
      return createCadR2PrivateArtifactCustody({ enabled: true, runtimeEnabled: true, provider,
        store: durable.custodyStore(owner), policy: AUTHENTICATED_IGS_POLICY });
    } });
}

function createCadAuthenticatedIgsRouter({ runtime = createCadAuthenticatedIgsRuntime() } = {}) {
  const router = express.Router();
  const configured = runtime?.configured === true;
  const allowedOrigins = configured ? runtime.allowedOrigins : [];
  const verify = createCadAuthenticatedIgsSessionVerifier({
    lookupSession: configured ? runtime.sessionService.lookupSession : undefined,
    allowedOrigins,
    lookupTimeoutMs: 5000,
  });

  router.use(createCadAuthenticatedIgsPreflight({ configured, allowedOrigins }));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    setAuthenticatedIgsCorsHeaders(req, res, allowedOrigins);
    next();
  });

  router.post('/authenticated-upload-session', async (req, res) => {
    if (!configured) return sendError(res, 'CAD_PREVIEW_DISABLED');
    if (hasDuplicateSensitiveHeaders(req) || !allowedOrigins.includes(req.headers.origin)
      || typeof req.headers.authorization !== 'string'
      || !issuanceCookieAccepted(req.headers.cookie)) {
      if (req.headers.cookie !== undefined) clearUploadSessionCookie(res);
      return sendError(res, 'USER_SESSION_REQUIRED');
    }
    if (!issuanceBodyEmpty(req)) return sendError(res, 'UPLOAD_MALFORMED');
    const issued = await runtime.sessionService.issueSession({ authorization: req.headers.authorization }, {
      transport: 'cookie', lifetimeMs: SESSION_LIFETIME_MS,
    });
    if (!issued.ok) {
      if (req.headers.cookie !== undefined) clearUploadSessionCookie(res);
      return sendError(res, issued.code === 'AUTHORIZATION_REQUIRED'
        ? 'USER_SESSION_REQUIRED' : issued.code === 'CAD_PERMISSION_REQUIRED'
          ? 'USER_UPLOAD_FORBIDDEN' : 'CAD_RUNTIME_UNAVAILABLE');
    }
    const cookie = uploadSessionCookie(issued.credential, issued.expiresAt);
    if (!cookie) { clearUploadSessionCookie(res); return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
    res.set('Set-Cookie', cookie);
    return res.json({ schemaVersion: 1, status: 'success', session: {
      expiresAt: issued.expiresAt, csrfToken: issued.csrf,
    } });
  });

  async function verifyRequest(req, res) {
    if (!configured) { sendError(res, 'CAD_PREVIEW_DISABLED'); return null; }
    const result = await verify(req);
    if (!result.ok) {
      if (['SESSION_MALFORMED', 'SESSION_INVALID', 'SESSION_REVOKED',
        'SESSION_EXPIRED'].includes(result.code)) clearUploadSessionCookie(res);
      sendError(res, sessionError(result.code)); return null;
    }
    return result.principal;
  }

  router.post('/authenticated-import', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    const header = uploadHeaders(req);
    if (!header.ok) return sendError(res, header.code);
    const owner = Object.freeze({ userId: principal.userId, shopId: principal.shopId,
      uploadSessionId: principal.sessionId });
    const jobId = randomUUID();
    let claim;
    try {
      claim = await runtime.job.claim(owner, { jobId, idempotencyDigest: header.idempotencyDigest,
        requestDigest: header.requestDigest, extension: header.extension,
        contentLength: header.byteCount });
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
    if (!claim?.accepted) return sendError(res, claim?.code);
    if (claim.duplicate) return res.status(claim.job?.state === 'ready' ? 200 : 202)
      .json({ schemaVersion: 1, status: 'success', job: claim.job, duplicate: true });

    const custody = runtime.createCustody(owner);
    const storedArtifacts = [];
    let sourceBytes;
    let previewBytes;
    let stlBytes;
    let conversionClaimed = false;
    try {
      sourceBytes = await readExactBody(req, header.byteCount);
      const sourceDigest = hash(sourceBytes);
      if (!timingSafeEqual(Buffer.from(sourceDigest, 'hex'),
        Buffer.from(header.contentSha256, 'hex'))) {
        throw Object.assign(new Error('UPLOAD_DIGEST_MISMATCH'), {
          code: 'UPLOAD_DIGEST_MISMATCH',
        });
      }
      const inspection = inspectAuthenticatedIgesSource({
        fileName: `upload.${header.extension}`, bytes: sourceBytes,
      });
      if (!inspection.ok) throw Object.assign(new Error(inspection.code), { code: inspection.code === 'TOO_LARGE'
        ? 'UPLOAD_TOO_LARGE' : inspection.code === 'UNSUPPORTED' ? 'UPLOAD_UNSUPPORTED' : 'UPLOAD_MALFORMED' });
      const original = await custody.reserveArtifact(owner, { kind: 'original-igs', format: 'model/iges',
        byteCount: sourceBytes.length, restrictedDigest: sourceDigest });
      if (!original.ok) throw Object.assign(new Error(original.code), { code: 'CAD_RUNTIME_UNAVAILABLE' });
      const committedOriginal = await custody.commitArtifact(owner, original.artifactId, sourceBytes);
      if (!committedOriginal.ok) throw Object.assign(new Error(committedOriginal.code), { code: 'CAD_RUNTIME_UNAVAILABLE' });
      storedArtifacts.push(original.artifactId);
      if (!await runtime.job.attachOriginal(owner, jobId, original.artifactId)) throw new Error('CAD_RUNTIME_UNAVAILABLE');
      const conversion = await runtime.job.claimConversion(owner, jobId);
      if (!conversion?.accepted) throw Object.assign(new Error(conversion?.code), { code: conversion?.code });
      conversionClaimed = true;
      const converted = await runtime.executor.convert({ fileName: `upload.${header.extension}`,
        contentBase64: sourceBytes.toString('base64') });
      if (converted?.status !== 'ready' || converted.source?.sha256 !== sourceDigest
        || converted.execution?.cleanup !== 'stopped' || !Array.isArray(converted.meshes)) {
        throw new Error('CONVERSION_FAILED');
      }
      const geometry = normalizeGeometry(converted.meshes);
      const geometryDigest = hash(JSON.stringify(geometry.meshes));
      previewBytes = createPreviewBytes(geometry);
      stlBytes = createInspectionStl(geometry);
      if (!previewBytes.length || !stlBytes.length || previewBytes.length > LIMITS.outputBytes
        || stlBytes.length > LIMITS.outputBytes) throw new Error('CONVERSION_FAILED');
      const common = { sourceArtifactId: original.artifactId, sourceDigest, geometryDigest,
        units: 'millimeter', warning: DERIVED_WARNING };
      const preview = await custody.reserveArtifact(owner, { ...common, kind: 'preview-geometry',
        format: 'application/vnd.reversr.preview+json', byteCount: previewBytes.length,
        restrictedDigest: hash(previewBytes) });
      if (!preview.ok || !(await custody.commitArtifact(owner, preview.artifactId, previewBytes)).ok) {
        throw new Error('CAD_RUNTIME_UNAVAILABLE');
      }
      storedArtifacts.push(preview.artifactId);
      const stl = await custody.reserveArtifact(owner, { ...common, kind: 'derived-stl', format: 'model/stl',
        byteCount: stlBytes.length, restrictedDigest: hash(stlBytes) });
      if (!stl.ok || !(await custody.commitArtifact(owner, stl.artifactId, stlBytes)).ok) {
        throw new Error('CAD_RUNTIME_UNAVAILABLE');
      }
      storedArtifacts.push(stl.artifactId);
      if (!await runtime.job.complete(owner, jobId, { previewArtifactId: preview.artifactId,
        stlArtifactId: stl.artifactId, geometryDigest })) throw new Error('CAD_RUNTIME_UNAVAILABLE');
      const job = await runtime.job.read(principal.sessionId, jobId);
      return res.status(201).json({ schemaVersion: 1, status: 'success', job });
    } catch (error) {
      const unknownOutcome = conversionClaimed && runtime.executor.cleanupBlocked?.() === true;
      try { await runtime.job.fail(owner, jobId, unknownOutcome
        ? 'CONVERSION_OUTCOME_UNKNOWN' : String(error?.code || 'CONVERSION_FAILED'), unknownOutcome); } catch {}
      for (const artifactId of storedArtifacts.reverse()) {
        try { await custody.deleteArtifact(owner, artifactId); } catch {}
      }
      return sendError(res, error?.code === 'CONVERSION_BUSY' ? 'CONVERSION_BUSY'
        : ['UPLOAD_MALFORMED', 'UPLOAD_UNSUPPORTED', 'UPLOAD_TOO_LARGE',
          'UPLOAD_DIGEST_MISMATCH'].includes(error?.code)
          ? error.code : error?.code === 'UPLOAD_QUOTA_EXHAUSTED' ? error.code
            : error?.code === 'CAD_RUNTIME_UNAVAILABLE' || unknownOutcome
              ? 'CAD_RUNTIME_UNAVAILABLE' : 'CONVERSION_FAILED');
    } finally {
      sourceBytes?.fill(0); previewBytes?.fill(0); stlBytes?.fill(0);
    }
  });

  router.get('/authenticated-import/latest', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    try {
      const job = await runtime.job.latest(principal.sessionId);
      return res.json({ schemaVersion: 1, status: 'success', job });
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
  });

  router.get('/authenticated-import/:jobId', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    if (!safeId(req.params.jobId)) return sendError(res, 'UPLOAD_MALFORMED');
    try {
      const job = await runtime.job.read(principal.sessionId, req.params.jobId);
      return job ? res.json({ schemaVersion: 1, status: 'success', job })
        : sendError(res, 'USER_SESSION_REQUIRED');
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
  });

  router.post('/authenticated-import/:jobId/grants/:kind', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    if (!safeId(req.params.jobId) || !['original', 'preview', 'stl'].includes(req.params.kind)) {
      return sendError(res, 'UPLOAD_MALFORMED');
    }
    try {
      const packet = await runtime.job.artifacts(principal.sessionId, req.params.jobId);
      const artifactId = packet?.artifactIds?.[req.params.kind];
      if (!packet || !artifactId) return sendError(res, 'ARTIFACT_NOT_READY');
      const custody = runtime.createCustody(packet.owner);
      const grant = await custody.issueDownloadGrant(packet.owner, artifactId);
      if (!grant.ok) return sendError(res, 'ARTIFACT_ACCESS_DENIED');
      return res.json({ schemaVersion: 1, status: 'success', grant: { token: grant.token,
        expiresAt: grant.expiresAt,
        url: `/api/cad/authenticated-artifacts/${req.params.jobId}/${req.params.kind}` } });
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
  });

  router.get('/authenticated-artifacts/:jobId/:kind', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    const token = req.headers['x-reversr-download-grant'];
    if (hasDuplicateSensitiveHeaders(req) || !safeId(req.params.jobId)
      || !['original', 'preview', 'stl'].includes(req.params.kind)
      || typeof token !== 'string') return sendError(res, 'ARTIFACT_ACCESS_DENIED');
    try {
      const packet = await runtime.job.artifacts(principal.sessionId, req.params.jobId);
      const expectedArtifactId = packet?.artifactIds?.[req.params.kind];
      if (!expectedArtifactId) return sendError(res, 'ARTIFACT_NOT_READY');
      const artifact = await runtime.createCustody(packet.owner).readWithGrant(packet.owner, token);
      const expectedKind = { original: 'original-igs', preview: 'preview-geometry', stl: 'derived-stl' }[req.params.kind];
      if (!artifact.ok || artifact.artifactId !== expectedArtifactId || artifact.kind !== expectedKind) {
        artifact.bytes?.fill?.(0);
        return sendError(res, 'ARTIFACT_ACCESS_DENIED');
      }
      const names = { original: 'reversr-original.igs', preview: 'reversr-preview.json',
        stl: 'reversr-inspection-mesh.stl' };
      res.set('Content-Type', artifact.format);
      res.set('Content-Length', String(artifact.byteCount));
      res.set('Content-Disposition', `${req.params.kind === 'preview' ? 'inline' : 'attachment'}; filename="${names[req.params.kind]}"`);
      return res.send(artifact.bytes);
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
  });

  router.delete('/authenticated-import/:jobId', async (req, res) => {
    const principal = await verifyRequest(req, res);
    if (!principal) return;
    if (!safeId(req.params.jobId)) return sendError(res, 'UPLOAD_MALFORMED');
    try {
      const packet = await runtime.job.artifacts(principal.sessionId, req.params.jobId);
      if (!packet) return sendError(res, 'USER_SESSION_REQUIRED');
      const custody = runtime.createCustody(packet.owner);
      for (const kind of ['stl', 'preview', 'original']) {
        const artifactId = packet.artifactIds[kind];
        if (artifactId && !(await custody.deleteArtifact(packet.owner, artifactId)).ok) {
          return sendError(res, 'CAD_RUNTIME_UNAVAILABLE');
        }
      }
      if (!await runtime.job.deleted(principal.sessionId, req.params.jobId)) {
        return sendError(res, 'CAD_RUNTIME_UNAVAILABLE');
      }
      return res.json({ schemaVersion: 1, status: 'success', deleted: true });
    } catch { return sendError(res, 'CAD_RUNTIME_UNAVAILABLE'); }
  });

  router.all([
    '/authenticated-upload-session',
    '/authenticated-import',
    '/authenticated-import/latest',
    '/authenticated-import/:jobId',
    '/authenticated-import/:jobId/grants/:kind',
    '/authenticated-artifacts/:jobId/:kind',
  ], (_req, res) => sendError(res, 'METHOD_NOT_ALLOWED'));

  return router;
}

module.exports = { BODY_TIMEOUT_MS, COOKIE, SESSION_LIFETIME_MS,
  createCadAuthenticatedIgsRouter, createCadAuthenticatedIgsRuntime,
  createPreviewBytes, hasDuplicateSensitiveHeaders, issuanceBodyEmpty,
  issuanceCookieAccepted, readExactBody, uploadHeaders, uploadSessionCookie };
