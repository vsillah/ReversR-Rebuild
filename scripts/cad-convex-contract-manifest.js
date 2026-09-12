// Offline integrity check; --write regenerates only the local artifact manifest.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = [
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
const manifest = { version: 2, mode: 'offline-contract-only',
  baseCommit: '4022000ae2212af9341a9453c3f655cf0ff79522',
  productionWiring: false, liveQualification: false,
  functions: require('../offline/cad-convex/sessionAdapter').FUNCTIONS,
  schemaTemplate: 'offline/cad-convex/convex/schema.ts.template',
  internalOnlyPolicyFunction: 'cad:changeAuthority',
  files: Object.fromEntries(files.map(file => [file,
    createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
const output = JSON.stringify(manifest, null, 2) + '\n';
const target = path.join(root, 'offline/cad-convex/manifest.json');
if (process.argv[2] === '--write') fs.writeFileSync(target, output);
else if (fs.readFileSync(target, 'utf8') !== output) throw new Error('CAD_CONTRACT_MANIFEST_MISMATCH');
console.log('CAD offline contract manifest verified: ' + files.length + ' files');
