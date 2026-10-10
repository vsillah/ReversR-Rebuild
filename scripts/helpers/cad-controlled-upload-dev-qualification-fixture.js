'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { syntheticDb } = require('./cad-controlled-upload-host-fixture');

const root = path.resolve(__dirname, '../..');
const allowed = new Set([
  'convex/cadControlledUploadDevQualification.ts',
  'convex/cadControlledUploadDevQualificationBinding.ts',
  'offline/cad-convex/controlledUploadHostModel.ts',
  'convex/cadControlledUploadSchema.ts',
]);
const cache = new Map();
function load(file) {
  if (!allowed.has(file)) throw Error(`SOURCE_IMPORT_NOT_ALLOWED:${file}`);
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  cache.set(file, exports);
  const requireFixed = name => {
    if (name === 'convex/values' || name === 'convex/server') return require(name);
    if (name === './_generated/server') return { internalMutation: x => x, internalQuery: x => x };
    if (name === './_generated/dataModel') return {};
    return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) + '.ts');
  };
  vm.runInThisContext(`(function(exports,require){${compiled}\n})`, { filename: file })(exports, requireFixed);
  return exports;
}

const source = load('convex/cadControlledUploadDevQualification.ts');
const binding = load('convex/cadControlledUploadDevQualificationBinding.ts')
  .cadControlledUploadDevQualificationBinding;
const original = structuredClone(binding);

function resetBinding() {
  for (const key of Object.keys(binding)) delete binding[key];
  Object.assign(binding, structuredClone(original));
}

function installBinding(now = 2_000_000) {
  resetBinding();
  binding.source.qualificationCommit = 'c'.repeat(40);
  binding.synthetic.userId = 'synthetic-user-id';
  binding.synthetic.loginSessionId = 'synthetic-login-session-id';
  binding.approval.recordSha256 = 'd'.repeat(64);
  binding.approval.windowStartMs = now - 1000;
  binding.approval.windowEndMs = now + 60_000;
  return now;
}

function emptyRows() {
  const doc = (id, value) => ({ _id: id, _creationTime: 1, ...value });
  return {
    users: [doc('synthetic-user-id', { email: binding.synthetic.email })],
    authSessions: [doc('synthetic-login-session-id', {
      userId: 'synthetic-user-id',
      expirationTime: (binding.approval.windowEndMs ?? 0) + 1,
    })],
    cadUploadSessions: [],
    cadControlledUploadGrants: [],
    cadControlledUploadScopes: [],
    cadControlledUploadAttempts: [],
    cadControlledUploadSessionTombstones: [],
    cadControlledUploadReceipts: [],
    cadControlledUploadHostPrincipals: [],
  };
}

module.exports = { source, binding, resetBinding, installBinding, emptyRows, syntheticDb };
