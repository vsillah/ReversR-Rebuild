import type { CadInternalTesterFixture } from './cadInternalTesterPreview';

export type AuthenticatedImportSourceChoice = 'file' | 'sample';
export type AuthenticatedImportState = Readonly<{
  schemaVersion: 1;
  status: 'idle' | 'selected' | 'uploading' | 'processing' | 'ready' | 'recoverable-error' | 'unknown' | 'deleted';
  code: string;
  sourceChoice: AuthenticatedImportSourceChoice | null;
  attemptConsumed: boolean;
  cleanupVerified: boolean;
  artifactsAvailable: boolean;
}>;
export type SyntheticArtifact = Readonly<{ kind: 'original-igs' | 'derived-stl'; fileName: string;
  format: 'model/iges' | 'model/stl'; bytes: Uint8Array; byteCount: number; sha256: string; content?: string }>;
export type SyntheticArtifacts = Readonly<{ original: SyntheticArtifact; stl: SyntheticArtifact }>;
export type AuthenticatedImportStateStore = { read(): AuthenticatedImportState | null; write(value: unknown): AuthenticatedImportState };
export type AuthenticatedImportAdapter = Readonly<{
  sourceOnly: true; configured: false; routeMounted: false; bodyAdmissionAuthorized: false;
  sessionIssuanceRouted: false; providerDispatchEnabled: false; conversionDispatchEnabled: false;
  storageDispatchEnabled: false; downloadGrantRouted: false; privateCadEnabled: false; maxRetries: 0;
  status(): AuthenticatedImportState;
  fixture(): CadInternalTesterFixture | null;
  artifacts(): SyntheticArtifacts | null;
  selectSource(source: AuthenticatedImportSourceChoice, onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  run(options?: { signal?: AbortSignal; onState?: (state: AuthenticatedImportState) => void }): Promise<Readonly<Record<string, unknown>>>;
  previewRecoverableFailure(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  recoverSafeFailure(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  previewUnknownOutcome(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  revokeUnknown(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  deleteArtifacts(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  startNew(onState?: (state: AuthenticatedImportState) => void): AuthenticatedImportState;
  readArtifact(kind: 'original-igs' | 'derived-stl', context: Record<string, unknown>): Readonly<Record<string, unknown>>;
}>;
export const AUTHENTICATED_IMPORT_QUERY_VALUE: 'authenticated-import-v1';
export const AUTHENTICATED_IMPORT_STATE_KEY: string;
export const SOURCE_SHA256: string;
export const STL_SHA256: string;
export function buildArtifacts(source: AuthenticatedImportSourceChoice): SyntheticArtifacts;
export function buildFixture(source: AuthenticatedImportSourceChoice): CadInternalTesterFixture;
export function createMemoryStateStore(seed?: unknown): AuthenticatedImportStateStore;
export function createAuthenticatedImportStateStore(storage: Pick<Storage, 'getItem' | 'setItem'>, key?: string): AuthenticatedImportStateStore;
export function inspectAuthenticatedImportQualification(locationLike?: { hostname?: unknown; search?: unknown } | null): Readonly<{ enabled: boolean; code: string }>;
export function parseSyntheticArtifactResponse(response: unknown, context?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function createAuthenticatedImportQualificationAdapter(options?: {
  stateStore?: AuthenticatedImportStateStore;
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}): AuthenticatedImportAdapter;
