// Fixed public-source allowlist only. No private evidence, runtime inputs,
// credentials, provider APIs, request bodies or live adapters are read here.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const STEM = 'cad-auth-session-evidence-source-record';
const PACKET = `docs/${STEM}.json`;

const PINS = Object.freeze({
  'docs/cad-auth-bounded-session-evidence-ref-prep.json':
    'c6525cccc7ee569550edabefe20e7d60bb111d342a69fe91be4d3c9c9657111e',
  'docs/cad-auth-durable-adapter-rejection-prep.json':
    '0c36065f91fe722f5079052a10155dec3462449ea3bd1214d105599daff1bcc6',
  'offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json':
    'fb6f7a9bd4623369dd2bc9a6b9c831e26e27f5486481f5cc58c4ee349b17ecc9',
  'docs/cad-auth-live-opening-executable-command-card-rebind.json':
    '8412b6d4495bf0dc852e3b3875497f839b01529825c7d22171814ee107eb67c1',
  'docs/cad-auth-production-binding-source-install.json':
    'ba790f1871036bf7e716ef910cbf7e41196ebe76b75a5b7c975df6ac1bcbcd45',
});

const OWN = Object.freeze([
  `docs/${STEM}.md`,
  `scripts/${STEM}-checker.js`,
  `scripts/${STEM}.test.js`,
]);

const CURRENT = Object.freeze({
  mergeCommit: '28e7c42efaa5fe993c70ab15f0b0753bce8baa81',
  pullRequest: 448,
  githubDeploymentId: 6745187124,
  vercelStatusPathId: '6eaK35wwsNHmW837vCQdRmgvrDZx',
  vercelDeploymentReference: 'dpl_6eaK35wwsNHmW837vCQdRmgvrDZx',
  productionTarget: 'https://reversr-mvvpn13wr-vsillahs-projects.vercel.app',
  canonicalRoute: 'https://reversr.vercel.app/api/cad/user-import',
  failClosedSmoke: {
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    observedAtUtc: '2026-09-29T20:51:56Z',
  },
});

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceRef = (source, pointer, value) => ({
  source,
  sourceSha256: PINS[source],
  pointer,
  value,
});

function sourceRecordFrom({ boundedPrep, schema, commandRebind }) {
  const sessionId =
    commandRebind.preparation.executableCommandCardDigest.commandCard.sessionId;
  const boundedSessionRef =
    boundedPrep.candidates.boundedSessionRef.value;
  const durableEvidenceSha256 =
    commandRebind.preparation.durableEvidenceBinding.sha256;

  return {
    schemaVersion: 1,
    artifact: 'cad-auth-session-evidence-source-record-v1',
    recordRef: 'rrb-ref:cad-auth-session-evidence-source-record-20260929T205156Z',
    sourceOnly: true,
    exactExistingSessionId: sessionId,
    boundedSessionRef,
    durableEvidenceSha256,
    productionDeploymentReference: CURRENT.vercelDeploymentReference,
    productionDeploymentTarget: CURRENT.productionTarget,
    sourceCommit: CURRENT.mergeCommit,
    provenance: {
      sessionId: sourceRef(
        'docs/cad-auth-live-opening-executable-command-card-rebind.json',
        '/preparation/executableCommandCardDigest/commandCard/sessionId',
        sessionId,
      ),
      boundedSessionRef: sourceRef(
        'docs/cad-auth-bounded-session-evidence-ref-prep.json',
        '/candidates/boundedSessionRef/value',
        boundedSessionRef,
      ),
      durableEvidenceSha256: sourceRef(
        'docs/cad-auth-live-opening-executable-command-card-rebind.json',
        '/preparation/durableEvidenceBinding/sha256',
        durableEvidenceSha256,
      ),
      productionDeploymentReference: {
        source: 'github-deployment-status',
        githubDeploymentId: CURRENT.githubDeploymentId,
        vercelStatusPathId: CURRENT.vercelStatusPathId,
        value: CURRENT.vercelDeploymentReference,
      },
      sourceCommit: {
        source: 'github-merge-commit',
        pullRequest: CURRENT.pullRequest,
        value: CURRENT.mergeCommit,
      },
      priorSchemaRequiredDeployment: sourceRef(
        'offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json',
        '/properties/productionDeploymentReference/const',
        schema.properties.productionDeploymentReference.const,
      ),
    },
    authority: {
      acceptedForSourceOnlySchemaRebind: true,
      acceptedForLiveDurableServiceQualification: false,
      liveDurableServiceQualified: false,
      productionExecutionBinding: null,
      runtimeInstallationAuthorized: false,
      runtimeActivationAuthorized: false,
    },
  };
}

