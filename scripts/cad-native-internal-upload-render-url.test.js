const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  getCadNativeInternalUploadRenderConfig,
  isAllowedCadNativeInternalUploadRenderUrl,
} = require('../utils/cadNativeInternalUploadPreview');

describe('native internal CAD upload-render target guard', () => {
  it('allows only local development and non-production Vercel previews with the Mark dispenser preview route', () => {
    assert.equal(
      isAllowedCadNativeInternalUploadRenderUrl('https://reversr-git-codex-cad-internal-upload-4c2f6d-vsillahs-projects.vercel.app/?cadPreview=mark-dispenser-v1'),
      true,
    );
    assert.equal(
      isAllowedCadNativeInternalUploadRenderUrl('http://127.0.0.1:5227/?cadPreview=mark-dispenser-v1'),
      true,
    );
    assert.equal(
      isAllowedCadNativeInternalUploadRenderUrl('https://reversr.vercel.app/?cadPreview=mark-dispenser-v1'),
      false,
    );
    assert.equal(
      isAllowedCadNativeInternalUploadRenderUrl('https://reversr-git-codex-cad-internal-upload-4c2f6d-vsillahs-projects.vercel.app/'),
      false,
    );
  });

  it('fails closed when the internal preview URL is missing or points at production', () => {
    assert.deepEqual(getCadNativeInternalUploadRenderConfig({}), {
      enabled: false,
      code: 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_MISSING',
      message: 'Internal IGS preview is not configured for this app build.',
    });
    assert.equal(getCadNativeInternalUploadRenderConfig({
      EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL: 'https://reversr.vercel.app/?cadPreview=mark-dispenser-v1',
    }).code, 'CAD_NATIVE_INTERNAL_UPLOAD_RENDER_URL_INVALID');
    assert.equal(getCadNativeInternalUploadRenderConfig({
      EXPO_PUBLIC_CAD_INTERNAL_UPLOAD_RENDER_URL: 'https://reversr-git-codex-cad-internal-upload-4c2f6d-vsillahs-projects.vercel.app/?cadPreview=mark-dispenser-v1',
    }).enabled, true);
  });
});
