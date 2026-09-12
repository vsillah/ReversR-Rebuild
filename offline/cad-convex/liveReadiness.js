// Pure local packet inspection. No env, credentials, SDK, network or live authority.
const target = Object.freeze({ team: 'vambah-sillah', teamId: '405220',
  project: 'reversr-cad-auth-dev', deployment: 'majestic-alligator-31', type: 'development',
  clientOrigin: 'https://majestic-alligator-31.convex.cloud',
  issuerOrigin: 'https://majestic-alligator-31.convex.site' });
const scopes = Object.freeze({ JWT_PRIVATE_KEY: 'deployment-secret', JWKS: 'deployment',
  CONVEX_SITE_URL: 'platform-owned', SITE_URL: 'requirement-unresolved' });
function exactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function origin(value) {
  if (value === null) return true; // Missing values are blockers, never defaults.
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password
      && (url.protocol === 'https:' && /^[a-z0-9-]+\.invalid$/.test(url.hostname)
        || url.protocol === 'http:' && url.hostname === '127.0.0.1' && !!url.port);
  } catch { return false; }
}
function route(value) {
  return value === null || typeof value === 'string' && /^\/[a-zA-Z0-9/_-]*$/.test(value)
    && !value.startsWith('//');
}
function inspectLiveReadiness(packet) {
  let valid = false;
  try {
    valid = exactKeys(packet, ['version', 'mode', 'target', 'method', 'applicationId',
      'appOrigin', 'returnPath', 'logoutPath', 'providerCallback', 'environment', 'gates'])
      && packet.version === 1 && packet.mode === 'source-only'
      && exactKeys(packet.target, Object.keys(target))
      && Object.entries(target).every(([key, value]) => packet.target[key] === value)
      && packet.method === 'password' && packet.applicationId === 'convex'
      && packet.providerCallback === 'N/A: Password has no external OAuth callback'
      && origin(packet.appOrigin) && route(packet.returnPath) && route(packet.logoutPath)
      && Array.isArray(packet.environment) && packet.environment.length === 4
      && new Set(packet.environment.map(row => row.name)).size === 4
      && packet.environment.every(row => exactKeys(row, ['name', 'scope', 'status'])
        && Object.hasOwn(scopes, row.name) && scopes[row.name] === row.scope && row.status === 'pending')
      && exactKeys(packet.gates, ['environment', 'deployment', 'liveTest', 'uploads'])
      && Object.values(packet.gates).every(value => value === false);
  } catch { /* Never echo untrusted input, including accidental secret values. */ }
  return Object.freeze({ code: valid ? 'SOURCE_PACKET_VALID_LIVE_BLOCKED' : 'SOURCE_PACKET_INVALID',
    packetValid: Boolean(valid), liveAuthReady: false, uploadsEnabled: false });
}
module.exports = { inspectLiveReadiness };
