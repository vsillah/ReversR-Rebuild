const { IGES_SOURCE_MAX_BYTES, inspectIgesSource } = require('./igesAdmission');
const QUALIFICATION_QUERY_KEY = 'cadQualification';
const QUALIFICATION_QUERY_VALUE = 'synthetic-igs-v1';
const QUALIFICATION_STATE_KEY = 'reversr:synthetic-igs-qualification:v2';
const MAX_SOURCE_BYTES = IGES_SOURCE_MAX_BYTES;

const cubePositions = Object.freeze([
  -5, 0, -5, 5, 0, -5, 5, 10, -5, -5, 10, -5,
  -5, 0, 5, 5, 0, 5, 5, 10, 5, -5, 10, 5,
]);
const cubeIndices = Object.freeze([
  0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
  0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
  0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7,
]);

function createSyntheticInspectionStl() {
  const facets = [];
  for (let index = 0; index < cubeIndices.length; index += 3) {
    facets.push('  facet normal 0 0 0', '    outer loop');
    for (let offset = 0; offset < 3; offset += 1) {
      const vertex = cubeIndices[index + offset] * 3;
      facets.push(`      vertex ${cubePositions[vertex]} ${cubePositions[vertex + 1]} ${cubePositions[vertex + 2]}`);
    }
    facets.push('    endloop', '  endfacet');
  }
  return `solid reversr_synthetic_inspection_mesh_mm\n${facets.join('\n')}\nendsolid reversr_synthetic_inspection_mesh_mm\n`;
}

function closed(code, message = 'The local synthetic qualification stopped safely.') {
  return Object.freeze({ ok: false, code, message });
}

function inspectSyntheticIgsQualification(locationLike) {
  const hostname = String(locationLike?.hostname || '').trim().toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    return Object.freeze({ enabled: false, code: 'LOCALHOST_REQUIRED' });
  }
  const query = new URLSearchParams(String(locationLike?.search || ''));
  if (query.get(QUALIFICATION_QUERY_KEY) !== QUALIFICATION_QUERY_VALUE) {
    return Object.freeze({ enabled: false, code: 'QUALIFICATION_NOT_REQUESTED' });
  }
  return Object.freeze({ enabled: true, code: 'SYNTHETIC_IGS_QUALIFICATION_READY' });
}

function igesRow(body, section, sequence) {
  const text = String(body || '');
  if (text.length > 72 || !/^[SGDPT]$/.test(section) || !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('SYNTHETIC_SOURCE_GENERATION_FAILED');
  }
  return `${text.padEnd(72, ' ')}${section}${String(sequence).padStart(7, ' ')}`;
}

function createSyntheticIgsSource() {
  const rows = [
    igesRow('ReversR generated offline synthetic qualification source', 'S', 1),
    igesRow('1H,,1H;,6HREVERSR,18HSYNTHETIC FIXTURE;', 'G', 1),
    igesRow('     100       1       0       0       0       0       0       000000001', 'D', 1),
    igesRow('     100       0       0       1       0       0       0       0       0', 'D', 2),
    igesRow('100,0.,0.,0.,5.;', 'P', 1),
    igesRow('S      1G      1D      2P      1', 'T', 1),
  ];
  return Object.freeze({
    fileName: 'generated-synthetic-qualification.igs',
    mimeType: 'model/iges',
    bytes: new TextEncoder().encode(`${rows.join('\n')}\n`),
  });
}

function validateSyntheticIgsUpload(source) {
  const inspection = inspectIgesSource(source);
  if (inspection.ok) return Object.freeze({ ...inspection, message: 'Shared IGES admission passed.' });
  const messages = {
    extension: 'Only .igs or .iges input is accepted.',
    size: 'The generated IGS source exceeds the local qualification limit.',
    'external-reference': 'External-reference IGES sources are not accepted.',
  };
  return Object.freeze({ ...inspection,
    message: messages[inspection.reason] || 'The generated IGS source is malformed.' });
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle || !(bytes instanceof Uint8Array)) throw new Error('DIGEST_UNAVAILABLE');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function createVolatileCadCustody() {
  const records = new Map();
  let sequence = 0;
  return Object.freeze({
    async put(source) {
      const validation = validateSyntheticIgsUpload(source);
      if (!validation.ok) throw Object.assign(new Error(validation.code), { code: validation.code });
      sequence += 1;
      const handle = `synthetic-custody-${sequence}`;
      records.set(handle, { fileName: source.fileName, bytes: new Uint8Array(source.bytes) });
      return Object.freeze({ handle, sourceBytes: source.bytes.byteLength });
    },
    async read(handle) {
      const record = records.get(handle);
      if (!record) throw Object.assign(new Error('CUSTODY_RECORD_MISSING'), { code: 'CUSTODY_RECORD_MISSING' });
      return Object.freeze({ fileName: record.fileName, bytes: new Uint8Array(record.bytes) });
    },
    async remove(handle) {
      const record = records.get(handle);
      if (!record) return false;
      record.bytes.fill(0);
      records.delete(handle);
      return true;
    },
    isEmpty() { return records.size === 0; },
  });
}

function createBrowserSyntheticAccountSessionAdapter() {
  let used = false;
  return Object.freeze({
    async authenticate() {
      if (used) throw Object.assign(new Error('ACCOUNT_SESSION_ALREADY_USED'), { code: 'ACCOUNT_SESSION_ALREADY_USED' });
      used = true;
      return Object.freeze({ userRef: 'synthetic-user', accountSessionRef: 'synthetic-account-session', authMethod: 'offline-fixture' });
    },
  });
}

function createBrowserSyntheticUploadSessionAdapter() {
  let used = false;
  return Object.freeze({
    async issue(principal) {
      if (used || principal?.authMethod !== 'offline-fixture' || principal?.accountSessionRef !== 'synthetic-account-session') {
        throw Object.assign(new Error('UPLOAD_SESSION_DENIED'), { code: 'UPLOAD_SESSION_DENIED' });
      }
      used = true;
      return Object.freeze({ uploadSessionRef: 'synthetic-upload-session', accountSessionRef: principal.accountSessionRef, maxAttempts: 1, retries: 0 });
    },
  });
}

function createDeterministicSyntheticInspectionAdapter() {
  let used = false;
  return Object.freeze({
    async convert({ source, uploadSession, signal }) {
      if (used || signal?.aborted || uploadSession?.maxAttempts !== 1 || uploadSession?.retries !== 0) {
        throw Object.assign(new Error(signal?.aborted ? 'QUALIFICATION_CANCELLED' : 'CONVERSION_FENCE_CLOSED'),
          { code: signal?.aborted ? 'QUALIFICATION_CANCELLED' : 'CONVERSION_FENCE_CLOSED' });
      }
      used = true;
      const validation = validateSyntheticIgsUpload(source);
      if (!validation.ok) throw Object.assign(new Error(validation.code), { code: validation.code });
      const sourceSha256 = await sha256Hex(source.bytes);
      const stl = createSyntheticInspectionStl();
      const stlSha256 = await sha256Hex(new TextEncoder().encode(stl));
      return Object.freeze({
        fixture: Object.freeze({
          fixtureName: 'Synthetic session IGS result',
          sourceFileName: 'Generated synthetic IGS source',
          sourceAssetUrl: '',
          referenceImageUrl: '',
          referenceImages: Object.freeze([]),
          sourcePackage: 'ReversR deterministic synthetic inspection adapter',
          sourceLicense: 'Generated synthetic fixture',
          format: 'IGES',
          bytes: source.bytes.byteLength,
          sha256: sourceSha256,
          units: 'millimeter',
          expectedDimensions: Object.freeze([10, 10, 10]),
          importedBoundingBox: Object.freeze({
            min: Object.freeze([-5, 0, -5]),
            max: Object.freeze([5, 10, 5]),
            size: Object.freeze([10, 10, 10]),
          }),
          meshes: 1,
          vertices: 8,
          triangles: 12,
          sourceConfidence: 'Deterministic synthetic inspection only · real IGES geometry converter unqualified',
          previewGeometry: Object.freeze({
            kind: 'mesh',
            sha256: stlSha256,
            vertices: 8,
            triangles: 12,
            meshes: Object.freeze([Object.freeze({ name: 'Synthetic inspection cube', positions: cubePositions, indices: cubeIndices })]),
          }),
          derivedInspectionStl: Object.freeze({
            content: stl,
            sha256: stlSha256,
            fileName: 'reversr-synthetic-inspection-mesh-mm.stl',
          }),
          qualificationProvenance: Object.freeze({
            kind: 'synthetic-igs-local',
            accountSessionAdapter: 'browser-only-synthetic',
            uploadSessionAdapter: 'browser-only-synthetic',
            conversionAdapter: 'deterministic-fixed-cube-synthetic',
            productionAuthenticationQualified: false,
            realGeometryConverterQualified: false,
          }),
          warnings: Object.freeze([
            'Generated synthetic input only; no private or proprietary CAD was used.',
            'Browser-only account and upload-session adapters are not production authentication.',
            'The fixed-cube inspection adapter is not a real IGES geometry converter.',
            'Inspection preview and STL are not dimensional or manufacturing certification.',
            'Production upload, hosted conversion, and provider dispatch remain disabled.',
          ]),
        }),
        output: Object.freeze({ kind: 'deterministic-synthetic-inspection-preview-stl', meshCount: 1, triangleCount: 12, stlSha256 }),
      });
    },
  });
}

function safeTerminalState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.schemaVersion !== 1 || value.attemptConsumed !== true
    || !['processing', 'ready', 'error'].includes(value.status)
    || typeof value.code !== 'string' || !/^[A-Z0-9_]{3,80}$/.test(value.code)
    || typeof value.runRef !== 'string' || !/^synthetic-run-[a-z0-9-]{1,64}$/.test(value.runRef)
    || typeof value.cleanupVerified !== 'boolean' || typeof value.unknownOutcome !== 'boolean'
    || (value.status === 'processing' && (value.cleanupVerified !== false || value.unknownOutcome !== false))
    || (value.status === 'ready' && (value.code !== 'SYNTHETIC_IGS_QUALIFIED'
      || value.cleanupVerified !== true || value.unknownOutcome !== false))) return null;
  return Object.freeze({ schemaVersion: 1, status: value.status, code: value.code,
    runRef: value.runRef, attemptConsumed: true, cleanupVerified: value.cleanupVerified,
    unknownOutcome: value.unknownOutcome });
}

function corruptDurableState() {
  return Object.freeze({ schemaVersion: 1, status: 'error', code: 'CORRUPT_DURABLE_STATE_NO_RETRY',
    runRef: 'synthetic-run-durable-state', attemptConsumed: true, cleanupVerified: false, unknownOutcome: true });
}

function createDurableQualificationStateStore(storage, key = QUALIFICATION_STATE_KEY) {
  return Object.freeze({
    read() {
      try {
        if (typeof storage?.getItem !== 'function') return corruptDurableState();
        const raw = storage.getItem(key);
        if (raw === null) return null;
        const safe = safeTerminalState(JSON.parse(raw));
        return safe || corruptDurableState();
      } catch { return corruptDurableState(); }
    },
    write(value) {
      const safe = safeTerminalState(value);
      if (!safe || typeof storage?.setItem !== 'function') throw new Error('STATE_PERSISTENCE_UNAVAILABLE');
      storage.setItem(key, JSON.stringify(safe));
      return safe;
    },
  });
}

function createMemoryQualificationStateStore(initial = null) {
  let value = safeTerminalState(initial);
  return Object.freeze({ read: () => value, write: next => { value = safeTerminalState(next); if (!value) throw new Error('STATE_INVALID'); return value; } });
}

function createRunRef(randomId) {
  const raw = typeof randomId === 'function' ? randomId() : globalThis.crypto?.randomUUID?.();
  const safe = String(raw || 'local').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48) || 'local';
  return `synthetic-run-${safe}`;
}

