// Browser-only synthetic client contract. No transport, route, credential, provider,
// storage, conversion, or download-grant implementation is reachable from this module.
const { createSyntheticIgsSource } = require('./igsPrivatePipelineQualification');
const { createPublicCubeDerivedStl } = require('./igsImportJourney');

const AUTHENTICATED_IMPORT_QUERY_VALUE = 'authenticated-import-v1';
const AUTHENTICATED_IMPORT_STATE_KEY = 'reversr:authenticated-import-qualification:v1';
const SOURCE_SHA256 = '6a33a42c62b839e57244df6412ffdf755aabbeedae372aa9223483bb9611e0f4';
const STL_SHA256 = 'd0fa57561304b96d122815cac8ff2b09e56be785dcaadce23d70b63577418150';
const SOURCE_CHOICES = new Set(['file', 'sample']);
const STATUSES = new Set(['idle', 'selected', 'uploading', 'processing', 'ready',
  'recoverable-error', 'unknown', 'deleted']);
const STATE_KEYS = new Set(['schemaVersion', 'status', 'code', 'sourceChoice', 'attemptConsumed',
  'cleanupVerified', 'artifactsAvailable']);
const FORBIDDEN_QUERY_KEYS = ['account', 'artifact', 'grant', 'owner', 'shop', 'token', 'user'];
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.size && Object.keys(value).every(key => keys.has(key));
const frozen = value => Object.freeze(value);
const bytesEqual = (left, right) => left instanceof Uint8Array && right instanceof Uint8Array
  && left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
const initial = () => frozen({ schemaVersion: 1, status: 'idle', code: 'SOURCE_REQUIRED',
  sourceChoice: null, attemptConsumed: false, cleanupVerified: true, artifactsAvailable: false });

function safeState(value) {
  if (!exact(value, STATE_KEYS) || value.schemaVersion !== 1 || !STATUSES.has(value.status)
    || typeof value.code !== 'string' || !/^[A-Z0-9_]{3,80}$/.test(value.code)
    || !(value.sourceChoice === null || SOURCE_CHOICES.has(value.sourceChoice))
    || typeof value.attemptConsumed !== 'boolean' || typeof value.cleanupVerified !== 'boolean'
    || typeof value.artifactsAvailable !== 'boolean') return null;
  const valid = {
    idle: value.sourceChoice === null && !value.attemptConsumed && value.cleanupVerified && !value.artifactsAvailable,
    selected: SOURCE_CHOICES.has(value.sourceChoice) && !value.attemptConsumed && value.cleanupVerified && !value.artifactsAvailable,
    uploading: SOURCE_CHOICES.has(value.sourceChoice) && value.attemptConsumed && !value.cleanupVerified && !value.artifactsAvailable,
    processing: SOURCE_CHOICES.has(value.sourceChoice) && value.attemptConsumed && !value.cleanupVerified && !value.artifactsAvailable,
    ready: SOURCE_CHOICES.has(value.sourceChoice) && value.attemptConsumed && value.cleanupVerified && value.artifactsAvailable,
    'recoverable-error': !value.attemptConsumed && value.cleanupVerified && !value.artifactsAvailable,
    unknown: value.attemptConsumed && !value.cleanupVerified && !value.artifactsAvailable,
    deleted: value.attemptConsumed && value.cleanupVerified && !value.artifactsAvailable,
  }[value.status];
  return valid ? frozen({ ...value }) : null;
}

function corruptState() {
  return frozen({ schemaVersion: 1, status: 'unknown', code: 'STATE_UNKNOWN_NO_RETRY',
    sourceChoice: null, attemptConsumed: true, cleanupVerified: false, artifactsAvailable: false });
}

