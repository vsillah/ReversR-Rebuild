import type { QueryCtx, MutationCtx } from '../../convex/_generated/server';
import type { Id } from '../../convex/_generated/dataModel';
export type Binding = { userId: Id<'users'>; shopId: string;
  loginSessionId: Id<'authSessions'>; authMethod: 'password' | 'passkey' | 'oidc' };
export type Upload = Binding & { schemaVersion: 2; sessionId: string;
  cadUploadAllowed: boolean; transport: 'bearer' | 'cookie'; issuedAt: number;
  expiresAt: number; status: 'active' | 'revoked'; csrfDigest?: string };
export type Grant = Binding & { cadUploadAllowed: boolean; expiresAt: number };
type Payloads = {
  insertIfAbsent: { credentialDigest: string; record: Upload };
  read: { credentialDigest: string };
  revoke: { credentialDigest: string; revokedAt: number };
  resolveAuthorization: { shopId: string };
  refreshAuthorization: { binding: Binding & { sessionId: string } };
};
type Results = { insertIfAbsent: boolean; read: Upload | null; revoke: boolean;
  resolveAuthorization: Grant | null; refreshAuthorization: Grant | null };
export function createBackendContract(options: {
  readExactLibrarySession: (ctx: QueryCtx, id: Id<'authSessions'>, validThrough: number) =>
    Promise<(Omit<Binding, 'shopId'> & { active: boolean; expiresAt: number }) | null>;
  now?: () => number;
}): {
  run<K extends keyof Payloads>(ctx: K extends 'insertIfAbsent' | 'revoke' ? MutationCtx : QueryCtx,
    operation: K, payload: Payloads[K] & { deadlineAt: number }, principal: Binding): Promise<Results[K]>;
  changeAuthority(ctx: MutationCtx, payload: { userId: Id<'users'>; shopId?: string;
    enabled?: boolean; active?: boolean; cadUploadAllowed?: boolean; deadlineAt: number }): Promise<boolean>;
};
