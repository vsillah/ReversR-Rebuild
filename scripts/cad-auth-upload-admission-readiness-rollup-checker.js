// Checks only the public source-only upload-admission readiness rollup packet.
// Never reads private receipts, source-set files, secrets, or runtime configuration.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: PARENT_PACKET, checkSourceSetProjectionPacket } =
  require('./cad-auth-restricted-source-set-projection-checker');
const {
  SOURCE_MERGE_COMMIT,
  uploadAdmissionReadinessRollup,
  checkUploadAdmissionReadinessRollup,
} = require('../offline/cad-auth-upload-admission-readiness-rollup/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-upload-admission-readiness-rollup.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-upload-admission-readiness-rollup.md',
  'offline/cad-auth-upload-admission-readiness-rollup/preparation.js',
  'scripts/cad-auth-upload-admission-readiness-rollup-checker.js',
  'scripts/cad-auth-upload-admission-readiness-rollup.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(PARENT_PACKET));
  if (!checkSourceSetProjectionPacket(parent, { readSource }).ok) {
    throw Error('INVALID_RESTRICTED_SOURCE_SET_PROJECTION_PARENT');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-production-upload-admission-readiness-rollup-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP_NO_PRIVATE_READS',
    parent: {
      packet: parent.packet,
      sha256: sha(readSource(PARENT_PACKET)),
      sourceMergeCommit: SOURCE_MERGE_COMMIT,
      status: parent.status,
    },
    preparation: uploadAdmissionReadinessRollup(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: SOURCE_MERGE_COMMIT,
  };
}

function checkReadinessRollupPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkUploadAdmissionReadinessRollup(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkUploadAdmissionReadinessRollup(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_UPLOAD_ADMISSION_READINESS_ROLLUP_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || mode && mode !== '--write') throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkReadinessRollupPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkUploadAdmissionReadinessRollup(null),
      code: 'UPLOAD_ADMISSION_READINESS_ROLLUP_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkReadinessRollupPacket };
