// Local exported-route recording; all external/API requests are blocked.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const url = process.env.CAD_REVIEW_URL || 'http://localhost:5193/?cadPreview=mark-dispenser-v1';
const out = process.env.CAD_REVIEW_EVIDENCE || '/private/tmp/cad-guided-review-walkthrough';
const qa = 'docs/qa/cad-guided-review';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(qa, { recursive: true });
(async () => {
 const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 try {
  for (const width of [1440, 390]) {
   const context = await browser.newContext({ viewport: { width, height: 1000 }, recordVideo: { dir: out, size: { width, height: 1000 } } });
   await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== new URL(url).origin || u.pathname.startsWith('/api/') || route.request().method() !== 'GET') return route.abort();
    return route.continue();
   });
   const page = await context.newPage(); await page.goto(url);
   await page.waitForFunction(() => document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view === 'isometric');
   const capture = async (locator, name) => {
    await locator.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${qa}/${width}-${name}.png` });
   };
   await capture(page.getByTestId('cad-guided-review'), 'viewer');
   await page.getByRole('button', { name: 'Expand orientation controls' }).click();
   await page.getByRole('button', { name: 'Show front view' }).click();
   await page.waitForTimeout(1800);
   await page.keyboard.press('Escape');
   await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
   await page.waitForTimeout(1000);
   await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
   await capture(page.getByRole('navigation', { name: 'Review steps' }), 'compare');
   await page.getByLabel('Supplied reference', { exact: true }).selectOption({ label: 'Left' });
   await page.waitForTimeout(1500);
   await page.getByRole('button', { name: 'Check', exact: true }).click();
   await page.getByRole('group', { name: 'Source & metadata', exact: true }).getByLabel('Pass', { exact: true }).check();
   await page.getByRole('group', { name: 'Reference comparison', exact: true }).getByLabel('Issue', { exact: true }).check();
   await capture(page.getByRole('navigation', { name: 'Review steps' }), 'check');
   await page.waitForTimeout(1800);
   await page.getByRole('button', { name: 'Receipt', exact: true }).click();
   await capture(page.getByRole('navigation', { name: 'Review steps' }), 'receipt');
   await page.getByRole('button', { name: 'Download receipt', exact: true }).click();
   await page.waitForTimeout(2000);
   const video = page.video(); await context.close(); await video.saveAs(`${out}/${width}.webm`);
  }
 } finally { await browser.close(); }
 const result = spawnSync('ffmpeg', ['-y', '-i', `${out}/1440.webm`, '-i', `${out}/390.webm`, '-filter_complex', '[0:v]crop=600:1000:420:0,setsar=1,fps=25[v0];[1:v]pad=600:1000:105:0:color=0xf2f5fa,setsar=1,fps=25[v1];[v0][v1]concat=n=2:v=1:a=0[v]', '-map', '[v]', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${qa}/walkthrough.mp4`], { stdio: 'ignore' });
 if (result.status !== 0) throw new Error('FFmpeg failed');
 console.log(`Recorded desktop and mobile workflow to ${qa}/walkthrough.mp4`);
})().catch(error => { console.error(error); process.exitCode = 1; });
