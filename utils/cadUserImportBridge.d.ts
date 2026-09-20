export const CAD_USER_IMPORT_PATH: '/api/cad/user-import';
export const CAD_USER_IMPORT_ENABLED: false;
export const CAD_UPLOAD_SESSION_MAX_LIFETIME_MS: 900000;
export const CAD_FILE_ACCEPT: string;
export const CAD_FILE_FORMATS: Readonly<Record<string, Readonly<{ label: string; localPreviewFormat: string | null }>>>;
export type CadUploadSession = Readonly<{ transport: 'cookie'; expiresAt: number; csrfToken: string }>;
export type CadUploadSessionResult =
  | Readonly<{ ok: true; code: 'SESSION_READY'; message: string; canSubmit: false; session: CadUploadSession }>
  | { ok: false; code: string; message: string; canSubmit: false };
export type CadUploadSessionAdapter = Readonly<{
  connect(options?: { signal?: AbortSignal }): Promise<CadUploadSessionResult>;
}>;
export function createCadUploadSessionAdapter(options?: {
  issue?: (options: { signal: AbortSignal }) => Promise<unknown> | unknown;
  now?: () => number;
  timeoutMs?: number;
}): CadUploadSessionAdapter;
export function parseCadUploadSessionResponse(response: unknown, options?: { now?: number }): CadUploadSessionResult;
export function mapCadImportError(response: unknown): { code: string; message: string; canSubmit: false };
export function getCadFileFormat(fileName: string): Readonly<{ label: string; localPreviewFormat: string | null }> | null;
export function canRenderLocalCadFile(file: { name?: string; size?: number } | null | undefined): boolean;
export function prepareCadFileMetadata(file: { name: string; size: number }): {
  metadata: { format: string; bytes: number; extension: string; renderableLocalPreview: boolean } | null;
  message: string;
};
