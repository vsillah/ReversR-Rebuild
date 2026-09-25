// Checks only the public source-only gap-closure plan. Never reads private receipts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: GENERATOR_PACKET, checkGeneratorPacket } =
  require('./cad-auth-restricted-source-set-generator-checker');
const {
  gapClosurePlan,
  checkGapClosurePlan,
} = require('../offline/cad-auth-restricted-receipt-gap-closure/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-receipt-gap-closure.json';
const SOURCES = Object.freeze([
  GENERATOR_PACKET,
  'docs/cad-auth-restricted-receipt-gap-closure.md',
  'offline/cad-auth-restricted-receipt-gap-closure/preparation.js',
  'scripts/cad-auth-restricted-receipt-gap-closure-checker.js',
  'scripts/cad-auth-restricted-receipt-gap-closure.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const generator = JSON.parse(readSource(GENERATOR_PACKET));
  if (!checkGeneratorPacket(generator, { readSource }).ok) throw Error('INVALID_GENERATOR_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-receipt-gap-closure-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_GAP_CLOSURE_PLAN_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: generator.packet,
      sha256: sha(readSource(GENERATOR_PACKET)),
      sourceMergeCommit: generator.sourceMergeCommit,
      status: generator.status,
    },
    preparation: gapClosurePlan(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: generator.sourceMergeCommit,
  };
}

function checkGapClosurePacket(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && isDeepStrictEqual(packet, expectedPacket(readSource))
      && checkGapClosurePlan(packet.preparation).ok;
  } catch { /* sanitized */ }
  return {
    ...checkGapClosurePlan(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkGapClosurePacket(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkGapClosurePlan(null),
      code: 'RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkGapClosurePacket };
