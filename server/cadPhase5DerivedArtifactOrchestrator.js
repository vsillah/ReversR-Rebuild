// Source-only successor. Nothing imports or mounts this module in a runtime path.
// Its injected ports exist solely for deterministic contract qualification.
const { createHash } = require('node:crypto');
const { LIMITS, meshPayload } = require('./cadWorkerContract');

const OPERATION_BUDGET_MS = 800;
const CONVERSION_BUDGET_MS = LIMITS.timeoutMs + 500;
const { DERIVED_WARNING: WARNING } = require('./cadR2PrivateArtifactCustody');
const POLICY = Object.freeze({ schemaVersion: 1, maxRetries: 0, maxConcurrent: 1,
  reservationMicros: 1_000_000, budgetMicros: 9_000_000, timeoutMs: LIMITS.timeoutMs,
  maxCoordinateMagnitudeMm: 1_000_000, maxOutputBytes: LIMITS.outputBytes,
  conversionAuthorized: false, runtimeDispatchEnabled: false });
const RESULT_KEYS = new Set(['sourceDigest', 'units', 'meshes', 'stopped', 'cleanupConfirmed',
  'timedOut', 'oom', 'createdLate']);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const hash = value => createHash('sha256').update(value).digest('hex');
const deny = code => Object.freeze({ ok: false, code });
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.size && Object.keys(value).every(key => keys.has(key));

async function bounded(operation, parentSignal, budgetMs = OPERATION_BUDGET_MS) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timer;
  let onAbort;
  try {
    if (parentSignal?.aborted) throw new Error('CONVERSION_CANCELLED');
    parentSignal?.addEventListener('abort', abort, { once: true });
    const cancelled = new Promise((_, reject) => {
      onAbort = () => reject(new Error('CONVERSION_CANCELLED'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(abort, budgetMs);
    });
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), cancelled]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
}

function normalizeGeometry(meshes) {
  const payload = meshPayload(meshes);
  const normalized = payload.meshes.map(mesh => ({
    positions: mesh.positions.map(value => Object.is(value, -0) ? 0 : value),
    indices: [...mesh.indices],
  }));
  for (const mesh of normalized) {
    if (mesh.positions.some(value => Math.abs(value) > POLICY.maxCoordinateMagnitudeMm)) {
      throw new Error('GEOMETRY_BOUNDS_EXCEEDED');
    }
  }
  return Object.freeze({ meshes: normalized, vertexCount: payload.vertexCount,
    triangleCount: payload.triangleCount });
}

function number(value) {
  if (!Number.isFinite(value)) throw new Error('INVALID_GEOMETRY');
  const rounded = Number(value.toFixed(9));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function triangleNormal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0]];
  const length = Math.hypot(...cross);
  return length === 0 ? [0, 0, 0] : cross.map(value => value / length);
}

function createInspectionStl(geometry) {
  const solidName = 'reversr_inspection_geometry_mm__inspection_only__not_validated_for_manufacturing';
  const lines = [`solid ${solidName}`];
  for (const mesh of geometry.meshes) {
    for (let offset = 0; offset < mesh.indices.length; offset += 3) {
      const vertices = mesh.indices.slice(offset, offset + 3).map(index =>
        mesh.positions.slice(index * 3, index * 3 + 3));
      lines.push(`  facet normal ${triangleNormal(...vertices).map(number).join(' ')}`, '    outer loop');
      for (const vertex of vertices) lines.push(`      vertex ${vertex.map(number).join(' ')}`);
      lines.push('    endloop', '  endfacet');
    }
  }
  lines.push(`endsolid ${solidName}`, '');
  return Buffer.from(lines.join('\n'), 'utf8');
}

function createPreview(geometry, sourceDigest) {
  const record = { schemaVersion: 1, format: 'reversr-inspection-mesh-v1', units: 'millimeter',
    warning: WARNING, sourceDigest, vertexCount: geometry.vertexCount,
    triangleCount: geometry.triangleCount, meshes: geometry.meshes };
  return Buffer.from(JSON.stringify(record), 'utf8');
}

function projectJob(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !id(value.jobId)
    || !id(value.attemptId) || !id(value.artifactId) || !id(value.userId) || !id(value.shopId)
    || !id(value.uploadSessionId) || !digest(value.originalRestrictedDigest)
    || value.state !== 'converting' || value.conversionAuthorized !== false
    || value.conversionDispatchCount !== 0 || !Number.isSafeInteger(value.conversionGeneration)
    || value.conversionGeneration < 1) throw new Error('INVALID_JOB_CLAIM');
  return Object.freeze({ jobId: value.jobId, attemptId: value.attemptId, artifactId: value.artifactId,
    userId: value.userId, shopId: value.shopId, uploadSessionId: value.uploadSessionId,
    originalRestrictedDigest: value.originalRestrictedDigest,
    conversionGeneration: value.conversionGeneration });
}

function createCadPhase5DerivedArtifactOrchestrator({ enabled = false, jobs, custody, sandbox,
  now = Date.now } = {}) {
  const jobMethods = ['claimConversion', 'bindDerivedAndReady', 'quarantine',
    'quarantineByJobId', 'closeForRollback'];
  const custodyMethods = ['reserveArtifact', 'commitArtifact'];
  const reviewConfigured = enabled === true && jobMethods.every(name => typeof jobs?.[name] === 'function')
    && custodyMethods.every(name => typeof custody?.[name] === 'function')
    && typeof sandbox?.convert === 'function' && typeof now === 'function';
  const clock = () => { const value = now(); if (!time(value)) throw new Error('INVALID_CLOCK'); return value; };

  async function quarantine(job, code) {
    if (!job) return false;
    try {
      return await bounded(signal => jobs.quarantine(job.jobId, job.conversionGeneration,
        hash(code), clock(), { signal })) === true;
    } catch { return false; }
  }

  async function quarantineByJobId(jobId, code) {
    if (!id(jobId)) return false;
    try {
      return await bounded(signal => jobs.quarantineByJobId(jobId, hash(code), clock(),
        { signal })) === true;
    } catch { return false; }
  }

  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    routeMounted: false,
    bodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    runtimeConversionDispatchEnabled: false,
    downloadsRouted: false,
    maxRetries: 0,
    policy: POLICY,
    warning: WARNING,
    async closeForRollback({ signal } = {}) {
      try {
        if (!reviewConfigured) return deny('CONVERSION_UNAVAILABLE');
        const result = await bounded(s => jobs.closeForRollback(clock(), { signal: s }), signal);
        if (!result || result.closed !== true || result.conversionAuthorized !== false
          || JSON.stringify(result.order) !== JSON.stringify([
            'conversion-closed', 'sandboxes-stopped', 'uncertain-jobs-quarantined',
          ])) throw new Error('ROLLBACK_UNKNOWN');
        return Object.freeze({ ok: true, code: 'CONVERSION_ROLLBACK_CLOSED_FIRST',
          conversionAuthorized: false, order: Object.freeze([...result.order]) });
      } catch { return deny('CONVERSION_UNAVAILABLE'); }
    },
    async derive({ jobId, signal } = {}) {
      let job = null;
      let claimStarted = false;
      try {
        if (!reviewConfigured || !id(jobId)) return deny('CONVERSION_UNAVAILABLE');
        claimStarted = true;
        const claim = await bounded(s => jobs.claimConversion(jobId, Object.freeze({
          reservationMicros: POLICY.reservationMicros, budgetMicros: POLICY.budgetMicros,
          maxConcurrent: POLICY.maxConcurrent, maxRetries: 0, claimedAt: clock(),
        }), { signal: s }), signal);
        if (claim?.status === 'duplicate') return deny('CONVERSION_ALREADY_CLAIMED');
        if (claim?.status === 'terminal') return deny('CONVERSION_TERMINAL');
        if (claim?.status === 'rejected' && ['CONVERSION_QUOTA_EXHAUSTED',
          'CONVERSION_BUDGET_EXHAUSTED', 'CONVERSION_CONCURRENCY_LIMIT'].includes(claim.code)) {
          return deny(claim.code);
        }
        if (claim?.status !== 'claimed') throw new Error('CLAIM_UNKNOWN');
        job = projectJob(claim.job);

        const raw = await bounded(s => sandbox.convert(Object.freeze({ schemaVersion: 1,
          jobId: job.jobId, sourceArtifactId: job.artifactId,
          sourceDigest: job.originalRestrictedDigest, units: 'millimeter',
          networkDenied: true, persistenceDisabled: true, maxRetries: 0,
          limits: LIMITS }), { signal: s }), signal, CONVERSION_BUDGET_MS);
        if (!exact(raw, RESULT_KEYS) || raw.sourceDigest !== job.originalRestrictedDigest
          || raw.units !== 'millimeter' || raw.stopped !== true || raw.cleanupConfirmed !== true
          || raw.timedOut !== false || raw.oom !== false || raw.createdLate !== false) {
          throw new Error('SANDBOX_RESULT_REJECTED');
        }
        const geometry = normalizeGeometry(raw.meshes);
        const canonicalGeometry = JSON.stringify(geometry.meshes);
        const geometryDigest = hash(canonicalGeometry);
        const preview = createPreview(geometry, job.originalRestrictedDigest);
        const stl = createInspectionStl(geometry);
        if (!preview.length || !stl.length || preview.length > POLICY.maxOutputBytes
          || stl.length > POLICY.maxOutputBytes) throw new Error('OUTPUT_LIMIT');
        const previewDigest = hash(preview);
        const stlDigest = hash(stl);
        const owner = Object.freeze({ userId: job.userId, shopId: job.shopId,
          uploadSessionId: job.uploadSessionId });
        const common = { sourceArtifactId: job.artifactId, sourceDigest: job.originalRestrictedDigest,
          geometryDigest, units: 'millimeter', warning: WARNING };
        const previewReservation = await bounded(s => custody.reserveArtifact(owner, Object.freeze({
          ...common, kind: 'preview-geometry', format: 'application/vnd.reversr.preview+json',
          byteCount: preview.length, restrictedDigest: previewDigest,
        }), { signal: s }), signal);
        if (!previewReservation?.ok || !id(previewReservation.artifactId)) {
          throw new Error('PREVIEW_RESERVE_UNKNOWN');
        }
        const previewCommit = await bounded(s => custody.commitArtifact(owner,
          previewReservation.artifactId, preview, { signal: s }), signal);
        if (!previewCommit?.ok) throw new Error('PREVIEW_COMMIT_UNKNOWN');
        const stlReservation = await bounded(s => custody.reserveArtifact(owner, Object.freeze({
          ...common, kind: 'derived-stl', format: 'model/stl', byteCount: stl.length,
          restrictedDigest: stlDigest,
        }), { signal: s }), signal);
        if (!stlReservation?.ok || !id(stlReservation.artifactId)) {
          throw new Error('STL_RESERVE_UNKNOWN');
        }
        const stlCommit = await bounded(s => custody.commitArtifact(owner,
          stlReservation.artifactId, stl, { signal: s }), signal);
        if (!stlCommit?.ok) throw new Error('STL_COMMIT_UNKNOWN');
        const bound = await bounded(s => jobs.bindDerivedAndReady(job.jobId,
          job.conversionGeneration, Object.freeze({ previewArtifactId: previewReservation.artifactId,
            stlArtifactId: stlReservation.artifactId, geometryDigest, previewDigest, stlDigest,
            cleanupConfirmed: true, terminalAt: clock() }), { signal: s }), signal);
        if (bound !== true) throw new Error('READY_COMMIT_UNKNOWN');
        return Object.freeze({ ok: true, code: 'SOURCE_ONLY_DERIVED_READY', jobId: job.jobId,
          previewArtifactId: previewReservation.artifactId,
          stlArtifactId: stlReservation.artifactId, conversionDispatchCount: 0 });
      } catch (error) {
        const quarantined = job
          ? await quarantine(job, error?.message || 'conversion-unknown')
          : claimStarted && await quarantineByJobId(jobId, 'conversion-claim-unknown');
        return deny(quarantined ? 'CONVERSION_QUARANTINED' : 'CONVERSION_UNAVAILABLE');
      }
    },
  });
}

module.exports = { OPERATION_BUDGET_MS, CONVERSION_BUDGET_MS, POLICY, WARNING,
  createCadPhase5DerivedArtifactOrchestrator, createInspectionStl, createPreview, normalizeGeometry };