function createAuthenticatedImportStateStore(storage, key = AUTHENTICATED_IMPORT_STATE_KEY) {
  return frozen({
    read() {
      try {
        if (typeof storage?.getItem !== 'function') return corruptState();
        const raw = storage.getItem(key);
        if (raw === null) return null;
        return safeState(JSON.parse(raw)) || corruptState();
      } catch { return corruptState(); }
    },
    write(value) {
      const state = safeState(value);
      if (!state || typeof storage?.setItem !== 'function') throw new Error('STATE_PERSISTENCE_UNAVAILABLE');
      storage.setItem(key, JSON.stringify(state)); return state;
    },
  });
}

function createMemoryStateStore(seed = null) {
  let state = seed === null ? null : safeState(seed);
  return frozen({ read: () => state, write(value) {
    state = safeState(value); if (!state) throw new Error('STATE_INVALID'); return state;
  } });
}

function inspectAuthenticatedImportQualification(locationLike) {
  const hostname = String(locationLike?.hostname || '').trim().toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) return frozen({ enabled: false, code: 'LOCALHOST_REQUIRED' });
  const query = new URLSearchParams(String(locationLike?.search || ''));
  if (query.get('cadQualification') !== AUTHENTICATED_IMPORT_QUERY_VALUE
    || query.get('cadAuth') !== 'synthetic') return frozen({ enabled: false, code: 'QUALIFICATION_NOT_REQUESTED' });
  if (FORBIDDEN_QUERY_KEYS.some(key => query.has(key))) return frozen({ enabled: false, code: 'SENSITIVE_QUERY_REJECTED' });
  return frozen({ enabled: true, code: 'AUTHENTICATED_IMPORT_QUALIFICATION_READY' });
}

function buildArtifacts(sourceChoice) {
  if (!SOURCE_CHOICES.has(sourceChoice)) throw new Error('SOURCE_REQUIRED');
  const source = createSyntheticIgsSource();
  const originalBytes = new Uint8Array(source.bytes);
  const stl = createPublicCubeDerivedStl();
  const stlBytes = new TextEncoder().encode(stl);
  return frozen({
    original: frozen({ kind: 'original-igs', fileName: sourceChoice === 'file'
      ? 'generated-authenticated-qualification.igs' : 'included-generated-sample.iges',
    format: 'model/iges', bytes: originalBytes, byteCount: originalBytes.byteLength, sha256: SOURCE_SHA256 }),
    stl: frozen({ kind: 'derived-stl', fileName: 'reversr-synthetic-inspection-mesh-mm.stl',
      format: 'model/stl', bytes: stlBytes, content: stl, byteCount: stlBytes.byteLength,
      sha256: STL_SHA256 }),
  });
}

function buildFixture(sourceChoice) {
  const artifacts = buildArtifacts(sourceChoice);
  return frozen({
    fixtureName: 'Authenticated synthetic IGS review', sourceFileName: artifacts.original.fileName,
    sourceAssetUrl: '', referenceImageUrl: '', referenceImages: frozen([]),
    sourcePackage: 'ReversR browser-only authenticated client qualification',
    sourceLicense: 'Generated synthetic fixture', format: 'IGES', bytes: artifacts.original.byteCount,
    sha256: artifacts.original.sha256, units: 'millimeter', expectedDimensions: frozen([10, 10, 10]),
    importedBoundingBox: frozen({ min: frozen([-5, 0, -5]), max: frozen([5, 10, 5]),
      size: frozen([10, 10, 10]) }), meshes: 1, vertices: 8, triangles: 12,
    sourceConfidence: 'Synthetic authenticated client contract',
    previewGeometry: frozen({ kind: 'box', normalizedScale: frozen([1, 1, 1]) }),
    derivedInspectionStl: frozen({ content: artifacts.stl.content, sha256: artifacts.stl.sha256,
      fileName: artifacts.stl.fileName }),
    qualificationProvenance: frozen({ kind: 'synthetic-igs-local',
      accountSessionAdapter: 'browser-only-synthetic', uploadSessionAdapter: 'browser-only-synthetic',
      conversionAdapter: 'deterministic-fixed-cube-synthetic', productionAuthenticationQualified: false,
      realGeometryConverterQualified: false }),
    warnings: frozen(['Generated synthetic source for interface qualification.',
      'Inspection geometry is not validated for manufacturing.']),
  });
}

