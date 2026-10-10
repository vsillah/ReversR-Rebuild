// Localhost-only browser QA and privacy-safe Human QA evidence for Package 6.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const evidenceDir = path.join(root, 'docs/evidence/cad-phase5-package6');
const rawVideoDir = '/private/tmp/reversr-package6-authenticated-import-video';
const baseUrl = process.env.CAD_AUTH_QUALIFICATION_URL || 'http://127.0.0.1:5002';
const exactRoute = `${baseUrl}/?cadPreview=authenticated-import-v1&cadQualification=authenticated-import-v1&cadAuth=synthetic&cadPhase=input`;
const stateKey = 'reversr:authenticated-import-qualification:v1';
const expectedSourceSha256 = '6a33a42c62b839e57244df6412ffdf755aabbeedae372aa9223483bb9611e0f4';
const expectedStlSha256 = 'd0fa57561304b96d122815cac8ff2b09e56be785dcaadce23d70b63577418150';
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

async function newClosedContext(browser, options) {
  const context = await browser.newContext({ serviceWorkers: 'block', ...options });
  const counts = { externalRequestsBlocked: 0, nonReadRequestsBlocked: 0, apiRequestsBlocked: 0 };
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = url.origin === baseUrl;
    if (!['GET', 'HEAD'].includes(request.method())) {
      counts.nonReadRequestsBlocked += 1;
      return route.abort();
    }
    if (url.pathname.startsWith('/api/')) {
      counts.apiRequestsBlocked += 1;
      return route.abort();
    }
    if (!local) {
      counts.externalRequestsBlocked += 1;
      return route.abort();
    }
    return route.continue();
  });
  return { context, counts };
}

async function resetToInput(page) {
  await page.goto(exactRoute, { waitUntil: 'domcontentloaded' });
  await page.evaluate(key => localStorage.removeItem(key), stateKey);
  await page.goto(exactRoute, { waitUntil: 'networkidle' });
  await page.getByTestId('cad-authenticated-import-panel').waitFor();
}

async function assertClosedNetwork(counts) {
  assert.equal(counts.externalRequestsBlocked, 0, 'external network request attempted');
  assert.equal(counts.nonReadRequestsBlocked, 0, 'write request attempted');
  assert.equal(counts.apiRequestsBlocked, 0, 'API request attempted');
}

async function assertResponsive(page, testId = 'cad-authenticated-import-panel') {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false,
    'horizontal overflow detected');
  const box = await page.getByTestId(testId).boundingBox();
  assert(box && box.x >= -0.5 && box.x + box.width <= await page.evaluate(() => innerWidth) + 0.5,
    'qualification panel leaves viewport');
}

async function qualify(page, choice) {
  await page.getByTestId(`cad-auth-import-source-${choice}`).click();
  await page.getByTestId('cad-auth-import-uploading').waitFor();
  await page.getByTestId('cad-auth-import-processing').waitFor();
  await page.getByTestId('cad-qualified-result').waitFor();
  await page.getByTestId('cad-fixture-canvas').waitFor();
  assert.match(page.url(), /cadPhase=design/);
}

async function assertAuthenticatedDesignScope(page) {
  assert.equal(await page.getByText('View implementation readiness', { exact: true }).count(), 0,
    'authenticated Design must not expose implementation readiness');
  assert.equal(await page.getByTestId('cad-build-locked').count(), 0,
    'authenticated Design must not expose the legacy locked-build explainer');
  assert.equal(await page.getByTestId('cad-implementation-slide').count(), 0,
    'authenticated Design must not expose the implementation roadmap');
  assert.equal(await page.getByTestId('cad-commercialization-gates').count(), 0,
    'authenticated Design must not expose commercialization gates');
  assert.equal(await page.getByTestId('cad-readiness-qualification-details').count(), 0,
    'authenticated Design must not expose the readiness qualification explainer');
}

async function exerciseViewer(page) {
  await page.getByTestId('cad-command-view').click();
  await page.getByTestId('cad-view-controller').waitFor();
  await page.getByTestId('cad-controller-mode-move').click();
  await page.getByRole('button', { name: 'Move model right one step', exact: true }).click();
  const pan = await page.getByTestId('cad-fixture-canvas').getAttribute('data-pan');
  assert(pan && pan !== '0.000,0.000,0.000', 'shared move control did not update the model pan');
  await page.getByTestId('cad-controller-mode-orbit').click();
  await page.getByRole('button', { name: 'Show fixed right view', exact: true }).click();
}

async function downloadAndHash(page, triggerTestId, optionTestId) {
  await page.getByTestId('cad-download-menu-trigger').scrollIntoViewIfNeeded();
  await page.getByTestId('cad-download-menu-trigger').click();
  const pending = page.waitForEvent('download');
  await page.getByTestId(optionTestId).click();
  const download = await pending;
  const filePath = await download.path();
  assert(filePath, `download path missing for ${triggerTestId}`);
  return { suggestedFilename: download.suggestedFilename(), sha256: sha256(fs.readFileSync(filePath)) };
}

