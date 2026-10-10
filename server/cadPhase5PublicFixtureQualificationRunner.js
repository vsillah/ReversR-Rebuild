// Source-only Package 7 integration prerequisite. Nothing imports this module
// from a route or runtime bootstrap. It accepts one checksum-pinned public
// fixture through an injected reader and never dispatches storage or conversion.
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { createCadConvexAuthWebSessionBinding } = require('./cadConvexAuthWebSessionBinding');
const { createCadPhase5OneShotOrchestrator, POLICY: ORCHESTRATION_POLICY }
  = require('./cadPhase5OneShotOrchestrator');
const { POLICY: CUSTODY_POLICY, DERIVED_WARNING } = require('./cadR2PrivateArtifactCustody');

const PUBLIC_FIXTURE = Object.freeze({
  schemaVersion: 1,
  id: 'cube',
  fileName: 'public-cube-10x10.igs',
  format: 'model/iges',
  sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
  byteCount: 11562,
  source: 'occt-import-js-package',
  public: true,
});
const PUBLIC_DERIVED_FIXTURE = Object.freeze({
  schemaVersion: 1,
  id: 'cube-derived-v1',
  sourceFixtureId: PUBLIC_FIXTURE.id,
  geometryDigest: '9'.repeat(64),
  preview: Object.freeze({
    format: 'application/vnd.reversr.preview+json',
    byteCount: 35,
    sha256: 'a3ac65b1d4c2113a1a39639992549ea059a0054a26e22701abfa9bf6425a27a2',
  }),
  stl: Object.freeze({
    format: 'model/stl',
    byteCount: 39,
    sha256: 'c2a74866fd70e130923dcfe7c358aa52d99607b2c098d7cf6fc8f3c93042e4c9',
  }),
  public: true,
});
const FIXTURE_ORIGIN = 'https://public-fixture.invalid';
const FIXTURE_HEADERS = Object.freeze({
  cookie: '__Host-reversr-public-fixture=source-only',
  origin: FIXTURE_ORIGIN,
  'x-upload-csrf': 'source-only-public-fixture',
  'idempotency-key': 'package7-public-fixture-cube-v1',
});
const FIXTURE_REQUEST = Object.freeze({ headers: FIXTURE_HEADERS,
  rawHeaders: Object.freeze(['Cookie', FIXTURE_HEADERS.cookie, 'Origin', FIXTURE_HEADERS.origin,
    'X-Upload-CSRF', FIXTURE_HEADERS['x-upload-csrf'],
    'Idempotency-Key', FIXTURE_HEADERS['idempotency-key']]) });
const REQUIRED_DURABLE_OPERATIONS = Object.freeze(['claimUpload', 'advanceUpload', 'reserveArtifact',
  'consumeQuota', 'transitionArtifact', 'readArtifact', 'reconcile', 'claimConversion', 'advanceConversion',
  'issueDownloadGrant', 'resolveDownloadGrant', 'closeForRollback']);
const QUALIFICATION_POLICY = Object.freeze({
  maxStoredBytes: CUSTODY_POLICY.maxStoredBytes,
  maxObjects: CUSTODY_POLICY.maxObjects,
  maxClassAOperations: CUSTODY_POLICY.maxClassAOperations,
  maxClassBOperations: CUSTODY_POLICY.maxClassBOperations,
  maxDeleteOperations: CUSTODY_POLICY.maxDeleteOperations,
});
const deny = code => Object.freeze({ ok: false, code });
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const sameOwner = (value, owner) => value?.userId === owner.userId && value?.shopId === owner.shopId
  && value?.uploadSessionId === owner.uploadSessionId;

function validFixture(value) {
  return exact(value, Object.keys(PUBLIC_FIXTURE))
    && Object.entries(PUBLIC_FIXTURE).every(([key, expected]) => value[key] === expected);
}

