// Internal-only source candidate. No route, client API, provider or environment binding.
import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { qualificationBinding, qualificationPolicy, qualificationScope } from './schema';
import { createDurableEngine } from '../offline/cad-convex/durableEngine';

const scope = v.object(qualificationScope);
const binding = v.object(qualificationBinding);
const selector = v.object({ scope, binding, key: v.string(), fence: v.number(), selectorDigest: v.string() });
const command = v.union(
  v.object({ type: v.literal('reserve'), binding, key: v.string(), reservationMicros: v.number() }),
  v.object({ type: v.literal('fence'), binding, key: v.string(), fence: v.number() }),
  v.object({ type: v.literal('unknown'), binding, key: v.string(), fence: v.number() }),
  v.object({ type: v.literal('cancel'), binding, key: v.string(), fence: v.number() }),
);
const engineResult = v.object({
  decision: v.literal('LIVE_RUN_BLOCKED'), executable: v.literal(false), liveRunAuthorized: v.literal(false),
  liveQualified: v.literal(false), uploadsEnabled: v.literal(false), conversionEnabled: v.literal(false),
  publicationAuthorized: v.literal(false), remoteAttempts: v.number(), retainHolds: v.literal(true),
  retainLeases: v.literal(true), redispatch: v.literal(false), engineAccepted: v.boolean(), code: v.string(),
  changed: v.optional(v.boolean()), revision: v.optional(v.number()), authorityRevision: v.optional(v.number()),
  fence: v.optional(v.number()), status: v.optional(v.union(v.literal('reserved'), v.literal('fenced'), v.literal('unknown'), v.literal('settled'))),
  outcome: v.optional(v.union(v.null(), v.literal('not-started'), v.literal('completed'), v.literal('failed'))),
  claimGeneration: v.optional(v.number()),
  selectors: v.optional(v.array(v.object({ binding, key: v.string(), fence: v.number(), selectorDigest: v.string() }))),
  next: v.optional(v.union(v.null(), v.object({ after: v.number(), through: v.number() }))),
});
const authorityKind = v.union(v.literal('login'), v.literal('upload-session'),
  v.literal('membership'), v.literal('permission'));

function store(ctx: any) {
  return {
    readLedger(value: any) {
      return ctx.db.query('cadQualificationLedgers')
        .withIndex('by_resource_namespace_run_ledger_window_fence', (q: any) => q
          .eq('resourceBindingDigest', value.resourceBindingDigest)
          .eq('namespaceDigest', value.namespaceDigest).eq('runDigest', value.runDigest)
          .eq('ledgerDigest', value.ledgerDigest).eq('windowDigest', value.windowDigest)
          .eq('fenceDigest', value.fenceDigest)).unique();
    },
    async insertLedger(value: any) {
      const id = await ctx.db.insert('cadQualificationLedgers', value);
      return { _id: id, ...value };
    },
    async writeLedger(id: any, value: any) {
      const { _id, _creationTime, ...patch } = value;
      await ctx.db.patch(id, patch);
    },
    async readAuthority(ledgerId: any, value: any) {
      const rows = [];
      for (const kind of ['login', 'upload-session', 'membership', 'permission'] as const) {
        const row = await ctx.db.query('cadQualificationAuthority')
          .withIndex('by_ledger_binding_kind', (q: any) => q.eq('ledgerId', ledgerId)
            .eq('userId', value.userId).eq('shopId', value.shopId).eq('sessionId', value.sessionId)
            .eq('loginSessionId', value.loginSessionId).eq('kind', kind)).unique();
        if (row) rows.push(row);
      }
      return rows;
    },
    async insertAuthority(ledgerId: any, value: any) {
      await ctx.db.insert('cadQualificationAuthority', { ledgerId, ...value.binding, ...value });
    },
    writeAuthority(id: any, value: any) { return ctx.db.patch(id, value); },
  };
}
const engine = (ctx: any) => createDurableEngine({ store: store(ctx),
  // Synthetic evidence projection is never independent live evidence.
  verifyIndependentEvidence: () => false });

export const initialize = internalMutation({
  args: { scope, policy: v.object(qualificationPolicy), binding,
    authority: v.array(v.object({ kind: authorityKind, generation: v.number(),
      active: v.boolean(), expiresAt: v.number() })), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).initialize(args),
});
export const readExact = internalQuery({
  args: { selector, deadlineAt: v.number() }, returns: engineResult,
  handler: (ctx, args) => engine(ctx).readExact(args),
});
export const readAuthority = internalQuery({
  args: { scope, binding, deadlineAt: v.number() }, returns: engineResult,
  handler: (ctx, args) => engine(ctx).readAuthority(args),
});
export const transact = internalMutation({
  args: { scope, expectedRevision: v.number(), selectorDigest: v.string(), commandDigest: v.string(),
    proposalDigest: v.string(), command, deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).transact(args),
});
export const changeAuthority = internalMutation({
  args: { scope, binding, kind: authorityKind, expectedGeneration: v.number(), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).changeAuthority(args),
});
export const claim = internalMutation({
  args: { selector, expectedGeneration: v.number(), ownerDigest: v.string(),
    expiresAt: v.number(), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).claim(args),
});
export const settle = internalMutation({
  args: { selector, claimGeneration: v.number(), ownerDigest: v.string(),
    evidence: v.object({ evidenceDigest: v.string(), outcome: v.union(v.literal('not-started'),
      v.literal('completed'), v.literal('failed')), actualMicros: v.number(),
      independentEvidenceVerified: v.boolean() }), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).settle(args),
});
export const scanPage = internalMutation({
  args: { scope, cursor: v.object({ after: v.number(), through: v.number() }), limit: v.number(),
    custodianDigest: v.string(), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).scanPage(args),
});
export const stop = internalMutation({
  args: { scope, reasonDigest: v.string(), deadlineAt: v.number() },
  returns: engineResult, handler: (ctx, args) => engine(ctx).stop(args),
});
