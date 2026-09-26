// Fixed public source reads only. No credentials, arbitrary paths or live mode.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-prod-runner-checker');
const { adapterContract } = require('../offline/cad-auth-prod-executable-runner/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-executable-runner.json';
const SOURCES = Object.freeze([parent.PACKET, ...parent.SOURCES,
  'offline/cad-auth-prod-executable-runner/preparation.js', 'docs/cad-auth-prod-executable-runner.md',
  'scripts/cad-auth-prod-executable-runner-checker.js', 'scripts/cad-auth-prod-executable-runner.test.js']);
const read = file => fs.readFileSync(path.join(ROOT, file));
function expectedPacket(readSource = read) {
  if (!parent.checkPacket(JSON.parse(readSource(parent.PACKET)), { readSource }).ok) throw Error('PREPARATION_INVALID');
  return { schemaVersion: 1, packet: 'cad-auth-prod-executable-runner-prerequisites-v1',
    baseCommit: '702f7ef9559b59679846cb7c6e92971e81f7f645',
    sourceOnly: true, enabled: false, runtimeMounted: false, liveExecutionReady: false,
    executableCommandCard: null, commandCardIssuanceAuthorized: false,
    implementation: 'pure-command-card-preparation-and-receipt-rehearsal',
    adapter: adapterContract(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, createHash('sha256').update(readSource(file)).digest('hex')])) };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = !!input && plainContractData(input) && isDeepStrictEqual(input, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ok, code: ok ? 'SOURCE_ONLY_RUNNER_VALID' : 'INVALID_SOURCE_ONLY_RUNNER',
    sourceOnly: true, enabled: false, liveExecutionReady: false, effectsExecuted: 0 };
}
if (require.main === module) {
  try {
    const mode = process.argv[2];
    if (process.argv.length > 3 || mode && !['--write'].includes(mode)) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const checked = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(checked));
    process.exitCode = checked.ok ? 0 : 1;
  } catch { console.log(JSON.stringify(checkPacket(null))); process.exitCode = 1; }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
