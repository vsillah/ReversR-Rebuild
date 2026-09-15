"use node";

import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action } from './_generated/server';
import { cadDevUploadSessionQualificationBinding } from './cadDevUploadSessionQualificationBinding';

const hex = (value: string) => /^[a-f0-9]{64}$/.test(value);
const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const principal = v.object({
  userId: v.id('users'),
  shopId: v.string(),
  loginSessionId: v.id('authSessions'),
  authMethod: v.literal('password'),
});

const record = v.object({
  schemaVersion: v.literal(2),
  userId: v.id('users'),
  shopId: v.string(),
  loginSessionId: v.id('authSessions'),
  authMethod: v.literal('password'),
  sessionId: v.string(),
  cadUploadAllowed: v.literal(true),
  transport: v.literal('bearer'),
  issuedAt: v.number(),
  expiresAt: v.number(),
  status: v.literal('active'),
});

type QualificationResult = {
  code: 'SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED';
  cadUploadsDisabled: true;
  bodyAdmissionAuthorized: false;
  conversionAllowed: false;
  retainedUploadSession: true;
  inserted: boolean;
  readBeforeRevoke: boolean;
  revoked: boolean;
  readAfterRevoke: false;
};

type QualificationResultWithAuthority = QualificationResult & {
  syntheticAuthorityProvisioned: true;
  syntheticAuthorityRevoked: true;
  authorityRowsRetained: true;
};

type QualificationArgs = {
  runKey: string;
  runKeySha256: string;
  acceptedProjectionSha256: string;
  acceptanceReceiptSha256: string;
  principal: {
    userId: string;
    shopId: string;
    loginSessionId: string;
    authMethod: 'password';
  };
  credentialDigest: string;
  record: {
    schemaVersion: 2;
    userId: string;
    shopId: string;
    loginSessionId: string;
    authMethod: 'password';
    sessionId: string;
    cadUploadAllowed: true;
    transport: 'bearer';
    issuedAt: number;
    expiresAt: number;
    status: 'active';
  };
};

async function guard(args: {
  runKey: string;
  runKeySha256: string;
  acceptedProjectionSha256: string;
  acceptanceReceiptSha256: string;
}) {
  const binding = cadDevUploadSessionQualificationBinding;
  const run = binding.run;
  if (!binding.enabled || run.runKeySha256 === null || run.acceptedProjectionSha256 === null
    || run.acceptanceReceiptSha256 === null || run.windowStartMs === null || run.windowEndMs === null) {
    throw new Error('QUALIFICATION_DISABLED');
  }
  if (!hex(args.runKeySha256) || await sha256(args.runKey) !== args.runKeySha256
    || args.runKeySha256 !== run.runKeySha256
    || args.acceptedProjectionSha256 !== run.acceptedProjectionSha256
    || args.acceptanceReceiptSha256 !== run.acceptanceReceiptSha256) {
    throw new Error('QUALIFICATION_DENIED');
  }
  const now = Date.now();
  if (!Number.isSafeInteger(now) || now < run.windowStartMs || now >= run.windowEndMs
    || run.windowEndMs <= run.windowStartMs
    || run.windowEndMs > run.windowStartMs + binding.constraints.maxWindowMs) {
    throw new Error('QUALIFICATION_WINDOW_CLOSED');
  }
  return { now };
}

function deadlineAt() {
  const current = Date.now();
  if (!Number.isSafeInteger(current)) throw new Error('QUALIFICATION_CLOCK_INVALID');
  return current + cadDevUploadSessionQualificationBinding.constraints.maxOperationBudgetMs;
}

function sameBinding(a: {
  userId: string; shopId: string; loginSessionId: string; authMethod: string;
}, b: {
  userId: string; shopId: string; loginSessionId: string; authMethod: string;
}) {
  return a.userId === b.userId && a.shopId === b.shopId
    && a.loginSessionId === b.loginSessionId && a.authMethod === b.authMethod;
}

function validateRecord(args: QualificationArgs, now: number) {
  const binding = cadDevUploadSessionQualificationBinding;
  if (!hex(args.credentialDigest) || !sameBinding(args.record, args.principal)
    || args.record.issuedAt > now || args.record.expiresAt <= now
    || args.record.expiresAt - args.record.issuedAt > binding.constraints.maxWindowMs) {
    throw new Error('QUALIFICATION_RECORD_DENIED');
  }
}

