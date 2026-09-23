/** Source contract only: the accompanying implementation always rejects. */
export type ReadOptions = Readonly<{ signal: AbortSignal; deadlineAt: number }>;
export type ExactIdentity = Readonly<{
  userId: string; loginSessionId: string; authMethod: 'password' | 'passkey' | 'oidc';
}>;
export interface ProviderAdapter {
  readonly sourceOnly: true;
  readonly configured: false;
  readonly deployed: false;
  /** Verify signature/issuer/audience/algorithm, then freshly read exact session and owner.
   * Bearer stays request-local. Never log, capture or place it into evidence.
   * No service credential fallback, cache authority, retries, writes or late effects.
   * Honor signal and deadline across ALL internal HTTP requests (including SDK work).
   */
  readAuthenticatedSession(headers: Readonly<{ authorization: string }>, options: ReadOptions):
    Promise<(ExactIdentity & Readonly<{ active: true; expiresAt: number }>) | null>;
  /** Fresh exact membership and permission read; never trust caller/JWT permission claims. */
  readAuthorization(identity: ExactIdentity & Readonly<{ shopId: string; cohort: string }>, options: ReadOptions):
    Promise<(ExactIdentity & Readonly<{ shopId: string; cadUploadAllowed: boolean; expiresAt: number }>) | null>;
}
export function createProviderAdapter(): ProviderAdapter;
