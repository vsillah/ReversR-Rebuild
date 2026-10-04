// Unmounted, synthetic-local protocol. This module never accepts bodies or dispatches IO effects.
import { DatabaseSync } from 'node:sqlite';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { lstatSync, mkdirSync, openSync, closeSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse, sep } from 'node:path';
import { evaluateSyntheticControl, snapshotForSyntheticHistory } from '../cad-pilot/control';

// Capture imports once: later CommonJS export substitution cannot replace the kernel.
const evaluate = evaluateSyntheticControl, snapshot = snapshotForSyntheticHistory;
type Value = any; // Parsed JSON only; exact shapes are checked at every trust boundary.
const DOMAIN = 'reversr-synthetic-sqlite-v1';
const MAX = 262144;
const IO = Object.freeze({ requests: 128, operations: 768, payloadBytes: 8388608, costMicros: 0 });
const FLAGS = Object.freeze({ sourceOnly: true, independentProvenance: false, hostQualified: false,
  bodyAdmissionAuthorized: false, liveReady: false, effectDispatchAllowed: false,
  spendingAuthorized: false, riskAccepted: false, admissionExceptionAuthorized: false,
  providerCostCapEnforced: false, providerCalls: 0, costs: 0 });
function stop(): never { throw Error('SYNTHETIC_LOCAL_DENIED'); }
function freeze<T>(v:T):T { if(v && typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v; }
function result(code:string, extra:Value={}) { return freeze({...FLAGS,code,quarantineRequired:true,quarantinePersisted:false,...extra}); }
function canonical(v:Value):string {return v===null || typeof v!=='object' ? JSON.stringify(v) : Array.isArray(v)
  ? '['+v.map(canonical).join(',')+']' : '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';}
function hash(v:Value):string {return createHash('sha256').update(canonical(v)).digest('hex');}
function exact(v:Value, keys:string[]) {if(!v || Array.isArray(v) || typeof v!=='object' || Object.keys(v).sort().join('|')!==keys.sort().join('|'))stop();}
function ref(v:Value){if(typeof v!=='string'||! /^[a-f0-9]{32}$/.test(v))stop();}
function digest(v:Value){if(typeof v!=='string'||! /^[a-f0-9]{64}$/.test(v))stop();}
function uint(v:Value){if(!Number.isSafeInteger(v)||v<0)stop();}
function decode(text:unknown):Value {
  if(typeof text!=='string' || Buffer.byteLength(text)>MAX)stop();
  const v=JSON.parse(text);if(JSON.stringify(v)!==text)stop();let nodes=0;
  function walk(x:Value, depth:number){if(++nodes>12000||depth>24)stop();if(x && typeof x==='object'){
    for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))stop();walk(x[k],depth+1);}
  }else if(typeof x==='string' && x.length>MAX)stop();}
  walk(v,0);return v;
}
function publicKey(raw:Value){if(typeof raw!=='string'||! /^[a-f0-9]{88}$/.test(raw))stop();
  const k=createPublicKey({key:Buffer.from(raw,'hex'),format:'der',type:'spki'});if(k.asymmetricKeyType!=='ed25519')stop();return k;}
function config(text:unknown) {
  const c=decode(text);exact(c,['domain','sessionRef','policy','keys']);if(c.domain!==DOMAIN)stop();ref(c.sessionRef);
  exact(c.keys,['writer','reader','recovery','custodian']);
  for(const k of Object.values(c.keys))publicKey(k);
  if(new Set(Object.values(c.keys)).size!==4 || !(snapshot(c.policy,[]) as Value).state)stop();return c;
}
function signingKey(raw:unknown,c:Value){if(typeof raw!=='string'||raw.length>512)stop();const k=createPrivateKey(raw);
  if(k.asymmetricKeyType!=='ed25519'||createPublicKey(k).export({format:'der',type:'spki'}).toString('hex')!==c.keys.custodian)stop();return k;}
