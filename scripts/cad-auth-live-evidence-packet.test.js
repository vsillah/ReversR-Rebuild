const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { CASES } = require('./cad-production-verifier-evidence-checker');
const { PACKET, SOURCES, WINDOW, APPROVAL, checkPacket } = require('./cad-auth-live-evidence-packet-checker');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const packet = () => JSON.parse(read(PACKET));
const closed = result => {
  for (const key of ['readyForLiveCollection', 'liveCollectionAuthorized', 'productionVerifierAccepted',
    'providerEvidenceCollected', 'uploadSessionIssuanceEnabled', 'bodyAdmissionAuthorized', 'runtimeActivationAuthorized']) {
    assert.equal(result[key], false, key);
  }
};

test('plan covers every candidate case without claiming provider or route evidence', () => {
  const p = packet();
  const result = checkPacket(p);
  assert.equal(result.ok, true); closed(result);
  assert.deepEqual(p.cases.map(c => `${c.category}/${c.id}`),
    Object.entries(CASES).flatMap(([category, ids]) => ids.map(id => `${category}/${id}`)));
  assert.ok(p.cases.every(c => c.stimulus && c.expected && c.observed === null && c.receipt === null));
  assert.equal(p.candidate.candidateMerge, p.candidate.appDeployment.commit);
  assert.equal(p.candidate.providerAdapterCommit, null);
  assert.equal(p.candidate.collectionDeploymentRef, null);
  assert.equal(p.routePlan.actualRouteInstrumented, false);
  assert.equal(p.routePlan.observedBodyBytes, null);
  assert.equal(p.approval.exactPhrase, APPROVAL);
  assert.ok(read('docs/cad-auth-live-evidence-packet.md').toString().includes(APPROVAL));
});

test('approval and completed evidence cannot turn source validation into authority', () => {
  const mutations = [
    p => { p.approval.approved = true; }, p => { p.approval.executionAuthorized = true; },
    p => { p.approval.receipt = 'private-sentinel'; }, p => { p.approval.phraseAloneSufficient = true; },
    p => { p.candidate.providerAdapterCommit = p.candidate.candidateMerge; },
    p => { p.candidate.collectionDeploymentRef = p.candidate.appDeployment.url; },
    p => { p.candidate.candidateMountedInProductionRoute = true; },
    p => { p.routePlan.actualRouteInstrumented = true; }, p => { p.routePlan.observedBodyBytes = 0; },
    p => { p.receiptTemplate.disposition = 'PASS'; }, p => { p.receiptTemplate.evidenceRef = 'private-sentinel'; },
    p => { p.extra = { readyForLiveCollection: true }; },
    ...Object.keys(packet().claims).map(key => p => { p.claims[key] = true; }),
    ...packet().prerequisites.map((_, i) => p => { p.prerequisites[i].status = 'PASS'; }),
    ...packet().cases.flatMap((_, i) => [p => { p.cases[i].status = 'PASS'; }, p => { p.cases[i].observed = 'private-sentinel'; }]),
  ];
  for (const mutate of mutations) {
    const p = packet(); mutate(p); const result = checkPacket(p);
    assert.equal(result.ok, false); closed(result);
    assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
  }
});

test('window boundaries and invalid clocks never authorize execution or silently roll forward', () => {
  const start = Date.parse(WINDOW.startsAtUtc), end = Date.parse(WINDOW.expiresAtUtc);
  for (const [now, expected] of [[start - 1, 'FUTURE_PROPOSAL'], [start, 'PROPOSED_WINDOW_OPEN_NOT_AUTHORIZED'],
    [end - 1, 'PROPOSED_WINDOW_OPEN_NOT_AUTHORIZED'], [end, 'EXPIRED_REPLAN_REQUIRED'],
    [end + 86400000, 'EXPIRED_REPLAN_REQUIRED'], [NaN, 'INVALID_CLOCK'], [-1, 'INVALID_CLOCK']]) {
    const result = checkPacket(packet(), { now });
    assert.equal(result.windowState, expected); closed(result);
  }
  for (const expiresAtUtc of ['2026-09-15T00:00:00Z', '2099-01-01T00:00:00Z']) {
    const p = packet(); p.proposedWindow.expiresAtUtc = expiresAtUtc;
    assert.equal(checkPacket(p).ok, false);
  }
});

test('scope widening, dropped cases, custody drift and weakened stop conditions fail closed', () => {
  const mutations = [
    p => { p.bounds.maxRunAttempts = 2; }, p => { p.bounds.maxRetries = 1; },
    p => { p.bounds.maxCandidateOperations++; }, p => { p.bounds.stateMutations = 1; },
    p => { p.bounds.uploadSessionsIssued = 1; }, p => { p.bounds.uploadPayloadBytesSent = 1; },
    p => { p.bounds.operationDeadlineMs = 1000; }, p => { p.bounds.liveCollectorIncluded = true; },
    p => { p.cohort.realUserCount = 1; }, p => { p.cohort.historicalCohortApprovalReusable = true; },
    p => { p.custody.rawCaptureAllowed = true; }, p => { p.custody.forbidden.pop(); },
    p => { p.cases.pop(); }, p => { p.cases[0].expected = 'grant always'; },
    p => { p.stopConditions.pop(); }, p => { p.stopProcedure = []; },
  ];
  for (const mutate of mutations) {
    const p = packet(); mutate(p); const result = checkPacket(p);
    assert.equal(result.ok, false); closed(result);
  }
});

test('fixed source bindings detect drift or unavailable source without exposing diagnostics', () => {
  for (const target of SOURCES) {
    const result = checkPacket(packet(), { readSource: file => {
      const bytes = read(file);
      return file === target ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes;
    } });
    assert.equal(result.ok, false, target); closed(result);
  }
  const result = checkPacket(packet(), { readSource: () => { throw Error('private-sentinel'); } });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('private-sentinel'), false);
});

test('checker cannot collect or activate and source routes retain their closed contracts', () => {
  const checker = read('scripts/cad-auth-live-evidence-packet-checker.js').toString();
  assert.doesNotMatch(checker, /process\.env|fetch\s*\(|child_process|https?\.request|writeFile|mkdir|issueSession\s*\(/);
  const router = read('server/cadUserUploadRouter.js').toString();
  assert.match(router, /const BODY_ADMISSION_AUTHORIZED = false/);
  const entry = read('server/index.js').toString();
  assert.ok(entry.indexOf("app.use('/api/cad', createCadUserUploadRouter") < entry.indexOf('app.use(express.json'));
  assert.doesNotMatch(entry, /productionVerifierCandidate|cad-auth-live-evidence/);
});
