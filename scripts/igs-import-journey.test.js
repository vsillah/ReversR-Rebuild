const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const crypto = require('node:crypto');
const {
  IGS_MAX_BYTES,
  PUBLIC_CUBE_SHA256,
  createPublicCubeDerivedStl,
  nextIgsImportState,
  validateIgsFileMetadata,
} = require('../utils/igsImportJourney');

test('import accepts IGS metadata and rejects unsupported, empty, and oversized files', () => {
  assert.equal(validateIgsFileMetadata({ name: 'public.IGS', size: 100 }).ok, true);
  assert.equal(validateIgsFileMetadata({ name: 'private.step', size: 100 }).code, 'IGS_ONLY');
  assert.equal(validateIgsFileMetadata({ name: 'empty.igs', size: 0 }).code, 'EMPTY_FILE');
  assert.equal(validateIgsFileMetadata({ name: 'large.igs', size: IGS_MAX_BYTES + 1 }).code, 'FILE_TOO_LARGE');
});

test('the approved fixture digest remains bound to the checked-in public cube', () => {
  const source = fs.readFileSync('public/cad-fixtures/public-cube-10x10.igs');
  assert.equal(source.byteLength, 11562);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), PUBLIC_CUBE_SHA256);
});

test('journey transitions support processing, error recovery, and reset', () => {
  let state = { status: 'idle', message: '' };
  state = nextIgsImportState(state, { type: 'SELECT' });
  assert.equal(state.status, 'queued');
  state = nextIgsImportState(state, { type: 'PROCESS' });
  assert.equal(state.status, 'processing');
  state = nextIgsImportState(state, { type: 'READY' });
  assert.equal(state.status, 'ready');
  state = nextIgsImportState(state, { type: 'SELECT' });
  assert.equal(state.status, 'queued');
  state = nextIgsImportState(state, { type: 'ERROR', message: 'Safe rejection' });
  assert.deepEqual(state, { status: 'error', message: 'Safe rejection' });
  assert.deepEqual(nextIgsImportState(state, { type: 'RESET' }), { status: 'idle', message: '' });
});

test('derived artifact is deterministic, labeled in millimeters, and contains twelve facets', () => {
  const first = createPublicCubeDerivedStl();
  const second = createPublicCubeDerivedStl();
  assert.equal(first, second);
  assert.match(first, /inspection_mesh_mm/);
  assert.equal((first.match(/facet normal/g) || []).length, 12);
});

test('integrated import preserves privacy and production fail-closed boundaries', () => {
  const route = fs.readFileSync('components/PublicIgsImportPanel.tsx', 'utf8');
  const viewer = fs.readFileSync('components/CadFixtureViewer.tsx', 'utf8');
  const home = fs.readFileSync('app/index.tsx', 'utf8');
  const phaseOne = fs.readFileSync('components/PhaseOne.tsx', 'utf8');
  const workflow = fs.readFileSync('components/CadWorkflow.tsx', 'utf8');
  assert.doesNotMatch(route, /console\.|localStorage|AsyncStorage|\/api\/cad\/user-import|fetch\([^)]*api/);
  assert.match(route, /No production upload or conversion service is called/);
  assert.match(route, /aria-label="Drop approved public IGS file here"/);
  assert.match(route, /Live CAD upload remains disabled/);
  assert.match(phaseOne, /PublicIgsImportPanel/);
  assert.match(home, /navigateCadPhase\(3\)/);
  assert.match(home, /fixture\.qualificationProvenance\?\.kind === 'synthetic-igs-local'/);
  assert.match(home, /'CAD_TEST_PREVIEW_SYNTHETIC_IGS'/);
  assert.match(home, /'CAD_TEST_PREVIEW_PUBLIC_CUBE'/);
  assert.match(home, /url\.searchParams\.get\('cadPhase'\) !== phaseName/);
  assert.match(home, /\[activeCadPreview\.enabled, cadPhase, context\.id, context\.phase, showHistory, started, welcomeIntroVisible\]/);
  assert.match(home, /activeCadPreview\.enabled \? `cad-review:\$\{cadPhase\}` : context\.phase/);
  assert.match(home, /testID="reversr-workflow-scroll"/);
  assert.match(workflow, /onPhase\(3\)/);
  assert.match(workflow, /Boolean\(preview\.fixture\.derivedInspectionStl\)/);
  assert.match(route, /No \.igs file available\? Try the public sample/);
  assert.doesNotMatch(route, /Continue to Inventory|Review in Design/);
  assert.match(route, /if \(busy\) return/);
  assert.match(route, /onReady\(PUBLIC_CUBE_RESULT\)/);
  assert.match(viewer, /panByPixels/);
  assert.match(viewer, /event\.shiftKey \|\| event\.button === 2/);
  assert.match(viewer, /resetPan: true/);
  assert.match(viewer, /Shift\/right-drag pan/);
  assert.doesNotMatch(viewer, /data-testid="cad-pan-controls"/);
  assert.match(viewer, /data-testid="cad-shared-control-ring"/);
  assert.match(viewer, /data-testid="cad-view-controller"/);
  assert.doesNotMatch(viewer, /cad-interaction-guide|interactionGuideStyle/);
  assert.match(viewer, /data-testid="cad-control-tooltip" role="tooltip"/);
});
