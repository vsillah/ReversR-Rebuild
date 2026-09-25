// Public source-only checker. Never opens private source sets or receipt files.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PROVENANCE_PACKET, checkProjectionPacket } =
  require('./cad-auth-accepted-provenance-projection-checker');
const { PACKET: GENERATOR_PACKET, checkGeneratorPacket } =
  require('./cad-auth-restricted-source-set-generator-checker');
const {
  SOURCE_MERGE_COMMIT, coherentSourceSetProjection, checkCoherentSourceSetProjection,
} = require('../offline/cad-auth-coherent-source-set-projection/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-coherent-source-set-projection.json';
const SOURCES = Object.freeze([
  PROVENANCE_PACKET,
  GENERATOR_PACKET,
  'docs/cad-auth-coherent-source-set-projection.md',
  'offline/cad-auth-coherent-source-set-projection/preparation.js',
  'scripts/cad-auth-coherent-source-set-projection-checker.js',
  'scripts/cad-auth-coherent-source-set-projection.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const provenance = JSON.parse(readSource(PROVENANCE_PACKET));
  const generator = JSON.parse(readSource(GENERATOR_PACKET));
  if (!checkProjectionPacket(provenance, { readSource }).ok
    || !checkGeneratorPacket(generator, { readSource }).ok) throw Error('INVALID_PUBLIC_PARENT');
  const parentBinding = (packet, file) => ({
    packet: packet.packet, sha256: sha(readSource(file)), status: packet.status,
  });
  return {
    schemaVersion: 1,
    packet: 'cad-auth-coherent-restricted-source-set-projection-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTED_NO_PRIVATE_READS',
    parents: {
      acceptedProvenance: parentBinding(provenance, PROVENANCE_PACKET),
      sourceSetGenerator: parentBinding(generator, GENERATOR_PACKET),
    },
    preparation: coherentSourceSetProjection(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
  };
}

function checkCoherentProjectionPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkCoherentSourceSetProjection(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkCoherentSourceSetProjection(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTION_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTION_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_COHERENT_SOURCE_SET_PROJECTION_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkCoherentProjectionPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkCoherentSourceSetProjection(null), code: 'COHERENT_SOURCE_SET_PROJECTION_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkCoherentProjectionPacket };
