const CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_ENV = 'EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL';
const CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PREVIEW = 'mark-dispenser-v1';
const PRODUCTION_HOSTNAME = 'reversr.vercel.app';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function toUrl(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedCadNativeInternalUploadRenderUrl(value) {
  const parsed = toUrl(value);
  if (!parsed) return false;

  const hostname = parsed.hostname.toLowerCase();
  const isLocal = LOCAL_HOSTNAMES.has(hostname);
  const isNonProductionPreview = hostname.endsWith('.vercel.app') && hostname !== PRODUCTION_HOSTNAME;
  if (!isLocal && !isNonProductionPreview) return false;
  if (parsed.searchParams.get('cadPreview') !== CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PREVIEW) return false;
  return parsed.protocol === 'https:' || (isLocal && parsed.protocol === 'http:');
}

function getDefaultCadNativeInternalUploadRenderUrl() {
  return process.env.EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL;
}

function getCadNativeInternalUploadRenderConfig(env) {
  const rawUrl = env
    ? env[CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_ENV]
    : getDefaultCadNativeInternalUploadRenderUrl();
  if (!rawUrl) {
    return Object.freeze({
      enabled: false,
      code: 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_MISSING',
      message: 'Internal IGS preview is not configured for this app build.',
    });
  }

  if (!isAllowedCadNativeInternalUploadRenderUrl(rawUrl)) {
    return Object.freeze({
      enabled: false,
      code: 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_INVALID',
      message: 'Internal IGS preview is configured for an unapproved host or preview route.',
    });
  }

  return Object.freeze({
    enabled: true,
    code: 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_READY',
    url: rawUrl,
  });
}

module.exports = {
  CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_ENV,
  CAD_NATIVE_INTERNAL_UPLOAD_RENDER_PREVIEW,
  getCadNativeInternalUploadRenderConfig,
  getDefaultCadNativeInternalUploadRenderUrl,
  isAllowedCadNativeInternalUploadRenderUrl,
};
