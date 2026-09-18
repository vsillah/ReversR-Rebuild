const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');

const {
  MARK_DISPENSER_RESULT,
  PUBLIC_CUBE_RESULT,
  getCadCapabilitiesRequest,
  inspectCadInternalTesterPreview,
} = require('../utils/cadInternalTesterPreview');

test('enables the fixed public cube only on local or non-production Vercel hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'reversr-git-cad-test-vsillahs-projects.vercel.app']) {
    const result = inspectCadInternalTesterPreview({
      hostname,
      search: '?cadPreview=public-cube-v1',
    });
    assert.equal(result.enabled, true);
    assert.deepEqual(result.fixture, PUBLIC_CUBE_RESULT);
  }
});

test('enables the authorized Mark dispenser review only on local or non-production Vercel hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'reversr-git-cad-test-vsillahs-projects.vercel.app']) {
    const result = inspectCadInternalTesterPreview({
      hostname,
      search: '?cadPreview=mark-dispenser-v1',
    });
    assert.equal(result.enabled, true);
    assert.equal(result.code, 'CAD_TEST_PREVIEW_MARK_DISPENSER');
    assert.deepEqual(result.fixture, MARK_DISPENSER_RESULT);
  }
});

test('defaults non-production Vercel preview roots to the authorized Mark dispenser review', () => {
  for (const search of ['', '?qa=google-site-link']) {
    const result = inspectCadInternalTesterPreview({
      hostname: 'reversr-git-cad-test-vsillahs-projects.vercel.app',
      search,
    });
    assert.equal(result.enabled, true);
    assert.equal(result.code, 'CAD_TEST_PREVIEW_MARK_DISPENSER_DEFAULT');
    assert.deepEqual(result.fixture, MARK_DISPENSER_RESULT);
  }
});

test('blocks production, unrelated hosts, and unrequested preview mode', () => {
  for (const input of [
    { hostname: 'reversr.vercel.app', search: '?cadPreview=public-cube-v1' },
    { hostname: 'reversr.vercel.app', search: '?cadPreview=mark-dispenser-v1' },
    { hostname: 'reversr.vercel.app', search: '' },
    { hostname: 'example.com', search: '?cadPreview=public-cube-v1' },
    { hostname: 'example.com', search: '' },
    { hostname: 'reversr.vercel.app.example.com', search: '?cadPreview=public-cube-v1' },
    { hostname: 'localhost', search: '?cadPreview=other' },
    { hostname: 'localhost', search: '' },
  ]) {
    assert.equal(inspectCadInternalTesterPreview(input).enabled, false);
  }
});

test('keeps the replay bound to the accepted public fixture and qualified output', () => {
  assert.deepEqual(PUBLIC_CUBE_RESULT, {
    fixtureName: 'Public cube',
    sourceFileName: 'Cube 10x10.igs',
    sourceAssetUrl: '/cad-fixtures/public-cube-10x10.igs',
    referenceImageUrl: '/cad-fixtures/public-cube-10x10.png',
    referenceImages: [{
      label: 'Reference render',
      url: '/cad-fixtures/public-cube-10x10.png',
      sha256: 'f5f71a0df71d594d681fb64dafde7a2cff05caad0fa5cd5667f1281b71ccecd8',
    }],
    sourcePackage: 'occt-import-js 0.0.23',
    sourceLicense: 'LGPL-2.1',
    format: 'IGES',
    bytes: 11562,
    sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
    units: 'millimeter',
    expectedDimensions: [10, 10, 10],
    importedBoundingBox: {
      min: [-5, 0, -5],
      max: [5, 10, 5],
      size: [10, 10, 10],
    },
    meshes: 1,
    vertices: 24,
    triangles: 12,
    sourceConfidence: 'Unqualified',
    previewGeometry: {
      kind: 'box',
      normalizedScale: [1, 1, 1],
    },
    warnings: ['Synthetic regression fixture only.'],
  });
});

