const { createCadLiveOpeningExecutableRuntimeWiring } = require('./cadLiveOpeningExecutableRuntimeWiring');

function createCadLiveOpeningExecutableRuntimeBootstrap({ baseRuntimeMount } = {}) {
  return createCadLiveOpeningExecutableRuntimeWiring({ baseRuntimeMount });
}

module.exports = { createCadLiveOpeningExecutableRuntimeBootstrap };
