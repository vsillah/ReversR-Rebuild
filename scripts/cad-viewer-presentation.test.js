const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const viewer = fs.readFileSync('components/CadFixtureViewer.tsx', 'utf8');

test('fixed-view handlers do not change material, tint, lights or grid visibility', () => {
  const viewHandler = viewer.slice(viewer.indexOf('const updateView ='), viewer.indexOf('viewerActions.current = {'));
  assert.doesNotMatch(viewHandler, /modelMaterial|edgeMaterial|\.color|\.intensity|\.visible/);
  assert.equal((viewer.match(/new THREE\.MeshLambertMaterial/g) || []).length, 1);
  assert.doesNotMatch(viewer, /HemisphereLight|MeshStandardMaterial|modelMaterial\.color/);
  const lights = [...viewer.matchAll(/new THREE\.(?:Ambient|Directional)Light\((0x[0-9a-f]+)/g)];
  assert.equal(lights.length, 3);
  assert(lights.every(match => match[1] === '0xffffff'));
  assert.match(viewer, /camera\.add\(key\)/);
  assert.match(viewer, /camera\.add\(fill\)/);
});

test('grid stays behind the full rotating model and disposes its resources', () => {
  assert.match(viewer, /new THREE\.GridHelper/);
  assert.match(viewer, /grid\.position\.copy\(camera\.position\)\.normalize\(\)\.multiplyScalar\(-radius \* 1\.4\)/);
  assert.match(viewer, /grid\.quaternion\.copy\(camera\.quaternion\)/);
  assert.match(viewer, /grid\.geometry\.dispose\(\)/);
  assert.match(viewer, /gridMaterials\.forEach\(material => material\.dispose\(\)\)/);
  assert.match(viewer, /View-aligned grid; not a dimensional scale/);
});

test('fixture harness remains the original panel; rejected workflow is absent', () => {
  const panel = fs.readFileSync('components/CadImportPanel.tsx', 'utf8');
  assert.doesNotMatch(panel, /CadGuidedReview|cadReviewReceipt|Copy receipt/);
  assert.match(panel, /cad-review-qualified-result/);
  for (const path of ['components/CadGuidedReview.tsx', 'utils/cadReviewReceipt.js', 'utils/cadReviewReceipt.d.ts']) assert.equal(fs.existsSync(path), false);
});
