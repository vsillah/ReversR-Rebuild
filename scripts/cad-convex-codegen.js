// Local-only SDK template generation. Never loads the CLI, credentials or deployment.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const sdk = path.dirname(require.resolve('convex/package.json'));
assert.equal(require('convex/package.json').version, '1.45.0');
assert.equal(ts.version, '6.0.3');
const templates = path.join(sdk, 'src/cli/codegen_templates');
// Evaluate only the exact pure declarations needed from the pinned SDK sources.
// AST selection excludes CLI/deployment imports and static server-analysis code.
function declarations(file, names) {
  const source = fs.readFileSync(path.join(templates, file + '.ts'), 'utf8');
  const ast = ts.createSourceFile(file + '.ts', source, ts.ScriptTarget.Latest, true);
  const selected = new Map();
  for (const statement of ast.statements) {
    const name = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations[0]?.name.getText(ast)
      : statement.name?.getText(ast);
    if (names.includes(name)) selected.set(name, statement.getText(ast));
  }
  assert.deepEqual([...selected.keys()].sort(), [...names].sort(), 'SDK template shape changed');
  return [...selected.values()].join('\n');
}
const source = [
  declarations('common', ['header']),
  declarations('dataModel', ['dynamicDataModelContent', 'dynamicDataModelDTS']),
  declarations('server', ['ENV_DOCSTRING', 'serverCodegen']),
  declarations('api', ['importPath', 'moduleIdentifier', 'apiCodegen']),
].join('\n');
const compiled = ts.transpileModule(source, { reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
assert.equal(compiled.diagnostics.length, 0);
// No process, require, filesystem, network or deployment capabilities in this VM.
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context, { timeout: 5000 });
const { dynamicDataModelDTS, serverCodegen, apiCodegen } = context.exports;
const dir = path.join(root, 'convex');
// Match this application's source module set; schema and generated files are excluded.
// Explicitly reject nested modules until discovery is reviewed for that structure.
assert.ok(!fs.existsSync(path.join(dir, 'convex.config.ts')), 'Components require reviewed full codegen');
for (const entry of fs.readdirSync(dir, { withFileTypes: true }))
  if (entry.isDirectory()) assert.equal(entry.name, '_generated', 'Review nested module codegen');
const modules = fs.readdirSync(dir).filter(n => /\.(ts|js)$/.test(n)
  && !n.endsWith('.d.ts') && n !== 'schema.ts').sort();
const server = serverCodegen({ useTypeScript: false, envVars: undefined });
const api = apiCodegen(modules);
const outputs = { 'dataModel.d.ts': dynamicDataModelDTS(),
  'server.d.ts': server.DTS, 'server.js': server.JS, 'api.d.ts': api.DTS, 'api.js': api.JS };
const target = path.join(dir, '_generated');
const check = process.argv[2] === '--check';
assert.ok(process.argv.length === 2 || check, 'Only --check is supported');
if (!check) fs.mkdirSync(target, { recursive: true });
for (const [name, contents] of Object.entries(outputs)) {
  assert.equal(typeof contents, 'string');
  // Normalize whitespace only; SDK declarations and runtime logic are unchanged.
  const formatted = contents.split('\n').map(line => line.trimEnd()).join('\n').trim() + '\n';
  const file = path.join(target, name);
  if (check) assert.equal(fs.readFileSync(file, 'utf8'), formatted, `Stale generated file: ${name}`);
  else fs.writeFileSync(file, formatted);
}
assert.deepEqual(fs.readdirSync(target).sort(), Object.keys(outputs).sort(), 'Unexpected generated artifacts');
console.log(`CAD local SDK bindings ${check ? 'verified' : 'generated'}: ${Object.keys(outputs).length} files; no deployment access`);
