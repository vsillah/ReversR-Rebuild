const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.CAD_WHALE_LAYOUT_URL || 'http://localhost:5001';
const out = process.env.CAD_WHALE_LAYOUT_EVIDENCE || '/private/tmp/cad-phase3-whale-layout-repair';
const viewports = [[390, 844], [768, 1024], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080]];
const now = new Date().toISOString();
const publicQaProjects = [
  {
    id: 'qa-public-dispenser', createdAt: now, updatedAt: now, phase: 3, input: 'Dispenser.IGS', capturedImage: null,
    analysis: { productName: 'Dispenser', components: [], neighborhoodResources: [], attributes: [], closedWorldBoundary: 'Public fixture QA only.', rawAnalysis: 'Public fixture QA only.' },
    selectedPattern: null, innovation: null, spec: null, threeDScene: null, imageUrl: null, bom: null, reviewerApprovalRecords: [],
  },
  {
    id: 'qa-public-farmbot', createdAt: now, updatedAt: now, phase: 4, input: 'FarmBot Genesis v1.8', capturedImage: null,
    analysis: { productName: 'FarmBot Genesis v1.8', components: [], neighborhoodResources: [], attributes: [], closedWorldBoundary: 'Public mock-tour fixture QA only.', rawAnalysis: 'Public mock-tour fixture QA only.' },
    selectedPattern: 'inventory_match', innovation: null, spec: null, threeDScene: null, imageUrl: null, bom: null, reviewerApprovalRecords: [],
  },
];

