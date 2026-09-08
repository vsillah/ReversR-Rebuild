// Opt-in display-only helpers. Never mutate OCCT positions, indices or topology.
const VERSION = 'iges-quality-v1';
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const normalize = v => { const n = Math.hypot(...v); return n > 1e-12 && Number.isFinite(n) ? v.map(x => x/n) : [0,0,0]; };
const validateQuality = quality => {
  if (!quality) return;
  if (quality.version !== VERSION) throw new Error('Unsupported render quality version');
  if (quality.shading && !['occt-normals', 'flat'].includes(quality.shading)) throw new Error('Unsupported quality shading');
  if (quality.materialModel && quality.materialModel !== 'diffuse') throw new Error('Unsupported quality material model');
  if (quality.edges && !['topology', 'legacy'].includes(quality.edges)) throw new Error('Unsupported quality edges');
  if (quality.contactShadow) {
    if (quality.shadow) throw new Error('Contact and directional shadows are mutually exclusive');
    validateContact(quality.contactShadow);
  }
  if (quality.shadow) {
    const s = quality.shadow;
    if (!Array.isArray(s.normal) || s.normal.length !== 3 || !s.normal.every(Number.isFinite) || Math.hypot(...s.normal) < 1e-9 || !Number.isFinite(s.offset)) throw new Error('Shadow requires explicit finite source-space ground plane');
    if (!Number.isFinite(s.opacity) || s.opacity < 0 || s.opacity > 0.4 || !Number.isInteger(s.radiusPixels) || s.radiusPixels < 0 || s.radiusPixels > 24) throw new Error('Shadow opacity/radius outside bounded limits');
  }
};
const faceId = (mesh, triangleIndex) => (mesh.brep_faces || []).findIndex(face => triangleIndex >= face.first && triangleIndex <= face.last);
const shadingNormals = (mesh, triangleIndex, fallback) => {
  const normals = mesh.attributes?.normal?.array;
  const indices = mesh.index?.array;
  const result = [0,1,2].map(i => {
    const vertex = indices?.length ? indices[triangleIndex*3+i] : triangleIndex*3+i;
    const n = normals && [normals[vertex*3], normals[vertex*3+1], normals[vertex*3+2]];
    if (!n || !n.every(Number.isFinite) || Math.hypot(...n) < 1e-9) return fallback;
    const unit = normalize(n), alignment = dot(unit, fallback);
    // Reject ambiguous/near-tangent normals; preserve flat fallback instead of
    // smoothing across an unverified crease or changing mesh data.
    if (Math.abs(alignment) < 0.2) return fallback;
    return alignment < 0 ? unit.map(x => -x) : unit;
  });
  return result;
};
const diffuseColor = (normal, preset) => {
  const light = normalize(preset.lightDirection || [-0.35,-0.45,0.82]);
  const albedo = preset.material?.side || preset.foreground;
  const amount = 0.55 + 0.65 * Math.max(0, dot(normalize(normal), light));
  return [0,1,2].map(i => Math.round(Math.min(255, albedo[i]*amount))).concat(255);
};