async function recordDesktop(browser) {
  const { context, counts } = await newClosedContext(browser, {
    viewport: { width: 1440, height: 900 }, recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await resetToInput(page);
  const video = page.video();
  await wait(900);
  await page.getByTestId('cad-auth-import-preview-failure').click();
  await page.getByTestId('cad-auth-import-safe-error').waitFor();
  await wait(900);
  await page.getByTestId('cad-auth-import-show-unknown').click();
  await page.getByTestId('cad-auth-import-unknown').waitFor();
  await wait(900);
  await page.getByTestId('cad-auth-import-revoke-unknown').click();
  await page.getByTestId('cad-auth-import-deleted').waitFor();
  await wait(700);
  await page.getByTestId('cad-auth-import-start-new').click();
  await page.getByTestId('cad-authenticated-import-panel').waitFor();
  await qualify(page, 'file');
  await wait(1000);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('cad-qualified-result').waitFor();
  await page.getByTestId('cad-fixture-canvas').waitFor();
  await assertAuthenticatedDesignScope(page);
  await exerciseViewer(page);
  await wait(1000);
  const original = await downloadAndHash(page, 'cad-download-menu-trigger', 'cad-open-source-iges');
  const stl = await downloadAndHash(page, 'cad-download-menu-trigger', 'igs-download-derived-stl');
  assert.equal(original.sha256, expectedSourceSha256);
  assert.equal(stl.sha256, expectedStlSha256);
  await wait(900);
  await page.getByTestId('cad-delete-synthetic-artifacts').click();
  await page.getByTestId('cad-auth-import-deleted').waitFor();
  assert.equal(await page.getByTestId('cad-qualified-result').count(), 0);
  assert.equal(await page.getByText('No source or artifact metadata remains available in this view.', { exact: true }).count(), 1);
  await wait(1100);
  assert.deepEqual(pageErrors, []);
  await assertClosedNetwork(counts);
  await context.close();
  await video.saveAs(path.join(rawVideoDir, 'desktop.webm'));
  return { viewport: '1440x900', reloadContinuity: true, viewerOrbitAndMove: true,
    authenticatedDesignScope: true, readinessAndRoadmapAbsent: true,
    original, stl, deletionRevocation: true, ...counts };
}

async function recordMobile(browser) {
  const { context, counts } = await newClosedContext(browser, {
    viewport: { width: 390, height: 844 }, hasTouch: true,
    recordVideo: { dir: rawVideoDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await resetToInput(page);
  const video = page.video();
  await assertResponsive(page);
  await wait(1000);
  await qualify(page, 'sample');
  await assertAuthenticatedDesignScope(page);
  await page.getByTestId('cad-fixture-canvas-host').scrollIntoViewIfNeeded();
  await exerciseViewer(page);
  await wait(1000);
  await page.getByTestId('cad-download-menu-trigger').scrollIntoViewIfNeeded();
  await page.getByTestId('cad-download-menu-trigger').click();
  await page.getByTestId('cad-download-menu').waitFor();
  await wait(1200);
  await assertResponsive(page, 'cad-qualified-result');
  assert.deepEqual(pageErrors, []);
  await assertClosedNetwork(counts);
  await context.close();
  await video.saveAs(path.join(rawVideoDir, 'mobile.webm'));
  return { viewport: '390x844', exclusiveSampleChoice: true, automaticProgression: true,
    viewerOrbitAndMove: true, compactDownloadMenu: true, authenticatedDesignScope: true,
    readinessAndRoadmapAbsent: true, ...counts };
}

async function captureResponsiveEvidence(browser) {
  const results = [];
  for (const width of [320, 390, 768, 855, 1440]) {
    const height = width <= 390 ? 844 : 900;
    const { context, counts } = await newClosedContext(browser, { viewport: { width, height }, hasTouch: width <= 390 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await resetToInput(page);
    await assertResponsive(page);
    await page.screenshot({ path: path.join(evidenceDir, `${width}-input.png`), fullPage: true });
    await qualify(page, width % 2 === 0 ? 'sample' : 'file');
    await assertAuthenticatedDesignScope(page);
    await assertResponsive(page, 'cad-qualified-result');
    await page.screenshot({ path: path.join(evidenceDir, `${width}-design.png`), fullPage: true });
    assert.deepEqual(pageErrors, []);
    await assertClosedNetwork(counts);
    results.push({ viewport: `${width}x${height}`, noHorizontalOverflow: true,
      inputVisible: true, designReady: true, webglCanvasReady: true,
      readinessAndRoadmapAbsent: true, ...counts });
    await context.close();
  }
  return results;
}

function createMp4() {
  const output = path.join(evidenceDir, 'cad-package6-authenticated-import-walkthrough.mp4');
  execFileSync('ffmpeg', ['-y', '-i', path.join(rawVideoDir, 'desktop.webm'),
    '-i', path.join(rawVideoDir, 'mobile.webm'), '-filter_complex',
    '[0:v]scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x101918,setsar=1,fps=25[v0];'
      + '[1:v]scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x101918,setsar=1,fps=25[v1];'
      + '[v0][v1]concat=n=2:v=1:a=0[v]', '-map', '[v]', '-c:v', 'libx264', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output, '-loglevel', 'error']);
  return output;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const responsive = await captureResponsiveEvidence(browser);
    const desktop = await recordDesktop(browser);
    const mobile = await recordMobile(browser);
    const video = createMp4();
    const result = { schemaVersion: 1, qualificationMode: 'authenticated-import-v1', exactRoute,
      sourceOnly: true, localhostOnly: true, runtimeGatesRemainFalse: true,
      responsive, desktop, mobile, video: path.relative(root, video), videoSha256: sha256(fs.readFileSync(video)) };
    fs.writeFileSync(path.join(evidenceDir, 'browser-qa-results.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
