export type CadNativeInternalUploadPreviewConfig =
  | {
      enabled: false;
      code:
        | 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_MISSING'
        | 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_INVALID';
      message: string;
    }
  | {
      enabled: true;
      code: 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_READY';
      url: string;
    };

export const CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_ENV: 'EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL';
export const CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PREVIEW: 'mark-dispenser-v1';
export const CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PHASE: 'input';
export function isAllowedCadNativeInternalUploadRenderUrl(value: unknown): boolean;
export function getCadNativeInternalUploadRenderConfig(
  env?: Record<string, string | undefined>,
): CadNativeInternalUploadPreviewConfig;
