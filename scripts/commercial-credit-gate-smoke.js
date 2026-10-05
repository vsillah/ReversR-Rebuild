// The former smoke trusted profile-name/tester and caller-client identity. Those
// assertions are intentionally replaced by authenticated route/isolation tests.
// A clean child environment prevents inherited credentials/provider settings.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'commercial-launch-readiness.test.js')], {
  stdio: 'inherit',
  env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NODE_ENV: 'test' },
});
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
