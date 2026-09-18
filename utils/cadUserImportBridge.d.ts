export const CAD_USER_IMPORT_PATH: '/api/cad/user-import';
export const CAD_USER_IMPORT_ENABLED: false;
export function mapCadImportError(response: unknown): { code: string; message: string; canSubmit: false };
export function prepareCadFileMetadata(file: { name: string; size: number }): { metadata: { format: string; bytes: number } | null; message: string };
