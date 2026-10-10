import { internalMutation, internalQuery } from './_generated/server';
import type { DatabaseReader, DatabaseWriter } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { cadControlledUploadDevQualificationBinding as binding } from './cadControlledUploadDevQualificationBinding';
import { hash, keys } from '../offline/cad-convex/controlledUploadHostModel';

const result = v.object({
  code: v.string(),
  sourceOnly: v.literal(true),
  developmentOnly: v.literal(true),
  internalOnly: v.literal(true),
  modelAccepted: v.boolean(),
  hostQualified: v.literal(false),
  bodyAdmissionAuthorized: v.literal(false),
  requestBodyReads: v.literal(0),
  conversionAuthorized: v.literal(false),
  sandboxAuthorized: v.literal(false),
  storageWritesAuthorized: v.literal(false),
  productionChangesAuthorized: v.literal(false),
  automaticRetries: v.literal(0),
  runSpent: v.boolean(),
  sessionCreated: v.boolean(),
  attemptCreated: v.boolean(),
  rollbackArmed: v.boolean(),
  fenceOpenedOnce: v.boolean(),
  fenceOpen: v.boolean(),
  consumed: v.boolean(),
  closed: v.boolean(),
  revoked: v.boolean(),
  unknown: v.boolean(),
  permanentStop: v.boolean(),
  bindingDigest: v.optional(v.string()),
  resultDigest: v.optional(v.string()),
});

type QualificationResult = {
  code: string;
  sourceOnly: true;
  developmentOnly: true;
  internalOnly: true;
  modelAccepted: boolean;
  hostQualified: false;
  bodyAdmissionAuthorized: false;
  requestBodyReads: 0;
  conversionAuthorized: false;
  sandboxAuthorized: false;
  storageWritesAuthorized: false;
  productionChangesAuthorized: false;
  automaticRetries: 0;
  runSpent: boolean;
  sessionCreated: boolean;
  attemptCreated: boolean;
  rollbackArmed: boolean;
  fenceOpenedOnce: boolean;
  fenceOpen: boolean;
  consumed: boolean;
  closed: boolean;
  revoked: boolean;
  unknown: boolean;
  permanentStop: boolean;
  bindingDigest?: string;
  resultDigest?: string;
};

const closed = (code: string, fields: Partial<QualificationResult> = {}): QualificationResult => ({
  code,
  sourceOnly: true,
  developmentOnly: true,
  internalOnly: true,
  modelAccepted: false,
  hostQualified: false,
  bodyAdmissionAuthorized: false,
  requestBodyReads: 0,
  conversionAuthorized: false,
  sandboxAuthorized: false,
  storageWritesAuthorized: false,
  productionChangesAuthorized: false,
  automaticRetries: 0,
  runSpent: false,
  sessionCreated: false,
  attemptCreated: false,
  rollbackArmed: false,
  fenceOpenedOnce: false,
  fenceOpen: false,
  consumed: false,
  closed: true,
  revoked: true,
  unknown: false,
  permanentStop: true,
  ...fields,
});

const sha1 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const sha256 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeTime = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const expectedImmutableBinding = {
  schemaVersion: 1,
  baseCommit: '6aa57afc24aac6769bad12aa06a7ed6855a83739',
  stopReceiptSha256: 'f1696dfb1bc24bef2bf41aaff1f5894527bd8bd89966d215301e1d4b261b8872',
  deploymentAttemptLedgerSha256: 'aa7267c413e05da07c0e3769c52d009b2cace74d6eb7a20e8cdcd68ea9c73531',
  hostSha256: 'ff398dce1a67e14b3ac9ca32d11c0974b1d329eb28464a898316f250027fb3c7',
  bridgeSha256: '2559724d72deb8b0bd25cdc73f17dce35de038b19bc19b1eda48537a3ab9678f',
  adapterSha256: 'e1a4f90c41942689121d2f3158bf3d3260ff405fa2fbeb76d0e44282cd07bb2f',
  target: {
    teamSlug: 'vambah-sillah', projectSlug: 'reversr-cad-auth-dev', deploymentName: 'majestic-alligator-31',
    deploymentType: 'development', cloudUrl: 'https://majestic-alligator-31.convex.cloud',
  },
  fixture: {
    reference: 'occt-import-js:testfiles/cube-10x10mm/Cube 10x10.igs',
    sha256: '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3', bytesAdmitted: 0,
  },
  synthetic: {
    email: 'cad-test-alpha-20260915@auth-test.invalid',
    shopId: 'cad-controlled-upload-development-qualification',
    sessionId: 'cad-controlled-upload-development-qualification-v1',
    cohortRef: 'rrb-ref:cad-controlled-upload-development-qualification-v1',
    approvedRunId: 'rrb-ref:cad-controlled-upload-development-qualification-run-v1',
  },
} as const;