function signed(payload:Value,key:ReturnType<typeof signingKey>){return {payload,signature:sign(null,Buffer.from(canonical(payload)),key).toString('hex')};}
function authentic(raw:Value,key:Value){exact(raw,['payload','signature']);if(typeof raw.signature!=='string'||! /^[a-f0-9]{128}$/.test(raw.signature)
  || !verify(null,Buffer.from(canonical(raw.payload)),publicKey(key),Buffer.from(raw.signature,'hex')))stop();return raw.payload;}
function clock(issued:number,expires:number){uint(issued);uint(expires);const now=Date.now();
  if(expires<=issued||expires-issued>10000||now<issued||now>=expires)stop();}
function fresh(start:bigint,issued:number,expires:number){clock(issued,expires);
  const elapsed=Number(process.hrtime.bigint()-start)/1e6;if(elapsed<0||elapsed>1000)stop();}
function forward(c:Value,start:bigint,wall:number,cmd?:Value){const now=Date.now(),elapsed=Number(process.hrtime.bigint()-start)/1e6;
  if(now<wall||elapsed<0||elapsed>1000||Math.abs(now-wall-elapsed)>1000||now<c.policy.runStartMs||now>=c.policy.runEndMs||now>=c.policy.endMs
    ||(cmd&&(now<cmd.clock.lowerMs||now>cmd.clock.upperMs)))stop();}
function request(v:Value,c:Value){exact(v,['domain','role','purpose','sessionRef','policyDigest','nonce','generation','headDigest','issuedMs','expiresMs','commandRef','participantRef','reservationDigest']);
  if(v.domain!==DOMAIN||v.role!=='reader'||v.sessionRef!==c.sessionRef||v.policyDigest!==hash(c.policy))stop();
  if(!['observe','reserve','ack','unknown','close','revoke'].includes(v.purpose))stop();
  for(const k of ['nonce','commandRef','participantRef'])ref(v[k]);uint(v.generation);digest(v.headDigest);
  if(v.reservationDigest!==null)digest(v.reservationDigest);if(!c.policy.roster.includes(v.participantRef))stop();clock(v.issuedMs,v.expiresMs);}

// Fixed test phases, inert in source. Test loader substitutes this lexical function only.
function testPhase(_name:string):void {}

