"use node";

import { createAccount, invalidateSessions } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action } from './_generated/server';
import { cadDevAuthQualificationBinding } from './cadDevAuthQualificationBinding';
import { developmentConfiguration, developmentPasswordCohort } from './developmentAuth';

const sha256 = async (value: string) => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
const hex = (value: string) => /^[a-f0-9]{64}$/.test(value);

type InventoryCounts = {
  users: number;
  authAccounts: number;
  authSessions: number;
  authRefreshTokens: number;
  authVerificationCodes: number;
  authRateLimits: number;
  authVerifiersSelectorLimited: boolean;
  cadUploadSessionsSelectorLimited: boolean;
};

type InventorySlot = {
  slot: number;
  email: string;
  userId: Id<'users'> | null;
  accountId: Id<'authAccounts'> | null;
  counts: InventoryCounts;
};

type SlotReceipt = {
  slot: number;
  email: string;
  userId: Id<'users'>;
  accountId: Id<'authAccounts'>;
};

type ProvisionResult = {
  code: 'SYNTHETIC_COHORT_PROVISIONED';
  cadUploadAllowed: false;
  conversionAllowed: false;
  retainedUsersAndAccounts: true;
  slots: SlotReceipt[];
  before: InventorySlot[];
  after: InventorySlot[];
};

type RevokeResult = {
  code: 'SYNTHETIC_SESSIONS_REVOKED';
  cadUploadAllowed: false;
  conversionAllowed: false;
  retainedUsersAndAccounts: true;
  after: InventorySlot[];
};

const slotReceipt = v.object({
  slot: v.number(),
  email: v.string(),
  userId: v.id('users'),
  accountId: v.id('authAccounts'),
});

const inventoryCounts = v.object({
  users: v.number(),
  authAccounts: v.number(),
  authSessions: v.number(),
  authRefreshTokens: v.number(),
  authVerificationCodes: v.number(),
  authRateLimits: v.number(),
  authVerifiersSelectorLimited: v.boolean(),
  cadUploadSessionsSelectorLimited: v.boolean(),
});

const inventorySlot = v.object({
  slot: v.number(),
  email: v.string(),
  userId: v.union(v.id('users'), v.null()),
  accountId: v.union(v.id('authAccounts'), v.null()),
  counts: inventoryCounts,
});

async function guard(args: {
  runKey: string;
  runKeySha256: string;
  acceptedProjectionSha256: string;
  acceptanceReceiptSha256: string;
}) {
  const binding = cadDevAuthQualificationBinding;
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
  const n = Date.now();
  if (!Number.isSafeInteger(n) || n < run.windowStartMs || n >= run.windowEndMs
    || run.windowEndMs <= run.windowStartMs || run.windowEndMs > run.windowStartMs + 15 * 60 * 1000) {
    throw new Error('QUALIFICATION_WINDOW_CLOSED');
  }
  const configuration = developmentConfiguration(process.env);
  if (!configuration || configuration.issuer !== binding.target.siteUrl
    || configuration.origin !== binding.target.appOrigin) throw new Error('QUALIFICATION_TARGET_MISMATCH');
  const cohort = developmentPasswordCohort();
  if (cohort.length !== 2 || cohort[0] !== binding.cohort[0] || cohort[1] !== binding.cohort[1]) {
    throw new Error('QUALIFICATION_COHORT_MISMATCH');
  }
  return { cohort, now: n };
}

function assertEmpty(inventory: Array<{ counts: Record<string, number | boolean> }>) {
  for (const slot of inventory) {
    for (const [key, value] of Object.entries(slot.counts)) {
      if (typeof value === 'number' && value !== 0) throw new Error(`QUALIFICATION_NOT_EMPTY:${key}`);
    }
  }
}

export const provisionCohort = action({
  args: {
    runKey: v.string(),
    runKeySha256: v.string(),
    acceptedProjectionSha256: v.string(),
    acceptanceReceiptSha256: v.string(),
    passwords: v.array(v.string()),
  },
  returns: v.object({
    code: v.literal('SYNTHETIC_COHORT_PROVISIONED'),
    cadUploadAllowed: v.literal(false),
    conversionAllowed: v.literal(false),
    retainedUsersAndAccounts: v.literal(true),
    slots: v.array(slotReceipt),
    before: v.array(inventorySlot),
    after: v.array(inventorySlot),
  }),
  handler: async (ctx, args): Promise<ProvisionResult> => {
    const { cohort } = await guard(args);
    if (args.passwords.length !== 2 || args.passwords.some(password =>
      typeof password !== 'string' || password.length < 12 || password.length > 128)) {
      throw new Error('QUALIFICATION_PASSWORD_DENIED');
    }
    const before: InventorySlot[] = await ctx.runQuery(internal.cadDevAuthQualificationStore.inventory, {});
    assertEmpty(before);
    const slots: SlotReceipt[] = [];
    for (const [slot, email] of cohort.entries()) {
      const created = await createAccount(ctx, {
        provider: 'password',
        account: { id: email, secret: args.passwords[slot] },
        profile: { email },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      if (created.user.email !== email || created.account.provider !== 'password'
        || created.account.providerAccountId !== email || created.account.userId !== created.user._id) {
        throw new Error('QUALIFICATION_PROVISION_DRIFT');
      }
      slots.push({ slot, email, userId: created.user._id, accountId: created.account._id });
    }
    const after: InventorySlot[] = await ctx.runQuery(internal.cadDevAuthQualificationStore.inventory, {});
    return {
      code: 'SYNTHETIC_COHORT_PROVISIONED',
      cadUploadAllowed: false,
      conversionAllowed: false,
      retainedUsersAndAccounts: true,
      slots,
      before,
      after,
    };
  },
});

export const revokeUsers = action({
  args: {
    runKey: v.string(),
    runKeySha256: v.string(),
    acceptedProjectionSha256: v.string(),
    acceptanceReceiptSha256: v.string(),
    userIds: v.array(v.id('users')),
  },
  returns: v.object({
    code: v.literal('SYNTHETIC_SESSIONS_REVOKED'),
    cadUploadAllowed: v.literal(false),
    conversionAllowed: v.literal(false),
    retainedUsersAndAccounts: v.literal(true),
    after: v.array(inventorySlot),
  }),
  handler: async (ctx, args): Promise<RevokeResult> => {
    await guard(args);
    if (args.userIds.length !== 2 || new Set(args.userIds).size !== 2) throw new Error('QUALIFICATION_USER_MISMATCH');
    for (const userId of args.userIds) await invalidateSessions(ctx, { userId });
    const after: InventorySlot[] = await ctx.runQuery(internal.cadDevAuthQualificationStore.inventory, {});
    return {
      code: 'SYNTHETIC_SESSIONS_REVOKED',
      cadUploadAllowed: false,
      conversionAllowed: false,
      retainedUsersAndAccounts: true,
      after,
    };
  },
});
