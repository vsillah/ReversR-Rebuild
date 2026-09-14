// Fixed local source reads and bounded stdin only; no arbitrary path or argv inputs.
const fs = require('node:fs');
const path = require('node:path');
const { MAX_BYTES, preflight, runCard } = require('../offline/cad-convex/liveRunner');
const { blocked } = require('../offline/cad-convex/durableAdapter');
const emit = (value, code) => { process.stdout.write(JSON.stringify(value) + '\n'); process.exitCode = code; };
if (process.argv.length !== 3) emit({ ...blocked(), errors: ['COMMAND_INVALID'] }, 1);
else if (process.argv[2] === '--preflight') {
  const chunks = []; let size = 0, failed = false;
  process.stdin.on('data', chunk => {
    if (failed) return;
    size += chunk.length;
    if (size > MAX_BYTES) {
      failed = true;
      emit({ ...blocked(), errors: ['INPUT_TOO_LARGE'] }, 1);
      process.stdin.destroy();
    } else chunks.push(chunk);
  });
  process.stdin.on('error', () => {
    if (!failed) emit({ ...blocked(), errors: ['INPUT_READ_FAILED'] }, 1);
    failed = true;
  });
  process.stdin.on('end', () => {
    if (failed) return;
    try {
      const read = name => fs.readFileSync(path.join(__dirname, '../offline/cad-convex', name), 'utf8');
      const result = preflight(Buffer.concat(chunks).toString('utf8'), read('durableAdapter.d.ts'), read('liveRunnerOutput.json'));
      emit(result, result.structureValid ? 2 : 1);
    } catch { emit({ ...blocked(), errors: ['LOCAL_SOURCE_READ_FAILED'] }, 1); }
  });
} else {
  const result = runCard(process.argv[2]);
  emit(result, result.card ? 2 : 1);
}
