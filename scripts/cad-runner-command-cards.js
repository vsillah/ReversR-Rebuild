// Local stdin only; never executes any command contained in a packet.
const { MAX_BYTES, generateCommandCards, inspectCommandCards } = require('../offline/cad-convex/runnerCommandCards');
if (process.argv.length === 3 && process.argv[2] === '--template') {
  process.stdout.write(JSON.stringify(generateCommandCards(), null, 2) + '\n');
} else if (process.argv.length === 3 && process.argv[2] === '--check') {
  const chunks = []; let size = 0;
  process.stdin.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      process.stdout.write('{"decision":"LIVE_RUN_BLOCKED","errors":["INPUT_TOO_LARGE"]}\n');
      process.exit(1);
    }
    chunks.push(chunk);
  });
  process.stdin.on('end', () => {
    const result = inspectCommandCards(Buffer.concat(chunks).toString('utf8'));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exitCode = result.structureValid && result.fieldsComplete ? 0 : result.structureValid ? 2 : 1;
  });
  process.stdin.on('error', () => { process.stderr.write('INPUT_READ_FAILED\n'); process.exitCode = 1; });
} else {
  process.stderr.write('Use --template or --check with JSON on stdin. Offline syntax only.\n');
  process.exitCode = 1;
}
