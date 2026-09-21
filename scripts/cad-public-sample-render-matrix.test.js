const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'docs', 'cad-public-sample-render-matrix.json');
const sampleManifestPath = path.join(root, 'public', 'cad-fixtures', 'public-sample-set', 'manifest.json');
const qualificationEvidencePath = path.join(root, 'docs', 'cad-fixture-qualification-evidence.json');
const markManifestPath = path.join(root, 'public', 'cad-fixtures', 'mark-dispenser-v1', 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function publicPath(downloadUrl) {
  assert.ok(downloadUrl.startsWith('/cad-fixtures/'), downloadUrl);
  return path.join(root, 'public', ...downloadUrl.split('/').filter(Boolean));
}

test('render matrix binds every public sample row and keeps closed authorities', () => {
  const matrix = readJson(matrixPath);
  const manifest = readJson(sampleManifestPath);

  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.mode, 'public-sample-render-matrix');
  assert.equal(matrix.sampleManifest, 'public/cad-fixtures/public-sample-set/manifest.json');
  assert.equal(matrix.localQualificationEvidence, 'docs/cad-fixture-qualification-evidence.json');
  assert.equal(matrix.publicMaterialOnly, true);
  assert.equal(matrix.sourceOnly, true);
  assert.equal(matrix.liveUploadActivated, false);
  assert.equal(matrix.productionConversionActivated, false);
  assert.equal(matrix.sandboxDispatchAllowed, false);
  assert.equal(matrix.privateCadIncluded, false);
  assert.ok(Array.isArray(matrix.unproven));
  assert.ok(matrix.unproven.includes('Production upload activation'));

  const manifestIds = manifest.files.map(file => file.id).sort();
  const matrixIds = matrix.rows.map(row => row.id).sort();
  assert.deepEqual(matrixIds, manifestIds);
});

test('public sample downloads remain hash-bound to the render matrix rows', () => {
  const matrix = readJson(matrixPath);
  const manifest = readJson(sampleManifestPath);
  const rows = new Map(matrix.rows.map(row => [row.id, row]));

  for (const file of manifest.files) {
    const row = rows.get(file.id);
    assert.equal(row.downloadStatus, 'served-static-public-sample');
    assert.equal(row.renderEvidence.sourceSha256, file.sha256);
    assert.equal(fs.statSync(publicPath(file.downloadUrl)).size, file.bytes, file.id);
    assert.equal(sha256(publicPath(file.downloadUrl)), file.sha256, file.id);
    assert.match(row.claim, /public|preview|OCCT|Pinned/i);
  }
});

test('OCCT-qualified public samples match the pinned fixture evidence', () => {
  const matrix = readJson(matrixPath);
  const evidence = readJson(qualificationEvidencePath);
  const conversions = new Map(evidence.conversions.map(row => [row.fixtureId, row]));

  assert.equal(evidence.status, 'pass');
  assert.equal(evidence.independentIgesCoverage, 'five-distinct-iges-fixtures-converted-locally');

  for (const row of matrix.rows.filter(item => item.renderEvidence.type === 'occt-local-fixture-qualification')) {
    const actual = conversions.get(row.id);
    assert.ok(actual, row.id);
    assert.equal(actual.caseId, row.renderEvidence.caseId);
    assert.equal(actual.sourceSha256, row.renderEvidence.sourceSha256);
    assert.equal(actual.meshes, row.renderEvidence.meshes);
    assert.equal(actual.vertices, row.renderEvidence.vertices);
    assert.equal(actual.triangles, row.renderEvidence.triangles);
    assert.deepEqual(actual.bounds, row.renderEvidence.bounds);
  }
});

test('Mark dispenser row is preview-mesh bound and explicitly not re-rendered by this matrix', () => {
  const matrix = readJson(matrixPath);
  const markManifest = readJson(markManifestPath);
  const row = matrix.rows.find(item => item.id === 'mark-dispenser-v1');

  assert.equal(row.renderEvidence.type, 'public-preview-derived-display-mesh');
  assert.equal(row.renderEvidence.rerenderedByThisMatrix, false);
  assert.equal(row.renderEvidence.manifest, 'public/cad-fixtures/mark-dispenser-v1/manifest.json');
  assert.equal(row.renderEvidence.sourceSha256, markManifest.source.sha256);
  assert.equal(row.renderEvidence.derivedMeshSha256, markManifest.derivedDisplayMesh.sha256);
  assert.equal(row.renderEvidence.triangles, markManifest.derivedDisplayMesh.triangleCount);
  assert.equal(markManifest.authorization.scope, 'Anyone-with-the-link Vercel preview');
});

test('documentation and matrix do not imply production or private-CAD readiness', () => {
  const matrixText = fs.readFileSync(matrixPath, 'utf8');
  const docText = fs.readFileSync(path.join(root, 'docs', 'cad-public-sample-render-matrix.md'), 'utf8');

  for (const text of [matrixText, docText]) {
    assert.match(text, /source-only|sourceOnly/);
    assert.match(text, /private CAD|Private CAD|private-CAD/);
    assert.match(text, /commercial|Commercial/);
    assert.doesNotMatch(text, /liveUploadActivated": true|productionConversionActivated": true|sandboxDispatchAllowed": true/);
    assert.doesNotMatch(text, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  }
});
