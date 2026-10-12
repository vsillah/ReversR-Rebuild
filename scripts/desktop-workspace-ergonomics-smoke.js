const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.DESKTOP_ERGONOMICS_URL || 'http://127.0.0.1:5203';
const out = process.env.DESKTOP_ERGONOMICS_EVIDENCE || '.local/desktop-v2-ergonomics/evidence';
const viewports = [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
fs.mkdirSync(out, { recursive: true });

async function dismissIntro(page) {
  await page.waitForTimeout(500);
  const intro = page.getByTestId('welcome-intro-screen');
  if (await intro.count()) {
    await page.getByRole('button', { name: 'Skip welcome video' }).click();
    await intro.waitFor({ state: 'detached' });
    await page.waitForTimeout(350);
  }
  await page.getByTestId('home-mode-type').waitFor();
}

async function shortcut(page, destination) {
  await page.keyboard.press('g');
  await page.keyboard.press(destination);
}

async function noOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } });
      let writes = 0;
      let externalRequests = 0;
      const errors = [];
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) { writes += 1; return route.abort(); }
        if (url.origin !== new URL(base).origin) { externalRequests += 1; return route.abort(); }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline synthetic QA' } });
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const desktop = width >= 1024;

      await page.goto(base);
      await dismissIntro(page);
      assert.equal(await page.getByTestId('desktop-nav-shortcuts').count(), desktop ? 1 : 0, 'shortcut reference is desktop-only');
      await noOverflow(page, 'home');

      if (!desktop) {
        await page.keyboard.press('?');
        assert.equal(await page.getByTestId('desktop-shortcut-reference').count(), 0, 'compact surfaces ignore desktop shortcuts');
        await page.screenshot({ path: `${out}/${width}x${height}-compact-home.png` });
      } else {
        await page.getByTestId('desktop-workspace-header').click({ position: { x: 420, y: 30 } });
        await page.keyboard.press('?');
        await page.getByTestId('desktop-shortcut-reference').waitFor();
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${out}/${width}x${height}-shortcut-reference.png` });
        await page.keyboard.press('g');
        await page.keyboard.press('p');
        assert.equal(await page.getByTestId('desktop-shortcut-reference').count(), 1, 'shortcut dialog suppresses navigation');
        await page.keyboard.press('Escape');
        await page.getByTestId('desktop-shortcut-reference').waitFor({ state: 'detached' });
        assert.equal(await page.getByTestId('desktop-nav-home').getAttribute('aria-pressed'), 'true', 'Escape closes reference without navigation');

        await shortcut(page, 'p');
        await page.getByTestId('reversr-tour-history').waitFor();
        assert.equal(await page.getByTestId('desktop-nav-projects').getAttribute('aria-pressed'), 'true');
        await shortcut(page, 'n');
        const input = page.getByRole('textbox', { name: 'Machine description', exact: true });
        await input.waitFor();
        await input.fill('Local ergonomic draft');
        await input.focus();
        await page.keyboard.type('gp?');
        assert.equal((await input.inputValue()).endsWith('gp?'), true, 'editable focus receives typing instead of shortcuts');
        assert.equal(await page.getByTestId('desktop-shortcut-reference').count(), 0, 'editable focus suppresses reference');
        await page.screenshot({ path: `${out}/${width}x${height}-editable-suppression.png` });

        await page.getByTestId('desktop-nav-more').click();
        await page.getByTestId('reversr-tour-settings').waitFor();
        await shortcut(page, 'h');
        assert.equal(await page.getByTestId('reversr-tour-settings').count(), 1, 'settings modal suppresses navigation shortcuts');
        await page.getByRole('button', { name: 'Close settings' }).click();
        assert.equal((await input.inputValue()).startsWith('Local ergonomic draft'), true, 'modal round-trip preserves draft');

        await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=input`);
        await page.getByTestId('cad-source-choice-panel').waitFor();
        const shouldStartCollapsed = width < 1200;
        assert.equal(await page.getByTestId('desktop-workspace-inspector').count(), shouldStartCollapsed ? 0 : 1, 'inspector breakpoint default');
        if (shouldStartCollapsed) {
          await page.getByTestId('desktop-workspace-header').click({ position: { x: 420, y: 30 } });
          await shortcut(page, 'i');
          await page.getByTestId('desktop-workspace-inspector').waitFor();
          assert.equal(await page.getByTestId('desktop-workspace-inspector').evaluate(element => document.activeElement === element), true, 'inspector shortcut reveals and focuses collapsed region');
          await page.getByTestId('desktop-workspace-inspector-toggle').click();
          assert.equal(await page.getByTestId('desktop-workspace-inspector').count(), 0, 'narrow inspector toggle closes the revealed region');
          await page.getByTestId('desktop-workspace-inspector-toggle').click();
          await page.getByTestId('desktop-workspace-inspector').waitFor();
          await page.setViewportSize({ width: 1100, height });
          assert.equal(await page.getByTestId('desktop-workspace-inspector').count(), 1, 'narrow-range resizing preserves the user-open inspector');
          await page.setViewportSize({ width: 1280, height });
          await page.getByTestId('desktop-workspace-inspector').waitFor();
          await page.setViewportSize({ width: 1100, height });
          await page.getByTestId('desktop-workspace-inspector').waitFor({ state: 'detached' });
          await page.getByTestId('desktop-workspace-inspector-toggle').click();
          await page.getByTestId('desktop-workspace-inspector').waitFor();
          await page.setViewportSize({ width, height });
          assert.equal(await page.getByTestId('desktop-workspace-inspector').count(), 1, 'returning within the narrow range preserves the reopened inspector');
        }
        const handle = page.getByTestId('desktop-workspace-inspector-resize');
        await handle.focus();
        assert.equal(await handle.evaluate(element => document.activeElement === element), true, 'resize handle receives focus');
        const viewportMaximum = Number(await handle.getAttribute('aria-valuemax'));
        await handle.press('End');
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), viewportMaximum, 'End applies viewport-safe maximum');
        await handle.press('Home');
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), 260, 'Home applies minimum');
        await handle.press('0');
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), 336, '0 resets default');
        await handle.press('ArrowLeft');
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), 352, 'Arrow key resizes incrementally');
        assert.equal(await handle.evaluate(element => document.activeElement === element), true, 'keyboard resize preserves handle focus');

        const handleBox = await handle.boundingBox();
        await page.mouse.move(handleBox.x + 6, handleBox.y + 80);
        await page.mouse.down();
        await page.mouse.move(handleBox.x - 48, handleBox.y + 80, { steps: 4 });
        await page.mouse.up();
        const pointerWidth = Number(await handle.getAttribute('aria-valuenow'));
        assert(pointerWidth >= 352 && pointerWidth <= viewportMaximum, 'pointer resize stays bounded');
        await page.getByTestId('desktop-workspace-inspector-reset').click();
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), 336, 'reset action restores default');

        const cancelHandleBox = await handle.boundingBox();
        const beforeCancelResize = Number(await handle.getAttribute('aria-valuenow'));
        await page.mouse.move(cancelHandleBox.x + 6, cancelHandleBox.y + 80);
        await page.mouse.down();
        await page.mouse.move(cancelHandleBox.x - 32, cancelHandleBox.y + 80, { steps: 2 });
        assert.notEqual(Number(await handle.getAttribute('aria-valuenow')), beforeCancelResize, 'pointer resize is active before cancellation');
        await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel')));
        const cancelledWidth = Number(await handle.getAttribute('aria-valuenow'));
        await page.mouse.move(cancelHandleBox.x - 80, cancelHandleBox.y + 80, { steps: 2 });
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), cancelledWidth, 'pointer cancel terminates the active resize');
        await page.mouse.up();

        const blurHandleBox = await handle.boundingBox();
        const beforeBlurResize = Number(await handle.getAttribute('aria-valuenow'));
        await page.mouse.move(blurHandleBox.x + 6, blurHandleBox.y + 80);
        await page.mouse.down();
        await page.mouse.move(blurHandleBox.x - 16, blurHandleBox.y + 80, { steps: 2 });
        assert.notEqual(Number(await handle.getAttribute('aria-valuenow')), beforeBlurResize, 'pointer resize is active before window blur');
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        const blurredWidth = Number(await handle.getAttribute('aria-valuenow'));
        await page.mouse.move(blurHandleBox.x - 64, blurHandleBox.y + 80, { steps: 2 });
        assert.equal(Number(await handle.getAttribute('aria-valuenow')), blurredWidth, 'window blur terminates the active resize');
        await page.mouse.up();
        await page.getByTestId('desktop-workspace-inspector-reset').click();

        await page.getByTestId('desktop-workspace-header').click({ position: { x: 420, y: 30 } });
        await shortcut(page, 'i');
        assert.equal(await page.getByTestId('desktop-workspace-inspector').evaluate(element => document.activeElement === element), true, 'inspector shortcut focuses region');
        await shortcut(page, 'c');
        assert.equal(await page.getByTestId('desktop-workspace-canvas').evaluate(element => document.activeElement === element), true, 'canvas shortcut focuses region');

        if (!shouldStartCollapsed) {
          await handle.press('ArrowLeft');
          const restoredWidth = Number(await handle.getAttribute('aria-valuenow'));
          await page.reload();
          await page.getByTestId('cad-source-choice-panel').waitFor();
          assert.equal(Number(await page.getByTestId('desktop-workspace-inspector-resize').getAttribute('aria-valuenow')), restoredWidth, 'local preference restores after reload');
        }
        await noOverflow(page, 'resizable CAD workspace');
        await page.screenshot({ path: `${out}/${width}x${height}-inspector-resized.png` });
      }

      assert.equal(writes, 0, 'no external writes');
      assert.deepEqual(errors, [], 'no page errors');
      results.push({ width, height, desktop, writes, blockedExternalRequests: externalRequests, errors });
      await context.close();
      console.log(`PASS ${width}x${height}`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
