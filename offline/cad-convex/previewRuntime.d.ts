import type { Binding } from './backend';
type Operation = 'insertIfAbsent' | 'read' | 'revoke' | 'resolveAuthorization' | 'refreshAuthorization';
export type PreviewConfig = Readonly<{
  mode: 'synthetic'; target: 'local' | 'preview'; deploymentUrl: string;
  issuerUrl: string; appOrigin: string; applicationId: 'convex';
}>;
export type Readiness = Readonly<{
  code: 'PREVIEW_CONFIG_MISSING' | 'PREVIEW_CONFIG_INVALID' | 'LIVE_AUTH_UNQUALIFIED' | 'SYNTHETIC_CONFIG_VALID';
  configured: boolean; liveAuthReady: false; uploadsEnabled: false;
}>;
export type BoundaryOptions = { signal: AbortSignal; deadlineAt: number };
export function inspectPreviewConfig(config?: unknown): Readiness;
export function createSyntheticPreviewRuntime(options: {
  testOnly: true; config: PreviewConfig;
  verifyConfiguration: (config: PreviewConfig, options: BoundaryOptions) => Promise<boolean>;
  authenticateService: (context: Readonly<object>, options: BoundaryOptions) => Promise<boolean>;
  verifyExactLogin: (context: Readonly<object>, options: BoundaryOptions & { shopId?: string }) => Promise<Binding | null>;
  invokeInternal: (operation: Operation, payload: unknown, principal: Binding, options: { signal: AbortSignal }) => Promise<unknown>;
  now?: () => number;
}): Readonly<{ readiness: Readiness; forRequest(request: { context: Readonly<object>; shopId: string }): {
  issueSession(selector: { shopId: string }, options?: { transport?: 'bearer' | 'cookie'; lifetimeMs?: number }): Promise<unknown>;
  lookupSession(digest: string, options?: { signal?: AbortSignal }): Promise<unknown>;
  revokeSession(digest: string): Promise<unknown>;
} }>;
