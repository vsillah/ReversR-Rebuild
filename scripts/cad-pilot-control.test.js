'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../offline/cad-pilot/control.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api={};vm.runInThisContext(`(function(exports,require){${compiled}\n})`)(api,name=>{
  assert.equal(name,'node:crypto');return require('node:crypto');
});
const ref=n=>n.toString(16).padStart(32,'0'),digest=n=>n.toString(16).padStart(64,'0');
function fixture() {
  const p={scope:'synthetic-only',operatorModel:'sole-operator-unqualified',pilotRef:ref(1),epochRef:ref(2),bindingRef:ref(3),
    originDigest:digest(4),startMs:1000,endMs:1000+30*86400000,roster:[10,11,12,13,14].map(ref),runRef:ref(5),
    runStartMs:1000,runEndMs:3601000,planRef:ref(6),deploymentRef:ref(7)};
  const history=[];let snapshot=api.snapshotForSyntheticHistory(p,history);
  assert.ok(snapshot.state);
  const input={policy:p,history,checkpoint:structuredClone(snapshot.state),command:null,historyStatus:'complete',provenance:'supplied-test-only'};
  let nextId=100;
  function command(kind='reserve',scenario=ref(20),participant=p.roster[0]) {
    const s=input.checkpoint,r=s.reservations.find(x=>x.scenarioRef===scenario),now=s.timeHighWaterMs+10;
    return {kind,commandRef:ref(nextId++),pilotRef:p.pilotRef,epochRef:p.epochRef,bindingRef:p.bindingRef,runRef:p.runRef,
      participantRef:participant,scenarioRef:scenario,policyDigest:s.policyDigest,expectedSequence:s.sequence,expectedHeadDigest:s.headDigest,
      reservationDigest:kind==='reserve'?null:r?.reservationDigest||null,outcome:kind==='ack'?'success':'none',accountingStatus:'known',
      usage:{requests:1,operations:s.sequence+3,payloadBytes:16384,costMicros:100},
      clock:{lowerMs:now,upperMs:now+1,elapsedMs:now-p.startMs},concurrentCallers:2};
  }
  function run(c=command()) {input.command=c;return api.evaluateSyntheticControl(input);}
  function advance(c=command()) {const r=run(c);assert.equal(r.modeledAccepted,true,r.code);input.history.push(structuredClone(r.plan.row));input.checkpoint=structuredClone(r.plan.checkpoint);return r;}
  return {input,command,run,advance};
}
function closed(r) {
  for(const k of ['independentProvenance','riskAccepted','spendingAuthorized','hostQualified','bodyAdmissionAuthorized','liveReady','effectDispatchAllowed','quarantinePersisted'])assert.equal(r[k],false,k);
  assert.ok(Object.isFrozen(r));assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);
}
function rejected(f,c=f.command()) {const r=f.run(c);closed(r);assert.equal(r.modeledAccepted,false);return r;}
test('reservation precedes effect; exact acknowledgement keeps permanent spent scope and charges',()=>{
  const f=fixture(),r=f.advance();closed(r);
  assert.equal(r.plan.reservationBeforeEffect,true);assert.equal(r.plan.requiresDurableTransaction,true);
  assert.deepEqual(r.plan.prospectiveUploadFence,{concurrentSessions:1,attempts:1,admissionEnabled:false});
  assert.equal(r.plan.compareAndSwap.sequence,0);
  rejected(f,f.command('reserve',ref(21)));
  const bad=f.command('ack');bad.reservationDigest=digest(999);rejected(f,bad);
  f.advance(f.command('ack'));assert.equal(f.input.checkpoint.pending,null);
  assert.equal(f.input.checkpoint.totalAttempts,1);assert.equal(f.input.checkpoint.pilotUsage.requests,2);
  rejected(f,f.command('reserve'));rejected(f,f.command('ack'));
  rejected(f,f.command('reserve',ref(21)));assert.equal(f.input.checkpoint.totalAttempts,1);
  assert.throws(()=>{r.plan.checkpoint.pilotUsage.requests=0;},TypeError);
});
test('same run is permanently spent after acknowledgement and history reconstruction',()=>{
  const f=fixture();f.advance();f.advance(f.command('ack'));
  assert.equal(f.input.checkpoint.runSpent,true);
  f.input.checkpoint=structuredClone(api.snapshotForSyntheticHistory(f.input.policy,structuredClone(f.input.history)).state);
  for(const participant of f.input.policy.roster)rejected(f,f.command('reserve',ref(210),participant));
  f.advance(f.command('close'));rejected(f,f.command('reserve',ref(211)));
  for(const field of ['planRef','deploymentRef','bindingRef']) {
    const raw=structuredClone(f.input);raw.policy[field]=ref(999);raw.command=f.command('reserve',ref(212));
    assert.equal(api.evaluateSyntheticControl(raw).modeledAccepted,false);
  }
});
test('roster bounds and exact pending cleanup target remain enforced',()=>{
  const x=fixture();x.input.policy.roster.push(ref(15));rejected(x);
  const y=fixture();rejected(y,y.command('reserve',ref(21),ref(99)));
  y.advance();const before=structuredClone(y.input.checkpoint);
  for(const kind of ['unknown','close','revoke']) {
    const wrong=y.command(kind,ref(22));wrong.reservationDigest=before.reservations[0].reservationDigest;rejected(y,wrong);
    const participant=y.command(kind,ref(20),y.input.policy.roster[1]);rejected(y,participant);
  }
  assert.deepEqual(y.input.checkpoint,before);assert.equal(before.pending,ref(20));
  y.advance(y.command('unknown'));y.advance(y.command('close'));y.advance(y.command('revoke'));
});
test('wrong policy pilot binding epoch run and command replay reject',()=>{
  for(const k of ['pilotRef','epochRef','bindingRef','runRef','policyDigest','expectedHeadDigest']) {
    const f=fixture(),c=f.command();c[k]=k.endsWith('Digest')?digest(99):ref(99);rejected(f,c);
  }
  const f=fixture(),c=f.command();f.advance(c);rejected(f,c);
  const next=f.command('ack');next.commandRef=c.commandRef;rejected(f,next);
  for(const field of ['planRef','deploymentRef','epochRef','runRef']) {const x=fixture();x.advance();x.input.policy[field]=ref(999);rejected(x,x.command('ack'));}
});
test('missing stale regressed restored counters or modified history cannot match supplied checkpoint',()=>{
  const base=fixture();base.advance();
  for(const change of [x=>{x.history=[];},x=>{x.checkpoint.pilotUsage.requests=0;},x=>{x.checkpoint.runUsage.operations=0;},
    x=>{x.checkpoint.participantAttempts[0].attempts=0;},x=>{x.checkpoint.sequence=0;},x=>{x.history[0].command.usage.requests=0;},
    x=>{x.historyStatus='missing';},x=>{x.provenance='verified';}]) {
    const raw=structuredClone(base.input);raw.command=base.command('ack');change(raw);const r=api.evaluateSyntheticControl(raw);closed(r);assert.equal(r.modeledAccepted,false);
  }
});
test('unsafe integers unknown accounting and forward reserve exhaustion deny',()=>{
  for(const [field,amount] of [['requests',801],['operations',801],['payloadBytes',10485760-49152+1],
    ['costMicros',20000001],['requests',5001],['operations',5001],['payloadBytes',52428801],['costMicros',25000001],['costMicros',0.1],['requests',Number.MAX_SAFE_INTEGER+1]]) {
    const f=fixture(),c=f.command();c.usage[field]=amount;rejected(f,c);
  }
  const f=fixture(),c=f.command();c.accountingStatus='unknown';rejected(f,c);
  const other=f.command();other.usage.operations=2;rejected(f,other);
});
test('run reserves allow unknown-close-revoke after expiry without refund or renewal',()=>{
  const f=fixture(),c=f.command();c.usage={requests:800,operations:800,payloadBytes:10485760-49152,costMicros:20000000};f.advance(c);
  rejected(f,f.command('ack'));
  for(const kind of ['unknown','close','revoke']) {
    const cmd=f.command(kind);const now=f.input.policy.endMs+100+f.input.history.length*10;
    cmd.clock={lowerMs:now,upperMs:now+1,elapsedMs:now-f.input.policy.startMs};
    const r=f.advance(cmd);closed(r);assert.equal(r.plan.retainedObligationsAfterDay30,true);
  }
  assert.equal(f.input.checkpoint.runUsage.payloadBytes,10485760);
  assert.equal(f.input.checkpoint.totalAttempts,1);assert.equal(f.input.checkpoint.revoked,true);
  rejected(f,f.command('reserve',ref(90)));rejected(f,f.command('close'));
});
test('unknown outcome quarantines all forward participants; revoke requires close; unbound recovery denies',()=>{
  const f=fixture();rejected(f,f.command('close'));f.advance();rejected(f,f.command('revoke'));
  const unknown=f.command('ack');unknown.outcome='unknown';f.advance(unknown);
  rejected(f,f.command('reserve',ref(90),f.input.policy.roster[1]));rejected(f,f.command('ack'));
  f.advance(f.command('close'));f.advance(f.command('revoke'));rejected(f,f.command('reserve',ref(91)));
});
test('time bounds fixed epoch and two callers reject uncertain or out-of-window work',()=>{
  for(const change of [c=>{c.concurrentCallers=3;},c=>{c.clock.upperMs+=1001;},c=>{c.clock.lowerMs=999;},
    c=>{c.clock.elapsedMs++;c.clock.elapsedMs+=100;},c=>{c.clock={lowerMs:3601000,upperMs:3601001,elapsedMs:3600000};}]) {
    const f=fixture(),c=f.command();change(c);rejected(f,c);
  }
  for(const change of [p=>{p.endMs++;},p=>{p.runEndMs++;},p=>{p.scope='production';},p=>{p.operatorModel='independent';}]){const f=fixture();change(f.input.policy);rejected(f);}
});
test('record and replay limits are restrictive; no append beyond 64 history entries',()=>{
  const f=fixture();f.advance();f.advance(f.command('close'));
  // Recovery also consumes generation/history read budget. Its tighter run cap
  // can stop before 64; large caller supplied histories must always reject.
  while(f.input.history.length<64) {
    const c=f.command('close'),r=f.run(c);if(!r.modeledAccepted)break;f.advance(c);
  }
  assert.ok(f.input.history.length<64);rejected(f,f.command('close'));
  f.input.history=Array(65).fill(f.input.history[0]);rejected(f,f.command('close'));
});
test('hostile descriptors proxies arrays and unknown fields deny without echo or getter reads',()=>{
  let reads=0;
  for(const target of ['policy','checkpoint']) {
    const f=fixture();Object.defineProperty(f.input[target],'secret',{get(){reads++;throw Error('PRIVATE_SENTINEL');},enumerable:true});rejected(f);
  }
  for(const trap of ['ownKeys','getPrototypeOf','getOwnPropertyDescriptor']) {
    const raw=new Proxy({}, {[trap](){throw Error('PRIVATE_SENTINEL');}});closed(api.evaluateSyntheticControl(raw));
  }
  const f=fixture();f.input.policy.roster.length=2;delete f.input.policy.roster[1];f.input.policy.roster.extra=ref(11);rejected(f);
  const g=fixture();g.input.command=g.command();g.input.extra=true;assert.equal(api.evaluateSyntheticControl(g.input).modeledAccepted,false);
  assert.equal(reads,0);
});
test('tier boundaries are offline defaults; Tester unlimited cannot override pilot denial',()=>{
  for(const [tier,period,values] of [['free','week',[4,5,6]],['pro','month',[99,100,101]],['team','month',[499,500,501]]]) {
    values.forEach((used,i)=>{const r=api.checkTierFixture({tier,period,used,seats:1});closed(r);assert.equal(r.entitlementAvailable,i===0);});
  }
  for(const seats of [2,3,4])assert.equal(api.checkTierFixture({tier:'team',period:'month',used:0,seats}).entitlementAvailable,seats<=3);
  const r=api.checkTierFixture({tier:'tester',period:'month',used:999999,seats:1});closed(r);assert.equal(r.entitlementAvailable,true);
  const f=fixture();f.advance();f.advance(f.command('unknown'));rejected(f,f.command('reserve',ref(90)));
});
test('export replacement cannot weaken original kernel or production closure; self-consistent fixtures remain unauthenticated',()=>{
  const original=api.evaluateSyntheticControl,authorizer=api.authorizePilotProduction,adapter=api.createPilotProviderAdapter;
  api.denied=()=>({hostQualified:true});api.PILOT={requests:Number.MAX_SAFE_INTEGER};api.reduce=()=>({});
  const f=fixture(),c=f.command();c.usage.requests=801;f.input.command=c;closed(original(f.input));assert.equal(original(f.input).modeledAccepted,false);
  const hostile=new Proxy({}, {get(){throw Error('PRIVATE_SENTINEL');}});closed(authorizer(hostile,true));closed(adapter(hostile,()=>true));
  const fake=fixture();fake.input.policy.originDigest=digest(999);fake.input.checkpoint=structuredClone(api.snapshotForSyntheticHistory(fake.input.policy,[]).state);
  const r=fake.advance();closed(r);assert.equal(r.independentProvenance,false);
});