function exactDescriptor(value, expected) {
  if (!expected || typeof expected !== 'object') return value === expected;
  return exact(value, Object.keys(expected))
    && Object.entries(expected).every(([key, nested]) => exactDescriptor(value[key], nested));
}

function validDerivedInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const required = ['jobId', 'derivedFixture', 'previewBytes', 'stlBytes', 'cleanupConfirmed'];
  const allowed = new Set([...required, 'signal']);
  if (!required.every(key => Object.hasOwn(value, key))
    || Object.keys(value).some(key => !allowed.has(key))) return false;
  return id(value.jobId) && exactDescriptor(value.derivedFixture, PUBLIC_DERIVED_FIXTURE)
    && Buffer.isBuffer(value.previewBytes)
    && value.previewBytes.length === PUBLIC_DERIVED_FIXTURE.preview.byteCount
    && hash(value.previewBytes) === PUBLIC_DERIVED_FIXTURE.preview.sha256
    && Buffer.isBuffer(value.stlBytes)
    && value.stlBytes.length === PUBLIC_DERIVED_FIXTURE.stl.byteCount
    && hash(value.stlBytes) === PUBLIC_DERIVED_FIXTURE.stl.sha256
    && value.cleanupConfirmed === true;
}

function publicResult(code, extra = {}) {
  return Object.freeze({ ok: true, code, sourceOnly: true, publicFixtureOnly: true,
    routeMounted: false, sessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    providerDispatchEnabled: false, conversionDispatchEnabled: false, downloadRouteEnabled: false,
    maxRetries: 0, ...extra });
}

