const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { PACKET, SOURCES, PREREQUISITES, checkCard } = require('./cad-auth-sealed-evidence-card-checker');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));

test('sealed-card packet is blocked and binds every missing prerequisite explicitly', () => {
  const p = packet();
  const result = checkCard(p);
  assert.equal(result.ok, true);
  assert.equal(result.sealed, false);
  assert.equal(result.executable, false);
  assert.equal(result.liveCollectionAuthorized, false);
  assert.equal(p.status, 'BLOCKED_CARD_NOT_SEALED');
  assert.equal(p.card.liveApprovalPhrase, null);
  assert.equal(p.card.liveApprovalPhraseActionable, false);
  assert.deepEqual(Object.keys(p.prerequisites).sort(), Object.keys(PREREQUISITES).sort());
  for (const [key, value] of Object.entries(p.prerequisites)) {
    assert.equal(value.status, PREREQUISITES[key].status);
    assert.equal(value.evidenceRef, null);
    assert.ok(value.mustBind.length >= 4);
  }
});

test('retains parent plan constraints without turning them into live authority', () => {
  const p = packet();
  assert.equal(p.parentPlan.mergeCommit, '06468abb5424aea56f4f89dd9cd05a9602864806');
  assert.equal(p.parentPlan.candidateCommit, 'dc7d733cff6d94841725e721cc8e7b0da7be4cff');
  assert.equal(p.parentPlan.livePhraseFromPlanReusableNow, false);
  assert.equal(p.proposedSealedFields.caseCount, 65);
  assert.equal(p.proposedSealedFields.limits.maxRuns, 1);
  assert.equal(p.proposedSealedFields.limits.retries, 0);
  assert.equal(p.proposedSealedFields.limits.providerWrites, 0);
  assert.equal(p.proposedSealedFields.route.bodyAdmissionAuthorized, false);
  for (const value of Object.values(p.claims)) assert.equal(value, false);
  for (const value of Object.values(p.completion)) assert.equal(value, false);
});

test('rejects promotion to sealed, executable, approved, bound or runtime state', () => {
  const mutations = [
    p => { p.card.sealed = true; },
    p => { p.card.sha256 = 'a'.repeat(64); },
    p => { p.card.executable = true; },
    p => { p.card.liveApprovalPhrase = 'private-sentinel'; },
    p => { p.card.exactCommandLine = 'node collector.js'; },
    p => { p.card.canBeExecutedByThisPacket = true; },
    p => { p.parentPlan.livePhraseFromPlanReusableNow = true; },
    p => { p.nextNonLiveGate.phraseActionableNow = true; },
    p => { p.nextNonLiveGate.status = 'APPROVED'; },
    p => { p.proposedSealedFields.providerAdapterCommit = p.parentPlan.candidateCommit; },
    p => { p.proposedSealedFields.window.startsAtUtc = '2026-09-24T15:00:00Z'; },
    p => { p.evidenceFormat.receiptPublicationAllowed = true; },
    p => { p.evidenceFormat.rawCredentialCaptureAllowed = true; },
    p => { p.extra = { run: true }; },
    ...Object.keys(packet().claims).map(key => p => { p.claims[key] = true; }),
    ...Object.keys(packet().completion).map(key => p => { p.completion[key] = true; }),
    ...Object.keys(packet().prerequisites).flatMap(key => [
      p => { delete p.prerequisites[key]; },
      p => { p.prerequisites[key].status = 'READY'; },
      p => { p.prerequisites[key].evidenceRef = 'private-sentinel'; },
      p => { p.prerequisites[key].mustBind.push('extra'); },
    ]),
    ...Object.keys(packet().proposedSealedFields.limits).map(key => p => { p.proposedSealedFields.limits[key]++; }),
  ];
  for (const mutate of mutations) {
    const p = packet(); mutate(p);
    const result = checkCard(p);
    assert.equal(result.ok, false);
    assert.equal(result.executable, false);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
  }
});

test('source drift, malformed packet and parent plan drift fail closed', () => {
  for (const file of SOURCES) {
    assert.equal(checkCard(packet(), { readSource: name => name === file
      ? Buffer.concat([read(name), Buffer.from('\n')]) : read(name) }).ok, false);
  }
  assert.equal(checkCard(packet(), { readSource: name => {
    if (name === 'docs/cad-auth-live-evidence-plan.json') {
      const plan = JSON.parse(read(name));
      plan.completion.liveCollectionAuthorized = true;
      return Buffer.from(JSON.stringify(plan));
    }
    return read(name);
  } }).ok, false);
  assert.equal(checkCard(packet(), { readSource: () => { throw Error('private-sentinel'); } }).ok, false);
  for (const p of [null, [], {}, false, 'private-sentinel']) assert.equal(checkCard(p).ok, false);
});

test('checker is offline and not mounted into runtime routes', () => {
  const source = read('scripts/cad-auth-sealed-evidence-card-checker.js').toString();
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|child_process|https?\.request|writeFile|createServer|\.listen\s*\(/);
  const imports = [...source.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]);
  assert.deepEqual(imports, ['node:fs', 'node:path', 'node:crypto', 'node:util', './cad-auth-live-evidence-plan-checker']);
  for (const file of ['server/index.js', 'api/[...path].js', 'server/cadUserUploadRouter.js']) {
    assert.doesNotMatch(read(file).toString(), /cad-auth-sealed-evidence-card/);
  }
});
