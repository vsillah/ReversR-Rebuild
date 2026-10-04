'use strict';
// Read-only guard. Built-ins only; no predecessor module is required or executed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PACKET = 'docs/cad-pilot-local-source.json';
const PACKET_SHA = 'a7a7686498c4e4b19c956164588bf5c4a4904966eb669a11ca3295c4484708a3';
const SOURCES = Object.freeze([
  "offline/cad-convex/controlledUploadAuthorityContinuity.ts",
  "convex/cadControlledUploadContinuityStore.ts",
  "scripts/tsconfig.cad-controlled-continuity.json",
  "scripts/helpers/cad-controlled-continuity-fixture.js",
  "scripts/cad-auth-controlled-upload-authority-continuity.test.js",
  "scripts/cad-auth-controlled-upload-authority-continuity-checker.js",
  "docs/cad-auth-controlled-upload-authority-continuity.md",
  "docs/cad-auth-controlled-upload-durable-host-source.json",
  "convex/schema.ts",
  "convex/cadControlledUploadSchema.ts",
  "convex/cadControlledUploadStore.ts",
  "convex/cadControlledUploadHost.ts",
  "offline/cad-convex/controlledUploadHostModel.ts",
  "offline/cad-convex/controlledUploadHostBridge.ts",
  "offline/cad-convex/executionBlockers.json",
  "offline/cad-convex/rollbackBaseline.json",
  "convex/developmentAuth.ts",
  "convex/auth.ts",
  "scripts/helpers/cad-convex-schema-export.js",
  "scripts/helpers/cad-controlled-upload-host-fixture.js",
  "scripts/cad-convex-execution-blockers.test.js",
  "scripts/cad-convex-rollback-compatibility.test.js",
  "scripts/tsconfig.cad-controlled-host.json",
  "scripts/cad-auth-controlled-upload-durable-host-source.test.js",
  "scripts/cad-auth-controlled-upload-durable-host-source-checker.js",
  "docs/cad-auth-controlled-upload-durable-host-source.md",
  "docs/cad-auth-controlled-upload-durable-host-integration-design.json",
  "scripts/cad-auth-controlled-upload-durable-host-integration-design-checker.js",
  "server/index.js",
  "server/cadControlledInternalUploadActivation.js",
  "server/cadControlledUploadDigestDriftRepair.js",
  "server/cadControlledUploadObservableGateWiringRepair.js",
  "server/cadProductionExecutableRuntimeMountCompletion.js",
  "server/cadUserUploadRouter.js",
  "docs/cad-auth-controlled-upload-authority-continuity.json",
  "docs/cad-auth-controlled-upload-host-custody-setup-proposal.md",
  "offline/cad-gcp/journal.ts",
  "offline/cad-gcp/resources.proposed.json",
  "scripts/tsconfig.cad-gcp-custody.json",
  "scripts/cad-gcp-custody-source.test.js",
  "scripts/cad-gcp-custody-source-checker.test.js",
  "docs/cad-gcp-custody-source.md",
  "docs/cad-gcp-custody-source.json",
  "scripts/cad-gcp-custody-source-checker.js",
  "offline/cad-gcp/googleIdentityFormat.ts",
  "offline/cad-gcp/googleIdentityVerifier.ts",
  "offline/cad-gcp/googleJwksTransport.ts",
  "scripts/cad-gcp-google-identity.test.js",
  "scripts/cad-gcp-google-identity-source-checker.test.js",
  "scripts/tsconfig.cad-gcp-google-identity.json",
  "docs/cad-gcp-google-identity-source.md",
  "docs/cad-gcp-google-identity-source.json",
  "scripts/cad-gcp-google-identity-source-checker.js",
  "docs/cad-auth-controlled-upload-google-setup-decision.md",
  "offline/cad-pilot/control.ts",
  "offline/cad-pilot/policy.proposed.json",
  "scripts/cad-pilot-control.test.js",
  "scripts/cad-pilot-control-source-checker.test.js",
  "scripts/tsconfig.cad-pilot-control.json",
  "docs/cad-pilot-control-source.md",
  "docs/cad-pilot-control-source.json",
  "scripts/cad-pilot-control-source-checker.js",
  "offline/cad-pilot-local/sqlite.ts",
  "scripts/helpers/cad-pilot-local-fixture.js",
  "scripts/cad-pilot-local.test.js",
  "scripts/tsconfig.cad-pilot-local.json",
  "docs/cad-pilot-local-source.md",
  "scripts/cad-pilot-local-source-checker.test.js"
]);
const FILES = Object.freeze([PACKET, ...SOURCES]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function read(root, relative, io) {
  if (!FILES.includes(relative)) throw Error('GUARD');
  const full = path.resolve(root, relative);
  let current = path.parse(full).root;
  const parts = full.slice(current.length).split(path.sep);
  for (let index=0; index<parts.length; index++) {
    current = path.join(current,parts[index]);
    const stat = io.lstatSync(current);
    if (stat.isSymbolicLink() || (index<parts.length-1 ? !stat.isDirectory() : !stat.isFile())) throw Error('GUARD');
    if (index===parts.length-1 && stat.size>1048576) throw Error('GUARD');
  }
  const bytes=io.readFileSync(full);
  if(bytes.length>1048576)throw Error('GUARD');
  return bytes;
}
function check(root=path.resolve(__dirname,'..'), argv=[], io=fs) {
  const closed={hostQualified:false,bodyAdmissionAuthorized:false,liveReady:false,costs:0,providerCalls:0};
  // Invalid invocation is rejected before any filesystem observation.
  try {
    if(!Array.isArray(argv) || argv.length!==0) return {...closed,ok:false,code:'GCP_CHECK_ARGUMENTS_INVALID'};
  } catch { return {...closed,ok:false,code:'GCP_CHECK_ARGUMENTS_INVALID'}; }
  try {
    const bytes=read(root,PACKET,io);
    if(sha(bytes)!==PACKET_SHA)throw Error('GUARD');
    const p=JSON.parse(bytes);
    if(p.status!=='SOURCE_ONLY_UNQUALIFIED' || p.phase!==7 || p.hostQualified!==false || p.bodyAdmissionAuthorized!==false
      || p.independentProvenance!==false || p.riskAccepted!==false || p.admissionExceptionAuthorized!==false || p.spendingAuthorized!==false || p.productionProviderPathEnabled!==false || p.liveReady!==false || p.fixtureCompatible!==false || p.costs!==0 || p.providerCalls!==0
      || Object.keys(p.sourceBindings).length!==SOURCES.length
      || SOURCES.some(file=>!Object.hasOwn(p.sourceBindings,file) || !/^[a-f0-9]{64}$/.test(p.sourceBindings[file])))throw Error('GUARD');
    for(const file of SOURCES)if(sha(read(root,file,io))!==p.sourceBindings[file])throw Error('GUARD');
    return {...closed,ok:true,code:'GCP_SOURCE_CHECKPOINT_CLOSED',verifiedFiles:FILES.length};
  } catch { return {...closed,ok:false,code:'GCP_SOURCE_GUARD_REJECTED'}; }
}
module.exports={check,FILES};
if(require.main===module) {
  const result=check(path.resolve(__dirname,'..'),process.argv.slice(2));
  process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.ok?0:1;
}