function directory(locator:unknown, creating=false){ref(locator);const root=realpathSync(tmpdir()), dir=join(root,'reversr-synthetic-custody-'+locator);
  let part=parse(root).root;for(const name of root.slice(part.length).split(sep).filter(Boolean)){part=join(part,name);if(lstatSync(part).isSymbolicLink())stop();}
  if(creating)mkdirSync(dir,{mode:0o700});
  const stat=lstatSync(dir);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.uid!==process.getuid?.())stop();
  return dir;
}
function database(locator:unknown){const dir=directory(locator), file=join(dir,'state.sqlite');
  for(const suffix of ['','-journal','-wal','-shm']){try{const s=lstatSync(file+suffix);
    if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>16*1024*1024||(s.mode&0o077)!==0||s.uid!==process.getuid?.())stop();
  }catch(e){if(suffix && (e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e;}}
  const db=new DatabaseSync(file,{allowExtension:false,timeout:100});
  try{db.exec('PRAGMA trusted_schema=OFF; PRAGMA synchronous=FULL;');
    const schema=db.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY name").all();
    if(schema.length!==1||schema[0].type!=='table'||schema[0].name!=='custody'||schema[0].sql!==SCHEMA)stop();
    return db;
  }catch(e){db.close();throw e;}
}
const SCHEMA='CREATE TABLE custody (id INTEGER PRIMARY KEY CHECK(id=1), envelope TEXT NOT NULL)';
function read(db:DatabaseSync,c:Value){const rows=db.prepare('SELECT envelope FROM custody').all();if(rows.length!==1||typeof rows[0].envelope!=='string')stop();
  const state=authentic(decode(rows[0].envelope),c.keys.custodian);
  exact(state,['domain','configDigest','policy','sessionRef','originDigest','generation','history','checkpoint','nonces','receipts','marker','ioEncumbered','ioConsumed','quarantined','wallHighWaterMs','forwardAttemptSpent']);
  if(state.domain!==DOMAIN||state.configDigest!==hash(c)||hash(state.policy)!==hash(c.policy)||state.sessionRef!==c.sessionRef||state.originDigest!==c.policy.originDigest)stop();
  const recovered=(snapshot(c.policy,state.history) as Value).state;if(!recovered||hash(recovered)!==hash(state.checkpoint))stop();
  uint(state.generation);uint(state.ioConsumed);uint(state.wallHighWaterMs);if(Date.now()<state.wallHighWaterMs)stop();
  if(state.ioConsumed!==state.generation||state.generation>24||hash(state.ioEncumbered)!==hash(IO)
    ||!Array.isArray(state.nonces)||new Set(state.nonces).size!==state.nonces.length||state.nonces.length!==state.generation
    ||!Array.isArray(state.receipts)||state.receipts.length!==state.checkpoint.sequence)stop();
  for(const n of state.nonces)ref(n);
  if(state.marker!==null){exact(state.marker,['commandRef','participantRef','scenarioRef','reservationDigest','count']);
    const first=state.history[0];if(!first||first.command.kind!=='reserve'||state.marker.count!==1||state.marker.commandRef!==first.command.commandRef
      ||state.marker.participantRef!==first.command.participantRef||state.marker.scenarioRef!==first.command.scenarioRef||state.marker.reservationDigest!==first.digest)stop();
  }
  if(typeof state.forwardAttemptSpent!=='boolean'||state.forwardAttemptSpent!==state.checkpoint.runSpent)stop();
  if(state.quarantined!==quarantine(state))stop();
  for(let i=0;i<state.receipts.length;i++){const r=state.receipts[i],row=state.history[i];exact(r,['commandRef','reservationDigest','headDigest','sequence','sessionRef','participantRef']);
    if(r.commandRef!==row.command.commandRef||r.headDigest!==row.digest||r.sequence!==i+1||r.sessionRef!==c.sessionRef||r.participantRef!==row.command.participantRef
      ||r.reservationDigest!==(row.command.kind==='reserve'?row.digest:row.command.reservationDigest))stop();}
  return state;
}
function save(db:DatabaseSync,s:Value,key:ReturnType<typeof signingKey>){const bytes=canonical(signed(s,key));if(Buffer.byteLength(bytes)>MAX)stop();
  if(db.prepare('UPDATE custody SET envelope=? WHERE id=1').run(bytes).changes!==1)stop();}
function quarantine(s:Value){return (s.forwardAttemptSpent&&s.marker===null)||s.checkpoint.pending!==null||s.checkpoint.unknown||s.checkpoint.closed||s.checkpoint.revoked;}
function charge(s:Value,nonce:string,restrictive:boolean){if(s.nonces.includes(nonce)||s.generation>=(restrictive?24:16))stop();
  s.generation++;s.ioConsumed++;s.nonces.push(nonce);s.wallHighWaterMs=Date.now();}
function rollback(db:DatabaseSync|undefined){try{if(db?.isTransaction)db.exec('ROLLBACK');}catch{}try{db?.close();}catch{}}

export function initializeSyntheticStore(configText:unknown,custodianPrivateKey:unknown){let db:DatabaseSync|undefined;
  try{const start=process.hrtime.bigint(),c=config(configText),key=signingKey(custodianPrivateKey,c),now=Date.now();
    const locator=hash([DOMAIN,c.policy.pilotRef,c.policy.epochRef,c.policy.runRef,c.sessionRef]).slice(0,32);
    forward(c,start,now);const dir=directory(locator,true),file=join(dir,'state.sqlite');
    forward(c,start,now);closeSync(openSync(file,'wx',0o600));forward(c,start,now);db=new DatabaseSync(file,{allowExtension:false});
    forward(c,start,now);db.exec('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; BEGIN IMMEDIATE;');forward(c,start,now);db.exec(SCHEMA);
    const s={domain:DOMAIN,configDigest:hash(c),policy:c.policy,sessionRef:c.sessionRef,originDigest:c.policy.originDigest,generation:0,history:[],
      checkpoint:(snapshot(c.policy,[]) as Value).state,nonces:[],receipts:[],marker:null,ioEncumbered:IO,ioConsumed:0,quarantined:false,wallHighWaterMs:now,forwardAttemptSpent:false};
    forward(c,start,now);db.prepare('INSERT INTO custody VALUES (1,?)').run(canonical(signed(s,key)));testPhase('initialize-before-commit');forward(c,start,now);db.exec('COMMIT');db.close();db=undefined;
    return result('SYNTHETIC_STORE_CREATED',{locator,configDigest:hash(c),ioEncumbered:IO});
  }catch{return result('SYNTHETIC_LOCAL_DENIED');}finally{rollback(db);}
}

export function readSyntheticStore(locator:unknown,configText:unknown,requestText:unknown,custodianPrivateKey:unknown){let db:DatabaseSync|undefined;
  try{const start=process.hrtime.bigint(),wall=Date.now(),c=config(configText),key=signingKey(custodianPrivateKey,c),q=authentic(decode(requestText),c.keys.reader);request(q,c);
    const forwardRead=['reserve','ack'].includes(q.purpose);if(forwardRead)forward(c,start,wall);
    db=database(locator);db.exec('BEGIN IMMEDIATE');const s=read(db,c);
    if(q.generation!==s.generation||q.headDigest!==s.checkpoint.headDigest)stop();
    const restrictive=['unknown','close','revoke'].includes(q.purpose);
    if(q.reservationDigest!==null&&!s.checkpoint.reservations.some((r:Value)=>r.reservationDigest===q.reservationDigest&&r.participantRef===q.participantRef))stop();
    if(restrictive&&q.reservationDigest===null)stop();
    if(q.purpose==='reserve'&&s.forwardAttemptSpent)stop();
    if(q.purpose==='ack'&&s.marker===null)stop();
    charge(s,q.nonce,restrictive);fresh(start,q.issuedMs,q.expiresMs);if(forwardRead)forward(c,start,wall);save(db,s,key);
    fresh(start,q.issuedMs,q.expiresMs);if(Date.now()<wall)stop();if(forwardRead)forward(c,start,wall);db.exec('COMMIT');
    const receipt=signed({domain:DOMAIN,role:'custodian-readback',storeRef:locator,configDigest:hash(c),request:q,state:s},key);
    testPhase('read-after-commit');db.close();db=undefined;
    return result('SYNTHETIC_READBACK',{receipt,quarantinePersisted:s.quarantined});
  }catch{return result('SYNTHETIC_LOCAL_DENIED');}finally{rollback(db);}
}

export function applySyntheticCommand(locator:unknown,configText:unknown,envelopeText:unknown,custodianPrivateKey:unknown){let db:DatabaseSync|undefined;
  try{const start=process.hrtime.bigint(),c=config(configText),key=signingKey(custodianPrivateKey,c),outer=decode(envelopeText);
    exact(outer,['payload','signature']);const p=outer.payload;exact(p,['domain','role','sessionRef','nonce','readback','command']);
    if(p.domain!==DOMAIN||p.sessionRef!==c.sessionRef||!['writer','recovery'].includes(p.role))stop();ref(p.nonce);
    authentic(outer,c.keys[p.role]);const b=authentic(p.readback,c.keys.custodian);
    exact(b,['domain','role','storeRef','configDigest','request','state']);
    if(b.domain!==DOMAIN||b.role!=='custodian-readback'||b.storeRef!==locator||b.configDigest!==hash(c))stop();request(b.request,c);
    const cmd=p.command,q=b.request,restrictive=['unknown','close','revoke'].includes(cmd?.kind);
    if(p.role!==(restrictive?'recovery':'writer')||cmd.kind!==q.purpose||cmd.commandRef!==q.commandRef||cmd.participantRef!==q.participantRef
      ||cmd.reservationDigest!==q.reservationDigest||b.state.generation!==q.generation+1||b.state.checkpoint.headDigest!==q.headDigest)stop();
    const planned=evaluate({policy:c.policy,history:b.state.history,checkpoint:b.state.checkpoint,command:cmd,historyStatus:'complete',provenance:'supplied-test-only'}) as Value;
    if(!planned.modeledAccepted)stop();
    if(cmd.kind==='reserve' && Object.keys(IO).some(k=>cmd.usage[k]<IO[k as keyof typeof IO]))stop();
    const now=Date.now();if(cmd.clock.lowerMs>now||cmd.clock.upperMs<now||cmd.clock.upperMs-cmd.clock.lowerMs>1000)stop();
    db=database(locator);db.exec('BEGIN IMMEDIATE');const s=read(db,c);
    if(hash(s)!==hash(b.state)||(cmd.kind==='ack'&&s.marker===null))stop();
    if(cmd.kind==='reserve'&&(s.forwardAttemptSpent||s.generation>=15))stop();charge(s,p.nonce,restrictive);
    s.history.push(planned.plan.row);s.checkpoint=planned.plan.checkpoint;
    s.receipts.push({commandRef:cmd.commandRef,reservationDigest:cmd.kind==='reserve'?planned.plan.row.digest:cmd.reservationDigest,
      headDigest:s.checkpoint.headDigest,sequence:s.checkpoint.sequence,sessionRef:c.sessionRef,participantRef:cmd.participantRef});
    // First commit includes the exact reservation, complete charges and a receipt.
    // Recovery can close it even if the separately committed marker never exists.
    if(cmd.kind==='reserve'){
      s.forwardAttemptSpent=true;s.quarantined=true;
      fresh(start,q.issuedMs,q.expiresMs);forward(c,start,now,cmd);save(db,s,key);
      fresh(start,q.issuedMs,q.expiresMs);forward(c,start,now,cmd);db.exec('COMMIT');
      testPhase('attempt-after-commit');
      forward(c,start,now,cmd);db.exec('BEGIN IMMEDIATE');if(hash(read(db,c))!==hash(s))stop();
      charge(s,hash(['marker-transition',p.nonce,cmd.commandRef]).slice(0,32),false);
      if(s.marker!==null)stop();s.marker={commandRef:cmd.commandRef,participantRef:cmd.participantRef,scenarioRef:cmd.scenarioRef,reservationDigest:planned.plan.row.digest,count:1};
    }
    s.quarantined=quarantine(s);
    fresh(start,q.issuedMs,q.expiresMs);
    if(!restrictive)forward(c,start,now,cmd);
    save(db,s,key);testPhase('command-before-commit');
    fresh(start,q.issuedMs,q.expiresMs);if(Date.now()<now)stop();if(!restrictive)forward(c,start,now,cmd);
    db.exec('COMMIT');testPhase('command-after-commit');db.close();db=undefined;
    return result('SYNTHETIC_COMMAND_COMMITTED',{generation:s.generation,checkpoint:s.checkpoint,receipt:s.receipts.at(-1),
      prospectiveMarkerCount:s.marker?.count||0,quarantinePersisted:s.quarantined});
  }catch{return result('SYNTHETIC_LOCAL_DENIED');}finally{rollback(db);}
}

// Always deny before inspecting arguments, filesystem access, credentials, or constructors.
export function authorizeDurablePilotProduction(..._untrusted:unknown[]){return result('SYNTHETIC_LOCAL_DENIED');}
export function createDurablePilotProvider(..._untrusted:unknown[]){return result('SYNTHETIC_LOCAL_DENIED');}