async function issueReadRevokeSequence(ctx: any, args: QualificationArgs): Promise<QualificationResult> {
  const inserted: boolean = await ctx.runMutation(internal.cad.insertIfAbsent, {
    principal: args.principal,
    credentialDigest: args.credentialDigest,
    record: args.record,
    deadlineAt: deadlineAt(),
  });
  if (inserted !== true) throw new Error('QUALIFICATION_INSERT_DENIED');
  const readBefore = await ctx.runQuery(internal.cad.read, {
    principal: args.principal,
    credentialDigest: args.credentialDigest,
    deadlineAt: deadlineAt(),
  });
  if (readBefore === null || readBefore.status !== 'active' || !sameBinding(readBefore, args.principal)) {
    throw new Error('QUALIFICATION_READ_DENIED');
  }
  const revoked: boolean = await ctx.runMutation(internal.cad.revoke, {
    principal: args.principal,
    credentialDigest: args.credentialDigest,
    revokedAt: Date.now(),
    deadlineAt: deadlineAt(),
  });
  if (revoked !== true) throw new Error('QUALIFICATION_REVOKE_DENIED');
  const readAfter = await ctx.runQuery(internal.cad.read, {
    principal: args.principal,
    credentialDigest: args.credentialDigest,
    deadlineAt: deadlineAt(),
  });
  if (readAfter !== null) throw new Error('QUALIFICATION_REVOKE_NOT_OBSERVED');
  return {
    code: 'SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED',
    cadUploadsDisabled: true,
    bodyAdmissionAuthorized: false,
    conversionAllowed: false,
    retainedUploadSession: true,
    inserted,
    readBeforeRevoke: true,
    revoked,
    readAfterRevoke: false,
  };
}

export const issueReadRevoke = action({
  args: {
    runKey: v.string(),
    runKeySha256: v.string(),
    acceptedProjectionSha256: v.string(),
    acceptanceReceiptSha256: v.string(),
    principal,
    credentialDigest: v.string(),
    record,
  },
  returns: v.object({
    code: v.literal('SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED'),
    cadUploadsDisabled: v.literal(true),
    bodyAdmissionAuthorized: v.literal(false),
    conversionAllowed: v.literal(false),
    retainedUploadSession: v.literal(true),
    inserted: v.boolean(),
    readBeforeRevoke: v.boolean(),
    revoked: v.boolean(),
    readAfterRevoke: v.literal(false),
  }),
  handler: async (ctx, args): Promise<QualificationResult> => {
    const { now } = await guard(args);
    validateRecord(args, now);
    return issueReadRevokeSequence(ctx, args);
  },
});

export const issueReadRevokeWithSyntheticAuthority = action({
  args: {
    runKey: v.string(),
    runKeySha256: v.string(),
    acceptedProjectionSha256: v.string(),
    acceptanceReceiptSha256: v.string(),
    principal,
    credentialDigest: v.string(),
    record,
  },
  returns: v.object({
    code: v.literal('SYNTHETIC_UPLOAD_SESSION_SEQUENCE_REVOKED'),
    cadUploadsDisabled: v.literal(true),
    bodyAdmissionAuthorized: v.literal(false),
    conversionAllowed: v.literal(false),
    retainedUploadSession: v.literal(true),
    inserted: v.boolean(),
    readBeforeRevoke: v.boolean(),
    revoked: v.boolean(),
    readAfterRevoke: v.literal(false),
    syntheticAuthorityProvisioned: v.literal(true),
    syntheticAuthorityRevoked: v.literal(true),
    authorityRowsRetained: v.literal(true),
  }),
  handler: async (ctx, args): Promise<QualificationResultWithAuthority> => {
    const { now } = await guard(args);
    validateRecord(args, now);
    await ctx.runMutation(internal.cadDevUploadSessionQualificationAuthority.provisionSyntheticAuthority, {
      principal: args.principal,
      deadlineAt: deadlineAt(),
    });
    let cleanup;
    try {
      const result = await issueReadRevokeSequence(ctx, args);
      cleanup = await ctx.runMutation(internal.cadDevUploadSessionQualificationAuthority.revokeSyntheticAuthority, {
        principal: args.principal,
        deadlineAt: deadlineAt(),
      });
      if (cleanup.userAuthorityRevoked !== true || cleanup.membershipRevoked !== true
        || cleanup.userAuthorityRetained !== true || cleanup.membershipRetained !== true) {
        throw new Error('QUALIFICATION_AUTHORITY_REVOKE_DENIED');
      }
      return {
        ...result,
        syntheticAuthorityProvisioned: true as const,
        syntheticAuthorityRevoked: true as const,
        authorityRowsRetained: true as const,
      };
    } finally {
      if (cleanup === undefined) {
        await ctx.runMutation(internal.cadDevUploadSessionQualificationAuthority.revokeSyntheticAuthority, {
          principal: args.principal,
          deadlineAt: deadlineAt(),
        });
      }
    }
  },
});
