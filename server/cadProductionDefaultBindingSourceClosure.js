const { METHODS } = require('./cadLiveOpeningExecutableRuntimeWiring');
const {
  createCadProductionRuntimeInstallCurrentBinding,
} = require('./cadProductionRuntimeInstallCurrentBinding');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');

const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  'b082aeeff9b8e1a69e55ad45aa17a73d3fc8068fccd3ece247d8f31109a15b9b';
const CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256 =
  'aa411d79aefb67f24e1f0fa0225b9dc828f4491c856d2bb10327e5593d13e3f6';
const REVIEWED_MAIN_COMMIT =
  'd53d44776b3e66991ad027b4647e74f2ddae6163';
const REVIEWED_COMMAND_CARD_SHA256 =
  '20efd65f55d0599b77f51061135159a20c6752625dce4199eee4e333d7e1b718';
const REVIEWED_INSTALLATION_SHA256 =
  '107a09eacb4902c764309c799109aa9299eaaa58a4b4d1666b9b9be28553c87c';

const DEFAULT_PRODUCTION_BINDING_SOURCE_GATE = Object.freeze({
  schemaVersion: 1,
  sourceOnly: true,
  enabled: false,
  explicitLiveOpeningApproved: false,
  stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  currentDeploymentRuntimeInstallRefreshSha256:
    CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256,
  mainCommit: REVIEWED_MAIN_COMMIT,
  commandCardSha256: null,
  installationSha256: null,
  startUtc: null,
  expiresUtc: null,
});

const SHA = /^[a-f0-9]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function createClosedDefaultDurableAdapterService() {
  return Object.freeze(Object.fromEntries(METHODS.map(name => [name, async () => {
    throw Error('DEFAULT_PRODUCTION_BINDING_SOURCE_DISABLED');
  }])));
}

function validWindow(startUtc, expiresUtc) {
  if (!ISO.test(startUtc || '') || !ISO.test(expiresUtc || '')) return false;
  const start = Date.parse(startUtc);
  const expires = Date.parse(expiresUtc);
  return Number.isFinite(start) && Number.isFinite(expires)
    && expires > start
    && expires - start <= 30 * 60 * 1000;
}

function exactGate(gate) {
  return gate && typeof gate === 'object' && !Array.isArray(gate)
    && gate.schemaVersion === 1
    && gate.sourceOnly === true
    && gate.enabled === true
    && gate.explicitLiveOpeningApproved === true
    && gate.stoppedLiveOpeningDispositionSha256 === STOPPED_LIVE_OPENING_DISPOSITION_SHA256
    && gate.currentDeploymentRuntimeInstallRefreshSha256
      === CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256
    && gate.mainCommit === REVIEWED_MAIN_COMMIT
    && typeof gate.commandCardSha256 === 'string' && SHA.test(gate.commandCardSha256)
    && typeof gate.installationSha256 === 'string' && SHA.test(gate.installationSha256)
    && validWindow(gate.startUtc, gate.expiresUtc);
}

function createSourceOwnedDefaultProductionBindingInstallation({
  gate = DEFAULT_PRODUCTION_BINDING_SOURCE_GATE,
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  durableService = createClosedDefaultDurableAdapterService(),
} = {}) {
  try {
    if (!exactGate(gate)) return null;
    const prepared = createCadProductionRuntimeInstallCurrentBinding({
      deploymentMetadata,
      startUtc: gate.startUtc,
      expiresUtc: gate.expiresUtc,
      enabled: true,
      explicitLiveOpeningApproved: true,
      durableService,
    });
    if (!prepared || prepared.ok !== true) return null;
    const installation = prepared.installation;
    if (!installation
      || installation.manifest?.commandCardSha256 !== gate.commandCardSha256
      || installation.liveGate?.installationSha256 !== gate.installationSha256) {
      return null;
    }
    return installation;
  } catch {
    return null;
  }
}

module.exports = {
  CURRENT_DEPLOYMENT_RUNTIME_INSTALL_REFRESH_SHA256,
  DEFAULT_PRODUCTION_BINDING_SOURCE_GATE,
  REVIEWED_COMMAND_CARD_SHA256,
  REVIEWED_INSTALLATION_SHA256,
  REVIEWED_MAIN_COMMIT,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createSourceOwnedDefaultProductionBindingInstallation,
};
