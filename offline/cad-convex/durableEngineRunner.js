// Bounded C2/C3 metadata runner. Construction is not authorization: no CLI or
// runtime imports this module, and the private command/evidence host remains gated.
const { blocked } = require('./durableAdapter');
const OPERATIONS = Object.freeze(['initialize', 'readExact', 'readAuthority', 'transact',
  'changeAuthority', 'claim', 'settle', 'scanPage', 'stop']);
const RETRYABLE = new Set(['transact', 'claim']);
const BACKOFF = Object.freeze([100, 250]);
const MAX_ATTEMPTS = 3;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const result = (code, values = {}) => Object.freeze({ ...blocked(), code, ...values });
function createDurableEngineRunner({ adapter, now = Date.now,
  wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) } = {}) {
  if (!adapter || typeof now !== 'function' || typeof wait !== 'function'
    || OPERATIONS.some(operation => typeof adapter[operation] !== 'function'))
    throw new Error('ENGINE_RUNNER_INVALID');
  let stopped = false, logicalCommands = 0, transactionAttempts = 0;
  return Object.freeze({
    async execute(operation, input, evidenceBytes, expectedBytes) {
      if (stopped || !OPERATIONS.includes(operation)) return result(stopped ? 'RUN_STOPPED' : 'COMMAND_INVALID');
      if (!input || !integer(input.deadlineAt) || logicalCommands >= 256) {
        stopped = true; return result('RUN_STOPPED');
      }
      logicalCommands++;
      let current = { ...input };
      const limit = RETRYABLE.has(operation) ? MAX_ATTEMPTS : 1;
      for (let attempt = 1; attempt <= limit; attempt++) {
        const at = now();
        if (!integer(at) || at >= current.deadlineAt || current.deadlineAt - at > 5000
          || transactionAttempts >= 768) { stopped = true; return result('RUN_STOPPED'); }
        transactionAttempts++;
        const response = operation === 'settle'
          ? await adapter.settle(current, evidenceBytes, expectedBytes)
          : await adapter[operation](current);
        if (!response || typeof response.code !== 'string') { stopped = true; return result('ENGINE_RESPONSE_INVALID'); }
        if (response.code !== 'CONFLICT' || attempt === limit) {
          if (operation === 'stop' && response.code === 'RUN_STOPPED') stopped = true;
          if (response.code === 'OUTCOME_UNKNOWN' || (response.code === 'CONFLICT' && attempt === limit)) stopped = true;
          return Object.freeze({ ...response, runnerAttempt: attempt, logicalCommands, transactionAttempts });
        }
        if (!integer(response.revision) || operation === 'claim' && !integer(response.claimGeneration)) {
          stopped = true; return result('ENGINE_RESPONSE_INVALID');
        }
        current = operation === 'claim' ? { ...current, expectedGeneration: response.claimGeneration }
          : { ...current, expectedRevision: response.revision };
        await wait(BACKOFF[attempt - 1]);
      }
      stopped = true; return result('RUN_STOPPED');
    },
    async stop(input) {
      if (stopped) return result('RUN_STOPPED');
      const response = await adapter.stop(input);
      stopped = true;
      return response;
    },
    status: () => Object.freeze({ stopped, logicalCommands, transactionAttempts,
      maxLogicalCommands: 256, maxTransactionAttempts: 768, automaticResume: false }),
  });
}
module.exports = { OPERATIONS, BACKOFF, MAX_ATTEMPTS, createDurableEngineRunner };
