const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const packet = JSON.parse(
  fs.readFileSync('docs/cad-cost-attribution-implementation-readiness.json', 'utf8'),
);
const markdown = fs.readFileSync(
  'docs/cad-cost-attribution-implementation-readiness.md',
  'utf8',
);
const priorPacket = JSON.parse(
  fs.readFileSync('docs/cad-mark-feedback-parallel-readiness.json', 'utf8'),
);

test('packet stays source-only and refuses current pricing claims', () => {
  assert.equal(packet.status, 'source_only_cost_model_and_readiness_ready');
  assert.equal(packet.sourceOnly, true);
  assert.equal(packet.expensesUsd, 0);
  assert.equal(packet.costPolicy.approvedDevelopmentCeilingUsd, 50);
  assert.equal(packet.costPolicy.feePerRunDecisionReady, false);
  assert.equal(packet.costPolicy.currentPricingClaims, false);
  assert.equal(packet.costPolicy.pricingEvidenceRequired, true);
  assert.match(markdown, /No current pricing claim is made here/);
  assert.match(markdown, /fee-per-run model/);
});

test('cost buckets cover the complete CAD run path', () => {
  const providers = new Set(packet.costModel.costBuckets.map(bucket => bucket.provider));
  for (const provider of [
    'Convex',
    'Vercel',
    'ReversR runtime',
    'Sandbox or conversion compute',
    'browser/client rendering',
    'ReversR evidence custody',
    'Internal tester support',
    'pricing policy',
  ]) {
    assert.ok(providers.has(provider), `${provider} provider bucket is required`);
  }

  const allMeters = packet.costModel.costBuckets.flatMap(bucket => bucket.meters).join('\n');
  for (const meter of [
    'mutations',
    'query reads',
    'serverless or edge invocations',
    'body-read bytes after explicit admission',
    'CPU time',
    'egress',
    'tester follow-up time',
    'taxes',
    'contingency',
  ]) {
    assert.match(allMeters, new RegExp(meter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('authorities remain closed for uploads, conversion, private CAD and external sends', () => {
  for (const key of [
    'liveRun',
    'uploadActivation',
    'conversionDispatch',
    'sandboxDispatch',
    'privateCad',
    'realUsers',
    'providerEnvResourceBillingChanges',
    'newPaidCommitments',
    'externalMessages',
  ]) {
    assert.equal(packet.authorizes[key], false, `${key} must remain false`);
  }

  assert.equal(packet.authorizes.sourceOnlyDocsAndTests, true);
  assert.equal(packet.authorizes.productionFailClosedSmoke, true);
  assert.ok(packet.implementationReadiness.mustKeepDisabled.includes(
    'BODY_ADMISSION_AUTHORIZED = false until a separate activation gate',
  ));
  assert.match(markdown, /BODY_ADMISSION_AUTHORIZED = false/);
});

test('Mark feedback boundary remains narrow and does not block source-only work', () => {
  assert.equal(priorPacket.status, 'mark_feedback_pending_parallel_work_allowed');
  assert.equal(packet.upstream.markFeedbackPending, true);
  assert.deepEqual(
    packet.upstream.markFeedbackDoesNotBlock,
    [
      'source-only cost attribution planning',
      'implementation-readiness information architecture',
      'disabled-gate UX polish',
      'feedback intake and triage packet updates',
      'production fail-closed route smokes',
    ],
  );
  assert.ok(packet.upstream.markFeedbackStillBlocks.includes(
    'claims that rendered geometry is source-correct',
  ));
  assert.match(markdown, /cannot claim external CAD validation/);
});

test('checked-in packet avoids private recipient data and live-run wording drift', () => {
  const combined = `${markdown}\n${JSON.stringify(packet, null, 2)}`;
  assert.doesNotMatch(combined, /meadowsms@/i);
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|PRIVATE KEY-----/);
  assert.doesNotMatch(combined, /production upload activation completed/i);
  assert.doesNotMatch(combined, /private CAD approved/i);
  assert.doesNotMatch(combined, /external CAD validation completed/i);
});
