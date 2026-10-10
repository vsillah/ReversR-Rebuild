// Source-only successor. No route, body parser, provider, custody runtime,
// conversion executor, environment selector, or default instance imports this module.
const { createHash, randomUUID } = require('node:crypto');
const { inspectIgesFileName, inspectIgesSource, IGES_SOURCE_MAX_BYTES } = require('../utils/igesAdmission');

const OPERATION_BUDGET_MS = 800;
const POLICY = Object.freeze({ schemaVersion: 1, reservationMicros: 500_000,
  budgetMicros: 9_000_000, maxAttempts: 4, maxConcurrent: 1, maxRetries: 0,
  maxBodyBytes: IGES_SOURCE_MAX_BYTES, conversionAuthorized: false });
const HEADER_KEYS = new Set(['cookie', 'origin', 'x-upload-csrf', 'idempotency-key']);
const PRINCIPAL_KEYS = new Set(['userId', 'shopId', 'uploadSessionId', 'authorityGeneration', 'expiresAt']);
const EVIDENCE_KEYS = new Set(['deploymentRef', 'cohortRef', 'evidenceDigest', 'retentionPolicyDigest',
  'active', 'expiresAt', 'bodyAdmissionAuthorized', 'conversionAuthorized']);
const fail = () => { throw new Error('ORCHESTRATION_UNAVAILABLE'); };
const deny = code => Object.freeze({ ok: false, code });
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.size && Object.keys(value).every(key => keys.has(key));
const hash = value => createHash('sha256').update(value).digest('hex');

function snapshotHeaders(request) {
  const headers = request?.headers;
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) fail();
  if (Object.keys(headers).some(key => !HEADER_KEYS.has(key.toLowerCase()))) fail();
  const values = {};
  for (const key of HEADER_KEYS) {
    const value = headers[key];
    if (typeof value !== 'string' || !value || value.length > 8192 || /[\r\n]/.test(value)) fail();
    values[key] = value;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(values['idempotency-key'])) fail();
  if (!Array.isArray(request.rawHeaders) || request.rawHeaders.length % 2) fail();
  const counts = Object.fromEntries([...HEADER_KEYS].map(key => [key, 0]));
  for (let i = 0; i < request.rawHeaders.length; i += 2) {
    const key = request.rawHeaders[i]?.toLowerCase();
    const value = request.rawHeaders[i + 1];
    if (!HEADER_KEYS.has(key) || typeof value !== 'string' || value !== values[key]) fail();
    counts[key] += 1;
  }
  if (Object.values(counts).some(count => count !== 1)) fail();
  return Object.freeze(values);
}

function projectPrincipal(value, now) {
  if (!exact(value, PRINCIPAL_KEYS) || !id(value.userId) || !id(value.shopId)
    || !id(value.uploadSessionId) || !Number.isSafeInteger(value.authorityGeneration)
    || value.authorityGeneration < 1 || !time(value.expiresAt) || value.expiresAt <= now) return null;
  return Object.freeze({ ...value });
}

function projectEvidence(value, now) {
  if (!exact(value, EVIDENCE_KEYS) || !id(value.deploymentRef) || !id(value.cohortRef)
    || !digest(value.evidenceDigest) || !digest(value.retentionPolicyDigest)
    || typeof value.active !== 'boolean' || !time(value.expiresAt)
    || value.bodyAdmissionAuthorized !== true || value.conversionAuthorized !== false) return null;
  if (!value.active || value.expiresAt <= now) return null;
  return Object.freeze({ ...value });
}

