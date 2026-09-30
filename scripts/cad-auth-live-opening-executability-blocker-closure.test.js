const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const {
  CLEANUP_EFFECTS,
  FORWARD_EFFECTS,
  METHODS,
} = require('../server/cadLiveOpeningExecutableRuntimeWiring');
const {
  createCadLiveOpeningExecutableRuntimeBootstrap,
} = require('../server/cadLiveOpeningExecutableRuntimeBootstrap');
const {
  createUploadSessionVerifier,
} = require('../server/uploadSession');
const {
  BOUNDED_SESSION_REF,
  REVIEWED_DEPLOYMENT_ENV,
  REVIEWED_DURABLE_EVIDENCE_SHA256,
  REVIEWED_SESSION_CREDENTIAL_PRECONDITION,
  REVIEWED_VERCEL_DEPLOYMENT,
  REVIEWED_WINDOW,
  createDigestBoundSessionRecord,
  createReviewedProductionBindingInstallation,
  proofFromReviewedSource,
  reviewSessionCredentialPrecondition,
} = require('../server/cadLiveOpeningExecutabilityBlockerClosure');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('../server/cadProductionCurrentDeploymentMetadata');
const {
  resolveCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSourceInstall');
const {
  createCadProductionExecutionBindingSource,
} = require('../server/cadProductionExecutionBindingSource');
const {
  createCadProductionExecutionBinding,
} = require('../server/cadProductionExecutionBinding');
const checker = require('./cad-auth-live-opening-executability-blocker-closure-checker');

const sha = value => createHash('sha256').update(value).digest('hex');

function durableService(events = []) {
  const ledger = new Set();
  return Object.fromEntries(METHODS.map(operation => [operation, async input => {
    events.push({ operation, input });
    const receipt = {
      ...input,
      operation,
      ok: true,
      durable: true,
      expiryCheckedAtomically: true,
      explicitLiveGateApproved: true,
      evidenceSha256: input.durableEvidenceSha256,
      independentExpiryEnforced: true,
      atomicClaims: true,
      durableRollbackEnforced: true,
      immutableCurrent: true,
      failClosed: true,
      armed: true,
      bounded: true,
      concurrentSessions: 1,
      open: true,
      consumed: true,
      closed: true,
      revoked: true,
      bodyReads: 0,
      sessionGrants: 0,
      fenceClosed: true,
    };
    if (operation === 'claimRun' || operation === 'claimAttempt') {
      const key = `${input.runFenceKey}:${operation}`;
      receipt.claimed = !ledger.has(key);
      ledger.add(key);
    }
    return receipt;
  }]));
}

function executableMount(events = []) {
  const metadata = readCadProductionCurrentDeploymentMetadata(REVIEWED_DEPLOYMENT_ENV);
  const installation = createReviewedProductionBindingInstallation({
    deploymentMetadata: metadata,
    durableService: durableService(events),
  });
  const source = createCadProductionExecutionBindingSource(
    resolveCadProductionExecutionBindingSource(
      installation,
      () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    ),
  );
  return createCadLiveOpeningExecutableRuntimeBootstrap({
    executableRuntime: createCadProductionExecutionBinding(source),
  });
}

async function verifiedPrincipal() {
  const token = `${['u', 's', '1', '.'].join('')}${Buffer.alloc(32, 9).toString('base64url')}`;
  const tokenDigest = sha(token);
  const verifier = createUploadSessionVerifier({
    now: () => Date.parse(REVIEWED_WINDOW.proofNowUtc),
    lookupSession: async digest => (digest === tokenDigest
      ? createDigestBoundSessionRecord({ now: Date.parse(REVIEWED_WINDOW.proofNowUtc) })
      : null),
  });
  const verified = await verifier({
    headers: { authorization: `Bearer ${token}` },
    rawHeaders: ['authorization', `Bearer ${token}`],
  });
  assert.equal(verified.ok, true);
  return verified.principal;
}

test('reviewed source proves binding path while production defaults remain closed', () => {
  const proof = proofFromReviewedSource();
  assert.equal(proof.metadataAccepted, true);
  assert.equal(proof.liveGateSourceAccepted, true);
  assert.equal(proof.resolvedSourceNonNull, true);
  assert.equal(proof.executionBindingEnabled, true);
  assert.equal(proof.sessionCredentialPreconditionAccepted, true);
  assert.equal(proof.executablePathProven, true);
  assert.equal(proof.liveOpeningAuthorized, false);
  assert.equal(proof.runtimeActivated, false);
  assert.equal(proof.uploadSessionIssued, false);
  assert.equal(proof.requestBodyAdmittedOrRead, false);
});

test('session credential precondition rejects raw credentials and exact-field drift', () => {
  for (const mutate of [
    p => { p.credentialValueIncluded = true; },
    p => { p.uploadSessionIssuanceAuthorized = true; },
    p => { p.requiredVerifier = 'process.env.VALUE'; },
    p => { p.requiredLookupSource = 'provider-runtime'; },
    p => { p.exactBoundedSessionRef = 'wrong'; },
    p => { p.exactSessionId = 'wrong'; },
    p => { p.exactDurableEvidenceSha256 = '0'.repeat(64); },
    p => { p.acceptedTransports = ['bearer']; },
    p => { p.requiredRecord.status = 'revoked'; },
    p => { p.credential = 'BLOCKED_SENTINEL'; },
    p => { p.token = 'BLOCKED_SENTINEL'; },
    p => { p.secret = 'BLOCKED_SENTINEL'; },
  ]) {
    const candidate = JSON.parse(JSON.stringify(REVIEWED_SESSION_CREDENTIAL_PRECONDITION));
    mutate(candidate);
    const result = reviewSessionCredentialPrecondition(candidate);
    assert.equal(result.accepted, false);
    assert.equal(result.effectsExecuted, 0);
  }
});

test('source-owned verifier principal reaches executable runtime gate without request-body read', async () => {
  const events = [];
  const mount = executableMount(events);
  const principal = await verifiedPrincipal();
  assert.equal(principal.sessionId, BOUNDED_SESSION_REF);
  const admissionDecision = await mount.admissionSwitch.decide({
    bodyAdmissionAuthorized: false,
    principal,
  });
  assert.equal(admissionDecision.bodyReadAuthorized, true);
  const bodyGateDecision = await mount.routeBodyGate.authorizeBodyRead({
    bodyAdmissionAuthorized: false,
    principal,
    admissionDecision,
  });
  assert.equal(bodyGateDecision.routeBodyGateAuthorized, true);
  assert.deepEqual(events.map(event => event.operation), FORWARD_EFFECTS);
  const closed = await mount.routeBodyGate.afterBodyAdmission();
  assert.equal(closed.rollbackVerified, true);
  assert.deepEqual(events.slice(-CLEANUP_EFFECTS.length).map(event => event.operation),
    CLEANUP_EFFECTS);
});

test('drifted deployment metadata and missing session precondition block proof', () => {
  assert.equal(proofFromReviewedSource({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata({
      ...REVIEWED_DEPLOYMENT_ENV,
      VERCEL_DEPLOYMENT_ID: 'dpl_staleDeploymentReference000000',
    }),
  }).executablePathProven, false);
  assert.equal(proofFromReviewedSource({
    sessionCredentialPrecondition: {
      ...REVIEWED_SESSION_CREDENTIAL_PRECONDITION,
      exactDurableEvidenceSha256: REVIEWED_DURABLE_EVIDENCE_SHA256.replace(/.$/, '0'),
    },
  }).executablePathProven, false);
  assert.equal(createReviewedProductionBindingInstallation({
    deploymentMetadata: readCadProductionCurrentDeploymentMetadata({
      ...REVIEWED_DEPLOYMENT_ENV,
      VERCEL_DEPLOYMENT_ID: REVIEWED_VERCEL_DEPLOYMENT,
      VERCEL_GIT_COMMIT_SHA: '0'.repeat(40),
    }),
  }), null);
});

test('checker validates packet, rejects source drift and never accepts live arguments', () => {
  const packet = JSON.parse(fs.readFileSync(checker.PACKET));
  assert.equal(checker.checkPacket(packet).ok, true);
  assert.equal(packet.blockersClosed.defaultProductionBindingSourceGate, true);
  assert.equal(packet.blockersClosed.exactSessionCredentialPrecondition, true);
  assert.equal(packet.liveOpeningAuthorized, false);
  assert.doesNotMatch(JSON.stringify(packet), /BLOCKED_SENTINEL|\/Users\/|\.local\//);
  for (const file of checker.SOURCES) {
    const result = checker.checkPacket(packet, candidate => Buffer.concat([
      fs.readFileSync(candidate),
      Buffer.from(candidate === file ? 'drift' : ''),
    ]));
    assert.equal(result.ok, false, file);
  }
  for (const args of [['--execute'], ['--live'], ['--activate'], ['--issue-command-card'], ['BLOCKED_SENTINEL']]) {
    const result = spawnSync(process.execPath, [
      'scripts/cad-auth-live-opening-executability-blocker-closure-checker.js',
      ...args,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).effectsExecuted, 0);
    assert.doesNotMatch(result.stdout + result.stderr, /BLOCKED_SENTINEL/);
  }
});
