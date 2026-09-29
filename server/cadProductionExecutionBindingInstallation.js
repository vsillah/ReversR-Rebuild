// Reviewed source slots only. No loader, request handler, environment switch,
// provider initialization or command-card issuer belongs in this module.
const PRODUCTION_BINDING_INSTALLATION = Object.freeze({
  enabled: false,
  manifest: null,
  liveGate: null,
  durableAdapter: null,
});

module.exports = { PRODUCTION_BINDING_INSTALLATION };