async function bounded(operation, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timer;
  let onAbort;
  try {
    if (parentSignal?.aborted) fail();
    parentSignal?.addEventListener('abort', abort, { once: true });
    const cancelled = new Promise((_, reject) => {
      onAbort = () => reject(new Error('ORCHESTRATION_UNAVAILABLE'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(abort, OPERATION_BUDGET_MS);
    });
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), cancelled]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
}

function createCadPhase5OneShotOrchestrator({ enabled = false, request, authenticate,
  readAdmissionEvidence, controls, custody, readBodyOnce, now = Date.now } = {}) {
  const controlMethods = ['claim', 'markBodyAccepted', 'bindArtifactAndJob', 'quarantine',
    'quarantineByIdempotency', 'closeForRollback'];
  const custodyMethods = ['reserveArtifact', 'commitArtifact'];
  let headers = null;
  const dependenciesReady = enabled === true && controlMethods.every(name => typeof controls?.[name] === 'function')
    && custodyMethods.every(name => typeof custody?.[name] === 'function')
    && typeof authenticate === 'function' && typeof readAdmissionEvidence === 'function'
    && typeof readBodyOnce === 'function' && typeof now === 'function';
  if (dependenciesReady) {
    try { headers = snapshotHeaders(request); } catch { /* Closed below. */ }
  }
  const reviewConfigured = Boolean(dependenciesReady && headers);
  const clock = () => { const value = now(); if (!time(value)) fail(); return value; };

  async function quarantine(attemptId, fence, code) {
    if (!id(attemptId) || !Number.isSafeInteger(fence) || fence < 1) return;
    try {
      await bounded(signal => controls.quarantine(attemptId, fence, hash(code), clock(), { signal }));
    } catch { /* Remain denied; independent reconciliation owns this record. */ }
  }

  async function quarantineByIdempotency(idempotencyDigest, code) {
    if (!digest(idempotencyDigest)) return;
    try {
      await bounded(signal => controls.quarantineByIdempotency(idempotencyDigest,
        hash(code), clock(), { signal }));
    } catch { /* Independent reconciliation still owns an absent or ambiguous claim. */ }
  }

  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    routeMounted: false,
    bodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    conversionDispatchEnabled: false,
    maxRetries: 0,
    policy: POLICY,
    async closeForRollback({ signal } = {}) {
      try {
        if (!reviewConfigured) return deny('ORCHESTRATION_UNAVAILABLE');
        const result = await bounded(s => controls.closeForRollback(clock(), { signal: s }), signal);
        if (!result || result.closed !== true || result.bodyAdmissionAuthorized !== false
          || JSON.stringify(result.order) !== JSON.stringify([
            'admission-closed', 'grants-revoked', 'unknown-quarantined',
          ])) fail();
        return Object.freeze({ ok: true, code: 'ROLLBACK_CLOSED_FIRST',
          bodyAdmissionAuthorized: false, order: Object.freeze([...result.order]) });
      } catch { return deny('ORCHESTRATION_UNAVAILABLE'); }
    },
    async prepareOneShot({ signal } = {}) {
      let claim = null;
      let artifactId = null;
      let idempotencyDigest = null;
      let claimStarted = false;
      try {
        if (!reviewConfigured) return deny('ORCHESTRATION_UNAVAILABLE');
        const checkedAt = clock();
        const principal = projectPrincipal(await bounded(s => authenticate(headers, { signal: s }), signal), checkedAt);
        if (!principal) return deny('AUTHORIZATION_REQUIRED');
        const evidence = projectEvidence(await bounded(s => readAdmissionEvidence(principal,
          { signal: s }), signal), clock());
        if (!evidence || evidence.expiresAt > principal.expiresAt) return deny('ADMISSION_EVIDENCE_REQUIRED');
        idempotencyDigest = hash(headers['idempotency-key']);
        claimStarted = true;
        claim = await bounded(s => controls.claim(Object.freeze({ schemaVersion: 1,
          idempotencyDigest, userId: principal.userId, shopId: principal.shopId,
          uploadSessionId: principal.uploadSessionId, authorityGeneration: principal.authorityGeneration,
          deploymentRef: evidence.deploymentRef, cohortRef: evidence.cohortRef,
          evidenceDigest: evidence.evidenceDigest, retentionPolicyDigest: evidence.retentionPolicyDigest,
          reservationMicros: POLICY.reservationMicros, maxRetries: 0,
          expiresAt: Math.min(principal.expiresAt, evidence.expiresAt), createdAt: clock(),
        }), POLICY, { signal: s }), signal);
        if (claim?.status === 'rejected' && ['ORCHESTRATION_QUOTA_EXHAUSTED',
          'ORCHESTRATION_BUDGET_EXHAUSTED', 'ORCHESTRATION_CONCURRENCY_LIMIT'].includes(claim.code)) {
          return deny(claim.code);
        }
        if (!claim || !['claimed', 'duplicate', 'quarantined'].includes(claim.status)
          || !id(claim.attemptId) || !Number.isSafeInteger(claim.fence) || claim.fence < 1) fail();
        if (claim.status === 'duplicate') return deny('IDEMPOTENCY_REPLAYED');
        if (claim.status === 'quarantined') return deny('ORCHESTRATION_QUARANTINED');

        const body = await bounded(s => readBodyOnce({ maxBytes: POLICY.maxBodyBytes, signal: s }), signal);
        if (!body || typeof body !== 'object' || Array.isArray(body)
          || Object.keys(body).sort().join(',') !== 'bytes,fileName' || !Buffer.isBuffer(body.bytes)) {
          await quarantine(claim.attemptId, claim.fence, 'body-invalid');
          return deny('BODY_REJECTED');
        }
        const file = inspectIgesFileName(body.fileName);
        const source = file.ok ? inspectIgesSource({ fileName: body.fileName, bytes: body.bytes }) : file;
        if (!source.ok) {
          await quarantine(claim.attemptId, claim.fence, 'body-rejected');
          return deny('BODY_REJECTED');
        }
        const restrictedDigest = hash(body.bytes);
        const marked = await bounded(s => controls.markBodyAccepted(claim.attemptId, claim.fence,
          Object.freeze({ byteCount: body.bytes.byteLength, restrictedDigest }), clock(), { signal: s }), signal);
        if (marked !== true) throw new Error('BODY_COMMIT_UNKNOWN');
        const reserved = await custody.reserveArtifact(Object.freeze({ userId: principal.userId,
          shopId: principal.shopId, uploadSessionId: principal.uploadSessionId }), Object.freeze({
          kind: 'original-igs', format: 'model/iges', byteCount: body.bytes.byteLength, restrictedDigest,
        }), { signal });
        if (!reserved?.ok || !id(reserved.artifactId)) {
          await quarantine(claim.attemptId, claim.fence, 'custody-reserve-unknown');
          return deny(reserved?.code === 'CUSTODY_QUOTA_EXHAUSTED'
            ? 'ORCHESTRATION_QUOTA_EXHAUSTED' : 'ORCHESTRATION_QUARANTINED');
        }
        artifactId = reserved.artifactId;
        const committed = await custody.commitArtifact(Object.freeze({ userId: principal.userId,
          shopId: principal.shopId, uploadSessionId: principal.uploadSessionId }), artifactId,
        body.bytes, { signal });
        if (!committed?.ok) {
          await quarantine(claim.attemptId, claim.fence, 'custody-commit-unknown');
          return deny('ORCHESTRATION_QUARANTINED');
        }
        const jobId = randomUUID();
        const bound = await bounded(s => controls.bindArtifactAndJob(claim.attemptId, claim.fence,
          Object.freeze({ artifactId, jobId, conversionAuthorized: false, conversionDispatchCount: 0,
            conversionClaimCount: 0, conversionGeneration: 0, originalRestrictedDigest: restrictedDigest,
            admittedAt: clock() }), { signal: s }), signal);
        if (bound !== true) throw new Error('JOB_COMMIT_UNKNOWN');
        return Object.freeze({ ok: true, code: 'SOURCE_ONLY_JOB_PREPARED', attemptId: claim.attemptId,
          artifactId, jobId, conversionAuthorized: false, conversionDispatchCount: 0 });
      } catch {
        if (claim?.status === 'claimed') await quarantine(claim.attemptId, claim.fence,
          artifactId ? 'job-commit-unknown' : 'orchestration-unknown');
        else if (claimStarted) await quarantineByIdempotency(idempotencyDigest, 'claim-unknown');
        return deny(claim?.status === 'claimed' ? 'ORCHESTRATION_QUARANTINED' : 'ORCHESTRATION_UNAVAILABLE');
      }
    },
  });
}

module.exports = { OPERATION_BUDGET_MS, POLICY, createCadPhase5OneShotOrchestrator };
