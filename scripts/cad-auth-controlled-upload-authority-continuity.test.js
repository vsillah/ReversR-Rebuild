const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, continuityFixture, model, fixture, syntheticDb, databaseRows } = require('./helpers/cad-controlled-continuity-fixture');
const clone = structuredClone;
async function reseal(e) { delete e.evidenceDigest; e.evidenceDigest = await model.hash(['controlled-continuity-envelope-v1', e]); return e; }
const stop = f => ({ scopeKey: f.state.scope.scopeKey, reason: 'unknown', clockObservation: 1100 });
const emptySlots = rows => Object.fromEntries(Object.entries(rows).map(([k,v]) => [k,
  k.startsWith('cadControlledUpload') && k !== 'cadControlledUploadHostPrincipals' ? [] : v]));

test('metadata equality is unverified and cannot manufacture production capability', async () => {
  const c = await continuityFixture();
  const r = await c.real.contract.compareContinuityMetadata(c.f.binding,c.observation,c.envelope,c.anchor,1100);
  assert.equal(r.metadataMatches,true); assert.equal(r.provenanceAvailable,false);
  for (const e of [null,c.envelope,{ ...c.envelope, verified: true },{ envelope: c.envelope,anchor: c.anchor }]) {
    assert.equal(c.real.contract.verifyIndependentAuthorityContinuity(e),null);
    assert.equal(c.real.contract.verifyIndependentRegistrationApproval(e),null);
    assert.equal(c.real.contract.admissionFromContinuity(e).bodyAdmissionAuthorized,false);
  }
  const hostile = new Proxy({}, { get() { throw Error('PRIVATE_SENTINEL'); } });
  assert.equal(c.real.contract.verifyIndependentAuthorityContinuity(hostile),null);
  const r2 = await c.real.store.registerGrantCandidate(hostile,c.input,1100);
  assert.equal(r2.code,'INDEPENDENT_REGISTRATION_APPROVAL_UNAVAILABLE');
  const { requestNonceDigest, ...projection } = c.input;
  assert.equal((await c.real.store.projectAuthenticatedAuthorityCandidate(hostile,projection,1100)).code,'INDEPENDENT_CUSTODY_UNAVAILABLE');
});

test('every identity and generation mismatch rejects even with recomputed metadata digest', async () => {
  const c = await continuityFixture(), compare = (e,a=c.anchor,o=c.observation,b=c.f.binding,n=1100) => c.real.contract.compareContinuityMetadata(b,o,e,a,n);
  for (const key of Object.keys(c.envelope.identity)) {
    const e = clone(c.envelope); e.identity[key] = /^[a-f0-9]{64}$/.test(e.identity[key]) ? '9'.repeat(64) : 'different-identity';
    await reseal(e); assert.notEqual((await compare(e)).metadataMatches,true,key);
  }
  for (const key of Object.keys(c.envelope.authorityGenerations)) {
    const e = clone(c.envelope); e.authorityGenerations[key]++; await reseal(e);
    assert.notEqual((await compare(e)).metadataMatches,true,key);
  }
  for (const key of ['epoch','sequence','scopeRevision','observedAtMs','expiresAtMs']) {
    const e = clone(c.envelope); e[key] = key === 'expiresAtMs' ? 1100 : e[key]-1; await reseal(e);
    assert.notEqual((await compare(e)).metadataMatches,true,key);
  }
  const restored = clone(c.anchor); restored.epoch++; restored.epochDigest='8'.repeat(64);
  assert.notEqual((await compare(c.envelope,restored)).metadataMatches,true);
  for (const now of [null,NaN,-1,999,1900,Infinity]) assert.notEqual((await compare(c.envelope,c.anchor,c.observation,c.f.binding,now)).metadataMatches,true);
});

