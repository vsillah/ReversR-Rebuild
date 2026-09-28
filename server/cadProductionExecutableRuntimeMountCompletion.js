const { createCadLiveOpeningExecutableRuntimeBootstrap } = require('./cadLiveOpeningExecutableRuntimeBootstrap');
const { createCadUserUploadRouter } = require('./cadUserUploadRouter');

function createCadProductionExecutableRuntimeMount({
  corsOrigins = [],
  sessionService,
  executableRuntime,
  bootstrap = createCadLiveOpeningExecutableRuntimeBootstrap,
  createRouter = createCadUserUploadRouter,
} = {}) {
  const liveOpeningRuntimeMount = bootstrap({ executableRuntime });
  return createRouter({
    corsOrigins,
    sessionService,
    liveOpeningRuntimeMount,
  });
}

module.exports = { createCadProductionExecutableRuntimeMount };
