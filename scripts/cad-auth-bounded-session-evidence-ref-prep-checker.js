// Offline, fixed tracked-source allowlist; no runtime, environment or evidence access.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const STEM = 'cad-auth-bounded-session-evidence-ref-prep';
const PACKET = `docs/${STEM}.json`;
const PINS = Object.freeze({
  "docs/cad-auth-durable-adapter-rejection-prep.json": "0c36065f91fe722f5079052a10155dec3462449ea3bd1214d105599daff1bcc6",
  "offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json": "fb6f7a9bd4623369dd2bc9a6b9c831e26e27f5486481f5cc58c4ee349b17ecc9",
  "docs/cad-auth-production-binding-source-install.json": "ba790f1871036bf7e716ef910cbf7e41196ebe76b75a5b7c975df6ac1bcbcd45",
  "docs/cad-auth-final-live-opening-rebind-prep.json": "379a59c25b882eaccaa53a2230770d0d6777f26c92650bd715abf8a1bfe096ed",
  "docs/cad-auth-live-opening-executable-command-card-rebind.json": "8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1"
});
const OWN = Object.freeze([`docs/${STEM}.md`, `scripts/${STEM}-checker.js`, `scripts/${STEM}.test.js`]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
function expectedPacket(readSource = read) {
  const sourceBindings = {};
  for (const [file, digest] of Object.entries(PINS)) {
    sourceBindings[file] = sha(readSource(file));
    if (sourceBindings[file] !== digest) throw Error('SOURCE_DRIFT');
  }
  for (const file of OWN) sourceBindings[file] = sha(readSource(file));
  const parent = JSON.parse(readSource(Object.keys(PINS)[0]));
  const schema = JSON.parse(readSource(Object.keys(PINS)[1]));
  const install = JSON.parse(readSource(Object.keys(PINS)[2]));
  const rebind = JSON.parse(readSource(Object.keys(PINS)[3]));
  const card = JSON.parse(readSource(Object.keys(PINS)[4]));
  const ref = (source, pointer, value, reason) => ({ source, sourceSha256: PINS[source], pointer, value, acceptedAsLiveBinding: false, reason });
  return {
    schemaVersion: 1, artifact: `${STEM}-v1`, sourceOnly: true,
    status: 'STOPPED_SOURCE_INPUTS_UNRESOLVED_AND_DEPLOYMENT_REBIND_REQUIRED',
    roadmap: '5/6 complete; Step 6 preparation only',
    taskId: '01a0eeb4-c566-7702-bef6-9e1c343da498',
    approvedGate: {
      parentPacketSha256: PINS[Object.keys(PINS)[0]],
      sourceCommit: '07c45369b6c95f594995bb85875636cc8c51f383',
      pullRequest: 447,
      deploymentId: 'dpl_EMhat5M6tCGRrbsK81oS7FHDMxix',
      target: 'https://reversr-i0ypw7nkp-vsillahs-projects.vercel.app',
      reportedSmoke: { status: 401, code: 'USER_SESSION_REQUIRED', observedAtUtc: '2026-09-29T19:41:22Z', provenance: 'captain delegation; not repeated or independently verified by this lane' }
    },
    deployment: {
      schemaRequiredId: schema.properties.productionDeploymentReference.const,
      schemaRequiredSourceCommit: schema.properties.provenance.properties.sourceCommit.const,
      matchesApprovedGate: false, freshnessVerified: false, rebindApplied: false
    },
    candidates: {
      boundedSessionRef: ref(Object.keys(PINS)[1], '/properties/boundedSessionRef/const', schema.properties.boundedSessionRef.const, 'Opaque designation only; not an existing runtime session ID.'),
      rejectedPendingSession: ref(Object.keys(PINS)[2], '/installation/manifest/sessionId', install.installation.manifest.sessionId, 'Explicit pending value; prohibited as exact session input.'),
      historicalEvidence: [
        ref(Object.keys(PINS)[2], '/installation/manifest/durableEvidenceSha256', install.installation.manifest.durableEvidenceSha256, 'Source installation remains unqualified and exact session unresolved.'),
        ref(Object.keys(PINS)[3], '/finalOpeningBindings/durableEvidenceSha256', rebind.finalOpeningBindings.durableEvidenceSha256, 'Historical deployment and opening window; no exact session ID attestation.'),
        ref(Object.keys(PINS)[4], '/preparation/durableEvidenceBinding/sha256', card.preparation.durableEvidenceBinding.sha256, 'Derived from public source references; live adapter evidence expressly still required.')
      ]
    },
    requiredProvenance: {
      fields: schema.properties.provenance.required,
      sourceInputStopTask: parent.sourceInputStopTask,
      sessionInputStopTask: parent.sessionInputStopTask,
      runtimeInstallStopSha256: parent.runtimeInstallStopSha256,
      approvedNonSecretSourceRecordSha256: null,
      rule: 'An approved existing non-secret source record must attest the exact existing session ID and evidence digest together with the immutable target and source authority. Hashing this candidate manifest cannot establish that attestation.'
    },
    resolvedBinding: null, nextApprovalPhrase: null,
    unresolved: ['exactExistingSessionId', 'durableEvidenceSha256', 'approvedNonSecretSourceRecord', 'schemaDeploymentRebind', 'currentDeploymentVerification'],
    controls: Object.fromEntries([
      'providerEnvResourceBillingChangeAuthorized', 'secretReadAuthorized', 'privateEvidenceReadAuthorized',
      'uploadSessionIssuanceAuthorized', 'productionUploadActivationAuthorized', 'requestBodyAdmissionReadAuthorized',
      'conversionAuthorized', 'sandboxDispatchAuthorized', 'privateCadUseAuthorized', 'liveEvidenceCollectionAuthorized',
      'runtimeInstallationAuthorized', 'runtimeActivationAuthorized', 'executableCommandCardIssuanceAuthorized',
      'externalMessagesAuthorized', 'liveRetryAuthorized', 'secondLiveRunAuthorized', 'realUserCommercializationAuthorized',
      'commercialReadinessClaimed', 'durableAdapterQualified', 'runtimeMounted'
    ].map(key => [key, false])),
    liveEffectsExecuted: 0, sourceBindings
  };
}
function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* fixed diagnostic only */ }
  return { ok, code: ok ? 'SOURCE_REFERENCE_PREPARATION_VALID_RUNTIME_UNRESOLVED' : 'SOURCE_REFERENCE_PREPARATION_BLOCKED', sourceOnly: true, runtimeAuthorized: false };
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error();
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch { console.log(JSON.stringify(checkPacket(null))); process.exitCode = 1; }
}
module.exports = { PACKET, PINS, OWN, expectedPacket, checkPacket };
