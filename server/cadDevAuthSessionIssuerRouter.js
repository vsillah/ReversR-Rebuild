const express = require('express');
const { createCadDevAuthSessionIssuerBridge } = require('./cadDevAuthSessionIssuerBridge');

const fallback = () => ({
  statusCode: 503,
  headers: { 'Cache-Control': 'no-store' },
  body: {
    schemaVersion: 1,
    status: 'error',
    code: 'USER_AUTH_UNAVAILABLE',
  },
});

function createCadDevAuthSessionIssuerRouter({ issuerBridge, issuerOptions } = {}) {
  const router = express.Router();
  const bridge = issuerBridge && typeof issuerBridge.issueSession === 'function'
    ? issuerBridge
    : createCadDevAuthSessionIssuerBridge(issuerOptions);

  router.all('/dev-upload-session', async (req, res) => {
    try {
      const envelope = await bridge.issueSession(req);
      const response = envelope && typeof envelope === 'object' ? envelope : fallback();
      const headers = response.headers && typeof response.headers === 'object' && !Array.isArray(response.headers)
        ? response.headers
        : fallback().headers;
      for (const [name, value] of Object.entries(headers)) {
        if (typeof name === 'string' && typeof value === 'string') res.set(name, value);
      }
      const statusCode = Number.isSafeInteger(response.statusCode) ? response.statusCode : 503;
      const body = response.body && typeof response.body === 'object' && !Array.isArray(response.body)
        ? response.body
        : fallback().body;
      return res.status(statusCode).json(body);
    } catch {
      const closed = fallback();
      return res.status(closed.statusCode).set(closed.headers).json(closed.body);
    }
  });

  return router;
}

module.exports = { createCadDevAuthSessionIssuerRouter };
