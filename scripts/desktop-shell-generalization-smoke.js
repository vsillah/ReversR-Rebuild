const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.DESKTOP_SHELL_URL || 'http://127.0.0.1:5203';
const out = process.env.DESKTOP_SHELL_EVIDENCE || '.local/desktop-shell';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const [width, height] of [[1366,768], [1440,900], [1024,768], [768,1024], [390,844], [320,740]]) {
      const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out, size: { width, height } } });
      let writes = 0, externalRequests = 0;
      const errors = [], surfaces = [];
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) { writes++; return route.abort(); }
        if (url.origin !== new URL(base).origin) { externalRequests++; return route.abort(); }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline synthetic QA' } });
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const shell = page.getByTestId('app-shell');
      const check = async (surface, compact = false) => {
        const expected = compact || width < 1024 ? Math.min(width, 600) : width;
        await page.waitForFunction(expected => Math.abs(document.querySelector('[data-testid="app-shell"]').getBoundingClientRect().width - expected) < 1, expected);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${surface}: page overflow`);
        surfaces.push({ surface, shellWidth: (await shell.boundingBox()).width });
        await page.screenshot({ path: `${out}/${width}x${height}-${surface}.png` });
      };
      const enterHome = async () => {
        // Wait for the actual intro action, avoiding a race with font loading.
        await page.getByTestId('welcome-intro-enter').click();
        await page.getByTestId('welcome-intro-screen').waitFor({ state: 'detached' });
        await page.getByTestId('home-mode-type').waitFor();
      };
      const checkLocked = async () => {
        await page.getByTestId('cad-upload-locked-status').waitFor();
        assert.match(await page.getByTestId('cad-session-state').innerText(), /Upload admission remains disabled/);
        assert.equal(await page.getByTestId('cad-render-local-preview').count(), 0);
      };
      await page.goto(base);
      await enterHome();
      assert.equal(await page.getByTestId('reversr-bottom-new').count(), width < 1024 ? 1 : 0);
      assert.equal(await page.getByTestId('desktop-navigation').count(), width >= 1024 ? 1 : 0);
      if (width >= 1024) {
        assert.equal(await page.getByTestId('desktop-nav-home').getAttribute('aria-pressed'), 'true');
        for (const key of ['home', 'projects', 'new', 'tour', 'more']) {
          const box = await page.getByTestId(`desktop-nav-${key}`).boundingBox();
          assert(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height < 100, 'navigation is visible at the top');
        }
        await page.getByTestId('desktop-nav-more').click();
        await page.getByTestId('reversr-tour-settings').waitFor();
        await check('settings');
        await page.getByRole('button', { name: 'Close settings', exact: true }).click();
        await page.getByTestId('desktop-nav-tour').click();
        await page.getByTestId('reversr-tour-guide').waitFor();
        await check('tour');
        await page.getByRole('button', { name: 'Exit guided tour', exact: true }).click();
        await page.getByTestId('desktop-nav-new').click();
        await page.getByRole('textbox', { name: 'Machine description', exact: true }).waitFor();
        await page.getByTestId('desktop-nav-home').click();
      }
      await check('home');
      await page.getByTestId('home-mode-type').click();
      await page.getByRole('textbox', { name: 'Machine description', exact: true }).waitFor();
      await check('description');
      for (const mode of ['scan', 'lucky']) {
        await page.getByTestId(`phase-one-mode-${mode}`).click();
        assert.equal(await page.getByTestId(`phase-one-mode-${mode}`).getAttribute('aria-pressed'), 'true');
        await check(mode);
      }
      await page.getByTestId('phase-one-mode-import').click();
      await checkLocked();
      await check('import-locked');
      await page.getByRole('button', { name: 'Projects', exact: true }).click();
      await page.getByTestId('reversr-tour-history').waitFor();
      await check('history');
      if (width >= 1024) {
        assert.equal(await page.getByTestId('desktop-nav-projects').getAttribute('aria-pressed'), 'true');
        await page.getByTestId('desktop-nav-more').click();
        await page.getByTestId('reversr-tour-settings').waitFor();
        await page.getByRole('button', { name: 'Close settings', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await page.getByRole('button', { name: 'Manage journey credits', exact: true }).click();
      await page.getByText('Repair shop plan and credits', { exact: true }).waitFor();
      await check('account');
      // Each page owns its reading width, independently of the full-width shell.
      const accountBounds = await page.getByText('ReversR Commercial Account', { exact: true }).locator('../..').boundingBox();
      assert(accountBounds.width <= 920, 'account content retains its reading width');
      if (width >= 1024) assert(accountBounds.width > 600, 'account uses its existing desktop width');
      const shellBounds = await shell.boundingBox();
      for (const control of [page.getByText('Repair shop plan and credits', { exact: true }), page.getByRole('button', { name: 'Refresh account', exact: true })]) {
        const bounds = await control.boundingBox();
        assert(bounds.x >= shellBounds.x && bounds.x + bounds.width <= shellBounds.x + shellBounds.width, 'account heading and refresh stay inside the shell');
      }
      await page.goBack();
      await page.getByTestId('home-mode-type').waitFor();
      await check('return-home');
      await page.getByTestId('home-mode-type').click();
      const input = page.getByRole('textbox', { name: 'Machine description', exact: true });
      await input.fill('Retain synthetic local draft on resize');
      for (const resized of [1023, 1024, 390, 1440]) {
        await page.setViewportSize({ width: resized, height });
        await page.waitForFunction(expected => Math.abs(document.querySelector('[data-testid="app-shell"]').getBoundingClientRect().width - expected) < 1, resized >= 1024 ? resized : Math.min(resized, 600));
        assert.equal(await input.inputValue(), 'Retain synthetic local draft on resize');
        await page.waitForFunction(
          expected => document.querySelectorAll('[data-testid="desktop-navigation"]').length === expected,
          resized >= 1024 ? 1 : 0,
        );
        await page.getByTestId('desktop-navigation').waitFor({ state: resized >= 1024 ? 'visible' : 'detached' });
      }
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/?cadPreview=invalid`);
      await enterHome();
      await page.getByTestId('home-mode-import').click();
      assert.equal(await page.getByTestId('cad-phase-1').count(), 0);
      await checkLocked();
      await check('invalid-preview');
      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&qa=native-internal-upload-render&cadPhase=input`);
      await page.getByTestId('cad-source-choice-panel').waitFor();
      await check('native-embedded', true);
      assert.equal(await page.getByTestId('desktop-navigation').count(), 0);
      assert.equal(await page.getByTestId('reversr-bottom-new').count(), 0, 'embedded preview remains free of application navigation');
      assert.equal(await page.getByTestId('reversr-workflow-header').count(), 0);
      assert.equal(writes, 0); assert.deepEqual(errors, []);
      const video = page.video(); await context.close();
      await video.saveAs(`${out}/${width}x${height}-walkthrough.webm`);
      results.push({ width, height, surfaces, writes, blockedExternalRequests: externalRequests, errors });
      console.log(`PASS ${width}x${height}: ${surfaces.map(s => s.surface).join(', ')}, resize retained draft`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
