// Local-only rendered verification. No session adapter is injected into the app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const url = 'http://127.0.0.1:5199';
const out = '.local/cad-convex/cad-upload-session-client-adapter-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        serviceWorkers: 'block',
        ...(width === 390 ? { recordVideo: { dir: '/private/tmp/cad-session-adapter-video', size: { width, height: 1000 } } } : {}),
      });
      const posts = [], errors = [];
      await context.addInitScript(() => {
        window.__cadBodyReads = 0;
        for (const key of ['arrayBuffer', 'text', 'stream', 'slice']) Object.defineProperty(File.prototype, key, { value() { window.__cadBodyReads++; throw Error('File body access prohibited'); } });
        for (const key of ['readAsArrayBuffer', 'readAsDataURL', 'readAsText', 'readAsBinaryString']) FileReader.prototype[key] = function () { window.__cadBodyReads++; throw Error('File body access prohibited'); };
      });
      await context.route('**/*', route => {
        const request = route.request();
        const requestUrl = new URL(request.url());
        if (request.method() === 'POST' && requestUrl.pathname === '/api/cad/user-import') posts.push(request.url());
        if (requestUrl.pathname === '/api/cad/capabilities') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) });
        return requestUrl.origin === url && request.method() === 'GET' ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      const skip = page.getByRole('button', { name: 'Skip welcome video', exact: true });
      await skip.waitFor({ state: 'visible', timeout: 5000 });
      await skip.click();
      await page.getByRole('button', { name: 'Start new machine reconstruction — Import, CAD file', exact: true }).click();
      const panel = page.getByTestId('cad-import-panel');
      await panel.waitFor();
      assert.equal(await page.getByTestId('cad-connect-session').count(), 0);
      assert.equal(await page.getByText('Live upload locked', { exact: true }).count(), 0);
      assert.equal(await page.getByTestId('cad-session-state').count(), 0);
      assert.equal(await page.getByTestId('cad-import-details').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Upload unavailable: operator access required' }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await panel.evaluate(element => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${out}/${width}-fail-closed.png` });
      if (width === 390) await page.waitForTimeout(1800);
      assert.deepEqual(posts, []);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => window.__cadBodyReads), 0);
      const video = width === 390 ? page.video() : null;
      await context.close();
      if (video) await video.saveAs(`${out}/walkthrough-source.webm`);
      results.push({ width, adapterInjected: false, uploadPosts: 0, fileBodyReads: 0, errors, roadmapWarningHidden: true, noOverflow: true });
    }
    const sidebar = await browser.newPage({ viewport: { width: 360, height: 1000 } });
    await sidebar.setContent('<body style="margin:0;background:#eef2f6;color:#162334;font:22px Arial;line-height:1.55"><main style="padding:48px 24px"><h2>SESSION ADAPTER</h2><p>Strict cookie-only acknowledgement contract.</p><hr><p>Default app path remains fail-closed.</p><p>No issuer injected.<br>No upload POSTs.<br>No file body reads.<br>No conversion.</p><p style="font-size:17px">Real Import surface<br>390 px viewport</p></main></body>');
    await sidebar.screenshot({ path: `${out}/side-text.png` });
    const render = spawnSync('ffmpeg', ['-y', '-i', `${out}/walkthrough-source.webm`, '-loop', '1', '-i', `${out}/side-text.png`, '-filter_complex', '[0:v][1:v]hstack=inputs=2:shortest=1[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', '-movflags', '+faststart', `${out}/walkthrough.mp4`], { encoding: 'utf8' });
    assert.equal(render.status, 0, render.stderr);
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
