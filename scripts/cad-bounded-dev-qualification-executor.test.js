const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { FUNCTIONS, createDurableEngineAdapter } = require('../offline/cad-convex/durableEngineAdapter');
const { createSyntheticRestrictedRegisterFixture, createSourceSafeProjectionFromRestrictedRegister } = require('../offline/cad-convex/privateRestrictedRegisterReview');
const { createFixture } = require('./helpers/cad-durable-engine-fixture');
const {
  packet,
  inspectAcceptedRunArtifacts,
  inspectRebuiltSuccessorRunArtifacts,
  inspectRestrictedCommandDescriptors,
  executeBoundedDevelopmentQualificationRun,
} = require('../offline/cad-convex/boundedDevQualificationExecutor');

const hash = bytes => crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');

function acceptanceReceiptFixture() {
  return JSON.stringify({
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
}

function acceptedArtifacts() {
  const register = createSyntheticRestrictedRegisterFixture();
  const projection = createSourceSafeProjectionFromRestrictedRegister(register).projection;
  const projectionBytes = JSON.stringify(projection, null, 2) + '\n';
  const acceptanceReceiptBytes = acceptanceReceiptFixture();
  assert.equal(hash(projectionBytes), packet.acceptedEvidence.projectionSha256);
  assert.equal(hash(acceptanceReceiptBytes), packet.acceptedEvidence.acceptanceReceiptSha256);
  assert.equal(hash(JSON.stringify(register)), packet.acceptedEvidence.privateRestrictedRegisterDigest);
  return { register, projection, projectionBytes, acceptanceReceiptBytes };
}

function earlierWindowSuccessorArtifacts(t) {
  const base = path.join('.local', 'cad-convex', 'earlier-window-successor-evidence');
  const files = {
    register: path.join(base, 'successor-earlier-window-restricted-register.json'),
    projection: path.join(base, 'successor-earlier-window-source-safe-projection.json'),
    receipt: path.join(base, 'successor-earlier-window-evidence-acceptance-receipt.json'),
  };
  if (!Object.values(files).every(file => fs.existsSync(file))) {
    t.skip('ignored earlier-window successor restricted evidence artifacts are not present in this checkout');
    return null;
  }
  const register = JSON.parse(fs.readFileSync(files.register, 'utf8'));
  const projectionBytes = fs.readFileSync(files.projection, 'utf8');
  const acceptanceReceiptBytes = fs.readFileSync(files.receipt, 'utf8');
  const projection = JSON.parse(projectionBytes);
  return { register, projection, projectionBytes, acceptanceReceiptBytes };
}

function freshWindowSuccessorArtifacts(t) {
  const base = path.join('.local', 'cad-convex', 'fresh-window-evidence-assembly');
  const files = {
    register: path.join(base, 'fresh-window-restricted-register.json'),
    projection: path.join(base, 'fresh-window-source-safe-projection.json'),
    receipt: path.join(base, 'fresh-window-evidence-acceptance-receipt.json'),
  };
  if (!Object.values(files).every(file => fs.existsSync(file))) {
    t.skip('ignored fresh-window successor restricted evidence artifacts are not present in this checkout');
    return null;
  }
  const register = JSON.parse(fs.readFileSync(files.register, 'utf8'));
  const projectionBytes = fs.readFileSync(files.projection, 'utf8');
  const acceptanceReceiptBytes = fs.readFileSync(files.receipt, 'utf8');
  const projection = JSON.parse(projectionBytes);
  return { register, projection, projectionBytes, acceptanceReceiptBytes };
}

function freshWindow1030SuccessorArtifacts(t) {
  const base = path.join('.local', 'cad-convex', 'fresh-window-1030-evidence-assembly');
  const files = {
    register: path.join(base, 'fresh-window-1030-restricted-register.json'),
    projection: path.join(base, 'fresh-window-1030-source-safe-projection.json'),
    receipt: path.join(base, 'fresh-window-1030-evidence-acceptance-receipt.json'),
  };
  if (!Object.values(files).every(file => fs.existsSync(file))) {
    t.skip('ignored fresh-window-1030 successor restricted evidence artifacts are not present in this checkout');
    return null;
  }
  const register = JSON.parse(fs.readFileSync(files.register, 'utf8'));
  const projectionBytes = fs.readFileSync(files.projection, 'utf8');
  const acceptanceReceiptBytes = fs.readFileSync(files.receipt, 'utf8');
  const projection = JSON.parse(projectionBytes);
  return { register, projection, projectionBytes, acceptanceReceiptBytes };
}

function oneRunApproval(artifacts) {
  return {
    projectionSha256: hash(artifacts.projectionBytes),
    acceptanceReceiptSha256: hash(artifacts.acceptanceReceiptBytes),
    privateRestrictedRegisterDigest: hash(JSON.stringify(artifacts.register)),
    restrictedCommandSetDigest: artifacts.projection.restrictedCommandSetDigest,
    commandCardProjectionDigest: artifacts.projection.commandCardProjectionDigest,
    automaticRetry: false,
    secondRun: false,
    uploadsEnabled: false,
  };
}

function fixtureAdapter(fixture, options = {}) {
  const references = Object.fromEntries(Object.keys(FUNCTIONS).map(key => [key, key]));
  const invoke = (_ref, input) => {
    if (options.throwOnMutation && ['initialize', 'transact', 'changeAuthority', 'claim', 'scanPage', 'stop'].includes(_ref))
      throw new Error('forced');
    return fixture.invoke(_ref, input);
  };
  return createDurableEngineAdapter({ references, runQuery: invoke, runMutation: invoke });
}

function disabledRouteCheck(input) {
  return {
    ok: true,
    phase: input.phase,
    status: 401,
    code: 'USER_SESSION_REQUIRED',
    bodySubscribed: false,
    uploadsEnabled: false,
    conversionDispatched: false,
    production: false,
  };
}

test('executor packet binds accepted digests while keeping every authority gate false', () => {
  assert.equal(packet.mode, 'source-only-bounded-development-qualification-executor');
  assert.equal(packet.baseCommit, 'cf066a38f30df8b4bbd04042775fcf3dca7a0810');
  assert.equal(packet.sourcePacketCommit, 'a4fd2568269e6991a8621784e73effc7a8722ad5');
  assert.equal(packet.acceptedEvidence.projectionSha256, '2355757d7415cb1512d234c69f90cd670cc4c1a405c31f7102140622507e77d4');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.projectionSha256, '1dbdf153921a1676c8870827fd619706e1a6bd143835a6cb623be13590dae566');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.acceptanceReceiptSha256, '898bf16b7078730123aa9f1416d21dcfd1e5f07a2272ac15024563a6dbb498e8');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.privateRestrictedRegisterDigest, 'd2018ce44048a32a495a0c6095c4fafdffe375766dd0f9a4aafc5806e6ebb237');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.restrictedCommandSetDigest, 'e1a74e5b4ea72c55b6b72845a1e924c4659f11eebd8ef216c3104f2a3abd51ee');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.commandCardProjectionDigest, '2b79a9ca19197b12082301ef45dfe7dcc803e84238882f16304b56c8e09e5fac');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.sourceMainCommit, 'd09e40f7fd946da803b3166b60246b57b1f5ddac');
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.sourcePr, 220);
  assert.equal(packet.acceptedRebuiltSuccessorEvidence.runRef, 'rrb-ref:successor-early-window-bounded-development-run');
  assert.equal(packet.acceptedFreshWindowEvidence.projectionSha256, '6c0289bd0d59aeb2393112291341e49c5751f0fd8c74c0a1e218cf314a57bb61');
  assert.equal(packet.acceptedFreshWindowEvidence.acceptanceReceiptSha256, '6f8de5ff724ea1e19ee198fd5ba6793e6712e6684923cb7bd0c0a3e51387d23c');
  assert.equal(packet.acceptedFreshWindowEvidence.privateRestrictedRegisterDigest, '84e80c4a26096709e2d9b308597ec8107944d0ff321d40de8f3dd1c7ed933427');
  assert.equal(packet.acceptedFreshWindowEvidence.restrictedCommandSetDigest, 'f58fa1ad88e99d6cee4a96398c616b23ebfc4be415771c66acf75f671e2b9ad2');
  assert.equal(packet.acceptedFreshWindowEvidence.commandCardProjectionDigest, '296400ff9502a4a31d6eb7c1f123325e13b296875c73da43d34e5c3ad3ad5310');
  assert.equal(packet.acceptedFreshWindowEvidence.sourceMainCommit, '30196c62648e4bcbb080ae5c7a6ab9396b8d48a9');
  assert.equal(packet.acceptedFreshWindowEvidence.sourcePacketCommit, '273acc9f468366536387a8dc4db15167f2b0efcd');
  assert.equal(packet.acceptedFreshWindowEvidence.sourcePr, 222);
  assert.equal(packet.acceptedFreshWindowEvidence.runRef, 'rrb-ref:fresh-window-0300-bounded-development-run');
  assert.equal(packet.acceptedFreshWindowEvidence.window.startUtc, '2026-09-15T03:00:00Z');
  assert.equal(packet.acceptedFreshWindowEvidence.window.expiresUtc, '2026-09-15T03:05:00Z');
  assert.equal(packet.acceptedFreshWindow1030Evidence.projectionSha256, '8cfdb4f8b6fdce4a6de3b494c060f518130707cccd2e514295773a226c5e5fbd');
  assert.equal(packet.acceptedFreshWindow1030Evidence.acceptanceReceiptSha256, '9170213b22b3945dd448670de615c71e3aad948dfd120fcc9b3ed3c42301d142');
  assert.equal(packet.acceptedFreshWindow1030Evidence.privateRestrictedRegisterDigest, 'c1cd10673951d7407be95fb77a5ae98d135d00976c8eab48d687f67b25283bfc');
  assert.equal(packet.acceptedFreshWindow1030Evidence.restrictedCommandSetDigest, '7beedfe71bad86353ccbf467390d38aaa188a6b30975521a34e546be3c42384e');
  assert.equal(packet.acceptedFreshWindow1030Evidence.commandCardProjectionDigest, '13f0a71d1ea7de9b2ad97374ecda246beed97b1cdff63184a0b4f445b9209910');
  assert.equal(packet.acceptedFreshWindow1030Evidence.sourceMainCommit, '4ac1deb6acecc4841716c5a98993ba0d823b56a4');
  assert.equal(packet.acceptedFreshWindow1030Evidence.sourcePacketCommit, '3d7ec5c3585886c6032f7f3ccce8fa3af5fd42f0');
  assert.equal(packet.acceptedFreshWindow1030Evidence.sourcePr, 223);
  assert.equal(packet.acceptedFreshWindow1030Evidence.runRef, 'rrb-ref:fresh-window-1030-bounded-development-run');
  assert.equal(packet.acceptedFreshWindow1030Evidence.window.startUtc, '2026-09-15T10:30:00Z');
  assert.equal(packet.acceptedFreshWindow1030Evidence.window.expiresUtc, '2026-09-15T10:35:00Z');
  assert.equal(packet.executableBridgeSource, true);
  assert.equal(packet.providerClientBundled, false);
  for (const key of ['liveRunAuthorized', 'uploadsEnabled', 'conversionEnabled']) assert.equal(packet[key], false);
  assert.ok(Object.values(packet.gates).every(value => value === false));
  assert.deepEqual(packet.cards.map(card => card.id), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.match(packet.nextHumanGates.publication, /Approve pushing only commit \[full reviewed SHA\]/);
  assert.match(packet.nextHumanGates.liveQualification, /Keep CAD uploads disabled/);
});

