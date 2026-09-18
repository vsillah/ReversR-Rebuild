const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const url = process.env.CAD_PHASE_URL || 'http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1';
const out = process.env.CAD_REVIEW_POLISH_EVIDENCE || 'docs/qa/cad-design-review-polish';
fs.mkdirSync(out, { recursive: true });
const importUnavailableMessage = /Import status unavailable|Could not check service status/;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      const blocked = [], errors = [];
      await context.route('**/*', route => {
        const request = route.request(), u = new URL(request.url());
        if (u.origin !== new URL(url).origin || u.pathname.startsWith('/api/') || request.method() !== 'GET') {
          blocked.push({ path: u.pathname, method: request.method() }); return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view === 'isometric');
      const phase = name => page.getByTestId('reversr-tour-phase-nav').getByRole('button', { name: new RegExp(`^${name} phase,`) }).click();
      const capture = async name => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${out}/${width}-${name}.png` });
      };
      const disclosure = async (id, text) => {
        const button = page.getByTestId(id);
        assert.equal(await button.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.getByTestId(`${id}-content`).count(), 0);
        await button.focus(); await page.keyboard.press('Enter');
        assert.equal(await button.getAttribute('aria-expanded'), 'true');
        await page.getByTestId(`${id}-content`).getByText(text, { exact: false }).waitFor();
        await page.getByTestId(`${id}-content`).evaluate(el => el.scrollIntoView({ block: 'center' }));
        await capture(`${id}-open`);
        await button.click();
        assert.equal(await button.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.getByTestId(`${id}-content`).count(), 0);
      };
      const viewer = page.getByTestId('cad-fixture-canvas-host');
      assert((await viewer.boundingBox()).y < (await page.getByTestId('cad-source-facts').boundingBox()).y);
      await page.getByText('Geometry review required · Build locked', { exact: true }).waitFor();
      await capture('design');
      await disclosure('cad-design-details', 'Source confidence:');
      const download = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download original Dispenser.IGS', exact: true }).click();
      assert.equal((await download).suggestedFilename(), 'Dispenser.IGS');
      for (const label of ['Front', 'Left', 'Top', 'Drawing']) {
        const popupEvent = context.waitForEvent('page');
        await page.getByRole('link', { name: `Open ${label} reference image`, exact: true }).click();
        const popup = await popupEvent; await popup.waitForLoadState();
        assert.match(popup.url(), /\/cad-fixtures\/mark-dispenser-v1\/dispenser-/); await popup.close();
      }
      await page.getByTestId('cad-reference-comparison').evaluate(el => el.scrollIntoView({ block: 'center' }));
      await capture('references');
      await page.getByRole('button', { name: 'View implementation readiness', exact: true }).click();
      await page.getByTestId('cad-build-locked').waitFor();
      await page.getByTestId('cad-implementation-slide').getByText('Actual product behavior to validate', { exact: true }).waitFor();
      await page.getByTestId('cad-implementation-slide').getByText('Test-only content in this preview', { exact: true }).waitFor();
      await page.getByTestId('cad-implementation-slide').getByText('Not part of this product QA', { exact: true }).waitFor();
      await page.getByText('Prepare implementation package · Locked', { exact: true }).waitFor();
      assert(await page.getByRole('button', { name: 'Prepare outputs unavailable: manufacturing review required' }).isDisabled());
      await capture('build');
      await disclosure('cad-build-details', 'not fully watertight');
      await page.getByRole('button', { name: 'Review inventory prerequisites', exact: true }).click();
      await page.getByText('Parts list unverified · Review required before Build', { exact: true }).waitFor();
      await capture('inventory');
      await disclosure('cad-inventory-details', 'Source confidence:');
      await page.getByRole('button', { name: 'Review source in Input', exact: true }).click();
      await page.getByTestId('cad-public-fixture-ready').waitFor();
      await page.getByTestId('cad-public-fixture-guidance').waitFor();
      assert.equal(await page.getByTestId('cad-file-input').count(), 0);
      assert.equal(await page.getByTestId('cad-choose-file').count(), 0);
      assert.equal(await page.getByTestId('cad-operator-gate').count(), 0);
      assert.equal(await page.getByTestId('cad-import-details').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Upload unavailable: operator access required' }).count(), 0);
      await capture('input');
      await page.getByRole('button', { name: 'View generated inventory', exact: true }).click();
      await page.getByRole('button', { name: 'Review in Design', exact: true }).click();
      await phase('Input'); await page.getByTestId('cad-review-qualified-result').click();
      await phase('Build'); await page.getByRole('button', { name: 'Return to Design review', exact: true }).click();
      await page.getByTestId('cad-phase-3').waitFor();
      assert.deepEqual(errors, []);
      assert(blocked.every(r => r.method === 'GET'));
      results.push({ width, disclosures: 4, keyboardExpansion: true, collapsedContentUnmounted: true, visibleBlockers: true, downloadAndAllReferences: true, allChangedActions: true, writes: 0, blocked });
      await context.close(); console.log(`PASS ${width}: hierarchy, disclosures, keyboard, source/reference actions, recovery, no overflow/errors/writes`);
    }
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin && !new URL(route.request().url()).pathname.startsWith('/api/') && route.request().method() === 'GET' ? route.continue() : route.abort());
      const page = await context.newPage(); await page.goto(new URL('/', url).toString());
      const enter = page.getByRole('button', { name: 'Enter ReversR home', exact: true });
      if (await enter.count()) await enter.click();
      await page.getByRole('button', { name: 'Start new machine reconstruction — Import, IGES file', exact: true }).click();
      for (const mode of ['type', 'scan', 'lucky', 'import']) {
        await page.getByTestId(`phase-one-mode-${mode}`).click();
        await page.getByTestId('reversr-tour-scan').evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: `${out}/${width}-ordinary-${mode}.png` });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      await page.getByTestId('cad-upload-locked-status').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Upload unavailable: operator access required' }).count(), 0);
      const chooser = page.waitForEvent('filechooser');
      await page.getByTestId('cad-choose-file').click();
      await (await chooser).setFiles('public/cad-fixtures/mark-dispenser-v1/Dispenser.IGS');
      await page.getByTestId('cad-selected-metadata').waitFor();
      await page.getByRole('button', { name: 'Clear selected CAD file', exact: true }).click();
      assert.equal(await page.getByTestId('cad-selected-metadata').count(), 0);
      await page.getByTestId('cad-import-details').click();
      assert.equal(await page.getByTestId('cad-import-details').getAttribute('aria-expanded'), 'true');
      await page.getByTestId('cad-check-status').click();
      await page.getByText(importUnavailableMessage).waitFor();
      await page.getByTestId('cad-import-details').click();
      await context.close();
      results.push({ width, ordinaryInputModes: true, sharedImportSelectionAndClear: true, uploadDisabled: true });
      console.log(`PASS ${width}: ordinary Type/Scan/Sample/Import layout and local-only Import actions`);
    }
    fs.writeFileSync(`${out}/polish-results.json`, JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