// Depth changes across a single pixel on an adjacent triangle bound the small
// bias needed when a continuous edge is sampled onto integer raster pixels.
const depthSlope = triangle => {
  const [a,b,c] = triangle, dx1=b[0]-a[0], dy1=b[1]-a[1], dx2=c[0]-a[0], dy2=c[1]-a[1];
  const determinant=dx1*dy2-dx2*dy1;
  if (Math.abs(determinant)<1e-8) return 0;
  const z1=b[2]-a[2],z2=c[2]-a[2];
  return Math.hypot((z1*dy2-z2*dy1)/determinant,(dx1*z2-dx2*z1)/determinant);
};
const rasterLine = ({ pixels, width, height, start, end, color, zBuffer, tolerance = 0, lineWidth = 1, blend }) => {
  if (!Number.isFinite(lineWidth) || lineWidth <= 0 || lineWidth > 8) throw new Error('Quality line width must be in (0,8] pixels');
  const radius = lineWidth / 2 + 0.5, neighborhood = Math.ceil(radius);
  const dx=end[0]-start[0],dy=end[1]-start[1],length2=dx*dx+dy*dy;
  const steps=Math.max(1,Math.ceil(Math.sqrt(length2)*2)), seen=new Set();
  let covered=0;
  for(let k=0;k<=steps;k++) {
    const x=start[0]+dx*k/steps,y=start[1]+dy*k/steps;
    for(let oy=-neighborhood;oy<=neighborhood;oy++) for(let ox=-neighborhood;ox<=neighborhood;ox++) {
      const px=Math.floor(x)+ox,py=Math.floor(y)+oy;
      if(px<0||py<0||px>=width||py>=height) continue;
      const index=py*width+px;
      if(seen.has(index)) continue; seen.add(index);
      const t=length2 ? Math.max(0,Math.min(1,((px+0.5-start[0])*dx+(py+0.5-start[1])*dy)/length2)):0;
      const distance=Math.hypot(px+0.5-(start[0]+dx*t),py+0.5-(start[1]+dy*t));
      if(distance>=radius) continue;
      const depth=start[2]+(end[2]-start[2])*t;
      if(zBuffer && depth<zBuffer[index]-tolerance) continue;
      const alpha = Math.round(color[3]*Math.min(1,radius-distance));
      if (alpha <= 0) continue;
      blend(pixels,index*4,[...color.slice(0,3),alpha]); covered++;
    }
  }
  return covered;
};
const blurPass = (input, width, height, radius, horizontal) => {
  const out=new Float32Array(input.length), major=horizontal?height:width, minor=horizontal?width:height;
  const at=(m,n)=>horizontal?m*width+n:n*width+m;
  for(let m=0;m<major;m++) {
    let sum=0;
    for(let n=0;n<=radius&&n<minor;n++) sum+=input[at(m,n)];
    for(let n=0;n<minor;n++) {
      out[at(m,n)]=sum/(radius*2+1);
      if(n-radius>=0)sum-=input[at(m,n-radius)];
      if(n+radius+1<minor)sum+=input[at(m,n+radius+1)];
    }
  }
  return out;
};
const shadowMask = ({ triangles, toScreen, width, height, settings, lightDirection }) => {
  const normal=normalize(settings.normal), light=normalize(lightDirection), incidence=dot(normal,light);
  const mask=new Float32Array(width*height);
  if(incidence<=0.1) return { mask, status:'not_rendered_light_below_or_parallel_to_plane' };
  let outsideGround=0;
  for(const triangle of triangles) {
    const projected=triangle.map(point=>{
      const elevation=dot(normal,point)-settings.offset;
      if(elevation < -1e-5) outsideGround++;
      return toScreen(point.map((v,i)=>v-light[i]*elevation/incidence));
    });
    const [a,b,c]=projected, denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(denominator)<1e-8)continue;
    const minX=Math.max(0,Math.floor(Math.min(...projected.map(p=>p[0])))),maxX=Math.min(width-1,Math.ceil(Math.max(...projected.map(p=>p[0]))));
    const minY=Math.max(0,Math.floor(Math.min(...projected.map(p=>p[1])))),maxY=Math.min(height-1,Math.ceil(Math.max(...projected.map(p=>p[1]))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
      const u=((b[1]-c[1])*(x+0.5-c[0])+(c[0]-b[0])*(y+0.5-c[1]))/denominator;
      const v=((c[1]-a[1])*(x+0.5-c[0])+(a[0]-c[0])*(y+0.5-c[1]))/denominator;
      if(u>=0&&v>=0&&u+v<=1)mask[y*width+x]=1;
    }
  }
  if(outsideGround)throw new Error('Shadow ground plane intersects visible source geometry');
  let blurred=mask;
  for(let pass=0;pass<3;pass++)for(const horizontal of [true,false])blurred=blurPass(blurred,width,height,settings.radiusPixels,horizontal);
  return { mask:blurred,status:mask.some(v=>v>0)?'rendered':'not_rendered_edge_on_ground',method:'directional triangle projection plus three separable box-blur passes' };
};
// Inverse of an orthonormal model rotation: columns are transformed source axes.
const sourceLight = (displayLight, transformedSourceAxes) => transformedSourceAxes.map(axis => dot(axis, displayLight));
const validateContact = s => {
  if (s.method !== 'height-contact-v1' || !Array.isArray(s.normal) || s.normal.length !== 3 || !s.normal.every(Number.isFinite) || Math.abs(Math.hypot(...s.normal)-1)>1e-8 || !Number.isFinite(s.offset)) throw new Error('Contact requires an explicit unit-normal plane');
  if (!['millimeter','meter','inch'].includes(s.meshUnits) || !['millimeter','meter','inch'].includes(s.sourceUnits) || s.provenance?.kind !== 'declared-presentation-plane' || typeof s.provenance.orientation !== 'string' || !s.provenance.orientation.trim() || s.provenance.offsetPolicy !== 'minimum-visible-geometry') throw new Error('Contact requires units and presentation-plane provenance');
  if (![s.heightCutoff,s.softness,s.geometryScale].every(v=>Number.isFinite(v)&&v>0) || !Number.isFinite(s.opacity) || s.opacity<0 || s.opacity>.4 || s.maxRadiusPixels!==12) throw new Error('Invalid bounded contact parameters');
};
// Finite plane-space height cue. This is deliberately independent of lighting.
const contactMask = ({triangles, validationTriangles=triangles, toScreen, width, height, settings:s}) => {
  validateContact(s);
  if (![width,height].every(x=>Number.isInteger(x)&&x>0&&x<=4096)||width*height>4000000) throw new Error('Contact image exceeds bounded allocation');
  const mask=new Float32Array(width*height), n=s.normal;
  const axis=[0,1,2].sort((a,b)=>Math.abs(n[a])-Math.abs(n[b]))[0];
  const seed=[0,0,0];seed[axis]=1;
  const u=normalize(cross(n,seed)),v=cross(n,u),origin=n.map(x=>x*s.offset);
  const o=toScreen(origin),a=toScreen(origin.map((x,i)=>x+u[i])),b=toScreen(origin.map((x,i)=>x+v[i]));
  const ax=a[0]-o[0],ay=a[1]-o[1],bx=b[0]-o[0],by=b[1]-o[1],det=ax*by-ay*bx;
  const pixelScale=Math.hypot(ax,ay)+Math.hypot(bx,by);
  if(s.softness*pixelScale>s.maxRadiusPixels+1e-8) throw new Error('Contact softness exceeds explicit screen-radius cap');
  const boundsMin=[Infinity,Infinity,Infinity],boundsMax=[-Infinity,-Infinity,-Infinity];
  for(const triangle of validationTriangles)for(const point of triangle){
    if(point.length!==3||!point.every(Number.isFinite))throw new Error('Contact geometry is nonfinite');
    const coordinates=[dot(u,point),dot(v,point),dot(n,point)];
    for(let k=0;k<3;k++){boundsMin[k]=Math.min(boundsMin[k],coordinates[k]);boundsMax[k]=Math.max(boundsMax[k],coordinates[k]);}
  }
  const actualScale=validationTriangles.length?Math.max(...boundsMax.map((x,k)=>x-boundsMin[k])):s.geometryScale;
  // Caller metadata cannot enlarge the intersection tolerance.
  const tolerance=Math.max(actualScale,Number.EPSILON)*1e-8;
  for(const t of validationTriangles)for(const p of t)if(p.length!==3||!p.every(Number.isFinite)||dot(n,p)-s.offset < -tolerance)throw new Error('Contact plane intersects geometry or geometry is nonfinite');
  if(Math.abs(det)<1e-10)return {mask,status:'not_rendered_edge_on_plane',method:s.method,lightIndependent:true,clippedSupportPixels:0};
  const polygons=[];
  const clip=(poly,limit,keepBelow)=>{
    const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],inside=p[2]<=limit,other=q[2]<=limit;
      if(inside===keepBelow)out.push(p);
      if(inside!==other){const t=(limit-p[2])/(q[2]-p[2]);out.push(p.map((x,k)=>x+t*(q[k]-x)));}
    }return out;
  };
  for(const t of triangles){let poly=t.map(p=>[dot(u,p),dot(v,p),Math.max(0,dot(n,p)-s.offset)]);poly=clip(poly,s.heightCutoff,true);if(poly.length>=3)polygons.push(poly);}
  if(!polygons.length)return {mask,status:'not_rendered_no_near_casters',method:s.method,lightIndependent:true,clippedSupportPixels:0};
  // At most one screen pixel per plane-grid cell; softness rounded DOWN to
  // preserve finite support. Small radii resolve with at least three cells.
  const step=Math.min(1/Math.max(pixelScale,1e-9),s.softness/3),radius=Math.floor(s.softness/step+1e-9);
  if((radius+1)*step*pixelScale>s.maxRadiusPixels+1e-8)throw new Error('Contact reconstruction support exceeds screen-radius cap');
  const min=[Infinity,Infinity],max=[-Infinity,-Infinity];
  for(const poly of polygons)for(const point of poly)for(let k=0;k<2;k++){min[k]=Math.min(min[k],point[k]);max[k]=Math.max(max[k],point[k]);}
  for(let k=0;k<2;k++){min[k]-=(radius+2)*step;max[k]+=(radius+2)*step;}
  const gw=Math.ceil((max[0]-min[0])/step)+1,gh=Math.ceil((max[1]-min[1])/step)+1;
  if(gw>4096||gh>4096||gw*gh>4000000)throw new Error('Contact plane grid exceeds bounded allocation');
  let grid=new Float32Array(gw*gh);
  for(const poly of polygons)for(let i=1;i<poly.length-1;i++){
    const [a,b,c]=[poly[0],poly[i],poly[i+1]].map(p=>[(p[0]-min[0])/step,(p[1]-min[1])/step,p[2]]),d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-10)continue;
    for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])));y<=Math.min(gh-1,Math.ceil(Math.max(a[1],b[1],c[1])));y++)for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])));x<=Math.min(gw-1,Math.ceil(Math.max(a[0],b[0],c[0])));x++){
      const f=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,g=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
      if(f>=-1e-9&&g>=-1e-9&&f+g<=1+1e-9){const h=Math.max(0,f*a[2]+g*b[2]+(1-f-g)*c[2]),weight=Math.max(0,1-h/s.heightCutoff)**2;grid[y*gw+x]=Math.max(grid[y*gw+x],weight);}
    }
  }
  grid=blurPass(blurPass(grid,gw,gh,radius,true),gw,gh,radius,false);
  let clippedSupportPixels=0;
  // A positive node has bilinear support in the adjacent cell on each side.
  // Check every support corner, not just the node's projected center.
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)if(grid[y*gw+x]>0){
    let clipped=false;
    for(const dx of [-1,1])for(const dy of [-1,1]){
      const pu=min[0]+(x+dx)*step,pv=min[1]+(y+dy)*step;
      const sx=o[0]+ax*pu+bx*pv,sy=o[1]+ay*pu+by*pv;
      if(sx<0||sy<0||sx>width||sy>height)clipped=true;
    }
    if(clipped)clippedSupportPixels++;
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=x+.5-o[0],dy=y+.5-o[1],pu=(dx*by-dy*bx)/det,pv=(ax*dy-ay*dx)/det,gx=(pu-min[0])/step,gy=(pv-min[1])/step,ix=Math.floor(gx),iy=Math.floor(gy);
    if(ix<0||iy<0||ix+1>=gw||iy+1>=gh)continue;const fx=gx-ix,fy=gy-iy;mask[y*width+x]=(1-fy)*((1-fx)*grid[iy*gw+ix]+fx*grid[iy*gw+ix+1])+fy*((1-fx)*grid[(iy+1)*gw+ix]+fx*grid[(iy+1)*gw+ix+1]);
  }
  return {mask,status:mask.some(x=>x>0)?'rendered':'not_rendered_degenerate_footprint',method:s.method,lightIndependent:true,clippedSupportPixels,planeGrid:{width:gw,height:gh,step,radius,effectiveSoftness:radius*step,samplingSupportAllowance:2*step},heightFalloff:'max(0,1-height/cutoff)^2; maximum overlap',softnessKernel:'one horizontal and one vertical finite box pass in plane coordinates'};
};
module.exports={ sourceLight, VERSION,validateQuality,faceId,shadingNormals,diffuseColor,depthSlope,rasterLine,shadowMask,blurPass,validateContact,contactMask };
