const LOCAL_IGES_PREVIEW_MAX_BYTES = 25 * 1024 * 1024;
const LOCAL_IGES_PREVIEW_MAX_MESHES = 32;
const LOCAL_IGES_PREVIEW_MAX_VERTICES = 160000;
const LOCAL_IGES_PREVIEW_MAX_TRIANGLES = 100000;
const OCCT_ASSET_ROOT = '/cad-preview/';

let occtScriptPromise;
let occtRuntimePromise;

function fail(message) {
  const error = new Error(message);
  error.code = 'LOCAL_IGES_PREVIEW_FAILED';
  throw error;
}

function supportedLocalIgesFile(file) {
  if (!file || typeof file.name !== 'string') return 'Choose an IGES file to preview.';
  if (!/\.(igs|iges)$/i.test(file.name)) return 'Choose a standalone .igs or .iges file.';
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return 'This file is empty or has an invalid size.';
  if (file.size > LOCAL_IGES_PREVIEW_MAX_BYTES) {
    return `This file is larger than the ${Math.round(LOCAL_IGES_PREVIEW_MAX_BYTES / 1024 / 1024)} MB internal-preview limit.`;
  }
  return null;
}

function loadScript() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    fail('Local IGES preview is only available in a browser.');
  }
  if (window.occtimportjs) return Promise.resolve();
  if (!occtScriptPromise) {
    occtScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-cad-occt-preview="true"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load the CAD preview runtime.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `${OCCT_ASSET_ROOT}occt-import-js.js`;
      script.async = true;
      script.dataset.cadOcctPreview = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the CAD preview runtime.'));
      document.head.appendChild(script);
    });
  }
  return occtScriptPromise;
}

async function loadOcctRuntime() {
  await loadScript();
  if (!occtRuntimePromise) {
    if (typeof window.occtimportjs !== 'function') fail('The CAD preview runtime is unavailable.');
    occtRuntimePromise = window.occtimportjs({
      locateFile(fileName) {
        return `${OCCT_ASSET_ROOT}${fileName}`;
      },
    });
  }
  return occtRuntimePromise;
}

async function sha256Hex(buffer) {
  if (typeof crypto === 'undefined' || !crypto.subtle) fail('This browser cannot hash the selected file.');
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
}

function numberArray(value) {
  if (!value || typeof value.length !== 'number') return [];
  return Array.from(value, Number);
}

function createLocalIgesFixture({ fileName, bytes, sha256, result }) {
  if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length) {
    fail('The IGES file could not be converted into preview geometry.');
  }
  if (result.meshes.length > LOCAL_IGES_PREVIEW_MAX_MESHES) {
    fail('This file has too many mesh components for the internal browser preview.');
  }

  let vertexCount = 0;
  let triangleCount = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const meshes = result.meshes.map((mesh, index) => {
    const positions = numberArray(mesh?.attributes?.position?.array);
    const indices = numberArray(mesh?.index?.array).map(value => Math.trunc(value));
    if (!positions.length || !indices.length || positions.length % 3 || indices.length % 3) {
      fail('The converted IGES geometry is incomplete.');
    }
    const localVertices = positions.length / 3;
    const localTriangles = indices.length / 3;
    vertexCount += localVertices;
    triangleCount += localTriangles;
    if (vertexCount > LOCAL_IGES_PREVIEW_MAX_VERTICES || triangleCount > LOCAL_IGES_PREVIEW_MAX_TRIANGLES) {
      fail('This file is too complex for the internal browser preview.');
    }
    for (let offset = 0; offset < positions.length; offset += 3) {
      const x = positions[offset];
      const y = positions[offset + 1];
      const z = positions[offset + 2];
      if (![x, y, z].every(Number.isFinite)) fail('The converted IGES geometry contains invalid coordinates.');
      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);
      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }
    if (!indices.every(value => Number.isInteger(value) && value >= 0 && value < localVertices)) {
      fail('The converted IGES geometry contains invalid triangle indices.');
    }
    return Object.freeze({
      name: typeof mesh?.name === 'string' && mesh.name.trim() ? mesh.name.trim() : `Mesh ${index + 1}`,
      positions: Object.freeze(positions),
      indices: Object.freeze(indices),
    });
  });
  const size = max.map((value, index) => value - min[index]);
  if (!size.every(value => Number.isFinite(value) && value > 0)) {
    fail('The converted IGES geometry has invalid bounds.');
  }

  const displayName = String(fileName || 'Local IGES file').replace(/\.(igs|iges)$/i, '').trim() || 'Local IGES file';
  return Object.freeze({
    fixtureName: displayName,
    sourceFileName: fileName,
    sourceAssetUrl: '',
    referenceImageUrl: '',
    referenceImages: Object.freeze([]),
    sourcePackage: 'Local browser preview using occt-import-js 0.0.23',
    sourceLicense: 'User-selected local file; file contents are not uploaded by this preview path.',
    format: 'IGES',
    bytes,
    sha256,
    units: 'millimeter',
    expectedDimensions: Object.freeze(size),
    importedBoundingBox: Object.freeze({
      min: Object.freeze(min),
      max: Object.freeze(max),
      size: Object.freeze(size),
    }),
    meshes: meshes.length,
    vertices: vertexCount,
    triangles: triangleCount,
    sourceConfidence: 'Local preview · unqualified',
    previewGeometry: Object.freeze({
      kind: 'mesh',
      meshes: Object.freeze(meshes),
      sha256,
      vertices: vertexCount,
      triangles: triangleCount,
    }),
    warnings: Object.freeze([
      'This is an internal browser preview of the selected local file.',
      'File contents were read locally for rendering and were not uploaded through the production CAD route.',
      'The preview is not dimensional inspection, manufacturing certification, STL export, or production upload activation.',
    ]),
  });
}

async function prepareLocalIgesPreview(file) {
  const rejection = supportedLocalIgesFile(file);
  if (rejection) fail(rejection);
  const buffer = await file.arrayBuffer();
  const sha256 = await sha256Hex(buffer);
  const occt = await loadOcctRuntime();
  const result = occt.ReadIgesFile(new Uint8Array(buffer), {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.0008,
    angularDeflection: 0.5,
  });
  return createLocalIgesFixture({
    fileName: file.name,
    bytes: file.size,
    sha256,
    result,
  });
}

function supportsLocalIgesPreview() {
  return typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && typeof File !== 'undefined'
    && typeof crypto !== 'undefined'
    && Boolean(crypto.subtle);
}

module.exports = {
  LOCAL_IGES_PREVIEW_MAX_BYTES,
  createLocalIgesFixture,
  prepareLocalIgesPreview,
  supportedLocalIgesFile,
  supportsLocalIgesPreview,
};