function immutableBindingMatches() {
  return binding.schemaVersion === expectedImmutableBinding.schemaVersion
    && binding.source.baseCommit === expectedImmutableBinding.baseCommit
    && binding.source.stopReceiptSha256 === expectedImmutableBinding.stopReceiptSha256
    && binding.source.deploymentAttemptLedgerSha256 === expectedImmutableBinding.deploymentAttemptLedgerSha256
    && binding.source.hostSha256 === expectedImmutableBinding.hostSha256
    && binding.source.bridgeSha256 === expectedImmutableBinding.bridgeSha256
    && binding.source.adapterSha256 === expectedImmutableBinding.adapterSha256
    && JSON.stringify(binding.target) === JSON.stringify(expectedImmutableBinding.target)
    && JSON.stringify(binding.fixture) === JSON.stringify(expectedImmutableBinding.fixture)
    && binding.synthetic.email === expectedImmutableBinding.synthetic.email
    && binding.synthetic.shopId === expectedImmutableBinding.synthetic.shopId
    && binding.synthetic.sessionId === expectedImmutableBinding.synthetic.sessionId
    && binding.synthetic.cohortRef === expectedImmutableBinding.synthetic.cohortRef
    && binding.synthetic.approvedRunId === expectedImmutableBinding.synthetic.approvedRunId
    && binding.limits.maxRuns === 1 && binding.limits.maxSessions === 1
    && binding.limits.maxAttempts === 1 && binding.limits.maxRetries === 0
    && binding.closures.internalOnly === true && binding.closures.bodyAdmissionAuthorized === false
    && binding.closures.requestBodyReads === 0 && binding.closures.conversionAuthorized === false
    && binding.closures.sandboxAuthorized === false && binding.closures.storageWritesAuthorized === false
    && binding.closures.productionChangesAuthorized === false;
}

async function resourceBindingDigest() {
  return hash(['cad-controlled-upload-development-qualification-resource-v1', binding.source.baseCommit,
    binding.source.stopReceiptSha256, binding.target, binding.fixture]);
}

async function fixedScopeKey() {
  return hash(['controlled-scope-v1', await resourceBindingDigest(), binding.synthetic.cohortRef]);
}

function assertInstalled(now: number) {
  const approval = binding.approval;
  const synthetic = binding.synthetic;
  if (!immutableBindingMatches() || !sha1(binding.source.baseCommit) || !sha1(binding.source.qualificationCommit)
    || !sha256(approval.recordSha256) || !safeTime(approval.windowStartMs) || !safeTime(approval.windowEndMs)
    || typeof synthetic.userId !== 'string' || synthetic.userId.length === 0
    || typeof synthetic.loginSessionId !== 'string' || synthetic.loginSessionId.length === 0) {
    return false;
  }
  return safeTime(now) && now >= approval.windowStartMs && now < approval.windowEndMs
    && approval.windowEndMs > approval.windowStartMs
    && approval.windowEndMs <= approval.windowStartMs + binding.limits.maxWindowMs;
}

async function one<T>(rows: T[]): Promise<T | null> {
  if (rows.length > 1) throw Error('DEVELOPMENT_QUALIFICATION_DUPLICATE');
  return rows[0] ?? null;
}