function createSyntheticIgsQualificationPipeline({
  stateStore = createMemoryQualificationStateStore(),
  custody = createVolatileCadCustody(),
  accountSession = createBrowserSyntheticAccountSessionAdapter(),
  uploadSession = createBrowserSyntheticUploadSessionAdapter(),
  converter = createDeterministicSyntheticInspectionAdapter(),
  sourceFactory = createSyntheticIgsSource,
  randomId,
} = {}) {
  let persisted = stateStore.read();
  const persist = value => {
    const safe = safeTerminalState(value);
    if (!safe) throw new Error('STATE_INVALID');
    persisted = safe;
    stateStore.write(safe);
    return safe;
  };
  if (persisted?.status === 'processing') {
    const recovered = { ...persisted, status: 'error', code: 'RESTARTED_AFTER_INFLIGHT_NO_RETRY', cleanupVerified: false, unknownOutcome: true };
    try { persist(recovered); } catch { persisted = Object.freeze({ ...recovered, code: 'STATE_PERSISTENCE_UNAVAILABLE' }); }
  }
  let running = false;
  const status = () => persisted || Object.freeze({ schemaVersion: 1, status: 'idle', code: 'READY',
    runRef: null, attemptConsumed: false, cleanupVerified: true, unknownOutcome: false });
  return Object.freeze({
    status,
    async run({ signal } = {}) {
      if (persisted?.attemptConsumed || running) return closed('ATTEMPT_ALREADY_CONSUMED', 'This local session already used its single qualification attempt.');
      running = true;
      const runRef = createRunRef(randomId);
      try {
        persist({ schemaVersion: 1, status: 'processing', code: 'ATTEMPT_CONSUMED', runRef,
          attemptConsumed: true, cleanupVerified: false, unknownOutcome: false });
      } catch {
        running = false;
        persisted = Object.freeze({ schemaVersion: 1, status: 'error', code: 'STATE_PERSISTENCE_UNAVAILABLE', runRef,
          attemptConsumed: true, cleanupVerified: true, unknownOutcome: false });
        return closed('STATE_PERSISTENCE_UNAVAILABLE', 'The one-attempt fence could not be persisted, so no source was admitted.');
      }
      let handle = null;
      let conversion = null;
      let failure = null;
      try {
        if (signal?.aborted) throw Object.assign(new Error('QUALIFICATION_CANCELLED'), { code: 'QUALIFICATION_CANCELLED' });
        const principal = await accountSession.authenticate();
        const session = await uploadSession.issue(principal);
        const source = sourceFactory();
        const validation = validateSyntheticIgsUpload(source);
        if (!validation.ok) throw Object.assign(new Error(validation.code), { code: validation.code });
        const custodyReceipt = await custody.put(source);
        handle = custodyReceipt.handle;
        const admitted = await custody.read(handle);
        conversion = await converter.convert({ source: admitted, uploadSession: session, signal });
      } catch (error) {
        failure = typeof error?.code === 'string' && /^[A-Z0-9_]{3,80}$/.test(error.code)
          ? error.code : 'QUALIFICATION_FAILED_NO_RETRY';
      }
      let cleanupVerified = false;
      try {
        if (handle) await custody.remove(handle);
        cleanupVerified = custody.isEmpty();
      } catch { cleanupVerified = false; }
      running = false;
      if (!cleanupVerified) {
        try { persist({ ...persisted, status: 'error', code: 'CLEANUP_UNKNOWN_NO_RETRY', cleanupVerified: false, unknownOutcome: true }); }
        catch { persisted = Object.freeze({ ...persisted, status: 'error', code: 'STATE_PERSISTENCE_UNAVAILABLE', cleanupVerified: false, unknownOutcome: true }); }
        return closed('CLEANUP_UNKNOWN_NO_RETRY', 'Cleanup could not be verified. This session is closed with no retry.');
      }
      if (failure || !conversion?.fixture || conversion?.output?.kind !== 'deterministic-synthetic-inspection-preview-stl') {
        const code = failure || 'CONVERSION_OUTPUT_REJECTED_NO_RETRY';
        try { persist({ ...persisted, status: 'error', code, cleanupVerified: true, unknownOutcome: true }); }
        catch { persisted = Object.freeze({ ...persisted, status: 'error', code: 'STATE_PERSISTENCE_UNAVAILABLE', cleanupVerified: true, unknownOutcome: true }); }
        return closed(code, 'The synthetic qualification stopped safely. Cleanup was verified and this session cannot retry.');
      }
      try { persist({ ...persisted, status: 'ready', code: 'SYNTHETIC_IGS_QUALIFIED', cleanupVerified: true, unknownOutcome: false }); }
      catch {
        persisted = Object.freeze({ ...persisted, status: 'error', code: 'STATE_PERSISTENCE_UNAVAILABLE', cleanupVerified: true, unknownOutcome: true });
        return closed('STATE_PERSISTENCE_UNAVAILABLE', 'The terminal state could not be persisted. Cleanup was verified and this session cannot retry.');
      }
      return Object.freeze({ ok: true, code: persisted.code, fixture: conversion.fixture,
        receipt: Object.freeze({ schemaVersion: 1, runRef,
          accountSessionAdapter: 'browser-only-synthetic', uploadSessionAdapter: 'browser-only-synthetic-one-attempt',
          productionAuthentication: 'unqualified', validation: 'shared-iges-admission-passed',
          conversionAdapter: 'deterministic-fixed-cube-synthetic', realGeometryConverter: 'unqualified',
          cleanup: 'verified', retries: 0 }) });
    },
  });
}

module.exports = {
  MAX_SOURCE_BYTES,
  QUALIFICATION_QUERY_KEY,
  QUALIFICATION_QUERY_VALUE,
  QUALIFICATION_STATE_KEY,
  createMemoryQualificationStateStore,
  createBrowserSyntheticAccountSessionAdapter,
  createBrowserSyntheticUploadSessionAdapter,
  createDeterministicSyntheticInspectionAdapter,
  createDurableQualificationStateStore,
  createSyntheticIgsQualificationPipeline,
  createSyntheticIgsSource,
  createVolatileCadCustody,
  inspectSyntheticIgsQualification,
  validateSyntheticIgsUpload,
};
