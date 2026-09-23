// Interface implementation only: no credentials, SDK imports or provider calls.
const CONTRACT = Object.freeze({
  sourceOnly: true, configured: false, providerBound: false,
  methods: Object.freeze(['readAuthenticatedSession', 'readAuthorization']),
  requiredBindings: Object.freeze(['sourceCommit', 'deployedVersionRef', 'sdkPolicyDigest',
    'issuerAudienceAlgorithmPolicy', 'cacheInvalidationPolicyRef']),
  retries: 0, writes: 0, requestLocal: true,
});
function createProviderAdapter() {
  const unavailable = async () => { throw new Error('AUTH_UNAVAILABLE'); };
  return Object.freeze({ ...CONTRACT,
    readAuthenticatedSession: unavailable, readAuthorization: unavailable });
}
module.exports = { CONTRACT, createProviderAdapter };
