// Fixed public source allowlist. Synthetic composition only; no live issuer.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const {
  CURRENT_DEPLOYMENT_METADATA_POLICY, REVIEWED_WINDOW,
  PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF, SESSION_CREDENTIAL_DIGEST_SHA256,
  createCadLiveOpeningGateCredentialClosure, createProofPrivateSessionCredentialSupply,
} = require('../server/cadLiveOpeningGateCredentialClosure');
const { readCadProductionCurrentDeploymentMetadata } = require('../server/cadProductionCurrentDeploymentMetadata');
const { METHODS } = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-credential-closure-binding-repair.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const BOUND_INPUTS = Object.freeze({
  baseCommit: '56a29e337ceb459c66f83d7f5207b7ba74f65686',
  stoppedPostMergeRebindDispositionSha256: '2b47414dda01f46bea2a83d9b5b9b332393f0f53f657ee2db9986af728c092fd',
  credentialClosurePacketSha256: '57675e09d0bd717a4ce6e372e4f49a3c9c494b4dabb29194c3a973a9405584e8',
  credentialClosureSourceCommit: '4f25f2f1ab3df8964c9aeaba0dafb0216b226637',
  githubProductionDeployment: '6772517435',
  productionTarget: 'https://reversr-a261m8i6x-vsillahs-projects.vercel.app',
  suppliedHistoricalSmoke: { status: 401, code: 'USER_SESSION_REQUIRED', observedNoLaterThanUtc: '2026-09-30T23:39:21Z' },
});
// No dpl ID is supplied here. The proof uses only non-secret Vercel system
// target and commit metadata that are available without provider credentials.
const PROOF_ENV = Object.freeze({
  VERCEL_ENV: 'production',
  VERCEL_URL: 'reversr-a261m8i6x-vsillahs-projects.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'reversr.vercel.app',
  VERCEL_GIT_COMMIT_SHA: BOUND_INPUTS.baseCommit, VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'ReversR-Rebuild', VERCEL_GIT_REPO_OWNER: 'vsillah',
});
const SOURCES = Object.freeze([
  'server/cadLiveOpeningGateCredentialClosure.js',
  'server/cadLiveOpeningCredentialClosureMetadataPolicy.js',
  'server/cadProductionCurrentDeploymentMetadata.js',
  'server/cadLiveOpeningExecutionArchitectureClosure.js',
  'server/cadProductionRuntimeInstallCurrentBinding.js',
  'server/cadProductionExecutionBindingInstallation.js',
  'server/cadProductionExecutionBindingSourceInstall.js',
  'server/cadProductionExecutionBindingSource.js',
  'server/cadProductionExecutionBinding.js',
  'server/cadLiveOpeningExecutableRuntimeBootstrap.js',
  'server/cadLiveOpeningExecutableRuntimeWiring.js',
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'server/cadUserUploadRouter.js', 'server/uploadSession.js', 'server/index.js',
  'scripts/cad-auth-credential-closure-binding-repair-checker.js',
  'scripts/cad-auth-credential-closure-binding-repair.test.js',
  'docs/cad-auth-credential-closure-binding-repair.md',
]);

function sourceProof(env = PROOF_ENV) {
  const calls = [];
  const metadata = readCadProductionCurrentDeploymentMetadata(env);
  const supply = createProofPrivateSessionCredentialSupply({ supplyReceiptSha256: sha('synthetic-repair-receipt') });
  const closure = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: metadata, privateSessionCredentialSupply: supply,
    durableService: Object.fromEntries(METHODS.map(name => [name, async () => {
      calls.push(name); throw Error('UNEXPECTED_SYNTHETIC_EFFECT');
    }])), now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
  });
  const installation = closure.runtime?.installation;
  const manifest = installation?.manifest;
  if (!closure.sourceExecutable || !manifest || calls.length) throw Error('UNRESOLVED_SOURCE_GATE');
  const card = JSON.parse(manifest.commandCardBytes);
  const exact = { ...manifest, startUtc: card.openingWindow.startUtc, expiresUtc: card.openingWindow.expiresUtc };
  if (sha(manifest.commandCardBytes) !== manifest.commandCardSha256
    || sha(JSON.stringify(exact)) !== installation.liveGate.installationSha256) throw Error('DIGEST_DRIFT');
  return {
    sourceOwnedMetadataOnly: true, liveAuthority: false, credentialValueIncluded: false,
    gateNonNull: closure.gateNonNull, installationNonNull: closure.installationNonNull,
    executableRuntimeEnabledInSyntheticComposition: closure.executableRuntime.enabled,
    deploymentMetadata: metadata, commandCardBytesSha256: sha(manifest.commandCardBytes),
    commandCardSha256: manifest.commandCardSha256,
    installationSha256: installation.liveGate.installationSha256,
    boundedSessionRef: manifest.boundedSessionRef, durableEvidenceSha256: manifest.durableEvidenceSha256,
    privateSupplyRef: supply.supplyRef, syntheticSupplyReceiptSha256: supply.supplyReceiptSha256,
    ceilings: card.ceilings, controls: card.liveExecutionControls, effectsExecuted: calls.length,
  };
}

function expectedPacket(readSource = read) {
  const closed = createCadLiveOpeningGateCredentialClosure({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata(PROOF_ENV),
  });
  if (closed.sourceExecutable || closed.sessionService || closed.executableRuntime.enabled) throw Error('DEFAULT_OPEN');
  return {
    schemaVersion: 1, artifact: 'cad-auth-credential-closure-binding-repair-v1',
    sourceOnly: true, roadmap: '5/6 complete', status: 'SOURCE_REPAIR_PREPARED_DEFAULT_CLOSED',
    boundInputs: BOUND_INPUTS, metadataPolicy: CURRENT_DEPLOYMENT_METADATA_POLICY,
    syntheticCurrentBindingProof: sourceProof(),
    syntheticNextDeploymentProof: sourceProof({ ...PROOF_ENV,
      VERCEL_URL: 'reversr-syntheticnext-vsillahs-projects.vercel.app',
      VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }),
    privateSupplyRequirement: {
      supplyRef: PRIVATE_SESSION_CREDENTIAL_SUPPLY_REF, credentialDigestSha256: SESSION_CREDENTIAL_DIGEST_SHA256,
      transport: 'bearer', exactDigestRequired: true, privateReceiptSha256Required: true,
      credentialValueMustRemainPrivate: true, receiptPresenceIsNotLiveQualification: true,
    },
    defaultProductionClosed: true, effectsExecuted: 0, liveOpeningAuthorized: false,
    runtimeActivated: false, uploadSessionIssued: false, requestBodyRead: false,
    executableCommandCardIssuedForLiveExecution: false, privateEvidenceRead: false,
    nextGate: 'public review, merge/deploy authority, then source-only post-merge rebind with current metadata, fresh reviewed UTC window, exact card/installation digests and fail-closed smoke; private supply and live opening require separate authority',
    controlledUploadRuntimeBlocked: true,
    controlledUploadRuntimeBlocker: 'CONTROLLED_UPLOAD_REVIEWED_DURABLE_HOST_REQUIRED',
    controlledUploadLiveDurabilityVerified: false,
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, code: ok ? 'BINDING_REPAIR_VALID_DEFAULT_CLOSED' : 'BINDING_REPAIR_BLOCKED', effectsExecuted: 0, liveOpeningAuthorized: false };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_MODE');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.log(JSON.stringify(checkPacket(null))); process.exitCode = 1; }
}
module.exports = { PACKET, SOURCES, PROOF_ENV, BOUND_INPUTS, expectedPacket, checkPacket, sourceProof };