test('malformed, forged, accessor and mutable metadata never become authority', async () => {
  const c = await continuityFixture(); let getters=0;
  const e = clone(c.envelope); Object.defineProperty(e,'identity',{ enumerable:true,get(){getters++; throw Error('PRIVATE');} });
  for (const bad of [null,{},e,{...c.envelope,extra:true},{...c.envelope,evidenceDigest:'0'.repeat(64)}]) {
    assert.notEqual((await c.real.contract.compareContinuityMetadata(c.f.binding,c.observation,bad,c.anchor,1100)).metadataMatches,true);
  }
  assert.equal(getters,0);
  const mutable=clone(c.envelope), pending=c.real.contract.compareContinuityMetadata(c.f.binding,c.observation,mutable,c.anchor,1100);
  mutable.identity.userId='changed-after-await';
  assert.equal((await pending).metadataMatches,true); // captured before first await
  const forged=clone(c.envelope); forged.custodySubjectDigest=forged.writerSubjectDigest; await reseal(forged);
  assert.notEqual((await c.real.contract.compareContinuityMetadata(c.f.binding,c.observation,forged,c.anchor,1100)).metadataMatches,true);
});

test('current row projection rejects changed user/login/upload/membership identities and generations', async () => {
  const c = await continuityFixture();
  for (const [table,key,value] of [
    ['authSessions','userId','wrong'],['cadUploadSessions','loginSessionId','wrong'],['cadUploadSessions','shopId','wrong'],
    ['cadUploadSessions','sessionId','wrong'],['cadUploadSessions','credentialDigest','0'.repeat(64)],
    ['cadUserAuthority','generation',2],['cadMemberships','generation',2],['cadMemberships','userId','wrong'],
  ]) {
    const rows=clone(c.rows); rows[table][0][key]=value;
    assert.equal(await c.real.store.observeAuthorityCandidate(syntheticDb(rows).db,c.f.binding,c.principal,0),null,table+key);
  }
  const rows=clone(c.rows); rows.cadUploadSessions[0].status='revoked';
  const observation=await c.real.store.observeAuthorityCandidate(syntheticDb(rows).db,c.f.binding,c.principal,0);
  assert.equal(observation.active,false);
});

test('restrictive stop commits on returned denial and survives clone/restart with no admission', async () => {
  const f=await fixture(); await f.advance('claimRun'); await f.advance('claimAttempt'); await f.advance('armRollback'); await f.advance('openBodyAdmissionFence');
  const db=syntheticDb(await databaseRows(f)), store=loader().store;
  const result=await db.transaction(d=>store.persistRestrictionCandidate(d,stop(f)));
  assert.equal(result.code,'SOURCE_STOP_PERSISTED'); assert.equal(result.bodyAdmissionAuthorized,false);
  const restarted=syntheticDb(clone(db.tables()));
  const state=await require('./helpers/cad-controlled-upload-host-fixture').load('convex/cadControlledUploadStore.ts').readCandidateState(restarted.db,f.state.scope.scopeKey);
  assert.equal(state.scope.permanentStop,true); assert.equal(state.attempt.fenceOpen,false); assert.equal(state.tombstone.revoked,true);
  const again=await restarted.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)));
  assert.equal(again.code,'SOURCE_STOP_ALREADY_PERSISTED'); assert.equal(restarted.writes(),0);
  assert.equal((await model.transition(state,{...f.command('claimAttempt'),expectedRevision:state.scope.revision},await f.principal(),f.auth,1100)).modelAccepted,false);
});

test('missing/regressed clocks and post-expiry/revocation cleanup persist only terminal restrictions', async () => {
  for (const now of [null,0,899,6000]) {
    const f=await fixture(), db=syntheticDb(await databaseRows(f));
    const r=await db.transaction(d=>loader().store.persistRestrictionCandidate(d,{...stop(f),clockObservation:now}));
    assert.equal(r.candidateWritten,true); const s=db.tables().cadControlledUploadScopes[0];
    assert.equal(s.lastHostTimeMs,900); assert.equal(s.permanentStop,true); assert.equal(s.runSpent,true);
    if(now===null||now<900) assert.equal(s.stopReason,'clock-regression');
    assert.equal(db.tables().cadControlledUploadAttempts[0].closed,true);
  }
  const f=await fixture(); await f.advance('claimRun'); await f.advance('revokeSessionAndLateGrants',2100);
  const db=syntheticDb(await databaseRows(f));
  assert.equal((await db.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).bodyAdmissionAuthorized,false);
  assert.equal(db.tables().cadControlledUploadScopes[0].stopReason,'revoked');
});

