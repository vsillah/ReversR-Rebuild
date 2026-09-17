const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createReviewReceipt, REVIEW_CHECKS, STORAGE_KEY } = require('../utils/cadReviewReceipt');
const url = process.env.CAD_REVIEW_URL || 'http://localhost:5193/?cadPreview=mark-dispenser-v1';
const out = process.env.CAD_REVIEW_EVIDENCE || '/private/tmp/cad-guided-review-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const results = [];
 try {
  for (const width of [1440, 768, 390, 320]) {
   const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width <= 768, recordVideo: { dir: out, size: { width, height: 1000 } } });
   const requests = { externalBlocked: 0, apiBlocked: 0, writes: 0 };
   await context.route('**/*', route => {
    const request = route.request(), u = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) { requests.writes++; return route.abort(); }
    if (u.origin !== new URL(url).origin) { requests.externalBlocked++; return route.abort(); }
    if (u.pathname.startsWith('/api/')) { requests.apiBlocked++; return route.fulfill({ status: 503, json: { error: 'Offline review QA' } }); }
    return route.continue();
   });
   const page = await context.newPage();
   const errors = []; page.on('pageerror', error => errors.push(error.message));
   await page.goto(url);
   const skip = page.getByText('Skip', { exact: true }); if (await skip.isVisible()) await skip.click();
   await page.waitForFunction(() => document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view === 'isometric');
   const review = page.getByTestId('cad-guided-review');
   const screenshot = async name => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${width}-${name}.png` });
   };
   await review.scrollIntoViewIfNeeded();
   await screenshot('compare');
   assert.equal(await page.getByTestId('cad-file-input').count(), 0);
   assert.equal(await page.getByTestId('cad-check-status').count(), 0);
   assert.match(await review.innerText(), /55.74 × 69.42 × 114.83 mm/);
   for (const label of ['Front', 'Left', 'Top', 'Drawing']) {
    await page.getByLabel('Supplied reference', { exact: true }).selectOption({ label });
    const img = page.getByRole('img', { name: `${label} supplied dispenser reference` });
    await img.evaluate(el => el.decode());
    assert.equal(await img.evaluate(el => el.naturalWidth > 0), true);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('link', { name: `Open ${label.toLowerCase()} reference full size` }).click();
    const popup = await popupPromise; await popup.waitForLoadState();
    assert(popup.url().startsWith(`${new URL(url).origin}/cad-fixtures/mark-dispenser-v1/`));
    await popup.close();
   }
   await page.getByText('Source identity & limits', { exact: true }).click();
   const sourceDownload = page.waitForEvent('download');
   await page.getByRole('link', { name: 'Download original IGES', exact: true }).click();
   const source = await sourceDownload;
   assert.equal(source.suggestedFilename(), 'Dispenser.IGS');
   const sourcePath = await source.path();
   assert.equal(fs.statSync(sourcePath).size, 701346);
   await page.getByText('Source identity & limits', { exact: true }).click();
   await page.getByRole('button', { name: 'Record checks' }).click();
   await page.getByRole('group', { name: 'Source & metadata', exact: true }).getByLabel('Pass', { exact: true }).check();
   await page.getByRole('group', { name: 'Reference comparison', exact: true }).getByLabel('Issue', { exact: true }).check();
   await screenshot('check');
   await page.getByRole('button', { name: 'Review receipt', exact: false }).click();
   assert.match(await review.innerText(), /1 pass · 1 issue · 6 not tested/);
   await page.getByText('View receipt / copy manually', { exact: true }).click();
   const text = await page.getByLabel('Sanitized review receipt').inputValue();
   assert.deepEqual(JSON.parse(text), createReviewReceipt({ source: 'pass', reference: 'issue' }));
   assert.doesNotMatch(text, /https?:|localhost|token|\/Users|email/i);
   const downloadPromise = page.waitForEvent('download');
   await page.getByRole('button', { name: 'Download receipt', exact: true }).click();
   const download = await downloadPromise;
   assert.equal(download.suggestedFilename(), 'dispenser-visual-review.json');
   assert.equal(fs.readFileSync(await download.path(), 'utf8'), text);
   await context.grantPermissions(['clipboard-read', 'clipboard-write']);
   await page.getByRole('button', { name: 'Copy receipt', exact: true }).click();
   assert.equal(await page.evaluate(() => navigator.clipboard.readText()), text);
   await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Unavailable')) } }));
   await page.getByRole('button', { name: 'Copy receipt', exact: true }).click();
   assert.match(await review.innerText(), /Clipboard is unavailable/);
   await screenshot('receipt');
   await page.reload();
   await page.getByRole('button', { name: 'Receipt', exact: true }).click();
   assert.match(await review.innerText(), /1 pass · 1 issue · 6 not tested/);
   await page.getByRole('button', { name: 'Check', exact: true }).click();
   for (const check of REVIEW_CHECKS) await page.getByRole('group', { name: check.label, exact: true }).getByLabel('Pass', { exact: true }).check();
   await page.getByRole('button', { name: 'Review receipt', exact: false }).click();
   assert.match(await review.innerText(), /All visual checks marked pass by the reviewer/);
   await page.getByRole('button', { name: 'Reset all checks' }).click();
   assert.match(await review.innerText(), /0 pass · 0 issue · 8 not tested/);
   // Denied session storage still supports an in-memory review and explains recovery.
   await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; });
   await page.getByRole('button', { name: 'Check', exact: true }).click();
   const pass = page.getByRole('group', { name: 'Source & metadata', exact: true }).getByLabel('Pass', { exact: true });
   await pass.focus(); await page.keyboard.press('Space'); assert(await pass.isChecked());
   assert.match(await review.innerText(), /Tab storage is unavailable/);
   await page.getByRole('button', { name: 'Receipt', exact: true }).focus(); await page.keyboard.press('Enter');
   assert.match(await review.innerText(), /1 pass · 0 issue · 7 not tested/);
   // Check nested overflow, not only the document width.
   const overflow = await review.evaluate(el => [el, ...el.querySelectorAll('*')].filter(n => n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 2 && !['TEXTAREA', 'SELECT'].includes(n.tagName) && getComputedStyle(n).clip === 'auto').map(n => n.tagName));
   assert.deepEqual(overflow, []);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   for (const action of await review.getByRole('button').all()) {
    if (!(await action.isVisible())) continue;
    await action.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const box = await action.boundingBox(); assert(box.height >= 44);
    assert(box.y + box.height <= 936, 'action must scroll fully above persistent navigation');
   }
   assert.deepEqual(errors, []);
   assert.equal(requests.writes, 0);
   const video = page.video(); await context.close(); await video.saveAs(`${out}/${width}-workflow.webm`);
   results.push({ width, status: 'passed', ...requests });
   console.log(`PASS ${width}px: source/reference actions, pass/issue/not-tested, copy/download/fallback, tab restore, complete/reset, storage failure, keyboard, overflow, targets`, requests);
  }
  const unavailable = await browser.newContext();
  await unavailable.route('**/*', route => {
   const u = new URL(route.request().url());
   if (u.origin !== new URL(url).origin || u.pathname.startsWith('/api/') || u.pathname.endsWith('.stl')) return route.abort();
   return route.continue();
  });
  await unavailable.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Unavailable'); }; });
  const unavailablePage = await unavailable.newPage(); await unavailablePage.goto(url);
  await unavailablePage.getByTestId('cad-fixture-unavailable').waitFor();
  assert(await unavailablePage.getByRole('button', { name: 'Zoom in', exact: true }).isDisabled());
  assert.match(await unavailablePage.getByTestId('cad-guided-review').innerText(), /Tab storage is unavailable/);
  await unavailablePage.getByRole('button', { name: 'Check', exact: true }).click();
  await unavailablePage.getByRole('group', { name: 'Reference comparison', exact: true }).getByLabel('Issue', { exact: true }).check();
  await unavailablePage.getByRole('button', { name: 'Receipt', exact: true }).click();
  assert.match(await unavailablePage.getByTestId('cad-guided-review').innerText(), /0 pass · 1 issue · 7 not tested/);
  await unavailable.close();
  console.log('PASS unavailable mesh and initial storage denial: explicit recovery and issue receipt');
  // Exercise the real exported UI under a production hostname without contacting production.
  const production = await browser.newContext();
  let fixtureRequests = 0;
  await production.route('**/*', route => {
   const u = new URL(route.request().url());
   if (u.pathname.includes('/cad-fixtures/')) fixtureRequests++;
   const file = path.resolve('dist', `.${u.pathname === '/' ? '/index.html' : u.pathname}`);
   if (!file.startsWith(path.resolve('dist') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
   return route.fulfill({ path: file });
  });
  const prodPage = await production.newPage();
  await prodPage.goto('https://reversr.vercel.app/?cadPreview=mark-dispenser-v1');
  await prodPage.getByText('Skip', { exact: true }).click();
  await prodPage.getByRole('button', { name: 'Start new machine reconstruction', exact: true }).first().click();
  await prodPage.getByTestId('phase-one-mode-import').click();
  assert.equal(await prodPage.getByTestId('cad-guided-review').count(), 0);
  assert.equal(await prodPage.getByTestId('cad-fixture-canvas').count(), 0);
  assert(await prodPage.getByRole('button', { name: 'Upload unavailable: operator access required' }).isDisabled());
  assert.equal(fixtureRequests, 0);
  await production.close();
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, productionHostSimulatedLocally: 'passed; no fixture requests; upload disabled' }, null, 2));
  console.log('PASS production hostname simulated locally: no fixture UI/assets, upload disabled');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
