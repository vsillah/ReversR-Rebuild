// Opt-in live diagnostic. Merely running this script performs no provider work.
const fs = require('node:fs');
const path = require('node:path');
const { hasCredentials, SANDBOX_LIMITS } = require('../server/cadSandboxConfig');
async function main() {
  if (!process.argv.includes('--live') || process.env.CAD_SANDBOX_DIAGNOSTIC_APPROVED !== 'true') {
    console.log('SKIP: live Sandbox requires --live and CAD_SANDBOX_DIAGNOSTIC_APPROVED=true after explicit approval.');
    return;
  }
  if (!hasCredentials(process.env)) {
    console.log('SKIP: provide Vercel OIDC or VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID in the local environment.');
    return;
  }
  const root = path.dirname(require.resolve('occt-import-js/package.json'));
  const directory = path.join(root, 'test/testfiles/cube-10x10mm');
  const names = fs.readdirSync(directory).filter(name => /\.igs$/i.test(name));
  if (names.length !== 1) throw new Error('Public fixture unavailable');
  const bytes = fs.readFileSync(path.join(directory, names[0]));
  const { upload } = require('../server/cadWorkerContract');
  const body = { fileName: 'cube' + '.igs', contentBase64: bytes.toString('base64') };
  if (upload(body).sha256 !== '5bc09d9b7a163ed8052af1fffebf953e000dc0d48cd7d700c064dacce1f2e7b3') throw new Error('Public fixture checksum mismatch');
  const { createSandboxExecutor } = require('../server/cadSandboxExecutor');
  const started = Date.now();
  const stages = [];
  let result;
  try { result = await createSandboxExecutor({ onStage: stage => stages.push(stage) }).convert(body); }
  catch (error) {
    console.error(JSON.stringify({ status: 'failed', code: error.code || 'DIAGNOSTIC_FAILED', elapsedMs: Date.now() - started, stages,
      note: 'No production configuration or route activation was attempted.' }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (result.triangleCount !== 12 || result.execution.cleanup !== 'stopped') throw new Error('Diagnostic mismatch');
  console.log(JSON.stringify({ status: 'passed', fixture: 'public-package-cube', triangles: result.triangleCount,
    elapsedMs: Date.now() - started, execution: result.execution, limits: SANDBOX_LIMITS, stages,
    note: 'One diagnostic; production configuration and route smoke remain separate gates.' }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.code || 'DIAGNOSTIC_FAILED'); process.exitCode = 1; });
module.exports = { main };
