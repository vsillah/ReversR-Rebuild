// Local fixture/inspection CLI only. It never binds a provider client or runs a
// live qualification. Future live runs must use the exported module with a
// separately reviewed injected development adapter.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { FUNCTIONS, createDurableEngineAdapter } = require('../offline/cad-convex/durableEngineAdapter');
const { createSyntheticRestrictedRegisterFixture } = require('../offline/cad-convex/privateRestrictedRegisterReview');
const {
  packet,
  inspectAcceptedRunArtifacts,
  executeBoundedDevelopmentQualificationRun,
} = require('../offline/cad-convex/boundedDevQualificationExecutor');
const { createFixture } = require('./helpers/cad-durable-engine-fixture');

const hash = bytes => crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');
const emit = (value, code = 0) => {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
};
const receiptFixture = () => JSON.stringify({
  schemaVersion: 1,
  mode: 'restricted-evidence-acceptance-receipt',
  status: 'ACCEPTED_FOR_EVIDENCE_COMPLETENESS_ONLY',
  acceptedAtUtc: '2026-09-14T13:55:22Z',
  acceptedByRef: 'rrb-ref:vambah-human-approval-thread',
  sourceMainCommit: packet.baseCommit,
  sourcePacketCommit: packet.sourcePacketCommit,
  projectionSha256: packet.acceptedEvidence.projectionSha256,
  projectionByteCount: 38688,
  privateRestrictedRegisterDigest: packet.acceptedEvidence.privateRestrictedRegisterDigest,
  privateRestrictedRegisterByteCount: 33099,
  restrictedCommandSetDigest: packet.acceptedEvidence.restrictedCommandSetDigest,
  commandCardProjectionDigest: packet.acceptedEvidence.commandCardProjectionDigest,
  commandCardProjectionByteCount: 12421,
  requiredEvidenceReceipts: packet.acceptedEvidence.requiredEvidenceReceipts,
  publicRefs: {
    runIdRef: 'rrb-ref:restricted-identity-runid',
    resourceAliasRef: 'rrb-ref:restricted-identity-resourcealias',
    namespaceRef: 'rrb-ref:restricted-identity-namespace',
    ledgerAndWindowRef: 'rrb-ref:restricted-identity-ledgerandwindowref',
    ledgerIdRef: 'rrb-ref:restricted-identity-ledgerid',
    windowIdRef: 'rrb-ref:restricted-identity-windowid',
    fenceRef: 'rrb-ref:restricted-identity-fence',
    privateResourceBindingRef: 'rrb-ref:restricted-identity-privateresourcebindingref',
    sanitizedDestinationRef: 'rrb-ref:cad-sanitized-evidence-destination',
    restrictedDestinationRef: 'rrb-ref:cad-restricted-evidence-destination',
    independentReviewRef: 'rrb-ref:cad-independent-review-required',
  },
  approvalScope: {
    acceptsEvidenceCompleteness: true,
    liveRunAuthorized: false,
    providerMutationAuthorized: false,
    resourceMutationAuthorized: false,
    envMutationAuthorized: false,
    uploadActivationAuthorized: false,
    conversionAuthorized: false,
    privateCadAuthorized: false,
    sandboxDispatchAuthorized: false,
    deploymentAuthorized: false,
    mergeAuthorized: false,
    cleanupAuthorized: false,
  },
  nextBlockedUntil: [
    'separate one-run live development qualification approval',
    'bounded live-run operator command review',
    'unchanged disabled CAD upload gate',
    'post-run cleanup approval',
  ],
  exactApprovedPhrase: 'Approve accepting restricted evidence projection 2355757d7415cb1512d234c69f90cd670cc4c1a405c31f7102140622507e77d4 for synthetic durable-adapter development run rrb-ref:restricted-identity-runid with private restricted register 0ed5be1773de1db4f7f9f6991a63f29473a530dfe53716ee1d955e61380c3c58, command cards C0-C4 byte-count/digest receipts 035742b2d20ba7bb037505a609224191dd2d8898398f622bfdc308dc8861af3f, resource alias rrb-ref:restricted-identity-resourcealias, namespace/ledger/window/fence rrb-ref:restricted-identity-namespace/rrb-ref:restricted-identity-ledgerandwindowref/rrb-ref:restricted-identity-fence, UTC/cost cap evidence bce028218e975f9875d0c7bd40b5d044e9470b1c9b1366125fdd04715507ebeb/748b2bc136d5ed7f55b5ac41f9afac03464e7430dd16a95bb9b0dc01cde2c8ba, custody and reviewer acceptances ac80c19be0d1dd14212d75ed5d7006b790477b751939af2f19976bec83da53d1/58566f89c54ec8c33e8eca162522e8112f0d65f946db218ab71716e7dc1675c0/rrb-ref:cad-independent-review-required, disabled-route pre/post plan 028f9c23cb1f0a147cd53f396d4fd58f1f94040381ca5acc2c3c3f55e6175c9e, reconciliation/rollback acceptance 4dc4964c92c7c5f7ae15731fcc65bceb05bfbb967befdc221d4f97c996493224/f71a027d20dddbdf59aa3adb26e1be1af0854d5f4e1ed537b749721a93c28957 and retained-state custody cba69e4d5680cd0ca3e344102d3848dbfa4e80d0b79a7e28610df5443d1b2de9. This accepts evidence completeness only and authorizes no live run, provider/resource/env mutation, upload activation, conversion, private CAD, Sandbox dispatch, deployment, merge or cleanup.',
}, null, 2) + '\n';

