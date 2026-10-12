const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.CAD_BLUEPRINT_URL || 'http://127.0.0.1:5212';
const out = process.env.CAD_BLUEPRINT_EVIDENCE || '.local/desktop-blueprint-phase2';
const sizes = [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
fs.mkdirSync(out, { recursive: true });

const rect = locator => locator.evaluate(element => {
  const r = element.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
});

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height] of sizes) {
      const record = [390, 768, 1440].includes(width);
      const context = await browser.newContext({
        viewport: { width, height },
        serviceWorkers: 'block',
        ...(record ? { recordVideo: { dir: path.join(out, 'raw-video'), size: { width, height } } } : {}),
      });
      let writes = 0;
      const blocked = [];
      const errors = [];
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) { writes++; return route.abort(); }
        if (url.origin !== new URL(base).origin || url.pathname.startsWith('/api/')) {
          blocked.push({ method: request.method(), url: url.pathname });
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=input&qa=desktop-blueprint-v1`);
      await page.getByTestId('cad-source-choice-panel').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.getByTestId('cad-file-input').count(), 1);

      if (width >= 1024) {
        await page.getByTestId('desktop-cad-workspace').waitFor();
        const rail = await rect(page.getByTestId('desktop-navigation'));
        assert(Math.abs(rail.width - (width < 1280 ? 72 : 216)) <= 1, `rail width ${width}: ${rail.width}`);
        const canvas = await rect(page.getByTestId('desktop-workspace-canvas'));
        const inspector = await rect(page.getByTestId('desktop-workspace-inspector'));
        const expectedInspector = width >= 1600 ? 360 : width >= 1280 ? 336 : 300;
        assert(Math.abs(inspector.width - expectedInspector) <= 1, `inspector width ${width}: ${inspector.width}`);
        assert(canvas.right <= inspector.x + 1, `canvas overlaps inspector at ${width}`);
        const phaseRail = await rect(page.getByTestId('desktop-workspace-phase-rail').locator('> div'));
        assert(phaseRail.width <= 980, `phase rail too wide at ${width}: ${phaseRail.width}`);
        const local = await rect(page.getByTestId('cad-local-source-choice'));
        const sample = await rect(page.getByTestId('cad-public-source-choice'));
        assert(Math.abs(local.height - sample.height) <= 1, `source choices differ at ${width}`);
        assert(local.x < sample.x, `source choices are not side-by-side at ${width}`);
        const actionWidths = await page.getByTestId('cad-import-panel').getByRole('button').evaluateAll(buttons => buttons.filter(button => {
          const style = getComputedStyle(button); return style.visibility !== 'hidden' && style.display !== 'none';
        }).map(button => ({ label: button.getAttribute('aria-label'), width: button.getBoundingClientRect().width })));
        assert(actionWidths.every(item => item.width <= 280.5), JSON.stringify(actionWidths));
        if (width === 1440) {
          await page.locator('body').click({ position: { x: width - 8, y: height - 8 } });
          const focusOrder = [];
          for (let index = 0; index < 8; index++) {
            await page.keyboard.press('Tab');
            focusOrder.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || ''));
          }
          assert.deepEqual(focusOrder.slice(0, 6), ['Home', 'Projects', 'New Reconstruction', 'Tour', 'More', 'Open guest profile']);
          assert.match(focusOrder[6], /^Use (dark|light) mode$/);
          assert.equal(focusOrder[7], 'Open settings');
          await page.getByTestId('cad-file-input').setInputFiles({ name: 'unknown.xyz', mimeType: 'application/octet-stream', buffer: Buffer.from('unknown') });
          await page.getByText('Unsupported format.', { exact: false }).waitFor();
          assert.equal(await page.getByTestId('cad-local-file-ready').count(), 0);
          assert.equal(await page.getByTestId('cad-sample-file-ready').count(), 0);
        }
        await page.getByRole('button', { name: 'Tour', exact: true }).click();
        await page.getByTestId('desktop-tour-dock').waitFor();
        const tourDock = await rect(page.getByTestId('desktop-tour-dock'));
        assert(tourDock.x >= inspector.x && tourDock.right <= inspector.right + 1, `tour escaped inspector at ${width}`);
        assert(canvas.right <= tourDock.x + 1, `tour covers canvas at ${width}`);
        await page.screenshot({ path: path.join(out, `${width}x${height}-tour-docked.png`) });
        await page.getByRole('button', { name: 'Exit manufacturer tour', exact: true }).click();
      } else {
        assert.equal(await page.getByTestId('desktop-cad-workspace').count(), 0);
        await page.getByTestId('reversr-workflow-header').waitFor();
      }

      await page.screenshot({ path: path.join(out, `${width}x${height}-input.png`) });
      await page.getByTestId('cad-select-public-sample').click();
      await page.getByTestId('cad-sample-file-ready').waitFor();
      if (width >= 1024) await page.getByTestId('cad-selected-source-preview').waitFor();
      await page.screenshot({ path: path.join(out, `${width}x${height}-sample-selected.png`) });
      await page.getByTestId('cad-review-qualified-result').click();
      await page.getByTestId('cad-phase-3').waitFor();
      await page.getByRole('button', { name: 'Change CAD source', exact: true }).click();
      await page.getByTestId('cad-phase-1').waitFor();
      const phaseState = await page.getByTestId('reversr-tour-phase-nav').getByRole('button', { name: /^Input phase,/ }).getAttribute('aria-label');
      assert.match(phaseState, /active/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0);
      assert.deepEqual(errors, []);

      const video = page.video();
      await context.close();
      if (video) await video.saveAs(path.join(out, `${width}x${height}-walkthrough.webm`));
      results.push({ width, height, writes, blocked, errors, desktop: width >= 1024 });
      console.log(`PASS ${width}x${height}`);
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
