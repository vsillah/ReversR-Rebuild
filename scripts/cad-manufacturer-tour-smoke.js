const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.CAD_MANUFACTURER_TOUR_URL || 'http://127.0.0.1:5198';
const out = process.env.CAD_MANUFACTURER_TOUR_EVIDENCE || '/private/tmp/reversr-manufacturer-tour';
const recordVideo = process.env.CAD_MANUFACTURER_TOUR_RECORD === '1';
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

fs.mkdirSync(out, { recursive: true });

const pauseForWalkthrough = async (page, milliseconds = 900) => {
  if (recordVideo) await page.waitForTimeout(milliseconds);
};

const openTour = async page => {
  await page.getByTestId('reversr-actions-menu-button').click();
  await page.getByTestId('reversr-tour-start-header').click();
  await page.getByTestId('reversr-tour-guide').waitFor();
};

const completeStep = async (page, stepId, limit = 3) => {
  const nextButton = page.getByRole('button', { name: 'Next manufacturer tour step' });
  const finishButton = page.getByRole('button', { name: 'Confirm hold and finish manufacturer tour' });
  const advanceButton = await finishButton.count() ? finishButton : nextButton;
  const subtasks = page.locator(`[data-testid^="manufacturer-tour-subtask-${stepId}-"]`);
  assert.equal(await subtasks.count(), 3, `${stepId} should expose three granular subtasks`);
  assert.equal(await advanceButton.isDisabled(), true, `${stepId} should block advancement while subtasks remain`);
  for (let index = 0; index < limit; index += 1) {
    await subtasks.nth(index).click();
    assert.equal(await subtasks.nth(index).getAttribute('aria-checked'), 'true');
    await pauseForWalkthrough(page, 220);
  }
  if (limit === 3) assert.equal(await advanceButton.isDisabled(), false, `${stepId} should unlock after all subtasks complete`);
};

const nextStep = async (page, currentStepId, nextStepId, phase) => {
  await completeStep(page, currentStepId);
  await page.getByRole('button', { name: 'Next manufacturer tour step' }).click();
  await page.getByTestId(`manufacturer-tour-step-${nextStepId}`).waitFor();
  await page.getByTestId(`cad-phase-${phase}`).waitFor();
};

const minimizeIfAvailable = async page => {
  const minimize = page.getByRole('button', { name: 'Minimize manufacturer tour' });
  if (await minimize.count()) {
    await minimize.click();
    await page.getByTestId('reversr-tour-guide-minimized').waitFor();
    return true;
  }
  return false;
};

const expandIfMinimized = async (page, minimized) => {
  if (!minimized) return;
  await page.getByRole('button', { name: 'Expand manufacturer tour' }).click();
  await page.getByTestId('reversr-tour-guide').waitFor();
};

