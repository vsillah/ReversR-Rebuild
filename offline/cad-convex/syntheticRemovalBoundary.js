// Source-only removal policy. No SDK calls, table deletion or retention override.
function createSyntheticRemovalBoundary({ testOnly, mode = 'pinned-sdk', sdkVersion = '0.0.95' } = {}) {
  if (testOnly !== true) throw Error('REMOVAL_UNAVAILABLE');
  const state = sdkVersion !== '0.0.95' ? 'SDK_REVIEW_REQUIRED'
    : mode === 'pinned-sdk' ? 'SUPPORTED_REMOVAL_MISSING'
      : mode === 'offline-fixture' ? 'FIXTURE_REMOVAL_ONLY' : 'REMOVAL_REVIEW_REQUIRED';
  const supported = state === 'FIXTURE_REMOVAL_ONLY';
  return Object.freeze({
    inspect: () => ({ state, supportedRemoval: supported, liveReady: false, retentionOverride: false }),
    requireProvisioning() { if (!supported) throw Error('REMOVAL_UNAVAILABLE'); },
    requireRemoval() { if (!supported) throw Error('REMOVAL_UNAVAILABLE'); },
  });
}
module.exports = { createSyntheticRemovalBoundary };
