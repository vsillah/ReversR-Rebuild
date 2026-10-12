const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.DESKTOP_V2_URL || 'http://127.0.0.1:5203';
const out = process.env.DESKTOP_V2_EVIDENCE || '.local/desktop-v2/evidence';
const viewports = [[390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
fs.mkdirSync(out, { recursive: true });

const syntheticProject = [{
  id: 'desktop-v2-public-fixture',
  createdAt: '2026-10-12T12:00:00.000Z',
  updatedAt: '2026-10-12T12:30:00.000Z',
  phase: 4,
  input: 'Public Dispenser fixture review',
  capturedImage: null,
  analysis: { productName: 'Public Dispenser fixture' },
  selectedPattern: 'inventory_match',
  innovation: { conceptName: 'Dispenser reconstruction review', conceptDescription: 'Synthetic public-fixture package for layout QA.', machineName: 'Dispenser' },
  spec: {},
  threeDScene: null,
  imageUrl: null,
  bom: { items: [] },
  reviewerApprovalRecords: [],
}];

async function dismissIntro(page) {
  await page.waitForTimeout(500);
  const intro = page.getByTestId('welcome-intro-screen');
  if (await intro.count()) {
    await page.getByRole('button', { name: 'Skip welcome video' }).click();
    await intro.waitFor({ state: 'detached' });
    await page.waitForTimeout(400);
  }
  await page.getByTestId('home-mode-type').waitFor();
}

async function assertNoOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } });
      const errors = [];
      let writes = 0;
      let externalRequests = 0;
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

      await page.goto(base);
      await dismissIntro(page);
      const desktop = width >= 1024;
      assert.equal(await page.getByTestId('desktop-navigation').count(), desktop ? 1 : 0, 'desktop rail breakpoint');
      assert.equal(await page.getByTestId('reversr-bottom-new').count(), desktop ? 0 : 1, 'mobile bottom navigation breakpoint');
      if (desktop) {
        const rail = await page.getByTestId('desktop-navigation').boundingBox();
        assert.equal(rail.x, 0);
        assert.equal(rail.height, height);
        assert.equal(await page.getByTestId('desktop-nav-home').getAttribute('aria-pressed'), 'true');
      }
      await assertNoOverflow(page, 'home');
      await page.screenshot({ path: `${out}/${width}x${height}-home.png` });

      if (desktop) {
        await page.getByTestId('desktop-nav-more').click();
        const settings = page.getByTestId('reversr-tour-settings');
        await settings.waitFor();
        await page.waitForTimeout(500);
        const settingsBox = await settings.boundingBox();
        assert(settingsBox.width <= 880 && settingsBox.x >= 0 && settingsBox.x + settingsBox.width <= width, 'settings stays bounded');
        await page.screenshot({ path: `${out}/${width}x${height}-settings.png` });
        await page.getByRole('button', { name: 'Close settings' }).click();
      }

      const projectsAction = desktop ? page.getByTestId('desktop-nav-projects') : page.getByRole('button', { name: 'Projects', exact: true });
      await projectsAction.click();
      await page.getByTestId('reversr-tour-history').waitFor();
      await page.getByText('No reconstructions yet', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Start a new reconstruction' }).waitFor();
      await assertNoOverflow(page, 'empty projects');
      await page.screenshot({ path: `${out}/${width}x${height}-projects-empty.png` });

      await page.evaluate(projects => localStorage.setItem('reversr_innovations', JSON.stringify(projects)), syntheticProject);
      await page.goto(`${base}/?workspace=projects`);
      await page.getByText('Dispenser reconstruction review', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Review Queue' }).click();
      await page.getByRole('button', { name: 'Open review for Dispenser reconstruction review' }).waitFor();
      await assertNoOverflow(page, 'populated review queue');
      await page.screenshot({ path: `${out}/${width}x${height}-review-queue.png` });

      await page.goto(`${base}/account`);
      await page.getByText('Repair shop plan and credits', { exact: true }).waitFor();
      await page.getByText('Refresh becomes available after you sign in.', { exact: true }).waitFor();
      if (desktop) assert.equal(await page.getByTestId('desktop-navigation').count(), 1, 'account uses desktop shell');
      const accountHeading = await page.getByText('ReversR Commercial Account', { exact: true }).locator('../..').boundingBox();
      assert(accountHeading.width <= 920, 'account reading width');
      await assertNoOverflow(page, 'account');
      await page.screenshot({ path: `${out}/${width}x${height}-account-signed-out.png` });

      await page.goto(`${base}/?workspace=new`);
      const input = page.getByRole('textbox', { name: 'Machine description', exact: true });
      await input.waitFor();
      await input.fill('Persist local synthetic draft across desktop coverage');
      await input.focus();
      assert.equal(await input.evaluate(element => document.activeElement === element), true, 'input receives keyboard focus');
      for (const resized of [390, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width: resized, height });
        await page.waitForFunction(expected => document.querySelectorAll('[data-testid="desktop-navigation"]').length === expected, resized >= 1024 ? 1 : 0);
        assert.equal(await input.inputValue(), 'Persist local synthetic draft across desktop coverage', `draft persists at ${resized}`);
        assert.equal(await page.getByTestId('desktop-navigation').count(), resized >= 1024 ? 1 : 0, `navigation switches at ${resized}`);
      }
      await page.setViewportSize({ width, height });

      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=build`);
      await page.getByText('Build readiness', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Prepare implementation package locked' }).waitFor();
      await page.getByText('Dispenser.IGS', { exact: true }).first().waitFor();
      await assertNoOverflow(page, 'public Dispenser build lock');
      await page.screenshot({ path: `${out}/${width}x${height}-public-dispenser-build.png` });

      await page.goto(`${base}/?workspace=tour`);
      await page.getByTestId('reversr-tour-guide').waitFor();
      await page.getByText('Begin with the file you were given', { exact: true }).waitFor();
      await assertNoOverflow(page, 'tour');
      await page.screenshot({ path: `${out}/${width}x${height}-tour.png` });

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
