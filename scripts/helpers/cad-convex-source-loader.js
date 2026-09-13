// Test-only registration/validator model. NOT the Convex SDK, codegen or OCC.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { createBackendContract } = require('../../offline/cad-convex/backend');
assert.equal(ts.version, '6.0.3', 'Use documented TypeScript 6.0.3 for reproducible syntax checks');
const root = path.resolve(__dirname, '../..');
const scalar = (kind, extra = {}) => ({ kind, ...extra });
const v = {
  string: () => scalar('string'), number: () => scalar('number'), boolean: () => scalar('boolean'),
  null: () => scalar('null'), id: table => scalar('id', { table }),
  literal: value => scalar('literal', { value }), optional: value => scalar('optional', { value }),
  union: (...values) => scalar('union', { values }), object: fields => scalar('object', { fields }),
};
function validate(rule, value) {
  if (rule.kind === 'optional') { if (value !== undefined) validate(rule.value, value); return; }
  if (rule.kind === 'union') {
    for (const member of rule.values) { try { validate(member, value); return; } catch {} }
    throw new Error('MODEL_VALIDATION_FAILED');
  }
  if (rule.kind === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value));
    assert.ok(Object.keys(value).every(k => Object.hasOwn(rule.fields, k)));
    for (const [k, member] of Object.entries(rule.fields)) validate(member, value[k]);
  } else if (rule.kind === 'literal') assert.equal(value, rule.value);
  else if (rule.kind === 'null') assert.equal(value, null);
  // Synthetic IDs only; no claim to validate real Convex document IDs.
  else assert.equal(typeof value, rule.kind === 'id' ? 'string' : rule.kind);
}
function loadSource({ now = () => 1000, readExactLibrarySession } = {}) {
  const cache = new Map();
  function load(file) {
    const full = path.resolve(root, file);
    if (cache.has(full)) return cache.get(full);
    const source = fs.readFileSync(full, 'utf8');
    const result = ts.transpileModule(source, { fileName: full, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0,
      'TypeScript syntax diagnostic');
    const exports = {}; cache.set(full, exports);
    const register = kind => definition => {
      assert.deepEqual(Object.keys(definition).sort(), ['args', 'handler', 'returns']);
      return { kind, definition, async invoke(ctx, args) {
        validate(v.object(definition.args), args);
        const out = await definition.handler(ctx, args);
        validate(definition.returns, out); return out;
      } };
    };
    function localRequire(name) {
      if (name === 'convex/values') return { v };
      if (name === 'convex/server') return {
        defineSchema: tables => tables,
        defineTable: fields => ({ fields, indexes: {}, index(name, columns) {
          this.indexes[name] = columns; return this;
        } }),
      };
      if (name === '@convex-dev/auth/server') return { authTables: {} }; // no invented auth schema
      if (name === './_generated/server') return {
        internalQuery: register('query'), internalMutation: register('mutation'),
      };
      if (name === '../offline/cad-convex/backend') return {
        createBackendContract: options => createBackendContract({ ...options, now }),
      };
      if (name === './developmentAuth') return { developmentAuthReviewed: false };
      if (name === './librarySession' && readExactLibrarySession) return { readExactLibrarySession };
      if (name === './librarySession' || name === './schema') return load('convex/' + name.slice(2) + '.ts');
      throw new Error('Unexpected source dependency: ' + name);
    }
    vm.runInNewContext(result.outputText, { exports, require: localRequire }, { filename: full });
    return exports;
  }
  return { cad: load('convex/cad.ts'), schema: load('convex/schema.ts').default };
}
module.exports = { loadSource, validate, v };
