import type { CadInternalTesterFixture } from './cadInternalTesterPreview';

export const LOCAL_IGES_PREVIEW_MAX_BYTES: number;

export function createLocalIgesFixture(options: {
  fileName: string;
  bytes: number;
  sha256: string;
  result: unknown;
}): Readonly<CadInternalTesterFixture>;

export function prepareLocalIgesPreview(file: File): Promise<Readonly<CadInternalTesterFixture>>;

export function supportedLocalIgesFile(file: { name?: string; size?: number } | null | undefined): string | null;

export function supportsLocalIgesPreview(): boolean;
