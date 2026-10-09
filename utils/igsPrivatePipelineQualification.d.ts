import type { CadInternalTesterFixture } from './cadInternalTesterPreview';

export type SyntheticQualificationState = Readonly<{
  schemaVersion: 1;
  status: 'idle' | 'processing' | 'ready' | 'error';
  code: string;
  runRef: string | null;
  attemptConsumed: boolean;
  cleanupVerified: boolean;
  unknownOutcome: boolean;
}>;

export const QUALIFICATION_QUERY_KEY: 'cadQualification';
export const QUALIFICATION_QUERY_VALUE: 'synthetic-igs-v1';
export const QUALIFICATION_STATE_KEY: string;
export const MAX_SOURCE_BYTES: number;
export function inspectSyntheticIgsQualification(locationLike?: { hostname?: unknown; search?: unknown } | null): Readonly<{ enabled: boolean; code: string }>;
export function createSyntheticIgsSource(): Readonly<{ fileName: string; mimeType: string; bytes: Uint8Array }>;
export function validateSyntheticIgsUpload(source: unknown): Readonly<{ ok: boolean; code: string; message?: string; bytes?: number }>;
export function createVolatileCadCustody(): {
  put(source: unknown): Promise<Readonly<{ handle: string; sourceBytes: number }>>;
  read(handle: string): Promise<Readonly<{ fileName: string; bytes: Uint8Array }>>;
  remove(handle: string): Promise<boolean>;
  isEmpty(): boolean;
};
export function createMemoryQualificationStateStore(initial?: unknown): { read(): SyntheticQualificationState | null; write(value: unknown): SyntheticQualificationState };
export function createSessionQualificationStateStore(storage: Storage, key?: string): { read(): SyntheticQualificationState | null; write(value: unknown): SyntheticQualificationState };
export function createSyntheticIgsQualificationPipeline(options?: Record<string, unknown>): {
  status(): SyntheticQualificationState;
  run(options?: { signal?: AbortSignal }): Promise<Readonly<{
    ok: true;
    code: string;
    fixture: CadInternalTesterFixture;
    receipt: Readonly<Record<string, string | number>>;
  }> | Readonly<{ ok: false; code: string; message: string }>>;
};
