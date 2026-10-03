const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const {
  CONTROLLED_UPLOAD_COMMAND_CARD_HEADER,
  CONTROLLED_UPLOAD_INSTALLATION_HEADER,
  CONTROLLED_UPLOAD_ROLLBACK_HEADER,
  CONTROLLED_UPLOAD_VALIDATION_HEADER,
  createCadUserUploadRouter,
} = require('../server/cadUserUploadRouter');
const {
  COHORT_REF,
  SESSION_REF,
  createControlledInternalUploadActivationManifest,
} = require('../server/cadControlledInternalUploadActivation');
const {
  APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256,
  APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256,
  DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
  DIGEST_DRIFT_REPAIR_WINDOW,
  createCadControlledUploadDigestDriftRepairActivationMount,
  createCadControlledUploadDigestDriftRepairReview,
  createSourceOwnedControlledUploadDeploymentMetadata,
} = require('../server/cadControlledUploadDigestDriftRepair');
const {
  proofDeploymentMetadata,
} = require('./cad-auth-controlled-upload-digest-drift-repair-checker');

const sha = value => createHash('sha256').update(value).digest('hex');
const now = () => Date.parse(DIGEST_DRIFT_REPAIR_WINDOW.proofNowUtc);

const principal = Object.freeze({
  schemaVersion: 1,
  userId: 'source-owned-internal-tester',
  shopId: 'source-owned-internal-shop',
  sessionId: SESSION_REF,
  cadUploadAllowed: true,
});

function ledger() {
  return {
    runs: new Set(),
    attempts: new Set(),
    rollbacks: new Set(),
    fences: new Set(),
    revoked: new Set(),
  };
}

function row(content, section, seq) {
  return `${String(content || '').padEnd(72, ' ').slice(0, 72)}${section}${String(seq).padStart(7, ' ')}`;
}

function syntheticIgesBody() {
  const rows = [
    row('Synthetic IGES for digest drift repair validation only', 'S', 1),
    row('1H,,1H;,7HReversR,9HSynthetic,32,38,6,308,15,1.0,1,2HIN,1,0.01;', 'G', 1),
    row('     100       1       0       0       0       0       0       0000000', 'D', 1),
    row('     100       0       0       1       0       0       0       0       0', 'D', 2),
    row('100,0,0,0;', 'P', 1),
    row('S      1G      1D      2P      1', 'T', 1),
  ];
  return {
    contentBase64: Buffer.from(rows.join('\n'), 'ascii').toString('base64'),
    fileName: 'synthetic-digest-drift-repair.igs',
    mimeType: 'model/iges',
  };
}

function baseRuntimeMount() {
  return Object.freeze({
    admissionSwitch: Object.freeze({
      decide: async () => Object.freeze({
        code: 'BASE_DEFAULT_CLOSED',
        bodyReadAuthorized: false,
        routeBodyGateAuthorized: false,
      }),
    }),
    routeBodyGate: Object.freeze({
      authorizeBodyRead: async () => Object.freeze({
        code: 'BASE_GATE_CLOSED',
        bodyReadAuthorized: false,
        routeBodyGateAuthorized: false,
      }),
      afterBodyAdmission: async () => Object.freeze({
        code: 'BASE_GATE_CLEANED',
        bodyReadAuthorized: false,
      }),
    }),
  });
}

