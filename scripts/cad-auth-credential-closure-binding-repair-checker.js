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
  baseCommit: '79f25144225a2cf12052243f08a69109c3f632e7',
  stoppedPostMergeRebindDispositionSha256: 'e4a0c272ab7c71c5f3cd31c57b0f383ea454ad589756cbb39c54e371246039de',
  credentialClosurePacketSha256: '49fb61c54ddec577e9d3316cc9cc528789567618ee8a47a272c16d2e66d16027',
  credentialClosureSourceCommit: '7ece1ed0131dbef5a38a70aa508cd07696857e26',
  githubProductionDeployment: '6771743168',
  productionTarget: 'https://reversr-irbbqlave-vsillahs-projects.vercel.app',
  suppliedHistoricalSmoke: { status: 401, code: 'USER_SESSION_REQUIRED', observedAtUtc: '2026-09-30T22:42:27Z' },
});
// This dpl ID is deliberately synthetic. It is not an observed mapping of the
// supplied GitHub deployment ID and must never be used for a live request.
const PROOF_ENV = Object.freeze({
  VERCEL_ENV: 'production', VERCEL_DEPLOYMENT_ID: 'dpl_SyntheticCredentialRepair0001',
  VERCEL_URL: 'reversr-irbbqlave-vsillahs-projects.vercel.app',
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
    syntheticOnly: true, liveAuthority: false, credentialValueIncluded: false,
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
      VERCEL_DEPLOYMENT_ID: 'dpl_SyntheticCredentialRepair0002',
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
