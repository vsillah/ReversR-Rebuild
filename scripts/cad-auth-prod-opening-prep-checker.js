// Fixed public source reads only. No live execution mode or command card output.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { ROLLUP_SHA256, CLOSED_SOURCES, plainContractData, preparation, checkPreparation } =
  require('../offline/cad-auth-prod-opening-prep/preparation');
const { PACKET: PARENT, checkReadinessRollupPacket } = require('./cad-auth-upload-admission-readiness-rollup-checker');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-prod-opening-prep.json';
const SOURCES = Object.freeze([PARENT, ...Object.keys(CLOSED_SOURCES),
  'docs/cad-auth-prod-opening-prep.md', 'offline/cad-auth-prod-opening-prep/preparation.js',
  'scripts/cad-auth-prod-opening-prep-checker.js', 'scripts/cad-auth-prod-opening-prep.test.js']);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const parent = readSource(PARENT);
  if (sha(parent) !== ROLLUP_SHA256 || !checkReadinessRollupPacket(JSON.parse(parent), { readSource }).ok) {
    throw Error('ROLLUP_BINDING_INVALID');
  }
  for (const [file, digest] of Object.entries(CLOSED_SOURCES)) {
    if (sha(readSource(file)) !== digest) throw Error('CLOSED_RUNTIME_SOURCE_DRIFT');
  }
  return { ...preparation(), sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])) };
}
function checkPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try { ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet) && plainContractData(packet) && isDeepStrictEqual(packet, expectedPacket(readSource)); } catch { /* sanitized */ }
  return { ...checkPreparation(null), ok,
    code: ok ? 'SOURCE_ONLY_OPENING_PACKET_VALID' : 'INVALID_SOURCE_ONLY_OPENING_PACKET' };
}
if (require.main === module) {
  try {
    const mode = process.argv[2];
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify(checkPacket(null)));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
