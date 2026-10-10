const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const url = process.env.CAD_DOWNLOAD_MENU_URL || 'http://127.0.0.1:5196/?cadPreview=public-cube-v1';
const out = process.env.CAD_DOWNLOAD_MENU_EVIDENCE || '/private/tmp/reversr-cad-download-menu';
const recordVideo = process.env.CAD_DOWNLOAD_MENU_RECORD === '1';
const viewports = [
  { name: 'narrow-mobile', width: 320, height: 800, touch: true },
  { name: 'mobile', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 768, height: 900, touch: true },
  { name: 'desktop', width: 1440, height: 1000, touch: false },
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
      const blocked = [];
      let writes = 0;
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
      const pauseForWalkthrough = async (milliseconds = 900) => {
        if (recordVideo) await page.waitForTimeout(milliseconds);
      };
      await page.addInitScript(() => {
        window.__cadDownloadAnchors = [];
        const nativeClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function click() {
          window.__cadDownloadAnchors.push({ download: this.download, href: this.href });
          return nativeClick.call(this);
        };
      });
      const pageErrors = [];
      const downloads = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('download', download => downloads.push(download.suggestedFilename()));
      await page.goto(url);
      await page.getByTestId('cad-phase-3').waitFor();
      await page.getByText('Public cube', { exact: true }).waitFor();
      await pauseForWalkthrough(1100);

      const trigger = page.getByRole('button', { name: 'Choose file to download', exact: true });
      await trigger.scrollIntoViewIfNeeded();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByTestId('cad-download-menu').count(), 0);
      const detailsYBefore = (await page.getByTestId('cad-design-details').boundingBox()).y;

      if (viewport.touch) await trigger.tap();
      else await trigger.click();
      await page.waitForTimeout(150);
      assert.deepEqual(downloads, [], 'opening the menu must not begin a download');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      const menu = page.getByTestId('cad-download-menu');
      await menu.waitFor();
      assert.equal(await menu.getByRole('menuitem').count(), 2);
      await menu.getByText('Original IGS (.igs)', { exact: true }).waitFor();
      await menu.getByText('Inspection mesh (.stl)', { exact: true }).waitFor();
      const menuBox = await menu.boundingBox();
      assert(menuBox && menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= viewport.width && menuBox.y + menuBox.height <= viewport.height);
      await page.screenshot({ path: `${out}/${viewport.name}-menu-open.png` });
      await pauseForWalkthrough(1200);

      const outsideTarget = page.getByText('Public cube', { exact: true });
      if (viewport.touch) await outsideTarget.tap();
      else await outsideTarget.click();
      assert.equal(await page.getByTestId('cad-download-menu').count(), 0);
      await trigger.scrollIntoViewIfNeeded();
      if (viewport.touch) await trigger.tap();
      else await trigger.click();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByTestId('cad-download-menu').count(), 0);
      const detailsYClosed = (await page.getByTestId('cad-design-details').boundingBox()).y;
      assert.equal(detailsYClosed, detailsYBefore, 'closed menu must not add rail height');
      await trigger.focus();
      await page.keyboard.press('Enter');
      const sourceDownload = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: /Original IGS \(\.igs\)/ }).click();
      assert.equal((await sourceDownload).suggestedFilename(), 'Cube 10x10.igs');
      assert.equal(await page.getByTestId('cad-download-menu').count(), 0);
      await pauseForWalkthrough();

      await trigger.click();
      await pauseForWalkthrough();
      await page.getByRole('menuitem', { name: /Inspection mesh \(\.stl\)/ }).click();
      assert.equal(await page.getByTestId('cad-download-menu').count(), 0);
      const anchorDownloads = await page.evaluate(() => window.__cadDownloadAnchors);
      assert.equal(anchorDownloads.at(-1).download, 'reversr-public-cube-derived-inspection-mesh-mm.stl');
      assert.match(anchorDownloads.at(-1).href, /^blob:/);
      await pauseForWalkthrough();

      const details = page.getByTestId('cad-design-details');
      await details.click();
      assert.equal(await details.getAttribute('aria-expanded'), 'true');
      await page.getByTestId('cad-design-details-content').waitFor();
      await pauseForWalkthrough(1100);
      await details.click();
      assert.equal(await details.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0);
      assert.deepEqual(pageErrors, []);
      results.push({ viewport, downloads: anchorDownloads.map(item => item.download), writes, externalRequestsBlocked: blocked.length, accordionIntact: true, noOverflow: true, noImmediateDownload: true, outsidePressCloses: true, escapeCloses: true });
      const video = page.video();
      await context.close();
      if (video) await video.saveAs(`${out}/${viewport.name}-walkthrough.webm`);
      console.log(`PASS ${viewport.name} ${viewport.width}x${viewport.height}: menu choices, source/STL downloads, keyboard/touch, accordion, no writes or overflow`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify({ url, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
