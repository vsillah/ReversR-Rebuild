// Real non-production fixture harness only. Blocks API and external traffic.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const out = '/private/tmp/cad-viewer-walkthrough';
const qa = 'docs/qa/cad-neutral-grid';
const url = process.env.CAD_PUCK_URL || 'http://localhost:5193/?cadPreview=mark-dispenser-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try { for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390,recordVideo:{dir:out,size:{width,height:1000}}});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==new URL(url).origin||u.pathname.startsWith('/api/')||route.request().method()!=='GET')return route.abort();
   return route.continue();
  });
  const page=await context.newPage();await page.goto(url);
  await page.getByTestId('cad-phase-3').waitFor();
  const canvas=page.getByTestId('cad-fixture-canvas');
  await page.waitForFunction(()=>document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view==='isometric');
  const host=page.getByTestId('cad-fixture-canvas-host');
  await host.evaluate(el=>el.scrollIntoView({block:'center'}));
  await host.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement){if(p.scrollHeight>p.clientHeight&&['auto','scroll'].includes(getComputedStyle(p).overflowY)){p.scrollTop+=100;break;}}});
  await page.waitForTimeout(1500);await page.screenshot({path:`${qa}/${width}-harness.png`});
  await page.getByRole('button',{name:'Expand orientation controls'}).click();
  for(const view of ['front','back','left','right','top','bottom']){
   await page.getByRole('button',{name:`Show ${view} view`}).click();await page.waitForTimeout(1000);
  }
  await page.getByRole('button',{name:'Reset to fitted isometric view'}).click();
  await page.getByRole('button',{name:'Reset to fitted isometric view'}).focus();await page.keyboard.press('Escape');
  const box=await canvas.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  if(width===1440){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+15,{steps:20});await page.mouse.up();await page.mouse.wheel(0,-110);}
  else{
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+15,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.waitForTimeout(1500);
  await page.getByRole('button',{name:'Expand orientation controls'}).click();
  await page.getByRole('button',{name:'Reset to fitted isometric view'}).click();
  await page.getByRole('button',{name:'Reset to fitted isometric view'}).focus();await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const video=page.video();await context.close();await video.saveAs(`${out}/${width}.webm`);
 }} finally{await browser.close();}
 const result=spawnSync('ffmpeg',['-y','-i',`${out}/1440.webm`,'-i',`${out}/390.webm`,'-filter_complex','[0:v]crop=600:1000:420:0,setsar=1,fps=25[v0];[1:v]pad=600:1000:105:0:color=0xf2f5fa,setsar=1,fps=25[v1];[v0][v1]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',`${qa}/walkthrough.mp4`],{stdio:'ignore'});
 if(result.status!==0)throw new Error('FFmpeg failed');
 console.log('Recorded real desktop/mobile fixture viewer and gestures');
})().catch(error=>{console.error(error);process.exitCode=1;});