(async () => {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        serviceWorkers: 'block',
        ...(recordVideo ? { recordVideo: { dir: out, size: { width: viewport.width, height: viewport.height } } } : {}),
      });
      let writes = 0;
      const blockedExternal = [];
      const pageErrors = [];
      await context.route('**/*', route => {
        const request = route.request();
        const target = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes += 1;
          return route.abort();
        }
        if (target.origin !== new URL(base).origin) {
          blockedExternal.push(target.href);
          return route.abort();
        }
        if (target.pathname.startsWith('/api/')) {
          return route.fulfill({ status: 503, json: { error: 'Tour QA is public-fixture-only' } });
        }
        return route.continue();
      });

      const page = await context.newPage();
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
      await page.getByTestId('cad-phase-3').waitFor();
      await page.getByText("Mark's tape dispenser", { exact: true }).waitFor();
      await openTour(page);

      await page.getByTestId('manufacturer-tour-step-source').waitFor();
      await page.getByTestId('cad-phase-1').waitFor();
      const tourText = await page.getByTestId('reversr-tour-guide').innerText();
      assert.match(tourText, /Dispenser\.IGS/);
      assert.doesNotMatch(tourText, /FarmBot|Structure ID|Actions for you/i);
      await pauseForWalkthrough(page, 1200);
      await page.screenshot({ path: `${out}/${viewport.name}-01-source.png` });

      await nextStep(page, 'source', 'inventory', 2);
      const inventoryTour = await page.getByTestId('manufacturer-tour-step-inventory').innerText();
      assert.match(inventoryTour, /55\.74 × 69\.42 × 114\.83 mm/);
      assert.match(inventoryTour, /four connected components/i);
      await pauseForWalkthrough(page);

      await nextStep(page, 'inventory', 'controls', 3);
      await page.getByTestId('cad-command-view').waitFor();
      await page.waitForFunction(() => !document.querySelector('[data-testid="cad-command-view"]')?.disabled);
      const minimizedForControls = await minimizeIfAvailable(page);
      await page.getByTestId('cad-command-view').click();
      await page.getByTestId('cad-controller-mode-move').click();
      await page.getByRole('button', { name: 'Move model right one step' }).click();
      await page.getByTestId('cad-controller-mode-orbit').click();
      await page.getByTestId('cad-controller-center-action').click();
      await pauseForWalkthrough(page);
      await page.screenshot({ path: `${out}/${viewport.name}-03-controls.png` });
      await page.getByTestId('cad-command-view').click();
      await page.getByTestId('cad-command-zoom').click();
      await page.getByTestId('cad-zoom-in').click();
      await page.getByTestId('cad-zoom-out').click();
      await page.getByTestId('cad-zoom-fit').click();
      await page.getByTestId('cad-command-zoom').click();
      await expandIfMinimized(page, minimizedForControls);

      await nextStep(page, 'controls', 'traceability', 3);
      const minimizedForDownload = await minimizeIfAvailable(page);
      const downloadTrigger = page.getByTestId('cad-download-menu-trigger');
      await downloadTrigger.scrollIntoViewIfNeeded();
      await downloadTrigger.click();
      const menu = page.getByTestId('cad-download-menu');
      await menu.waitFor();
      assert.equal(await menu.getByRole('menuitem').count(), 2);
      await menu.getByText('Original IGS (.igs)', { exact: true }).waitFor();
      await menu.getByText('Inspection mesh (.stl)', { exact: true }).waitFor();
      await pauseForWalkthrough(page, 1100);
      await page.screenshot({ path: `${out}/${viewport.name}-04-download-menu.png` });
      await page.keyboard.press('Escape');
      await expandIfMinimized(page, minimizedForDownload);

      await nextStep(page, 'traceability', 'privacy', 3);
      await page.getByText(/does not upload, persist, convert, or delete private CAD/i).waitFor();
      await completeStep(page, 'privacy', 1);
      await pauseForWalkthrough(page);
      await page.getByRole('button', { name: 'Exit manufacturer tour' }).click();
      assert.equal(await page.getByTestId('reversr-tour-guide').count(), 0);
      await openTour(page);
      await page.getByTestId('manufacturer-tour-step-privacy').waitFor();
      assert.equal(await page.getByTestId('manufacturer-tour-subtask-privacy-privacy-resume').getAttribute('aria-checked'), 'true');
      await page.getByTestId('manufacturer-tour-step-privacy').getByText('1/3 complete', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Restart manufacturer tour' }).click();
      await page.getByTestId('manufacturer-tour-step-source').waitFor();
      await page.getByTestId('manufacturer-tour-step-source').getByText('0/3 complete', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Next manufacturer tour step' }).isDisabled(), true);

      await nextStep(page, 'source', 'inventory', 2);
      await nextStep(page, 'inventory', 'controls', 3);
      await nextStep(page, 'controls', 'traceability', 3);
      await nextStep(page, 'traceability', 'privacy', 3);
      await nextStep(page, 'privacy', 'decision', 4);
      await page.getByTestId('cad-build-locked').waitFor();
      await page.getByTestId('manufacturer-tour-decision').waitFor();
      await page.getByText(/tolerances, materials, threads, surface finish, wall thickness, supports, orientation, or fabrication readiness/i).waitFor();
      await pauseForWalkthrough(page, 1500);
      await page.screenshot({ path: `${out}/${viewport.name}-06-decision.png` });
      await completeStep(page, 'decision');
      await page.getByText('18/18 total', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Confirm hold and finish manufacturer tour' }).click();
      assert.equal(await page.getByTestId('reversr-tour-guide').count(), 0);

      await openTour(page);
      await page.getByTestId('manufacturer-tour-step-source').waitFor();
      await page.getByTestId('manufacturer-tour-step-source').getByText('0/3 complete', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Exit manufacturer tour' }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(writes, 0);
      assert.deepEqual(pageErrors, []);

      const video = page.video();
      await context.close();
      if (video) await video.saveAs(`${out}/${viewport.name}-manufacturer-tour.webm`);
      results.push({
        viewport,
        writes,
        blockedExternalRequests: blockedExternal.length,
        noHorizontalOverflow: true,
        resumedAtPrivacyWithGranularProgress: true,
        restartedAtSourceWithProgressReset: true,
        completedSubtasks: 18,
        completedWithBuildLocked: true,
      });
      console.log(`PASS ${viewport.name} ${viewport.width}x${viewport.height}`);
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify({ base, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
