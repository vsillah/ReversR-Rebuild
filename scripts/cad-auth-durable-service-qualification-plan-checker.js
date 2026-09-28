// Fixed local source reads only. No private evidence resolution or live qualification.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const { expectedPacket: closurePacket, checkPacket: checkClosure } = require('./cad-auth-live-opening-execution-gap-closure-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-service-qualification-plan.json';
const PARENT = 'docs/cad-auth-live-opening-execution-gap-closure.json';
const PARENT_SHA = '62052cae429117761a772c2c97b020cc1c2624d0a34d94e2086aa7e63142248d';
const SOURCES = Object.freeze([PARENT,
  ...Object.keys(closurePacket().sourceBindings),
  'server/cadProductionExecutableRuntimeMountCompletion.js',
  'offline/cad-auth-prod-durable-runner-adapter-prep/preparation.js',
  'offline/cad-auth-prod-durable-runner-adapter-prep/transactionAdapter.js',
  'scripts/cad-auth-prod-durable-runner-adapter-prep.test.js',
  'docs/cad-auth-durable-adapter-evidence-command-card-review.json',
  'docs/cad-auth-durable-service-qualification-plan.md',
  'scripts/cad-auth-durable-service-qualification-plan-checker.js',
  'scripts/cad-auth-durable-service-qualification-plan.test.js']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const parent = readSource(PARENT);
  if (sha(parent) !== PARENT_SHA || !checkClosure(JSON.parse(parent), { readSource }).ok) throw Error('PARENT_BLOCKED');
  return { schemaVersion: 1, packet: 'cad-auth-durable-service-qualification-plan-v1',
    sourceOnly: true, status: 'PLAN_VALIDATED_SERVICE_UNRESOLVED_PRODUCTION_DISABLED',
    inspectedBaseCommit: '6b7d6aa8ed8e17f1943feefbefbae2ecaa7c289a',
    executionGapClosurePacketSha256: PARENT_SHA,
    durableServiceReference: null, privateEvidenceRead: false,
    liveDurableServiceQualified: false, productionExecutionBinding: null,
    executableCommandCardIssued: false, controls: JSON.parse(parent).controls,
    sourceBindings: Object.fromEntries([...new Set(SOURCES)].map(file => [file, sha(readSource(file))])) };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = !!input && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource)); } catch { /* closed */ }
  return { ok, code: ok ? 'PLAN_VALIDATED_SERVICE_UNRESOLVED_PRODUCTION_DISABLED' : 'QUALIFICATION_PLAN_BLOCKED',
    liveDurableServiceQualified: false, productionExecutionBinding: null, effectsExecuted: 0 };
}
function approvalPhrase(packetBytes) {
  if (!checkPacket(JSON.parse(packetBytes)).ok) throw Error('QUALIFICATION_PLAN_BLOCKED');
  return `I approve one bounded private/source-only durable-service qualification evidence review for ReversR CAD Auth, bound to qualification plan packet ${sha(packetBytes)}, inspected base commit 6b7d6aa8ed8e17f1943feefbefbae2ecaa7c289a, and execution-gap closure packet ${PARENT_SHA}. Review only existing non-secret source and evidence designated by <privateSourceEvidenceSetReference> for durable service <durableServiceReference>. Stop on unresolved sources, missing evidence, digest drift, unknown outcome, failing checks, or any need for credentials or provider configuration. This approves source/evidence review only; liveDurableServiceQualified must remain false and productionExecutionBinding null. No provider/env/resource/billing changes, secret reads, upload-session issuance, upload activation, request-body admission/read, conversion, Sandbox dispatch, private CAD use, live evidence collection, runtime activation, executable command-card issuance for live execution, external messages, retry, second live run, commercialization, commercial-readiness claim, public push, PR creation, merge, deployment, or production smoke.`;
}
if (require.main === module) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write')) throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const bytes = read(PACKET);
    const result = checkPacket(JSON.parse(bytes));
    console.log(JSON.stringify(result.ok ? { ...result, packetSha256: sha(bytes), nextApprovalPhrase: approvalPhrase(bytes) } : result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket, approvalPhrase };