test('binds the Mark review to the authorized dispenser source and calibrated output', () => {
  assert.equal(MARK_DISPENSER_RESULT.sourceFileName, 'Dispenser.IGS');
  assert.equal(MARK_DISPENSER_RESULT.bytes, 701346);
  assert.equal(MARK_DISPENSER_RESULT.sha256, '1e52b301cf33bc241cd0d3d039691236ab45116f439197820f690b424750f0b8');
  assert.equal(MARK_DISPENSER_RESULT.units, 'millimeter');
  assert.deepEqual(MARK_DISPENSER_RESULT.expectedDimensions, [55.7403, 69.417713, 114.825561]);
  assert.deepEqual(MARK_DISPENSER_RESULT.importedBoundingBox, {
    min: [0, -4.3942, -1.78728],
    max: [55.7403, 65.023513, 113.038281],
    size: [55.7403, 69.417713, 114.825561],
  });
  assert.deepEqual(MARK_DISPENSER_RESULT.previewGeometry, {
    kind: 'stl',
    assetUrl: '/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl',
    sha256: '9b5bfa4b86d6976ae87e6f023b3a243d4b04966b2337b224203bb630e7b8096e',
  });
  assert.equal(MARK_DISPENSER_RESULT.meshes, 4);
  assert.equal(MARK_DISPENSER_RESULT.triangles, 2634);
  assert.equal(MARK_DISPENSER_RESULT.referenceImages.length, 4);
});

test('ships only the authorized dispenser source, derived mesh, and matching references', () => {
  const expectedAssets = [
    ['public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS', 701346, MARK_DISPENSER_RESULT.sha256],
    ['public/cad-fixtures/mark-dispenser-v1/dispenser-derived.stl', 131784, MARK_DISPENSER_RESULT.previewGeometry.sha256],
    ...MARK_DISPENSER_RESULT.referenceImages.map(reference => [
      `public${reference.url}`,
      null,
      reference.sha256,
    ]),
  ];

  for (const [assetPath, expectedBytes, expectedHash] of expectedAssets) {
    const asset = fs.readFileSync(assetPath);
    if (expectedBytes !== null) assert.equal(asset.byteLength, expectedBytes);
    assert.equal(crypto.createHash('sha256').update(asset).digest('hex'), expectedHash);
  }
});

test('ships the exact public source fixture and its reference image', () => {
  const source = fs.readFileSync('public/cad-fixtures/public-cube-10x10.igs');
  const reference = fs.readFileSync('public/cad-fixtures/public-cube-10x10.png');

  assert.equal(source.byteLength, PUBLIC_CUBE_RESULT.bytes);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), PUBLIC_CUBE_RESULT.sha256);
  assert.equal(crypto.createHash('sha256').update(reference).digest('hex'), 'f5f71a0df71d594d681fb64dafde7a2cff05caad0fa5cd5667f1281b71ccecd8');
});

test('binds the review to the recorded 10 millimeter import evidence', () => {
  assert.equal(PUBLIC_CUBE_RESULT.units, 'millimeter');
  assert.deepEqual(PUBLIC_CUBE_RESULT.expectedDimensions, [10, 10, 10]);
  assert.deepEqual(PUBLIC_CUBE_RESULT.importedBoundingBox, {
    min: [-5, 0, -5],
    max: [5, 10, 5],
    size: [10, 10, 10],
  });
});

test('binds the visual to normalized fixture geometry without dimensional claims', () => {
  assert.deepEqual(PUBLIC_CUBE_RESULT.previewGeometry, {
    kind: 'box',
    normalizedScale: [1, 1, 1],
  });
  assert.equal(Object.isFrozen(PUBLIC_CUBE_RESULT.previewGeometry), true);
  assert.equal(Object.isFrozen(PUBLIC_CUBE_RESULT.previewGeometry.normalizedScale), true);
});

test('keeps preview status checks on the protected preview origin', () => {
  assert.deepEqual(getCadCapabilitiesRequest(true, 'https://reversr.vercel.app'), {
    url: '/api/cad/capabilities',
    credentials: 'same-origin',
  });
  assert.deepEqual(getCadCapabilitiesRequest(false, 'https://reversr.vercel.app'), {
    url: 'https://reversr.vercel.app/api/cad/capabilities',
    credentials: 'omit',
  });
});
