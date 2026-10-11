export const AUTHENTICATED_IGES_SOURCE_MAX_BYTES: number;
export function inspectAuthenticatedIgesSource(source?: {
  fileName?: unknown;
  bytes?: unknown;
}): Readonly<{
  ok: boolean;
  code: string;
  reason?: string;
  sourceBytes?: number;
}>;