async function readTerminal(db: DatabaseReader): Promise<QualificationResult> {
  const scopeKey = await fixedScopeKey();
  const scope = await one(await db.query('cadControlledUploadScopes')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
  if (!scope) return closed('DEVELOPMENT_QUALIFICATION_STATE_MISSING', { permanentStop: false, closed: false, revoked: false });
  const grant = await one(await db.query('cadControlledUploadGrants')
    .withIndex('by_scopeKey', q => q.eq('scopeKey', scopeKey)).take(2));
  const attempt = await one(await db.query('cadControlledUploadAttempts')
    .withIndex('by_runKey', q => q.eq('runKey', scope.runKey)).take(2));
  const tombstone = await one(await db.query('cadControlledUploadSessionTombstones')
    .withIndex('by_sessionKey', q => q.eq('sessionKey', scope.sessionKey)).take(2));
  const receipts = await db.query('cadControlledUploadReceipts')
    .withIndex('by_scopeId_and_sequence', q => q.eq('scopeId', scope._id).eq('sequence', 1)).take(2);
  const receipt = await one(receipts);
  const uploadByCredential = grant ? await one(await db.query('cadUploadSessions')
    .withIndex('by_credentialDigest', q => q.eq('credentialDigest', grant.binding.credentialDigest)).take(2)) : null;
  const uploadBySession = grant ? await one(await db.query('cadUploadSessions')
    .withIndex('by_sessionId', q => q.eq('sessionId', grant.binding.sessionId)).take(2)) : null;
  const principal = grant ? await db.get(grant.installedByPrincipalId) : null;
  if (!grant || grant._id !== scope.grantId || !attempt || attempt.scopeId !== scope._id
    || !tombstone || tombstone.scopeId !== scope._id || !receipt || receipt.attemptId !== attempt._id
    || !principal || principal.active !== false || principal.role !== 'grant-custodian'
    || !uploadByCredential || uploadByCredential._id !== uploadBySession?._id
    || uploadByCredential.status !== 'revoked' || uploadByCredential.cadUploadAllowed !== false
    || scope.currentBindingDigest !== grant.bindingDigest || attempt.bindingDigest !== grant.bindingDigest
    || tombstone.bindingDigest !== grant.bindingDigest || receipt.bindingDigest !== grant.bindingDigest) {
    return closed('DEVELOPMENT_QUALIFICATION_STATE_UNRESOLVED', { runSpent: true, unknown: true });
  }
  const terminal = scope.runSpent === true && scope.revoked === true && scope.permanentStop === true
    && scope.stopReason === 'revoked' && attempt.attemptSpent === true && attempt.rollbackArmed === true
    && attempt.fenceOpenedOnce === false && attempt.fenceOpen === false && attempt.consumed === false
    && attempt.closed === true && attempt.revoked === true && attempt.unknown === false
    && attempt.recoveryState === 'closed-revoked' && tombstone.spent === true
    && tombstone.consumed === false && tombstone.revoked === true
    && receipt.operation === 'revokeSessionAndLateGrants' && receipt.outcome === 'committed-restrictive';
  if (!terminal) return closed('DEVELOPMENT_QUALIFICATION_STATE_UNRESOLVED', { runSpent: true, unknown: true });
  return closed('DEVELOPMENT_QUALIFICATION_ALREADY_CONSUMED', {
    modelAccepted: true,
    runSpent: true,
    sessionCreated: true,
    attemptCreated: true,
    rollbackArmed: true,
    bindingDigest: grant.bindingDigest,
    resultDigest: receipt.resultDigest,
  });
}

export async function executeDevelopmentQualification(db: DatabaseWriter, now: number, runtimeCloudUrl: unknown = null): Promise<QualificationResult> {
  if (!assertInstalled(now) || runtimeCloudUrl !== binding.target.cloudUrl) return closed('DEVELOPMENT_QUALIFICATION_SOURCE_CLOSED', {
    permanentStop: false, closed: false, revoked: false,
  });
  const existing = await readTerminal(db);
  if (existing.code !== 'DEVELOPMENT_QUALIFICATION_STATE_MISSING') return existing;
  const userId = binding.synthetic.userId as Id<'users'>;
  const loginSessionId = binding.synthetic.loginSessionId as Id<'authSessions'>;
  const approvalSha = binding.approval.recordSha256 as string;
  const windowStartMs = binding.approval.windowStartMs as number;
  const windowEndMs = binding.approval.windowEndMs as number;
  const user = await db.get(userId);
  const login = await db.get(loginSessionId);
  if (!user || user._id !== userId || user.email !== binding.synthetic.email
    || !login || login._id !== loginSessionId || login.userId !== userId
    || !Number.isSafeInteger(login.expirationTime) || login.expirationTime <= windowEndMs) {
    return closed('DEVELOPMENT_QUALIFICATION_IDENTITY_MISMATCH');
  }
  const resourceDigest = await resourceBindingDigest();
  const credentialDigest = await hash(['cad-controlled-upload-development-qualification-credential-v1',
    resourceDigest, approvalSha, binding.fixture.sha256]);
  const durableEvidenceSha256 = await hash(['cad-controlled-upload-development-qualification-evidence-v1',
    binding.source, binding.target, binding.fixture, approvalSha]);
  const validatorEnvelopeSha256 = await hash(['cad-controlled-upload-development-qualification-validator-v1',
    binding.source.baseCommit, binding.source.qualificationCommit, resourceDigest]);
  const grantBinding = {
    schemaVersion: 1 as const,
    resourceBindingDigest: resourceDigest,
    approvedRunId: binding.synthetic.approvedRunId,
    cohortRef: binding.synthetic.cohortRef,
    deploymentReference: binding.target.deploymentName,
    deploymentTarget: binding.target.cloudUrl,
    gitCommitSha: binding.source.qualificationCommit as string,
    commandCardSha256: approvalSha,
    installationSha256: binding.source.stopReceiptSha256,
    durableEvidenceSha256,
    durableServiceRef: 'rrb-ref:cad-controlled-upload-development-host-v1',
    credentialDigest,
    supplyReceiptSha256: binding.source.stopReceiptSha256,
    userId,
    shopId: binding.synthetic.shopId,
    loginSessionId,
    sessionId: binding.synthetic.sessionId,
    route: 'POST /api/cad/user-import' as const,
    windowStartMs,
    windowEndMs,
    grantDeadlineMs: windowEndMs,
    validatorEnvelopeSha256,
    approvalRecordSha256: approvalSha,
    maxRuns: 1 as const,
    maxSessions: 1 as const,
    maxAttempts: 1 as const,
    maxRetries: 0 as const,
    conversionAuthorized: false as const,
    sandboxAuthorized: false as const,
    privateCredentialSupplyRef: 'rrb-ref:cad-development-qualification-no-private-credential',
    productionAlias: binding.target.cloudUrl,
    sessionRef: 'rrb-ref:cad-controlled-upload-development-terminal-session-v1',
  };
  const k = await keys(grantBinding);
  const collisions = [
    await one(await db.query('cadControlledUploadScopes').withIndex('by_runKey', q => q.eq('runKey', k.runKey)).take(2)),
    await one(await db.query('cadControlledUploadGrants').withIndex('by_grantKey', q => q.eq('grantKey', k.grantKey)).take(2)),
    await one(await db.query('cadControlledUploadAttempts').withIndex('by_sessionKey', q => q.eq('sessionKey', k.sessionKey)).take(2)),
    await one(await db.query('cadControlledUploadSessionTombstones').withIndex('by_sessionKey', q => q.eq('sessionKey', k.sessionKey)).take(2)),
    await one(await db.query('cadUploadSessions').withIndex('by_credentialDigest', q => q.eq('credentialDigest', credentialDigest)).take(2)),
    await one(await db.query('cadUploadSessions').withIndex('by_sessionId', q => q.eq('sessionId', binding.synthetic.sessionId)).take(2)),
  ];
  if (collisions.some(Boolean)) return closed('DEVELOPMENT_QUALIFICATION_SLOT_UNAVAILABLE');
  const custodyEpochDigest = await hash(['cad-controlled-upload-development-qualification-custody-v1',
    resourceDigest, approvalSha]);
  const verifiedSubjectDigest = await hash(['cad-controlled-upload-development-qualification-subject-v1',
    binding.synthetic.email, binding.synthetic.userId]);
  const principalKey = await hash(['controlled-principal-v1', 'reversr-development-qualification',
    binding.target.deploymentName, verifiedSubjectDigest, 'grant-custodian', resourceDigest]);
  if (await one(await db.query('cadControlledUploadHostPrincipals')
    .withIndex('by_principalKey', q => q.eq('principalKey', principalKey)).take(2))) {
    return closed('DEVELOPMENT_QUALIFICATION_SLOT_UNAVAILABLE');
  }
  const principalId = await db.insert('cadControlledUploadHostPrincipals', {
    principalKey,
    verifiedIssuer: 'reversr-development-qualification',
    verifiedAudience: binding.target.deploymentName,
    verifiedSubjectDigest,
    role: 'grant-custodian',
    resourceBindingDigest: resourceDigest,
    active: false,
    generation: 1,
    expiresAtMs: windowEndMs,
    approvedPolicyDigest: approvalSha,
  });
  await db.insert('cadUploadSessions', {
    schemaVersion: 2,
    userId,
    shopId: binding.synthetic.shopId,
    loginSessionId,
    authMethod: 'password',
    sessionId: binding.synthetic.sessionId,
    cadUploadAllowed: false,
    transport: 'bearer',
    issuedAt: now,
    expiresAt: windowEndMs,
    status: 'revoked',
    credentialDigest,
    userGeneration: 0,
    membershipGeneration: 0,
    revokedAt: now,
  });
  const grantId = await db.insert('cadControlledUploadGrants', {
    grantKey: k.grantKey, scopeKey: k.scopeKey, runKey: k.runKey, bindingDigest: k.bindingDigest,
    binding: grantBinding, installedByPrincipalId: principalId, installedAtMs: now,
  });
  const scopeId = await db.insert('cadControlledUploadScopes', {
    scopeKey: k.scopeKey, approvedRunId: grantBinding.approvedRunId, runKey: k.runKey, grantId,
    sessionKey: k.sessionKey, currentBindingDigest: k.bindingDigest, revision: 1, authorityGeneration: 1,
    lastHostTimeMs: now, custodyEpochDigest, runSpent: true, revoked: true, permanentStop: true,
    stopReason: 'revoked', grantHistoryDigests: [k.bindingDigest],
  });
  const requestNonceDigest = await hash(['cad-controlled-upload-development-qualification-attempt-v1',
    k.bindingDigest, approvalSha]);
  const attemptId = await db.insert('cadControlledUploadAttempts', {
    scopeId, grantId, runKey: k.runKey, sessionKey: k.sessionKey, requestNonceDigest,
    bindingDigest: k.bindingDigest, revision: 1, attemptSpent: true, rollbackArmed: true,
    fenceOpenedOnce: false, fenceOpen: false, consumed: false, closed: true, revoked: true,
    unknown: false, deadlineMs: windowEndMs,
    authorityGenerations: { login: 0, user: 0, membership: 0, uploadSession: 0, hostPrincipal: 1, grant: 1 },
    recoveryState: 'closed-revoked', recoveryDueAtMs: now, lastReceiptSequence: 1,
  });
  await db.insert('cadControlledUploadSessionTombstones', {
    sessionKey: k.sessionKey, scopeId, runKey: k.runKey, bindingDigest: k.bindingDigest,
    spent: true, consumed: false, revoked: true, createdAtMs: now,
  });
  const resultDigest = await hash(['cad-controlled-upload-development-qualification-terminal-v1',
    k.bindingDigest, requestNonceDigest, now]);
  await db.insert('cadControlledUploadReceipts', {
    operationKey: await hash(['cad-controlled-upload-development-qualification-receipt-v1', k.scopeKey]),
    scopeId, attemptId, bindingDigest: k.bindingDigest, requestNonceDigest,
    operation: 'revokeSessionAndLateGrants', sequence: 1, beforeRevision: 0, afterRevision: 1,
    authorityGeneration: 1, principalGeneration: 1, evaluatedAtMs: now, deadlineMs: windowEndMs,
    outcome: 'committed-restrictive', resultDigest, custodyEpochDigest, commitOrdering: null,
  });
  return closed('DEVELOPMENT_QUALIFICATION_TERMINAL_COMMITTED', {
    modelAccepted: true,
    runSpent: true,
    sessionCreated: true,
    attemptCreated: true,
    rollbackArmed: true,
    bindingDigest: k.bindingDigest,
    resultDigest,
  });
}

export const qualifyOnce = internalMutation({
  args: {},
  returns: result,
  handler: async ctx => executeDevelopmentQualification(ctx.db, Date.now(), process.env.CONVEX_CLOUD_URL),
});

export const readSanitized = internalQuery({
  args: {},
  returns: result,
  handler: async ctx => readTerminal(ctx.db),
});