async function routeFixture(t, liveOpeningRuntimeMount) {
  const credential = `${['us', '1.'].join('')}${Buffer.alloc(32, 7).toString('base64url')}`;
  const credentialDigest = sha(credential);
  const app = express();
  app.use('/api/cad', createCadUserUploadRouter({
    corsOrigins: ['https://approved.example'],
    liveOpeningRuntimeMount,
    now,
    sessionService: Object.freeze({
      async lookupSession(digest) {
        return digest === credentialDigest ? Object.freeze({
          schemaVersion: 1,
          userId: principal.userId,
          shopId: principal.shopId,
          sessionId: principal.sessionId,
          authMethod: 'password',
          status: 'active',
          expiresAt: Date.parse(DIGEST_DRIFT_REPAIR_WINDOW.expiresUtc),
          transport: 'bearer',
          cadUploadAllowed: true,
        }) : null;
      },
    }),
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return {
    credential,
    url: `http://127.0.0.1:${server.address().port}/api/cad/user-import`,
  };
}

test('repair converts provider deployment id metadata into source-owned digest reference', () => {
  const metadata = proofDeploymentMetadata();
  const repaired = createSourceOwnedControlledUploadDeploymentMetadata(metadata);

  assert.notEqual(metadata.deploymentReference, DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE);
  assert.equal(repaired.deploymentReference, DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE);
  assert.equal(repaired.deploymentTarget, metadata.deploymentTarget);
  assert.equal(repaired.gitCommitSha, metadata.gitCommitSha);
  assert.deepEqual(Object.keys(repaired).sort(), Object.keys(metadata).sort());
});

test('repair review resolves approval-bound command-card and installation digests', () => {
  const review = createCadControlledUploadDigestDriftRepairReview({
    deploymentMetadata: proofDeploymentMetadata(),
    now,
    ledger: ledger(),
  });

  assert.equal(review.sourceOnly, true);
  assert.equal(review.status, 'CONTROLLED_UPLOAD_DIGEST_DRIFT_REPAIR_READY_SOURCE_ONLY');
  assert.equal(review.repair.providerDeploymentIdIsProvenanceOnly, true);
  assert.equal(review.repair.sourceOwnedDeploymentReferenceResolved, true);
  assert.equal(review.binding.commandCardSha256, APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256);
  assert.equal(review.binding.installationSha256, APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256);
  assert.equal(review.authorizes.productionUploadActivation, false);
  assert.equal(review.authorizes.requestBodyAdmissionOrRead, false);
  assert.equal(review.authorizes.liveRetry, false);
  assert.equal(review.authorizes.secondLiveRun, false);
});

test('provider deployment id would drift without source-owned repair', () => {
  const metadata = proofDeploymentMetadata();
  const manifestWindow = {
    startUtc: DIGEST_DRIFT_REPAIR_WINDOW.startUtc,
    expiresUtc: DIGEST_DRIFT_REPAIR_WINDOW.expiresUtc,
    startInclusiveExpiryExclusive: true,
  };
  const providerManifest = createControlledInternalUploadActivationManifest({
    activationEnabled: true,
    currentDeploymentReference: metadata.deploymentReference,
    openingWindow: manifestWindow,
  });
  const sourceManifest = createControlledInternalUploadActivationManifest({
    activationEnabled: true,
    currentDeploymentReference: DIGEST_DRIFT_REPAIR_SOURCE_OWNED_DEPLOYMENT_REFERENCE,
    openingWindow: manifestWindow,
  });

  assert.notEqual(providerManifest.commandCardSha256, APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256);
  assert.notEqual(providerManifest.installationSha256, APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256);
  assert.equal(sourceManifest.commandCardSha256, APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256);
  assert.equal(sourceManifest.installationSha256, APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256);
});

test('deployed route proof headers use repaired source-owned digests', async t => {
  const controlledMount = createCadControlledUploadDigestDriftRepairActivationMount({
    deploymentMetadata: () => proofDeploymentMetadata(),
    now,
    ledger: ledger(),
    baseRuntimeMount: baseRuntimeMount(),
  });
  const fixture = await routeFixture(t, controlledMount);
  const response = await fetch(fixture.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${fixture.credential}`,
      'content-type': 'application/json',
      origin: 'https://approved.example',
    },
    body: JSON.stringify(syntheticIgesBody()),
  });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.code, 'USER_UPLOADS_DISABLED');
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_VALIDATION_HEADER), 'iges-body-validated');
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_ROLLBACK_HEADER), 'post-rollback-fail-closed-smoke-passed');
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_COMMAND_CARD_HEADER), APPROVED_DIGEST_DRIFT_REPAIR_COMMAND_CARD_SHA256);
  assert.equal(response.headers.get(CONTROLLED_UPLOAD_INSTALLATION_HEADER), APPROVED_DIGEST_DRIFT_REPAIR_INSTALLATION_SHA256);
  assert.doesNotMatch([...response.headers.values()].join('\n'), /contentBase64|synthetic-digest-drift-repair|private-session-credential/i);
});
