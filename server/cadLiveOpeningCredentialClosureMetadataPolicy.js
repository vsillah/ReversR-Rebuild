// Only public, server-owned Vercel system metadata is eligible. No provider
// calls, secret reads, request overrides, aliases, or GitHub-ID fallback.
const CURRENT_DEPLOYMENT_METADATA_POLICY = Object.freeze({
  policyRef: 'rrb-ref:cad-auth-credential-closure-current-deployment-metadata-v1',
  source: 'vercel-system-environment',
  deploymentReferenceFormat: 'vercel-immutable-dpl-id',
  gitOwner: 'vsillah',
  gitRepo: 'ReversR-Rebuild',
  gitCommitRef: 'main',
  vercelEnv: 'production',
  projectProductionTarget: 'https://reversr.vercel.app',
  githubDeploymentIdIsProvenanceOnly: true,
  requestMetadataAllowed: false,
  metadataGrantsLiveAuthority: false,
  liveDeploymentRecheckRequired: true,
});

const KEYS = Object.freeze(['schemaVersion', 'source', 'deploymentReference',
  'deploymentTarget', 'projectProductionTarget', 'gitCommitSha', 'gitCommitRef',
  'gitRepo', 'gitOwner', 'vercelEnv', 'secretBearing']);

function validCurrentDeploymentMetadata(metadata) {
  return !!metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    && Object.keys(metadata).length === KEYS.length
    && Object.keys(metadata).every(key => KEYS.includes(key))
    && metadata.schemaVersion === 1
    && metadata.source === CURRENT_DEPLOYMENT_METADATA_POLICY.source
    && metadata.secretBearing === false
    && typeof metadata.deploymentReference === 'string'
    && /^dpl_[A-Za-z0-9]{16,96}$/.test(metadata.deploymentReference)
    && typeof metadata.deploymentTarget === 'string'
    && /^https:\/\/reversr-[a-z0-9]+-vsillahs-projects\.vercel\.app$/.test(metadata.deploymentTarget)
    && typeof metadata.gitCommitSha === 'string'
    && /^[a-f0-9]{40}$/.test(metadata.gitCommitSha)
    && ['gitOwner', 'gitRepo', 'gitCommitRef', 'vercelEnv', 'projectProductionTarget']
      .every(key => metadata[key] === CURRENT_DEPLOYMENT_METADATA_POLICY[key]);
}

module.exports = { CURRENT_DEPLOYMENT_METADATA_POLICY, validCurrentDeploymentMetadata };
