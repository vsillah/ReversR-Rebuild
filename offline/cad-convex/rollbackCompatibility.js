// Pure synthetic fixture model over the pinned SDK schema export. No live authority.
const fail = code => { throw Error(code); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, expected) {
  if (!object(value) || Object.keys(value).sort().join('|') !== [...expected].sort().join('|'))
    fail('SCHEMA_FORMAT_UNSUPPORTED');
}
function checkRule(rule, tables) {
  if (!object(rule)) fail('SCHEMA_FORMAT_UNSUPPORTED');
  switch (rule.type) {
    case 'string': case 'number': case 'boolean': case 'null': keys(rule, ['type']); break;
    case 'literal':
      keys(rule, ['type', 'value']);
      if (!(typeof rule.value === 'string' || typeof rule.value === 'boolean' ||
        (typeof rule.value === 'number' && Number.isFinite(rule.value)) || rule.value === null))
        fail('SCHEMA_FORMAT_UNSUPPORTED');
      break;
    case 'id':
      keys(rule, ['type', 'tableName']);
      if (!tables.includes(rule.tableName)) fail('SCHEMA_FORMAT_UNSUPPORTED');
      break;
    case 'union':
      keys(rule, ['type', 'value']);
      if (!Array.isArray(rule.value) || !rule.value.length) fail('SCHEMA_FORMAT_UNSUPPORTED');
      rule.value.forEach(member => checkRule(member, tables)); break;
    case 'object':
      keys(rule, ['type', 'value']);
      if (!object(rule.value)) fail('SCHEMA_FORMAT_UNSUPPORTED');
      for (const field of Object.values(rule.value)) {
        keys(field, ['fieldType', 'optional']);
        if (typeof field.optional !== 'boolean') fail('SCHEMA_FORMAT_UNSUPPORTED');
        checkRule(field.fieldType, tables);
      }
      break;
    default: fail('SCHEMA_FORMAT_UNSUPPORTED');
  }
}
function tableMap(schema) {
  keys(schema, ['tables', 'schemaValidation']);
  if (schema.schemaValidation !== true || !Array.isArray(schema.tables) || !schema.tables.length)
    fail('SCHEMA_FORMAT_UNSUPPORTED');
  const names = schema.tables.map(t => t.tableName);
  if (names.some(n => typeof n !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(n)) ||
    new Set(names).size !== names.length) fail('SCHEMA_FORMAT_UNSUPPORTED');
  const map = new Map();
  for (const table of schema.tables) {
    keys(table, ['tableName', 'indexes', 'stagedDbIndexes', 'searchIndexes', 'stagedSearchIndexes',
      'vectorIndexes', 'stagedVectorIndexes', 'documentType']);
    for (const kind of ['stagedDbIndexes', 'searchIndexes', 'stagedSearchIndexes', 'vectorIndexes', 'stagedVectorIndexes'])
      if (!Array.isArray(table[kind]) || table[kind].length) fail('SCHEMA_FORMAT_UNSUPPORTED');
    checkRule(table.documentType, names);
    if (table.documentType.type !== 'object' || !Array.isArray(table.indexes)) fail('SCHEMA_FORMAT_UNSUPPORTED');
    const descriptors = new Set();
    for (const index of table.indexes) {
      keys(index, ['indexDescriptor', 'fields']);
      if (typeof index.indexDescriptor !== 'string' || !index.indexDescriptor ||
        descriptors.has(index.indexDescriptor) || !Array.isArray(index.fields) || !index.fields.length ||
        index.fields.some(f => typeof f !== 'string' || !Object.hasOwn(table.documentType.value, f)) ||
        new Set(index.fields).size !== index.fields.length) fail('SCHEMA_FORMAT_UNSUPPORTED');
      descriptors.add(index.indexDescriptor);
    }
    map.set(table.tableName, table);
  }
  return map;
}
function accepts(rule, value) {
  switch (rule.type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    case 'literal': return value === rule.value;
    // Deliberately not a real Convex ID validator; only locally tagged fake IDs qualify.
    case 'id': return typeof value === 'string' &&
      new RegExp('^fixture:' + rule.tableName + ':[a-z0-9-]+$').test(value);
    case 'union': return rule.value.some(member => accepts(member, value));
    case 'object':
      return object(value) && Object.keys(value).every(k => Object.hasOwn(rule.value, k)) &&
        Object.entries(rule.value).every(([key, field]) => Object.hasOwn(value, key)
          ? accepts(field.fieldType, value[key]) : field.optional);
    default: return false;
  }
}
function preserveIndexes(from, to) {
  for (const [name, table] of from) {
    for (const index of table.indexes) {
      const next = to.get(name).indexes.find(i => i.indexDescriptor === index.indexDescriptor);
      if (!next || JSON.stringify(next.fields) !== JSON.stringify(index.fields)) fail('INDEX_COMPATIBILITY_FAILED');
    }
  }
}
function checkRows(fixtures, origin, target, code) {
  if (!object(fixtures) || Object.keys(fixtures).sort().join('|') !== [...origin.keys()].sort().join('|'))
    fail('FIXTURE_COVERAGE_INCOMPLETE');
  let count = 0;
  for (const [name, table] of origin) {
    const rows = fixtures[name];
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 32) fail('FIXTURE_COVERAGE_INCOMPLETE');
    // Both absence and presence of every optional field must be represented.
    for (const [key, field] of Object.entries(table.documentType.value)) {
      if (field.optional && (!rows.some(row => object(row) && Object.hasOwn(row, key)) ||
        !rows.some(row => object(row) && !Object.hasOwn(row, key)))) fail('FIXTURE_COVERAGE_INCOMPLETE');
    }
    for (const row of rows) {
      if (!accepts(table.documentType, row) || !accepts(target.get(name).documentType, row)) fail(code);
      count++;
    }
  }
  return count;
}
function inspectRollbackCompatibility(input) {
  try {
    const { before, proposed, disabled, retainedBefore, retainedAfter } = input;
    const old = tableMap(before), next = tableMap(proposed), rollback = tableMap(disabled);
    const inventory = [...old.keys()].sort().join('|');
    if ([next, rollback].some(m => [...m.keys()].sort().join('|') !== inventory)) fail('TABLE_COVERAGE_CHANGED');
    preserveIndexes(old, next); preserveIndexes(next, rollback);
    const forwardRows = checkRows(retainedBefore, old, next, 'FORWARD_FIXTURE_REJECTED');
    const rollbackRows = checkRows(retainedAfter, next, rollback, 'ROLLBACK_FIXTURE_REJECTED');
    return { mode: 'offline-synthetic-schema-model', fixtureCompatible: true,
      executable: false, liveReady: false, verifiedCloudRelease: null, code: 'FIXTURE_COMPATIBLE',
      tableCount: old.size, indexCount: [...old.values()].reduce((n, t) => n + t.indexes.length, 0),
      forwardRows, rollbackRows };
  } catch (error) {
    const codes = ['SCHEMA_FORMAT_UNSUPPORTED', 'INDEX_COMPATIBILITY_FAILED', 'FIXTURE_COVERAGE_INCOMPLETE',
      'TABLE_COVERAGE_CHANGED', 'FORWARD_FIXTURE_REJECTED', 'ROLLBACK_FIXTURE_REJECTED'];
    const code = codes.includes(error?.message) ? error.message : 'SCHEMA_INPUT_INVALID';
    // Never return input rows, raw exceptions, table names or derived hashes of data.
    return { mode: 'offline-synthetic-schema-model', fixtureCompatible: false,
      executable: false, liveReady: false, verifiedCloudRelease: null, code };
  }
}
module.exports = { inspectRollbackCompatibility };
