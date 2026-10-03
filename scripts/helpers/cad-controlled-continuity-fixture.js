// Synthetic module substitution exists only in this test harness. Production
// has no verifier callback/configuration, trusted-evidence constructor or switch.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const prior = require('./cad-controlled-upload-host-fixture');
const files = ['offline/cad-convex/controlledUploadAuthorityContinuity.ts', 'convex/cadControlledUploadContinuityStore.ts'];
function loader(syntheticVerified = null) {
  const cache = new Map();
  function load(file) {
    if (!files.includes(file)) return prior.load(file);
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; cache.set(file, exports);
    const requireFixed = name => load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) + '.ts');
    vm.runInThisContext('(function(exports,require){' + compiled + '\n})', { filename: file })(exports, requireFixed);
    if (syntheticVerified && file === files[0]) {
      exports.verifyIndependentAuthorityContinuity = () => structuredClone(syntheticVerified);
      exports.verifyIndependentRegistrationApproval = () => structuredClone(syntheticVerified);
    }
    return exports;
  }
  return { contract: load(files[0]), store: load(files[1]) };
}
async function continuityFixture() {
  const f = await prior.fixture(), rows = await prior.databaseRows(f), real = loader();
  const principal = await f.principal('grant-custodian');
  rows.cadControlledUploadHostPrincipals.push({ _id: 'synthetic-custodian', _creationTime: 900, ...principal });
  const database = prior.syntheticDb(rows);
  const observation = await real.store.observeAuthorityCandidate(database.db, f.binding, principal, 0);
  const authorityGenerations = { login: 1,user: 1,membership: 1,uploadSession: 1,hostPrincipal: 1,grant: 0 };
  const anchor = { resourceBindingDigest: f.binding.resourceBindingDigest, scopeKey: f.state.scope.scopeKey,
    epoch: 3,epochDigest: 'c'.repeat(64),minimumSequence: 10,minimumScopeRevision: 0,lastTrustedTimeMs: 1000,authorityGenerations };
  const envelope = { schemaVersion: 1,identity: observation.identity,rowDigest: observation.rowDigest,authorityGenerations,
    epoch: 3,epochDigest: anchor.epochDigest,sequence: 10,scopeRevision: 0,observedAtMs: 1000,expiresAtMs: 1900,
    approvalDigest: f.binding.approvalRecordSha256,custodySubjectDigest: '2'.repeat(64),
    writerSubjectDigest: (await f.principal()).verifiedSubjectDigest,recoverySubjectDigest: (await f.principal('recovery')).verifiedSubjectDigest,
    custodianSubjectDigest: principal.verifiedSubjectDigest,requestNonceDigest:'1'.repeat(64),
    writerPrincipalDigest:await prior.model.hash(['controlled-approved-principal-v1',await f.principal()]),
    custodianPrincipalDigest:await prior.model.hash(['controlled-approved-principal-v1',principal]) };
  envelope.evidenceDigest = await prior.model.hash(['controlled-continuity-envelope-v1',envelope]);
  return { f, rows, database, principal, observation, anchor, envelope, real,
    input: { binding: f.binding,principalKey: principal.principalKey,evidence: envelope,requestNonceDigest: '1'.repeat(64) } };
}
module.exports = { ...prior, loader, continuityFixture };