function expectedPacket(readSource = read) {
  const sourceBindings = {};
  for (const [file, digest] of Object.entries(PINS)) {
    sourceBindings[file] = sha(readSource(file));
    if (sourceBindings[file] !== digest) throw Error('SOURCE_DRIFT');
  }
  for (const file of OWN) sourceBindings[file] = sha(readSource(file));

  const boundedPrep = JSON.parse(readSource('docs/cad-auth-bounded-session-evidence-ref-prep.json'));
  const parent = JSON.parse(readSource('docs/cad-auth-durable-adapter-rejection-prep.json'));
  const schema = JSON.parse(readSource('offline/cad-auth-durable-adapter-rejection-prep/binding.schema.json'));
  const commandRebind = JSON.parse(readSource('docs/cad-auth-live-opening-executable-command-card-rebind.json'));
  const install = JSON.parse(readSource('docs/cad-auth-production-binding-source-install.json'));
  const sourceRecord = sourceRecordFrom({ boundedPrep, schema, commandRebind });
  const sourceRecordSha256 = sha(JSON.stringify(sourceRecord));

  if (sourceRecord.exactExistingSessionId !== sourceRecord.boundedSessionRef) {
    throw Error('SESSION_BINDING_MISMATCH');
  }
  if (sourceRecord.exactExistingSessionId.endsWith('-pending')) {
    throw Error('PENDING_SESSION_REJECTED');
  }
  if (install.installation.manifest.sessionId.endsWith('-pending') !== true) {
    throw Error('INSTALLATION_PENDING_SENTINEL_MISSING');
  }

  return {
    schemaVersion: 1,
    artifact: `${STEM}-v1`,
    sourceOnly: true,
    status: 'SOURCE_RECORD_PREPARED_SCHEMA_REBIND_REQUIRED_RUNTIME_CLOSED',
    roadmap: '5/6 complete; Step 6 source resolution only',
    currentProduction: CURRENT,
    parentStopDisposition: {
      packetSha256: PINS['docs/cad-auth-bounded-session-evidence-ref-prep.json'],
      status: boundedPrep.status,
      unresolvedBeforeThisGate: boundedPrep.unresolved,
    },
    durableAdapterRejectionPrep: {
      packetSha256: PINS['docs/cad-auth-durable-adapter-rejection-prep.json'],
      priorStatus: parent.code,
      suppliedBindingWasNull: parent.suppliedBinding === null,
    },
    sourceRecord,
    sourceRecordSha256,
    schemaRebind: {
      appliedByThisGate: false,
      requiredBeforeRuntimeInstall: true,
      oldDeploymentReference: schema.properties.productionDeploymentReference.const,
      oldSourceCommit: schema.properties.provenance.properties.sourceCommit.const,
      proposedDeploymentReference: CURRENT.vercelDeploymentReference,
      proposedSourceCommit: CURRENT.mergeCommit,
      proposedApprovedNonSecretSourceRecordSha256: sourceRecordSha256,
      reason: 'Old schema remains immutable in this packet; a later source-only schema rebind must update and review the consts before any runtime install gate.',
    },
    resolvedForSourceOnlyReview: [
      'exactExistingSessionId',
      'boundedSessionRef',
      'durableEvidenceSha256',
      'approvedNonSecretSourceRecordSha256',
      'currentDeploymentVerification',
    ],
    stillBlockedForLiveOpening: [
      'schemaDeploymentRebindApplied',
      'liveDurableServiceQualification',
      'productionExecutionBinding',
      'runtimeInstallation',
      'explicitLiveOpeningGate',
    ],
    controls: Object.fromEntries([
      'providerEnvResourceBillingChangeAuthorized',
      'secretReadAuthorized',
      'privateEvidenceReadAuthorized',
      'uploadSessionIssuanceAuthorized',
      'productionUploadActivationAuthorized',
      'requestBodyAdmissionReadAuthorized',
      'conversionAuthorized',
      'sandboxDispatchAuthorized',
      'privateCadUseAuthorized',
      'liveEvidenceCollectionAuthorized',
      'runtimeInstallationAuthorized',
      'runtimeActivationAuthorized',
      'executableCommandCardIssuanceAuthorized',
      'externalMessagesAuthorized',
      'liveRetryAuthorized',
      'secondLiveRunAuthorized',
      'realUserCommercializationAuthorized',
      'commercialReadinessClaimed',
      'liveDurableServiceQualified',
    ].map(key => [key, false])),
    liveEffectsExecuted: 0,
    nextGateTemplate:
      'I approve a bounded source-only CAD Auth durable-adapter rejection binding schema rebind gate for ReversR-Rebuild, bound to session/evidence source-record packet <sessionEvidenceSourceRecordPacketSha256> at source commit <sessionEvidenceSourceRecordSourceCommit>, source record SHA-256 <sourceRecordSha256>, PR #448 merge commit 28e7c42efaa5fe993c70ab15f0b0753bce8baa81, production deployment dpl_6eaK35wwsNHmW837vCQdRmgvrDZx, production target https://reversr-mvvpn13wr-vsillahs-projects.vercel.app, and fail-closed smoke 401 USER_SESSION_REQUIRED observed at 2026-09-29T20:51:56Z. Scope: update and review only source-only docs/tests/checkers/manifests and disabled-by-default binding schema constants needed to accept the non-secret source record for cad-auth-durable-adapter-rejection-prep, preserving production fail-closed behavior and keeping runtime installation/live opening blocked. No private evidence reads, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime installation, runtime activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, or commercial-readiness claim. Stop on failing checks, unknown outcome, private-data leakage risk, stale deployment binding, missing source-record binding, or any need for runtime credentials/provider configuration.',
    sourceBindings,
  };
}

function checkPacket(packet, readSource = read) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return {
    ok,
    code: ok ? 'SESSION_EVIDENCE_SOURCE_RECORD_VALID_SCHEMA_REBIND_REQUIRED'
      : 'SESSION_EVIDENCE_SOURCE_RECORD_BLOCKED',
    sourceOnly: true,
    runtimeAuthorized: false,
    liveEffectsExecuted: 0,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_MODE');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify({ ...result, ...(result.ok ? { packetSha256: sha(bytes) } : {}) }));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, PINS, OWN, CURRENT, expectedPacket, checkPacket };
