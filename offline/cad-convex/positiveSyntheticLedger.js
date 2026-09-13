// Offline source candidate. Explicit fixture opt-in; no runtime or provider imports.
const fs = require('node:fs');
const fixedError = code => new Error(code);
const write = (fd, row) => {
  const bytes = Buffer.from(JSON.stringify(row) + '\n');
  if (fs.writeSync(fd, bytes) !== bytes.length) throw Error('JOURNAL_UNAVAILABLE');
  fs.fsyncSync(fd);
};
const integer = n => Number.isSafeInteger(n) && n >= 0;
const cleanup = new Set(['logout', 'revoke', 'verifyRevoked', 'inventory', 'remove']);
const operations = new Set(['prepare', 'provision', 'signIn', 'verify', ...cleanup]);

function createPositiveSyntheticLedger({ testOnly, journalPath, now = Date.now,
  endAt, timeoutMs = 800 } = {}) {
  let fd, start;
  try {
    start = now();
    const reset = (Math.floor(start / 86400000) + 1) * 86400000;
    if (testOnly !== true || typeof journalPath !== 'string' || !integer(start)
      || !integer(endAt) || endAt <= start || endAt > start + 900000 || endAt >= reset
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 800) throw Error();
    // An existing file is a permanent no-resume tombstone, including after a crash.
    fd = fs.openSync(journalPath, 'wx', 0o600);
    write(fd, { version: 1, mode: 'synthetic-offline', start, endAt });
    // Make the exclusive tombstone directory entry durable before any dispatch.
    const directory = fs.openSync(require('node:path').dirname(journalPath), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  } catch { if (fd !== undefined) { try { fs.closeSync(fd); } catch {} } throw fixedError('RUN_UNAVAILABLE'); }
  let attempted = 0, work = 0, dispatched = 0, busy = false, stopped = false,
    unknown = false, closed = false, last = start;
  const append = row => {
    try { write(fd, row); }
    catch { stopped = true; throw fixedError('JOURNAL_UNAVAILABLE'); }
  };
  const clock = () => {
    const n = now();
    if (!integer(n) || n < last || n >= endAt) throw fixedError('RUN_EXPIRED');
    last = n; return n;
  };
  return Object.freeze({
    async execute(operation, validate, invoke, accept, mutates = false) {
      if (closed || stopped || attempted >= 100) throw fixedError('RUN_STOPPED');
      const sequence = ++attempted;
      const isCleanup = cleanup.has(operation);
      if (!isCleanup) work++;
      // Never persist input, exception text, provider replies, identifiers or secrets.
      append({ sequence, phase: 'attempt', cleanup: isCleanup });
      if (!operations.has(operation) || (!isCleanup && work > 80)) {
        stopped = true; append({ sequence, phase: 'denied' }); throw fixedError('RUN_STOPPED');
      }
      if (busy) { append({ sequence, phase: 'busy' }); throw fixedError('RUN_BUSY'); }
      busy = true;
      let invoked = false, timer, validated = false;
      try {
        const n = clock();
        validate(n); validated = true;
        append({ sequence, phase: 'pending' });
        dispatched++; invoked = true;
        const result = await Promise.race([
          Promise.resolve().then(() => invoke(Object.freeze({ sequence, operation }))),
          new Promise((_, reject) => { timer = setTimeout(() => reject(fixedError('DEADLINE')), Math.min(timeoutMs, endAt - n)); }),
        ]);
        const receivedAt = clock();
        if (stopped) throw fixedError('RUN_STOPPED');
        // Check replies before recording success; malformed write replies are unknown.
        accept(result, receivedAt);
        append({ sequence, phase: 'accepted' });
        return { code: 'ACCEPTED', sequence, cadUploadAllowed: false };
      } catch {
        stopped = true;
        unknown = invoked && mutates;
        const code = unknown ? 'OUTCOME_UNKNOWN' : validated ? 'RUN_STOPPED' : 'FLOW_DENIED';
        try { append({ sequence, phase: unknown ? 'unknown' : 'denied' }); } catch {}
        throw fixedError(code);
      } finally { clearTimeout(timer); busy = false; }
    },
    status: () => ({ attempted, work, dispatched, stopped, unknown, inFlight: busy,
      cleanupReserve: 20, automaticRetries: 0, executable: false, liveReady: false }),
    close() {
      if (busy) throw fixedError('RUN_BUSY');
      if (!closed) { closed = true; stopped = true; try { fs.closeSync(fd); } catch { throw fixedError('JOURNAL_UNAVAILABLE'); } }
    },
  });
}
module.exports = { createPositiveSyntheticLedger };
