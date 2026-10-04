'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const checker = require('./cad-pilot-local-source-checker');
const root = path.resolve(__dirname, '..');
function sandbox() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cad-pilot-local-')));
  for (const file of checker.FILES) { fs.mkdirSync(path.dirname(path.join(dir,file)), {recursive:true}); fs.copyFileSync(path.join(root,file),path.join(dir,file)); }
  return dir;
}
test('valid source checkpoint stays closed; malformed CLI reads nothing', () => {
  const good = checker.check(root, []); assert.equal(good.ok, true);
  for (const key of ['hostQualified','bodyAdmissionAuthorized','liveReady']) assert.equal(good[key], false);
  let reads = 0;
  const hostile = { readFileSync() { reads++; throw Error('PRIVATE'); }, lstatSync() { reads++; throw Error('PRIVATE'); } };
  for (const args of [['--root=/private'], ['--json'], [''], [null]]) assert.equal(checker.check(root,args,hostile).ok,false);
  const revoked = Proxy.revocable([], {}); revoked.revoke();
  for (const args of [new Proxy([], { get() { throw Error('SYNTHETIC_SENTINEL'); } }), revoked.proxy]) {
    const result = checker.check(root,args,hostile);
    assert.equal(result.code,'GCP_CHECK_ARGUMENTS_INVALID');
    assert.equal(result.ok,false);
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_SENTINEL'),false);
  }
  assert.equal(reads,0);
});
test('every allowlisted source drift fails without local module evaluation', () => {
  const dir = sandbox();
  try {
    for (const file of checker.FILES) {
      const target = path.join(dir,file), bytes = fs.readFileSync(target);
      fs.appendFileSync(target,'\nthrow new Error("PRIVATE_SUBSTITUTION");');
      const result = checker.check(dir,[]); assert.equal(result.ok,false,file);
      assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
      fs.writeFileSync(target,bytes);
    }
    assert.equal(checker.check(dir,[]).ok,true);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test('symlink files and parent directories reject before reading target bytes', () => {
  for (const kind of ['file','directory']) {
    const dir = sandbox();
    try {
      const target = path.join(dir, kind==='file' ? 'offline/cad-pilot-local/sqlite.ts' : 'offline/cad-pilot-local');
      const moved = target + '.original'; fs.renameSync(target,moved); fs.symlinkSync(moved,target);
      let targetReads=0;
      const adapter={ lstatSync:fs.lstatSync,readFileSync(name,...args) { if(name===path.join(dir,'offline/cad-pilot-local/sqlite.ts'))targetReads++; return fs.readFileSync(name,...args); } };
      assert.equal(checker.check(dir,[],adapter).ok,false); assert.equal(targetReads,0);
    } finally { fs.rmSync(dir,{recursive:true,force:true}); }
  }
});
test('packet substitution, unsafe metadata and promoted flags cannot select extra source paths', () => {
  const dir=sandbox();
  try {
    const target=path.join(dir,checker.FILES[0]), bytes=fs.readFileSync(target);
    for(const mutation of [p=>{p.hostQualified=true;},p=>{p.sourceBindings['../../private']='a'.repeat(64);},p=>{p.sourceBindings={};}]) {
      const packet=JSON.parse(bytes);mutation(packet);fs.writeFileSync(target,JSON.stringify(packet));
      let reads=0;
      const adapter={lstatSync:fs.lstatSync,readFileSync(...args){reads++;return fs.readFileSync(...args);}};
      assert.equal(checker.check(dir,[],adapter).ok,false);assert.equal(reads,1);
    }
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
