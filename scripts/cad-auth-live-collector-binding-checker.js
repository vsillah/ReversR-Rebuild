// Source-only binding packet checker. It never emits or runs a live collector command.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { PACKET: SEALED_PREP, checkPreparation } = require('./cad-auth-live-evidence-sealed-card-prep-checker');
const { PACKET: ACCEPTANCE, checkAcceptance } = require('./cad-auth-live-evidence-acceptance-checker');
const { PACKET: SETUP, checkSetup } = require('./cad-auth-sealed-setup-checker');
const { APPROVAL, REQUIRED_LIVE_BINDINGS, ZERO_ACTIONS, evaluateReadOnlyCollectionGate }
  = require('../offline/cad-auth-live-collector-binding/guardedCollector');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-collector-binding.json';
const SOURCES = Object.freeze([
  SEALED_PREP,
  ACCEPTANCE,
  SETUP,
  'docs/cad-auth-live-collector-binding.md',
  'offline/cad-auth-live-collector-binding/guardedCollector.js',
  'scripts/cad-auth-live-collector-binding-checker.js',
  'scripts/cad-auth-live-collector-binding.test.js',
  'docs/cad-auth-sealed-setup-stop-runbook.md',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const sealedPrep = JSON.parse(readSource(SEALED_PREP));
  const acceptance = JSON.parse(readSource(ACCEPTANCE));
  const setup = JSON.parse(readSource(SETUP));
  if (!checkPreparation(sealedPrep, { readSource }).ok) throw Error('INVALID_SEALED_PREP');
  if (!checkAcceptance(acceptance, { readSource }).ok) throw Error('INVALID_ACCEPTANCE');
  if (!checkSetup(setup, { readSource }).ok) throw Error('INVALID_SETUP');
  const sampleStop = evaluateReadOnlyCollectionGate({
    nowUtc: '2026-09-24T13:23:52Z',
    mainCommit: APPROVAL.mergeCommit,
    originMainCommit: APPROVAL.mergeCommit,
    sealedCardSha256: APPROVAL.sealedCardSha256,
    reviewedPacketSha256: APPROVAL.reviewedPacketSha256,
    scheduleSha256: APPROVAL.scheduleSha256,
    limitsSha256: APPROVAL.limitsSha256,
    sourcePreparationValid: true,
    packetExecutable: false,
    packetLiveCollectionAuthorized: false,
    packetBodyAdmissionAuthorized: false,
    packetRuntimeActivationAuthorized: false,
  });
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-collector-binding-v1',
    sourceOnly: true,
    status: 'GUARDED_PRECHECK_SOURCE_BOUND_LIVE_COLLECTION_STILL_BLOCKED',
    parent: {
      sealedPrepPacket: sealedPrep.payload.packet,
      sealedPrepSha256: sha(readSource(SEALED_PREP)),
      acceptancePacket: acceptance.packet,
      acceptanceSha256: sha(readSource(ACCEPTANCE)),
      setupPacket: setup.packet,
      setupSha256: sha(readSource(SETUP)),
    },
    approval: {
      exactPhrase: sealedPrep.futureApproval.exactPhrase,
      phraseActionableOnlyInsideWindow: true,
      sealedCardSha256: APPROVAL.sealedCardSha256,
      reviewedPacketSha256: APPROVAL.reviewedPacketSha256,
      scheduleSha256: APPROVAL.scheduleSha256,
      limitsSha256: APPROVAL.limitsSha256,
      startsAtUtc: APPROVAL.startsAtUtc,
      expiresAtUtc: APPROVAL.expiresAtUtc,
      candidateCommit: APPROVAL.candidateCommit,
      immutableDeployment: APPROVAL.immutableDeployment,
      mergeCommit: APPROVAL.mergeCommit,
      consumedStopReceiptRef: '.local/cad-auth-live-evidence-runs/20260924T132411Z/stop-receipt.json',
      consumedStopCode: 'MISSING_PREREQUISITE',
    },
    guardedPrecheck: {
      source: 'offline/cad-auth-live-collector-binding/guardedCollector.js',
      checker: 'scripts/cad-auth-live-collector-binding-checker.js',
      purpose: 'Make the missing live collector/runtime bindings explicit and fail closed.',
      sampleStop,
      zeroActionCeilings: ZERO_ACTIONS,
      liveCollectorCommandLine: null,
      executableCommandCardIssued: false,
      liveCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      uploadSessionIssuanceEnabled: false,
      bodyAdmissionAuthorized: false,
      retryOrSecondRunAuthorized: false,
    },
    requiredLiveBindings: Object.fromEntries(REQUIRED_LIVE_BINDINGS.map(name => [name, {
      reviewed: false,
      receiptRef: null,
      accepted: false,
    }])),
    nextGate: {
      status: 'SOURCE_ONLY_IMPLEMENTATION_REQUIRED',
      needed: [
        'concrete provider runtime adapter wired without env/secret leakage',
        'executable collector command-card generator that remains disabled until separately approved',
        'restricted synthetic cohort setup and custody receipts outside public source',
        'durable consumed-run ledger and late-grant observer',
        'installed earliest-boundary route/body observer',
        'fresh immutable deployment binding after the runtime source exists',
      ],
      liveEvidenceCanRunNow: false,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}

function checkBinding(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return {
    ok,
    sourceBindingValid: ok,
    executable: false,
    liveCollectionAuthorized: false,
    runtimeActivationAuthorized: false,
    bodyAdmissionAuthorized: false,
    uploadSessionIssuanceEnabled: false,
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_LIVE_COLLECTOR_BINDING'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkBinding(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ok: false, executable: false, code: 'SOURCE_BINDING_BLOCKED' }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkBinding };
