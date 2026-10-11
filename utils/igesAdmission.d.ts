export const IGES_SOURCE_MAX_BYTES: number;
export function inspectIgesFileName(fileName: unknown): Readonly<{ ok: boolean; code: string; reason?: string }>;
export function inspectIgesSource(source?: { fileName?: unknown; bytes?: unknown }): Readonly<{
  ok: boolean;
  code: string;
  reason?: string;
  sourceBytes?: number;
}>;
