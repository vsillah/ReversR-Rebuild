const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const q=require('../utils/igesRenderQuality'),{p,mesh,scene,preset}=require('./fixtures/iges-shadow-scenes'),{loadImage}=require('../utils/igesVisualCalibration');
const s={method:'height-contact-v1',normal:[0,0,1],offset:0,meshUnits:'millimeter',sourceUnits:'millimeter',provenance:{kind:'declared-presentation-plane',orientation:'synthetic declared Z-up',offsetPolicy:'minimum-visible-geometry'},heightCutoff:1,softness:.15,geometryScale:3,opacity:.2,maxRadiusPixels:12};
const t=[[0,0,.1],[1,0,.1],[0,1,.1]],screen=p=>[40+p[0]*20,40+p[1]*20];
const run=(triangles=[t],settings=s,toScreen=screen)=>q.contactMask({triangles,settings,toScreen,width:120,height:120});
let checks=0;const check=fn=>{fn();checks++;};
check(()=>assert.deepEqual(run().mask,run([t,t]).mask));
check(()=>assert.deepEqual(run([t,t.map(p=>[p[0]+.3,p[1],p[2]])]).mask,run([t.map(p=>[p[0]+.3,p[1],p[2]]),t]).mask));
check(()=>assert(run().mask.some(x=>x>0)));
check(()=>assert(run([t.map(p=>[p[0],p[1],.7])]).mask.reduce((a,b)=>a+b,0)<run().mask.reduce((a,b)=>a+b,0)));
check(()=>assert(!run([t.map(p=>[p[0],p[1],2])]).mask.some(x=>x)));
check(()=>assert(!run([]).mask.some(x=>x)));
check(()=>assert(!run([[[0,0,0],[0,0,.2],[0,0,.4]]]).mask.some(x=>x)));
for(const bad of [{normal:[0,0,2]},{offset:NaN},{meshUnits:'unknown'},{sourceUnits:'unknown'},{provenance:{}},{heightCutoff:0},{softness:1},{offset:.2}])check(()=>assert.throws(()=>run([t],{...s,...bad})));
check(()=>assert.throws(()=>q.validateQuality({version:q.VERSION,shadow:{},contactShadow:s})));
check(()=>assert.throws(()=>run([[[NaN,0,0],[1,0,0],[0,1,0]]])));
check(()=>assert.throws(()=>run([t],{...s,offset:.2,geometryScale:1e100})));
check(()=>{const a=run(),b=run([t.map(p=>p.map(x=>x*200))],{...s,heightCutoff:200,softness:s.softness*200,geometryScale:600},p=>[40+p[0]*.1,40+p[1]*.1]);assert.equal(b.status,'rendered');for(let i=0;i<a.mask.length;i++)assert(Math.abs(a.mask[i]-b.mask[i])<1e-5);});
check(()=>{
 const toScreen=p=>[3.25+p[0]*20,40+p[1]*20];
 assert(run([t],s,toScreen).clippedSupportPixels>0,'bilinear support crosses viewport');
 // In-memory historical center-only mutant proves the new regression is
 // specific to reconstruction support, rather than already-clipped nodes.
 const file=require.resolve('../utils/igesRenderQuality'),source=fs.readFileSync(file,'utf8');
 const begin=source.indexOf('  // A positive node has bilinear support'),end=source.indexOf('  for(let y=0;y<height;y++)',begin);
 assert(begin>=0&&end>begin);
 const centerOnly='  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)if(grid[y*gw+x]>0){const pu=min[0]+x*step,pv=min[1]+y*step,sx=o[0]+ax*pu+bx*pv,sy=o[1]+ay*pu+by*pv;if(sx<0||sy<0||sx>=width||sy>=height)clippedSupportPixels++;}\n';
 const Module=require('module'),mutant=new Module(file,module);mutant.filename=file;mutant.paths=module.paths;mutant._compile(source.slice(0,begin)+centerOnly+source.slice(end),file);
 assert.equal(mutant.exports.contactMask({triangles:[t],settings:s,toScreen,width:120,height:120}).clippedSupportPixels,0,'all positive node centers stay inside');
});
check(()=>assert.throws(()=>run([t],{...s,softness:12/(20+Math.hypot(10,20))},p=>[40+p[0]*20+p[1]*10,40+p[1]*20])));
check(()=>{const scale=1000;const other=run([t.map(p=>p.map(x=>x/scale))],{...s,meshUnits:'meter',sourceUnits:'meter',heightCutoff:s.heightCutoff/scale,softness:s.softness/scale,geometryScale:s.geometryScale/scale},p=>screen(p.map(x=>x*scale)));for(let i=0;i<other.mask.length;i++)assert(Math.abs(other.mask[i]-run().mask[i])<1e-5);});
check(()=>{const rotate=p=>[p[2],p[0],p[1]];const other=run([t.map(rotate)],{...s,normal:rotate(s.normal)},p=>screen([p[1],p[2],p[0]]));const original=run();for(let i=0;i<other.mask.length;i++)assert(Math.abs(other.mask[i]-original.mask[i])<1e-5);});
check(()=>{const x=run();assert.equal(x.clippedSupportPixels,0);for(let y=0;y<120;y++)for(let a=0;a<120;a++)if(a<35||a>65||y<35||y>65)assert.equal(x.mask[y*120+a],0);});
check(()=>assert(run([t],s,p=>[p[0]*20-5,p[1]*20-5]).clippedSupportPixels>0));
if(process.argv.includes('--mask-only')){console.log(JSON.stringify({passed:true,maskChecks:checks,fullSceneCalls:0}));process.exit(0);}
s.softness=.02; // Remain below the explicit cap even when a hidden caster changes framing.
const root=fs.mkdtempSync(path.join(os.tmpdir(),'iges-contact-'));let count=0;
const render=(sourceScene,value)=>p.renderSceneToPng({scene:sourceScene,sourceBinding:{sourceAsset:{id:'synthetic-contact'},resolverType:'synthetic',renderPreset:value},outputDir:path.join(root,String(++count))});
const baseScene=()=>{const x=scene(mesh([-.8,-.5,0,.4,-.5,0,-.8,.4,0]));x.sceneManifest.unitConversion={sourceUnits:'millimeter',meshUnits:'millimeter'};x.importResult.meshes[0]=mesh([0,0,.1,2,0,.1,0,2,.1]);return x;};
for(const edges of ['topology','legacy']){
 const value={...preset,renderQuality:{...preset.renderQuality,edges}},before=render(baseScene(),value),after=render(baseScene(),{...value,renderQuality:{...value.renderQuality,contactShadow:s}}),a=loadImage(before.outputPath),b=loadImage(after.outputPath);
 assert.equal(after.geometryOnlyArtifact.sha256,before.sha256);assert(after.shadowEvidence.affectedBackgroundPixels>0);assert.deepEqual(after.visibleMeshPixelCounts,before.visibleMeshPixelCounts);
 for(let i=0;i<a.data.length;i+=4)if([0,1,2].some(k=>a.data[i+k]!==230))assert.deepEqual([...a.data.slice(i,i+4)],[...b.data.slice(i,i+4)]);
}
for(const style of [{visible:false},{opacity:.5},{mode:'wireframe'}]){
 const x=baseScene(),value={...preset,displayState:{nodeStyles:{caster:style,detail:{mode:'wireframe'}}},renderQuality:{...preset.renderQuality,contactShadow:s}};
 const result=render(x,value);assert.equal(result.shadowEvidence.affectedBackgroundPixels,0);
}
const ordinary=render(baseScene(),{...preset,renderQuality:{...preset.renderQuality,contactShadow:s}}),relit=render(baseScene(),{...preset,lightDirection:[-1,3,1],renderQuality:{...preset.renderQuality,contactShadow:s}});assert.deepEqual(ordinary.shadowEvidence,relit.shadowEvidence);
assert.throws(()=>render(baseScene(),{...preset,renderQuality:{...preset.renderQuality,contactShadow:{...s,sourceUnits:'inch'}}}),/units do not match/);
console.log(JSON.stringify({passed:true,maskChecks:checks,fullSceneCalls:count}));