function createCadPhase5PublicFixtureQualificationRunner({
  enabled = false,
  fixture = PUBLIC_FIXTURE,
  readPublicFixture,
  webAuthOptions,
  sessionDigest,
  scopeKey,
  quotaScopeKey,
  authorityGeneration = 1,
  deploymentRef = 'package7-source-only',
  cohortRef = 'public-fixture-cube',
  evidenceDigest,
  retentionPolicyDigest,
  durable,
  now = Date.now,
} = {}) {
  const webAuth = createCadConvexAuthWebSessionBinding({ ...(webAuthOptions || {}),
    enabled: enabled === true });
  const durableReady = enabled === true && durable && typeof durable.call === 'function'
    && REQUIRED_DURABLE_OPERATIONS.every(name => durable.operations?.includes(name));
  const reviewConfigured = enabled === true && validFixture(fixture)
    && typeof readPublicFixture === 'function' && webAuth.reviewConfigured === true
    && webAuth.issuanceRouted === false && digest(sessionDigest) && id(scopeKey)
    && id(quotaScopeKey) && Number.isSafeInteger(authorityGeneration) && authorityGeneration > 0
    && id(deploymentRef) && id(cohortRef) && digest(evidenceDigest)
    && digest(retentionPolicyDigest) && durableReady && typeof now === 'function';
  const clock = () => { const value = now(); if (!time(value)) throw Error('FIXTURE_UNAVAILABLE'); return value; };
  const invoke = async (operation, args, signal) => {
    signal?.throwIfAborted?.();
    const value = await durable.call(operation, Object.freeze(args), { signal });
    signal?.throwIfAborted?.();
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.sourceOnly !== true || value.routeMounted !== false
      || value.bodyAdmissionAuthorized !== false || value.providerDispatchEnabled !== false
      || value.conversionDispatchEnabled !== false || value.downloadRouteEnabled !== false) {
      throw Error('DURABLE_RESULT_INVALID');
    }
    return value;
  };

  let principal = null;
  const reservations = new Map();
  const requirePrincipal = () => {
    if (!principal) throw Error('AUTHORIZATION_REQUIRED');
    return principal;
  };

  function custodyPort() {
    return Object.freeze({
      async reserveArtifact(owner, input, { signal } = {}) {
        if (!sameOwner(owner, requirePrincipal())) return deny('CUSTODY_DENIED');
        const createdAt = clock();
        const derived = input.kind === 'preview-geometry' || input.kind === 'derived-stl';
        const providerObjectKey = `phase5/${randomBytes(32).toString('hex')}`;
        const artifact = { schemaVersion: 1, artifactId: randomUUID(), ...owner, ...input,
          providerObjectKey, objectKeyDigest: hash(providerObjectKey), state: 'reserved', createdAt,
          retainedUntil: createdAt + (derived ? CUSTODY_POLICY.derivedRetentionMs
            : CUSTODY_POLICY.originalRetentionMs), generation: 1 };
        const reserved = await invoke('reserveArtifact', { scopeKey: quotaScopeKey, owner,
          artifact, policy: QUALIFICATION_POLICY, now: createdAt }, signal);
        if (reserved.accepted !== true) return deny(reserved.code === 'CUSTODY_QUOTA_EXHAUSTED'
          ? 'CUSTODY_QUOTA_EXHAUSTED' : 'CUSTODY_DENIED');
        reservations.set(artifact.artifactId, Object.freeze({ owner: { ...owner },
          byteCount: input.byteCount, restrictedDigest: input.restrictedDigest,
          retainedUntil: artifact.retainedUntil }));
        return Object.freeze({ ok: true, code: 'ARTIFACT_RESERVED', artifactId: artifact.artifactId,
          retainedUntil: artifact.retainedUntil });
      },
      async commitArtifact(owner, artifactId, bytes, { signal } = {}) {
        if (!sameOwner(owner, requirePrincipal()) || !Buffer.isBuffer(bytes)
          || (!id(artifactId))) return deny('CUSTODY_DENIED');
        const reservation = reservations.get(artifactId);
        if (!reservation || !sameOwner(reservation.owner, owner)
          || reservation.byteCount !== bytes.length
          || reservation.restrictedDigest !== hash(bytes)) return deny('CUSTODY_DENIED');
        const record = await invoke('readArtifact', { artifactId, owner }, signal);
        if (record.accepted !== true || record.state !== 'reserved'
          || record.byteCount !== bytes.length) return deny('CUSTODY_DENIED');
        const quota = await invoke('consumeQuota', { scopeKey: quotaScopeKey, owner,
          operation: 'class-a', count: 1, policy: QUALIFICATION_POLICY, now: clock() }, signal);
        if (quota.accepted !== true) return deny(quota.code === 'CUSTODY_QUOTA_EXHAUSTED'
          ? 'CUSTODY_QUOTA_EXHAUSTED' : 'CUSTODY_DENIED');
        const stored = await invoke('transitionArtifact', { artifactId, owner,
          expectedGeneration: record.generation, transition: 'stored', now: clock() }, signal);
        if (stored.accepted !== true) return deny('CUSTODY_UNKNOWN');
        reservations.delete(artifactId);
        return Object.freeze({ ok: true, code: 'ARTIFACT_STORED', artifactId,
            byteCount: bytes.length, retainedUntil: reservation.retainedUntil });
      },
    });
  }

  function controlsPort() {
    const attemptsByIdempotency = new Map();
    return Object.freeze({
      async claim(record, policy, { signal } = {}) {
        const attemptId = `fixture-attempt-${record.idempotencyDigest.slice(0, 24)}`;
        const claimed = await invoke('claimUpload', { scopeKey,
          attempt: { ...record, attemptId }, policy: { maxAttempts: policy.maxAttempts,
            maxConcurrent: policy.maxConcurrent, budgetMicros: policy.budgetMicros } }, signal);
        if (claimed.attemptId) attemptsByIdempotency.set(record.idempotencyDigest,
          { attemptId: claimed.attemptId, fence: claimed.fence });
        if (claimed.accepted === true) return { status: 'claimed', attemptId: claimed.attemptId,
          fence: claimed.fence };
        if (claimed.status === 'quarantined') return { status: 'quarantined',
          attemptId: claimed.attemptId, fence: claimed.fence };
        if (claimed.status === 'duplicate' || claimed.replayed === true) return {
          status: 'duplicate', attemptId: claimed.attemptId, fence: claimed.fence };
        return { status: 'rejected', code: claimed.code };
      },
      async markBodyAccepted(attemptId, fence, body, updatedAt, { signal } = {}) {
        const updated = await invoke('advanceUpload', { attemptId, owner: requirePrincipal(), fence,
          command: 'body-accepted', now: updatedAt, byteCount: body.byteCount,
          restrictedDigest: body.restrictedDigest }, signal);
        return updated.accepted === true;
      },
      async bindArtifactAndJob(attemptId, fence, binding, { signal } = {}) {
        const updated = await invoke('advanceUpload', { attemptId, owner: requirePrincipal(), fence,
          command: 'admitted', now: binding.admittedAt, artifactId: binding.artifactId,
          jobId: binding.jobId }, signal);
        return updated.accepted === true;
      },
      async quarantine(attemptId, fence, reasonDigest, updatedAt, { signal } = {}) {
        const updated = await invoke('advanceUpload', { attemptId, owner: requirePrincipal(), fence,
          command: 'quarantined', now: updatedAt, reasonDigest }, signal);
        return updated.accepted === true;
      },
      async quarantineByIdempotency(idempotencyDigest, reasonDigest, updatedAt, { signal } = {}) {
        const known = attemptsByIdempotency.get(idempotencyDigest);
        if (!known) return false;
        return this.quarantine(known.attemptId, known.fence, reasonDigest, updatedAt, { signal });
      },
      async closeForRollback(updatedAt, { signal } = {}) {
        const owner = requirePrincipal();
        const closed = await invoke('closeForRollback', { scopeKey, userId: owner.userId,
          shopId: owner.shopId, uploadSessionId: owner.uploadSessionId,
          reasonDigest: hash('package7-public-fixture-rollback'), now: updatedAt }, signal);
        if (closed.accepted !== true) return null;
        return { closed: true, bodyAdmissionAuthorized: false,
          order: ['admission-closed', 'grants-revoked', 'unknown-quarantined'] };
      },
    });
  }

  const custody = custodyPort();
  const controls = controlsPort();
  const orchestrator = createCadPhase5OneShotOrchestrator({
    enabled: reviewConfigured,
    request: FIXTURE_REQUEST,
    controls,
    custody,
    now: clock,
    async authenticate(_headers, { signal } = {}) {
      const session = await webAuth.lookupSession(sessionDigest, { signal });
      if (!session || session.status !== 'active' || session.cadUploadAllowed !== true
        || session.expiresAt <= clock()) return null;
      principal = Object.freeze({ userId: session.userId, shopId: session.shopId,
        uploadSessionId: session.sessionId, authorityGeneration, expiresAt: session.expiresAt });
      return principal;
    },
    async readAdmissionEvidence(owner, { signal } = {}) {
      signal?.throwIfAborted?.();
      if (!sameOwner(owner, requirePrincipal())) return null;
      return Object.freeze({ deploymentRef, cohortRef, evidenceDigest, retentionPolicyDigest,
        active: true, expiresAt: owner.expiresAt, bodyAdmissionAuthorized: true,
        conversionAuthorized: false });
    },
    async readBodyOnce({ maxBytes, signal } = {}) {
      signal?.throwIfAborted?.();
      const bytes = await readPublicFixture(Object.freeze({ ...PUBLIC_FIXTURE }), { signal });
      signal?.throwIfAborted?.();
      if (!Buffer.isBuffer(bytes) || bytes.length !== PUBLIC_FIXTURE.byteCount
        || bytes.length > maxBytes || hash(bytes) !== PUBLIC_FIXTURE.sha256) {
        throw Error('PUBLIC_FIXTURE_INVALID');
      }
      return Object.freeze({ fileName: PUBLIC_FIXTURE.fileName, bytes });
    },
  });

  async function preparePublicFixture({ signal } = {}) {
    try {
      if (!reviewConfigured) return deny('PUBLIC_FIXTURE_UNAVAILABLE');
      const prepared = await orchestrator.prepareOneShot({ signal });
      if (!prepared.ok) return deny(prepared.code);
      return publicResult('PUBLIC_FIXTURE_ADMISSION_PREPARED', {
        fixtureId: PUBLIC_FIXTURE.id, attemptId: prepared.attemptId,
        artifactId: prepared.artifactId, jobId: prepared.jobId,
        conversionAuthorized: false,
      });
    } catch { return deny('PUBLIC_FIXTURE_UNAVAILABLE'); }
  }

  async function qualifyDerivedState(input = {}) {
    let owner = null;
    let claimedGeneration = null;
    try {
      if (!reviewConfigured || !validDerivedInput(input)) {
        return deny('PUBLIC_FIXTURE_DERIVED_INVALID');
      }
      const { jobId, previewBytes, stlBytes, signal } = input;
      const geometryDigest = PUBLIC_DERIVED_FIXTURE.geometryDigest;
      owner = requirePrincipal();
      const job = await invoke('reconcile', { kind: 'job', key: jobId, userId: owner.userId,
        shopId: owner.shopId, uploadSessionId: owner.uploadSessionId }, signal);
      if (job.accepted !== true || job.state !== 'admitted' || !id(job.artifactId)) {
        return deny('PUBLIC_FIXTURE_CONVERSION_DENIED');
      }
      const original = await invoke('readArtifact', { artifactId: job.artifactId, owner }, signal);
      if (original.accepted !== true || original.state !== 'stored') {
        return deny('PUBLIC_FIXTURE_CONVERSION_DENIED');
      }
      const claimed = await invoke('claimConversion', { scopeKey, jobId, owner,
        expectedGeneration: job.generation, now: clock() }, signal);
      if (claimed.accepted !== true) return deny(claimed.code);
      claimedGeneration = claimed.generation;
      const common = { sourceArtifactId: original.artifactId, sourceDigest: PUBLIC_FIXTURE.sha256,
        geometryDigest, units: 'millimeter', warning: DERIVED_WARNING };
      const preview = await custody.reserveArtifact(owner, { ...common, kind: 'preview-geometry',
        format: 'application/vnd.reversr.preview+json', byteCount: previewBytes.length,
        restrictedDigest: hash(previewBytes) }, { signal });
      if (!preview.ok || !(await custody.commitArtifact(owner, preview.artifactId,
        previewBytes, { signal })).ok) throw Error('PREVIEW_CUSTODY_UNKNOWN');
      const stl = await custody.reserveArtifact(owner, { ...common, kind: 'derived-stl',
        format: 'model/stl', byteCount: stlBytes.length, restrictedDigest: hash(stlBytes) }, { signal });
      if (!stl.ok || !(await custody.commitArtifact(owner, stl.artifactId, stlBytes, { signal })).ok) {
        throw Error('STL_CUSTODY_UNKNOWN');
      }
      const ready = await invoke('advanceConversion', { jobId, owner,
        expectedGeneration: claimedGeneration, command: 'ready', now: clock(),
        previewArtifactId: preview.artifactId, stlArtifactId: stl.artifactId,
        geometryDigest, previewDigest: hash(previewBytes), stlDigest: hash(stlBytes),
        cleanupConfirmed: true }, signal);
      if (ready.accepted !== true) throw Error('READY_STATE_UNKNOWN');
      return publicResult('PUBLIC_FIXTURE_DERIVED_STATE_READY', { fixtureId: PUBLIC_FIXTURE.id,
        jobId, originalArtifactId: original.artifactId, stlArtifactId: stl.artifactId,
        previewArtifactId: preview.artifactId, cleanupConfirmed: true });
    } catch {
      if (owner && Number.isSafeInteger(claimedGeneration)) {
        try {
          await invoke('advanceConversion', { jobId, owner,
            expectedGeneration: claimedGeneration, command: 'quarantined', now: clock(),
            reasonDigest: hash('package7-public-fixture-derived-unknown') }, signal);
        } catch { /* Rollback-first closure remains the recovery owner. */ }
      }
      return deny('PUBLIC_FIXTURE_CONVERSION_UNAVAILABLE');
    }
  }

  async function qualifyDownloadGrant({ artifactId, grantDigest, signal } = {}) {
    try {
      if (!reviewConfigured || !id(artifactId) || !digest(grantDigest)) {
        return deny('PUBLIC_FIXTURE_GRANT_INVALID');
      }
      const owner = requirePrincipal();
      const artifact = await invoke('readArtifact', { artifactId, owner }, signal);
      if (artifact.accepted !== true || artifact.state !== 'stored') return deny('CUSTODY_DENIED');
      const issuedAt = clock();
      const granted = await invoke('issueDownloadGrant', { grantDigest, artifactId, owner,
        artifactGeneration: artifact.generation, issuedAt,
        expiresAt: Math.min(issuedAt + 60_000, artifact.retainedUntil) }, signal);
      if (granted.accepted !== true) return deny(granted.code);
      const resolved = await invoke('resolveDownloadGrant', { grantDigest, owner, now: clock() }, signal);
      if (resolved.accepted !== true || resolved.artifactId !== artifactId) return deny('CUSTODY_DENIED');
      return publicResult('PUBLIC_FIXTURE_GRANT_QUALIFIED', { artifactId,
        expiresAt: granted.expiresAt });
    } catch { return deny('PUBLIC_FIXTURE_GRANT_UNAVAILABLE'); }
  }

  async function resolveDownloadGrant({ grantDigest, owner, signal } = {}) {
    try {
      if (!reviewConfigured || !digest(grantDigest) || !sameOwner(owner, requirePrincipal())) {
        return deny('CUSTODY_DENIED');
      }
      const resolved = await invoke('resolveDownloadGrant', { grantDigest, owner, now: clock() }, signal);
      return resolved.accepted === true
        ? publicResult('PUBLIC_FIXTURE_GRANT_PRESENT', { artifactId: resolved.artifactId })
        : deny('CUSTODY_DENIED');
    } catch { return deny('CUSTODY_DENIED'); }
  }

  async function closeForRollback({ signal } = {}) {
    try {
      if (!reviewConfigured) return deny('PUBLIC_FIXTURE_UNAVAILABLE');
      const closed = await orchestrator.closeForRollback({ signal });
      return closed.ok ? publicResult('PUBLIC_FIXTURE_ROLLBACK_CLOSED_FIRST', {
        order: closed.order }) : deny('PUBLIC_FIXTURE_UNAVAILABLE');
    } catch { return deny('PUBLIC_FIXTURE_UNAVAILABLE'); }
  }

  return Object.freeze({
    sourceOnly: true,
    configured: false,
    reviewConfigured,
    qualificationMounted: reviewConfigured,
    routeMounted: false,
    sessionIssuanceEnabled: false,
    bodyAdmissionAuthorized: false,
    providerDispatchEnabled: false,
    conversionDispatchEnabled: false,
    downloadRouteEnabled: false,
    privateCadAuthorized: false,
    maxRetries: 0,
    fixture: PUBLIC_FIXTURE,
    derivedFixture: PUBLIC_DERIVED_FIXTURE,
    preparePublicFixture,
    qualifyDerivedState,
    qualifyDownloadGrant,
    resolveDownloadGrant,
    closeForRollback,
  });
}

module.exports = { PUBLIC_FIXTURE, PUBLIC_DERIVED_FIXTURE, REQUIRED_DURABLE_OPERATIONS,
  createCadPhase5PublicFixtureQualificationRunner };
