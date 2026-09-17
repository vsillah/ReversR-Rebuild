const assert = require('node:assert/strict');
const test = require('node:test');
const { REVIEW_CHECKS, normalizeReview, createReviewReceipt, restoreReview } = require('../utils/cadReviewReceipt');

test('starts untested and distinguishes incomplete, issues and visual-only pass', () => {
  assert.equal(createReviewReceipt(null).counts['not-tested'], 8);
  assert.equal(createReviewReceipt({ source: 'pass' }).outcome, 'incomplete');
  assert.equal(createReviewReceipt({ source: 'issue' }).outcome, 'issues-recorded');
  const passed = Object.fromEntries(REVIEW_CHECKS.map(({ id }) => [id, 'pass']));
  assert.equal(createReviewReceipt(passed).outcome, 'visual-checks-passed');
  assert.equal(createReviewReceipt(passed).counts.pass, 8);
  assert(createReviewReceipt(passed).exclusions.includes('Manufacturing certification'));
});

test('drops arbitrary values, fields and inherited checklist values from receipts', () => {
  const unsafe = Object.assign(Object.create({ source: 'pass' }), {
    reference: 'issue', rotation: 'private-file.igs', email: 'private@example.com', url: 'https://example.com/?token=secret',
    path: '/Users/private/secret', notes: 'private notes', zoom: { value: 'pass' }, touch: true,
  });
  const receipt = createReviewReceipt(unsafe);
  assert.equal(receipt.checks.source, 'not-tested');
  assert.equal(receipt.checks.reference, 'issue');
  assert.equal(receipt.checks.rotation, 'not-tested');
  assert.equal(receipt.checks.touch, 'not-tested');
  assert.doesNotMatch(JSON.stringify(receipt), /private|secret|https:|token|email|\/Users/);
  assert.deepEqual(Object.keys(receipt.checks), REVIEW_CHECKS.map(({ id }) => id));
});

test('restores only versioned receipts for this exact source and display mesh', () => {
  const receipt = createReviewReceipt({ source: 'pass', clipping: 'issue' });
  assert.deepEqual(restoreReview(JSON.stringify(receipt)), receipt.checks);
  for (const value of [null, '', '{broken', 'null', '[]', JSON.stringify({ ...receipt, schema: 'old' }), JSON.stringify({ ...receipt, fixture: 'private' }), JSON.stringify({ ...receipt, source: {} }), JSON.stringify({ ...receipt, displayMeshSha256: 'different' })]) {
    assert.deepEqual(restoreReview(value), normalizeReview(null));
  }
  const poisoned = { ...receipt, checks: { ...receipt.checks, source: 'secret', extra: 'private' }, notes: 'private' };
  assert.equal(restoreReview(JSON.stringify(poisoned)).source, 'not-tested');
  assert.doesNotMatch(JSON.stringify(createReviewReceipt(restoreReview(JSON.stringify(poisoned)))), /secret|private/);
});
