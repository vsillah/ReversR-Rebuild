const PREVIEW_QUERY_KEY = 'cadPreview';
const PREVIEW_QUERY_VALUE = 'public-cube-v1';
const DISPENSER_PREVIEW_QUERY_VALUE = 'mark-dispenser-v1';
const PRODUCTION_HOSTNAME = 'reversr.vercel.app';

const PUBLIC_CUBE_RESULT = Object.freeze({
  fixtureName: 'Public cube',
  sourceFileName: 'Cube 10x10.igs',
  sourceAssetUrl: '/cad-fixtures/public-cube-10x10.igs',
  referenceImageUrl: '/cad-fixtures/public-cube-10x10.png',
  referenceImages: Object.freeze([
    Object.freeze({
      label: 'Reference render',
      url: '/cad-fixtures/public-cube-10x10.png',
      sha256: 'f5f71a0df71d594d681fb64dafde7a2cff05caad0fa5cd5667f1281b71ccecd8',
    }),
  ]),
  sourcePackage: 'occt-import-js 0.0.23',
  sourceLicense: 'LGPL-2.1',
  format: 'IGES',
  bytes: 11562,
  sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
  units: 'millimeter',
  expectedDimensions: Object.freeze([10, 10, 10]),
  importedBoundingBox: Object.freeze({
    min: Object.freeze([-5, 0, -5]),
    max: Object.freeze([5, 10, 5]),
    size: Object.freeze([10, 10, 10]),
  }),
  meshes: 1,
  vertices: 24,
  triangles: 12,
  sourceConfidence: 'Unqualified',
  previewGeometry: Object.freeze({
    kind: 'box',
    normalizedScale: Object.freeze([1, 1, 1]),
  }),
  warnings: Object.freeze([
    'Synthetic regression fixture only.',
  ]),
});

const MARK_DISPENSER_RESULT = Object.freeze({
  fixtureName: "Mark's tape dispenser",
  sourceFileName: 'Dispenser.IGS',
  sourceAssetUrl: '/cad-fixtures/mark-dispenser-v1/Dispenser.IGS',
  referenceImageUrl: '/cad-fixtures/mark-dispenser-v1/dispenser-front.jpg',
  referenceImages: Object.freeze([
    Object.freeze({
      label: 'Front',
      url: '/cad-fixtures/mark-dispenser-v1/dispenser-front.jpg',
      sha256: '710a65f06a5be9e842482e631110a38c3978c4d6a8a20ea3e07b699185782586',
    }),
    Object.freeze({
      label: 'Left',
      url: '/cad-fixtures/mark-dispenser-v1/dispenser-left.jpg',
      sha256: 'b985c51e00090c439d04ff5e5b0b7dd83916d5053b020d7fa3fb102ebd6024fe',
    }),
    Object.freeze({
      label: 'Top',
      url: '/cad-fixtures/mark-dispenser-v1/dispenser-top.jpg',
      sha256: '8e591836750d426c4c917236e1b0328ee90c907f7e9fcb798c03de53efd4ca09',
    }),
    Object.freeze({
      label: 'Drawing',
      url: '/cad-fixtures/mark-dispenser-v1/dispenser-drawing.jpg',
      sha256: 'b933e7ca60131898d8755b033d48a6114c6b7f020f34b41b04ad3bfbe06ac833',
    }),
  ]),
  sourcePackage: 'Mark Meadows public review fixture',
  sourceLicense: 'Public redistribution authorized by the source provider',
  format: 'IGES',
  bytes: 701346,
  sha256: '1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8',
  units: 'millimeter',
  expectedDimensions: Object.freeze([55.7403, 69.417713, 114.825561]),
  importedBoundingBox: Object.freeze({
    min: Object.freeze([0, -4.3942, -1.78728]),
    max: Object.freeze([55.7403, 65.023513, 113.038281]),
    size: Object.freeze([55.7403, 69.417713, 114.825561]),
  }),
  meshes: 4,
  vertices: 7902,
  triangles: 2634,
  sourceConfidence: '96/100 · source-only warning',
  previewGeometry: Object.freeze({
    kind: 'stl',
    assetUrl: '/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl',
    sha256: '9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e',
  }),
  warnings: Object.freeze([
    'The source-derived mesh is not fully watertight.',
    'Reference images support visual comparison only; they do not alter source geometry or confidence.',
    'This review is not dimensional inspection or manufacturing certification.',
  ]),
});

function isAllowedPreviewHostname(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(normalized)) return true;
  return normalized.endsWith('.vercel.app') && normalized !== PRODUCTION_HOSTNAME;
}

function isNonProductionVercelPreview(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase();
  return normalized.endsWith('.vercel.app') && normalized !== PRODUCTION_HOSTNAME;
}

function inspectCadInternalTesterPreview(locationLike) {
  if (!locationLike || !isAllowedPreviewHostname(locationLike.hostname)) {
    return Object.freeze({ enabled: false, code: 'CAD_TEST_PREVIEW_HOST_BLOCKED' });
  }

  const query = new URLSearchParams(String(locationLike.search || ''));
  const explicitPreview = query.get(PREVIEW_QUERY_KEY);
  const requestedPreview = explicitPreview || (isNonProductionVercelPreview(locationLike.hostname) ? DISPENSER_PREVIEW_QUERY_VALUE : null);
  if (![PREVIEW_QUERY_VALUE, DISPENSER_PREVIEW_QUERY_VALUE].includes(requestedPreview)) {
    return Object.freeze({ enabled: false, code: 'CAD_TEST_PREVIEW_NOT_REQUESTED' });
  }

  if (requestedPreview === DISPENSER_PREVIEW_QUERY_VALUE) {
    return Object.freeze({
      enabled: true,
      code: explicitPreview ? 'CAD_TEST_PREVIEW_MARK_DISPENSER' : 'CAD_TEST_PREVIEW_MARK_DISPENSER_DEFAULT',
      fixture: MARK_DISPENSER_RESULT,
    });
  }

  return Object.freeze({
    enabled: true,
    code: 'CAD_TEST_PREVIEW_PUBLIC_CUBE',
    fixture: PUBLIC_CUBE_RESULT,
  });
}

function getCadInternalTesterPreview() {
  if (typeof window === 'undefined' || !window.location) {
    return Object.freeze({ enabled: false, code: 'CAD_TEST_PREVIEW_BROWSER_REQUIRED' });
  }
  return inspectCadInternalTesterPreview(window.location);
}

function getCadCapabilitiesRequest(previewEnabled, apiBase) {
  if (previewEnabled) {
    return Object.freeze({
      url: '/api/cad/capabilities',
      credentials: 'same-origin',
    });
  }

  return Object.freeze({
    url: `${String(apiBase || '')}/api/cad/capabilities`,
    credentials: 'omit',
  });
}

module.exports = {
  PREVIEW_QUERY_KEY,
  PREVIEW_QUERY_VALUE,
  DISPENSER_PREVIEW_QUERY_VALUE,
  PUBLIC_CUBE_RESULT,
  MARK_DISPENSER_RESULT,
  inspectCadInternalTesterPreview,
  getCadInternalTesterPreview,
  getCadCapabilitiesRequest,
  isAllowedPreviewHostname,
  isNonProductionVercelPreview,
};
