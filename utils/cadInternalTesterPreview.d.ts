export type CadInternalTesterFixture = {
  fixtureName: string;
  sourceFileName: string;
  sourceAssetUrl: string;
  referenceImageUrl: string;
  referenceImages: readonly {
    label: string;
    url: string;
    sha256: string;
  }[];
  sourcePackage: string;
  sourceLicense: string;
  format: string;
  bytes: number;
  sha256: string;
  units: string;
  expectedDimensions: readonly [number, number, number];
  importedBoundingBox: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
    size: readonly [number, number, number];
  };
  meshes: number;
  vertices: number;
  triangles: number;
  sourceConfidence: string;
  previewGeometry: {
    kind: 'box';
    normalizedScale: readonly [number, number, number];
  } | {
    kind: 'stl';
    assetUrl: string;
    sha256: string;
  };
  warnings: readonly string[];
};

export type CadInternalTesterPreview =
  | { enabled: false; code: string }
  | {
      enabled: true;
      code: 'CAD_TEST_PREVIEW_PUBLIC_CUBE' | 'CAD_TEST_PREVIEW_MARK_DISPENSER' | 'CAD_TEST_PREVIEW_MARK_DISPENSER_DEFAULT';
      fixture: CadInternalTesterFixture;
    };

export const PREVIEW_QUERY_KEY: 'cadPreview';
export const PREVIEW_QUERY_VALUE: 'public-cube-v1';
export const DISPENSER_PREVIEW_QUERY_VALUE: 'mark-dispenser-v1';
export const PUBLIC_CUBE_RESULT: Readonly<CadInternalTesterFixture>;
export const MARK_DISPENSER_RESULT: Readonly<CadInternalTesterFixture>;
export function isAllowedPreviewHostname(hostname: unknown): boolean;
export function isNonProductionVercelPreview(hostname: unknown): boolean;
export function inspectCadInternalTesterPreview(locationLike?: {
  hostname?: unknown;
  search?: unknown;
} | null): CadInternalTesterPreview;
export function getCadInternalTesterPreview(): CadInternalTesterPreview;
export function getCadCapabilitiesRequest(previewEnabled: boolean, apiBase: string): Readonly<{
  url: string;
  credentials: 'same-origin' | 'omit';
}>;
