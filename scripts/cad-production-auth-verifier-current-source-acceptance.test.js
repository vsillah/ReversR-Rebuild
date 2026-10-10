const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  HISTORICAL_PACKET,
  HISTORICAL_PACKET_SHA256,
  PACKET,
  SOURCES,
  checkAcceptance,
  expectedPacket,
} = require('./cad-production-auth-verifier-current-source-acceptance-checker');
const { checkAcceptance: checkHistoricalAcceptance } = require('./cad-production-auth-verifier-acceptance-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const packet = JSON.parse(read(PACKET));
const copy = () => structuredClone(packet);

function denied(value, options) {
  const result = checkAcceptance(value, options);
  assert.equal(result.ok, false);
  assert.equal(result.historicalPacketReusable, false);
  assert.equal(result.historicalApprovalReusable, false);
  assert.equal(result.historicalWindowReusable, false);
  assert.equal(result.productionVerifierAccepted, false);
  assert.equal(result.uploadSessionIssuanceEnabled, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
}

test('current-source successor binds PR 480 and current main while leaving all gates closed', () => {
  const result = checkAcceptance(packet);
  assert.equal(result.ok, true);
  assert.equal(packet.schemaVersion, 2);
  assert.equal(packet.lineage.routerChangePullRequest, 480);
  assert.equal(packet.lineage.routerChangeCommit, '078f67889a7284939c18add425a3f6df7aebe4f5');
  assert.equal(packet.lineage.routerMergeCommit, 'f42c2d8a4f489856582aa33962b795f78f610fc3');
  assert.equal(packet.lineage.currentMainCommit, '7a41d2abf14f900637aaa0be496a4f37ca8613a4');
  assert.equal(packet.sourceBindings['server/cadUserUploadRouter.js'], '505edcadacc870be65d9ef7db72bfdcc3eeb9fa72b4802c225a163b1532dee7d');
  assert.deepEqual(packet.historicalAuthority, {
    packetReusable: false,
    approvalReusable: false,
    windowReusable: false,
    expiredWindowsRemainExpired: true,
    successorConveysRuntimeAuthority: false,
  });
});

test('generator is deterministic, reads only historical packet plus fixed sources, and preserves historical bytes', () => {
  const historicalBefore = read(HISTORICAL_PACKET);
  const reads = [];
  const first = expectedPacket(file => { reads.push(file); return read(file); });
  const second = expectedPacket(file => read(file));
  assert.deepEqual(first, second);
  assert.deepEqual(reads, [HISTORICAL_PACKET, ...SOURCES]);
  assert.equal(sha256(historicalBefore), HISTORICAL_PACKET_SHA256);
  assert.deepEqual(read(HISTORICAL_PACKET), historicalBefore);
});

test('historical packet remains non-reusable against current source bytes', () => {
  const historical = JSON.parse(read(HISTORICAL_PACKET));
  assert.equal(checkHistoricalAcceptance(historical).ok, false);
  assert.equal(checkAcceptance(packet).ok, true);
});

test('strict successor rejects authority claims, historical reuse, lineage drift and source drift', () => {
  for (const key of Object.keys(packet.claims)) {
    const changed = copy(); changed.claims[key] = true; denied(changed);
  }
  for (const key of ['packetReusable', 'approvalReusable', 'windowReusable', 'successorConveysRuntimeAuthority']) {
    const changed = copy(); changed.historicalAuthority[key] = true; denied(changed);
  }
  for (const key of Object.keys(packet.lineage)) {
    const changed = copy(); changed.lineage[key] = 'drifted'; denied(changed);
  }
  for (const file of SOURCES) {
    denied(packet, { readSource: name => name === file ? Buffer.from('changed source') : read(name) });
  }
  denied(packet, { readSource: name => name === HISTORICAL_PACKET ? Buffer.from('{}') : read(name) });
});

test('provider evidence and expired approval fields cannot be promoted in this packet', () => {
  for (const key of Object.keys(packet.evidence)) {
    const changed = copy(); changed.evidence[key].status = 'PASSED'; denied(changed);
  }
  for (const [key, value] of Object.entries({ historicalWindowReusable: true, historicalApprovalReusable: true,
    approvalRef: 'old-approval', startsAtUtc: '2026-09-15T03:00:00Z', expiresAtUtc: '2026-09-15T03:05:00Z' })) {
    const changed = copy(); changed.activation[key] = value; denied(changed);
  }
});

test('checker write mode is deterministic and all other modes fail closed', () => {
  const before = read(PACKET);
  const write = spawnSync(process.execPath, [path.join(root, 'scripts/cad-production-auth-verifier-current-source-acceptance-checker.js'), '--write'], { cwd: root });
  assert.equal(write.status, 0, write.stderr.toString());
  assert.deepEqual(read(PACKET), before);
  for (const args of [['--live'], ['--packet', 'elsewhere'], ['/synthetic/private']]) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/cad-production-auth-verifier-current-source-acceptance-checker.js'), ...args], { cwd: root });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout.toString().includes('/synthetic/private'), false);
  }
});
