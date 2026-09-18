const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('native Import can open the internal Dispenser review without unlocking upload', () => {
  const appIndex = read('app/index.tsx');
  const phaseOne = read('components/PhaseOne.tsx');
  const importPanel = read('components/CadImportPanel.tsx');

  assert.match(appIndex, /MARK_DISPENSER_RESULT/);
  assert.match(appIndex, /nativeCadPreviewEnabled/);
  assert.match(appIndex, /code:\s*'CAD_TEST_PREVIEW_MARK_DISPENSER'/);
  assert.match(appIndex, /onOpenCadInternalPreview=\{Platform\.OS === 'web' \? undefined : openNativeCadInternalPreview\}/);

  assert.match(phaseOne, /onOpenCadInternalPreview\?: \(\) => void;/);
  assert.match(phaseOne, /onOpenInternalPreview=\{onOpenCadInternalPreview\}/);

  assert.match(importPanel, /cad-native-internal-preview-entry/);
  assert.match(importPanel, /cad-open-native-internal-preview/);
  assert.match(importPanel, /Review public Dispenser preview/);
  assert.match(importPanel, /This does not upload files or unlock live CAD admission\./);
  assert.match(importPanel, /Live upload locked/);
  assert.match(importPanel, /Live upload remains locked below/);
});