test('safe attempt corruption persists stop; ambiguous anchors, duplicate rows and revision exhaustion stay explicitly unresolved', async () => {
  const f=await fixture(); await f.advance('claimRun');
  const rows=await databaseRows(f); rows.cadControlledUploadAttempts[0].fenceOpen=true;
  const db=syntheticDb(rows);
  assert.equal((await db.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).candidateWritten,true);
  for(const kind of ['duplicate','identity','revision','grant']) {
    const bad=clone(rows);
    if(kind==='duplicate') bad.cadControlledUploadScopes.push(clone(bad.cadControlledUploadScopes[0]));
    if(kind==='identity') bad.cadControlledUploadAttempts[0].scopeId='other';
    if(kind==='revision') bad.cadControlledUploadScopes[0].revision=Number.MAX_SAFE_INTEGER;
    if(kind==='grant') bad.cadControlledUploadGrants[0].bindingDigest='0'.repeat(64);
    const database=syntheticDb(bad);
    if(kind==='duplicate') await assert.rejects(database.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f))),/^Error: SOURCE_STOP_TRANSACTION_ABORT$/);
    else assert.equal((await database.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).code,'STOP_ANCHOR_UNRESOLVED');
    assert.equal(database.writes(),0);
  }
});

test('receipt failure aborts stop writes; returned denial does not disguise rolled-back persistence', async () => {
  const f=await fixture(), rows=await databaseRows(f), db=syntheticDb(rows,true);
  await assert.rejects(db.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f))),/^Error: SOURCE_STOP_TRANSACTION_ABORT$/);
  assert.deepEqual(db.tables(),rows);
});

test('synthetic verifier substitution exercises atomic registration reservation only; real verifier still denies', async () => {
  const c=await continuityFixture(), rows=emptySlots(c.rows), db=syntheticDb(rows);
  const synthetic=loader({envelope:c.envelope,anchor:c.anchor});
  const r=await db.transaction(d=>synthetic.store.registerGrantCandidate(d,c.input,1100));
  assert.equal(r.candidateWritten,true); assert.equal(r.hostQualified,false); assert.equal(r.bodyAdmissionAuthorized,false);
  for(const table of ['Grants','Scopes','Attempts','SessionTombstones','Receipts']) assert.equal(db.tables()['cadControlledUpload'+table].length,1,table);
  assert.equal(db.tables().cadControlledUploadScopes[0].runSpent,true);
  assert.equal(db.tables().cadControlledUploadAttempts[0].fenceOpen,false);
  assert.equal(c.real.contract.verifyIndependentRegistrationApproval(c.envelope),null);
  const again=await db.transaction(d=>synthetic.store.registerGrantCandidate(d,c.input,1100));
  assert.equal(again.code,'REGISTRATION_SLOT_UNAVAILABLE');
  const failed=syntheticDb(rows,true);
  await assert.rejects(failed.transaction(d=>synthetic.store.registerGrantCandidate(d,c.input,1100)),/^Error: SOURCE_REGISTRATION_TRANSACTION_ABORT$/);
  assert.deepEqual(failed.tables(),rows);
});

test('registration denies all prior scope/grant/session/run slots including legacy different cohorts and corrupt duplicates', async () => {
  const c=await continuityFixture(), synthetic=loader({envelope:c.envelope,anchor:c.anchor});
  for(const table of ['Scopes','Grants','Attempts','SessionTombstones']) {
    const f=await fixture(); await f.advance('claimRun'); const populated=await databaseRows(f);
    for(const mode of ['matching','different-cohort','duplicate','corrupt']) {
      const rows=emptySlots(c.rows), name='cadControlledUpload'+table;
      rows[name]=clone(populated[name]);
      if(mode==='different-cohort' && ['Scopes','Grants'].includes(table)) rows[name][0].scopeKey='8'.repeat(64);
      if(mode==='duplicate') rows[name].push(clone(rows[name][0]));
      if(mode==='corrupt') rows[name][0].unexpected=true;
      const db=syntheticDb(rows);
      try { assert.equal((await db.transaction(d=>synthetic.store.registerGrantCandidate(d,c.input,1100))).candidateWritten,undefined); }
      catch(e) { assert.equal(e.message,'SOURCE_REGISTRATION_TRANSACTION_ABORT'); }
      assert.equal(db.writes(),0,table+mode);
    }
  }
});

