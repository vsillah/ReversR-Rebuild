const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const app = fs.readFileSync('app/index.tsx', 'utf8');
const guide = fs.readFileSync('components/ManufacturerTourGuide.tsx', 'utf8');
const review = fs.readFileSync('components/CadDesignReview.tsx', 'utf8');
const fixtureSource = fs.readFileSync('utils/cadInternalTesterPreview.js', 'utf8');
const fixtureTypes = fs.readFileSync('utils/cadInternalTesterPreview.d.ts', 'utf8');

test('active Tour entry is a resumable and restartable Dispenser manufacturer tour', () => {
  assert.match(app, /import ManufacturerTourGuide, \{ ManufacturerTourStep \}/);
  assert.doesNotMatch(app, /from ["']\.\.\/components\/TourGuide["']/);
  assert.match(app, /reversr-manufacturer-tour:dispenser-v1/);
  assert.match(app, /const MANUFACTURER_TOUR_PREVIEW[\s\S]*MARK_DISPENSER_RESULT/);
  assert.match(app, /const shouldRestart = Boolean\(tourCompletedAt\)/);
  assert.match(app, /onRestart=\{restartTour\}/);
  assert.match(app, /restoreTourOrigin\(\)/);
  assert.match(app, /accessibilityLabel="Resume or start manufacturer tour"/);

  const activeTourBlock = app.slice(
    app.indexOf('const TOUR_STEPS:'),
    app.indexOf('const MANUFACTURER_TOUR_PREVIEW'),
  );
  assert.doesNotMatch(activeTourBlock, /FarmBot|checklist|Structure ID|mock journey/i);
  for (const id of ['source', 'inventory', 'controls', 'traceability', 'privacy', 'decision']) {
    assert.match(activeTourBlock, new RegExp(`id: '${id}'`));
  }
});

test('tour copy covers manufacturer facts, recovery, and the full certification boundary', () => {
  for (const expected of [
    'Dispenser.IGS',
    'Format: IGES',
    'Units: millimeters',
    '55.74 × 69.42 × 114.83 mm',
    'Four connected components',
    'original IGS',
    'derived inspection artifact',
    'single Download menu',
    'does not upload, persist, convert, or delete private CAD',
    'Change source returns to the existing Import journey',
    'tolerances, materials, threads, surface finish, wall thickness, supports, orientation, or fabrication readiness',
    'Decision: hold for engineering and manufacturing review',
  ]) {
    assert.match(app, new RegExp(expected.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(guide, /accessibilityLabel="Restart manufacturer tour"/);
  assert.match(guide, /accessibilityLabel="Exit manufacturer tour"/);
  assert.match(guide, /Confirm hold & finish/);
  assert.doesNotMatch(guide, /Structure ID|Actions for you|Mark manual|FarmBot/i);
});

test('Dispenser source and derived STL stay distinct and traceable in one download menu', () => {
  assert.match(fixtureSource, /sourceFileName: 'Dispenser\.IGS'/);
  assert.match(fixtureSource, /assetUrl: '\/cad-fixtures\/mark-dispenser-v1\/dispenser-derived\.stl'/);
  assert.match(fixtureTypes, /kind: 'stl'/);
  assert.equal((review.match(/testID="cad-download-menu-trigger"/g) || []).length, 1);
  assert.match(review, /Original IGS \(\.igs\)/);
  assert.match(review, /Inspection mesh \(\.stl\)/);
  assert.match(review, /staticDerivedAsset/);
  assert.match(review, /sourceSha256: fixture\.sha256/);
  assert.match(review, /cad-source-fingerprint/);
  assert.match(review, /cad-derived-fingerprint/);
});

test('tour work does not weaken private artifact deletion or production boundaries', () => {
  assert.match(review, /Delete private CAD artifacts and revoke access/);
  assert.match(review, /authenticatedArtifacts\.deleteAll\(\)/);
  assert.doesNotMatch(guide, /fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
  assert.doesNotMatch(guide, /private customer|customer file|credential|provider configuration/i);
});
