'use strict';
// Ephemeral test keys only. Child-process input travels over a local pipe, never logs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),DOMAIN='reversr-synthetic-sqlite-v1';
const ref=n=>n.toString(16).padStart(32,'0');
function canonical(v){return v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
const hash=v=>crypto.createHash('sha256').update(canonical(v)).digest('hex');
function sign(payload,key){return {payload,signature:crypto.sign(null,Buffer.from(canonical(payload)),key).toString('hex')};}
function load(options={}){
  const kernel={},api={};
  function evaluate(file,exports,requireLocal){let js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    if(file.endsWith('sqlite.ts')){
      if(options.fault){if(!['initialize-before-commit','attempt-after-commit','command-before-commit','command-after-commit','read-after-commit'].includes(options.fault))throw Error('BAD_TEST_PHASE');
        js=js.replace('function testPhase(_name) { }',`function testPhase(_name) { if(_name===${JSON.stringify(options.fault)}) { ${options.clockJump?'Date.jump();':options.crash?'process.exit(88);':'throw Error("TEST_LOST_RESPONSE");'} } }`);}
    }
    vm.runInThisContext(`(function(exports,require,Date){${js}\n})`)(exports,requireLocal,{now:()=>options.now??Date.now(),jump:()=>{options.now+=options.clockJump;}});
  }
  evaluate('offline/cad-pilot/control.ts',kernel,n=>{if(n!=='node:crypto')throw Error('UNEXPECTED_IMPORT');return require(n);});
  evaluate('offline/cad-pilot-local/sqlite.ts',api,n=>{
    if(n==='../cad-pilot/control')return kernel;
    if(!['node:sqlite','node:crypto','node:fs','node:os','node:path'].includes(n))throw Error('UNEXPECTED_IMPORT');return require(n);
  });return {api,kernel};
}
function fixture(t){const options={now:Date.now()},loaded=load(options),keys={},pub={};
  for(const role of ['writer','reader','recovery','custodian']){const k=crypto.generateKeyPairSync('ed25519');keys[role]=k.privateKey.export({format:'pem',type:'pkcs8'});pub[role]=k.publicKey.export({format:'der',type:'spki'}).toString('hex');}
  const p={scope:'synthetic-only',operatorModel:'sole-operator-unqualified',pilotRef:ref(1),epochRef:ref(2),bindingRef:ref(3),originDigest:'4'.repeat(64),
    startMs:options.now-1000,endMs:options.now-1000+30*86400000,roster:[10,11,12,13,14].map(ref),runRef:ref(5),runStartMs:options.now-1000,runEndMs:options.now+3599000,planRef:ref(6),deploymentRef:ref(7)};
  const cfg={domain:DOMAIN,sessionRef:crypto.randomBytes(16).toString('hex'),policy:p,keys:pub},configText=JSON.stringify(cfg);
  const created=loaded.api.initializeSyntheticStore(configText,keys.custodian);if(!created.locator)throw Error('CREATE_FAILED');
  const dir=path.join(fs.realpathSync(os.tmpdir()),'reversr-synthetic-custody-'+created.locator);
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let id=100,generation=0,checkpoint=loaded.kernel.snapshotForSyntheticHistory(p,[]).state;
  function query(commandRef=ref(++id),participant=p.roster[0],reservation=checkpoint.reservations[0]?.reservationDigest||null,purpose='observe'){
    const q={domain:DOMAIN,role:'reader',purpose,sessionRef:cfg.sessionRef,policyDigest:hash(p),nonce:ref(++id),generation,headDigest:checkpoint.headDigest,
      issuedMs:options.now,expiresMs:options.now+5000,commandRef,participantRef:participant,reservationDigest:reservation};return sign(q,keys.reader);}
  function read(q=query()){const r=loaded.api.readSyntheticStore(created.locator,configText,JSON.stringify(q),keys.custodian);
    if(r.receipt){generation=r.receipt.payload.state.generation;checkpoint=r.receipt.payload.state.checkpoint;}return r;}
  function command(kind='reserve',participant=p.roster[0],scenario=ref(20)){
    options.now=Math.max(options.now+1000,checkpoint.timeHighWaterMs+1);
    const q=query(ref(++id),participant,kind==='reserve'?null:checkpoint.reservations[0]?.reservationDigest||null,kind),r=read(q);
    if(!r.receipt)throw Error('READ_FAILED');
    const cmd={kind,commandRef:q.payload.commandRef,pilotRef:p.pilotRef,epochRef:p.epochRef,bindingRef:p.bindingRef,runRef:p.runRef,
      participantRef:participant,scenarioRef:scenario,policyDigest:checkpoint.policyDigest,expectedSequence:checkpoint.sequence,expectedHeadDigest:checkpoint.headDigest,
      reservationDigest:q.payload.reservationDigest,outcome:kind==='ack'?'success':'none',accountingStatus:'known',
      usage:kind==='reserve'?{requests:128,operations:768,payloadBytes:8388608,costMicros:0}:{requests:1,operations:checkpoint.sequence+3,payloadBytes:16384,costMicros:0},
      clock:{lowerMs:options.now,upperMs:options.now+500,elapsedMs:options.now-p.startMs},concurrentCallers:2};
    const role=['unknown','close','revoke'].includes(kind)?'recovery':'writer';
    return sign({domain:DOMAIN,role,sessionRef:cfg.sessionRef,nonce:ref(++id),readback:structuredClone(r.receipt),command:cmd},keys[role]);
  }
  function apply(envelope,api=loaded.api){const r=api.applySyntheticCommand(created.locator,configText,JSON.stringify(envelope),keys.custodian);
    if(r.checkpoint){generation=r.generation;checkpoint=r.checkpoint;}return r;}
  function raw(){const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(path.join(dir,'state.sqlite'));
    const row=JSON.parse(db.prepare('SELECT envelope FROM custody').get().envelope);db.close();return row;}
  function sync(){const s=raw().payload;generation=s.generation;checkpoint=s.checkpoint;return s;}
  return {...loaded,options,keys,cfg,configText,created,dir,query,read,command,apply,raw,sync,get checkpoint(){return checkpoint;},get generation(){return generation;}};
}
module.exports={load,fixture,sign,hash,canonical,ref,DOMAIN};
if(require.main===module){let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
  const x=JSON.parse(input),{api}=load(x.options||{});let r;
  if(x.action==='apply')r=api.applySyntheticCommand(x.locator,x.configText,JSON.stringify(x.envelope),x.key);
  else if(x.action==='read')r=api.readSyntheticStore(x.locator,x.configText,JSON.stringify(x.envelope),x.key);
  else throw Error('BAD_TEST_ACTION');process.stdout.write(JSON.stringify(r));
});}
