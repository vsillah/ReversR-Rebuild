// Fixed local source assertions only; no provider, runtime import or write mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-controlled-upload-durable-host-source.json';
const SOURCES = Object.freeze([
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
const SERVER_HASHES = Object.freeze({
  'server/index.js': '64e2d87cd009189285fca4725e8c5bdafee3b210102f7389c507f20d0c4dc945',
  'server/cadControlledInternalUploadActivation.js': 'f53b8264e7307ab7b7d1fe68230162293f4d16249d165416c8db0db1f61d72d3',
  'server/cadControlledUploadDigestDriftRepair.js': 'de9317d748bd83045b4d2680b57566948d5defa27c01af0ddf952d1b366d5b0d',
  'server/cadControlledUploadObservableGateWiringRepair.js': '66b0a4fc74aab4a0de1e118a2ec2bc01421eff2a19fee7636d3b4b34b9150095',
  'server/cadProductionExecutableRuntimeMountCompletion.js': '0487b690b87865844c5efd29622f858a84db5338d752ab86c759a116c47c71e5',
  'server/cadUserUploadRouter.js': '505edcadacc870be65d9ef7db72bfdcc3eeb9fa72b4802c225a163b1532dee7d',
});
const read = file => {
  if (file !== PACKET && !SOURCES.includes(file)) throw Error('FIXED_SOURCE_ONLY');
  let current = ROOT;
  const rootStat = fs.lstatSync(current);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw Error('SOURCE_INVALID');
  const parts = file.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw Error('SOURCE_INVALID');
    if (i === parts.length - 1 && stat.size > 1024 * 1024) throw Error('SOURCE_TOO_LARGE');
  }
  const bytes = fs.readFileSync(current);
  if (bytes.length > 1024 * 1024) throw Error('SOURCE_TOO_LARGE');
  return bytes;
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const coverage = {
  'independent-workers': 'pure replay and stale revision rejection; no provider race proof',
  restart: 'cloned spent state rejected; no actual host restart',
  concurrency: 'stale revision model only; serializability unqualified',
  'duplicate-keys': 'bounded typed store duplicate rejection; persistent corruption stop unresolved',
  'window-card-deployment-replay': 'stable keys and changed full-binding digest',
  'binding-mismatch': 'mutation of every immutable binding field',
  'grant-forgery': 'strict stored binding; registered grant handler always denies; approval/custody verification unresolved',
  'host-principal': 'role/generation/expiry model and stored subject separation; transport verifier always denies',
  'user-authority': 'existing row lookup and missing authority; absent login/upload generation proof blocks forward store path',
  'exact-boundary': 'synthetic start inclusive/end exclusive values',
  'clock-regression': 'model denial; durable automatic regression stop unresolved',
  'late-response': 'stream handoff verifier always denies; no network timing simulation',
  'revocation-handoff': 'verifier always denies; strict linearization unresolved',
  'lost-response': 'markUnknown and retained spent state; no host lost-response proof',
  'crash-boundaries': 'synthetic unknown after each forward model phase only; no process/stream crash qualification',
  'close-failure': 'existing synthetic runner rollback failures and no proof headers',
  'revoke-failure': 'synthetic transaction abort on receipt failure plus existing runner forgery tests',
  'smoke-failure': 'independent smoke verifier/handler always deny; no smoke performed',
  'receipt-forgery': 'strict metadata and denied verifier; no independent committed readback qualification',
  'denied-route': 'unchanged startup route synthetic regressions: zero subscription and absent proof headers',
  'post-expiry-recovery': 'pure restrictive recovery and typed fixture writes after expiry',
  'backup-restore': 'old state can replay in pure model; custody verifier always denies; restoration continuity unresolved',
  'internal-occ': 'not simulated; pure proposals only; provider reexecution unqualified',
  'privacy-retention': 'accessor/extra-field rejection and sanitized errors; retention/custody unqualified',
  'headers-success-contract': 'all registered outputs keep body admission false; startup route remains blocked',
};
function expectedPacket(readSource = read) {
  return {
    schemaVersion: 1, artifact: 'cad-controlled-upload-durable-host-source-v1',
    status: 'SOURCE_INTERNAL_HOST_REGISTERED_RUNTIME_BLOCKED', assertionLevel: 'synthetic-source-only',
    baseCommit: '5535c2c4b52a0d9e6c483307e521f65e0a472148', productionBaseCommit: 'b4a310f84186697c8cb2d751c21bf79265969cad',
    hostQualified: false, bodyAdmissionAuthorized: false, liveReady: false, costs: 0,
    publicIngressRegistered: false, internalHandlersEnabled: true, generationEvidenceComplete: false,
    fixtureCompatible: false, hostRollbackQualified: false, historicalBaselineRewritten: false,
    proposedTables: 7, currentTables: 19, historicalBaselineTables: 10,
    sourceAtomicityIsHostProof: false, registrationInstalled: false, independentEvidenceVerified: false,
    authorizes: { provider: false, privateReads: false, credentialCreation: false, sessionIssuance: false,
      grantInstallation: false, activation: false, bodyRead: false, conversion: false, sandbox: false,
      cardIssuance: false, livePhrase: false, externalMessages: false, publish: false, deploy: false, smoke: false },
    unresolved: ['host transport authentication', 'independent approval and custody/restore continuity',
      'login/upload session generation evidence', 'independent receipt and smoke verification',
      'trusted clock and revocation-to-stream handoff', 'persistent automatic corruption/clock-regression stop',
      'qualified grant installation and baseline evidence installation', 'retention and bounded recovery qualification'],
    acceptanceCoverage: Object.entries(coverage).map(([id, syntheticCoverage]) => ({ id, syntheticCoverage, liveExecuted: false, livePassed: false })),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, hash(readSource(file))])),
  };
}
function checkPacket(packet, readSource = read) {
  let ok = false;
  try {
    const plainData = (value, depth = 0) => {
      if (depth > 12) return false;
      if (value === null || ['string','boolean','number'].includes(typeof value)) return true;
      if (!value || typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) return false;
      return Reflect.ownKeys(value).every(key => {
        if (typeof key !== 'string') return false;
        const d = Object.getOwnPropertyDescriptor(value, key);
        return Object.hasOwn(d, 'value') && plainData(d.value, depth + 1);
      });
    };
    if (!plainData(packet) || !packet || typeof packet !== 'object') throw Error('PACKET_INVALID');
    const shape = expectedPacket(() => Buffer.alloc(0));
    if (!packet.sourceBindings || !isDeepStrictEqual(Object.keys(packet.sourceBindings).sort(), [...SOURCES].sort())
      || !Object.values(packet.sourceBindings).every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value))) throw Error('PACKET_INVALID');
    shape.sourceBindings = packet.sourceBindings;
    if (!isDeepStrictEqual(packet, shape)) throw Error('PACKET_INVALID');
    const expected = expectedPacket(readSource);
    ok = isDeepStrictEqual(packet, expected)
      && Object.entries(SERVER_HASHES).every(([file, digest]) => expected.sourceBindings[file] === digest);
  } catch { /* fixed diagnostics only */ }
  return { ok, code: ok ? 'SOURCE_HOST_CANDIDATE_ASSERTIONS_PASS' : 'SOURCE_HOST_CANDIDATE_ASSERTIONS_BLOCKED',
    hostQualified: false, bodyAdmissionAuthorized: false, liveReady: false, costs: 0, fixtureCompatible: false };
}
if (require.main === module) {
  const result = checkCli(process.argv.slice(2));
  console.log(JSON.stringify(result)); process.exitCode = result.ok ? 0 : 1;
}
function checkCli(args, readSource = read) {
  if (args.length) return checkPacket(null);
  try { return checkPacket(JSON.parse(readSource(PACKET)), readSource); }
  catch { return checkPacket(null); }
}
module.exports = { SOURCES, PACKET, expectedPacket, checkPacket, checkCli };
