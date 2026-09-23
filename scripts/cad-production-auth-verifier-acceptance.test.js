const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { checkAcceptance, PACKET, SOURCES } = require('./cad-production-auth-verifier-acceptance-checker');
const root = path.resolve(__dirname, '..');
const packet = JSON.parse(fs.readFileSync(path.join(root, PACKET), 'utf8'));
const copy = () => structuredClone(packet);
function denied(value, options) {
  const result = checkAcceptance(value, options);
  assert.equal(result.ok, false);
  for (const key of ['productionVerifierAccepted', 'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized', 'runtimeActivationAuthorized'])
    assert.equal(result[key], false);
}

test('valid source contract leaves every production gate unaccepted', () => {
  const result = checkAcceptance(packet);
  assert.equal(result.ok, true);
  assert.equal(result.sourceContractValid, true);
  assert.equal(result.productionVerifierAccepted, false);
  assert.equal(result.uploadSessionIssuanceEnabled, false);
  assert.equal(result.bodyAdmissionAuthorized, false);
  assert.equal(result.runtimeActivationAuthorized, false);
  assert.equal(Object.keys(packet.evidence).length, 12);
});

test('rejects every activation claim, omissions and truthy substitutions', () => {
  for (const key of Object.keys(packet.claims)) {
    for (const value of [true, 'false', 0, null]) {
      const changed = copy(); changed.claims[key] = value; denied(changed);
    }
    const changed = copy(); delete changed.claims[key]; denied(changed);
  }
});

test('provider evidence cannot be marked complete or weakened in this source-only packet', () => {
  for (const key of Object.keys(packet.evidence)) {
    for (const [field, value] of [['status', 'PASSED'], ['accepted', true], ['receipt', 'synthetic-receipt'], ['required', 'local doubles suffice']]) {
      const changed = copy(); changed.evidence[key][field] = value; denied(changed);
    }
    const changed = copy(); delete changed.evidence[key]; denied(changed);
  }
  const changed = copy();
  for (const evidence of Object.values(changed.evidence)) { evidence.status = 'PASSED'; evidence.accepted = true; }
  denied(changed);
});

test('rejects historical windows, transferred approvals and claimed candidate acceptance', () => {
  for (const [key, value] of Object.entries({ separateApprovalRequired: false, historicalWindowReusable: true,
    historicalApprovalReusable: true, approvalRef: 'old-approval', startsAtUtc: '2026-09-15T03:00:00Z', expiresAtUtc: '2026-09-15T03:05:00Z' })) {
    const changed = copy(); changed.activation[key] = value; denied(changed);
  }
  for (const key of Object.keys(packet.candidate)) {
    const changed = copy(); changed.candidate[key] = 'claimed-accepted'; denied(changed);
  }
  for (const key of Object.keys(packet.transport)) {
    const changed = copy(); changed.transport[key] = 'ACCEPTED'; denied(changed);
  }
});

test('strict schema fails closed on malformed packets and hidden extra claims without echoing values', () => {
  for (const value of [null, undefined, [], {}, false, 'accepted']) denied(value);
  for (const key of Object.keys(packet)) { const changed = copy(); delete changed[key]; denied(changed); }
  for (const key of ['claims', 'candidate', 'activation', 'evidence', 'transport', 'sourceBindings']) {
    const changed = copy(); changed[key].extraAuthority = 'PRIVATE_SENTINEL';
    denied(changed); assert.ok(!JSON.stringify(checkAcceptance(changed)).includes('PRIVATE_SENTINEL'));
  }
  const changed = copy(); changed.accepted = true; denied(changed);
});

test('source drift, missing sources and stale base cannot pass; reads are allowlisted', () => {
  const reads = [];
  assert.equal(checkAcceptance(packet, { readSource: file => {
    reads.push(file); return fs.readFileSync(path.join(root, file));
  } }).ok, true);
  assert.deepEqual(reads, [...SOURCES]);
  for (const file of SOURCES) {
    denied(packet, { readSource: name => name === file ? Buffer.from('changed source') : fs.readFileSync(path.join(root, name)) });
  }
  denied(packet, { readSource: () => { throw Error('PRIVATE_SENTINEL'); } });
  const changed = copy(); changed.baseCommit = '0'.repeat(40); denied(changed);
});