function unavailable() {
  return frozen({ ok: false, code: 'ARTIFACT_UNAVAILABLE', message: 'This artifact is unavailable.' });
}

function parseSyntheticArtifactResponse(response, context = {}) {
  if (context.signedIn !== true || context.ownerMatch !== true || context.grantFresh !== true
    || context.deleted === true || !exact(response, new Set(['schemaVersion', 'status', 'artifact']))
    || response.schemaVersion !== 1 || response.status !== 'success'
    || !exact(response.artifact, new Set(['kind', 'fileName', 'format', 'byteCount', 'sha256', 'bytes']))
    || !['original-igs', 'derived-stl'].includes(response.artifact.kind)
    || typeof response.artifact.fileName !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(response.artifact.fileName)
    || !['model/iges', 'model/stl'].includes(response.artifact.format)
    || !Number.isSafeInteger(response.artifact.byteCount) || response.artifact.byteCount < 1
    || !/^[a-f0-9]{64}$/.test(response.artifact.sha256)
    || !(response.artifact.bytes instanceof Uint8Array)
    || response.artifact.bytes.byteLength !== response.artifact.byteCount) return unavailable();
  const expected = buildArtifacts('file');
  const expectedArtifact = response.artifact.kind === 'original-igs' ? expected.original : expected.stl;
  if (response.artifact.format !== expectedArtifact.format
    || response.artifact.sha256 !== expectedArtifact.sha256
    || !bytesEqual(response.artifact.bytes, expectedArtifact.bytes)) return unavailable();
  return frozen({ ok: true, code: 'SYNTHETIC_ARTIFACT_READY', artifact: frozen({ ...response.artifact,
    bytes: new Uint8Array(response.artifact.bytes) }) });
}

