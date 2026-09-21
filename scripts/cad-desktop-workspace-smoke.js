const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.CAD_DESKTOP_URL || 'http://localhost:5198';
const out = process.env.CAD_DESKTOP_EVIDENCE || '/private/tmp/cad-desktop-workspace';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height] of [[1366,768], [1440,900], [1024,768], [768,1024], [390,844], [320,740]]) {
      const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out, size: { width, height } } });
      let writes = 0; const errors = [];
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET','HEAD'].includes(request.method())) { writes++; return route.abort(); }
        if (url.origin !== new URL(base).origin) return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline synthetic QA' } });
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
      await page.getByTestId('cad-zoom-in').waitFor();
      await page.waitForFunction(() => !document.querySelector('[data-testid="cad-zoom-in"]').disabled);
      assert.equal(await page.getByTestId('desktop-navigation').count(), 0, 'CAD retains its dedicated workspace header');
      const viewer = page.getByTestId('cad-fixture-canvas-host');
      const bounds = await viewer.boundingBox();
      if (width >= 1024) {
        const rail = await page.getByTestId('cad-review-rail').boundingBox();
        assert(bounds.width >= width - 380, `viewer too narrow: ${JSON.stringify(bounds)}`);
        assert(bounds.x + bounds.width <= rail.x && rail.x + rail.width <= width, 'viewer and details rail fit without overlap');
        assert(bounds.y + bounds.height <= height, `viewer below fold: ${JSON.stringify(bounds)}`);
        assert.equal(await page.getByTestId('app-shell').evaluate(el => Math.round(el.getBoundingClientRect().width)), width);
      } else assert((await page.getByTestId('app-shell').boundingBox()).width <= 600);
      await page.getByTestId('cad-zoom-in').click();
      await page.getByTestId('cad-zoom-out').click();
      await page.getByTestId('cad-zoom-fit').click();
      await viewer.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/${width}x${height}-design.png` });
      await page.getByRole('button', { name: 'Expand orientation controls' }).click();
      const puck = await page.getByRole('group', { name: 'Orientation puck' }).boundingBox();
      const frame = await viewer.boundingBox();
      assert(puck.x >= frame.x && puck.y >= frame.y && puck.x + puck.width <= frame.x + frame.width + 1 && puck.y + puck.height <= frame.y + frame.height + 1);
      await page.getByRole('button', { name: 'Show front view', exact: true }).click();
      await page.getByRole('button', { name: 'Reset to fitted isometric view', exact: true }).click();
      await page.getByRole('button', { name: 'Collapse orientation controls' }).click();
      await page.getByRole('button', { name: 'Change CAD source', exact: true }).click();
      await page.getByTestId('cad-select-public-sample').click();
      await page.getByTestId('cad-review-qualified-result').waitFor();
      if (width >= 1024) {
        const action = await page.getByTestId('cad-review-qualified-result').boundingBox();
        assert(action.y + action.height <= height);
      }
      await page.screenshot({ path: `${out}/${width}x${height}-input.png` });
      await page.getByTestId('cad-review-qualified-result').click();
      await page.getByTestId('cad-phase-3').waitFor();
      await page.getByTestId('cad-design-details').click();
      await page.getByRole('button', { name: 'View implementation readiness', exact: true }).click();
      await page.getByTestId('cad-build-locked').waitFor();
      assert(await page.getByRole('button', { name: 'Prepare outputs unavailable: manufacturing review required' }).isDisabled());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0); assert.deepEqual(errors, []);
      const video = page.video(); await context.close(); await video.saveAs(`${out}/${width}x${height}-walkthrough.webm`);
      results.push({ width, height, viewer: bounds, writes, errors });
      console.log(`PASS ${width}x${height}`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
