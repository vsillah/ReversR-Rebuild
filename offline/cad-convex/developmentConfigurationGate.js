// Offline structural guard only. No receipt ingestion or live authorization path.
const expected = {
  "version": 1,
  "mode": "source-only-config-gate",
  "baseCommit": "88ccc6f771823240816d0fd88f450dcff766d694",
  "executable": false,
  "destination": {
    "team": "vambah-sillah",
    "teamId": 405220,
    "project": "reversr-cad-auth-dev",
    "deployment": "majestic-alligator-31",
    "kind": "development",
    "clientOrigin": "https://majestic-alligator-31.convex.cloud",
    "issuerOrigin": "https://majestic-alligator-31.convex.site"
  },
  "auth": {
    "provider": "password",
    "applicationID": "convex",
    "siteUrl": "http://localhost:5001",
    "returnPaths": [
      "/"
    ],
    "cohort": [],
    "sourceGate": false
  },
  "environment": [
    {
      "name": "JWT_PRIVATE_KEY",
      "scope": "deployment-secret",
      "prior": null,
      "custody": null,
      "rollback": null
    },
    {
      "name": "JWKS",
      "scope": "deployment",
      "prior": null,
      "custody": null,
      "rollback": null
    },
    {
      "name": "SITE_URL",
      "scope": "deployment",
      "prior": null,
      "custody": null,
      "rollback": null
    }
  ],
  "gates": {
    "U": false,
    "K": false,
    "S": false,
    "P": false,
    "E": false,
    "D": false,
    "T": false,
    "C": false
  },
  "effects": {
    "uploads": false,
    "conversion": false,
    "sandbox": false,
    "privateCad": false,
    "production": false,
    "providerMutation": false,
    "secretGeneration": false,
    "envMutation": false,
    "deployment": false,
    "liveTest": false,
    "cleanup": false
  },
  "evidence": {
    "destinationObservation": null,
    "immutableProjectId": null,
    "immutableDeploymentId": null,
    "operator": null,
    "backup": null,
    "providerDecision": null,
    "emptyAuthHistory": null,
    "cohortProvisioning": null,
    "generatorReview": null,
    "vaultCustody": null,
    "rowManifest": null,
    "diagnosticReview": null,
    "budgetEnforcement": null,
    "usageBaseline": null,
    "disabledRollback": null,
    "schemaCompatibility": null,
    "serviceTransport": null,
    "userContextBinding": null,
    "durableRunReceipt": null,
    "deploymentCommand": null,
    "testCommand": null,
    "cleanupCommand": null,
    "expiryUtc": null
  }
};
function matches(value, contract) {
  if (contract === null || typeof contract !== 'object') return value === contract;
  if (value === null || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(contract)) return false;
  const keys = Object.keys(contract);
  return Object.keys(value).length === keys.length && keys.every(key =>
    Object.hasOwn(value, key) && matches(value[key], contract[key]));
}
function inspectDevelopmentConfigurationGate(packet) {
  let valid = false;
  try { valid = matches(packet, expected); } catch { /* Return no input or exception detail. */ }
  return Object.freeze({ packetValid: valid, executable: false, configurationAuthorized: false,
    uploadsEnabled: false, code: valid ? 'SOURCE_CONFIG_VALID_LIVE_BLOCKED' : 'SOURCE_CONFIG_INVALID' });
}
module.exports = { inspectDevelopmentConfigurationGate };