function createAuthenticatedImportQualificationAdapter({ stateStore = createMemoryStateStore(),
  wait = async () => {}, now = Date.now } = {}) {
  let state = stateStore.read() || initial();
  if (['uploading', 'processing'].includes(state.status)) {
    state = corruptState();
    try { stateStore.write(state); } catch { /* The closed in-memory state remains authoritative. */ }
  }
  const persist = next => { state = stateStore.write(next); return state; };
  const notify = callback => { callback?.(state); return state; };
  const transition = (next, callback) => notify(callback, persist(next));
  return frozen({
    sourceOnly: true, configured: false, routeMounted: false, bodyAdmissionAuthorized: false,
    sessionIssuanceRouted: false, providerDispatchEnabled: false, conversionDispatchEnabled: false,
    storageDispatchEnabled: false, downloadGrantRouted: false, privateCadEnabled: false, maxRetries: 0,
    status: () => state,
    fixture: () => state.status === 'ready' ? buildFixture(state.sourceChoice) : null,
    artifacts: () => state.status === 'ready' ? buildArtifacts(state.sourceChoice) : null,
    selectSource(sourceChoice, onState) {
      if (!SOURCE_CHOICES.has(sourceChoice) || !['idle', 'selected'].includes(state.status)) return state;
      return transition({ schemaVersion: 1, status: 'selected', code: 'SOURCE_SELECTED', sourceChoice,
        attemptConsumed: false, cleanupVerified: true, artifactsAvailable: false }, onState);
    },
    async run({ signal, onState } = {}) {
      if (state.status !== 'selected' || signal?.aborted) return frozen({ ok: false,
        code: state.status === 'unknown' ? 'UNKNOWN_OUTCOME_NO_RETRY' : 'QUALIFICATION_UNAVAILABLE' });
      const sourceChoice = state.sourceChoice;
      try {
        transition({ schemaVersion: 1, status: 'uploading', code: 'SYNTHETIC_ADMISSION_CHECK', sourceChoice,
          attemptConsumed: true, cleanupVerified: false, artifactsAvailable: false }, onState);
        await wait(260, signal); if (signal?.aborted) throw new Error('CANCELLED');
        transition({ schemaVersion: 1, status: 'processing', code: 'SYNTHETIC_DERIVATION_CHECK', sourceChoice,
          attemptConsumed: true, cleanupVerified: false, artifactsAvailable: false }, onState);
        await wait(360, signal); if (signal?.aborted) throw new Error('CANCELLED');
        buildArtifacts(sourceChoice);
        transition({ schemaVersion: 1, status: 'ready', code: 'SYNTHETIC_ARTIFACTS_READY', sourceChoice,
          attemptConsumed: true, cleanupVerified: true, artifactsAvailable: true }, onState);
        const completedAt = now();
        if (!Number.isSafeInteger(completedAt) || completedAt < 0) throw new Error('CLOCK_INVALID');
        return frozen({ ok: true, code: state.code, completedAt, fixture: buildFixture(sourceChoice) });
      } catch {
        transition({ schemaVersion: 1, status: 'unknown', code: 'UNKNOWN_OUTCOME_NO_RETRY', sourceChoice,
          attemptConsumed: true, cleanupVerified: false, artifactsAvailable: false }, onState);
        return frozen({ ok: false, code: state.code });
      }
    },
    previewRecoverableFailure(onState) {
      if (!['idle', 'selected'].includes(state.status)) return state;
      return transition({ schemaVersion: 1, status: 'recoverable-error', code: 'SAFE_FIXTURE_REJECTED',
        sourceChoice: null, attemptConsumed: false, cleanupVerified: true, artifactsAvailable: false }, onState);
    },
    recoverSafeFailure(onState) {
      if (state.status !== 'recoverable-error') return state;
      return transition(initial(), onState);
    },
    previewUnknownOutcome(onState) {
      if (state.status !== 'recoverable-error') return state;
      return transition({ schemaVersion: 1, status: 'unknown', code: 'UNKNOWN_OUTCOME_NO_RETRY',
        sourceChoice: null, attemptConsumed: true, cleanupVerified: false, artifactsAvailable: false }, onState);
    },
    revokeUnknown(onState) {
      if (state.status !== 'unknown') return state;
      return transition({ schemaVersion: 1, status: 'deleted', code: 'LOCAL_RECORD_REVOKED',
        sourceChoice: null, attemptConsumed: true, cleanupVerified: true, artifactsAvailable: false }, onState);
    },
    deleteArtifacts(onState) {
      if (state.status !== 'ready') return state;
      return transition({ schemaVersion: 1, status: 'deleted', code: 'SYNTHETIC_ARTIFACTS_DELETED',
        sourceChoice: null, attemptConsumed: true, cleanupVerified: true, artifactsAvailable: false }, onState);
    },
    startNew(onState) {
      if (state.status !== 'deleted') return state;
      return transition(initial(), onState);
    },
    readArtifact(kind, context) {
      if (state.status !== 'ready') return unavailable();
      const artifacts = buildArtifacts(state.sourceChoice);
      const artifact = kind === 'original-igs' ? artifacts.original
        : kind === 'derived-stl' ? artifacts.stl : null;
      if (!artifact) return unavailable();
      const projected = { kind: artifact.kind, fileName: artifact.fileName, format: artifact.format,
        byteCount: artifact.byteCount, sha256: artifact.sha256, bytes: artifact.bytes };
      return parseSyntheticArtifactResponse({ schemaVersion: 1, status: 'success', artifact: projected }, context);
    },
  });
}

module.exports = { AUTHENTICATED_IMPORT_QUERY_VALUE, AUTHENTICATED_IMPORT_STATE_KEY,
  SOURCE_SHA256, STL_SHA256, buildArtifacts, buildFixture,
  createAuthenticatedImportQualificationAdapter, createAuthenticatedImportStateStore,
  createMemoryStateStore, inspectAuthenticatedImportQualification, parseSyntheticArtifactResponse };
