// Test-only startup adapter. Production server entrypoints never import this file.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const token = 'synthetic-inventory-preflight-session-only';
const credentialRef = 'preflight-api-key';
const fixtureSecret = 'synthetic-inventory-preflight-secret-only';

async function startInventoryApiFixture({ apiPort = 0, fixturePort, mode = 'local' } = {}) {
  if (!['local', 'default', 'hosted'].includes(mode) || !Number.isInteger(fixturePort) || fixturePort < 1 || fixturePort > 65535) throw Error('Invalid fixture configuration');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'reversr-inventory-fixture-'));
  const storeFile = path.join(directory, 'commercial.json');
  const logs = [];
  // Deliberately no inherited environment, NODE_OPTIONS, dotenv or auth custody.
  const child = fork(__filename, [], { cwd: path.resolve(__dirname, '../..'), execArgv: [],
    env: { PATH: path.dirname(process.execPath), HOME: directory, EXPO_HOME: directory, TMPDIR: directory,
      NODE_ENV: 'test', INVENTORY_PREFLIGHT_TEST_HARNESS: 'synthetic-loopback-only',
      API_PORT: String(apiPort), INVENTORY_PREFLIGHT_FIXTURE_PORT: String(fixturePort),
      API_CORS_ORIGINS: 'https://reversr-rebuild.local', API_REQUEST_BODY_LIMIT: '25mb',
      ADMIN_API_TOKEN: 'synthetic-preflight-admin-only', INVENTORY_PRIVATE_NETWORK_ENABLED: 'false',
      INVENTORY_CONNECTOR_SECRETS_JSON: JSON.stringify({ [credentialRef]: { headerName: 'X-API-Key', value: fixtureSecret } }),
      COMMERCIAL_STORE_FILE: storeFile,
      ...(mode === 'default' ? {} : { COMMERCIAL_STORE_MODE: 'local' }),
      ...(mode === 'hosted' ? { VERCEL: '1' } : {}),
    }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const capture = chunk => { logs.push(String(chunk).trim()); if (logs.length > 20) logs.shift(); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  const close = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise(resolve => {
        child.once('exit', resolve); child.kill('SIGTERM');
        const timer = setTimeout(() => child.kill('SIGKILL'), 2000); timer.unref();
        child.once('exit', () => clearTimeout(timer));
      });
    }
    await fs.rm(directory, { recursive: true, force: true });
  };
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Fixture startup timed out')), 10000);
      const failed = () => { clearTimeout(timer); reject(Error(`Fixture startup failed: ${logs.join('\n')}`)); };
      child.once('error', failed); child.once('exit', failed);
      child.once('message', message => { clearTimeout(timer); child.removeListener('exit', failed); resolve(message.port); });
    });
    return { child, logs, directory, storeFile, port, base: `http://127.0.0.1:${port}`, close };
  } catch (error) { await close(); throw error; }
}

if (require.main === module) {
  if (!process.send || process.env.INVENTORY_PREFLIGHT_TEST_HARNESS !== 'synthetic-loopback-only') throw Error('Test harness must be launched by its isolated fixture helper');
  const net = require('node:net');
  const tls = require('node:tls');
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = typeof first === 'object' ? first : { port: first, host: args[1] };
    if (options.host !== '127.0.0.1' || Number(options.port) !== Number(process.env.INVENTORY_PREFLIGHT_FIXTURE_PORT)) throw Error('Fixture outbound connection denied');
    return connect.apply(this, args);
  };
  tls.connect = () => { throw Error('Fixture outbound TLS denied'); };
  const app = require('../../server/index');
  app.locals.commercialResolveIdentity = async req => req.get('authorization') === `Bearer ${token}`
    ? { issuer: 'synthetic-inventory-preflight', subject: 'synthetic-inventory-owner', emailVerified: false } : null;
  // Require the exact synthetic session at the fixture boundary, including
  // zero-cost legacy paths. This does not change production route admission.
  const server = require('node:http').createServer((req, res) => {
    if (req.url !== '/api/health' && req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Synthetic fixture session required' })); return;
    }
    app(req, res);
  });
  server.listen(Number(process.env.API_PORT), '127.0.0.1', () => process.send({ port: server.address().port }));
  process.once('SIGTERM', () => { server.closeAllConnections(); server.close(() => process.exit(0)); });
}

module.exports = { startInventoryApiFixture, token, credentialRef, fixtureSecret };
