// Offline preflight and blocked command dispatch. No execution-capable dependency.
const { createHash } = require('node:crypto');
const { inspectCommandCards, MAX_BYTES } = require('./runnerCommandCards');
const { blocked, createDurableAdapter } = require('./durableAdapter');
const hash = bytes => createHash('sha256').update(bytes, 'utf8').digest('hex');
// Exact source bytes are supplied by the local CLI, never by the packet.
function preflight(bytes, adapterContractBytes, outputContractBytes) {
  const inspection = inspectCommandCards(bytes);
  const errors = [...inspection.errors];
  if (inspection.structureValid) {
    const packet = JSON.parse(bytes);
    if (packet.fields.adapterContractDigest !== hash(adapterContractBytes)) errors.push('ADAPTER_CONTRACT_UNBOUND');
    if (packet.cards.some(card => card.fields.outputContractDigest !== hash(outputContractBytes))) errors.push('OUTPUT_CONTRACT_UNBOUND');
  }
  return { ...blocked(), card: 'C0', structureValid: inspection.structureValid,
    sourceBindingsMatch: inspection.structureValid && errors.length === 0,
    fieldsComplete: inspection.fieldsComplete, packetSha256: inspection.packetSha256,
    errors, blockers: [...inspection.blockers, 'ENGINE_NOT_IMPLEMENTED',
      'CLOCK_COST_UNUSED_RUN_AND_RECEIPTS_NOT_VERIFIED'] };
}
function runCard(card) {
  if (!['C1', 'C2', 'C3', 'C4'].includes(card)) return { ...blocked(), errors: ['COMMAND_INVALID'] };
  // Even C3 and C4 cannot issue a read or postcheck under stopped/expired authority.
  return { ...createDurableAdapter().stop(), card, errors: ['LIVE_EXECUTION_NOT_IMPLEMENTED'] };
}
module.exports = { MAX_BYTES, preflight, runCard };
