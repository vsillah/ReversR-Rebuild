const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.CAD_WHALE_LAYOUT_URL || 'http://localhost:5001';
const out = process.env.CAD_WHALE_LAYOUT_VIDEO_DIR || '/private/tmp/cad-phase3-whale-layout-video';
const now = new Date().toISOString();
const project = (index, phase, matched = false) => ({
  id: `qa-public-dispenser-${index}`,
  createdAt: now,
  updatedAt: now,
  phase,
  input: `Dispenser public fixture QA ${index}`,
  capturedImage: null,
  analysis: { productName: `Dispenser QA ${index}`, components: [], neighborhoodResources: [], attributes: [], closedWorldBoundary: 'Public fixture QA only.', rawAnalysis: 'Public fixture QA only.' },
  selectedPattern: matched ? 'inventory_match' : null,
  innovation: null,
  spec: null,
  threeDScene: null,
  imageUrl: null,
  bom: null,
  reviewerApprovalRecords: [],
});
const projects = Array.from({ length: 10 }, (_, index) => project(index + 1, (index % 4) + 1, index % 2 === 1));

const addCaption = async (page, text) => {
  await page.evaluate(label => {
    document.getElementById('qa-video-caption')?.remove();
    const caption = document.createElement('div');
    caption.id = 'qa-video-caption';
    caption.textContent = label;
    Object.assign(caption.style, {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: '999999',
      padding: '10px 14px',
      borderRadius: '10px',
      background: 'rgba(15, 23, 42, 0.92)',
      color: '#fff',
      font: '600 14px system-ui, sans-serif',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
    });
    document.body.appendChild(caption);
  }, text);
};

const loadState = async (page, savedProjects) => {
  await page.evaluate(items => localStorage.setItem('reversr_innovations', JSON.stringify(items)), savedProjects);
  await page.reload();
  await page.getByTestId('cad-command-zoom').waitFor();
  await page.getByTestId('desktop-nav-projects').click();
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['GET', 'HEAD'].includes(route.request().method())) return route.abort();
    if (url.origin !== new URL(base).origin) return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline layout QA' } });
    return route.continue();
  });

  await page.goto(`${base}/?cadPreview=mark-dispenser-v1&cadPhase=design`);
  await page.getByTestId('cad-command-zoom').waitFor();

  await loadState(page, []);
  await addCaption(page, 'Zero saved projects · Manage fills the available rail');
  await page.waitForTimeout(2200);

  await loadState(page, projects.slice(0, 2));
  await addCaption(page, 'Few projects · Local phase and update details stay inline');
  await page.waitForTimeout(2200);

  await loadState(page, projects);
  await addCaption(page, 'Many projects · Three recent records stay inline');
  await page.waitForTimeout(2200);
  await page.getByTestId('desktop-project-show-more').click();
  await addCaption(page, 'Show 7 more / Show fewer keeps the list bounded');
  await page.waitForTimeout(2200);
  await page.getByTestId('desktop-project-show-more').click();
  await page.getByTestId('desktop-manage-legal').scrollIntoViewIfNeeded();
  await addCaption(page, 'Manage: Plan · AI · Inventory · Support · Legal');
  await page.waitForTimeout(2600);
  await addCaption(page, 'New and Tour remain the fixed bottom pair');
  await page.waitForTimeout(2200);

  const video = page.video();
  const finalPath = path.join(out, 'phase3-whale-layout-repair-ia-valid.webm');
  await page.close();
  await video.saveAs(finalPath);
  await context.close();
  await browser.close();
  console.log(finalPath);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
