// Interface implementation only. No provider SDK, credential, network or env access.
// A future concrete adapter requires independent policy/version/cancellation review.
const unavailable = async () => { throw new Error('PROVIDER_ADAPTER_UNBOUND'); };
function createProviderAdapter() {
  return Object.freeze({
    sourceOnly: true, configured: false, deployed: false,
    readAuthenticatedSession: unavailable,
    readAuthorization: unavailable,
  });
}
module.exports = { createProviderAdapter };
