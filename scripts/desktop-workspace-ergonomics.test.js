const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ergonomics = require('../utils/desktopErgonomics');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('desktop shortcut sequences are bounded and do not replace browser modifier shortcuts', () => {
  assert.equal(ergonomics.resolveDesktopShortcut('g', false), 'prefix');
  assert.equal(ergonomics.resolveDesktopShortcut('h', true), 'home');
  assert.equal(ergonomics.resolveDesktopShortcut('p', true), 'projects');
  assert.equal(ergonomics.resolveDesktopShortcut('n', true), 'new');
  assert.equal(ergonomics.resolveDesktopShortcut('t', true), 'tour');
  assert.equal(ergonomics.resolveDesktopShortcut('s', true), 'settings');
  assert.equal(ergonomics.resolveDesktopShortcut('c', true), 'canvas');
  assert.equal(ergonomics.resolveDesktopShortcut('i', true), 'inspector');
  assert.equal(ergonomics.resolveDesktopShortcut('x', true), null);
  assert.equal(ergonomics.resolveDesktopShortcut('h', false), null);
});

test('editable targets suppress desktop shortcuts', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']) {
    assert.equal(ergonomics.isDesktopShortcutEditableTarget({ tagName, getAttribute: () => null }), true);
  }
  for (const role of ['textbox', 'combobox', 'spinbutton', 'slider']) {
    assert.equal(ergonomics.isDesktopShortcutEditableTarget({ tagName: 'DIV', getAttribute: name => name === 'role' ? role : null }), true);
  }
  assert.equal(ergonomics.isDesktopShortcutEditableTarget({ tagName: 'DIV', isContentEditable: true, getAttribute: () => null }), true);
  assert.equal(ergonomics.isDesktopShortcutEditableTarget({ tagName: 'DIV', getAttribute: () => null }), false);
});

test('inspector sizing enforces bounds, keyboard increments, and reset semantics', () => {
  assert.equal(ergonomics.clampDesktopInspectorWidth(120), ergonomics.DESKTOP_INSPECTOR_MIN);
  assert.equal(ergonomics.clampDesktopInspectorWidth(999), ergonomics.DESKTOP_INSPECTOR_MAX);
  assert.equal(ergonomics.clampDesktopInspectorWidth('bad'), ergonomics.DESKTOP_INSPECTOR_DEFAULT);
  assert.equal(ergonomics.nextDesktopInspectorWidth(336, 'ArrowLeft'), 352);
  assert.equal(ergonomics.nextDesktopInspectorWidth(336, 'ArrowRight'), 320);
  assert.equal(ergonomics.nextDesktopInspectorWidth(336, 'Home'), ergonomics.DESKTOP_INSPECTOR_MIN);
  assert.equal(ergonomics.nextDesktopInspectorWidth(336, 'End'), ergonomics.DESKTOP_INSPECTOR_MAX);
  assert.equal(ergonomics.nextDesktopInspectorWidth(400, '0'), ergonomics.DESKTOP_INSPECTOR_DEFAULT);
});

test('desktop components expose modal suppression, accessible resize, collapse, and local-only presentation storage', () => {
  const navigation = read('components/DesktopNavigation.tsx');
  const workspace = read('components/DesktopCadWorkspace.tsx');
  assert.match(navigation, /isDesktopShortcutEditableTarget\(event\.target\)/);
  assert.match(navigation, /\[role="dialog"\].*\[aria-modal="true"\]/);
  assert.match(navigation, /event\.key === 'Escape'/);
  assert.match(navigation, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey/);
  assert.match(workspace, /role: 'separator'/);
  assert.match(workspace, /'aria-valuemin': DESKTOP_INSPECTOR_MIN/);
  assert.match(workspace, /'aria-valuemax': inspectorMaxWidth/);
  assert.match(workspace, /nextDesktopInspectorWidth/);
  assert.match(workspace, /DESKTOP_INSPECTOR_COLLAPSE_WIDTH/);
  assert.match(workspace, /reversr-desktop-presentation:v1/);
  assert.doesNotMatch(`${navigation}\n${workspace}`, /fetch\s*\(|cadAuthenticatedIgs|uploadSession|R2|Sandbox|checkout|provider request/i);
});
