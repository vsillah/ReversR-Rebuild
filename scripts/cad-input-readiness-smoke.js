const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const url = process.env.CAD_INPUT_READINESS_URL || 'http://127.0.0.1:5196/?cadPreview=public-cube-v1&cadQualification=synthetic-igs-v1&cadPhase=input';
const out = process.env.CAD_INPUT_READINESS_EVIDENCE || '/private/tmp/reversr-cad-input-readiness';
const recordVideo = process.env.CAD_INPUT_READINESS_RECORD === '1';
const viewports = [
  { name: 'narrow-mobile', width: 320, height: 800, touch: true, maxInputHeight: 600 },
  { name: 'mobile', width: 390, height: 844, touch: true, maxInputHeight: 600 },
  { name: 'tablet', width: 768, height: 900, touch: true, maxInputHeight: 400 },
  { name: 'desktop', width: 1440, height: 1000, touch: false, maxInputHeight: 380 },
];
const removedCopy = [
  'Local synthetic qualification',
  'One browser · one attempt · zero retries',
  'Ready for a public file',
  'No production upload or conversion service is called.',
  'Non-production paths only.',
];

fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        serviceWorkers: 'block',
        ...(recordVideo ? { recordVideo: { dir: out, size: { width: viewport.width, height: viewport.height } } } : {}),
      });
      let writes = 0;
      const blocked = [];
      await context.route('**/*', route => {
        const request = route.request();
        const target = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes += 1;
          return route.abort();
        }
        if (target.origin !== new URL(url).origin) {
          blocked.push(target.pathname);
          return route.abort();
        }
        if (target.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Local source-only QA' } });
        return route.continue();
      });

      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const pause = async (milliseconds = 700) => { if (recordVideo) await page.waitForTimeout(milliseconds); };
      const phase = label => page.getByTestId('reversr-tour-phase-nav').getByRole('button', { name: new RegExp(`^${label} phase,`) });
      const waitForInput = async () => {
        await page.getByTestId('cad-phase-1').waitFor();
        await page.getByTestId('igs-import-panel').waitFor();
      };

      await page.goto(url);
      await waitForInput();
      for (const copy of removedCopy) assert.equal(await page.getByText(copy, { exact: false }).count(), 0, `${copy} should not remain on Input`);
      const inputHeight = await page.getByTestId('igs-import-panel').evaluate(element => element.getBoundingClientRect().height);
      assert(inputHeight < viewport.maxInputHeight, `expected simplified Input below ${viewport.maxInputHeight}px, received ${inputHeight}px`);
      const localTile = page.getByTestId('igs-import-drop-zone');
      const sampleTile = page.getByTestId('igs-source-sample-tile');
      const localAction = page.getByTestId('igs-source-local-action');
      const sampleAction = page.getByTestId('igs-source-sample-action');
      const [localBox, sampleBox] = await Promise.all([localTile.boundingBox(), sampleTile.boundingBox()]);
      assert(localBox && sampleBox);
      assert(Math.abs(localBox.height - sampleBox.height) <= 1, 'source tiles must have equal height');
      if (localBox.y === sampleBox.y) assert(Math.abs(localBox.width - sampleBox.width) <= 1, 'side-by-side source tiles must have equal width');
      assert.equal(await localTile.getAttribute('data-selected'), 'false');
      assert.equal(await localAction.getAttribute('role'), 'button');
      assert.equal(await sampleAction.getAttribute('role'), 'button');
      assert.equal(await localAction.getAttribute('aria-pressed'), 'false');
      assert.equal(await sampleAction.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.getByRole('checkbox', { name: /included public IGS sample/i }).count(), 0);
      await page.screenshot({ path: `${out}/${viewport.name}-input-unselected.png`, fullPage: true });
      await pause(1000);

      if (viewport.touch) await sampleAction.tap();
      else await sampleAction.click();
      await page.waitForFunction(() => document.querySelector('[data-testid="igs-source-sample-action"]')?.getAttribute('aria-pressed') === 'true');
      assert.equal(await sampleAction.getByText('Selected', { exact: true }).count(), 1);
      assert.equal(await page.getByRole('checkbox', { name: /included public IGS sample/i }).count(), 0);
      assert(Number(await localTile.evaluate(element => getComputedStyle(element).opacity)) < 0.6);
      await sampleTile.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: `${out}/${viewport.name}-sample-selected.png`, fullPage: true });
      await page.getByTestId('cad-phase-3').waitFor();
      const publicDownloadTrigger = page.getByRole('button', { name: 'Choose file to download', exact: true });
      await publicDownloadTrigger.click();
      assert.equal(await page.getByTestId('cad-download-menu').getByRole('menuitem').count(), 2);
      await page.getByText('Original IGS (.igs)', { exact: true }).waitFor();
      await page.getByText('Inspection mesh (.stl)', { exact: true }).waitFor();
      await page.screenshot({ path: `${out}/${viewport.name}-design-download.png`, fullPage: true });
      await pause();
      await page.keyboard.press('Escape');

      await phase('Input').click();
      await waitForInput();
      await page.getByTestId('igs-import-file-input').setInputFiles('public/cad-fixtures/public-cube-10x10.igs');
      await page.waitForFunction(() => document.querySelector('[data-testid="igs-import-drop-zone"]')?.getAttribute('data-selected') === 'true');
      assert.equal(await localAction.getByText('Selected', { exact: true }).count(), 1);
      assert(Number(await sampleTile.evaluate(element => getComputedStyle(element).opacity)) < 0.6);
      await localTile.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: `${out}/${viewport.name}-local-selected.png`, fullPage: true });
      await page.getByTestId('cad-phase-3').waitFor();

      const syntheticPage = await context.newPage();
      syntheticPage.on('pageerror', error => errors.push(error.message));
      const syntheticUrl = new URL('/', url);
      syntheticUrl.searchParams.set('cadQualification', 'synthetic-igs-v1');
      await syntheticPage.goto(syntheticUrl.toString());
      const enter = syntheticPage.getByRole('button', { name: 'Enter ReversR home', exact: true });
      if (await enter.count()) await enter.click();
      await syntheticPage.getByRole('button', { name: 'Start new machine reconstruction — Import, CAD file', exact: true }).click();
      await syntheticPage.getByTestId('igs-import-panel').waitFor();
      await syntheticPage.getByRole('button', { name: 'Use synthetic IGS fixture', exact: true }).click();
      await syntheticPage.getByTestId('cad-phase-3').waitFor();
      await syntheticPage.getByText('Generated synthetic IGS source', { exact: true }).waitFor();

      const downloadTrigger = syntheticPage.getByRole('button', { name: 'Choose file to download', exact: true });
      await downloadTrigger.waitFor();

      await syntheticPage.getByRole('button', { name: 'View implementation readiness', exact: true }).click();
      await syntheticPage.getByTestId('cad-build-locked').waitFor();
      const readiness = syntheticPage.getByTestId('cad-readiness-qualification-details');
      await readiness.scrollIntoViewIfNeeded();
      await readiness.click();
      assert.equal(await readiness.getAttribute('aria-expanded'), 'true');
      await syntheticPage.getByTestId('cad-readiness-qualification-details-content').getByText('Browser account and upload-session adapters are not production authentication.', { exact: false }).waitFor();
      await syntheticPage.getByTestId('cad-readiness-qualification-details-content').getByText('Production upload, hosted conversion, cloud storage, and provider dispatch remain disabled.', { exact: true }).waitFor();
      await syntheticPage.screenshot({ path: `${out}/${viewport.name}-readiness-open.png`, fullPage: true });
      await pause(1100);

      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await syntheticPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0);
      assert.deepEqual(errors, []);
      results.push({ viewport, inputHeight, baselineHeight: viewport.width === 320 ? 972 : viewport.width === 768 ? 710 : viewport.width === 1440 ? 652 : null, equalSourceTiles: true, sampleSelected: true, localSelected: true, readinessRelocated: true, downloadMenuIntact: true, writes, externalRequestsBlocked: blocked.length });
      const video = page.video();
      const syntheticVideo = syntheticPage.video();
      await context.close();
      if (video) await video.saveAs(`${out}/${viewport.name}-walkthrough.webm`);
      if (syntheticVideo) await syntheticVideo.saveAs(`${out}/${viewport.name}-readiness-walkthrough.webm`);
      console.log(`PASS ${viewport.name} ${viewport.width}x${viewport.height}: compact source tiles, both selected states, readiness relocation, Design download menu, no writes or overflow`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify({ url, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
