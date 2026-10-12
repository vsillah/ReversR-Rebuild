const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.CAD_DESKTOP_URL || 'http://localhost:5001';
const out = process.env.CAD_DESKTOP_EVIDENCE || '/private/tmp/cad-desktop-workflow-walkthrough';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  let writes = 0;
  let externalRequests = 0;
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) { writes += 1; return route.abort(); }
    if (url.origin !== new URL(base).origin) { externalRequests += 1; return route.abort(); }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline walkthrough' } });
    return route.continue();
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=inventory`);
  await page.getByTestId('cad-inventory-inspector').waitFor();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Review in Design', exact: true }).click();
  await page.getByTestId('cad-command-view').waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-testid="cad-command-view"]').disabled);
  await page.waitForTimeout(2200);
  await page.getByTestId('cad-command-view').click();
  await page.waitForTimeout(1200);
  await page.getByTestId('cad-controller-mode-move').click();
  await page.getByRole('button', { name: 'Move model right one step', exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByTestId('cad-controller-mode-orbit').click();
  await page.getByRole('button', { name: 'Show fixed front view', exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByTestId('cad-command-view').click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'View implementation readiness', exact: true }).click();
  await page.getByTestId('cad-build-inspector').waitFor();
  await page.waitForTimeout(1800);
  await page.getByTestId('cad-commercialization-step-2').click();
  await page.waitForTimeout(1200);
  await page.getByTestId('cad-commercialization-step-3').click();
  await page.waitForTimeout(2200);

  assert.equal(writes, 0);
  assert.equal(externalRequests, 0);
  assert.deepEqual(errors, []);
  const video = page.video();
  await context.close();
  await video.saveAs(`${out}/desktop-workflow-migration-walkthrough.webm`);
  fs.writeFileSync(`${out}/walkthrough-results.json`, JSON.stringify({ writes, externalRequests, errors }, null, 2));
  await browser.close();
  console.log('PASS desktop Inventory → Design → Build walkthrough');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
