export type CadInternalTesterFixture = {
  fixtureName: string;
  format: string;
  bytes: number;
  sha256: string;
  meshes: number;
  vertices: number;
  triangles: number;
  sourceConfidence: string;
};

export type CadInternalTesterPreview =
  | { enabled: false; code: string }
  | { enabled: true; code: 'CAD_TEST_PREVIEW_PUBLIC_CUBE'; fixture: CadInternalTesterFixture };

export const PREVIEW_QUERY_KEY: 'cadPreview';
export const PREVIEW_QUERY_VALUE: 'public-cube-v1';
export const PUBLIC_CUBE_RESULT: Readonly<CadInternalTesterFixture>;
export function isAllowedPreviewHostname(hostname: unknown): boolean;
export function inspectCadInternalTesterPreview(locationLike?: {
  hostname?: unknown;
  search?: unknown;
} | null): CadInternalTesterPreview;
export function getCadInternalTesterPreview(): CadInternalTesterPreview;
export function getCadCapabilitiesRequest(previewEnabled: boolean, apiBase: string): Readonly<{
  url: string;
  credentials: 'same-origin' | 'omit';
}>;