test('allowlisted row metadata ignores private extras and getters without reading or hashing them', async () => {
  const c=await continuityFixture(); let accessed=0;
  for(const table of ['users','authSessions','cadUserAuthority','cadMemberships','cadUploadSessions']) {
    const row=c.database.tables()[table][0]; row.privateExtra='SYNTHETIC_PRIVATE_SENTINEL';
    Object.defineProperty(row,'privateGetter',{enumerable:true,get(){accessed++;throw Error('SYNTHETIC_PRIVATE_SENTINEL');}});
  }
  const observed=await c.real.store.observeAuthorityCandidate(c.database.db,c.f.binding,c.principal,0);
  assert.deepEqual(observed,c.observation); assert.equal(accessed,0);
  assert.equal(JSON.stringify(observed).includes('SYNTHETIC_PRIVATE_SENTINEL'),false);
  for(const p of [{...c.principal,expiresAtMs:NaN},{...c.principal,expiresAtMs:-1},
    {...c.principal,resourceBindingDigest:'0'.repeat(64)}]) {
    assert.equal(await c.real.store.observeAuthorityCandidate(c.database.db,c.f.binding,p,0),null);
  }
});

test('restrictive reservations preserve actual forward history and generations at every phase', async () => {
  const phases=['claimRun','claimAttempt','armRollback','openBodyAdmissionFence','consumeAttemptBeforeBodyRead'];
  for(let count=0;count<=phases.length;count++) {
    const f=await fixture(); for(const phase of phases.slice(0,count)) await f.advance(phase);
    const before=clone(f.state.attempt), db=syntheticDb(await databaseRows(f));
    assert.equal((await db.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).candidateWritten,true);
    const after=db.tables().cadControlledUploadAttempts[0];
    for(const key of ['attemptSpent','rollbackArmed','fenceOpenedOnce','consumed']) assert.equal(after[key],before?.[key]??false,key+' at '+count);
    if(before) assert.deepEqual(after.authorityGenerations,before.authorityGenerations);
    assert.equal(after.fenceOpen,false); assert.equal(after.closed,true);
  }
  const f=await fixture(); await f.advance('claimRun');
  const rows=await databaseRows(f); rows.cadControlledUploadAttempts[0].consumed='corrupt';
  const db=syntheticDb(rows);
  assert.equal((await db.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).code,'STOP_HISTORY_UNRESOLVED');
  assert.equal(db.writes(),0);
  const missing=await databaseRows(f); missing.cadControlledUploadAttempts=[];
  const missingDb=syntheticDb(missing);
  assert.equal((await missingDb.transaction(d=>loader().store.persistRestrictionCandidate(d,stop(f)))).code,'STOP_HISTORY_UNRESOLVED');
  assert.equal(missingDb.writes(),0);
});

test('anchor generation, binding mutation and every authority link stay bound despite fresh self-hashes', async () => {
  const c=await continuityFixture();
  for(const key of Object.keys(c.anchor.authorityGenerations)) {
    const anchor=clone(c.anchor); anchor.authorityGenerations[key]++;
    assert.notEqual((await c.real.contract.compareContinuityMetadata(c.f.binding,c.observation,c.envelope,anchor,1100)).metadataMatches,true);
  }
  for(const key of model.BINDING_FIELDS) {
    const b=clone(c.f.binding), value=b[key];
    b[key]=typeof value==='boolean'?!value:typeof value==='number'?value+1:typeof value==='string'?value+'x':null;
    assert.notEqual((await c.real.contract.compareContinuityMetadata(b,c.observation,c.envelope,c.anchor,1100)).metadataMatches,true,key);
  }
  const synthetic=loader({envelope:c.envelope,anchor:c.anchor});
  for(const nonce of [null,'bad','0'.repeat(63)]) {
    const db=syntheticDb(emptySlots(c.rows));
    assert.equal((await synthetic.store.registerGrantCandidate(db.db,{...c.input,requestNonceDigest:nonce},1100)).code,'INPUT_INVALID');
    assert.equal(db.writes(),0);
  }
  const mismatchDb=syntheticDb(emptySlots(c.rows));
  assert.equal((await synthetic.store.registerGrantCandidate(mismatchDb.db,{...c.input,requestNonceDigest:'9'.repeat(64)},1100)).code,'REGISTRATION_EVIDENCE_REJECTED');
  assert.equal(mismatchDb.writes(),0);
  const rows=emptySlots(c.rows), db=syntheticDb(rows), mutable=clone(c.input);
  const pending=db.transaction(d=>synthetic.store.registerGrantCandidate(d,mutable,1100));
  mutable.binding.userId='changed-after-await'; mutable.requestNonceDigest='9'.repeat(64);
  assert.equal((await pending).candidateWritten,true);
  assert.equal(db.tables().cadControlledUploadGrants[0].binding.userId,c.f.binding.userId);
  assert.equal(db.tables().cadControlledUploadAttempts[0].requestNonceDigest,c.input.requestNonceDigest);
});