async function fixtureRun() {
  const register = createSyntheticRestrictedRegisterFixture();
  const projection = require('../offline/cad-convex/privateRestrictedRegisterReview')
    .createSourceSafeProjectionFromRestrictedRegister(register).projection;
  const projectionBytes = JSON.stringify(projection, null, 2) + '\n';
  const acceptanceReceiptBytes = receiptFixture();
  const fixture = createFixture();
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(key => [key, key]));
  const invoke = (_ref, input) => fixture.invoke(_ref, input);
  const adapter = createDurableEngineAdapter({ references, runQuery: invoke, runMutation: invoke });
  const result = await executeBoundedDevelopmentQualificationRun({
    register,
    projectionBytes,
    acceptanceReceiptBytes,
    oneRunApproval: {
      projectionSha256: hash(projectionBytes),
      acceptanceReceiptSha256: hash(acceptanceReceiptBytes),
      privateRestrictedRegisterDigest: hash(JSON.stringify(register)),
      restrictedCommandSetDigest: projection.restrictedCommandSetDigest,
      commandCardProjectionDigest: projection.commandCardProjectionDigest,
      automaticRetry: false,
      secondRun: false,
      uploadsEnabled: false,
    },
    adapter,
    disabledRouteCheck: async input => ({
      ok: true,
      phase: input.phase,
      status: 401,
      code: 'USER_SESSION_REQUIRED',
      bodySubscribed: false,
      uploadsEnabled: false,
      conversionDispatched: false,
      production: false,
    }),
    evidenceWriter: async evidence => ({ ref: 'rrb-ref:fixture-evidence-' + hash(JSON.stringify(evidence)).slice(0, 16) }),
    now: fixture.now,
  });
  emit(result, result.runCompleted ? 0 : 2);
}

if (process.argv.length === 3 && process.argv[2] === '--packet') emit(packet);
else if (process.argv.length === 3 && process.argv[2] === '--fixture-run') {
  fixtureRun().catch(() => emit({ decision: 'LIVE_RUN_BLOCKED', code: 'FIXTURE_RUN_FAILED' }, 1));
} else if (process.argv.length === 6 && process.argv[2] === '--inspect') {
  try {
    const register = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    const projectionBytes = fs.readFileSync(process.argv[4], 'utf8');
    const acceptanceReceiptBytes = fs.readFileSync(process.argv[5], 'utf8');
    const result = inspectAcceptedRunArtifacts({ register, projectionBytes, acceptanceReceiptBytes });
    emit(result, result.structureValid ? 0 : 2);
  } catch {
    emit({ decision: 'LIVE_RUN_BLOCKED', code: 'INSPECTION_INPUT_INVALID' }, 1);
  }
} else {
  emit({
    decision: 'LIVE_RUN_BLOCKED',
    code: 'COMMAND_INVALID',
    usage: [
      'node scripts/cad-bounded-dev-qualification-executor.js --packet',
      'node scripts/cad-bounded-dev-qualification-executor.js --fixture-run',
      'node scripts/cad-bounded-dev-qualification-executor.js --inspect <register.json> <projection.json> <receipt.json>',
    ],
  }, 1);
}
