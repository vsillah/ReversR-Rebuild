// Public fixture only. Capture actual browser video, including the reference popup.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const out = '/private/tmp/cad-polish-walkthrough';
const qa = 'docs/qa/cad-design-review-polish';
const url = process.env.CAD_PHASE_URL || 'http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1';
assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
assert.equal(new URL(url).searchParams.get('cadPreview'), 'mark-dispenser-v1');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(qa, { recursive: true });
const run = args => {
  const result = spawnSync('ffmpeg', ['-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
};
const descriptions = {
  'design-active': ['DESIGN REVIEW', 'The model leads.', 'Critical geometry review', 'stays visible above it.'],
  'input-acquisition': ['INPUT', 'Authorized public source.', 'Acquisition is complete.', 'No new upload or conversion.'],
  'input-source': ['ORIGINAL SOURCE', 'Dispenser.IGS', 'Format and file size stay', 'easy to find.'],
  'import-details': ['IMPORT ACCESS', 'Service information opens', 'on demand. Upload remains', 'disabled.'],
  'inventory-source': ['INVENTORY', 'Dimensions and units', 'are scannable. Components', 'are not verified parts.'],
  'inventory-details': ['SOURCE DETAILS', 'Provenance and confidence', 'remain available without', 'dominating the review.'],
  'viewer': ['MODEL FIRST', 'Drag to inspect.', 'Use the orientation control', 'for fixed views.'],
  'viewer-front': ['FRONT VIEW', 'Existing orientation controls,', 'neutral material and grid', 'are preserved.'],
  'viewer-top': ['TOP VIEW', 'Compare geometry from', 'another fixed angle.'],
  'source-download': ['SOURCE DOWNLOAD', 'Original IGES remains', 'one clear action.', 'Imported extents sit nearby.'],
  'reference-front': ['FRONT REFERENCE', 'Supplied source image.', 'Compare with the model', 'or open for a closer look.'],
  'reference-left': ['LEFT REFERENCE', 'Image-first comparison.', 'Each reference keeps its', 'own open action.'],
  'reference-top': ['TOP REFERENCE', 'All four supplied views', 'remain in the review.'],
  'reference-drawing': ['DRAWING REFERENCE', 'Open the supplied drawing', 'for a closer inspection.'],
  'opened-drawing': ['OPENED DRAWING', 'Actual reference image', 'opened from the app.', 'Return to continue reviewing.'],
  'return-to-app': ['BACK TO REVIEW', 'The reference grid and', 'source action remain', 'in the same workflow.'],
  'geometry-warnings': ['REVIEW DETAILS', 'Geometry warnings,', 'source confidence and', 'certification limits expand.'],
  'build-prerequisites': ['BUILD IS LOCKED', 'Dimensions, geometry and', 'parts need review before', 'manufacturing preparation.'],
  'build-details': ['BUILD DETAILS', 'Full geometry warnings', 'remain accessible.', 'No output is generated.'],
  'build-recovery': ['CLEAR NEXT STEPS', 'Return to Design or', 'review Inventory.', 'Build stays locked.'],
  'inventory-recovery': ['REVIEW INVENTORY', 'Revisit source dimensions', 'and the parts-list blocker.'],
  'design-recovered': ['DESIGN RESTORED', 'Phase state is preserved.', 'Continue the visual review.'],
};
async function addSideText(scenes, duration) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 1000 } });
  await page.route('**/*', route => route.abort());
  const ordered = [...scenes].sort((a, b) => a.mp4Seconds - b.mp4Seconds);
  const cuts = [{ mp4Seconds: 0, width: 1440, name: 'design-active' }, ...ordered];
  const playlist = [];
  try {
    for (let i = 0; i < cuts.length; i++) {
      const scene = cuts[i], lines = descriptions[scene.name];
      const seconds = (cuts[i + 1]?.mp4Seconds ?? duration) - scene.mp4Seconds;
      if (seconds <= 0) continue;
      const [title, ...body] = lines;
      await page.setContent(`<html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><main style="padding:120px 26px 24px;border-left:1px solid #dde3ec;height:856px"><p style="font-size:15px;color:#475569;letter-spacing:1px">PUBLIC CAD REVIEW</p><h1 style="font-size:24px;line-height:32px;margin:40px 0 24px">${title}</h1><p style="font-size:20px;line-height:32px">${body.join('<br>')}</p><p style="position:absolute;bottom:65px;font-size:16px;line-height:26px;color:#475569">${scene.width === 1440 ? 'Desktop · 1440px' : 'Mobile · 390px'}<br>Local public fixture only</p></main></body></html>`);
      const file = `${out}/caption-${i}.png`;
      await page.screenshot({ path: file });
      playlist.push(`file '${file}'\nduration ${seconds}`);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(`${out}/captions.txt`, playlist.join('\n') + '\n' + playlist.at(-1).split('\n')[0]);
  run(['-i', `${qa}/walkthrough.mp4`, '-f', 'concat', '-safe', '0', '-i', `${out}/captions.txt`, '-filter_complex', '[0:v]fps=25[a];[1:v]fps=25[b];[a][b]hstack=inputs=2:shortest=1[v]', '-map', '[v]', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/annotated.mp4`]);
  fs.copyFileSync(`${out}/annotated.mp4`, `${qa}/walkthrough.mp4`);
}
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const scenes = [], clips = [];
  let timeline = 0;
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: out, size: { width, height: 1000 } } });
      const blocked = [];
      await context.route('**/*', route => {
        const request = route.request(), u = new URL(request.url());
        if (u.origin !== new URL(url).origin || u.pathname.startsWith('/api/') || request.method() !== 'GET') {
          blocked.push({ path: u.pathname, method: request.method() });
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      const started = Date.now();
      const elapsed = () => (Date.now() - started) / 1000;
      await page.goto(url);
      await page.waitForFunction(() => document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view === 'isometric');
      const nav = page.getByTestId('reversr-tour-phase-nav');
      const phase = name => nav.getByRole('button', { name: new RegExp(`^${name} phase,`) }).click();
      const hold = async (name, locator, seconds = 6) => {
        if (locator) await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(500);
        scenes.push({ width, name, sourceSeconds: elapsed(), duration: seconds });
        await page.screenshot({ path: `${qa}/${width}-${name}.png` });
        await page.waitForTimeout(seconds * 1000);
      };
      await hold('design-active', nav);
      await phase('Input');
      await hold('input-acquisition', page.getByTestId('cad-phase-1'));
      await hold('input-source', page.getByText('Dispenser.IGS', { exact: true }));
      await page.getByTestId('cad-import-details').click();
      await hold('import-details', page.getByTestId('cad-import-details-content'), 6);
      await page.getByTestId('cad-import-details').click();
      await phase('Inventory');
      await hold('inventory-source', page.getByTestId('cad-phase-2'), 10);
      await page.getByTestId('cad-inventory-details').click();
      await hold('inventory-details', page.getByTestId('cad-inventory-details-content'), 8);
      await page.getByTestId('cad-inventory-details').click();
      await page.getByRole('button', { name: 'Review in Design', exact: true }).click();
      await hold('viewer', page.getByTestId('cad-fixture-canvas-host'));
      await page.getByRole('button', { name: 'Expand orientation controls' }).click();
      await page.getByRole('button', { name: 'Show front view' }).click();
      await hold('viewer-front', null, 4);
      await page.getByRole('button', { name: 'Show top view' }).click();
      await hold('viewer-top', null, 4);
      await page.getByRole('button', { name: 'Reset to fitted isometric view' }).click();
      const source = page.getByRole('link', { name: 'Download original Dispenser.IGS', exact: true });
      await hold('source-download', source, 8);
      const downloaded = page.waitForEvent('download');
      await source.click();
      assert.equal((await downloaded).suggestedFilename(), 'Dispenser.IGS');
      for (const label of ['Front', 'Left', 'Top', 'Drawing']) {
        await hold(`reference-${label.toLowerCase()}`, page.getByRole('link', { name: `Open ${label} reference image`, exact: true }), 6);
      }
      const popupEvent = context.waitForEvent('page');
      await page.getByRole('link', { name: 'Open Drawing reference image', exact: true }).click();
      const cutStart = elapsed();
      const popup = await popupEvent;
      await popup.waitForLoadState();
      assert.match(popup.url(), /\/cad-fixtures\/mark-dispenser-v1\/dispenser-/);
      await popup.waitForFunction(() => document.querySelector('img')?.complete);
      await popup.screenshot({ path: `${qa}/${width}-opened-drawing.png` });
      await popup.waitForTimeout(8000);
      const popupVideo = popup.video();
      await popup.close();
      await popupVideo.saveAs(`${out}/${width}-popup.webm`);
      const cutEnd = elapsed();
      await hold('return-to-app', page.getByTestId('cad-reference-comparison'), 4);
      await page.getByTestId('cad-design-details').click();
      await hold('geometry-warnings', page.getByText('The interactive model is the calibrated display mesh derived from the authorized IGES source. Reference images remain independent visual checks.', { exact: true }), 9);
      await page.getByTestId('cad-design-details').click();
      await phase('Build');
      await hold('build-prerequisites', page.getByTestId('cad-build-locked'), 10);
      await page.getByTestId('cad-build-details').click();
      await hold('build-details', page.getByTestId('cad-build-details-content'), 7);
      await page.getByTestId('cad-build-details').click();
      await hold('build-recovery', page.getByRole('button', { name: 'Return to Design review', exact: true }), 6);
      await page.getByRole('button', { name: 'Review inventory prerequisites', exact: true }).click();
      await hold('inventory-recovery', page.getByTestId('cad-phase-2'), 5);
      await phase('Build');
      await page.getByRole('button', { name: 'Return to Design review', exact: true }).click();
      await hold('design-recovered', nav, 5);
      const video = page.video();
      await context.close();
      await video.saveAs(`${out}/${width}.webm`);
      // Keep the real 600px app lane readable; retain the full drawing sheet in popup footage.
      const fit = width === 1440 ? 'crop=600:1000:420:0,pad=640:1000:20:0:color=0xf2f5fa,setsar=1,fps=25' : 'pad=640:1000:125:0:color=0xf2f5fa,setsar=1,fps=25';
      const pieces = [
        ['before', ['-i', `${out}/${width}.webm`, '-t', String(cutStart)]],
        ['popup', ['-i', `${out}/${width}-popup.webm`]],
        ['after', ['-ss', String(cutEnd), '-i', `${out}/${width}.webm`]],
      ];
      const probe = file => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());
      let popupDuration;
      for (const [name, inputs] of pieces) {
        const file = `${out}/${width}-${name}.mp4`;
        const framing = name === 'popup' && width === 1440 ? 'crop=640:1000:280:0,setsar=1,fps=25' : fit;
        run([...inputs, '-vf', framing, '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', file]);
        clips.push(file);
        const duration = probe(file);
        if (name === 'popup') popupDuration = duration;
      }
      for (const scene of scenes.filter(s => s.width === width)) {
        scene.mp4Seconds = timeline + scene.sourceSeconds + (scene.sourceSeconds >= cutEnd ? popupDuration - (cutEnd - cutStart) : 0);
      }
      scenes.push({ width, name: 'opened-drawing', mp4Seconds: timeline + cutStart + 2, duration: popupDuration, blocked });
      timeline += pieces.reduce((sum, [name]) => sum + probe(`${out}/${width}-${name}.mp4`), 0);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(`${out}/concat.txt`, clips.map(file => `file '${file}'`).join('\n'));
  run(['-f', 'concat', '-safe', '0', '-i', `${out}/concat.txt`, '-c', 'copy', '-movflags', '+faststart', `${qa}/walkthrough.mp4`]);
  fs.writeFileSync(`${qa}/walkthrough-scenes.json`, JSON.stringify({ url, scenes }, null, 2));
  await addSideText(scenes, timeline);
  console.log('Recorded polished CAD review with source references, accessible details, popup video, and explanatory side text.');
})().catch(error => { console.error(error); process.exitCode = 1; });
