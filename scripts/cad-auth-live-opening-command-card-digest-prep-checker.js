// Checks only public source-only command-card digest prep files.
// Never issues command cards, reads private receipts, secrets, runtime config or upload bodies.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const parentReview = require('./cad-auth-durable-adapter-evidence-command-card-review-checker');
const {
  SOURCE_COMMIT,
  EVIDENCE_PACKET_SHA256,
  liveOpeningCommandCardDigestPreparation,
  checkLiveOpeningCommandCardDigestPreparation,
} = require('../offline/cad-auth-live-opening-command-card-digest-prep/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-command-card-digest-prep.json';
const SOURCES = Object.freeze([
  parentReview.PACKET,
  'docs/cad-auth-live-opening-command-card-digest-prep.md',
  'offline/cad-auth-live-opening-command-card-digest-prep/preparation.js',
  'scripts/cad-auth-live-opening-command-card-digest-prep-checker.js',
  'scripts/cad-auth-live-opening-command-card-digest-prep.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const parent = JSON.parse(readSource(parentReview.PACKET));
  // This is a pinned historical evidence artifact. Recursively checking its
  // source tree against today's router would invalidate it whenever the reviewed
  // runtime evolves. Exact bytes remain mandatory; this is not current adapter
  // qualification or permission to execute the historical opening window.
  if (!plainContractData(parent) || parent.sourceOnly !== true) {
    throw Error('INVALID_DURABLE_ADAPTER_EVIDENCE_REVIEW_PARENT_PACKET');
  }
  const parentSha = sha(readSource(parentReview.PACKET));
  if (parentSha !== EVIDENCE_PACKET_SHA256) throw Error('EVIDENCE_PACKET_DIGEST_MISMATCH');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-command-card-digest-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_NO_RUNTIME_EFFECTS',
    parent: {
      durableAdapterEvidenceCommandCardReview: {
        path: parentReview.PACKET,
        sha256: parentSha,
        status: parent.status || parent.packet,
      },
    },
    preparation: liveOpeningCommandCardDigestPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceCommit: SOURCE_COMMIT,
  };
}

function checkDigestPrepPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null
      && typeof packet === 'object'
      && !Array.isArray(packet)
      && plainContractData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkLiveOpeningCommandCardDigestPreparation(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkLiveOpeningCommandCardDigestPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_PACKET_VALID'
      : 'INVALID_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_PACKET',
    problems: ok ? [] : ['INVALID_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkDigestPrepPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkLiveOpeningCommandCardDigestPreparation(null),
      code: 'LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkDigestPrepPacket };
