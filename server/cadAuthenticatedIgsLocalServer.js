const express = require('express');
const { createCadAuthenticatedIgsRuntime }
  = require('./cadAuthenticatedIgsRouter');
const { createCadAuthenticatedIgsPreflight }
  = require('./cadAuthenticatedIgsCors');

function createCadAuthenticatedIgsLocalApp({ env = process.env, app, runtime } = {}) {
  const downstream = app || require('./index');
  const resolvedRuntime = runtime || createCadAuthenticatedIgsRuntime({ env });
  const wrapper = express();
  wrapper.use('/api/cad', createCadAuthenticatedIgsPreflight({
    configured: resolvedRuntime?.configured === true,
    allowedOrigins: resolvedRuntime?.configured === true ? resolvedRuntime.allowedOrigins : [],
  }));
  wrapper.use(downstream);
  return wrapper;
}

if (require.main === module) {
  const port = Number(process.env.API_PORT || 3001);
  createCadAuthenticatedIgsLocalApp().listen(port, '0.0.0.0', () => {
    process.stdout.write(`ReversR API listening on port ${port}\n`);
  });
}

module.exports = { createCadAuthenticatedIgsLocalApp };
