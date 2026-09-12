// Offline integrity check; --write regenerates only the local artifact manifest.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = [
  'convex/schema.ts',
  'convex/cad.ts',
  'convex/librarySession.ts',
  'offline/cad-convex/backend.d.ts',
  'scripts/cad-convex-source.test.js',
  'scripts/helpers/cad-convex-source-loader.js',
  'scripts/cad-convex-source-audit.js',
  'docs/cad-convex-schema-functions-review.md',
  'offline/cad-convex/README.md',
  'offline/cad-convex/backend.js',
  'offline/cad-convex/gateway.js',
  'offline/cad-convex/sessionAdapter.js',
  'offline/cad-convex/admissionHarness.js',
  'scripts/helpers/cad-convex-fixture.js',
  'scripts/cad-convex-gateway-schema.test.js',
  'docs/cad-convex-gateway-schema-review.md',
  'offline/cad-convex/validators.js',
  'offline/cad-convex/convex/schema.ts.template',
  'offline/cad-convex/convex/cad.ts.template',
  'scripts/cad-convex-backend-contract.test.js',
  'scripts/cad-convex-contract-manifest.js',
];
const manifest = { version: 3, mode: 'offline-source-unqualified',
  baseCommit: 'eecc27c46722bb81d53d2e5782ce3b16dca6f0c0',
  productionWiring: false, liveQualification: false,
  functions: require('../offline/cad-convex/sessionAdapter').FUNCTIONS,
  schemaSource: 'convex/schema.ts',
  functionSource: 'convex/cad.ts',
  sdkTypecheck: 'blocked-missing-sdk-auth-and-codegen',
  defaultLibrarySession: 'AUTH_UNAVAILABLE',
  schemaTemplate: 'offline/cad-convex/convex/schema.ts.template',
  internalOnlyPolicyFunction: 'cad:changeAuthority',
  files: Object.fromEntries(files.map(file => [file,
    createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
const output = JSON.stringify(manifest, null, 2) + '\n';
const target = path.join(root, 'offline/cad-convex/manifest.json');
if (process.argv[2] === '--write') fs.writeFileSync(target, output);
else if (fs.readFileSync(target, 'utf8') !== output) throw new Error('CAD_CONTRACT_MANIFEST_MISMATCH');
console.log('CAD offline contract manifest verified: ' + files.length + ' files');
