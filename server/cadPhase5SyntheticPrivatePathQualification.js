// Source-only Package 7 control qualification. This module is deliberately
// absent from routes and runtime bootstraps. It generates one project-owned,
// nonproprietary IGES fixture and exercises only closed durable control ports.
const { createHash } = require('node:crypto');
const { inspectIgesSource } = require('../utils/igesAdmission');

const SYNTHETIC_PRIVATE_IGES_FIXTURE = Object.freeze({
  schemaVersion: 1,
  id: 'reversr-phase5-synthetic-private-line-v1',
  fileName: 'reversr-phase5-synthetic-private-path.igs',
  mimeType: 'model/iges',
  byteCount: 486,
  sha256: '0bdb42a7c58f4d51eee7eec2befae6ba590e43e0ecce34350cef9db4345c4c70',
  classification: 'RESTRICTED_SYNTHETIC_TEST',
  owner: 'ReversR test project',
  projectOwned: true,
  nonproprietary: true,
  customerData: false,
  privatePathOnly: true,
  publicDistributionAuthorized: false,
});

const SYNTHETIC_PRIVATE_PATH_POLICY = Object.freeze({
  schemaVersion: 1,
  maxSessions: 1,
  maxFiles: 1,
  maxAttempts: 1,
  maxRetries: 0,
  budgetMicros: 9_000_000,
  currency: 'USD',
  routeMounted: false,
  sessionIssuanceEnabled: false,
  bodyAdmissionAuthorized: false,
  storageDispatchEnabled: false,
  conversionDispatchEnabled: false,
  downloadRouteEnabled: false,
  package8Authorized: false,
});

const SYNTHETIC_OWNER = Object.freeze({
  userId: 'phase5-synthetic-user',
  shopId: 'phase5-synthetic-shop',
  uploadSessionId: 'phase5-synthetic-upload-session',
});
const SYNTHETIC_SCOPE_KEY = 'phase5-synthetic-private-path-v1';
const SYNTHETIC_SESSION_DIGEST = 'a'.repeat(64);
const SYNTHETIC_GRANT_DIGEST = 'b'.repeat(64);
const SYNTHETIC_ATTEMPT_ID = 'phase5-synthetic-private-attempt';
const SYNTHETIC_JOB_ID = 'phase5-synthetic-private-job';
const SYNTHETIC_ARTIFACT_IDS = Object.freeze([
  'phase5-synthetic-private-original',
  'phase5-synthetic-private-preview',
  'phase5-synthetic-private-stl',
]);
const REQUIRED_DURABLE_OPERATIONS = Object.freeze([
  'closeForRollback',
  'reconcile',
  'transitionArtifact',
  'confirmDeleted',
  'resolveDownloadGrant',
]);

const hash = value => createHash('sha256').update(value).digest('hex');
const deny = code => Object.freeze({ ok: false, code });
const INTENT_FIELDS = Object.freeze({
  schemaVersion: 1,
  runDigest: hash('phase5-package7-synthetic-private-path-run-v1'),
  protocolDigest: hash('consume-intent;validate-fixture;reconcile;close-first;revoke;quarantine;delete'),
  targetDigest: hash([SYNTHETIC_SCOPE_KEY, SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256,
    ...SYNTHETIC_ARTIFACT_IDS].join('|')),
  ownerDigest: hash([SYNTHETIC_OWNER.userId, SYNTHETIC_OWNER.shopId,
    SYNTHETIC_OWNER.uploadSessionId].join('|')),
});
const SYNTHETIC_QUALIFICATION_INTENT = Object.freeze({ ...INTENT_FIELDS,
  commitmentDigest: hash(JSON.stringify(INTENT_FIELDS)) });
const exact = (value, expected) => {
  if (!expected || typeof expected !== 'object') return value === expected;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== Object.keys(expected).length) return false;
  return Object.entries(expected).every(([key, nested]) => Object.hasOwn(value, key)
    && exact(value[key], nested));
};
const row = (body, section, sequence) => {
  const text = String(body || '');
  if (text.length > 72 || !/^[SGDPT]$/.test(section)
    || !Number.isSafeInteger(sequence) || sequence < 1) throw Error('SYNTHETIC_FIXTURE_INVALID');
  return `${text.padEnd(72, ' ')}${section}${String(sequence).padStart(7, ' ')}`;
};

function createSyntheticPrivateIgesFixture() {
  const rows = [
    row('ReversR Phase 5 synthetic private-path qualification fixture', 'S', 1),
    row('1H,,1H;,7HReversR,25HPhase5SyntheticPrivateIGS;', 'G', 1),
    row('     110       1       0       0       0       0       0       000000001', 'D', 1),
    row('     110       0       0       1       0       0       0       0       0', 'D', 2),
    row('110,0.,0.,0.,10.,10.,10.;', 'P', 1),
    row('S      1G      1D      2P      1', 'T', 1),
  ];
  return Object.freeze({ descriptor: SYNTHETIC_PRIVATE_IGES_FIXTURE,
    bytes: Buffer.from(`${rows.join('\n')}\n`, 'ascii') });
}

function validFixture(descriptor, bytes) {
  if (!exact(descriptor, SYNTHETIC_PRIVATE_IGES_FIXTURE) || !Buffer.isBuffer(bytes)
    || bytes.length !== SYNTHETIC_PRIVATE_IGES_FIXTURE.byteCount
    || hash(bytes) !== SYNTHETIC_PRIVATE_IGES_FIXTURE.sha256) return false;
  const admission = inspectIgesSource({ fileName: descriptor.fileName, bytes });
  return admission.ok === true && admission.sourceBytes === descriptor.byteCount;
}

function createCadPhase5SyntheticPrivatePathQualification({
  enabled = false,
  durable,
  sessionRevoker,
  intentLedger,
  now = Date.now,
} = {}) {
  const durableReady = enabled === true && durable && typeof durable.call === 'function'
    && REQUIRED_DURABLE_OPERATIONS.every(operation => durable.operations?.includes(operation));
  const reviewConfigured = Boolean(durableReady && typeof sessionRevoker?.revokeExact === 'function'
    && typeof intentLedger?.consumeOnce === 'function' && typeof now === 'function');
  let consumed = false;

  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0) throw Error('SYNTHETIC_PRIVATE_PATH_UNAVAILABLE');
    return value;
  };
  const invoke = async (operation, args, signal) => {
    signal?.throwIfAborted?.();
    const value = await durable.call(operation, Object.freeze(args), { signal });
    signal?.throwIfAborted?.();
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.sourceOnly !== true || value.routeMounted !== false
      || value.bodyAdmissionAuthorized !== false || value.providerDispatchEnabled !== false
      || value.conversionDispatchEnabled !== false || value.downloadRouteEnabled !== false) {
      throw Error('SYNTHETIC_PRIVATE_PATH_UNAVAILABLE');
    }
    return value;
  };
  const reconcile = (kind, key, signal) => invoke('reconcile', { kind, key,
    userId: SYNTHETIC_OWNER.userId, shopId: SYNTHETIC_OWNER.shopId,
    uploadSessionId: SYNTHETIC_OWNER.uploadSessionId }, signal);

  async function qualify(input = {}) {
    const keys = input && typeof input === 'object' && !Array.isArray(input)
      ? Object.keys(input) : [];
    if (!reviewConfigured) return deny('SYNTHETIC_PRIVATE_PATH_UNAVAILABLE');
    if (consumed) return deny('SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED');
    const { signal } = input;
    consumed = true;
    try {
      // Independent source-only qualification evidence. This is not application
      // or runtime state and is consumed before fixture or durable activity.
      const intent = await intentLedger.consumeOnce(SYNTHETIC_QUALIFICATION_INTENT, { signal });
      if (intent?.accepted === false && intent.code === 'QUALIFICATION_INTENT_REPLAYED'
        && intent.commitmentDigest === SYNTHETIC_QUALIFICATION_INTENT.commitmentDigest) {
        return deny('SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED');
      }
      if (intent?.accepted !== true || intent.code !== 'QUALIFICATION_INTENT_CONSUMED'
        || intent.commitmentDigest !== SYNTHETIC_QUALIFICATION_INTENT.commitmentDigest) {
        throw Error('QUALIFICATION_INTENT_UNKNOWN');
      }
      if (!['descriptor', 'bytes'].every(key => keys.includes(key))
        || keys.some(key => !['descriptor', 'bytes', 'signal'].includes(key))
        || !validFixture(input.descriptor, input.bytes)) {
        return deny('SYNTHETIC_PRIVATE_FIXTURE_INVALID');
      }
      // Read-only reconciliation durably fences restarts without opening authority.
      const prior = await reconcile('control', SYNTHETIC_SCOPE_KEY, signal);
      if (prior.accepted === true) {
        return deny('SYNTHETIC_PRIVATE_PATH_ATTEMPT_CONSUMED');
      }
      if (prior.code !== 'RECONCILIATION_DENIED') {
        throw Error('CONTROL_RECONCILIATION_UNKNOWN');
      }
      // First state-changing action: close admission/conversion and revoke grants.
      const closed = await invoke('closeForRollback', { scopeKey: SYNTHETIC_SCOPE_KEY,
        ...SYNTHETIC_OWNER, reasonDigest: hash('phase5-synthetic-private-close-first'),
        now: clock() }, signal);
      if (closed.accepted !== true || closed.admissionClosed !== true
        || closed.conversionClosed !== true || closed.grantsRevoked !== true
        || closed.uncertainRecordsQuarantined !== true) throw Error('ROLLBACK_NOT_CLOSED');

      const revoked = await sessionRevoker.revokeExact(Object.freeze({
        sessionDigest: SYNTHETIC_SESSION_DIGEST,
        uploadSessionId: SYNTHETIC_OWNER.uploadSessionId,
        owner: SYNTHETIC_OWNER,
        signal,
      }));
      if (revoked?.revoked !== true
        || revoked.uploadSessionId !== SYNTHETIC_OWNER.uploadSessionId) {
        throw Error('SESSION_REVOCATION_UNKNOWN');
      }

      const control = await reconcile('control', SYNTHETIC_SCOPE_KEY, signal);
      if (control.accepted !== true || control.state !== 'closed'
        || control.admissionClosed !== true || control.conversionClosed !== true
        || control.grantsRevoked !== true || control.uncertainRecordsQuarantined !== true) {
        throw Error('CONTROL_RECONCILIATION_UNKNOWN');
      }
      for (const [kind, key] of [['attempt', SYNTHETIC_ATTEMPT_ID], ['job', SYNTHETIC_JOB_ID]]) {
        const record = await reconcile(kind, key, signal);
        if (record.accepted !== true || record.state !== 'quarantined') {
          throw Error('QUARANTINE_RECONCILIATION_UNKNOWN');
        }
      }
      const grant = await invoke('resolveDownloadGrant', { grantDigest: SYNTHETIC_GRANT_DIGEST,
        owner: SYNTHETIC_OWNER, now: clock() }, signal);
      if (grant.accepted === true) throw Error('GRANT_REVOCATION_UNKNOWN');

      for (const artifactId of SYNTHETIC_ARTIFACT_IDS) {
        const artifact = await reconcile('artifact', artifactId, signal);
        if (artifact.accepted !== true || artifact.state !== 'quarantined'
          || !Number.isSafeInteger(artifact.generation)) throw Error('ARTIFACT_RECONCILIATION_UNKNOWN');
        const deleting = await invoke('transitionArtifact', { artifactId,
          owner: SYNTHETIC_OWNER, expectedGeneration: artifact.generation,
          transition: 'deleting', now: clock() }, signal);
        if (deleting.accepted !== true || !Number.isSafeInteger(deleting.generation)) {
          throw Error('ARTIFACT_DELETE_UNKNOWN');
        }
        const tombstoneDigest = hash(`phase5-synthetic-private-deleted:${artifactId}`);
        const deleted = await invoke('confirmDeleted', { scopeKey: SYNTHETIC_SCOPE_KEY,
          artifactId, owner: SYNTHETIC_OWNER, expectedGeneration: deleting.generation,
          tombstoneDigest, now: clock() }, signal);
        if (deleted.accepted !== true || deleted.deleted !== true
          || deleted.tombstoneDigest !== tombstoneDigest) throw Error('ARTIFACT_DELETE_UNKNOWN');
        const tombstone = await reconcile('tombstone', artifactId, signal);
        if (tombstone.accepted !== true || tombstone.deleted !== true
          || tombstone.tombstoneDigest !== tombstoneDigest) {
          throw Error('DELETION_RECONCILIATION_UNKNOWN');
        }
      }
      return Object.freeze({ ok: true, code: 'SYNTHETIC_PRIVATE_PATH_CONTROL_QUALIFIED',
        sourceOnly: true, classification: SYNTHETIC_PRIVATE_IGES_FIXTURE.classification,
        sessionCount: 1, fileCount: 1, attemptCount: 1, maxRetries: 0,
        budgetMicros: SYNTHETIC_PRIVATE_PATH_POLICY.budgetMicros,
        admissionClosed: true, conversionClosed: true, sessionRevoked: true,
        grantsRevoked: true, uncertainRecordsQuarantined: true,
        deletedArtifactCount: SYNTHETIC_ARTIFACT_IDS.length,
        readOnlyReconciliationConfirmed: true, providerDispatchEnabled: false,
        conversionDispatchEnabled: false, package8Authorized: false });
    } catch {
      return deny('SYNTHETIC_PRIVATE_PATH_ROLLBACK_UNKNOWN');
    }
  }

  return Object.freeze({ sourceOnly: true, configured: false, reviewConfigured,
    routeMounted: false, sessionIssuanceEnabled: false, bodyAdmissionAuthorized: false,
    storageDispatchEnabled: false, conversionDispatchEnabled: false,
    downloadRouteEnabled: false, providerDispatchEnabled: false,
    package8Authorized: false, policy: SYNTHETIC_PRIVATE_PATH_POLICY,
    fixture: SYNTHETIC_PRIVATE_IGES_FIXTURE, qualify });
}

module.exports = {
  SYNTHETIC_PRIVATE_IGES_FIXTURE,
  SYNTHETIC_PRIVATE_PATH_POLICY,
  SYNTHETIC_OWNER,
  SYNTHETIC_SCOPE_KEY,
  SYNTHETIC_SESSION_DIGEST,
  SYNTHETIC_GRANT_DIGEST,
  SYNTHETIC_ATTEMPT_ID,
  SYNTHETIC_JOB_ID,
  SYNTHETIC_ARTIFACT_IDS,
  SYNTHETIC_QUALIFICATION_INTENT,
  REQUIRED_DURABLE_OPERATIONS,
  createSyntheticPrivateIgesFixture,
  createCadPhase5SyntheticPrivatePathQualification,
};
