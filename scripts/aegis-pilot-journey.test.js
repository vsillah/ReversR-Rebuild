const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const crypto = require('node:crypto');
const {
  PILOT_MAX_BYTES,
  PUBLIC_CUBE_SHA256,
  createPublicCubeDerivedStl,
  nextPilotState,
  validatePilotFileMetadata,
} = require('../utils/aegisPilotJourney');

test('pilot accepts IGES metadata and rejects unsupported, empty, and oversized files', () => {
  assert.equal(validatePilotFileMetadata({ name: 'public.IGES', size: 100 }).ok, true);
  assert.equal(validatePilotFileMetadata({ name: 'private.step', size: 100 }).code, 'IGES_ONLY');
  assert.equal(validatePilotFileMetadata({ name: 'empty.igs', size: 0 }).code, 'EMPTY_FILE');
  assert.equal(validatePilotFileMetadata({ name: 'large.igs', size: PILOT_MAX_BYTES + 1 }).code, 'FILE_TOO_LARGE');
});

test('the approved fixture digest remains bound to the checked-in public cube', () => {
  const source = fs.readFileSync('public/cad-fixtures/public-cube-10x10.igs');
  assert.equal(source.byteLength, 11562);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), PUBLIC_CUBE_SHA256);
});

test('journey transitions support processing, error recovery, and reset', () => {
  let state = { status: 'idle', message: '' };
  state = nextPilotState(state, { type: 'SELECT' });
  assert.equal(state.status, 'queued');
  state = nextPilotState(state, { type: 'PROCESS' });
  assert.equal(state.status, 'processing');
  state = nextPilotState(state, { type: 'ERROR', message: 'Safe rejection' });
  assert.deepEqual(state, { status: 'error', message: 'Safe rejection' });
  assert.deepEqual(nextPilotState(state, { type: 'RESET' }), { status: 'idle', message: '' });
});

test('derived artifact is deterministic, labeled in millimeters, and contains twelve facets', () => {
  const first = createPublicCubeDerivedStl();
  const second = createPublicCubeDerivedStl();
  assert.equal(first, second);
  assert.match(first, /inspection_mesh_mm/);
  assert.equal((first.match(/facet normal/g) || []).length, 12);
});

test('pilot route preserves privacy and production fail-closed boundaries', () => {
  const route = fs.readFileSync('app/aegis-pilot.tsx', 'utf8');
  const viewer = fs.readFileSync('components/CadFixtureViewer.tsx', 'utf8');
  assert.doesNotMatch(route, /console\.|localStorage|AsyncStorage|\/api\/cad\/user-import|fetch\([^)]*api/);
  assert.match(route, /No production upload or conversion service is called/);
  assert.match(route, /aria-label="Drop approved synthetic IGES file here"/);
  assert.match(route, /Live CAD upload remains disabled/);
  assert.match(viewer, /panByPixels/);
  assert.match(viewer, /event\.shiftKey \|\| event\.button === 2/);
  assert.match(viewer, /resetPan: true/);
  assert.match(viewer, /Shift\/right-drag pan/);
  assert.match(viewer, /data-testid="cad-pan-controls"/);
  assert.match(viewer, /data-testid="cad-orientation-controls"/);
  assert.match(viewer, /expanded \? \{ top: 'auto', bottom: 12 \}/);
  assert.match(viewer, /expanded \? \{ display: 'none' \}/);
});
