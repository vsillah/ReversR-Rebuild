const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const url = process.env.CAD_UX_PREVIEW_URL || 'http://localhost:5097';
const evidence = process.env.CAD_UX_EVIDENCE || '/private/tmp/cad-import-ux';
fs.mkdirSync(evidence, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  let uploads = 0;
  try {
    for (const width of [375, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      let capability = 'enabled';
      await context.route('**/api/**', route => {
        const request = route.request();
        if (request.url().includes('/api/cad/import')) uploads++;
        if (request.url().includes('/api/cad/capabilities')) {
          assert.equal(request.method(), 'GET');
          assert.equal(request.headers().authorization, undefined);
          assert.equal(request.postData(), null);
          if (capability === 'error') return route.fulfill({ status: 503, body: '{}' });
          return route.fulfill({ json: { enabled: capability === 'enabled' } });
        }
        return route.fulfill({ status: 503, json: { error: 'Offline synthetic UI check' } });
      });
      const page = await context.newPage();
      for (const mode of ['import', 'scan', 'type', 'lucky']) {
        await page.goto(url);
        await page.getByTestId(`home-mode-${mode}`).waitFor();
        const skip = page.getByText('Skip', { exact: true });
        if (await skip.isVisible()) { await skip.click(); await skip.waitFor({ state: 'hidden' }); }
        assert.deepEqual(await page.locator('[data-testid^="home-mode-"]').allTextContents().then(values => values.map(text => text.match(/Import|Scan|Describe|Sample/)[0])), ['Import', 'Scan', 'Describe', 'Sample']);
        if (mode === 'import') { await page.getByTestId('home-mode-import').scrollIntoViewIfNeeded(); }
        if (mode === 'import') await page.screenshot({ path: `${evidence}/home-${width}.png`, fullPage: true });
        await page.getByTestId(`home-mode-${mode}`).click();
        const tab = page.getByTestId(`phase-one-mode-${mode}`);
        await tab.waitFor();
        assert.equal(await tab.getAttribute('aria-pressed'), 'true');
        if (mode === 'scan') await page.getByLabel('Open camera to scan machine', { exact: true }).waitFor();
        if (mode === 'type') await page.getByLabel('Machine description', { exact: true }).fill('Synthetic machine description');
        if (mode === 'lucky') {
          await page.getByLabel('Shuffle sample machine description').click();
          await page.getByLabel('Initiate machine scan', { exact: true }).waitFor();
        }
        if (mode !== 'import') continue;
        await page.getByTestId('phase-one-mode-import').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/selector-${width}.png`, fullPage: true });
        const file = page.getByTestId('cad-file-input');
        await file.setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('fixture') });
        await page.getByText('Unsupported format.', { exact: false }).waitFor();
        await file.setInputFiles({ name: 'synthetic.igs', mimeType: 'application/octet-stream', buffer: Buffer.alloc(0) });
        await page.getByText('This file is empty.', { exact: false }).waitFor();
        await page.getByTestId('cad-choose-file').click();
        // In automation supply metadata through the file input; never parse a CAD source.
        await file.setInputFiles({ name: 'synthetic.IGES', mimeType: 'application/octet-stream', buffer: Buffer.from('synthetic metadata fixture') });
        await page.getByTestId('cad-selected-metadata').waitFor();
        assert(!(await page.locator('body').innerText()).includes('synthetic.IGES'));
        assert.equal(await page.getByLabel('Upload unavailable: operator access required').getAttribute('aria-disabled'), 'true');
        for (const state of ['enabled', 'disabled', 'error']) {
          capability = state;
          await page.getByTestId('cad-check-status').click();
          await page.getByText(state === 'enabled' ? 'The protected conversion service is available.' : state === 'disabled' ? 'The conversion service is unavailable.' : 'Could not check service status.', { exact: false }).waitFor();
        }
        await page.getByTestId('cad-operator-gate').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/import-${width}.png`, fullPage: true });
        await page.getByLabel('Clear selected CAD file', { exact: true }).click();
        assert.equal(await page.getByTestId('cad-selected-metadata').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      await page.addInitScript(() => { window.File = undefined; });
      await page.goto(url);
      await page.getByTestId('home-mode-import').click();
      await page.getByTestId('cad-picker-unavailable').waitFor();
      assert.equal(await page.getByTestId('cad-choose-file').count(), 0);
      await context.close();
      console.log(`PASS ${width}px: entry routing, file metadata validation, status recovery, upload gate`);
    }
    assert.equal(uploads, 0);
    console.log('PASS: no CAD upload requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
