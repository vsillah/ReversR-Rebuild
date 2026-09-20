import type { CadInternalTesterFixture } from './cadInternalTesterPreview';

export const LOCAL_IGES_PREVIEW_MAX_BYTES: number;
export const LOCAL_CAD_PREVIEW_FORMATS: Readonly<Record<string, Readonly<{ label: string; importFormat: string; readMethod: string }>>>;

export function createLocalCadFixture(options: {
  fileName: string;
  bytes: number;
  sha256: string;
  result: unknown;
  format?: Readonly<{ label: string; importFormat: string; readMethod: string }>;
}): Readonly<CadInternalTesterFixture>;

export function createLocalIgesFixture(options: {
  fileName: string;
  bytes: number;
  sha256: string;
  result: unknown;
}): Readonly<CadInternalTesterFixture>;

export function prepareLocalCadPreview(file: File): Promise<Readonly<CadInternalTesterFixture>>;
export function prepareLocalIgesPreview(file: File): Promise<Readonly<CadInternalTesterFixture>>;

export function supportedLocalCadFile(file: { name?: string; size?: number } | null | undefined): string | null;
export function supportedLocalIgesFile(file: { name?: string; size?: number } | null | undefined): string | null;

export function supportsLocalCadPreview(): boolean;
export function supportsLocalIgesPreview(): boolean;
