// Source-only projection of supplied accepted review metadata; never resolves private refs.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const previous = require('./cad-auth-durable-service-qualification-review-plan-checker');
const envelopeGap = require('./cad-auth-durable-envelope-gap-plan-checker');
const referencePrep = require('./cad-auth-durable-service-reference-prep-checker');
const qualificationPlan = require('./cad-auth-durable-service-qualification-plan-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-service-qualification-review-projection.json';
const PLAN_SHA = '6a6628713c38cf43e0c62dfa8ef16dcd5b0c58e61164ab7f5bdd33d39c30ed55';
const REVIEW_SHA = '5e064d6edb779def902dbf43f970593d23ea771acf72bbea2ada9f88173a0e43';
const RECEIPT_SHA = '6fe6679616bbde8bf2a16f1fed9cd3ab662713112958eaed97efb7e6e0fb41ea';
const BRANCH = 'codex/cad-auth-durable-qualification-projection';
const SOURCES = Object.freeze([...new Set([
  previous.PACKET, ...previous.SOURCES,
  envelopeGap.PACKET, ...envelopeGap.SOURCES,
  referencePrep.PACKET, ...referencePrep.SOURCES,
  qualificationPlan.PACKET, ...qualificationPlan.SOURCES,
  'offline/cad-auth-prod-opening-prep/preparation.js',
  'scripts/cad-auth-durable-service-reference-prep-checker.js',
  'docs/cad-auth-durable-service-qualification-review-projection.md',
  'scripts/cad-auth-durable-service-qualification-review-projection-checker.js',
  'scripts/cad-auth-durable-service-qualification-review-projection.test.js',
])]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  // Only fixed public source paths may reach the reader, including through parent checks.
  const boundedRead = file => {
    if (!SOURCES.includes(file)) throw Error('SOURCE_NOT_ALLOWED');
    return readSource(file);
  };
  const bytes = boundedRead(previous.PACKET);
  if (sha(bytes) !== PLAN_SHA) throw Error('PLAN_DRIFT');
  const parent = JSON.parse(bytes);
  if (!previous.checkPacket(parent, { readSource: boundedRead }).ok) throw Error('PARENT_BLOCKED');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-durable-service-qualification-review-projection-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_ACCEPTED_QUALIFICATION_REVIEW_PROJECTED_LIVE_UNQUALIFIED',
    privateQualificationReviewSha256: REVIEW_SHA,
    qualificationReviewReceiptSha256: RECEIPT_SHA,
    qualificationReviewPlanPacketSha256: PLAN_SHA,
    repairedInventoryReviewSha256: parent.repairedInventoryReviewSha256,
    repairedInventoryReviewReceiptSha256: parent.repairedInventoryReviewReceiptSha256,
    sourceEvidenceSetReference: parent.sourceEvidenceSetReference,
    durableServiceReference: parent.durableServiceReference,
    acceptedReview: {
      status: 'PRIVATE_QUALIFICATION_REVIEW_ACCEPTED_SOURCE_ONLY_LIVE_UNQUALIFIED',
      acceptedArtifactKindCount: 9,
      requiredArtifactKindCount: 9,
      acceptedDurableCapabilityCount: 13,
      requiredDurableCapabilityCount: 13,
      blockers: 0,
      closedControlStatus: 'CLOSED',
      durableServiceQualified: false,
      liveDurableServiceQualified: false,
      productionExecutionBinding: null,
    },
    sanitizedResultShape: [...parent.qualificationReviewPlan.sanitizedResultFields],
    // These describe this projection's authority, not execution of the prior private review.
    controls: { ...parent.controls, privateEvidenceRead: false },
    nextGate: {
      status: 'EXACT_PUBLIC_BRANCH_PUSH_DRAFT_PR_APPROVAL_REQUIRED',
      branch: BRANCH,
      packetSha256BindingRequired: true,
      sourceRevalidationRequired: true,
      scopedSourceFilesOnly: true,
      draftPrOnly: true,
      separateMergeDeploymentApprovalRequired: true,
      separateLiveQualificationAndExecutionApprovalRequired: true,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(boundedRead(file))])),
  };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = !!input && typeof input === 'object' && !Array.isArray(input)
      && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource));
  } catch { /* never echo caller data or private error text */ }
  return {
    ok,
    code: ok ? 'SOURCE_ONLY_QUALIFICATION_REVIEW_PROJECTION_VALID' : 'QUALIFICATION_REVIEW_PROJECTION_BLOCKED',
    privateEvidenceRead: false,
    durableServiceQualified: false,
    liveDurableServiceQualified: false,
    productionExecutionBinding: null,
    effectsExecuted: 0,
  };
}

function approvalPhrase(packetBytes) {
  let packet;
  try { packet = JSON.parse(packetBytes); } catch { throw Error('QUALIFICATION_REVIEW_PROJECTION_BLOCKED'); }
  if (!checkPacket(packet).ok) throw Error('QUALIFICATION_REVIEW_PROJECTION_BLOCKED');
  return `I approve public push of branch ${BRANCH} and creation of one draft PR for the source-only CAD Auth durable-service qualification review projection for ReversR-Rebuild, bound to projection packet SHA-256 ${sha(packetBytes)}, private qualification review SHA-256 ${REVIEW_SHA}, review receipt SHA-256 ${RECEIPT_SHA}, and qualification review plan packet SHA-256 ${PLAN_SHA}. Scope: publish only the validated sanitized source-only projection docs, packet, checker, and tests. Keep durableServiceQualified false, liveDurableServiceQualified false, productionExecutionBinding null, and all runtime controls closed. No private evidence reads or disclosure, provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, merge, deployment, production smoke, real-user enrollment, or commercial-readiness claim. Stop on failing checks, unknown outcome, stale source binding, private-data leakage risk, or need for runtime credentials/provider configuration.`;
}

function checkApprovalPhrase(packetBytes, phrase) {
  try { return typeof phrase === 'string' && phrase === approvalPhrase(packetBytes); }
  catch { return false; }
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify(result.ok ? { ...result, packetSha256: sha(bytes), nextPublicPushDraftPrApprovalPhrase: approvalPhrase(bytes) } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket, approvalPhrase, checkApprovalPhrase };
