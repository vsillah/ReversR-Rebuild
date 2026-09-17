const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const out = process.env.CAD_PUCK_EVIDENCE || '/private/tmp/cad-puck-qa';
const url = process.env.CAD_PUCK_URL || 'http://localhost:5187/?cadPreview=mark-dispenser-v1';
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 try {
 for (const width of [1440, 390, 320]) {
  const context = await browser.newContext({viewport:{width,height:1000},hasTouch:width<=390,recordVideo:{dir:out,size:{width,height:1000}}});
  let external=0;
  await context.route('**/*', route => {
   const u=new URL(route.request().url());
   if(u.origin!==new URL(url).origin) { external++; return route.abort(); }
   if(u.pathname.startsWith('/api/')) return route.fulfill({status:503,json:{error:'Local source-only QA'}});
   return route.continue();
  });
  const page=await context.newPage();
  await page.goto(url);
  const skip=page.getByText('Skip',{exact:true});
  if(await skip.isVisible()) await skip.click();
  if (await page.getByTestId('cad-review-qualified-result').count()) await page.getByTestId('cad-review-qualified-result').click();
  const canvas=page.getByTestId('cad-fixture-canvas');
  await page.waitForFunction(()=>document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view==='isometric');
  const host=page.getByTestId('cad-fixture-canvas-host');
  const panel=host.locator('..');
  const capture = async name => {
   await panel.evaluate(el=>el.scrollIntoView({block:'center'}));
   await panel.evaluate(el=>{ for(let p=el.parentElement;p;p=p.parentElement) { if(p.scrollHeight>p.clientHeight && ['auto','scroll'].includes(getComputedStyle(p).overflowY)) { p.scrollTop+=100; break; } } });
   await page.waitForTimeout(250);
   await panel.screenshot({path:`${out}/${width}-${name}.png`});
  };
  await panel.scrollIntoViewIfNeeded();
  const toggle=page.getByRole('button',{name:'Expand orientation controls'});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.getByRole('button',{name:'Show front view'}).count(),0);
  await capture('collapsed');
  await toggle.focus(); await page.keyboard.press('Enter');
  const puck=page.getByRole('group',{name:'Orientation puck'});
  const puckBounds=await puck.boundingBox();
  assert(puckBounds);
  if(width===1440) {
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
   assert.equal(await canvas.getAttribute('data-floor'),'false');
   assert.equal(await button.getAttribute('aria-pressed'),'true');
   assert(await page.getByTestId('cad-fixed-view-cue').isVisible());
   const bounds=await button.boundingBox(); assert(bounds.height>=44 && bounds.width>=44);
   await page.waitForTimeout(200);
   await capture(view);
  }
  const reset=page.getByRole('button',{name:'Reset to fitted isometric view'});
  await reset.click();
  assert.equal(await canvas.getAttribute('data-floor'),'true');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  assert(Number(await canvas.getAttribute('data-zoom'))>1);
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  assert.equal(await canvas.getAttribute('data-zoom'),'1.000');
  await host.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox(); const x=box.x+box.width/2,y=box.y+box.height/2;
  if(width===1440) {
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
  const video=page.video(); await context.close(); await video.saveAs(`${out}/${width}-walkthrough.webm`);
 console.log(`PASS ${width}px: all views, reset, zoom, rotation, ${width<=390?'touch pinch':'wheel'}, responsive puck fit, keyboard toggle/Escape, floor/grid, target sizes, overflow; blocked external requests: ${external}`);
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
 if (await compactPage.getByTestId('cad-review-qualified-result').count()) await compactPage.getByTestId('cad-review-qualified-result').click();
 await compactPage.getByRole('button',{name:'Expand orientation controls'}).click();
 await compactPage.waitForTimeout(750);
 const compactPuck=await compactPage.getByRole('group',{name:'Orientation puck'}).boundingBox();
 assert(compactPuck && compactPuck.y+compactPuck.height<=904-64,'expanded puck must remain above persistent bottom navigation');
 await compactContext.close();
 console.log('PASS 855x904: expanded puck remains above persistent bottom navigation');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
