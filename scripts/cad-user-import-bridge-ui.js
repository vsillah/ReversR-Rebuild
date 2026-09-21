// Local-only browser verification. API responses below are explicit test fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const url = 'http://127.0.0.1:5198';
const out = 'docs/qa/cad-user-import-bridge';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', ...(width === 390 ? { recordVideo: { dir: '/private/tmp/cad-bridge-video', size: { width, height: 1000 } } } : {}) });
      const posts = [], errors = [];
      await context.addInitScript(() => {
        window.__cadBodyReads = 0;
        for (const key of ['arrayBuffer', 'text', 'stream', 'slice']) Object.defineProperty(File.prototype, key, { value() { window.__cadBodyReads++; throw Error('File body access prohibited'); } });
        for (const key of ['readAsArrayBuffer', 'readAsDataURL', 'readAsText', 'readAsBinaryString']) FileReader.prototype[key] = function () { window.__cadBodyReads++; throw Error('File body access prohibited'); };
      });
      await context.route('**/*', route => {
        const r = route.request(), u = new URL(r.url());
        if (r.method() === 'POST' && u.pathname === '/api/cad/user-import') posts.push(r.url());
        if (u.pathname === '/api/cad/capabilities') {
          return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        }
        return u.origin === url && r.method() === 'GET' ? route.continue() : route.abort();
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);
      const enter = page.getByRole('button', { name: 'Enter ReversR home', exact: true });
      if (await enter.count()) await enter.click();
      await page.getByRole('button', { name: 'Start new machine reconstruction — Import, CAD file', exact: true }).click();
      const panel = page.getByTestId('cad-import-panel');
      const capture = async name => {
        await panel.evaluate(el => el.scrollIntoView({ block: 'start' }));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${out}/${width}-${name}.png` });
        if (width === 390) await page.waitForTimeout(1800);
      };
      await panel.waitFor();
      assert.equal(await page.getByText('Live upload locked', { exact: true }).count(), 0);
      assert.equal(await page.getByTestId('cad-session-state').count(), 0);
      assert.equal(await page.getByTestId('cad-import-details').count(), 0);
      const accept = await page.getByTestId('cad-file-input').evaluate(input => input.getAttribute('accept') || '');
      assert.match(accept, /\.igs/);
      assert.match(accept, /\.iges/);
      assert.match(accept, /\.step/);
      assert.match(accept, /\.stp/);
      assert.equal(accept.includes('*/*'), false);
      assert.equal(await page.getByRole('button', { name: 'Upload unavailable: operator access required' }).count(), 0);
      await capture('no-session');
      const select = async (name, buffer) => {
        const chooser = page.waitForEvent('filechooser');
        await page.getByTestId('cad-choose-file').click();
        await (await chooser).setFiles({ name, mimeType: 'application/octet-stream', buffer: Buffer.from(buffer) });
      };
      await select('synthetic.igs', 'SYNTHETIC METADATA TEST ONLY');
      await page.getByText('CAD file prepared locally. Nothing was uploaded or converted.', { exact: true }).waitFor();
      await capture('prepared');
      await select('unsupported.zip', 'synthetic');
      await page.getByText('Unsupported format. Choose a CAD file such as IGES, STEP, BREP, STL, OBJ, DXF, or DWG.', { exact: true }).waitFor();
      assert.equal(await page.getByTestId('cad-selected-metadata').count(), 0);
      await select('empty.igs', '');
      await page.getByText('This file is empty or has an invalid size. Choose another CAD file.', { exact: true }).waitFor();
      await capture('invalid');
      await select('synthetic.iges', 'SYNTHETIC METADATA TEST ONLY');
      await page.getByRole('button', { name: 'Clear selected CAD file', exact: true }).click();
      assert.equal(await page.getByTestId('cad-selected-metadata').count(), 0);
      await page.getByText('Selection cleared.', { exact: true }).waitFor();
      await capture('recovered');
      assert.equal(await page.getByText('Live upload locked', { exact: true }).count(), 0);
      assert.equal(await page.getByTestId('cad-import-details').count(), 0);
      assert.equal(await page.getByTestId('cad-session-state').count(), 0);
      assert.deepEqual(posts, []); assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => window.__cadBodyReads), 0);
      const video = width === 390 ? page.video() : null;
      await context.close();
      if (video) await video.saveAs(`${out}/walkthrough-source.webm`);
      results.push({ width, uploadPosts: posts.length, fileBodyReads: 0, errors, selectionReplaceClear: true, invalidAndEmptyRecovery: true, roadmapWarningHidden: true, noOverflow: true });
      console.log(`PASS ${width}: local preparation, recovery, no roadmap warning, zero upload POSTs/body reads`);
    }
    const sidebar = await browser.newPage({ viewport: { width: 360, height: 1000 } });
    await sidebar.setContent(`<body style="margin:0;background:#eef2f6;color:#162334;font:22px Arial;line-height:1.6"><main style="padding:50px 25px"><h2>CAD IMPORT</h2><p>Local preparation only</p><p>1. Select CAD file<br>2. Reject unsupported formats<br>3. Replace or clear<br>4. Keep roadmap gates hidden</p><hr><p>Zero upload POSTs.<br>Zero file body reads.<br>No conversion.</p><p style="font-size:17px">Real route: 127.0.0.1:5198<br>Home → Import<br>390 px viewport</p><p style="font-size:17px">The user-facing panel does not expose upload-session or admission-route warnings.</p></main></body>`);
    await sidebar.screenshot({ path: `${out}/side-text.png` });
    const result = spawnSync('ffmpeg', ['-y', '-i', `${out}/walkthrough-source.webm`, '-loop', '1', '-i', `${out}/side-text.png`, '-filter_complex', '[0:v][1:v]hstack=inputs=2:shortest=1[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', '-movflags', '+faststart', `${out}/walkthrough.mp4`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
