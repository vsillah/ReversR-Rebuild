const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.CAD_DESKTOP_URL || 'http://localhost:5001';
const out = process.env.CAD_DESKTOP_EVIDENCE || '/private/tmp/cad-desktop-workflow-migration';
const viewports = [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out, size: { width, height } } });
      const page = await context.newPage();
      const errors = [];
      let writes = 0;
      let externalRequests = 0;
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes += 1;
          return route.abort();
        }
        if (url.origin !== new URL(base).origin) {
          externalRequests += 1;
          return route.abort();
        }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline migration QA' } });
        return route.continue();
      });

      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=inventory`);
      await page.getByRole('heading', { name: 'Auto-generated inventory', exact: true }).waitFor();
      assert.equal(await page.getByTestId('desktop-navigation').count(), width >= 1024 ? 1 : 0);
      assert.equal(await page.getByTestId('cad-desktop-phase-layout').count(), width >= 1024 ? 1 : 0);
      if (width >= 1024) {
        const canvas = await page.getByTestId('cad-inventory-canvas').boundingBox();
        const inspector = await page.getByTestId('cad-inventory-inspector').boundingBox();
        assert(canvas.x + canvas.width <= inspector.x, 'Inventory canvas and inspector must not overlap');
        assert([300, 336, 360].includes(Math.round(inspector.width)), `Unexpected inspector width ${inspector.width}`);
      }
      await page.getByTestId('cad-inventory-details').click();
      await page.getByTestId('cad-inventory-details').click();
      await page.screenshot({ path: `${out}/${width}x${height}-inventory.png` });
      await page.getByRole('button', { name: 'Review in Design', exact: true }).click();

      await page.getByTestId('cad-command-zoom').waitFor();
      await page.waitForFunction(() => !document.querySelector('[data-testid="cad-command-zoom"]').disabled);
      if (width >= 1024) {
        const viewer = await page.getByTestId('cad-fixture-canvas-host').boundingBox();
        const inspector = await page.getByTestId('cad-review-rail').boundingBox();
        assert(viewer.x + viewer.width <= inspector.x, 'Design viewer and inspector must not overlap');
      }
      await page.getByTestId('cad-command-view').click();
      await page.getByTestId('cad-controller-mode-move').click();
      await page.getByRole('button', { name: 'Move model right one step', exact: true }).click();
      await page.getByTestId('cad-controller-mode-orbit').click();
      await page.getByRole('button', { name: 'Show fixed front view', exact: true }).click();
      await page.getByTestId('cad-command-view').click();
      await page.getByTestId('cad-command-zoom').click();
      await page.getByTestId('cad-zoom-in').click();
      await page.getByTestId('cad-zoom-fit').click();
      await page.getByTestId('cad-command-zoom').click();
      await page.getByTestId('cad-download-menu-trigger').click();
      await page.getByTestId('cad-download-menu-trigger').click();
      await page.getByTestId('cad-design-details').click();
      await page.getByTestId('cad-design-details').click();
      await page.screenshot({ path: `${out}/${width}x${height}-design.png` });
      await page.getByRole('button', { name: 'View implementation readiness', exact: true }).click();

      await page.getByTestId('cad-build-locked').waitFor();
      for (const index of [1, 2, 3]) await page.getByTestId(`cad-commercialization-step-${index}`).click();
      assert(await page.getByRole('button', { name: 'Prepare implementation package locked', exact: true }).isDisabled());
      if (width >= 1024) {
        assert.equal(await page.getByTestId('cad-build-inspector').count(), 1);
        await page.getByTestId('cad-build-certification-limits').click();
        await page.getByTestId('cad-build-certification-limits').click();
      }
      await page.screenshot({ path: `${out}/${width}x${height}-build.png` });
      await page.getByRole('button', { name: 'Review inventory prerequisites', exact: true }).click();
      await page.getByRole('button', { name: 'Review in Design', exact: true }).click();
      await page.getByRole('button', { name: 'Change CAD source', exact: true }).click();
      assert.equal(await page.getByTestId('cad-phase-1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0);
      assert.equal(externalRequests, 0);
      assert.deepEqual(errors, []);

      const video = page.video();
      await context.close();
      await video.saveAs(`${out}/${width}x${height}-walkthrough.webm`);
      results.push({ width, height, writes, externalRequests, errors });
      console.log(`PASS ${width}x${height}`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
