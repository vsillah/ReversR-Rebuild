const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const SANDBOX_LIMITS = Object.freeze({ lifetimeMs: 60000, requestMs: 45000, commandMs: 10000, cleanupMs: 5000, vcpus: 1, memoryMb: 2048, assetBytes: 10 * 1024 * 1024 });
function credentialOptions(env) {
  return env.VERCEL_TOKEN && env.VERCEL_TEAM_ID && env.VERCEL_PROJECT_ID
    ? { token: env.VERCEL_TOKEN, teamId: env.VERCEL_TEAM_ID, projectId: env.VERCEL_PROJECT_ID } : {};
}
function hasCredentials(env) { return Boolean(Object.keys(credentialOptions(env)).length || env.VERCEL_OIDC_TOKEN || env.VERCEL === '1'); }
function assets() {
  const files = [
    ['runner.js', path.join(__dirname, 'cadSandboxRunner.js')],
    ['cadWorkerContract.js', path.join(__dirname, 'cadWorkerContract.js')],
    ['occt.js', require.resolve('occt-import-js')],
    ['occt.wasm', require.resolve('occt-import-js/dist/occt-import-js.wasm')],
    ['license-occt.txt', require.resolve('occt-import-js/dist/license.occt.txt')],
    ['license-importer.txt', require.resolve('occt-import-js/dist/license.occt-import-js.txt')],
  ].map(([name, source]) => ({ path: `/vercel/sandbox/${name}`, content: fs.readFileSync(source), mode: 0o600 }));
  if (files.reduce((total, file) => total + file.content.length, 0) > SANDBOX_LIMITS.assetBytes) throw new Error('Asset limit');
  const wasm = files.find(file => file.path.endsWith('/occt.wasm')).content;
  if (crypto.createHash('sha256').update(wasm).digest('hex') !== '33391fc9d94ea5c869a6718488bf0a9a464222bac9bdc764dfe1690cef281952') throw new Error('Unqualified WASM asset');
  return files;
}
function sandboxReadiness(env = process.env) {
  const missing = [];
  if (env.CAD_IMPORT_EXECUTOR !== 'sandbox') missing.push('CAD_IMPORT_EXECUTOR=sandbox');
  if (!hasCredentials(env)) missing.push('Sandbox OIDC or explicit Vercel credentials');
  if (env.CAD_SANDBOX_LIVE_QUALIFIED !== 'true') missing.push('CAD_SANDBOX_LIVE_QUALIFIED=true after approved live diagnostic');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(env.CAD_SANDBOX_ACCESS_TOKEN || '')) missing.push('CAD_SANDBOX_ACCESS_TOKEN (32-128 random URL-safe characters)');
  try { require.resolve('@vercel/sandbox'); } catch { missing.push('Sandbox SDK dependency'); }
  try { assets(); } catch { missing.push('Packaged CAD assets'); }
  return { configured: missing.length === 0, missing, credentials: hasCredentials(env) ? 'available-unverified' : 'missing',
    liveQualification: env.CAD_SANDBOX_LIVE_QUALIFIED === 'true' ? 'operator-attested' : 'pending',
    limits: SANDBOX_LIMITS };
}
module.exports = { SANDBOX_LIMITS, credentialOptions, hasCredentials, assets, sandboxReadiness };
