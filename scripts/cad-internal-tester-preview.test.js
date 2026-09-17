const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PUBLIC_CUBE_RESULT,
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

test('blocks production, unrelated hosts, and unrequested preview mode', () => {
  for (const input of [
    { hostname: 'reversr.vercel.app', search: '?cadPreview=public-cube-v1' },
    { hostname: 'example.com', search: '?cadPreview=public-cube-v1' },
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
    format: 'IGES',
    bytes: 11562,
    sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3',
    meshes: 1,
    vertices: 24,
    triangles: 12,
    sourceConfidence: 'Unqualified',
  });
});
