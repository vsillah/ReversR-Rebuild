const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { inspectDevelopmentConfigurationGate: inspect } = require('../offline/cad-convex/developmentConfigurationGate');
const packet = () => JSON.parse(fs.readFileSync(require.resolve('../offline/cad-convex/developmentConfigurationGate.json'), 'utf8'));
test('pending configuration packet is valid but never execution authority', () => {
  assert.deepEqual(inspect(packet()), { packetValid: true, executable: false,
    configurationAuthorized: false, uploadsEnabled: false, code: 'SOURCE_CONFIG_VALID_LIVE_BLOCKED' });
});
test('every changed leaf, unknown field and missing field fails closed without disclosure', () => {
  const paths = [];
  function visit(value, path = []) {
    if (value && typeof value === 'object') {
      paths.push([path, 'extra']);
      for (const key of Object.keys(value)) { paths.push([[...path, key], 'delete']); visit(value[key], [...path, key]); }
    } else paths.push([path, 'replace']);
  }
  visit(packet());
  for (const [path, action] of paths) {
    const p = packet();
    let parent = p;
    for (const key of path.slice(0, -1)) parent = parent[key];
    if (action === 'delete') delete parent[path.at(-1)];
    else if (action === 'replace') parent[path.at(-1)] = 'SECRET_SENTINEL';
    else { const value = path.length ? parent[path.at(-1)] : p; value.extra = 'SECRET_SENTINEL'; }
    const result = inspect(p);
    assert.equal(result.packetValid, false, path.join('.'));
    assert.equal(result.executable, false);
    assert.equal(result.configurationAuthorized, false);
    assert.equal(result.uploadsEnabled, false);
    assert.doesNotMatch(JSON.stringify(result), /SECRET_SENTINEL/);
  }
  for (const input of [null, [], true, {}, 'SECRET_SENTINEL']) assert.equal(inspect(input).packetValid, false);
  for (const gate of Object.keys(packet().gates)) { const p = packet(); p.gates[gate] = true; assert.equal(inspect(p).packetValid, false); }
  const p = packet(); p.auth.cohort.push('cad-test-one@auth-test.invalid'); assert.equal(inspect(p).packetValid, false);
});
test('inspector runs with no environment, network, filesystem or provider capability', () => {
  const source = fs.readFileSync(require.resolve('../offline/cad-convex/developmentConfigurationGate'), 'utf8');
  const sandbox = { module: { exports: {} } };
  for (const name of ['process', 'fetch', 'require', 'WebSocket']) Object.defineProperty(sandbox, name, {
    get() { throw new Error('FORBIDDEN_CAPABILITY'); },
  });
  vm.runInNewContext(source, sandbox);
  assert.equal(sandbox.module.exports.inspectDevelopmentConfigurationGate(packet()).packetValid, true);
});
