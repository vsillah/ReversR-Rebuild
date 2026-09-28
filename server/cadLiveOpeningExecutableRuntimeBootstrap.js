const { createCadLiveOpeningExecutableRuntimeWiring } = require('./cadLiveOpeningExecutableRuntimeWiring');

const valueOrFallback = (value, fallback) => (value === undefined ? fallback : value);

function createCadLiveOpeningExecutableRuntimeBootstrap({
  baseRuntimeMount,
  executableRuntime,
  enabled,
  commandCardBytes,
  commandCardSha256,
  currentDeploymentReference,
  adapter,
  now,
} = {}) {
  const runtime = executableRuntime && typeof executableRuntime === 'object'
    && !Array.isArray(executableRuntime) ? executableRuntime : {};
  return createCadLiveOpeningExecutableRuntimeWiring({
    baseRuntimeMount,
    enabled: valueOrFallback(runtime.enabled, enabled),
    commandCardBytes: valueOrFallback(runtime.commandCardBytes, commandCardBytes),
    commandCardSha256: valueOrFallback(runtime.commandCardSha256, commandCardSha256),
    currentDeploymentReference: valueOrFallback(runtime.currentDeploymentReference, currentDeploymentReference),
    adapter: valueOrFallback(runtime.adapter, adapter),
    now: valueOrFallback(runtime.now, now),
  });
}

module.exports = { createCadLiveOpeningExecutableRuntimeBootstrap };
