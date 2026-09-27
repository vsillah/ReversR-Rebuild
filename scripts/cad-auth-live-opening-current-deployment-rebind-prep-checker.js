// Reads fixed public source artifacts only. Never checks a live deployment or issues a card.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parent = require('./cad-auth-live-opening-runtime-mount-prep-checker');
const prep = require('../offline/cad-auth-live-opening-current-deployment-rebind-prep/preparation');
const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-current-deployment-rebind-prep.json';
const PRIOR = 'docs/cad-auth-live-opening-command-card-digest-prep.json';
const SOURCES = Object.freeze([
  parent.PACKET, PRIOR,
  'docs/cad-auth-live-opening-current-deployment-rebind-prep.md',
  'offline/cad-auth-live-opening-current-deployment-rebind-prep/preparation.js',
  'offline/cad-auth-live-opening-command-card-digest-prep/preparation.js',
  'scripts/cad-auth-live-opening-current-deployment-rebind-prep-checker.js',
  'scripts/cad-auth-live-opening-current-deployment-rebind-prep.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function expectedPacket(readSource = read) {
  const mount = readSource(parent.PACKET);
  if (sha(mount) !== prep.MOUNT_SHA256 || sha(readSource(PRIOR)) !== prep.PRIOR_SHA256
      || !parent.checkRuntimeMountPrepPacket(JSON.parse(mount), { readSource }).ok) throw Error('PARENT_BINDING_INVALID');
  return {
    schemaVersion: 1,
    sourceOnly: true,
    preparation: prep.preparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
  };
}
function checkPacket(input, { readSource = read } = {}) {
  let ok = false;
  try { ok = plainContractData(input) && input !== null && typeof input === 'object' && !Array.isArray(input)
    && isDeepStrictEqual(input, expectedPacket(readSource)) && prep.checkPreparation(input.preparation).ok;
  } catch { /* sanitized */ }
  return { ...prep.checkPreparation(null), ok, sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_REBIND_PACKET_VALID' : 'SOURCE_ONLY_REBIND_PACKET_BLOCKED' };
}
if (require.main === module) {
  try {
    const mode = process.argv[2];
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    const result = checkPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ...prep.checkPreparation(null), sourceBindingValid: false }));
    process.exitCode = 1;
  }
}
module.exports = { PACKET, SOURCES, expectedPacket, checkPacket };
