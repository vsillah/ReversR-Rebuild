const PREVIEW_QUERY_KEY = 'cadPreview';
const PREVIEW_QUERY_VALUE = 'public-cube-v1';
const PRODUCTION_HOSTNAME = 'reversr.vercel.app';

const PUBLIC_CUBE_RESULT = Object.freeze({
  fixtureName: 'Public cube',
  format: 'IGES',
  bytes: 11562,
  sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
  meshes: 1,
  vertices: 24,
  triangles: 12,
  sourceConfidence: 'Unqualified',
  previewGeometry: Object.freeze({
    kind: 'box',
    normalizedScale: Object.freeze([1, 1, 1]),
  }),
});

function isAllowedPreviewHostname(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(normalized)) return true;
  return normalized.endsWith('.vercel.app') && normalized !== PRODUCTION_HOSTNAME;
}

function inspectCadInternalTesterPreview(locationLike) {
  if (!locationLike || !isAllowedPreviewHostname(locationLike.hostname)) {
    return Object.freeze({ enabled: false, code: 'CAD_TEST_PREVIEW_HOST_BLOCKED' });
  }

  const query = new URLSearchParams(String(locationLike.search || ''));
  if (query.get(PREVIEW_QUERY_KEY) !== PREVIEW_QUERY_VALUE) {
    return Object.freeze({ enabled: false, code: 'CAD_TEST_PREVIEW_NOT_REQUESTED' });
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
  PUBLIC_CUBE_RESULT,
  inspectCadInternalTesterPreview,
  getCadInternalTesterPreview,
  getCadCapabilitiesRequest,
  isAllowedPreviewHostname,
};
