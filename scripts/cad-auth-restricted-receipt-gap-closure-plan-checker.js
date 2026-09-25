// Checks only tracked public plan sources. No private receipt I/O.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { plainData } = require('../offline/cad-auth-command-card-source/preparation');
const { PACKET: CONTRACT_PACKET, checkGeneratorPacket: checkContract } =
  require('./cad-auth-restricted-source-set-generator-checker');
const {
  gapClosurePlan,
  checkGapClosurePlan,
} = require('../offline/cad-auth-restricted-receipt-gap-closure-plan/preparation');

const ROOT = path.resolve(__dirname, '..');
const PACKET = 'docs/cad-auth-restricted-receipt-gap-closure-plan.json';
const SOURCES = Object.freeze([
  CONTRACT_PACKET,
  'offline/cad-auth-command-card-source/preparation.js',
  'offline/cad-auth-restricted-source-set-contract/preparation.js',
  'offline/cad-auth-live-collector-binding/guardedCollector.js',
  'docs/cad-auth-restricted-receipt-gap-closure-plan.md',
  'offline/cad-auth-restricted-receipt-gap-closure-plan/preparation.js',
  'scripts/cad-auth-restricted-receipt-gap-closure-plan-checker.js',
  'scripts/cad-auth-restricted-receipt-gap-closure-plan.test.js',
]);

const read = file => fs.readFileSync(path.join(ROOT, file));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function expectedPacket(readSource = read) {
  const contract = JSON.parse(readSource(CONTRACT_PACKET));
  if (!checkContract(contract, { readSource }).ok) throw Error('INVALID_SOURCE_SET_CONTRACT_PARENT');
  return {
    schemaVersion: 1,
    packet: 'cad-auth-restricted-receipt-gap-closure-plan-v1',
    sourceOnly: true,
    status: 'SOURCE_ONLY_GAP_CLOSURE_PLAN_NO_PRIVATE_RECEIPTS_LOADED',
    parent: {
      packet: contract.packet,
      sha256: sha(readSource(CONTRACT_PACKET)),
      sourceMergeCommit: contract.sourceMergeCommit,
      status: contract.status,
    },
    preparation: gapClosurePlan(),
    sourceBindings: Object.fromEntries(SOURCES.map(file => [file, sha(readSource(file))])),
    sourceMergeCommit: contract.sourceMergeCommit,
  };
}

function checkPlan(packet, { readSource = read } = {}) {
  let ok = false;
  try {
    ok = packet !== null && typeof packet === 'object' && !Array.isArray(packet)
      && plainData(packet)
      && checkGapClosurePlan(packet.preparation).ok
      && isDeepStrictEqual(packet, expectedPacket(readSource));
  } catch { /* sanitized */ }
  return {
    ...checkGapClosurePlan(null),
    ok,
    sourceBindingValid: ok,
    code: ok ? 'SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_PACKET_VALID'
      : 'INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_PACKET',
    problems: ok ? [] : ['INVALID_SOURCE_ONLY_RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_PACKET'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--write') throw Error('INVALID_ARGUMENT');
    if (process.argv[2] === '--write') {
      fs.writeFileSync(path.join(ROOT, PACKET), JSON.stringify(expectedPacket(), null, 2) + '\n');
    }
    const result = checkPlan(JSON.parse(read(PACKET)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    console.log(JSON.stringify({
      ...checkGapClosurePlan(null),
      code: 'RESTRICTED_RECEIPT_GAP_CLOSURE_PLAN_CONTRACT_BLOCKED',
    }));
    process.exitCode = 1;
  }
}

module.exports = { PACKET, SOURCES, expectedPacket, checkPlan };
