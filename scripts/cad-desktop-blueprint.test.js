const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const app = fs.readFileSync('app/index.tsx', 'utf8');
const shell = fs.readFileSync('components/DesktopCadWorkspace.tsx', 'utf8');
const nav = fs.readFileSync('components/DesktopNavigation.tsx', 'utf8');
const input = fs.readFileSync('components/CadImportPanel.tsx', 'utf8');
const guide = fs.readFileSync('components/ManufacturerTourGuide.tsx', 'utf8');
const action = fs.readFileSync('components/CadReviewUI.tsx', 'utf8');

test('desktop CAD route owns a rail, bounded phase rail, canvas, and inspector', () => {
  assert.match(app, /if \(desktopCadWorkspace\)/);
  assert.match(app, /<DesktopCadWorkspace/);
  assert.match(shell, /width < 1280/);
  assert.match(nav, /rail: \{ width: 216/);
  assert.match(nav, /compactRail: \{ width: 72/);
  assert.match(shell, /maxWidth: 980/);
  assert.match(shell, /testID="desktop-workspace-canvas"/);
  assert.match(shell, /testID="desktop-workspace-inspector"/);
  assert.match(shell, /width >= 1600 \? 360 : width >= 1280 \? 336 : 300/);
});

test('Input keeps one picker and presents equal local and public source choices', () => {
  assert.equal((input.match(/data-testid="cad-file-input"/g) || []).length, 1);
  assert.match(input, /testID="cad-local-source-choice"/);
  assert.match(input, /testID="cad-public-source-choice"/);
  assert.equal((input.match(/flexBasis: desktop \? 260 : 220/g) || []).length, 2);
  assert.match(input, /Choose CAD file from this device/);
  assert.match(input, /Use public sample/);
  assert.match(input, /testID="cad-selected-source-preview"/);
  assert.doesNotMatch(input, /Animated|animationDuration|source explainer|glow/i);
});

test('desktop actions stay bounded and the tour has an in-flow inspector mode', () => {
  assert.match(action, /maxWidth: 280/);
  assert.match(app, /tour=\{tourActive \? renderTourGuide\(true\) : undefined\}/);
  assert.match(guide, /docked\s*\? styles\.dockInspector/);
  assert.match(guide, /dockInspector: \{ position: 'relative'/);
  assert.doesNotMatch(shell, /position: 'absolute'/);
});

test('desktop shell remains presentation-only', () => {
  for (const source of [shell, nav]) {
    assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|FormData|FileReader|localStorage|sessionStorage/);
  }
  assert.match(app, /<CadWorkflow preview=\{activeCadPreview\}/);
});
