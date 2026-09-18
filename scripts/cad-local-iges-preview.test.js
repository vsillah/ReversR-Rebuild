const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');

const {
  LOCAL_IGES_PREVIEW_MAX_BYTES,
  createLocalIgesFixture,
  supportedLocalIgesFile,
} = require('../utils/cadLocalIgesPreview');

test('converts OCCT IGES output into an internal local-preview fixture', async () => {
  const sourcePath = 'public/cad-fixtures/public-cube-10x10.igs';
  const source = fs.readFileSync(sourcePath);
  const occt = await require('occt-import-js')();
  const result = occt.ReadIgesFile(source, { linearUnit: 'millimeter' });
  const fixture = createLocalIgesFixture({
    fileName: 'Cube 10x10.igs',
    bytes: source.byteLength,
    sha256: crypto.createHash('sha256').update(source).digest('hex'),
    result,
  });

  assert.equal(fixture.sourceFileName, 'Cube 10x10.igs');
  assert.equal(fixture.sourceAssetUrl, '');
  assert.equal(fixture.format, 'IGES');
  assert.equal(fixture.previewGeometry.kind, 'mesh');
  assert.equal(fixture.meshes, 1);
  assert.equal(fixture.vertices, 24);
  assert.equal(fixture.triangles, 12);
  assert.deepEqual(fixture.expectedDimensions.map(value => Math.round(value)), [10, 10, 10]);
  assert.match(fixture.sourcePackage, /Local browser preview/);
  assert.match(fixture.sourceLicense, /not uploaded/);
  assert(fixture.warnings.some(warning => /not uploaded/.test(warning)));
});

test('rejects unsupported or too-large local preview selections before reading bytes', () => {
  assert.equal(supportedLocalIgesFile({ name: 'part.step', size: 10 }), 'Choose a standalone .igs or .iges file.');
  assert.equal(supportedLocalIgesFile({ name: 'empty.igs', size: 0 }), 'This file is empty or has an invalid size.');
  assert.match(
    supportedLocalIgesFile({ name: 'huge.iges', size: LOCAL_IGES_PREVIEW_MAX_BYTES + 1 }),
    /internal-preview limit/,
  );
  assert.equal(supportedLocalIgesFile({ name: 'mark.IGS', size: 1024 }), null);
});
