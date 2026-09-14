export type Digest = string;
export interface Scope {
  resourceBindingDigest: Digest; namespaceDigest: Digest; runDigest: Digest;
  ledgerDigest: Digest; windowDigest: Digest; fenceDigest: Digest;
}
export interface Binding { userId: string; shopId: string; sessionId: string; loginSessionId: string }
export interface Selector { scope: Scope; binding: Binding; key: string; fence: number; selectorDigest: Digest }
export interface EngineResult { decision: 'LIVE_RUN_BLOCKED'; executable: false; liveRunAuthorized: false;
  liveQualified: false; uploadsEnabled: false; conversionEnabled: false; publicationAuthorized: false;
  remoteAttempts: number; retainHolds: true; retainLeases: true; redispatch: false;
  engineAccepted: boolean; code: string; [key: string]: unknown }
export interface DurableStore {
  readLedger(scope: Scope): Promise<any>; insertLedger(value: any): Promise<any>;
  writeLedger(id: any, value: any): Promise<void>; readAuthority(ledgerId: any, binding: Binding): Promise<any[]>;
  insertAuthority(ledgerId: any, value: any): Promise<void>; writeAuthority(id: any, value: any): Promise<void>;
}
export function createDurableEngine(options: { store: DurableStore; now?: () => number;
  verifyIndependentEvidence?: (evidence: any, selector: Selector) => Promise<any> | any }): Readonly<Record<string, (input: any) => Promise<EngineResult>>>;
export const AUTHORITY_KINDS: readonly string[];
export const SCOPE_KEYS: readonly string[];
export const BINDING_KEYS: readonly string[];
export const MAX_RECORDS: number;
export const MAX_PAGE: number;
export const MAX_CLAIM_MS: number;
