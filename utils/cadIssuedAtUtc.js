const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseCanonicalIssuedAtUtc(value) {
  if (typeof value !== 'string' || !CANONICAL_UTC_PATTERN.test(value)) return NaN;
  const milliseconds = Date.parse(value);
  return Number.isSafeInteger(milliseconds) && new Date(milliseconds).toISOString() === value
    ? milliseconds
    : NaN;
}

function formatCanonicalIssuedAtUtc(milliseconds) {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
    throw new TypeError('INVALID_ISSUED_AT_UTC');
  }
  const value = new Date(milliseconds);
  if (!Number.isFinite(value.getTime())) throw new TypeError('INVALID_ISSUED_AT_UTC');
  return value.toISOString();
}

function isCanonicalIssuedAtUtc(value) {
  return Number.isFinite(parseCanonicalIssuedAtUtc(value));
}

module.exports = {
  CANONICAL_UTC_PATTERN,
  formatCanonicalIssuedAtUtc,
  isCanonicalIssuedAtUtc,
  parseCanonicalIssuedAtUtc,
};
