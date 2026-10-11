const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  formatCanonicalIssuedAtUtc,
  isCanonicalIssuedAtUtc,
  parseCanonicalIssuedAtUtc,
} = require('../utils/cadIssuedAtUtc');

const root = path.resolve(__dirname, '..');

test('issuedAtUtc has one millisecond-precision UTC contract', () => {
  const milliseconds = Date.UTC(2026, 9, 10, 14, 3, 2, 7);
  const canonical = '2026-10-10T14:03:02.007Z';
  assert.equal(formatCanonicalIssuedAtUtc(milliseconds), canonical);
  assert.equal(parseCanonicalIssuedAtUtc(canonical), milliseconds);
  assert.equal(isCanonicalIssuedAtUtc(canonical), true);
  for (const invalid of [
    '2026-10-10T14:03:02Z',
    '2026-10-10T10:03:02.007-04:00',
    '2026-02-30T14:03:02.007Z',
    0,
    null,
  ]) {
    assert.equal(Number.isNaN(parseCanonicalIssuedAtUtc(invalid)), true);
  }
  assert.throws(() => formatCanonicalIssuedAtUtc(Number.MAX_SAFE_INTEGER), /INVALID_ISSUED_AT_UTC/);
});

test('server and Convex issuance modules import the canonical contract', () => {
  for (const file of [
    'server/cadPhase5Package8ApprovalIssuanceContract.js',
    'server/cadPhase5Package8DevelopmentQualificationBinding.js',
    'convex/cadPhase5Package8ApprovalIssuance.ts',
    'convex/cadPhase5Package8RuntimeIssuerAuthority.ts',
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /cadIssuedAtUtc/);
    assert.doesNotMatch(source, /const parseUtc = \(value[^;]+Date\.parse/);
  }
});
