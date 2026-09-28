// Fixed repository reads only. No private reference resolution or evidence ingestion.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const previous = require('./cad-auth-durable-service-reference-prep-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-envelope-gap-plan.json';
const SOURCES = Object.freeze([
  previous.PACKET,
  'docs/cad-auth-durable-envelope-gap-plan.md',
  'scripts/cad-auth-durable-envelope-gap-plan-checker.js',
  'scripts/cad-auth-durable-envelope-gap-plan.test.js',
]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const REF_SHA = 'cfccd46e250dfb2dc09c98c70bd9f640654a566086ca692b3e4f5aacbaac093f';
const DISPOSITION_SHA = '242df18dc43556b4dbd1144104d90ce5a9bd8926733c891fc37d9592f1fbabdd';
function expectedPacket(readSource = read) {
  const bytes = readSource(previous.PACKET);
  const parent = JSON.parse(bytes);
  if (sha(bytes) !== REF_SHA || !previous.checkPacket(parent, { readSource }).ok) throw Error('PARENT_BLOCKED');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-durable-envelope-gap-plan-v1',
    sourceOnly: true,
    status: 'SOURCE_PLAN_VALIDATED_PRIVATE_EVIDENCE_SUPPLY_PENDING',
    inspectedBaseCommit: '93d22792585c8ad4e03921e6d2d1ba7833f121dc',
    qualificationPlanPacketSha256: parent.qualificationPlanPacketSha256,
    referencePrepPacketSha256: REF_SHA,
    referenceMappingDispositionSha256: DISPOSITION_SHA,
    dispositionBindingProvenance: 'CALLER_SUPPLIED_DIGEST_NOT_READ_OR_VERIFIED',
    durableServiceReference: parent.durableServiceReference,
    sourceEvidenceSetReference: parent.privateSourceEvidenceSetReference,
    controls: { ...parent.controls },
    repositoryDelivery: { sourceOnlyPushAuthorized: true, draftPrAuthorized: true },
    evidenceEnvelopeSupplied: false,
    evidenceEnvelopeDigest: null,
    privateReviewAuthorized: false,
    nextGate: 'EXPLICIT_PRIVATE_EVIDENCE_SUPPLY_APPROVAL_THEN_SEPARATE_REVIEW_APPROVAL',
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = !!input && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource)); } catch { /* sanitized, closed */ }
  return { ok, code: ok ? 'SOURCE_PLAN_VALIDATED_PRIVATE_EVIDENCE_SUPPLY_PENDING' : 'ENVELOPE_GAP_PLAN_BLOCKED',
    privateEvidenceRead: false, liveDurableServiceQualified: false,
    productionExecutionBinding: null, effectsExecuted: 0 };
}
function approvalPhrase(bytes) {
  const p = JSON.parse(bytes);
  if (!checkPacket(p).ok) throw Error('ENVELOPE_GAP_PLAN_BLOCKED');
  return `I approve one bounded private evidence-supply handoff for the ReversR CAD Auth durable-service evidence envelope, bound to gap-plan packet ${sha(bytes)}, qualification plan packet ${p.qualificationPlanPacketSha256}, reference-prep packet ${p.referencePrepPacketSha256}, and reference-mapping disposition ${p.referenceMappingDispositionSha256}. The custodian may supply only an explicitly inventoried set of already-existing non-secret artifacts designated by ${p.sourceEvidenceSetReference} for ${p.durableServiceReference}, in private custody. This is supply authority only: no Codex private evidence reads or qualification review until a separate exact-inventory/digest-bound approval. Missing artifacts remain blocked; do not create or collect live evidence. Stop on unresolved ownership or sources, missing evidence, unverifiable provenance, digest drift, unknown outcome, failing checks, or any need for credentials or provider access. Keep liveDurableServiceQualified false and productionExecutionBinding null. No provider/env/resource/billing changes, secrets or secret reads, upload-session issuance, production upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance, external messages, live retry, second live run, real-user commercialization, commercial-readiness claim, public evidence projection, public push, PR creation, merge, deployment, production smoke, or cleanup.`;
}
if (require.main === module) {
  try {
    // No path arguments and no write/execute mode. Packet authoring is a separate source edit.
    if (process.argv.length !== 2) throw Error('INVALID_ARGUMENT');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify(result.ok ? { ...result, packetSha256: sha(bytes), nextPrivateEvidenceSupplyApprovalPhrase: approvalPhrase(bytes) } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket, approvalPhrase };
