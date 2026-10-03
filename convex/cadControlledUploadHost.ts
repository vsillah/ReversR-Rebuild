import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { grantBinding, operation } from './cadControlledUploadSchema';
import { verifyHostPrincipal, verifyIndependentReceipt, verifyIndependentSmoke } from '../offline/cad-convex/controlledUploadHostBridge';

const denied = v.object({ code: v.string(), sourceOnly: v.literal(true), modelAccepted: v.literal(false),
  hostQualified: v.literal(false), bodyAdmissionAuthorized: v.literal(false), liveReady: v.literal(false), costs: v.literal(0) });
// Unconditional source barrier. No env/args/ctx switch, DB call, grant installation,
// identity lookup, credential read, provider call or public ingress is registered.
export const registerApprovedGrantAndScope = internalMutation({
  args: { binding: grantBinding }, returns: denied, handler: () => ({ ...verifyHostPrincipal(), modelAccepted: false as const }),
});
export const transact = internalMutation({
  args: { scopeKey: v.string(), operation, bindingDigest: v.string(), expectedRevision: v.number(),
    requestNonceDigest: v.string(), expectedPrincipalGeneration: v.number(), custodyEpochDigest: v.string() },
  returns: denied, handler: () => ({ ...verifyHostPrincipal(), modelAccepted: false as const }),
});
export const readState = internalQuery({
  args: { scopeKey: v.string() }, returns: denied, handler: () => ({ ...verifyHostPrincipal(), modelAccepted: false as const }),
});
export const readReceipt = internalQuery({
  args: { operationKey: v.string() }, returns: denied, handler: () => ({ ...verifyIndependentReceipt(), modelAccepted: false as const }),
});
export const recordIndependentSmoke = internalMutation({
  args: { evidenceKey: v.string() }, returns: denied, handler: () => ({ ...verifyIndependentSmoke(), modelAccepted: false as const }),
});
