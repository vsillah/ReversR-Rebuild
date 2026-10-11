const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SANDBOX_LIMITS, credentialOptions, hasCredentials }
  = require('./cadSandboxConfig');

function authenticatedAssets() {
  const files = [
    ['sandbox/runner.js', path.join(__dirname, 'cadAuthenticatedIgsSandboxRunner.js')],
    ['sandbox/cadAuthenticatedIgsWorkerContract.js',
      path.join(__dirname, 'cadAuthenticatedIgsWorkerContract.js')],
    ['sandbox/cadWorkerContract.js', path.join(__dirname, 'cadWorkerContract.js')],
    ['utils/igesAdmission.js', path.join(__dirname, '../utils/igesAdmission.js')],
    ['utils/cadAuthenticatedIgesAdmission.js',
      path.join(__dirname, '../utils/cadAuthenticatedIgesAdmission.js')],
    ['sandbox/occt.js', require.resolve('occt-import-js')],
    ['sandbox/occt.wasm', require.resolve('occt-import-js/dist/occt-import-js.wasm')],
    ['sandbox/license-occt.txt', require.resolve('occt-import-js/dist/license.occt.txt')],
    ['sandbox/license-importer.txt',
      require.resolve('occt-import-js/dist/license.occt-import-js.txt')],
  ].map(([name, source]) => ({ path: `/vercel/${name}`,
    content: fs.readFileSync(source), mode: 0o600 }));
  if (files.reduce((total, file) => total + file.content.length, 0)
    > SANDBOX_LIMITS.assetBytes) throw new Error('Asset limit');
  const wasm = files.find(file => file.path.endsWith('/occt.wasm')).content;
  if (crypto.createHash('sha256').update(wasm).digest('hex')
    !== '33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952') {
    throw new Error('Unqualified WASM asset');
  }
  return files;
}

function authenticatedSandboxReadiness(env = process.env) {
  const missing = [];
  if (env.CAD_IMPORT_EXECUTOR !== 'sandbox') missing.push('CAD_IMPORT_EXECUTOR=sandbox');
  if (!hasCredentials(env)) missing.push('Sandbox OIDC or explicit Vercel credentials');
  if (env.CAD_SANDBOX_LIVE_QUALIFIED !== 'true') {
    missing.push('CAD_SANDBOX_LIVE_QUALIFIED=true after approved live diagnostic');
  }
  try { require.resolve('@vercel/sandbox'); } catch { missing.push('Sandbox SDK dependency'); }
  try { authenticatedAssets(); } catch { missing.push('Packaged authenticated CAD assets'); }
  return { configured: missing.length === 0, missing,
    credentials: hasCredentials(env) ? 'available-unverified' : 'missing',
    liveQualification: env.CAD_SANDBOX_LIVE_QUALIFIED === 'true'
      ? 'operator-attested' : 'pending', limits: SANDBOX_LIMITS };
}

module.exports = { SANDBOX_LIMITS, authenticatedAssets,
  authenticatedSandboxReadiness, credentialOptions };
