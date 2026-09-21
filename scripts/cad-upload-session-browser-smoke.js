// Standalone local QA: builds a temporary fixture route, removes it, then serves only loopback.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = '/private/tmp/cad-canonical-session-qa';
const dist = `${out}/export`;
const temporaryRoute = path.join(root, 'app/session-contract-qa.tsx');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run() {
  assert(!fs.existsSync(temporaryRoute), 'Refuse to overwrite an existing app route');
  fs.mkdirSync(out, { recursive: true });
  try {
    fs.copyFileSync(path.join(root, 'scripts/fixtures/cad-session-contract-qa.tsx.fixture'), temporaryRoute);
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit'], { cwd: root, stdio: 'pipe' });
    execFileSync(path.join(root, 'node_modules/.bin/expo'), ['export', '--platform', 'web', '--output-dir', dist], {
      cwd: root, env: { ...process.env, EXPO_ROUTER_APP_ROOT: path.join(root, 'app') }, stdio: 'pipe', timeout: 120000,
    });
  } finally { fs.rmSync(temporaryRoute, { force: true }); }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.mp4': 'video/mp4' };
  const server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(dist, `.${pathname}`);
    if (!file.startsWith(`${dist}/`) && file !== dist) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const results = [];
  try {
    browser = await chromium.launch();
    for (const width of [1440, 768, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, recordVideo: { dir: out, size: { width, height: 1000 } } });
      const counts = { writes: 0, uploadPosts: 0, conversionRequests: 0, bodyReads: 0, externalBlocked: 0 };
      await context.route('**/*', route => {
        const req = route.request(), url = new URL(req.url());
        if (/\/api\/cad\/(?:import|user-import|convert)/.test(url.pathname)) counts.conversionRequests++;
        if (req.method() === 'POST' && /\/api\/cad\//.test(url.pathname)) counts.uploadPosts++;
        if (!['GET', 'HEAD'].includes(req.method())) { counts.writes++; return route.abort(); }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: {} });
        if (url.origin !== origin) { counts.externalBlocked++; return route.abort(); }
        return route.continue();
      });
      await context.addInitScript(() => {
        window.__qaFileReads = 0;
        for (const key of ['arrayBuffer', 'text', 'stream', 'slice']) {
          Object.defineProperty(File.prototype, key, { configurable: true, get() {
            window.__qaFileReads++; throw new Error('QA blocked file-body access');
          } });
        }
        for (const key of ['readAsArrayBuffer', 'readAsBinaryString', 'readAsDataURL', 'readAsText']) {
          FileReader.prototype[key] = function () { window.__qaFileReads++; throw new Error('QA blocked FileReader'); };
        }
      });
      const page = await context.newPage();
      const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
      const checkClosed = async ({ diagnostics = false } = {}) => {
        if (diagnostics) {
          await page.getByTestId('cad-session-diagnostic-status').waitFor();
        } else {
          assert.equal(await page.getByText('Live upload locked', { exact: true }).count(), 0);
          assert.equal(await page.getByTestId('cad-import-details').count(), 0);
          assert.equal(await page.getByTestId('cad-session-state').count(), 0);
        }
        assert.equal(await page.getByRole('button', { name: 'Upload unavailable: operator access required' }).count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.getByTestId('cad-qualified-result').count(), 0);
        const reads = await page.evaluate(() => window.__qaFileReads);
        counts.bodyReads += reads; assert.equal(reads, 0);
      };
      await page.goto(origin);
      await page.getByTestId('home-mode-import').waitFor();
      const skip = page.getByText('Skip', { exact: true });
      if (await skip.isVisible()) await skip.click();
      await page.getByTestId('home-mode-import').click();
      await page.getByTestId('cad-import-panel').waitFor();
      assert.equal(await page.getByTestId('cad-connect-session').count(), 0);
      await page.getByTestId('cad-choose-file').click();
      const input = page.getByTestId('cad-file-input');
      await input.setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Not CAD. QA metadata only.') });
      await page.getByText('Unsupported format.', { exact: false }).waitFor();
      await input.setInputFiles({ name: 'synthetic.iges', mimeType: 'text/plain', buffer: Buffer.from('Not CAD. QA metadata only.') });
      await page.getByTestId('cad-selected-metadata').waitFor();
      await checkClosed();
      await page.getByTestId('cad-choose-file').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/${width}-default-selection.png` }); await wait(900);
      await page.getByRole('button', { name: 'Clear selected CAD file', exact: true }).click();
      await page.getByText('Selection cleared.', { exact: true }).waitFor();
      await checkClosed();
      await page.screenshot({ path: `${out}/${width}-default-clean.png` }); await wait(900);
      const expected = {
        success: 'Synthetic development session connected. Import remains local.',
        revoked: 'No upload session. Development sign-in is not connected; keep the file local.',
        error: 'Development session unavailable. Session access must be connected before import can proceed.',
        malformed: 'Import status unavailable. Keep the file local and check service status.',
        cancel: 'Request cancelled. Clear the selection to start again locally.',
        timeout: 'Request timed out. Keep the file local and check service status.',
      };
      for (const [mode, message] of Object.entries(expected)) {
        await page.goto(`${origin}/session-contract-qa?mode=${mode}`);
        await page.getByTestId('cad-import-details').click();
        await page.getByTestId('cad-connect-session').click();
        if (mode === 'cancel') {
          await page.getByText('Connecting session…', { exact: true }).waitFor();
          await page.getByRole('button', { name: 'Cancel synthetic handshake', exact: true }).click();
        }
        await page.getByTestId('cad-session-message').filter({ hasText: message }).waitFor();
        assert.equal(await page.getByTestId('qa-issuer-calls').innerText(), 'Issuer calls: 1');
        assert.equal(await page.evaluate(() => window.__cadSessionQaCalls), 1);
        await wait(1100); // Beyond the harness timeout: no automatic retry after any result.
        assert.equal(await page.getByTestId('qa-issuer-calls').innerText(), 'Issuer calls: 1');
        assert.equal(await page.evaluate(() => window.__cadSessionQaCalls), 1);
        await checkClosed({ diagnostics: true });
        assert.equal(await page.getByTestId('cad-connect-session').count(), mode === 'success' ? 0 : 1);
        if (mode !== 'success') assert.equal(await page.getByTestId('cad-connect-session').isEnabled(), true);
        await page.screenshot({ path: `${out}/${width}-${mode}.png` });
      }
      assert.equal(counts.writes, 0); assert.equal(counts.uploadPosts, 0); assert.equal(counts.conversionRequests, 0);
      assert.deepEqual(pageErrors, []);
      const video = page.video(); await context.close();
      await video.saveAs(`${out}/${width}-walkthrough.webm`);
      execFileSync('ffmpeg', ['-y', '-i', `${out}/${width}-walkthrough.webm`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-movflags', '+faststart', `${out}/${width}-walkthrough.mp4`, '-loglevel', 'error']);
      results.push({ width, height: 1000, ...counts, noOverflow: true, scenarios: Object.keys(expected) });
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stdout?.toString() || error); process.exitCode = 1; });