test('accepted restricted register, projection and receipt inspect without leaking raw values', () => {
  const artifacts = acceptedArtifacts();
  const result = inspectAcceptedRunArtifacts(artifacts);
  assert.equal(result.structureValid, true);
  assert.equal(result.acceptedArtifacts, true);
  assert.equal(result.decision, 'EXECUTOR_BINDING_READY');
  assert.equal(result.projectionSha256, packet.acceptedEvidence.projectionSha256);
  assert.equal(result.acceptanceReceiptSha256, packet.acceptedEvidence.acceptanceReceiptSha256);
  assert.equal(result.privateRestrictedRegisterDigest, packet.acceptedEvidence.privateRestrictedRegisterDigest);
  assert.deepEqual(result.commandCards.map(card => card.cardId), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.ok(!JSON.stringify(result).includes(artifacts.register.restrictedEvidence['identity.runId'].valueBytes));
  assert.ok(!JSON.stringify(result).includes(artifacts.register.restrictedCommandBytes.C2));
});

test('accepted earlier-window successor artifacts inspect and execute through the local fixture only', async t => {
  const artifacts = earlierWindowSuccessorArtifacts(t);
  if (!artifacts) return;
  const result = inspectAcceptedRunArtifacts(artifacts);
  assert.equal(result.structureValid, true);
  assert.equal(result.acceptedArtifacts, true);
  assert.equal(result.decision, 'EXECUTOR_BINDING_READY');
  assert.equal(result.acceptedEvidenceKey, 'acceptedRebuiltSuccessorEvidence');
  assert.equal(result.projectionSha256, packet.acceptedRebuiltSuccessorEvidence.projectionSha256);
  assert.equal(result.acceptanceReceiptSha256, packet.acceptedRebuiltSuccessorEvidence.acceptanceReceiptSha256);
  assert.equal(result.privateRestrictedRegisterDigest, packet.acceptedRebuiltSuccessorEvidence.privateRestrictedRegisterDigest);
  assert.equal(result.restrictedCommandSetDigest, packet.acceptedRebuiltSuccessorEvidence.restrictedCommandSetDigest);
  assert.equal(result.commandCardProjectionDigest, packet.acceptedRebuiltSuccessorEvidence.commandCardProjectionDigest);
  assert.deepEqual(result.commandCards.map(card => card.cardId), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.ok(!JSON.stringify(result).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  const direct = inspectRebuiltSuccessorRunArtifacts(artifacts);
  assert.equal(direct.structureValid, true);

  const fixture = createFixture();
  let evidence = null;
  const executed = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(fixture),
    disabledRouteCheck,
    evidenceWriter: async value => {
      evidence = value;
      return { ref: 'rrb-ref:earlier-window-evidence-' + hash(JSON.stringify(value)).slice(0, 16) };
    },
    now: fixture.now,
  });
  assert.equal(executed.decision, 'DEVELOPMENT_QUALIFICATION_EXECUTED');
  assert.equal(executed.runCompleted, true);
  assert.equal(executed.automaticRetry, false);
  assert.equal(executed.secondRun, false);
  assert.equal(executed.uploadsEnabled, false);
  assert.equal(executed.conversionEnabled, false);
  assert.equal(evidence.acceptedEvidenceKey, 'acceptedRebuiltSuccessorEvidence');
  assert.equal(evidence.acceptedProjectionSha256, packet.acceptedRebuiltSuccessorEvidence.projectionSha256);
  assert.equal(evidence.commandCardProjectionDigest, packet.acceptedRebuiltSuccessorEvidence.commandCardProjectionDigest);
  assert.ok(!JSON.stringify(evidence).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  assert.equal(artifacts.projection.window.startUtc, '2026-09-15T01:00:00Z');
  assert.equal(artifacts.projection.window.expiresUtc, '2026-09-15T01:05:00Z');
});

test('accepted fresh-window successor artifacts inspect and execute through the local fixture only', async t => {
  const artifacts = freshWindowSuccessorArtifacts(t);
  if (!artifacts) return;
  const result = inspectAcceptedRunArtifacts(artifacts);
  assert.equal(result.structureValid, true);
  assert.equal(result.acceptedArtifacts, true);
  assert.equal(result.decision, 'EXECUTOR_BINDING_READY');
  assert.equal(result.acceptedEvidenceKey, 'acceptedFreshWindowEvidence');
  assert.equal(result.projectionSha256, packet.acceptedFreshWindowEvidence.projectionSha256);
  assert.equal(result.acceptanceReceiptSha256, packet.acceptedFreshWindowEvidence.acceptanceReceiptSha256);
  assert.equal(result.privateRestrictedRegisterDigest, packet.acceptedFreshWindowEvidence.privateRestrictedRegisterDigest);
  assert.equal(result.restrictedCommandSetDigest, packet.acceptedFreshWindowEvidence.restrictedCommandSetDigest);
  assert.equal(result.commandCardProjectionDigest, packet.acceptedFreshWindowEvidence.commandCardProjectionDigest);
  assert.deepEqual(result.commandCards.map(card => card.cardId), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.ok(!JSON.stringify(result).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  const direct = inspectRebuiltSuccessorRunArtifacts(artifacts);
  assert.equal(direct.structureValid, true);
  assert.equal(direct.acceptedEvidenceKey, 'acceptedFreshWindowEvidence');

  const fixture = createFixture();
  let evidence = null;
  const executed = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(fixture),
    disabledRouteCheck,
    evidenceWriter: async value => {
      evidence = value;
      return { ref: 'rrb-ref:fresh-window-evidence-' + hash(JSON.stringify(value)).slice(0, 16) };
    },
    now: fixture.now,
  });
  assert.equal(executed.decision, 'DEVELOPMENT_QUALIFICATION_EXECUTED');
  assert.equal(executed.runCompleted, true);
  assert.equal(executed.automaticRetry, false);
  assert.equal(executed.secondRun, false);
  assert.equal(executed.uploadsEnabled, false);
  assert.equal(executed.conversionEnabled, false);
  assert.equal(evidence.acceptedEvidenceKey, 'acceptedFreshWindowEvidence');
  assert.equal(evidence.acceptedProjectionSha256, packet.acceptedFreshWindowEvidence.projectionSha256);
  assert.equal(evidence.commandCardProjectionDigest, packet.acceptedFreshWindowEvidence.commandCardProjectionDigest);
  assert.ok(!JSON.stringify(evidence).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  assert.equal(artifacts.projection.window.startUtc, '2026-09-15T03:00:00Z');
  assert.equal(artifacts.projection.window.expiresUtc, '2026-09-15T03:05:00Z');
});

test('accepted fresh-window-1030 successor artifacts inspect and execute through the local fixture only', async t => {
  const artifacts = freshWindow1030SuccessorArtifacts(t);
  if (!artifacts) return;
  const result = inspectAcceptedRunArtifacts(artifacts);
  assert.equal(result.structureValid, true);
  assert.equal(result.acceptedArtifacts, true);
  assert.equal(result.decision, 'EXECUTOR_BINDING_READY');
  assert.equal(result.acceptedEvidenceKey, 'acceptedFreshWindow1030Evidence');
  assert.equal(result.projectionSha256, packet.acceptedFreshWindow1030Evidence.projectionSha256);
  assert.equal(result.acceptanceReceiptSha256, packet.acceptedFreshWindow1030Evidence.acceptanceReceiptSha256);
  assert.equal(result.privateRestrictedRegisterDigest, packet.acceptedFreshWindow1030Evidence.privateRestrictedRegisterDigest);
  assert.equal(result.restrictedCommandSetDigest, packet.acceptedFreshWindow1030Evidence.restrictedCommandSetDigest);
  assert.equal(result.commandCardProjectionDigest, packet.acceptedFreshWindow1030Evidence.commandCardProjectionDigest);
  assert.deepEqual(result.commandCards.map(card => card.cardId), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.ok(!JSON.stringify(result).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  const direct = inspectRebuiltSuccessorRunArtifacts(artifacts);
  assert.equal(direct.structureValid, true);
  assert.equal(direct.acceptedEvidenceKey, 'acceptedFreshWindow1030Evidence');

  const fixture = createFixture();
  let evidence = null;
  const executed = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(fixture),
    disabledRouteCheck,
    evidenceWriter: async value => {
      evidence = value;
      return { ref: 'rrb-ref:fresh-window-1030-evidence-' + hash(JSON.stringify(value)).slice(0, 16) };
    },
    now: fixture.now,
  });
  assert.equal(executed.decision, 'DEVELOPMENT_QUALIFICATION_EXECUTED');
  assert.equal(executed.runCompleted, true);
  assert.equal(executed.automaticRetry, false);
  assert.equal(executed.secondRun, false);
  assert.equal(executed.uploadsEnabled, false);
  assert.equal(executed.conversionEnabled, false);
  assert.equal(evidence.acceptedEvidenceKey, 'acceptedFreshWindow1030Evidence');
  assert.equal(evidence.acceptedProjectionSha256, packet.acceptedFreshWindow1030Evidence.projectionSha256);
  assert.equal(evidence.commandCardProjectionDigest, packet.acceptedFreshWindow1030Evidence.commandCardProjectionDigest);
  assert.ok(!JSON.stringify(evidence).includes(artifacts.register.restrictedCommandCards.C2.restrictedCommandBytes));
  assert.equal(artifacts.projection.window.startUtc, '2026-09-15T10:30:00Z');
  assert.equal(artifacts.projection.window.expiresUtc, '2026-09-15T10:35:00Z');
});

test('restricted command bytes are descriptors, not shell or provider commands', () => {
  const artifacts = acceptedArtifacts();
  const result = inspectRestrictedCommandDescriptors(artifacts.register, artifacts.projection);
  assert.equal(result.structureValid, true);
  for (const card of result.descriptors) {
    assert.equal(card.executableCommandBytes, false);
    assert.match(card.sha256, /^[a-f0-9]{64}$/);
    assert.ok(card.byteCount > 0);
  }
});

test('fixture execution uses only injected adapter and records sanitized evidence', async () => {
  const artifacts = acceptedArtifacts();
  const fixture = createFixture();
  let evidence = null;
  const result = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(fixture),
    disabledRouteCheck,
    evidenceWriter: async value => {
      evidence = value;
      return { ref: 'rrb-ref:test-evidence-' + hash(JSON.stringify(value)).slice(0, 16) };
    },
    now: fixture.now,
  });
  assert.equal(result.decision, 'DEVELOPMENT_QUALIFICATION_EXECUTED');
  assert.equal(result.runCompleted, true);
  assert.equal(result.unknownOutcome, false);
  assert.equal(result.automaticRetry, false);
  assert.equal(result.secondRun, false);
  assert.equal(result.uploadsEnabled, false);
  assert.equal(result.conversionEnabled, false);
  assert.deepEqual(result.cards.map(card => card.cardId), ['C0', 'C1', 'C2', 'C3', 'C4']);
  assert.equal(evidence.routeChecks.length, 2);
  assert.ok(evidence.engineCodes.some(row => row.operation === 'reserve-transaction' && row.code === 'CONFLICT'));
  assert.ok(evidence.engineCodes.some(row => row.operation === 'authority-revoke-or-delete-synthetic' && row.code === 'AUTHORITY_REVOKED'));
  assert.ok(evidence.engineCodes.some(row => row.operation === 'scan-bounded-page' && row.code === 'PAGE_SCANNED'));
  assert.ok(!JSON.stringify(evidence).includes(artifacts.register.restrictedCommandBytes.C0));
  const snapshot = fixture.snapshot();
  assert.equal(snapshot.ledgers.length, 1);
  assert.equal(snapshot.ledgers[0].stopped, true);
  assert.equal(snapshot.authority.filter(row => row.active === false).length, 1);
});

test('executor uses live-safe function references, rolling deadlines and initialized-run resume', async () => {
  const artifacts = acceptedArtifacts();
  const fixture = createFixture();
  const references = Object.fromEntries(Object.entries(FUNCTIONS).map(([key, value]) => [key, value.name]));
  assert.deepEqual(references, {
    initialize: 'cadDurableEngine.js:initialize',
    readExact: 'cadDurableEngine.js:readExact',
    readAuthority: 'cadDurableEngine.js:readAuthority',
    transact: 'cadDurableEngine.js:transact',
    changeAuthority: 'cadDurableEngine.js:changeAuthority',
    claim: 'cadDurableEngine.js:claim',
    settle: 'cadDurableEngine.js:settle',
    scanPage: 'cadDurableEngine.js:scanPage',
    stop: 'cadDurableEngine.js:stop',
  });
  const operationFromReference = Object.fromEntries(Object.entries(FUNCTIONS)
    .map(([key, value]) => [value.name, key]));
  const firstAttemptAdapter = createDurableEngineAdapter({
    references,
    runQuery: () => { throw new Error('query transport unavailable'); },
    runMutation: (refName, input) => fixture.invoke(operationFromReference[refName], input),
  });
  const firstAttempt = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: firstAttemptAdapter,
    disabledRouteCheck,
    evidenceWriter: async () => ({ ref: 'rrb-ref:first-stopped-evidence' }),
    now: fixture.now,
  });
  assert.equal(firstAttempt.runCompleted, false);
  assert.equal(firstAttempt.unknownOutcome, false);
  assert.equal(firstAttempt.steps.at(-1).code, 'ENGINE_UNAVAILABLE');
  assert.equal(fixture.snapshot().ledgers[0].controlState.revision, 0);

  let clock = 100;
  const deadlines = [];
  const rollingNow = () => {
    const value = clock;
    fixture.setTime(value);
    clock += 50;
    return value;
  };
  const adapter = createDurableEngineAdapter({
    references,
    runQuery: (refName, input) => {
      deadlines.push(input.deadlineAt);
      return fixture.invoke(operationFromReference[refName], input);
    },
    runMutation: (refName, input) => {
      deadlines.push(input.deadlineAt);
      return fixture.invoke(operationFromReference[refName], input);
    },
  });
  const resumed = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter,
    disabledRouteCheck,
    evidenceWriter: async value => ({ ref: 'rrb-ref:resume-evidence-' + hash(JSON.stringify(value)).slice(0, 16) }),
    now: rollingNow,
  });
  assert.equal(resumed.runCompleted, true);
  assert.ok(resumed.steps.some(step => step.operation === 'seed-synthetic-metadata'
    && step.code === 'RUN_ALREADY_EXISTS'));
  assert.ok(deadlines.every(value => Number.isSafeInteger(value) && value > 100 && value <= 5000));
  assert.ok(new Set(deadlines).size > 1);
});

