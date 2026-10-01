// Explicit source helper for later live gates. It accepts only allowlisted,
// non-secret Vercel system deployment metadata and is not used by defaults.
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]{16,96}$/;
const SHA40 = /^[a-f0-9]{40}$/;
const HOST = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;
const DEPLOYMENT_HOST = /^reversr-[a-z0-9]+-vsillahs-projects\.vercel\.app$/;
const DERIVED_REFERENCE_PREFIX = 'vercel-target';

const EXPECTED_GIT_OWNER = 'vsillah';
const EXPECTED_GIT_REPO = 'ReversR-Rebuild';
const EXPECTED_GIT_REF = 'main';
const EXPECTED_PROJECT_PRODUCTION_HOST = 'reversr.vercel.app';

function normalizeHost(value) {
  if (typeof value !== 'string') return null;
  const host = value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return HOST.test(host) ? host : null;
}

function createDerivedDeploymentReference(deploymentHost, gitCommitSha) {
  if (!deploymentHost || !SHA40.test(gitCommitSha)) return null;
  return `${DERIVED_REFERENCE_PREFIX}:${deploymentHost.toLowerCase()}@${gitCommitSha}`;
}

function readCadProductionCurrentDeploymentMetadata(env = process.env) {
  const deploymentId = typeof env.VERCEL_DEPLOYMENT_ID === 'string'
    ? env.VERCEL_DEPLOYMENT_ID.trim()
    : '';
  const deploymentHost = normalizeHost(env.VERCEL_URL);
  const productionHost = normalizeHost(env.VERCEL_PROJECT_PRODUCTION_URL);
  const gitCommitSha = typeof env.VERCEL_GIT_COMMIT_SHA === 'string'
    ? env.VERCEL_GIT_COMMIT_SHA.trim()
    : '';
  const gitCommitRef = typeof env.VERCEL_GIT_COMMIT_REF === 'string'
    ? env.VERCEL_GIT_COMMIT_REF.trim()
    : '';
  const gitRepo = typeof env.VERCEL_GIT_REPO_SLUG === 'string'
    ? env.VERCEL_GIT_REPO_SLUG.trim()
    : '';
  const gitOwner = typeof env.VERCEL_GIT_REPO_OWNER === 'string'
    ? env.VERCEL_GIT_REPO_OWNER.trim()
    : '';
  const vercelEnv = typeof env.VERCEL_ENV === 'string' ? env.VERCEL_ENV.trim() : '';
  if ((deploymentId && !DEPLOYMENT_ID.test(deploymentId))
    || !deploymentHost
    || !DEPLOYMENT_HOST.test(deploymentHost)
    || productionHost !== EXPECTED_PROJECT_PRODUCTION_HOST
    || !SHA40.test(gitCommitSha)
    || gitCommitRef !== EXPECTED_GIT_REF
    || gitRepo !== EXPECTED_GIT_REPO
    || gitOwner !== EXPECTED_GIT_OWNER
    || vercelEnv !== 'production') {
    return null;
  }
  const deploymentReference = DEPLOYMENT_ID.test(deploymentId)
    ? deploymentId
    : createDerivedDeploymentReference(deploymentHost, gitCommitSha);
  if (!deploymentReference) return null;
  return Object.freeze({
    schemaVersion: 1,
    source: 'vercel-system-environment',
    deploymentReference,
    deploymentTarget: `https://${deploymentHost}`,
    projectProductionTarget: `https://${productionHost}`,
    gitCommitSha,
    gitCommitRef,
    gitRepo,
    gitOwner,
    vercelEnv,
    secretBearing: false,
  });
}

module.exports = {
  EXPECTED_GIT_OWNER,
  EXPECTED_GIT_REPO,
  EXPECTED_GIT_REF,
  EXPECTED_PROJECT_PRODUCTION_HOST,
  createDerivedDeploymentReference,
  readCadProductionCurrentDeploymentMetadata,
};
