// Read-only fixed-source assertions. No provider, runtime execution or write mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-upload-authority-continuity.json';
const PRIOR_PACKET = 'docs/cad-auth-controlled-upload-durable-host-source.json';
const PRIOR_SOURCES = Object.freeze([
  'convex/schema.ts', 'convex/_generated/api.d.ts', 'convex/cadControlledUploadSchema.ts',
  'convex/cadControlledUploadStore.ts', 'convex/cadControlledUploadContinuityStore.ts', 'convex/cadControlledUploadHost.ts',
  'convex/cadUploadSessionGateway.ts', 'convex/http.ts',
  'offline/cad-convex/controlledUploadHostModel.ts', 'offline/cad-convex/controlledUploadHostBridge.ts',
  'offline/cad-convex/executionBlockers.json', 'offline/cad-convex/rollbackBaseline.json',
  'convex/developmentAuth.ts', 'convex/auth.ts',
  'scripts/helpers/cad-convex-schema-export.js', 'scripts/helpers/cad-controlled-upload-host-fixture.js',
  'scripts/cad-convex-codegen.js',
  'scripts/cad-convex-execution-blockers.test.js', 'scripts/cad-convex-rollback-compatibility.test.js',
  'scripts/tsconfig.cad-controlled-host.json', 'scripts/cad-auth-controlled-upload-durable-host-source.test.js',
  'scripts/cad-auth-controlled-upload-durable-host-implementation.test.js',
  'scripts/cad-auth-controlled-upload-durable-host-source-checker.js',
  'docs/cad-auth-controlled-upload-durable-host-source.md',
  'docs/cad-auth-controlled-upload-durable-host-integration-design.json',
  'scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js',
  'server/cadControlledUploadDurableHostAdapter.js',
  'server/index.js', 'server/cadControlledInternalUploadActivation.js', 'server/cadControlledUploadDigestDriftRepair.js',
  'server/cadControlledUploadObservableGateWiringRepair.js', 'server/cadProductionExecutableRuntimeMountCompletion.js', 'server/cadUserUploadRouter.js',
]);
const SOURCES = Object.freeze([...new Set([
  'offline/cad-convex/controlledUploadAuthorityContinuity.ts', 'convex/cadControlledUploadContinuityStore.ts',
  'scripts/tsconfig.cad-controlled-continuity.json', 'scripts/helpers/cad-controlled-continuity-fixture.js',
  'scripts/cad-auth-controlled-upload-authority-continuity.test.js',
  'scripts/cad-auth-controlled-upload-authority-continuity-checker.js',
  'docs/cad-auth-controlled-upload-authority-continuity.md', PRIOR_PACKET, ...PRIOR_SOURCES,
])]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_BYTES = 1024 * 1024;
function read(file) {
  if (file !== PACKET && !SOURCES.includes(file)) throw Error('FIXED_SOURCE_ONLY');
  let current = ROOT;
  const rootStat = fs.lstatSync(current);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw Error('SOURCE_INVALID');
  const parts = file.split('/');
  for (let i=0; i<parts.length; i++) {
    current = path.join(current,parts[i]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (i < parts.length-1 ? !stat.isDirectory() : !stat.isFile())
      || (i === parts.length-1 && stat.size > MAX_BYTES)) throw Error('SOURCE_INVALID');
  }
  const bytes = fs.readFileSync(current);
  if (bytes.length > MAX_BYTES) throw Error('SOURCE_INVALID');
  return bytes;
}
const result = ok => ({ ok, code: ok ? 'CONTINUITY_SOURCE_ASSERTIONS_PASS' : 'CONTINUITY_SOURCE_ASSERTIONS_BLOCKED',
  hostQualified: false, bodyAdmissionAuthorized: false, liveReady: false, costs: 0 });
function expectedPacket(readSource=read) {
  return { schemaVersion:1, artifact:'controlled-upload-authority-continuity-source-v1',
    status:'SOURCE_CANDIDATE_INDEPENDENT_PROVENANCE_UNAVAILABLE', assertionLevel:'synthetic-source-only',
    predecessorCommit:'23b2c4bf8e404d9f20c86f4f4a39f76c8e82d539', productionBaseCommit:'b4a310f84186697c8cb2d751c21bf79265969cad',
    predecessorPacketSha256:'a616a5ac62557ac91223d1efd6ec905400ce83282d2e3c6e54a43503496ada04',
    hostQualified:false, bodyAdmissionAuthorized:false, liveReady:false, costs:0, providerCalls:0,
    runtimeEffects:0, internalHandlersEnabled:true, provenanceAvailable:false, realRegistrationInstalled:false,
    schemaChanged:false, controlledTables:7, historicalBaselineRewritten:false, fixtureCompatible:false,
    authorizes:{privateReads:false,credentials:false,sessionIssuance:false,grantInstallation:false,activation:false,
      bodyRead:false,conversion:false,sandbox:false,externalMessages:false,publish:false,deploy:false,smoke:false},
    syntheticCoverage:['allowlisted identity projection','all binding and generation comparisons','anchor epoch and high-water regression',
      'missing and invalid clocks','private extras and accessors','input capture before awaits','commit returned restrictive denial',
      'preserve actual forward history and known generations','clone and restart stop retention','post-expiry and revoked cleanup',
      'safe corruption restriction and explicit ambiguous history denial','receipt failure transaction abort',
      'atomic registration plus irreversible reservation under test-only module substitution','legacy global collision guard',
      'production verifier always denies forged and restored evidence','registered internal handlers remain runtime-disconnected and fail-closed'],
    liveAcceptanceCasesExecuted:0, liveAcceptanceCasesPassed:0,
    unresolved:['authenticated independent transport and custody implementation','external non-rollbackable anchor and generation sources',
      'trusted clock and revocation-to-stream handoff','persistent quarantine for duplicate or unidentifiable/corrupt history',
      'stop persistence when database writes fail or revisions exhaust','baseline smoke and independent committed receipt readback',
      'host atomicity/OCC/restart/restore qualification','historical rollback incompatibility','retention and restrictive recovery scheduling'],
    sourceBindings:Object.fromEntries(SOURCES.map(file=>[file,hash(readSource(file))])),
  };
}
function plain(value,depth=0) {
  if(depth>12) return false;
  if(value===null || ['string','boolean'].includes(typeof value)) return true;
  if(typeof value==='number') return Number.isFinite(value);
  if(!value || typeof value!=='object' || (!Array.isArray(value) && Object.getPrototypeOf(value)!==Object.prototype)) return false;
  return Reflect.ownKeys(value).every(key=>{
    const d=Object.getOwnPropertyDescriptor(value,key);
    return typeof key==='string' && Object.hasOwn(d,'value') && plain(d.value,depth+1);
  });
}
function checkPacket(packet,readSource=read) {
  try {
    if(!plain(packet) || !packet || typeof packet!=='object') return result(false);
    const shape=expectedPacket(()=>Buffer.alloc(0));
    if(!packet.sourceBindings || !isDeepStrictEqual(Object.keys(packet.sourceBindings).sort(),[...SOURCES].sort())
      || !Object.values(packet.sourceBindings).every(v=>typeof v==='string' && /^[a-f0-9]{64}$/.test(v))) return result(false);
    shape.sourceBindings=packet.sourceBindings;
    if(!isDeepStrictEqual(shape,packet)) return result(false);
    const expected=expectedPacket(readSource);
    if(!isDeepStrictEqual(packet,expected) || expected.sourceBindings[PRIOR_PACKET]!==expected.predecessorPacketSha256) return result(false);
    const priorBytes=readSource(PRIOR_PACKET);
    if(hash(priorBytes)!==expected.predecessorPacketSha256) return result(false);
    const predecessor=JSON.parse(priorBytes);
    return result(isDeepStrictEqual(Object.keys(predecessor.sourceBindings).sort(),[...PRIOR_SOURCES].sort())
      && PRIOR_SOURCES.every(file=>predecessor.sourceBindings[file]===expected.sourceBindings[file]));
  } catch { return result(false); }
}
function checkCli(args,readSource=read) {
  if(args.length) return result(false);
  try{return checkPacket(JSON.parse(readSource(PACKET)),readSource);}catch{return result(false);}
}
if(require.main===module){const checked=checkCli(process.argv.slice(2));console.log(JSON.stringify(checked));process.exitCode=checked.ok?0:1;}
module.exports={PACKET,SOURCES,expectedPacket,checkPacket,checkCli};