test('missing approval, unsafe route checks and unknown mutation outcomes stop closed', async () => {
  const artifacts = acceptedArtifacts();
  const fixture = createFixture();
  assert.equal((await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    adapter: fixtureAdapter(fixture),
    disabledRouteCheck,
  })).code, 'ONE_RUN_APPROVAL_REQUIRED');
  const unsafeRoute = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(createFixture()),
    disabledRouteCheck: () => ({ ok: true, phase: 'pre', status: 200, bodySubscribed: true,
      uploadsEnabled: true, conversionDispatched: false, production: false }),
  });
  assert.equal(unsafeRoute.code, 'DISABLED_ROUTE_PRECHECK_FAILED');
  const unknown = await executeBoundedDevelopmentQualificationRun({
    ...artifacts,
    oneRunApproval: oneRunApproval(artifacts),
    adapter: fixtureAdapter(createFixture(), { throwOnMutation: true }),
    disabledRouteCheck,
  });
  assert.equal(unknown.runCompleted, false);
  assert.equal(unknown.unknownOutcome, true);
});

test('malformed artifacts and private-looking projections fail sanitized', () => {
  const artifacts = acceptedArtifacts();
  const changedReceipt = JSON.parse(artifacts.acceptanceReceiptBytes);
  changedReceipt.approvalScope.liveRunAuthorized = true;
  const result = inspectAcceptedRunArtifacts({
    ...artifacts,
    acceptanceReceiptBytes: JSON.stringify(changedReceipt, null, 2) + '\n',
  });
  assert.equal(result.structureValid, false);
  assert.ok(result.errors.includes('ACCEPTANCE_RECEIPT_DIGEST_MISMATCH'));
  const changedRegister = structuredClone(artifacts.register);
  changedRegister.restrictedCommandBytes.C0 = JSON.stringify({ shell: 'node live-run.js' });
  const invalid = inspectAcceptedRunArtifacts({
    register: changedRegister,
    projectionBytes: artifacts.projectionBytes,
    acceptanceReceiptBytes: artifacts.acceptanceReceiptBytes,
  });
  assert.equal(invalid.structureValid, false);
  assert.ok(!JSON.stringify(invalid).includes('node live-run.js'));
});

