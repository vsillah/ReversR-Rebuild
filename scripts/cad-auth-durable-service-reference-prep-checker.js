// Source-only opaque reference preparation. No private reads or provider/runtime access.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const {
  PACKET: PLAN_PACKET,
  checkPacket: checkQualificationPlan,
} = require('./cad-auth-durable-service-qualification-plan-checker');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-service-reference-prep.json';
const PLAN_SHA = '74046ecfdbe962eac29bb55351cd38ca84b13838c3e543e6c2e803beac959378';
const EXECUTION_GAP_SHA = '62052cae429117761a772c2c97b020cc1c2624d0a34d94e2086aa7e63142248d';
const RUN_ID = '20260928T161754Z';
const DURABLE_SERVICE_REF = `rrb-ref:cad-auth-durable-service-${RUN_ID}`;
const PRIVATE_SOURCE_EVIDENCE_SET_REF = `rrb-ref:cad-auth-durable-service-source-evidence-set-${RUN_ID}`;
const OPAQUE_REF = /^rrb-ref:[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;
const SOURCES = Object.freeze([
  PLAN_PACKET,
  'docs/cad-auth-durable-service-qualification-plan.md',
  'docs/cad-auth-durable-service-reference-prep.md',
  'scripts/cad-auth-durable-service-qualification-plan-checker.js',
  'scripts/cad-auth-durable-service-reference-prep-checker.js',
  'scripts/cad-auth-durable-service-reference-prep.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function nextPrivateReviewApprovalPhrase(packet) {
  return `I approve one bounded private/source-only durable-service qualification evidence review for ReversR CAD Auth, bound to qualification plan packet ${packet.qualificationPlanPacketSha256}, reference-prep packet <referencePrepPacketSha256>, inspected base commit ${packet.inspectedBaseCommit}, and execution-gap closure packet ${packet.executionGapClosurePacketSha256}. Review only existing non-secret source and evidence designated by ${packet.privateSourceEvidenceSetReference} for durable service ${packet.durableServiceReference}. Stop on unresolved sources, missing evidence, digest drift, unknown outcome, failing checks, or any need for credentials or provider configuration. This approves source/evidence review only; liveDurableServiceQualified must remain false and productionExecutionBinding null. No provider/env/resource/billing changes, secret reads, upload-session issuance, upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance for live execution, external messages, retry, second live run, commercialization, commercial-readiness claim, public push, PR creation, merge, deployment, or production smoke.`;
}

function expectedPacket(readSource = read) {
  const plan = JSON.parse(readSource(PLAN_PACKET));
  if (sha(readSource(PLAN_PACKET)) !== PLAN_SHA || !checkQualificationPlan(plan, { readSource }).ok) {
    throw Error('QUALIFICATION_PLAN_BLOCKED');
  }
  const packet = {
    schemaVersion: 1,
    packet: 'cad-auth-durable-service-reference-prep-v1',
    sourceOnly: true,
    status: 'OPAQUE_REFERENCES_PREPARED_NO_PRIVATE_READS',
    runId: RUN_ID,
    inspectedBaseCommit: plan.inspectedBaseCommit,
    qualificationPlanPacketSha256: PLAN_SHA,
    executionGapClosurePacketSha256: EXECUTION_GAP_SHA,
    durableServiceReference: DURABLE_SERVICE_REF,
    privateSourceEvidenceSetReference: PRIVATE_SOURCE_EVIDENCE_SET_REF,
    referenceSemantics: {
      durableServiceReference: 'Opaque label for exactly one later-designated durable service identity; not a URL, credential, callable capability, runtime binding, or proof that the service exists.',
      privateSourceEvidenceSetReference: 'Opaque label for a later private custodian mapping to existing non-secret source/evidence bytes; not a local path, secret, provider value, or authorization to read private evidence.',
    },
    controls: {
      privateEvidenceRead: false,
      liveDurableServiceQualified: false,
      productionExecutionBinding: null,
      providerEnvResourceBillingChangeAuthorized: false,
      secretReadAuthorized: false,
      uploadSessionIssuanceAuthorized: false,
      productionUploadActivationAuthorized: false,
      requestBodyAdmissionReadAuthorized: false,
      conversionAuthorized: false,
      sandboxDispatchAuthorized: false,
      privateCadUseAuthorized: false,
      liveEvidenceCollectionAuthorized: false,
      runtimeActivationAuthorized: false,
      executableCommandCardIssuanceAuthorized: false,
      externalMessagesAuthorized: false,
      publicPushAuthorized: false,
      prCreationAuthorized: false,
      mergeAuthorized: false,
      deploymentAuthorized: false,
      productionSmokeAuthorized: false,
      retryAuthorized: false,
      secondLiveRunAuthorized: false,
      realUserCommercializationAuthorized: false,
      commercialReadinessClaimed: false,
      effectsExecuted: 0,
    },
    nextGate: {
      status: 'PRIVATE_SOURCE_EVIDENCE_REVIEW_AWAITS_EXPLICIT_APPROVAL',
      remainingUserPlaceholders: [],
      sourceReferencePrepared: true,
      durableServiceReferencePrepared: true,
    },
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
  return { ...packet, nextPrivateReviewApprovalPhraseTemplate: nextPrivateReviewApprovalPhrase(packet) };
}

function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = !!input
      && typeof input === 'object'
      && !Array.isArray(input)
      && plainContractData(input)
      && isDeepStrictEqual(input, expectedPacket(readSource))
      && OPAQUE_REF.test(input.durableServiceReference)
      && OPAQUE_REF.test(input.privateSourceEvidenceSetReference)
      && !input.nextPrivateReviewApprovalPhraseTemplate.includes('<privateSourceEvidenceSetReference>')
      && !input.nextPrivateReviewApprovalPhraseTemplate.includes('<durableServiceReference>');
  } catch { /* sanitized */ }
  return {
    ok,
    code: ok ? 'OPAQUE_REFERENCES_PREPARED_NO_PRIVATE_READS' : 'REFERENCE_PREP_BLOCKED',
    effectsExecuted: 0,
    privateEvidenceRead: false,
    liveDurableServiceQualified: false,
    productionExecutionBinding: null,
  };
}

function approvalPhrase(packetBytes) {
  const packet = JSON.parse(packetBytes);
  if (!checkPacket(packet).ok) throw Error('REFERENCE_PREP_BLOCKED');
  return packet.nextPrivateReviewApprovalPhraseTemplate.replace(
    '<referencePrepPacketSha256>',
    sha(packetBytes),
  );
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify(result.ok ? {
      ...result,
      packetSha256: sha(bytes),
      nextPrivateReviewApprovalPhrase: approvalPhrase(bytes),
    } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}

module.exports = {
  PACKET,
  SOURCES,
  RUN_ID,
  DURABLE_SERVICE_REF,
  PRIVATE_SOURCE_EVIDENCE_SET_REF,
  expectedPacket,
  checkPacket,
  approvalPhrase,
};
