// Offline schema extraction only. No Auth runtime, generated functions or env loader.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const authPath = 'node_modules/@convex-dev/auth/src/server/implementation/types.ts';
const hash = text => createHash('sha256').update(text).digest('hex');
function extractSchema() {
  const versions = { convex: require('convex/package.json').version,
    auth: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@convex-dev/auth/package.json'))).version,
    typescript: ts.version };
  if (versions.convex !== '1.45.0' || versions.auth !== '0.0.95' || versions.typescript !== '6.0.3')
    throw Error('SCHEMA_SDK_VERSION_MISMATCH');
  const sourceHashes = {};
  function load(file, dependencies) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    sourceHashes[file] = hash(source);
    const compiled = ts.transpileModule(source, { reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    if (compiled.diagnostics.some(d => d.category === ts.DiagnosticCategory.Error))
      throw Error('SCHEMA_SYNTAX_INVALID');
    const exports = {};
    // This is an import boundary for trusted, reviewed local source, not a security sandbox.
    vm.runInNewContext(compiled.outputText, { exports, require: name => {
      if (!Object.hasOwn(dependencies, name)) throw Error('SCHEMA_IMPORT_NOT_ALLOWED');
      return dependencies[name];
    } }, { timeout: 1000 });
    return exports;
  }
  const deps = { 'convex/server': require('convex/server'), 'convex/values': require('convex/values') };
  const auth = load(authPath, deps);
  const schema = load('convex/schema.ts', { ...deps, '@convex-dev/auth/server': { authTables: auth.authTables } }).default;
  // This SDK internal export format is version-pinned and explicitly checked by the model.
  const exported = JSON.parse(schema.export());
  const bindings = ['api.js', 'api.d.ts', 'server.js', 'server.d.ts', 'dataModel.d.ts'];
  for (const name of bindings) {
    const file = 'convex/_generated/' + name;
    sourceHashes[file] = hash(fs.readFileSync(path.join(root, file)));
  }
  return { versions, sourceHashes, schema: exported };
}
module.exports = { extractSchema, hash };