test('CLI exposes packet, fixture run and inspect mode without live execution', () => {
  const packetRun = spawnSync(process.execPath, ['scripts/cad-bounded-dev-qualification-executor.js', '--packet'], { encoding: 'utf8' });
  assert.equal(packetRun.status, 0);
  assert.equal(JSON.parse(packetRun.stdout).providerClientBundled, false);
  const fixtureRun = spawnSync(process.execPath, ['scripts/cad-bounded-dev-qualification-executor.js', '--fixture-run'], { encoding: 'utf8' });
  assert.equal(fixtureRun.status, 0);
  assert.equal(JSON.parse(fixtureRun.stdout).runCompleted, true);

  const artifacts = acceptedArtifacts();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-executor-'));
  const files = {
    register: path.join(dir, 'register.json'),
    projection: path.join(dir, 'projection.json'),
    receipt: path.join(dir, 'receipt.json'),
  };
  fs.writeFileSync(files.register, JSON.stringify(artifacts.register));
  fs.writeFileSync(files.projection, artifacts.projectionBytes);
  fs.writeFileSync(files.receipt, artifacts.acceptanceReceiptBytes);
  const inspect = spawnSync(process.execPath, ['scripts/cad-bounded-dev-qualification-executor.js',
    '--inspect', files.register, files.projection, files.receipt], { encoding: 'utf8' });
  assert.equal(inspect.status, 0);
  assert.equal(JSON.parse(inspect.stdout).acceptedArtifacts, true);
});

test('source remains offline by default and runtime upload route stays disconnected', () => {
  const source = fs.readFileSync('offline/cad-convex/boundedDevQualificationExecutor.js', 'utf8');
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|https?\.request|node:fs|child_process|convex\/browser/);
  const script = fs.readFileSync('scripts/cad-bounded-dev-qualification-executor.js', 'utf8');
  assert.doesNotMatch(script, /fetch\s*\(|https?\.request|convex\/browser|process\.env/);
  const route = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  assert.match(route, /const BODY_ADMISSION_AUTHORIZED = false;/);
  assert.doesNotMatch(route, /boundedDevQualificationExecutor|durableEngineAdapter|cadDurableEngine/);
});
