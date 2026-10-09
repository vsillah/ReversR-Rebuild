export type IgsImportState = {
  status: 'idle' | 'queued' | 'processing' | 'ready' | 'error';
  message: string;
};

export const IGS_FILE_ACCEPT: '.igs,.iges';
export const IGS_MAX_BYTES: number;
export const PUBLIC_CUBE_BYTES: 11562;
export const PUBLIC_CUBE_SHA256: string;
export function validateIgsFileMetadata(file: { name?: string; size?: number } | null | undefined):
  | { ok: true; code: 'METADATA_VALID'; message: string }
  | { ok: false; code: string; message: string };
export function verifyPublicIgsFixture(file: File): Promise<
  | { ok: true; code: 'PUBLIC_FIXTURE_VERIFIED'; digest: string }
  | { ok: false; code: string; message: string }
>;
export function createPublicCubeDerivedStl(): string;
export function nextIgsImportState(state: IgsImportState, event: { type: string; message?: string }): IgsImportState;
