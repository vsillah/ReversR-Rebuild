// Checks only public source-only runtime mount prep files. No live activation.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainContractData } = require('../offline/cad-auth-prod-opening-prep/preparation');
const {
  COMMAND_CARD_DIGEST_PREP_PACKET_SHA256,
  SOURCE_COMMIT,
  liveOpeningRuntimeMountPreparation,
  checkLiveOpeningRuntimeMountPreparation,
} = require('../offline/cad-auth-live-opening-runtime-mount-prep/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-live-opening-runtime-mount-prep.json';
const PARENT_PACKET = 'docs/cad-auth-live-opening-command-card-digest-prep.json';
const SOURCES = Object.freeze([
  PARENT_PACKET,
  'docs/cad-auth-live-opening-runtime-mount-prep.md',
  'offline/cad-auth-live-opening-runtime-mount-prep/preparation.js',
  'server/cadLiveOpeningRuntimeMount.js',
  'server/cadUserUploadRouter.js',
  'scripts/cad-auth-live-opening-runtime-mount-prep-checker.js',
  'scripts/cad-auth-live-opening-runtime-mount-prep.test.js',
]);
const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const shaJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validParentCommandCardDigestPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet) || !plainContractData(packet)) return false;
  const prep = packet.preparation;
  const digest = prep && prep.commandCardDigest;
  const draft = digest && digest.draft;
  return packet.schemaVersion === 1
    && packet.packet === 'cad-auth-live-opening-command-card-digest-prep-v1'
    && packet.sourceOnly === true
    && packet.status === 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_NO_RUNTIME_EFFECTS'
    && prep
    && prep.sourceOnly === true
    && prep.status === 'SOURCE_ONLY_LIVE_OPENING_COMMAND_CARD_DIGEST_PREP_NO_ISSUANCE'
    && digest
    && digest.algorithm === 'SHA-256'
    && /^[a-f0-9]{64}$/.test(digest.sha256)
    && digest.digestResolved === true
    && digest.liveCommandCardIssuedByThisGate === false
    && digest.executableCommandCardPreparedForLiveExecution === false
    && draft
    && draft.artifact === 'cad-auth-live-opening-command-card-digest-draft-v1'
    && draft.sourceOnly === true
    && draft.executable === false
    && draft.issued === false
    && draft.authorizedForLiveUse === false
    && draft.productionUploadAdmissionActivated === false
    && draft.uploadSessionIssuanceEnabled === false
    && draft.requestBodyAdmissionReadAuthorized === false
    && shaJson(draft) === digest.sha256
    && prep.controls
    && prep.controls.uploadSessionIssuanceAuthorized === false
    && prep.controls.productionUploadActivationAuthorized === false
    && prep.controls.requestBodyAdmissionReadAuthorized === false
    && prep.controls.runtimeActivationAuthorized === false
    && prep.controls.executableCommandCardIssuanceAuthorized === false;
}

function expectedPacket(readSource = read) {
  const parentPacket = JSON.parse(readSource(PARENT_PACKET));
  if (!validParentCommandCardDigestPacket(parentPacket)) throw Error('PARENT_COMMAND_CARD_DIGEST_PREP_INVALID');
  const parentSha = sha(readSource(PARENT_PACKET));
  if (parentSha !== COMMAND_CARD_DIGEST_PREP_PACKET_SHA256) {
    throw Error('COMMAND_CARD_DIGEST_PREP_PACKET_SHA_MISMATCH');
  }
  return {
    schemaVersion: 1,
    packet: 'cad-auth-live-opening-runtime-mount-prep-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_LIVE_OPENING_RUNTIME_MOUNT_PREP_NO_RUNTIME_EFFECTS',
    parent: {
      commandCardDigestPrep: {
        path: PARENT_PACKET,
        sha256: parentSha,
        status: parentPacket.status || parentPacket.packet,
      },
    },
    preparation: liveOpeningRuntimeMountPreparation(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceCommit: SOURCE_COMMIT,
  };
}

function checkRuntimeMountPrepPacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null
      && typeof packet === 'object'
      && !Array.isArray(packet)
      && plainContractData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkLiveOpeningRuntimeMountPreparation(packet.preparation).ok;
  } catch {
    // Return a closed result without reflecting input.
  }
  return {
    ...checkLiveOpeningRuntimeMountPreparation(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_LIVE_OPENING_RUNTIME_MOUNT_PREP_PACKET_VALID'
      : 'INVALID_LIVE_OPENING_RUNTIME_MOUNT_PREP_PACKET',
    problems: ok ? [] : ['INVALID_LIVE_OPENING_RUNTIME_MOUNT_PREP_PACKET'],
  };
}

if (require.main === module) {
  try {
    const mode = process.argv[2] || null;
    if (process.argv.length > 3 || (mode && mode !== '--write')) throw Error('INVALID_ARGUMENT');
    if (mode === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkRuntimeMountPrepPacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkLiveOpeningRuntimeMountPreparation(null),
      code: 'LIVE_OPENING_RUNTIME_MOUNT_PREP_BLOCKED',
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkRuntimeMountPrepPacket };
