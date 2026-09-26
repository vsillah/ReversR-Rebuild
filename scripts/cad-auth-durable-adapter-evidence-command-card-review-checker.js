// Checks only public source-only durable adapter evidence review files.
// Never reads private receipts, secrets, runtime configuration or upload bodies.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parentDurable = require('./cad-auth-prod-durable-runner-adapter-prep-checker');
const uploadRollup = require('./cad-auth-upload-admission-readiness-rollup-checker');
const {
  SOURCE_COMMIT,
  durableEvidenceCommandCardReview,
  checkDurableEvidenceCommandCardReview,
} = require('../offline/cad-auth-durable-adapter-evidence-command-card-review/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-durable-adapter-evidence-command-card-review.json';
const SOURCES = Object.freeze([
  parentDurable.PACKET,
  uploadRollup.PACKET,
  'docs/cad-auth-durable-adapter-evidence-command-card-review.md',
  'offline/cad-auth-durable-adapter-evidence-command-card-review/preparation.js',
  'scripts/cad-auth-durable-adapter-evidence-command-card-review-checker.js',
  'scripts/cad-auth-durable-adapter-evidence-command-card-review.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const durable = JSON.parse(readSource(parentDurable.PACKET));
  if (!parentDurable.checkPacket(durable, { readSource }).ok) {
    throw Error('INVALID_DURABLE_ADAPTER_PARENT_PACKET');
  }
  const rollup = JSON.parse(readSource(uploadRollup.PACKET));
  if (!uploadRollup.checkReadinessRollupPacket(rollup, { readSource }).ok) {
    throw Error('INVALID_UPLOAD_READINESS_ROLLUP_PARENT_PACKET');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-durable-adapter-evidence-command-card-review-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_NO_RUNTIME_EFFECTS',
    parent: {
      durableAdapterPacket: {
        path: parentDurable.PACKET,
        sha256: sha(readSource(parentDurable.PACKET)),
        status: durable.status || durable.packet,
      },
      uploadAdmissionReadinessRollup: {
        path: uploadRollup.PACKET,
        sha256: sha(readSource(uploadRollup.PACKET)),
        status: rollup.status,
      },
    },
    preparation: durableEvidenceCommandCardReview(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceCommit: SOURCE_COMMIT,
  };
}

function checkReviewPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null
      && typeof packet === 'object'
      && !Array.isArray(packet)
      && plainContractData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkDurableEvidenceCommandCardReview(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkDurableEvidenceCommandCardReview(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_PACKET_VALID'
      : 'INVALID_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_PACKET',
    problems: ok ? [] : ['INVALID_DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkReviewPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkDurableEvidenceCommandCardReview(null),
      code: 'DURABLE_ADAPTER_EVIDENCE_COMMAND_CARD_REVIEW_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkReviewPacket };
