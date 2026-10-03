const { createCadLiveOpeningExecutableRuntimeBootstrap } = require('./cadLiveOpeningExecutableRuntimeBootstrap');
const {
  createCadControlledInternalUploadActivationMount,
} = require('./cadControlledInternalUploadActivation');
const { createCadUserUploadRouter } = require('./cadUserUploadRouter');

function composeControlledRuntimeMount({ baseRuntimeMount, controlledRuntimeMount } = {}) {
  let activeBodyGate = null;
  const baseSwitch = baseRuntimeMount?.admissionSwitch;
  const baseGate = baseRuntimeMount?.routeBodyGate;
  const controlledSwitch = controlledRuntimeMount?.admissionSwitch;
  const controlledGate = controlledRuntimeMount?.routeBodyGate;
  return Object.freeze({
    ...(baseRuntimeMount || {}),
    controlledInternalUploadActivationMounted:
      controlledRuntimeMount?.controlledInternalUploadActivationMounted === true,
    controlledInternalUploadActivationDefaultClosed:
      controlledRuntimeMount?.defaultClosed === true,
    controlledInternalUploadActivationEnabled:
      controlledRuntimeMount?.enabled === true,
    controlledInternalUploadActivationBinding:
      controlledRuntimeMount?.binding || null,
    admissionSwitch: Object.freeze({
      async decide(input = {}) {
        const controlledDecision = controlledSwitch?.decide
          ? await controlledSwitch.decide(input)
          : null;
        if (controlledDecision?.bodyReadAuthorized === true) return controlledDecision;
        if (baseSwitch?.decide) return baseSwitch.decide(input);
        return controlledDecision;
      },
    }),
    routeBodyGate: Object.freeze({
      async authorizeBodyRead(input = {}) {
        if (/^CONTROLLED_UPLOAD_/.test(input.admissionDecision?.code || '')) {
          const decision = controlledGate?.authorizeBodyRead
            ? await controlledGate.authorizeBodyRead(input)
            : null;
          if (decision?.bodyReadAuthorized === true) activeBodyGate = controlledGate;
          return decision;
        }
        const decision = baseGate?.authorizeBodyRead
          ? await baseGate.authorizeBodyRead(input)
          : null;
        if (decision?.bodyReadAuthorized === true) activeBodyGate = baseGate;
        return decision;
      },
      async afterBodyAdmission(input = {}) {
        const gate = activeBodyGate;
        activeBodyGate = null;
        if (gate?.afterBodyAdmission) return gate.afterBodyAdmission(input);
        return null;
      },
    }),
  });
}

function createCadProductionExecutableRuntimeMount({
  corsOrigins = [],
  sessionService,
  executableRuntime,
  liveOpeningRuntimeMount,
  controlledInternalUploadActivation = {},
  controlledInternalUploadActivationMount,
  bootstrap = createCadLiveOpeningExecutableRuntimeBootstrap,
  createControlledMount = createCadControlledInternalUploadActivationMount,
  createRouter = createCadUserUploadRouter,
} = {}) {
  const baseRuntimeMount = liveOpeningRuntimeMount || bootstrap({ executableRuntime });
  const controlledRuntimeMount = typeof controlledInternalUploadActivationMount === 'function'
    ? controlledInternalUploadActivationMount({ baseRuntimeMount })
    : controlledInternalUploadActivationMount || createControlledMount({
      ...controlledInternalUploadActivation,
      baseRuntimeMount,
    });
  const productionRuntimeMount = composeControlledRuntimeMount({
    baseRuntimeMount,
    controlledRuntimeMount,
  });
  return createRouter({
    corsOrigins,
    sessionService,
    liveOpeningRuntimeMount: productionRuntimeMount,
  });
}

module.exports = {
  composeControlledRuntimeMount,
  createCadProductionExecutableRuntimeMount,
};
