'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),{EventEmitter}=require('node:events'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
// Generated in memory solely for synthetic tests. Never written or printed.
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),use:'sig',alg:'RS256',kid:'synthetic-1'};
const policy={issuer:'https://accounts.google.com',audience:'https://synthetic.example',subject:'123456789012345678901',serviceAccountEmail:'synthetic@test-project.iam.gserviceaccount.com'};
const claims={iss:policy.issuer,aud:policy.audience,sub:policy.subject,iat:100,exp:200,azp:policy.subject,email:policy.serviceAccountEmail,email_verified:true};
const clock=()=>({lowerMs:110000,upperMs:110001,monotonicMs:100});
const keys=()=>({jwksJson:JSON.stringify({keys:[jwk]}),observedAtMs:109000,expiresAtMs:150000});
function token(c=claims,h={alg:'RS256',typ:'JWT',kid:jwk.kid},padding=crypto.constants.RSA_PKCS1_PADDING) {
  const encode=v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');
  const input=encode(h)+'.'+encode(c);
  return input+'.'+crypto.sign('RSA-SHA256',Buffer.from(input),{key:pair.privateKey,padding,saltLength:32}).toString('base64url');
}
function load(options={}) {
  const cache=new Map(),state={calls:0,timers:new Map(),now:0,request:null,response:null,requestOptions:null};
  function request(opts,callback) {
    state.calls++;state.requestOptions=opts;
    const req=new EventEmitter();req.destroy=()=>{req.destroyed=true;};req.setTimeout=(_n,fn)=>{req.timeout=fn;};
    req.end=()=>{if(options.throwEnd)throw Error('PRIVATE_SENTINEL');options.onEnd?.(callback,req,state);};
    state.request=req;return req;
  }
  function module(name) {
    if(cache.has(name))return cache.get(name);
    assert.ok(['googleIdentityFormat','googleIdentityVerifier','googleJwksTransport'].includes(name));
    const source=fs.readFileSync(path.join(root,`offline/cad-gcp/${name}.ts`),'utf8');
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};cache.set(name,exports);
    const requireFixed=id=>{
      if(id==='node:https')return {request};
      if(id==='node:perf_hooks')return {performance:{now:()=>state.now}};
      if(id==='node:crypto')return crypto;
      if(id==='./googleIdentityFormat')return module('googleIdentityFormat');
      throw Error('IMPORT_BLOCKED');
    };
    const expose=name==='googleJwksTransport'?'exports.testOnlyRequestPublicKeys=requestPublicKeys;':'';
    vm.runInThisContext(`(function(exports,require,setTimeout,clearTimeout){${js}\n${expose}\n})`)(exports,requireFixed,
      (fn,ms)=>{assert.equal(ms,5000);const id=Symbol();state.timers.set(id,fn);return id;},id=>state.timers.delete(id));
    return exports;
  }
  return {verify:module('googleIdentityVerifier'),transport:module('googleJwksTransport'),format:module('googleIdentityFormat'),state};
}
function closed(r) {
  for(const key of ['googleProvenanceVerified','hostQualified','bodyAdmissionAuthorized','liveReady'])assert.equal(r[key],false);
  assert.ok(Object.isFrozen(r));assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);
}
async function check(t=token(),p=policy,k=keys,readClock=clock) {
  const api=load().verify;return api.verifySignatureAgainstSuppliedTestKeys(t,p,async()=>k(),readClock);
}
async function denied(...args) {const r=await check(...args);closed(r);assert.equal(r.signatureCheckedAgainstSuppliedTestKeys,false);}
test('real RSA signature math succeeds only as supplied-test-key evidence',async()=>{
  const r=await check();closed(r);assert.equal(r.signatureCheckedAgainstSuppliedTestKeys,true);
  assert.deepEqual(Object.keys(r).sort(),['bodyAdmissionAuthorized','code','googleProvenanceVerified','hostQualified','liveReady','providerPathEnabled','signatureCheckedAgainstSuppliedTestKeys'].sort());
  assert.throws(()=>{r.hostQualified=true;},TypeError);
});
test('missing/hostile policy is rejected before any callback or IO',async()=>{
  const api=load();let calls=0;
  const revoked=Proxy.revocable({},{});revoked.revoke();
  for(const p of [null,{},revoked.proxy,new Proxy({}, {ownKeys(){throw Error('PRIVATE_SENTINEL');}}),
    Object.defineProperty({...policy},'audience',{get(){calls++;throw Error('PRIVATE_SENTINEL');},enumerable:true})]) {
    const r=await api.verify.verifySignatureAgainstSuppliedTestKeys(token(),p,async()=>{calls++;},()=>{calls++;});closed(r);assert.equal(r.signatureCheckedAgainstSuppliedTestKeys,false);
  }
  assert.equal(calls,0);assert.equal(api.state.calls,0);
});
test('compact token, canonical base64url, duplicate JSON names, UTF8 and depth are bounded',async()=>{
  const valid=token(),parts=valid.split('.');
  for(const t of ['',valid+'.x','x'.repeat(12289),parts[0]+'=.'+parts[1]+'.'+parts[2],
    Buffer.from([0xff]).toString('base64url')+'.'+parts[1]+'.'+parts[2],
    token('{"iss":"x","iss":"https://accounts.google.com"}'),token('{"iss":"x","i\\u0073s":"y"}'),
    token({extra:[[[[[[[[]]]]]]]]}),token('1e999'),token('null')])await denied(t);
});
test('RS256 PKCS1 only; tampered signature, PSS and claim mutation deny',async()=>{
  const t=token(),parts=t.split('.'),sig=Buffer.from(parts[2],'base64url');sig[0]^=1;
  await denied(parts[0]+'.'+parts[1]+'.'+sig.toString('base64url'));
  await denied(token(claims,undefined,crypto.constants.RSA_PKCS1_PSS_PADDING));
  await denied(parts[0]+'.'+Buffer.from(JSON.stringify({...claims,exp:201})).toString('base64url')+'.'+parts[2]);
  for(const alg of ['none','HS256','RS512','PS256'])await denied(token(claims,{alg,typ:'JWT',kid:jwk.kid}));
});
test('headers cannot supply key URLs, embedded keys, critical directives or ambiguous kid',async()=>{
  for(const [field,value] of [['jku','https://private.example'],['x5u','https://private.example'],['jwk',jwk],['crit',[]],['kid',''],['kid','x'.repeat(129)],['typ','at+jwt']])
    await denied(token(claims,{alg:'RS256',typ:'JWT',kid:jwk.kid,[field]:value}));
});
test('issuer audience numeric subject azp email and time match exactly',async()=>{
  for(const change of [{iss:'accounts.google.com'},{aud:[policy.audience]},{aud:'other'},{sub:'0123'},{sub:123},{azp:'other'},
    {email:'other@test-project.iam.gserviceaccount.com'},{email_verified:false},{iat:111},{iat:100.1},{exp:110},{exp:4000},{nbf:111},{nbf:99},{exp:'200'},{hd:'example'}])await denied(token({...claims,...change}));
  const c={...claims};delete c.email;delete c.email_verified;
  const r=await check(token(c),{...policy,serviceAccountEmail:null});assert.equal(r.signatureCheckedAgainstSuppliedTestKeys,true);
});
test('key sets reject duplicate missing rotated conflicting private weak and wrong-use keys',async()=>{
  for(const list of [[jwk,jwk],[{...jwk,kid:'rotated'}],[{...jwk,use:'enc'}],[{...jwk,alg:'HS256'}],
    [{...jwk,kty:'EC'}],[{...jwk,d:'PRIVATE_SENTINEL'}],[{...jwk,e:'Aw'}],[{...jwk,n:'AQAB'}],
    Array.from({length:9},(_,i)=>({...jwk,kid:String(i)})),[]])await denied(token(),policy,()=>({...keys(),jwksJson:JSON.stringify({keys:list})}));
  await denied(token(),policy,()=>({...keys(),jwksJson:'{"keys":[],"keys":[]}'}));
});
test('stale keys and uncertain/reversed clocks deny before and after awaited key fetch',async()=>{
  for(const k of [{...keys(),observedAtMs:110002},{...keys(),expiresAtMs:110001},{...keys(),expiresAtMs:200000}])await denied(token(),policy,()=>k);
  for(const c of [{lowerMs:110000,upperMs:111001,monotonicMs:100},{lowerMs:110002,upperMs:110001,monotonicMs:100}])await denied(token(),policy,keys,()=>c);
  for(const after of [{lowerMs:200000,upperMs:200001,monotonicMs:90100},{lowerMs:110000,upperMs:110001,monotonicMs:99},
    {lowerMs:110010,upperMs:110011,monotonicMs:100}]){let count=0;await denied(token(),policy,keys,()=>count++?after:clock());}
  await denied(token(),policy,()=>{throw Error('PRIVATE_SENTINEL');});
});
test('policy is captured before awaited key fetch; callbacks never confer actual provenance',async()=>{
  const api=load(),p={...policy};let complete;
  const promise=api.verify.verifySignatureAgainstSuppliedTestKeys(token(),p,()=>new Promise(r=>complete=r),clock);
  p.subject='999';complete(keys());const r=await promise;closed(r);assert.equal(r.signatureCheckedAgainstSuppliedTestKeys,true);
  const hostile=new Proxy({}, {get(){throw Error('PRIVATE_SENTINEL');}});
  closed(api.verify.verifyGoogleServiceIdentity(hostile,()=>{throw Error('PRIVATE_SENTINEL');},true));
  closed(await api.transport.fetchGooglePublicJwks(hostile,true));assert.equal(api.state.calls,0);
  api.verify.decision=()=>({hostQualified:true});api.transport.failure=()=>({hostQualified:true});
  closed(api.verify.verifyGoogleServiceIdentity());closed(await api.transport.fetchGooglePublicJwks());
});
function response(callback,state,opts={}) {
  const res=new EventEmitter();state.response=res;res.destroy=()=>{res.destroyed=true;};res.statusCode=opts.status||200;res.complete=opts.complete!==false;
  const body=Buffer.from(opts.body===undefined?keys().jwksJson:opts.body);
  res.rawHeaders=opts.headers||['Content-Type','application/json','Cache-Control','public, max-age=3600','Content-Length',String(body.length)];
  callback(res);return {res,body};
}
test('lazy transport has fixed endpoint TLS/header bounds and no credentials/redirect/retry hooks',async()=>{
  const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state);res.emit('data',body);res.emit('end');}});
  assert.equal(api.state.calls,0);const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,true);
  const o=api.state.requestOptions;assert.equal(o.hostname,'www.googleapis.com');assert.equal(o.path,'/oauth2/v3/certs');
  assert.equal(o.rejectUnauthorized,true);assert.equal(o.agent,false);assert.equal(o.maxHeaderSize,8192);
  assert.deepEqual(o.headers,{accept:'application/json','accept-encoding':'identity'});assert.equal(o.auth,undefined);
  assert.equal(api.state.calls,1);assert.equal(api.state.timers.size,0);
});
test('post-load helper export replacement cannot rewrite signed claims or transport bounds',async()=>{
  const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state,{body:'{"keys":[]}'});res.emit('data',body);res.emit('end');}});
  const verifier=api.verify.verifySignatureAgainstSuppliedTestKeys,transport=api.transport.testOnlyRequestPublicKeys;
  let substitutions=0;const originalParse=api.format.parseUniqueJson;
  api.format.parseUniqueJson=(...args)=>{substitutions++;const value=originalParse(...args);if(value && Object.hasOwn(value,'sub'))value.sub=policy.subject;return value;};
  for(const name of ['exactRecord','plainRecord'])api.format[name]=()=>{substitutions++;return true;};
  api.format.base64url=()=>{substitutions++;return Buffer.from('replacement');};
  api.format.keySet=()=>{substitutions++;return [jwk];};
  const wrong=await verifier(token({...claims,sub:'999'}),policy,async()=>keys(),clock);closed(wrong);assert.equal(wrong.signatureCheckedAgainstSuppliedTestKeys,false);
  const valid=await verifier(token(),policy,async()=>keys(),clock);closed(valid);assert.equal(valid.signatureCheckedAgainstSuppliedTestKeys,true);
  const oversized=await verifier('x'.repeat(12289),policy,async()=>keys(),clock);assert.equal(oversized.signatureCheckedAgainstSuppliedTestKeys,false);
  const malformed=await transport();closed(malformed);assert.equal(malformed.ok,false);
  closed(api.verify.verifyGoogleServiceIdentity(true));closed(await api.transport.fetchGooglePublicJwks(true));
  assert.equal(substitutions,0);
  const large=load({onEnd(cb,req,state){const {res,body}=response(cb,state,{body:'x'.repeat(32769),headers:['Content-Type','application/json','Cache-Control','max-age=60']});res.emit('data',body);res.emit('end');}});
  const fixedTransport=large.transport.testOnlyRequestPublicKeys;large.format.keySet=()=>[jwk];
  assert.equal((await fixedTransport()).ok,false);
});
test('cache directive names normalize before duplicate/prohibition checks',async()=>{
  for(const cache of ['max-age=60, MAX-AGE=0','max-age=60, No-Store','max-age=60, NO-CACHE',
    'max-age=60, No-Cache = "field"','max-age=60, NO-STORE = yes','max-age=60, Max-Age = 60',
    'max-age="60"','max-age=60,,public']) {
    const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state,{headers:['Content-Type','application/json','Cache-Control',cache]});res.emit('data',body);res.emit('end');}});
    const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,false,cache);
  }
  const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state,{headers:['Content-Type','application/json','Cache-Control','Public, Max-Age = 60']});res.emit('data',body);res.emit('end');}});
  const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,true);assert.equal(r.maxAgeMs,60000);
});
test('transport status redirect encoding cache age duplicate headers and declared size fail sanitized',async()=>{
  const cases=[{status:302},{status:401},{status:500},{headers:['Content-Type','application/json','Content-Length','32769']},
    {headers:['Content-Type','application/json','Content-Encoding','gzip']},{headers:['Content-Type','text/html']},
    {headers:['Content-Type','application/json','Cache-Control','max-age=1','Age','2']},
    {headers:['Content-Type','application/json','Cache-Control','max-age=30, max-age=60']},
    {headers:['Content-Type','application/json','Cache-Control','max-age=30','Content-Type','application/json']},
    {headers:['Content-Type','application/json','X-Large','x'.repeat(8192)]}];
  for(const opts of cases){const api=load({onEnd(cb,req,state){response(cb,state,opts);}});const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,false);assert.equal(api.state.calls,1);assert.ok(api.state.request.destroyed);}
});
test('transport streamed overflow invalid UTF8 malformed keys and incomplete body fail',async()=>{
  for(const opts of [{body:'x'.repeat(32769),headers:['Content-Type','application/json','Cache-Control','max-age=60']},
    {body:Buffer.from([0xff])},{body:'{"keys":[]}'},{complete:false},{headers:['Content-Type','application/json','Cache-Control','max-age=60','Content-Length','1']}]) {
    const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state,opts);res.emit('data',body);res.emit('end');}});
    const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,false);
  }
});
test('absolute deadline covers stalled headers/body; TLS errors aborts and close are sanitized',async()=>{
  for(const mode of ['headers','body','tls','aborted','close','request-timeout','throw']) {
    const api=load({throwEnd:mode==='throw',onEnd(cb,req,state){
      if(mode==='tls'){req.emit('error',Error('PRIVATE_SENTINEL'));return;}
      if(mode==='request-timeout'){req.timeout();return;}
      if(mode==='headers')return;
      const {res}=response(cb,state);if(['aborted','close'].includes(mode))res.emit(mode);
    }});
    const pending=api.transport.testOnlyRequestPublicKeys();
    for(const timeout of api.state.timers.values())timeout();
    const r=await pending;closed(r);assert.equal(r.ok,false);assert.equal(api.state.timers.size,0);
  }
  const api=load(),controller=new AbortController();controller.abort();closed(await api.transport.testOnlyRequestPublicKeys(controller.signal));assert.equal(api.state.calls,0);
  const other=load(),c=new AbortController(),pending=other.transport.testOnlyRequestPublicKeys(c.signal);c.abort();closed(await pending);assert.ok(other.state.request.destroyed);
});
test('elapsed deadline and freshness are rechecked on body completion',async()=>{
  const api=load({onEnd(cb,req,state){const {res,body}=response(cb,state);res.emit('data',body);state.now=5000;res.emit('end');}});
  const r=await api.transport.testOnlyRequestPublicKeys();closed(r);assert.equal(r.ok,false);
});
