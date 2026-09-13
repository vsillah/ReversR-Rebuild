// In-memory private-register contract for local fixtures. No credential loader or persistence.
const fs = require('node:fs');
const path = require('node:path');
const cohort = Object.freeze(['cad-test-one@auth-test.invalid', 'cad-test-two@auth-test.invalid']);
const keys = (v, names) => v && typeof v === 'object' && !Array.isArray(v)
  && Reflect.ownKeys(v).length === names.length && names.every(k => Object.hasOwn(v, k) && Object.hasOwn(Object.getOwnPropertyDescriptor(v, k), 'value'));
const ref = v => typeof v === 'string' && /^ref:[a-z0-9-]{1,64}$/.test(v);
const identifier = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
const integer = v => Number.isSafeInteger(v) && v >= 0;
const fail = () => { throw Error('REGISTER_UNAVAILABLE'); };
function createSyntheticRunRegister({ testOnly, record, expected, journalPath, now = Date.now } = {}) {
  let saved;
  try {
    if (testOnly !== true || !keys(record, ['version', 'mode', 'runId', 'sourceCommit', 'destination',
      'journalPath', 'serviceSubjectRef', 'operatorRef', 'hostRef', 'custodyRef', 'reconciliationRef', 'cohort',
      'startAt', 'endAt', 'observedAt', 'approvalExpiresAt'])
      || record.version !== 1 || record.mode !== 'synthetic-offline'
      || typeof record.runId !== 'string' || !/^run-[a-z0-9-]{1,48}$/.test(record.runId)
      || typeof record.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(record.sourceCommit)
      || !keys(record.destination, ['projectId', 'deploymentId', 'releaseRef', 'kind'])
      || record.destination.kind !== 'development'
      || !identifier(record.destination.projectId) || !identifier(record.destination.deploymentId)
      || !ref(record.destination.releaseRef)
      || !['serviceSubjectRef', 'operatorRef', 'hostRef', 'custodyRef', 'reconciliationRef'].every(k => ref(record[k]))
      || !Array.isArray(record.cohort) || record.cohort.length !== 2
      || Reflect.ownKeys(record.cohort).length !== 3 || !cohort.every((email, slot) => record.cohort[slot] === email)
      || !['startAt', 'endAt', 'observedAt', 'approvalExpiresAt'].every(k => integer(record[k]))
      || record.endAt <= record.startAt || record.endAt > record.startAt + 900000
      || record.endAt >= (Math.floor(record.startAt / 86400000) + 1) * 86400000
      || record.approvalExpiresAt < record.endAt
      || !keys(expected, ['runId', 'sourceCommit', 'destination'])
      || record.runId !== expected.runId || record.sourceCommit !== expected.sourceCommit
      || !keys(expected.destination, ['projectId', 'deploymentId', 'releaseRef', 'kind'])
      || !Object.keys(record.destination).every(k => record.destination[k] === expected.destination[k])
      || typeof journalPath !== 'string' || !path.isAbsolute(journalPath)
      || path.normalize(journalPath) !== journalPath || record.journalPath !== journalPath
      || fs.realpathSync(path.dirname(journalPath)) !== path.dirname(journalPath)) fail();
    saved = Object.freeze({ ...record, destination: Object.freeze({ ...record.destination }), cohort });
  } catch { fail(); }
  let last = saved.startAt, claimed = false;
  const check = observation => {
    try {
      const n = now();
      if (!integer(n) || n < last || n < saved.startAt || n >= saved.endAt
        || n >= saved.approvalExpiresAt || saved.observedAt > n || n - saved.observedAt > 300000) fail();
      last = n;
      if (observation !== undefined && (!keys(observation, ['runId', 'sourceCommit', 'destination'])
        || observation.runId !== saved.runId || observation.sourceCommit !== saved.sourceCommit
        || !keys(observation.destination, ['projectId', 'deploymentId', 'releaseRef', 'kind'])
        || !Object.keys(saved.destination).every(k => observation.destination[k] === saved.destination[k]))) fail();
      return n;
    } catch { fail(); }
  };
  check(expected);
  return Object.freeze({
    // One coordinator per register object; file tombstone protects the exact path across processes.
    claim() { check(); if (claimed) fail(); claimed = true; },
    check,
    binding: () => ({ runId: saved.runId, sourceCommit: saved.sourceCommit, destination: { ...saved.destination } }),
    // Trusted private adapter only. Never return this object in public receipts or journals.
    privateOperation(sequence, operation, slot) {
      check();
      if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 100
        || !['prepare', 'provision', 'signIn', 'verify', 'logout', 'revoke', 'verifyRevoked', 'inventory', 'remove'].includes(operation)
        || (slot !== null && slot !== 0 && slot !== 1)) fail();
      return Object.freeze({ runId: saved.runId, sourceCommit: saved.sourceCommit,
        destination: Object.freeze({ ...saved.destination }), sequence, operation, slot,
        reconciliationRef: saved.reconciliationRef, journalPath: saved.journalPath,
        operatorRef: saved.operatorRef, hostRef: saved.hostRef, custodyRef: saved.custodyRef });
    },
    options: () => ({ journalPath: saved.journalPath, endAt: saved.endAt, now }),
    status: () => ({ bound: true, executable: false, liveReady: false, cadUploadAllowed: false }),
  });
}
module.exports = { createSyntheticRunRegister, cohort, keys };
