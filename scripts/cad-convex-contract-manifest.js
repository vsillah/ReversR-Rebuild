// Offline integrity check; --write regenerates only the local artifact manifest.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = [
  'offline/cad-convex/README.md',
  'offline/cad-convex/backend.js',
  'offline/cad-convex/gateway.js',
  'offline/cad-convex/validators.js',
  'offline/cad-convex/convex/schema.ts.template',
  'offline/cad-convex/convex/cad.ts.template',
  'scripts/cad-convex-backend-contract.test.js',
  'scripts/cad-convex-contract-manifest.js',
];
const manifest = { version: 1, mode: 'offline-contract-only',
  baseCommit: '0eef33fe5d7e6e260f382f697d820285da4d9b7f',
  productionWiring: false, liveQualification: false,
  files: Object.fromEntries(files.map(file => [file,
    createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
const output = JSON.stringify(manifest, null, 2) + '\n';
const target = path.join(root, 'offline/cad-convex/manifest.json');
if (process.argv[2] === '--write') fs.writeFileSync(target, output);
else if (fs.readFileSync(target, 'utf8') !== output) throw new Error('CAD_CONTRACT_MANIFEST_MISMATCH');
console.log('CAD offline contract manifest verified: ' + files.length + ' files');
