const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('native Import opens the internal installed-app IGS renderer without unlocking production upload', () => {
  const appIndex = read('app/index.tsx');
  const phaseOne = read('components/PhaseOne.tsx');
  const importPanel = read('components/CadImportPanel.tsx');
  const nativePreview = read('components/CadNativeInternalUploadPreview.tsx');
  const targetConfig = read('utils/cadNativeInternalUploadPreview.js');
  const internalPreviewDoc = read('docs/cad-internal-tester-preview.md');
  const nativeReleaseRunbook = read('docs/native-release-runbook.md');
  const easConfig = JSON.parse(read('eas.json'));
  const packageJson = JSON.parse(read('package.json'));

  assert.doesNotMatch(appIndex, /MARK_DISPENSER_RESULT/);
  assert.doesNotMatch(appIndex, /nativeCadPreviewEnabled/);
  assert.match(appIndex, /nativeCadUploadPreviewVisible/);
  assert.match(appIndex, /isCadNativeEmbeddedPreview/);
  assert.match(appIndex, /nativeEmbeddedCadPreview/);
  assert.match(appIndex, /styles\.embeddedPreviewContent/);
  assert.match(appIndex, /compact=\{nativeEmbeddedCadPreview\}/);
  assert.match(appIndex, /<CadNativeInternalUploadPreview/);
  assert.match(appIndex, /onOpenCadInternalPreview=\{Platform\.OS === 'web' \? undefined : openNativeCadInternalPreview\}/);

  assert.match(phaseOne, /onOpenCadInternalPreview\?: \(\) => void;/);
  assert.match(phaseOne, /onOpenInternalPreview=\{onOpenCadInternalPreview\}/);

  assert.match(importPanel, /cad-native-internal-preview-entry/);
  assert.match(importPanel, /cad-open-native-internal-preview/);
  assert.match(importPanel, /Open internal IGS preview/);
  assert.match(importPanel, /Preview mode · upload\/conversion locked/);
  assert.match(importPanel, /!onOpenInternalPreview/);
  assert.match(importPanel, /Live upload locked/);

  assert.match(nativePreview, /react-native-webview/);
  assert.match(nativePreview, /import \{ WebView \} from 'react-native-webview';/);
  assert.doesNotMatch(nativePreview, /require\('react-native-webview'\)/);
  assert.match(nativePreview, /useSafeAreaInsets/);
  assert.match(nativePreview, /nativePreviewCacheBust/);
  assert.match(nativePreview, /cad-native-upload-render-webview/);
  assert.match(nativePreview, /allowFileAccess/);
  assert.match(nativePreview, /cacheEnabled=\{false\}/);
  assert.match(nativePreview, /cacheMode="LOAD_NO_CACHE"/);
  assert.match(nativePreview, /setSupportMultipleWindows=\{false\}/);
  assert.match(nativePreview, /isAllowedCadNativeInternalUploadRenderUrl/);
  assert.match(nativePreview, /Preview mode · upload and conversion locked/);

  assert.match(targetConfig, /PRODUCTION_HOSTNAME = 'reversr\.vercel\.app'/);
  assert.match(targetConfig, /CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PREVIEW = 'mark-dispenser-v1'/);
  assert.match(targetConfig, /EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL/);
  assert.match(targetConfig, /process\.env\.EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL/);

  const profile = easConfig.build['cad-internal-upload-preview'];
  assert.equal(profile.distribution, 'internal');
  assert.equal(profile.environment, 'preview');
  assert.equal(profile.channel, 'cad-internal-upload-preview');
  assert.match(profile.env.EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL, /^https:\/\/reversr\.vercel\.app\//);
  assert.match(profile.env.EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL, /cadPreview=mark-dispenser-v1/);
  assert.equal(packageJson.dependencies['react-native-webview'], '13.16.1');

  for (const releaseDoc of [internalPreviewDoc, nativeReleaseRunbook]) {
    assert.match(releaseDoc, /EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL='https:\/\/reversr\.vercel\.app\/\?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render'/);
    assert.match(releaseDoc, /--channel cad-internal-upload-preview/);
    assert.match(releaseDoc, /--environment preview/);
    assert.match(releaseDoc, /--platform android/);
    assert.match(releaseDoc, /Internal preview unavailable/);
  }
});
