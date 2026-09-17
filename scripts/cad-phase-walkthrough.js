// Public fixture only; no provider requests, private inputs, or live conversion.
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const out='/private/tmp/cad-phase-walkthrough';
const qa='docs/qa/cad-phase-progression';
const url=process.env.CAD_PHASE_URL||'http://127.0.0.1:5196/?cadPreview=mark-dispenser-v1';
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},recordVideo:{dir:out,size:{width,height:1000}}});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==new URL(url).origin||u.pathname.startsWith('/api/')||route.request().method()!=='GET')return route.abort();
   return route.continue();
  });
  const page=await context.newPage();await page.goto(url);
  await page.getByTestId('cad-phase-3').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-testid="cad-fixture-canvas"]')?.dataset.view==='isometric');
  const nav=page.getByTestId('reversr-tour-phase-nav');
  const phase=name=>nav.getByRole('button',{name:new RegExp(`^${name} phase,`)}).click();
  await page.waitForTimeout(2200);
  await phase('Input');await page.waitForTimeout(2200);
  await phase('Inventory');await page.waitForTimeout(2500);
  await page.getByRole('button',{name:'Review in Design',exact:true}).click();await page.waitForTimeout(1800);
  const host=page.getByTestId('cad-fixture-canvas-host');
  await host.evaluate(el=>el.scrollIntoView({block:'center'}));
  await host.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement){if(p.scrollHeight>p.clientHeight&&['auto','scroll'].includes(getComputedStyle(p).overflowY)){p.scrollTop+=100;break;}}});
  await page.waitForTimeout(1500);
  await page.getByRole('button',{name:'Expand orientation controls'}).click();
  await page.getByRole('button',{name:'Show front view'}).click();await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Show top view'}).click();await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Reset to fitted isometric view'}).click();await page.waitForTimeout(1500);
  await page.screenshot({path:`${qa}/${width}-viewer.png`});
  await page.getByTestId('cad-reference-comparison').evaluate(el=>el.scrollIntoView({block:'start'}));await page.waitForTimeout(2200);
  await phase('Build');await page.waitForTimeout(2800);
  await page.getByRole('button',{name:'Return to Design review',exact:true}).click();await page.waitForTimeout(1800);
  const video=page.video();await context.close();await video.saveAs(`${out}/${width}.webm`);
 }}finally{await browser.close();}
 const result=spawnSync('ffmpeg',['-y','-i',`${out}/1440.webm`,'-i',`${out}/390.webm`,'-filter_complex','[0:v]crop=600:1000:420:0,setsar=1,fps=25[v0];[1:v]pad=600:1000:105:0:color=0xf2f5fa,setsar=1,fps=25[v1];[v0][v1]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',`${qa}/walkthrough.mp4`],{stdio:'ignore'});
 if(result.status!==0)throw new Error('FFmpeg failed');
 console.log('Recorded desktop then mobile phase progression and viewer review');
})().catch(error=>{console.error(error);process.exitCode=1;});
