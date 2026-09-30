// Disabled-by-default composition for a later live gate. It prepares an exact
// installable binding from reviewed source and current deployment metadata, but
// production defaults never call this module.
const {
  BOUNDED_SESSION_REF,
  DURABLE_SERVICE_REF,
  createClosedDurableAdapterService,
  createPendingExecutableCommandCard,
  createProductionBindingInstallation,
} = require('./cadProductionExecutionBindingInstallation');
const {
  readCadProductionCurrentDeploymentMetadata,
} = require('./cadProductionCurrentDeploymentMetadata');

const DURABLE_EVIDENCE_SHA256 =
  '8d371999f3efa3f090ae84fd6e88e8a912a6e69170c7e79672a96378bc15eaa7';
const APPROVED_REFRESH_SHA256 =
  '763069e9536e5239307c7785c482316569cdc21054060565b20a52369077da76';
const RUNTIME_INSTALL_ENABLEMENT_PACKET_SHA256 =
  '17127be86910f4148f2140ba549abfdd2b9e984b5af2993d9934f5228ea2ed2f';
const RUNTIME_INSTALL_ENABLEMENT_SOURCE_COMMIT =
  '64397c62c0e4bd4c2a320c23165692c22559e8f5';
const RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT =
  '9d8b18a0ef4e1ceb0b1ce0509ad67feabb1ae5f5';
const SESSION_EVIDENCE_SOURCE_RECORD_SHA256 =
  '81178504968fffa01d265b9b9541dda78935133f71f174bf0d667a79a5ca8ce5';
const SCHEMA_REBIND_PACKET_SHA256 =
  '05682b6e4ede9e8f8c45008e3538d9ee95f9962f23ad999241b0569a3e744143';
const STOPPED_LIVE_OPENING_DISPOSITION_SHA256 =
  '7320eb5443265dee745e84a936486ae0ca01fbafeded09875c5a960723ba7003';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function validWindow(startUtc, expiresUtc) {
  if (!ISO.test(startUtc || '') || !ISO.test(expiresUtc || '')) return false;
  const start = Date.parse(startUtc);
  const expires = Date.parse(expiresUtc);
  return Number.isFinite(start) && Number.isFinite(expires)
    && expires > start
    && expires - start <= 30 * 60 * 1000;
}

function createCadProductionRuntimeInstallCurrentBinding({
  deploymentMetadata = readCadProductionCurrentDeploymentMetadata(),
  startUtc,
  expiresUtc,
  enabled = false,
  explicitLiveOpeningApproved = false,
  durableService = createClosedDurableAdapterService(),
} = {}) {
  if (!deploymentMetadata || deploymentMetadata.schemaVersion !== 1
    || deploymentMetadata.source !== 'vercel-system-environment'
    || deploymentMetadata.secretBearing !== false
    || !validWindow(startUtc, expiresUtc)) {
    return Object.freeze({ ok: false, code: 'CURRENT_DEPLOYMENT_BINDING_INPUTS_UNRESOLVED' });
  }
  const commandCard = createPendingExecutableCommandCard({
    productionDeploymentReference: deploymentMetadata.deploymentReference,
    sessionId: BOUNDED_SESSION_REF,
    durableEvidenceSha256: DURABLE_EVIDENCE_SHA256,
    startUtc,
    expiresUtc,
  });
  const installation = createProductionBindingInstallation({
    enabled,
    explicitLiveOpeningApproved,
    commandCard,
    durableServiceRef: DURABLE_SERVICE_REF,
    durableService,
  });
  return Object.freeze({
    ok: true,
    code: 'CURRENT_DEPLOYMENT_BINDING_SOURCE_READY_DEFAULT_CLOSED',
    deploymentMetadata,
    installation,
    sourceBindings: Object.freeze({
      approvedRefreshSha256: APPROVED_REFRESH_SHA256,
      runtimeInstallEnablementPacketSha256: RUNTIME_INSTALL_ENABLEMENT_PACKET_SHA256,
      runtimeInstallEnablementSourceCommit: RUNTIME_INSTALL_ENABLEMENT_SOURCE_COMMIT,
      runtimeInstallEnablementMergeCommit: RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT,
      stoppedLiveOpeningDispositionSha256: STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
      schemaRebindPacketSha256: SCHEMA_REBIND_PACKET_SHA256,
      sessionEvidenceSourceRecordSha256: SESSION_EVIDENCE_SOURCE_RECORD_SHA256,
      durableEvidenceSha256: DURABLE_EVIDENCE_SHA256,
      boundedSessionRef: BOUNDED_SESSION_REF,
      durableServiceRef: DURABLE_SERVICE_REF,
    }),
  });
}

module.exports = {
  APPROVED_REFRESH_SHA256,
  DURABLE_EVIDENCE_SHA256,
  RUNTIME_INSTALL_ENABLEMENT_MERGE_COMMIT,
  RUNTIME_INSTALL_ENABLEMENT_PACKET_SHA256,
  RUNTIME_INSTALL_ENABLEMENT_SOURCE_COMMIT,
  SCHEMA_REBIND_PACKET_SHA256,
  SESSION_EVIDENCE_SOURCE_RECORD_SHA256,
  STOPPED_LIVE_OPENING_DISPOSITION_SHA256,
  createCadProductionRuntimeInstallCurrentBinding,
};
