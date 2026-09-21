const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const preview = require('../utils/cadInternalTesterPreview');

// Exercise the actual hook with platform/window inputs; no React renderer is needed
// because its only hook dependency is the dimensions snapshot.
const source = ts.transpileModule(fs.readFileSync(require.resolve('../hooks/useDesktopWorkspace.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function layout({ platform = 'web', width = 1366, search = '', hostname = 'localhost', server = false } = {}) {
  const sandbox = {
    exports: {},
    require: name => name === 'react-native'
      ? { Platform: { OS: platform }, useWindowDimensions: () => ({ width, height: 768 }) }
      : preview,
    ...(!server && { window: { location: { hostname, search, pathname: '/' } } }),
  };
  vm.runInNewContext(source, sandbox);
  return sandbox.exports.useDesktopWorkspace();
}

test('ordinary web surfaces expand at 1024px and keep the compact shell below it', () => {
  for (const width of [320, 390, 600, 768, 1023, 1024, 1366, 1440, 1920]) {
    assert.equal(layout({ width }).desktop, width >= 1024, `width ${width}`);
  }
});
test('native apps stay compact even on wide windows', () => {
  for (const platform of ['ios', 'android']) {
    for (const width of [390, 1024, 1920]) assert.equal(layout({ platform, width }).desktop, false);
  }
});
test('installed-app embedded preview retains its compact shell', () => {
  assert.equal(layout({ search: '?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render' }).desktop, false);
});
test('desktop presentation is independent of CAD preview admission', () => {
  for (const search of ['', '?cadPreview=invalid', '?cadPreview=public-cube-v1']) {
    assert.equal(layout({ search }).desktop, true);
    assert.equal(layout({ search, hostname: 'example.com' }).desktop, true);
  }
  assert.equal(preview.inspectCadInternalTesterPreview({ hostname: 'example.com', search: '?cadPreview=public-cube-v1' }).enabled, false);
  assert.equal(preview.inspectCadInternalTesterPreview({ hostname: 'reversr.vercel.app', search: '' }).enabled, false);
});
test('server rendering is safe without a browser window', () => {
  assert.equal(layout({ server: true, width: 0 }).desktop, false);
});