test('synthetic authenticated projection still requires writer role/key/resource and rejects expired rows', async () => {
  const c=await continuityFixture(), synthetic=loader({envelope:c.envelope,anchor:c.anchor});
  const {requestNonceDigest,...input}=c.input;
  assert.equal((await synthetic.store.projectAuthenticatedAuthorityCandidate(c.database.db,input,1100)).code,'AUTHORITY_MISSING');
  input.principalKey=(await c.f.principal()).principalKey;
  assert.equal((await synthetic.store.projectAuthenticatedAuthorityCandidate(c.database.db,input,1100)).metadataMatches,true);
  const rows=clone(c.rows); rows.authSessions[0].expirationTime=1000;
  assert.equal((await synthetic.store.projectAuthenticatedAuthorityCandidate(syntheticDb(rows).db,input,1100)).metadataMatches,false);
});

test('continuity source packet rejects each drift and every authority/metadata promotion', () => {
  const fs=require('node:fs'), checker=require('./cad-auth-controlled-upload-authority-continuity-checker');
  const packet=checker.expectedPacket(); assert.equal(checker.checkPacket(packet).ok,true);
  for(const file of checker.SOURCES) assert.equal(checker.checkPacket(packet,p=>Buffer.concat([fs.readFileSync(p),Buffer.from(p===file?'drift':'')])).ok,false,file);
  for(const key of Object.keys(packet).filter(k=>packet[k]===false)) assert.equal(checker.checkPacket({...packet,[key]:true}).ok,false,key);
  for(const key of Object.keys(packet.authorizes)) assert.equal(checker.checkPacket({...packet,authorizes:{...packet.authorizes,[key]:true}}).ok,false,key);
  for(const key of ['costs','providerCalls','runtimeEffects','liveAcceptanceCasesExecuted','liveAcceptanceCasesPassed']) assert.equal(checker.checkPacket({...packet,[key]:1}).ok,false,key);
  let reads=0,getters=0; const denied=()=>{reads++;throw Error('PRIVATE_SENTINEL');};
  const accessor={...packet}; Object.defineProperty(accessor,'status',{get(){getters++;throw Error('PRIVATE_SENTINEL');}});
  for(const bad of [null,{},[],accessor,{...packet,extra:true},{...packet,sourceBindings:{}}]) assert.equal(checker.checkPacket(bad,denied).ok,false);
  for(const args of [['--write'],['--live'],['/synthetic/private']]) assert.equal(checker.checkCli(args,denied).ok,false);
  assert.equal(reads,0);assert.equal(getters,0);
});

test('continuity checker filesystem errors, component symlinks and size violations stay sanitized', () => {
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'cad-auth-controlled-upload-authority-continuity-checker.js'),'utf8');
  for(const fault of ['root','directory','file','size','error']) {
    let reads=0,stats=0; const fakeFs={lstatSync(){const n=stats++;
      if(fault==='error')throw Error('PRIVATE_SENTINEL');
      return {isSymbolicLink:()=>n===({root:0,directory:1,file:2}[fault]),isDirectory:()=>n<2,isFile:()=>n===2,size:fault==='size'?1048577:12};},
      readFileSync(){reads++;throw Error('PRIVATE_SENTINEL');}};
    const exports={},module={exports};const load=name=>name==='node:fs'?fakeFs:require(name);
    vm.runInThisContext('(function(require,module,exports,__dirname){'+source+'\n})')(load,module,exports,__dirname);
    const r=module.exports.checkCli([]);assert.equal(r.ok,false);assert.equal(reads,0);assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);
  }
});

