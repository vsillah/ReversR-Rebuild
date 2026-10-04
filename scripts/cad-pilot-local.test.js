'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const {fixture,load,sign,ref,hash,DOMAIN}=require('./helpers/cad-pilot-local-fixture');
const worker=path.join(__dirname,'helpers/cad-pilot-local-fixture.js');
function closed(r){for(const k of ['independentProvenance','hostQualified','bodyAdmissionAuthorized','liveReady','effectDispatchAllowed','spendingAuthorized','riskAccepted','admissionExceptionAuthorized','providerCostCapEnforced'])assert.equal(r[k],false,k);
  assert.equal(r.providerCalls,0);assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);}
function denied(r){closed(r);assert.equal(r.code,'SYNTHETIC_LOCAL_DENIED');assert.equal(r.quarantinePersisted,false);}
function committed(r){closed(r);assert.equal(r.code,'SYNTHETIC_COMMAND_COMMITTED');}
function input(f,envelope,options={},action='apply'){return {action,locator:f.created.locator,configText:f.configText,envelope,key:f.keys.custodian,options:{now:f.options.now,...options}};}
function child(x){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[worker],{stdio:['pipe','pipe','pipe']});let output='',error='';p.stdout.on('data',c=>output+=c);p.stderr.on('data',c=>error+=c);p.on('error',reject);p.on('close',code=>resolve({code,output,error}));p.stdin.end(JSON.stringify(x));});}
test('atomic reservation persists complete signed state and one marker; acknowledgement never refunds or reopens run',t=>{
  const f=fixture(t),before=f.raw().payload;assert.deepEqual(before.ioEncumbered,{requests:128,operations:768,payloadBytes:8388608,costMicros:0});
  const r=f.apply(f.command());committed(r);assert.equal(r.quarantinePersisted,true);assert.equal(r.prospectiveMarkerCount,1);
  let s=f.raw().payload;assert.equal(s.checkpoint.runSpent,true);assert.equal(s.receipts.length,1);assert.equal(s.history.length,1);assert.equal(s.marker.count,1);
  assert.equal(s.checkpoint.runUsage.payloadBytes,8388608);assert.equal(s.policy.originDigest,s.originDigest);
  committed(f.apply(f.command('ack')));s=f.raw().payload;assert.equal(s.checkpoint.pending,null);assert.equal(s.checkpoint.runSpent,true);
  assert.throws(()=>f.command('reserve',f.cfg.policy.roster[1],ref(99)),/READ_FAILED/);assert.equal(f.raw().payload.marker.count,1);
});
test('separate process restart reconstructs exact signed state; same command cannot dispatch twice',async t=>{
  const f=fixture(t),e=f.command(),r=await child(input(f,e));assert.equal(r.code,0);committed(JSON.parse(r.output));f.sync();
  const restart=await child(input(f,f.query(),{},'read'));assert.equal(restart.code,0);const receipt=JSON.parse(restart.output).receipt;
  assert.equal(receipt.payload.state.marker.count,1);assert.equal(receipt.payload.state.checkpoint.runSpent,true);
  const retry=await child(input(f,e));denied(JSON.parse(retry.output));assert.equal(f.raw().payload.marker.count,1);
});
test('two processes contending on the same snapshot produce exactly one committed winner',async t=>{
  const f=fixture(t),a=f.command(),b=structuredClone(a);b.payload.nonce=ref(990);b.signature=sign(b.payload,f.keys.writer).signature;
  const out=await Promise.all([child(input(f,a)),child(input(f,b))]);out.forEach(x=>assert.equal(x.code,0));
  const results=out.map(x=>JSON.parse(x.output));assert.equal(results.filter(x=>x.code==='SYNTHETIC_COMMAND_COMMITTED').length,1);
  assert.equal(f.raw().payload.marker.count,1);assert.equal(f.raw().payload.checkpoint.totalAttempts,1);
});
test('process death before COMMIT rolls back; process death after COMMIT retains spent reservation and quarantine',async t=>{
  for(const fault of ['attempt-after-commit','command-before-commit','command-after-commit']){const f=fixture(t),e=f.command(),r=await child(input(f,e,{fault,crash:true}));
    assert.equal(r.code,88,r.error);const s=f.sync();assert.equal(s.checkpoint.runSpent,true);
    assert.equal(s.quarantined,true);assert.equal(s.forwardAttemptSpent,true);assert.equal(s.marker?.count||0,fault==='command-after-commit'?1:0);
    denied(f.apply(e));assert.throws(()=>f.command('reserve'),/READ_FAILED/);
    assert.equal(s.checkpoint.runUsage.operations,768);assert.equal(s.receipts.length,1);
    assert.equal(s.generation,fault==='command-after-commit'?3:2);
    if(fault!=='command-after-commit')assert.throws(()=>f.command('ack'),/READ_FAILED/);
    committed(f.apply(f.command('unknown')));committed(f.apply(f.command('close')));committed(f.apply(f.command('revoke')));
    assert.equal(f.raw().payload.marker?.count||0,fault==='command-after-commit'?1:0);
  }
});
test('lost command or readback response reports no unproven durable quarantine; authenticated reconciliation retains exact marker',t=>{
  const f=fixture(t),e=f.command(),lost=load({now:f.options.now,fault:'command-after-commit'}).api;
  denied(f.apply(e,lost));assert.equal(f.sync().quarantined,true);denied(f.apply(e));
  const r=f.read();assert.equal(r.code,'SYNTHETIC_READBACK');assert.equal(r.quarantinePersisted,true);
  const q=f.query(),reader=load({now:f.options.now,fault:'read-after-commit'}).api;
  denied(reader.readSyntheticStore(f.created.locator,f.configText,JSON.stringify(q),f.keys.custodian));f.sync();
  denied(f.read(q));assert.equal(f.read().receipt.payload.state.marker.count,1);
});
test('lost acknowledgement response retains its receipt and spent run without a second marker',t=>{
  const f=fixture(t);committed(f.apply(f.command()));const ack=f.command('ack');
  denied(f.apply(ack,load({now:f.options.now,fault:'command-after-commit'}).api));
  const s=f.sync();assert.equal(s.checkpoint.pending,null);assert.equal(s.checkpoint.runSpent,true);assert.equal(s.receipts.length,2);
  denied(f.apply(ack));assert.throws(()=>f.command('reserve'),/READ_FAILED/);
  assert.equal(f.read().receipt.payload.state.marker.count,1);
});
test('signed roles, keys, session, nonce, command and participant bindings reject without writes',t=>{
  const f=fixture(t),base=f.command(),before=fs.readFileSync(path.join(f.dir,'state.sqlite'));
  const mutations=[p=>{p.role='recovery';},p=>{p.sessionRef=ref(99);},p=>{p.command.commandRef=ref(98);},p=>{p.command.participantRef=f.cfg.policy.roster[1];},
    p=>{p.command.policyDigest='f'.repeat(64);},p=>{p.command.runRef=ref(99);},p=>{p.command.epochRef=ref(99);},p=>{p.command.reservationDigest='f'.repeat(64);},
    p=>{p.command.usage.operations=3;},p=>{p.command.accountingStatus='unknown';},p=>{p.command.PRIVATE_SENTINEL='PRIVATE_SENTINEL';}];
  for(const mutate of mutations){const e=structuredClone(base);mutate(e.payload);e.signature=sign(e.payload,f.keys.writer).signature;denied(f.apply(e));}
  const e=structuredClone(base);e.signature=sign(e.payload,f.keys.reader).signature;denied(f.apply(e));
  assert.deepEqual(fs.readFileSync(path.join(f.dir,'state.sqlite')),before);
});
test('reader authentication and exact schema reject private extras, stale/future timing, replay and wrong custodian keys',t=>{
  const f=fixture(t),q=f.query(),bytes=fs.readFileSync(path.join(f.dir,'state.sqlite'));
  for(const mutate of [x=>{x.role='writer';},x=>{x.sessionRef=ref(99);},x=>{x.issuedMs+=1;},x=>{x.expiresMs=f.options.now;},x=>{x.PRIVATE_SENTINEL='PRIVATE_SENTINEL';}]){
    const p=structuredClone(q.payload);mutate(p);denied(f.read(sign(p,f.keys.reader)));}
  denied(f.api.readSyntheticStore(f.created.locator,f.configText,JSON.stringify(q),f.keys.writer));
  const duplicate=JSON.stringify(q).replace('"role":"reader"','"role":"PRIVATE_SENTINEL","role":"reader"');
  denied(f.api.readSyntheticStore(f.created.locator,f.configText,duplicate,f.keys.custodian));
  assert.deepEqual(fs.readFileSync(path.join(f.dir,'state.sqlite')),bytes);
  assert.equal(f.read(q).code,'SYNTHETIC_READBACK');denied(f.read(q));
});
test('stale or restored readback, altered counters and expired command cannot cross CAS',t=>{
  const f=fixture(t),base=f.command();f.read();denied(f.apply(base));
  const e=f.command();e.payload.readback.payload.state.checkpoint.runUsage.operations=0;
  e.payload.readback=sign(e.payload.readback.payload,f.keys.custodian);e.signature=sign(e.payload,f.keys.writer).signature;
  // Even a custodian-signed forged state cannot replace the exact current durable envelope.
  e.payload.readback.payload.state.ioConsumed=0;e.payload.readback=sign(e.payload.readback.payload,f.keys.custodian);e.signature=sign(e.payload,f.keys.writer).signature;denied(f.apply(e));
  const expired=f.command();f.options.now+=6000;denied(f.apply(expired));
});
test('unknown outcome blocks forward progress; only exact recovery scope can close then revoke after expiry',t=>{
  const f=fixture(t);committed(f.apply(f.command()));committed(f.apply(f.command('unknown')));
  denied(f.apply(f.command('ack')));denied(f.apply(f.command('revoke')));
  denied(f.apply(f.command('close',f.cfg.policy.roster[0],ref(999))));
  f.options.now=f.cfg.policy.endMs+1000;committed(f.apply(f.command('close')));committed(f.apply(f.command('revoke')));
  const s=f.raw().payload;assert.equal(s.checkpoint.revoked,true);assert.equal(s.checkpoint.unknown,true);assert.equal(s.marker.count,1);
  assert.ok(s.checkpoint.pilotUsage.operations>768);assert.equal(s.checkpoint.runSpent,true);
});
test('expiry is rechecked at final transaction boundary before marker COMMIT',t=>{
  const f=fixture(t),e=f.command();f.options.now=f.cfg.policy.runEndMs;
  // Request freshness and command clocks are re-signed, but immutable policy expiry wins.
  e.payload.readback.payload.request.issuedMs=f.options.now;e.payload.readback.payload.request.expiresMs=f.options.now+1000;
  e.payload.readback=sign(e.payload.readback.payload,f.keys.custodian);e.signature=sign(e.payload,f.keys.writer).signature;denied(f.apply(e));assert.equal(f.raw().payload.marker,null);
});
test('existing database is never reinitialized; policy mismatch, schema mismatch, corruption and symlinks deny',t=>{
  const f=fixture(t),q=f.query(),changed=structuredClone(f.cfg);changed.policy.epochRef=ref(999);
  denied(f.api.readSyntheticStore(f.created.locator,JSON.stringify(changed),JSON.stringify(q),f.keys.custodian));
  for(const locator of ['/private/PRIVATE_SENTINEL','../state.sqlite',ref(123456)])denied(f.api.readSyntheticStore(locator,f.configText,JSON.stringify(q),f.keys.custodian));
  const file=path.join(f.dir,'state.sqlite'),bytes=fs.readFileSync(file);fs.renameSync(file,file+'.saved');fs.symlinkSync(file+'.saved',file);denied(f.read(q));fs.unlinkSync(file);fs.renameSync(file+'.saved',file);
  const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(file);db.exec('CREATE TABLE unexpected (secret TEXT)');db.close();denied(f.read(q));
  fs.writeFileSync(file,bytes);const db2=new DatabaseSync(file);db2.prepare('UPDATE custody SET envelope=?').run('{"PRIVATE_SENTINEL":true}');db2.close();denied(f.read(q));
});
test('forward/read quotas preserve at least six recovery slots without refunds',t=>{
  const f=fixture(t);committed(f.apply(f.command()));
  while(f.generation<16)assert.equal(f.read().code,'SYNTHETIC_READBACK');denied(f.read());
  for(const kind of ['unknown','close','revoke'])committed(f.apply(f.command(kind)));
  const s=f.raw().payload;assert.equal(s.ioConsumed,22);assert.equal(s.generation,22);assert.equal(s.ioEncumbered.operations,768);assert.equal(s.checkpoint.revoked,true);
});
test('stable identity rejects second initialization with changed plan, deployment, roster or keys',t=>{
  const f=fixture(t),bytes=fs.readFileSync(path.join(f.dir,'state.sqlite'));
  for(const mutate of [()=>{},c=>{c.policy.planRef=ref(999);},c=>{c.policy.deploymentRef=ref(999);},c=>{c.policy.roster=[ref(991)];},c=>{[c.keys.reader,c.keys.writer]=[c.keys.writer,c.keys.reader];}]){
    const c=structuredClone(f.cfg);mutate(c);denied(f.api.initializeSyntheticStore(JSON.stringify(c),f.keys.custodian));}
  assert.deepEqual(fs.readFileSync(path.join(f.dir,'state.sqlite')),bytes);
});
test('clock jump after save before COMMIT rolls back marker and preserves attempted quarantine',t=>{
  for(const clockJump of [1000,-1]){const f=fixture(t),e=f.command(),api=load({now:f.options.now,fault:'command-before-commit',clockJump}).api;
    denied(f.apply(e,api));const s=f.sync();assert.equal(s.marker,null);assert.equal(s.forwardAttemptSpent,true);assert.equal(s.quarantined,true);denied(f.apply(e));}
});
test('initialization crossing expiry leaves an unusable namespace instead of resetting it',t=>{
  const f=fixture(t),c=structuredClone(f.cfg);c.sessionRef=ref(555);c.policy.runEndMs=f.options.now+200;
  const options={now:f.options.now,fault:'initialize-before-commit',clockJump:201},api=load(options).api;
  const locator=hash([DOMAIN,c.policy.pilotRef,c.policy.epochRef,c.policy.runRef,c.sessionRef]).slice(0,32);
  const dir=path.join(path.dirname(f.dir),'reversr-synthetic-custody-'+locator);t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  denied(api.initializeSyntheticStore(JSON.stringify(c),f.keys.custodian));
  denied(f.api.initializeSyntheticStore(JSON.stringify(c),f.keys.custodian));
});
test('whole database restore by the sole Owner is an explicit unqualified boundary',t=>{
  const f=fixture(t),file=path.join(f.dir,'state.sqlite'),original=fs.readFileSync(file);committed(f.apply(f.command()));
  fs.writeFileSync(file,original);f.sync();const r=f.read();closed(r);
  assert.equal(r.code,'SYNTHETIC_READBACK');assert.equal(r.receipt.payload.state.marker,null);
  // There is no separate restore-surviving trust anchor. Never call this independent custody.
});
test('production factories deny hostile input before IO; imported kernel references are captured',t=>{
  const f=fixture(t),hostile=new Proxy({}, {get(){throw Error('PRIVATE_SENTINEL');},ownKeys(){throw Error('PRIVATE_SENTINEL');}});
  denied(f.api.authorizeDurablePilotProduction(hostile));denied(f.api.createDurablePilotProvider(hostile));
  denied(f.api.readSyntheticStore(hostile,hostile,hostile,hostile));
  f.kernel.evaluateSyntheticControl=()=>{throw Error('MUTATED_EXPORT');};f.kernel.snapshotForSyntheticHistory=()=>{throw Error('MUTATED_EXPORT');};committed(f.apply(f.command()));
});
