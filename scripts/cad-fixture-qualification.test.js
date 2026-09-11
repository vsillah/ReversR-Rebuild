const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateMatrix, loadFixtures, validateGeometry } = require('./cad-fixture-qualification');
const matrix = require('./fixtures/cad-public-matrix.json');
test('matrix rejects unknown paths, duplicate IDs, dangling references and invalid bounds', () => {
  for (const mutate of [
    m => { m.fixtures[0].path = '../unreviewed'; },
    m => { m.fixtures[1].id = m.fixtures[0].id; },
    m => { m.cases[0].fixture = 'missing'; },
    m => { m.fixtures[0].geometry.vertices = [24, 1]; },
    m => { m.cases[0].id = m.cases[1].id; },
    m => { m.cases[0].code = 'UNSUPPORTED'; },
  ]) {
    const copy = structuredClone(matrix); mutate(copy);
    assert.throws(() => validateMatrix(copy));
  }
});
test('public fixtures are source-hash pinned and reject hash drift', () => {
  assert.equal(loadFixtures(matrix).size, 3);
  const changed = structuredClone(matrix); changed.fixtures[0].sha256 = '0'.repeat(64);
  assert.throws(() => loadFixtures(changed));
});
test('geometry validation accepts a non-cube mesh and rejects corrupt indices and counts', () => {
  const body = { meshes: [{ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] }], vertexCount: 3, triangleCount: 1 };
  validateGeometry(body, { vertices: [3, 8], triangles: [1, 4] });
  validateGeometry(body);
  assert.throws(() => validateGeometry(body, { vertices: [24, 24], triangles: [12, 12] }));
  assert.throws(() => validateGeometry({ ...body, vertexCount: 24 }));
  const corrupt = structuredClone(body); corrupt.meshes[0].indices[2] = 99;
  assert.throws(() => validateGeometry(corrupt));
  corrupt.meshes[0].indices[2] = 2;
  corrupt.meshes[0].positions[0] = NaN;
  assert.throws(() => validateGeometry(corrupt));
});
