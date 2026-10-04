// Offline synthetic control contract. No IO, provider adapter or admission path.
import { createHash } from 'node:crypto';
const DAY=86400000,RECORD=16384,MAX_HISTORY=64;
const PILOT={requests:5000,operations:5000,payloadBytes:52428800,costMicros:25000000};
const PILOT_RESERVE={requests:1000,operations:1000,payloadBytes:245760,costMicros:5000000};
const RUN={requests:1000,operations:1000,payloadBytes:10485760};
const RUN_RESERVE={requests:200,operations:200,payloadBytes:49152};
const usageFields=['requests','operations','payloadBytes','costMicros'] as const;
type Usage={requests:number;operations:number;payloadBytes:number;costMicros:number};
type Policy={scope:'synthetic-only';operatorModel:'sole-operator-unqualified';pilotRef:string;epochRef:string;
  bindingRef:string;originDigest:string;startMs:number;endMs:number;roster:string[];
  runRef:string;runStartMs:number;runEndMs:number;planRef:string;deploymentRef:string};
type Command={kind:'reserve'|'ack'|'unknown'|'close'|'revoke';commandRef:string;pilotRef:string;epochRef:string;
  bindingRef:string;runRef:string;participantRef:string;scenarioRef:string;policyDigest:string;
  expectedSequence:number;expectedHeadDigest:string;reservationDigest:string|null;outcome:'none'|'success'|'unknown';
  accountingStatus:'known';usage:Usage;clock:{lowerMs:number;upperMs:number;elapsedMs:number};concurrentCallers:number};
type Row={command:Command;previousDigest:string;digest:string};
type Reservation={scenarioRef:string;participantRef:string;reservationDigest:string;outcome:'pending'|'success'|'unknown'};
type State={policyDigest:string;sequence:number;headDigest:string;pilotUsage:Usage;runUsage:Usage;
  participantAttempts:{participantRef:string;attempts:number}[];totalAttempts:number;reservations:Reservation[];
  usedCommands:string[];pending:string|null;runSpent:boolean;closed:boolean;revoked:boolean;unknown:boolean;timeHighWaterMs:number};
const policyFields=['scope','operatorModel','pilotRef','epochRef','bindingRef','originDigest','startMs','endMs','roster',
  'runRef','runStartMs','runEndMs','planRef','deploymentRef'];
const commandFields=['kind','commandRef','pilotRef','epochRef','bindingRef','runRef','participantRef','scenarioRef',
  'policyDigest','expectedSequence','expectedHeadDigest','reservationDigest','outcome','accountingStatus','usage','clock','concurrentCallers'];
function fail():never {throw Error('PILOT_INVALID');}
function uint(v:unknown):v is number{return Number.isSafeInteger(v) && (v as number)>=0;}
function ref(v:unknown):v is string{return typeof v==='string' && /^[a-f0-9]{32}$/.test(v);}
function digest(v:unknown):v is string{return typeof v==='string' && /^[a-f0-9]{64}$/.test(v);}
// Reject accessors, symbols, prototypes, cycles, sparse arrays and excessive trees
// before reading values. Reflection failures are caught by every public entry.
function plain(v:unknown,depth=0,seen=new Set<object>(),budget={nodes:0}):boolean {
  if(++budget.nodes>30000 || depth>12)return false;
  if(v===null || typeof v==='boolean')return true;
  if(typeof v==='string')return v.length<=256;
  if(typeof v==='number')return uint(v);
  if(typeof v!=='object' || seen.has(v))return false;
  const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
  if(proto!==(array?Array.prototype:Object.prototype))return false;
  const names=Reflect.ownKeys(v);seen.add(v);
  if(array && ((v as unknown[]).length>128 || names.length!==(v as unknown[]).length+1))return false;
  if(!array && names.length>32)return false;
  for(const k of names) {
    if(array && k==='length')continue;
    if(typeof k!=='string')return false;
    if(array && (!/^(0|[1-9][0-9]*)$/.test(k) || Number(k)>=(v as unknown[]).length))return false;
    const d=Object.getOwnPropertyDescriptor(v,k);
    if(!d || !('value' in d) || !d.enumerable || !plain(d.value,depth+1,seen,budget))return false;
  }
  seen.delete(v);return true;
}
function exact(v:unknown,fields:readonly string[]):v is Record<string,unknown> {
  return !!v && !Array.isArray(v) && typeof v==='object' && plain(v)
    && Object.keys(v).length===fields.length && fields.every(k=>Object.hasOwn(v,k));
}
function canonical(v:unknown):string {
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(v && typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(v);
}
function hash(v:unknown):string{return createHash('sha256').update(canonical(v)).digest('hex');}
function freeze<T>(v:T):T {if(v && typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function denied(){return freeze({code:'PILOT_SOURCE_DENIED',sourceOnly:true,modeledAccepted:false,
  independentProvenance:false,riskAccepted:false,spendingAuthorized:false,hostQualified:false,
  bodyAdmissionAuthorized:false,liveReady:false,effectDispatchAllowed:false,quarantineRequired:true,quarantinePersisted:false});}
function policy(raw:unknown):Policy {
  if(!exact(raw,policyFields) || raw.scope!=='synthetic-only' || raw.operatorModel!=='sole-operator-unqualified'
    || !['pilotRef','epochRef','bindingRef','runRef','planRef','deploymentRef'].every(k=>ref(raw[k])) || !digest(raw.originDigest)
    || !['startMs','endMs','runStartMs','runEndMs'].every(k=>uint(raw[k])) || !Array.isArray(raw.roster)
    || raw.roster.length<1 || raw.roster.length>5 || !raw.roster.every(ref) || new Set(raw.roster).size!==raw.roster.length)fail();
  const p=JSON.parse(JSON.stringify(raw)) as Policy;
  if(p.endMs-p.startMs!==30*DAY || p.runStartMs<p.startMs || p.runEndMs>p.endMs
    || p.runEndMs<=p.runStartMs || p.runEndMs-p.runStartMs>3600000)fail();return p;
}
function command(raw:unknown):Command {
  if(!exact(raw,commandFields) || !['reserve','ack','unknown','close','revoke'].includes(raw.kind as string)
    || !['commandRef','pilotRef','epochRef','bindingRef','runRef','participantRef','scenarioRef'].every(k=>ref(raw[k]))
    || !digest(raw.policyDigest) || !digest(raw.expectedHeadDigest) || !uint(raw.expectedSequence)
    || !(raw.reservationDigest===null || digest(raw.reservationDigest)) || !['none','success','unknown'].includes(raw.outcome as string)
    || raw.accountingStatus!=='known' || !exact(raw.usage,usageFields) || !usageFields.every(k=>uint((raw.usage as Usage)[k]))
    || !exact(raw.clock,['lowerMs','upperMs','elapsedMs']) || !Object.values(raw.clock).every(uint)
    || !uint(raw.concurrentCallers) || raw.concurrentCallers<1 || raw.concurrentCallers>2)fail();
  return JSON.parse(JSON.stringify(raw)) as Command;
}
function zero():Usage{return {requests:0,operations:0,payloadBytes:0,costMicros:0};}
function initial(p:Policy):State {return {policyDigest:hash(p),sequence:0,headDigest:p.originDigest,pilotUsage:zero(),runUsage:zero(),
  participantAttempts:p.roster.map(participantRef=>({participantRef,attempts:0})),totalAttempts:0,reservations:[],usedCommands:[],
  pending:null,runSpent:false,closed:false,revoked:false,unknown:false,timeHighWaterMs:p.startMs};}
function reduce(p:Policy,s:State,c:Command):{state:State;row:Row} {
  const restrictive=['unknown','close','revoke'].includes(c.kind),t=c.clock;
  if(c.policyDigest!==s.policyDigest || ['pilotRef','epochRef','bindingRef','runRef'].some(k=>c[k as keyof Command]!==p[k as keyof Policy])
    || c.expectedSequence!==s.sequence || c.expectedHeadDigest!==s.headDigest || s.usedCommands.includes(c.commandRef)
    || !p.roster.includes(c.participantRef) || s.sequence>=MAX_HISTORY || (!restrictive && s.sequence>=MAX_HISTORY-3)
    || t.lowerMs>t.upperMs || t.upperMs-t.lowerMs>1000 || t.lowerMs<s.timeHighWaterMs
    || !uint(p.startMs+t.elapsedMs) || p.startMs+t.elapsedMs<t.lowerMs || p.startMs+t.elapsedMs>t.upperMs
    || (!restrictive && (t.lowerMs<p.runStartMs || t.upperMs>=p.runEndMs || t.lowerMs<p.startMs || t.upperMs>=p.endMs))
    || c.usage.requests<1 || c.usage.operations<s.sequence+3 || c.usage.payloadBytes<RECORD)fail();
  const n=JSON.parse(JSON.stringify(s)) as State;
  for(const k of usageFields) {
    const a=s.pilotUsage[k]+c.usage[k],b=s.runUsage[k]+c.usage[k];
    if(!uint(a) || !uint(b) || a>PILOT[k] || (!restrictive && a>PILOT[k]-PILOT_RESERVE[k]))fail();
    if(k!=='costMicros' && (b>RUN[k] || (!restrictive && b>RUN[k]-RUN_RESERVE[k])))fail();
    n.pilotUsage[k]=a;n.runUsage[k]=b;
  }
  const reserved=n.reservations.find(r=>r.scenarioRef===c.scenarioRef);
  const row:Row={command:c,previousDigest:s.headDigest,digest:hash(['pilot-control-row-v1',s.headDigest,c])};
  if(c.kind==='reserve') {
    if(n.runSpent || n.closed || n.revoked || n.unknown || n.pending!==null || reserved || c.reservationDigest!==null || c.outcome!=='none')fail();
    const participant=n.participantAttempts.find(x=>x.participantRef===c.participantRef)!;
    if(participant.attempts>=10 || n.totalAttempts>=50)fail();
    participant.attempts++;n.totalAttempts++;n.runSpent=true;
    n.reservations.push({scenarioRef:c.scenarioRef,participantRef:c.participantRef,reservationDigest:row.digest,outcome:'pending'});
    n.pending=c.scenarioRef;
  } else {
    if(!reserved || reserved.participantRef!==c.participantRef || reserved.reservationDigest!==c.reservationDigest
      || (n.pending!==null && n.pending!==c.scenarioRef))fail();
    if(c.kind==='ack') {
      if(n.closed || n.revoked || n.unknown || n.pending!==c.scenarioRef || reserved.outcome!=='pending' || c.outcome==='none')fail();
      reserved.outcome=c.outcome;
      if(c.outcome==='unknown')n.unknown=true;else n.pending=null;
    } else {
      if(c.outcome!=='none')fail();
      if(c.kind==='unknown'){n.unknown=true;reserved.outcome='unknown';}
      if(c.kind==='close'){n.closed=true;n.pending=null;}
      if(c.kind==='revoke'){if(!n.closed)fail();n.revoked=true;}
    }
  }
  // Every command and conservative charge is retained; acknowledgement never refunds.
  n.sequence++;n.headDigest=row.digest;n.timeHighWaterMs=t.upperMs;n.usedCommands.push(c.commandRef);
  if(Buffer.byteLength(canonical(row))>RECORD)fail();return {state:n,row};
}
function replay(p:Policy,raw:unknown):State {
  if(!Array.isArray(raw) || raw.length>MAX_HISTORY || !plain(raw))fail();
  let s=initial(p);
  for(const entry of raw) {
    if(!exact(entry,['command','previousDigest','digest']) || !digest(entry.digest) || entry.previousDigest!==s.headDigest)fail();
    const next=reduce(p,s,command(entry.command));if(next.row.digest!==entry.digest)fail();s=next.state;
  }
  return s;
}
// Test snapshot reconstruction is not authenticated initialization or a reset API.
export function snapshotForSyntheticHistory(rawPolicy:unknown,history:unknown) {
  try {return freeze({...denied(),code:'SYNTHETIC_SNAPSHOT_ONLY',state:replay(policy(rawPolicy),history)});}
  catch{return denied();}
}
export function evaluateSyntheticControl(raw:unknown) {
  try {
    if(!exact(raw,['policy','history','checkpoint','command','historyStatus','provenance'])
      || raw.historyStatus!=='complete' || raw.provenance!=='supplied-test-only')return denied();
    const p=policy(raw.policy),s=replay(p,raw.history),c=command(raw.command);
    if(hash(raw.checkpoint)!==hash(s))return denied();
    const next=reduce(p,s,c);
    return freeze({...denied(),code:'PILOT_CONTROL_PLAN_ONLY',modeledAccepted:true,
      plan:{compareAndSwap:{policyDigest:s.policyDigest,sequence:s.sequence,headDigest:s.headDigest},
        row:next.row,checkpoint:next.state,reservationBeforeEffect:true,requiresDurableTransaction:true,
        receipt:{sequence:next.state.sequence,commandRef:c.commandRef,scenarioRef:c.scenarioRef,kind:c.kind},
        prospectiveUploadFence:{concurrentSessions:1,attempts:1,admissionEnabled:false},
        providerCostCapEnforced:false,retainedObligationsAfterDay30:true}});
  }catch{return denied();}
}
export function checkTierFixture(raw:unknown) {
  try {
    if(!exact(raw,['tier','used','seats','period']) || !uint(raw.used) || !uint(raw.seats) || raw.seats<1)return denied();
    const limits={free:{credits:5,seats:1,period:'week'},pro:{credits:100,seats:1,period:'month'},
      team:{credits:500,seats:3,period:'month'},tester:{credits:Number.MAX_SAFE_INTEGER,seats:1,period:'month'}};
    if(typeof raw.tier!=='string' || !Object.hasOwn(limits,raw.tier))return denied();
    const l=limits[raw.tier as keyof typeof limits];
    return freeze({...denied(),code:'TIER_SOURCE_FIXTURE_ONLY',entitlementAvailable:raw.period===l.period && raw.used<l.credits && raw.seats<=l.seats,
      pilotLedgerStillRequired:true});
  }catch{return denied();}
}
export function authorizePilotProduction(..._untrusted:unknown[]){return denied();}
export function createPilotProviderAdapter(..._untrusted:unknown[]){return denied();}
