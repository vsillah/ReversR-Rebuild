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
