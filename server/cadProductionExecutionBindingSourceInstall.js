const { createHash } = require('node:crypto');
const { METHODS, reviewExecutableCommandCardBinding } = require('./cadLiveOpeningExecutableRuntimeWiring');
const { PRODUCTION_BINDING_INSTALLATION } = require('./cadProductionExecutionBindingInstallation');
const {
  createSourceOwnedLiveOpeningExecutionArchitectureInstallation,
} = require('./cadLiveOpeningExecutionArchitectureClosure');
const {
  createSourceOwnedDefaultProductionBindingInstallation,
} = require('./cadProductionDefaultBindingSourceClosure');

const BOUNDED_SESSION_REF = 'rrb-ref:cad-upload-internal-mark-test-session-v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

// Source assembly is not proof of live approval or durable qualification.
// Runtime verification of approval, evidence and the immutable deployment is
// still required before the durable service claims the single run and attempt.
function resolveCadProductionExecutionBindingSource(
  installation = createSourceOwnedLiveOpeningExecutionArchitectureInstallation()
    || createSourceOwnedDefaultProductionBindingInstallation()
    || PRODUCTION_BINDING_INSTALLATION,
  now = Date.now,
) {
  try {
    if (!installation || installation.enabled !== true || typeof now !== 'function') return null;
    const { manifest, liveGate, durableAdapter } = installation;
    if (!manifest || manifest.schemaVersion !== 1 || !liveGate || !durableAdapter
      || liveGate.explicitLiveOpeningApproved !== true
      || manifest.boundedSessionRef !== BOUNDED_SESSION_REF
      || typeof manifest.durableServiceRef !== 'string' || !REF.test(manifest.durableServiceRef)
      || durableAdapter.serviceRef !== manifest.durableServiceRef
      || durableAdapter.evidenceSha256 !== manifest.durableEvidenceSha256) return null;
    const binding = reviewExecutableCommandCardBinding(manifest);
    if (!binding.bindingAccepted) return null;
    const card = binding.commandCard;
    if (manifest.sessionId !== card.sessionId
      || manifest.durableEvidenceSha256 !== card.durableEvidenceSha256) return null;
    // Stable projection includes literal bytes. No normalization, stale
    // deployment substitution or partial approval gate is accepted.
    const exact = Object.freeze({
      schemaVersion: 1,
      commandCardBytes: manifest.commandCardBytes,
      commandCardSha256: manifest.commandCardSha256,
      currentDeploymentReference: manifest.currentDeploymentReference,
      boundedSessionRef: manifest.boundedSessionRef,
      sessionId: manifest.sessionId,
      durableEvidenceSha256: manifest.durableEvidenceSha256,
      durableServiceRef: manifest.durableServiceRef,
      startUtc: card.openingWindow.startUtc,
      expiresUtc: card.openingWindow.expiresUtc,
    });
    if (liveGate.installationSha256 !== sha(JSON.stringify(exact))) return null;
    const stamp = now();
    if (!Number.isFinite(stamp) || stamp >= Date.parse(exact.expiresUtc)) return null;
    const service = durableAdapter.service;
    if (!service || METHODS.some(name => typeof service[name] !== 'function')) return null;
    const durableService = Object.freeze(Object.fromEntries(
      METHODS.map(name => [name, service[name].bind(service)]),
    ));
    return Object.freeze({ ...exact, enabled: true, durableService, now });
  } catch {
    return null;
  }
}

module.exports = { resolveCadProductionExecutionBindingSource };