const installSafeState = async context => {
  await context.addInitScript(({ projects }) => {
    localStorage.setItem('reversr-manufacturer-tour:dispenser-v1:v2', JSON.stringify({
      version: 2, active: true, stepIndex: 0, completedSubtaskKeys: [], completedAt: null,
    }));
    localStorage.setItem('reversr_innovations', JSON.stringify(projects));
  }, { projects: publicQaProjects });
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
      await installSafeState(context);
      const page = await context.newPage();
      const errors = [];
      let writes = 0;
      let externalRequests = 0;
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes += 1;
          return route.abort();
        }
        if (url.origin !== new URL(base).origin) {
          externalRequests += 1;
          return route.abort();
        }
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline layout QA' } });
        return route.continue();
      });

      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
      await page.getByTestId('cad-command-zoom').waitFor();
      assert.equal(await page.getByTestId('desktop-tour-dock').count(), 0, 'stale tour state replaced first arrival');
      assert.equal(await page.getByTestId('cad-phase-3').count(), 1);
      assert.equal(await page.getByTestId('cad-review-rail').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      const host = await page.getByTestId('cad-fixture-canvas-host').boundingBox();
      assert(host && host.y + host.height <= height + 8, `canvas bottom ${host ? host.y + host.height : 'missing'} exceeds ${height}px viewport`);
      const reviewRail = page.getByTestId('cad-review-rail');
      await reviewRail.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await page.getByTestId('cad-design-details').scrollIntoViewIfNeeded();
      const inspectorBox = await reviewRail.boundingBox();
      const lastItemBox = await page.getByTestId('cad-design-details').boundingBox();
      assert(inspectorBox && lastItemBox
        && lastItemBox.y + lastItemBox.height <= inspectorBox.y + inspectorBox.height,
      'last inspector item is not reachable');

      await page.getByTestId('cad-download-menu-trigger').click();
      assert.equal(await page.getByTestId('cad-open-source-iges').count(), 1);
      assert.equal(await page.getByTestId('igs-download-derived-stl').count(), 1);
      const originalDownload = page.waitForEvent('download');
      await page.getByTestId('cad-open-source-iges').click();
      await originalDownload;
      await page.getByTestId('cad-download-menu-trigger').click();
      const derivedDownload = page.waitForEvent('download');
      await page.getByTestId('igs-download-derived-stl').click();
      await derivedDownload;

      const phaseNav = page.getByTestId('reversr-tour-phase-nav');
      await phaseNav.getByRole('button', { name: /^Inventory phase,/ }).click();
      await page.getByTestId('cad-phase-2').waitFor();
      await phaseNav.getByRole('button', { name: /^Design phase,/ }).click();
      await page.getByTestId('cad-phase-3').waitFor();

      if (width >= 1024) {
        const workspace = page.getByTestId('desktop-workspace-canvas');
        const overflow = await workspace.evaluate(element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
        assert(overflow.scrollHeight <= overflow.clientHeight + 1, 'design canvas depends on page overflow');
        const navigationBox = await page.getByTestId('desktop-navigation').boundingBox();
        const workspaceBox = await workspace.boundingBox();
        assert(navigationBox && workspaceBox && navigationBox.x + navigationBox.width <= workspaceBox.x,
          'desktop rail overlaps the workspace or inspector');
        await page.getByTestId('desktop-nav-tour').click();
        await page.getByTestId('desktop-tour-dock').waitFor();
        await page.getByRole('button', { name: 'Exit manufacturer tour' }).click();
        await page.getByTestId('cad-review-rail').waitFor();
        assert.equal(await page.getByTestId('cad-phase-3').count(), 1, 'tour close did not restore Design review');
      } else {
        await page.getByRole('button', { name: 'Tour', exact: true }).click();
        await page.getByTestId('reversr-tour-guide').waitFor();
        await page.getByRole('button', { name: 'Exit manufacturer tour' }).click();
        await page.getByTestId('cad-review-rail').waitFor();
        assert.equal(await page.getByTestId('cad-phase-3').count(), 1, 'mobile tour close did not restore Design review');
      }

      if (width >= 1280) {
        await page.getByTestId('desktop-nav-projects').click();
        await page.getByTestId('desktop-project-list').waitFor();
        assert.equal(await page.locator('[role="treeitem"]').count(), 2);
        const newBox = await page.getByTestId('desktop-nav-new').boundingBox();
        const tourBox = await page.getByTestId('desktop-nav-tour').boundingBox();
        assert(newBox && tourBox && newBox.y + newBox.height <= tourBox.y, 'New is not fixed directly above Tour');
        await page.getByTestId('desktop-nav-projects').focus();
        await page.keyboard.press('ArrowDown');
        assert.match(await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || ''), /^desktop-project-/);
        await page.keyboard.press('End');
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.getByTestId('desktop-nav-projects').getAttribute('aria-expanded'), 'false');
        await page.getByTestId('desktop-nav-projects').click();
        await page.getByTestId('desktop-project-qa-public-dispenser').click();
        await page.getByTestId('cad-review-rail').waitFor();
        await page.getByTestId('desktop-nav-projects').click();
        await page.getByTestId('desktop-project-list').waitFor();
        assert.equal(await page.getByTestId('desktop-project-qa-public-dispenser').getAttribute('aria-selected'), 'true');
      } else if (width >= 1024) {
        await page.getByTestId('desktop-nav-projects').click();
        assert.equal(await page.getByTestId('desktop-project-list').count(), 0, 'compact rail exposed project metadata');
      }

      await page.screenshot({ path: `${out}/${width}x${height}.png`, fullPage: false });
      assert.equal(writes, 0);
      assert.equal(externalRequests, 0);
      assert.deepEqual(errors, []);
      results.push({ width, height, writes, externalRequests, errors });
      await context.close();
      console.log(`PASS ${width}x${height}`);
    }

    const emptyContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const emptyPage = await emptyContext.newPage();
    await emptyPage.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
    await emptyPage.getByTestId('cad-command-zoom').waitFor();
    await emptyPage.getByTestId('desktop-nav-projects').click();
    await emptyPage.getByTestId('desktop-project-empty').waitFor();
    assert.equal(await emptyPage.getByText('No saved projects', { exact: true }).count(), 1);
    await emptyContext.close();

    const singleContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await singleContext.addInitScript(project => localStorage.setItem('reversr_innovations', JSON.stringify([project])), publicQaProjects[0]);
    const singlePage = await singleContext.newPage();
    await singlePage.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
    await singlePage.getByTestId('cad-command-zoom').waitFor();
    await singlePage.getByTestId('desktop-nav-projects').click();
    assert.equal(await singlePage.locator('[role="treeitem"]').count(), 1);
    await singleContext.close();

    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
