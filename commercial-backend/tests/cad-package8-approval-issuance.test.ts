/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../../convex/schema';
import { internal } from '../../convex/_generated/api';
import package8Limits from '../../server/cadPhase5Package8Limits.json';
import { validIssueCommand } from '../../server/cadPhase5Package8ApprovalIssuanceContract';

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
const ISSUER_LIMITS = {
  ...package8Limits.issuer,
  schemaVersion: 1 as const,
  maximumSessions: 1 as const,
  maximumFiles: 1 as const,
  maximumAttempts: 1 as const,
  maximumRetries: 0 as const,
  currency: 'USD' as const,
};
const BASELINE = {
  commit: '228320e174d23cbe9b43d9c192c2216733f4c477',
  tree: 'cb22fc27d6bc741f2abc61ed0e456d66e2bfc336',
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function command(reference = 'package8-convex-parity-1', now = Date.now()) {
  const runtime = {
    schemaVersion: 1 as const,
    deploymentId: 'majestic-alligator-31',
    state: 'READY' as const,
    environment: 'development' as const,
    commit: '4b5f172bb267e9b33335e2b856e4d0e8590369db',
    tree: 'a8eb1552934c65e5f72b633b5bb78f6e24c5a290',
    identityMetadataSupported: true as const,
    functionSchemaEquivalenceClaimed: false as const,
    receiptDigest: '',
  };
  runtime.receiptDigest = await sha256([
    runtime.deploymentId, runtime.state, runtime.environment, runtime.commit, runtime.tree,
    String(runtime.identityMetadataSupported), String(runtime.functionSchemaEquivalenceClaimed),
  ].join('|'));
  const request = {
    schemaVersion: 1 as const,
    issuanceReference: reference,
    approvalCommitment: await sha256(`approval|${reference}`),
    baselineCommit: BASELINE.commit,
    baselineTree: BASELINE.tree,
    executionHeadCommit: runtime.commit,
    executionHeadTree: runtime.tree,
    runtimeDeploymentId: runtime.deploymentId,
    runtimeReceiptDigest: runtime.receiptDigest,
    ownerCommitment: await sha256(`owner|${reference}`),
    sessionCommitment: await sha256(`session|${reference}`),
    windowIdDigest: await sha256(`window|${reference}`),
    windowStartUtc: new Date(now - 5_000).toISOString(),
    windowEndUtc: new Date(now + 9 * 60_000).toISOString(),
    limitsCommitment: await sha256(JSON.stringify(package8Limits.qualification)),
    authorityExpiresAtUtc: new Date(now + 9 * 60_000).toISOString(),
  };
  const sourceReview = {
    schemaVersion: 1 as const,
    baselineCommit: BASELINE.commit,
    baselineTree: BASELINE.tree,
    executionHeadCommit: runtime.commit,
    executionHeadTree: runtime.tree,
    clean: true as const,
    descendantOfBaseline: true as const,
    ancestryReceiptDigest: await sha256([
      BASELINE.commit, BASELINE.tree, runtime.commit, runtime.tree, 'clean-descendant',
    ].join('|')),
  };
  return {
    issuerPrincipalDigest: await sha256(`issuer|${reference}`),
    command: {
      schemaVersion: 1 as const,
      issuerPrincipalDigest: await sha256(`issuer|${reference}`),
      request,
      sourceReview,
      runtimeDeployment: runtime,
      limits: { ...ISSUER_LIMITS },
      calculatedMaximumCostMicros: 8_999_999,
      issuedAtUtc: new Date(now - 1_000).toISOString(),
    },
  };
}

test('registered mutation accepts canonical limits, rejects mismatch before insert and refuses replay',
  async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const acceptedInput = await command('package8-convex-parity-1', now);
    expect(validIssueCommand(acceptedInput.command)).toBe(true);
    const accepted = await t.mutation(internal.cadPhase5Package8ApprovalIssuance.issue,
      acceptedInput);
    expect(accepted).toMatchObject({ accepted: true, code: 'PACKAGE8_APPROVAL_ISSUED' });

    const replay = await t.mutation(internal.cadPhase5Package8ApprovalIssuance.issue,
      acceptedInput);
    expect(replay).toMatchObject({ accepted: false, code: 'PACKAGE8_APPROVAL_REPLAYED' });

    const deniedInput = await command('package8-convex-parity-denied', now);
    deniedInput.command.request.limitsCommitment = await sha256('mismatched-limits');
    const denied = await t.mutation(internal.cadPhase5Package8ApprovalIssuance.issue,
      deniedInput);
    expect(denied).toMatchObject({ accepted: false, code: 'PACKAGE8_APPROVAL_DENIED' });

    const count = await t.run(async ctx => (await ctx.db
      .query('cadPackage8ApprovalIssuances').collect()).length);
    expect(count).toBe(1);
  });