test('restricted checker harness never imports local sources or executes substituted predecessor code', () => {
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
  const checker=require('./cad-auth-controlled-upload-authority-continuity-checker');
  const source=fs.readFileSync(path.join(__dirname,'cad-auth-controlled-upload-authority-continuity-checker.js'),'utf8');
  const target='scripts/cad-auth-controlled-upload-durable-host-source-checker.js';
  const root=path.resolve(__dirname,'..');
  const originals=Object.fromEntries(checker.SOURCES.map(file=>[file,fs.readFileSync(path.join(root,file))]));
  const packet=checker.expectedPacket(file=>originals[file]);
  for(const mode of ['invalid-cli','invalid-metadata','symlink','substitution']) {
    let reads=0,targetReads=0;
    const fakeFs={
      lstatSync(file){const rel=path.relative(root,file);const isFile=rel===checker.PACKET||checker.SOURCES.includes(rel);
        return {isDirectory:()=>!isFile,isFile:()=>isFile,isSymbolicLink:()=>mode==='symlink'&&rel===target,size:100};},
      readFileSync(file){reads++;const rel=path.relative(root,file);
        if(rel===checker.PACKET)return Buffer.from(JSON.stringify(packet));
        if(!checker.SOURCES.includes(rel))throw Error('UNALLOWED_READ');
        if(rel===target){targetReads++;if(mode==='substitution')return Buffer.from('throw new Error("ATTACKER_CODE_EXECUTED")');}
        return originals[rel];},
    };
    const exports={},module={exports};
    const allowed=new Set(['node:fs','node:path','node:crypto','node:util']);
    const load=name=>{assert.equal(allowed.has(name),true,'local import forbidden: '+name);return name==='node:fs'?fakeFs:require(name);};
    vm.runInThisContext('(function(require,module,exports,__dirname){'+source+'\n})')(load,module,exports,__dirname);
    const result=mode==='invalid-metadata'?module.exports.checkPacket({unknown:true})
      :module.exports.checkCli(mode==='invalid-cli'?['--write']:[]);
    assert.equal(result.ok,false);
    if(mode.startsWith('invalid'))assert.equal(reads,0);
    if(mode==='symlink')assert.equal(targetReads,0);
    assert.equal(JSON.stringify(result).includes('ATTACKER'),false);
  }
});

test('unchanged independent fixture evidence rejects recomputed replacement principal keys and policies for both roles', async () => {
  const c=await continuityFixture();
  const changes={verifiedIssuer:'replacement-issuer',verifiedAudience:'replacement-audience',approvedPolicyDigest:'6'.repeat(64),
    resourceBindingDigest:'7'.repeat(64),role:'recovery',generation:2,expiresAtMs:4500,active:false,verifiedSubjectDigest:'8'.repeat(64)};
  for(const role of ['writer','grant-custodian']) for(const [key,value] of Object.entries(changes)) {
    const rows=emptySlots(clone(c.rows)), row=rows.cadControlledUploadHostPrincipals.find(p=>p.role===role);
    row[key]=value;
    row.principalKey=await model.hash(['controlled-principal-v1',row.verifiedIssuer,row.verifiedAudience,row.verifiedSubjectDigest,row.role,row.resourceBindingDigest]);
    const db=syntheticDb(rows), synthetic=loader({envelope:c.envelope,anchor:c.anchor});
    const input={...clone(c.input),principalKey:row.principalKey};
    if(role==='writer') {
      delete input.requestNonceDigest;
      const result=await synthetic.store.projectAuthenticatedAuthorityCandidate(db.db,input,1100);
      assert.notEqual(result.metadataMatches,true,role+key);
    } else {
      try {assert.notEqual((await synthetic.store.registerGrantCandidate(db.db,input,1100)).candidateWritten,true,role+key);}
      catch(error){assert.equal(error.message,'SOURCE_REGISTRATION_TRANSACTION_ABORT');}
    }
    assert.equal(db.writes(),0,role+key);
  }
});
