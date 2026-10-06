// Pinned SDK templates only: no CLI, env files, deployment or network access.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const sdk = path.dirname(require.resolve('convex/package.json'));
assert.equal(require('convex/package.json').version, '1.45.0');
function declarations(file, names) {
  const source = fs.readFileSync(path.join(sdk, 'src/cli/codegen_templates', `${file}.ts`), 'utf8');
  const ast = ts.createSourceFile(`${file}.ts`, source, ts.ScriptTarget.Latest, true);
  const selected = new Map();
  for (const statement of ast.statements) {
    const name = ts.isVariableStatement(statement) ? statement.declarationList.declarations[0]?.name.getText(ast) : statement.name?.getText(ast);
    if (names.includes(name)) selected.set(name, statement.getText(ast));
  }
  assert.deepEqual([...selected.keys()].sort(), [...names].sort());
  return [...selected.values()].join('\n');
}
const source = [declarations('common', ['header']), declarations('dataModel', ['dynamicDataModelContent', 'dynamicDataModelDTS']),
  declarations('server', ['ENV_DOCSTRING', 'serverCodegen']), declarations('api', ['importPath', 'moduleIdentifier', 'apiCodegen'])].join('\n');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context, { timeout: 5000 });
const dir = path.resolve(__dirname, '../commercial-backend/convex');
const modules = fs.readdirSync(dir).filter(n => /\.(ts|js)$/.test(n) && !n.endsWith('.d.ts') && !['schema.ts', 'auth.config.ts'].includes(n)).sort();
const server = context.exports.serverCodegen({ useTypeScript: false, envVars: undefined });
const api = context.exports.apiCodegen(modules);
const outputs = { 'dataModel.d.ts': context.exports.dynamicDataModelDTS(), 'server.d.ts': server.DTS,
  'server.js': server.JS, 'api.d.ts': api.DTS, 'api.js': api.JS };
const target = path.join(dir, '_generated');
const check = process.argv[2] === '--check';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && check));
if (!check) fs.mkdirSync(target, { recursive: true });
for (const [name, contents] of Object.entries(outputs)) {
  const formatted = contents.split('\n').map(line => line.trimEnd()).join('\n').trim() + '\n';
  if (check) assert.equal(fs.readFileSync(path.join(target, name), 'utf8'), formatted);
  else fs.writeFileSync(path.join(target, name), formatted);
}
console.log(`Commercial SDK bindings ${check ? 'verified' : 'generated'} offline.`);
