/** Future engine contract; this source implementation always refuses operations.
 * Engine must atomically read authority, CAS revisions, account costs and persist
 * receipts with the transition. No callback/driver is accepted by the factory.
 * All selectors/cursors/claims must be scoped and checked inside the transaction.
 */
export type Digest = string;
export interface Scope {
  resourceBindingDigest: Digest; namespaceDigest: Digest; runDigest: Digest;
  ledgerDigest: Digest; windowDigest: Digest; fenceDigest: Digest;
}
export interface Selector { scope: Scope; selectorDigest: Digest }
export interface Attempt {
  commandDigest: Digest; matrixRow: string; attempt: 1 | 2 | 3;
  deadlineUtcDigest: Digest; sharedBudgetReceiptDigest: Digest;
}
export interface Claim { generation: number; ownerDigest: Digest; expiresUtcDigest: Digest }
export interface Blocked {
  decision: 'LIVE_RUN_BLOCKED'; executable: false; liveRunAuthorized: false;
  liveQualified: false; uploadsEnabled: false; conversionEnabled: false;
  publicationAuthorized: false; remoteAttempts: 0;
  retainHolds: true; retainLeases: true; redispatch: false;
}
export interface DurableAdapter {
  readExact(selector: Selector, attempt: Attempt): Blocked;
  readAuthority(selector: Selector, attempt: Attempt): Blocked;
  transact(selector: Selector, expectedRevision: number, proposalDigest: Digest, attempt: Attempt): Blocked;
  claim(selector: Selector, expectedGeneration: number, claim: Claim, attempt: Attempt): Blocked;
  settle(selector: Selector, claim: Claim, independentReceiptDigest: Digest, attempt: Attempt): Blocked;
  scanPage(scope: Scope, cursor: { after: number; through: number }, limit: number, attempt: Attempt): Blocked;
  stop(): Blocked;
}
export const METHODS: readonly string[];
export function blocked(): Blocked;
export function createDurableAdapter(): Readonly<DurableAdapter>;
