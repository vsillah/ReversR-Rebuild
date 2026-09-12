// Offline integrity check; --write regenerates only the local artifact manifest.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['offline/cad-convex/passwordPolicy.ts', 'scripts/cad-convex-password-boundary.test.js',
  'docs/cad-convex-password-auth-boundary.md', 'docs/cad-convex-live-wiring-packet.md', 'docs/cad-live-convex-auth-setup-packet.md', 'convex/auth.ts', 'convex/auth.config.ts', 'convex/http.ts',
  'offline/cad-convex/librarySessionHarness.js', 'scripts/cad-convex-auth-assembly.test.js',
  'docs/cad-convex-auth-assembly-review.md',

  'offline/cad-convex/previewRuntime.js',
  'offline/cad-convex/previewRuntime.d.ts',
  'scripts/cad-convex-preview-runtime.test.js',
  'docs/cad-convex-preview-setup.md',
  'package.json',
  'package-lock.json',
  'scripts/cad-convex-codegen.js',
  'convex/_generated/api.js',
  'convex/_generated/api.d.ts',
  'convex/_generated/server.js',
  'convex/_generated/server.d.ts',
  'convex/_generated/dataModel.d.ts',
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
const manifest = { version: 8, mode: 'offline-source-unqualified',
  baseCommit: '5913641d200fe71c0a3b51f0d7c46de0f635bb39',
  productionWiring: false, liveQualification: false,
  functions: require('../offline/cad-convex/sessionAdapter').FUNCTIONS,
  schemaSource: 'convex/schema.ts',
  functionSource: 'convex/cad.ts',
  sdkTypecheck: 'passed',
  sdkVersions: { convex: '1.45.0', auth: '0.0.95', authCore: '0.41.3' },
  codegen: 'local-pinned-sdk-templates',
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
