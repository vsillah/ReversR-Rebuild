/** Source interface only; runtime wiring and credentials require separate review. */
export interface ReadOptions {
  readonly signal: AbortSignal;
  readonly deadlineAt: number;
  /** Reserve every underlying HTTP call, including metadata/key retrieval, before dispatch. */
  readonly reserveProviderRequest: () => void;
}
export interface AuthenticatedSession {
  readonly userId: string;
  readonly loginSessionId: string;
  readonly authMethod: 'password' | 'passkey' | 'oidc';
  readonly active: boolean;
  readonly expiresAt: number;
}
export interface Authorization {
  readonly authMethod: 'password' | 'passkey' | 'oidc';
  readonly userId: string;
  readonly loginSessionId: string;
  readonly shopId: string;
  readonly cadUploadAllowed: boolean;
  readonly expiresAt: number;
}
export interface ProviderAdapter {
  readonly sourceOnly: true;
  readonly configured: false;
  readonly providerBound: false;
  readAuthenticatedSession(context: unknown, options: ReadOptions): Promise<AuthenticatedSession | null>;
  readAuthorization(binding: Pick<AuthenticatedSession, 'userId' | 'loginSessionId' | 'authMethod'> & { readonly shopId: string; readonly cohort: string }, options: ReadOptions): Promise<Authorization | null>;
}
export declare function createProviderAdapter(): ProviderAdapter;
