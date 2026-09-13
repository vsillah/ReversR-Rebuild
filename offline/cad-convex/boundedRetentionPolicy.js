// Pure synthetic planning validation. No clock, IO, adapter or activation path.
const policy = require('./boundedRetentionPolicy.json');
const tables = Object.keys(policy.retainedCapsPerIdentity);
const ref = value => typeof value === 'string' && /^fixture:[a-z0-9-]{1,64}$/.test(value);
const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join('|') === [...expected].sort().join('|');
function inspectRetentionFixture(m, now) {
  const deny = code => ({ packetValid: false, code, liveReady: false, retentionOverride: false, cleanupVerified: false });
  if (!keys(m, ['testOnly', 'runRef', 'sourceSha', 'destinationRef', 'custodianRef', 'reviewRef',
    'dispositionRef', 'createdAtUtc', 'reviewAtUtc', 'expiresAtUtc', 'lockoutEvidenceRef', 'slots']) || m.testOnly !== true)
    return deny('FIXTURE_SHAPE_REQUIRED');
  if (!['runRef', 'destinationRef', 'custodianRef', 'reviewRef', 'dispositionRef', 'lockoutEvidenceRef'].every(k => ref(m[k]))
    || !/^[a-f0-9]{40}$/.test(m.sourceSha)) return deny('BINDING_REQUIRED');
  if (!['createdAtUtc', 'reviewAtUtc', 'expiresAtUtc'].every(k => utc(m[k])) || !Number.isSafeInteger(now))
    return deny('UTC_REQUIRED');
  const start = Date.parse(m.createdAtUtc), review = Date.parse(m.reviewAtUtc), end = Date.parse(m.expiresAtUtc);
  if (!(start <= now && now < review && review < end && end - start <= policy.maxRetentionHours * 3600000))
    return deny('CUSTODY_WINDOW_INVALID');
  if (!Array.isArray(m.slots) || m.slots.length !== policy.cohortSize) return deny('COHORT_REQUIRED');
  const owned = new Set(); let total = 0;
  for (const slot of m.slots) {
    if (!keys(slot, ['ownershipRef', 'counts', 'selectors']) || !ref(slot.ownershipRef) || owned.has(slot.ownershipRef))
      return deny('OWNERSHIP_REQUIRED');
    owned.add(slot.ownershipRef);
    if (!keys(slot.counts, tables) || !keys(slot.selectors, tables)) return deny('INVENTORY_REQUIRED');
    for (const table of tables) {
      const count = slot.counts[table], selectors = slot.selectors[table];
      if (!Number.isSafeInteger(count) || count < 0 || count > policy.retainedCapsPerIdentity[table]
        || (['users', 'authAccounts'].includes(table) && count !== 1)) return deny('RETAINED_CAP_EXCEEDED');
      if (!Array.isArray(selectors) || selectors.length !== count) return deny('SELECTOR_COUNT_MISMATCH');
      for (const selector of selectors) {
        if (!ref(selector) || owned.has(selector)) return deny('SELECTOR_OWNERSHIP_INVALID');
        owned.add(selector);
      }
      total += count;
    }
  }
  if (total > policy.retainedCapTotal) return deny('TOTAL_CAP_EXCEEDED');
  return { packetValid: true, code: 'FIXTURE_RETAINED_NOT_REMOVED', retainedRecords: total,
    liveReady: false, retentionOverride: false, cleanupVerified: false };
}
module.exports = { inspectRetentionFixture };
