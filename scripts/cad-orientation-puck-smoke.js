const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { chromium } = require('playwright');
const out = process.env.CAD_PUCK_EVIDENCE || '/private/tmp/cad-puck-qa';
const url = process.env.CAD_PUCK_URL || 'http://localhost:5187/?cadPreview=mark-dispenser-v1';
fs.mkdirSync(out, { recursive: true });
(async () => {
 const evidence = [];
 const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 try {
 for (const width of [1440, 768, 390, 320]) {
  const context = await browser.newContext({viewport:{width,height:1000},hasTouch:width<=390,recordVideo:{dir:out,size:{width,height:1000}}});
  let external=0;
  await context.route('**/*', route => {
   const u=new URL(route.request().url());
   if(!['GET', 'HEAD'].includes(route.request().method())) throw new Error('Unexpected write request');
   if(u.origin!==new URL(url).origin) { external++; return route.abort(); }
   if(u.pathname.startsWith('/api/')) return route.fulfill({status:503,json:{error:'Local source-only QA'}});
   return route.continue();
  });
  const page=await context.newPage();
  await page.goto(url);
  const skip=page.getByText('Skip',{exact:true});
  if(await skip.isVisible()) await skip.click();
  assert.equal(await page.getByTestId('cad-guided-review').count(), 0);
  assert.equal(await page.getByRole('button', {name:'Copy receipt',exact:true}).count(), 0);
  const textFits = async locator => locator.evaluate(el => {
   const range = document.createRange(); range.selectNodeContents(el);
   const text = range.getBoundingClientRect(), box = el.getBoundingClientRect();
   return text.width <= box.width + 1 && text.height <= parseFloat(getComputedStyle(el).fontSize) * 1.5 && el.scrollWidth <= el.clientWidth + 1;
  });
  assert(await textFits(page.getByTestId('reversr-workflow-wordmark')), 'single-line wordmark');
  for (const label of ['Input', 'Inventory', 'Design', 'Build']) assert(await textFits(page.getByTestId('reversr-tour-phase-nav').getByText(label,{exact:true})), `${label} must fit`);
  await page.screenshot({path:`${out}/${width}-shell.png`});
  await page.getByTestId('cad-phase-3').waitFor();
  const canvas=page.getByTestId('cad-fixture-canvas');
  await page.waitForFunction(()=>document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view==='isometric');
  const host=page.getByTestId('cad-fixture-canvas-host');
  const panel=host.locator('..');
  const pixelResults = [];
  const capture = async name => {
   await panel.evaluate(el=>el.scrollIntoView({block:'center'}));
   await panel.evaluate(el=>{ for(let p=el.parentElement;p;p=p.parentElement) { if(p.scrollHeight>p.clientHeight && ['auto','scroll'].includes(getComputedStyle(p).overflowY)) { p.scrollTop+=100; break; } } });
   await page.waitForTimeout(250);
   await panel.screenshot({path:`${out}/${width}-${name}.png`});
   // Read actual WebGL pixels, excluding HTML controls, rather than trusting labels.
   const raw = await canvas.evaluate(el => el.toDataURL('image/png'));
   const png = PNG.sync.read(Buffer.from(raw.split(',')[1], 'base64'));
   const shades = []; let gridPixels = 0, minX = png.width, maxX = 0, minY = png.height, maxY = 0;
   for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4, [r,g,b] = png.data.subarray(i,i+3);
    if (Math.max(r,g,b)-Math.min(r,g,b)<=2 && r>=45 && r<195) {
     shades.push(r); minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    if (b-r>=10 && r<215 && b<237) gridPixels++;
   }
   assert(shades.length>png.width*png.height*0.008, `${name}: visible neutral model pixels`);
   assert(gridPixels>png.width*png.height*0.01, `${name}: visible grid pixels`);
   shades.sort((a,b)=>a-b); const median=shades[Math.floor(shades.length/2)];
   assert(220-median>=35, `${name}: model/background contrast`);
   if (name!=='custom') assert(minX>2 && minY>2 && maxX<png.width-3 && maxY<png.height-3, `${name}: fitted geometry must not clip`);
   assert.equal(await canvas.getAttribute('data-material'),'matte-neutral-aaaaaa');
   assert.equal(await canvas.getAttribute('data-grid'),'view-plane');
   pixelResults.push({view:name,median,modelPixels:shades.length,gridPixels});
  };
  await panel.scrollIntoViewIfNeeded();
  const toggle=page.getByRole('button',{name:'Expand orientation controls'});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.getByRole('button',{name:'Show front view'}).count(),0);
  await capture('collapsed');
  const stationary = await canvas.evaluate(el => el.toDataURL());
  await page.waitForTimeout(400);
  assert.equal(await canvas.evaluate(el => el.toDataURL()), stationary, 'no auto-rotation');
  await toggle.focus(); await page.keyboard.press('Enter');
  const puck=page.getByRole('group',{name:'Orientation puck'});
  const puckBounds=await puck.boundingBox();
  assert(puckBounds);
  if(width>=768) {
   assert.equal(await puck.getAttribute('data-layout'),'standard');
   assert(puckBounds.width>=168);
   assert.equal(await canvas.getAttribute('data-control-fit'),'default');
  } else {
   assert.equal(await puck.getAttribute('data-layout'),'compact');
   assert(puckBounds.width<=132);
   assert.equal(await canvas.getAttribute('data-control-fit'),'compact-clearance');
  }
  for(const view of ['front','back','left','right','top','bottom']) {
   const button=page.getByRole('button',{name:`Show ${view} view`});
   await button.click();
   assert.equal(await canvas.getAttribute('data-view'),view);
   assert.equal(await button.getAttribute('aria-pressed'),'true');
   assert.equal(await page.getByTestId('cad-view-grid-label').count(), 0);
   assert.equal(await host.getByText('Unscaled grid', {exact:true}).count(), 0);
   const bounds=await button.boundingBox(); assert(bounds.height>=44 && bounds.width>=44);
   await page.waitForTimeout(200);
   await capture(view);
  }
  const reset=page.getByRole('button',{name:'Reset to fitted isometric view'});
  await reset.click();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  assert(Number(await canvas.getAttribute('data-zoom'))>1);
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  assert.equal(await canvas.getAttribute('data-zoom'),'1.000');
  await host.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox(); const x=box.x+box.width/2,y=box.y+box.height/2;
  if(width>=768) {
   await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+55,y+25,{steps:8}); await page.mouse.up();
   await page.mouse.wheel(0,-100);
  } else {
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+15,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-45,y,id:1},{x:x+45,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  assert.equal(await canvas.getAttribute('data-view'),'custom');
  assert(Number(await canvas.getAttribute('data-zoom'))>1);
  assert.match(await panel.getByRole('status').innerText(),/Custom/);
  await capture('custom');
  if(await toggle.getAttribute('aria-expanded')!=='true') await page.getByRole('button',{name:'Expand orientation controls'}).click();
  await reset.click(); assert.equal(await canvas.getAttribute('data-view'),'isometric'); assert.equal(await canvas.getAttribute('data-zoom'),'1.000');
  await reset.focus(); await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'Expand orientation controls'}).getAttribute('aria-expanded'),'false');
  assert.equal(await canvas.getAttribute('data-control-fit'),'default');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.waitForTimeout(500);
  await capture('reset');
  const medians=pixelResults.filter(item=>item.view!=='custom').map(item=>item.median);
  assert(Math.max(...medians)-Math.min(...medians)<=30, 'view changes must preserve perceived neutral color');
  evidence.push({width,pixels:pixelResults,externalBlocked:external});
  const video=page.video(); await context.close(); await video.saveAs(`${out}/${width}-walkthrough.webm`);
 console.log(`PASS ${width}px: all views, reset, zoom, rotation, ${width<=390?'touch pinch':'wheel'}, responsive puck fit, keyboard toggle/Escape, neutral color/contrast/grid pixels, no auto-rotation, text fit, target sizes, overflow; blocked external requests: ${external}`);
 }
 const compactContext=await browser.newContext({viewport:{width:855,height:904}});
 await compactContext.route('**/*', route => {
  const u = new URL(route.request().url());
  if (u.origin !== new URL(url).origin || u.pathname.startsWith('/api/')) return route.abort();
  return route.continue();
 });
 const compactPage=await compactContext.newPage();
 await compactPage.goto(url);
 const compactSkip=compactPage.getByText('Skip',{exact:true});
 if(await compactSkip.isVisible()) await compactSkip.click();
 await compactPage.getByTestId('cad-phase-3').waitFor();
 await compactPage.getByRole('button',{name:'Expand orientation controls'}).click();
 await compactPage.waitForTimeout(750);
 const compactPuck=await compactPage.getByRole('group',{name:'Orientation puck'}).boundingBox();
 assert(compactPuck && compactPuck.y+compactPuck.height<=904-64,'expanded puck must remain above persistent bottom navigation');
 await compactContext.close();
 console.log('PASS 855x904: expanded puck remains above persistent bottom navigation');
 const production=await browser.newContext(); let fixtureRequests=0;
 await production.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.pathname.includes('/cad-fixtures/')) fixtureRequests++;
  const file=path.resolve('dist', `.${u.pathname==='/'?'/index.html':u.pathname}`);
  if (!file.startsWith(path.resolve('dist')+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404,body:''});
  return route.fulfill({path:file});
 });
 const prodPage=await production.newPage(); await prodPage.goto('https://reversr.vercel.app/?cadPreview=mark-dispenser-v1');
 await prodPage.getByText('Skip',{exact:true}).click();
 await prodPage.getByRole('button',{name:'Start new machine reconstruction',exact:true}).first().click();
 await prodPage.getByTestId('phase-one-mode-import').click();
 assert.equal(await prodPage.getByTestId('cad-fixture-canvas').count(),0);
 assert.equal(await prodPage.getByTestId('cad-guided-review').count(),0);
 assert(await prodPage.getByRole('button',{name:'Upload unavailable: operator access required'}).isDisabled());
 assert.equal(fixtureRequests,0); await production.close();
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({evidence,productionHostnameSimulatedLocally:'blocked; no fixture requests'},null,2));
 console.log('PASS locally simulated production hostname: fixture absent; upload disabled');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
