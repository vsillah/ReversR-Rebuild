const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { CAD_USER_IMPORT_ENABLED, CAD_USER_IMPORT_PATH, prepareCadFileMetadata, mapCadImportError } = require('../utils/cadUserImportBridge');
test('source closed and route compatible, with no client transport or body builder', () => {
  assert.equal(CAD_USER_IMPORT_ENABLED, false);
  assert.equal(CAD_USER_IMPORT_PATH, '/api/cad/user-import');
  const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  assert.match(router, /BODY_ADMISSION_AUTHORIZED = false/);
  assert.match(router, /router.all\('\/user-import'/);
  assert.doesNotMatch(fs.readFileSync('utils/cadUserImportBridge.js', 'utf8'), /fetch\(|XMLHttpRequest|FormData|FileReader/);
});
test('metadata preparation cannot read body or retain private filename; invalid selection recovers', () => {
  const file = { name: 'synthetic.iges', size: 64 };
  for (const key of ['text', 'arrayBuffer', 'stream', 'slice', 'body']) Object.defineProperty(file, key, { get() { throw Error('Body access prohibited'); } });
  assert.deepEqual(prepareCadFileMetadata(file).metadata, { format: 'IGES', bytes: 64 });
  for (const input of [{ name: 'bad.zip', size: 64 }, { name: 'empty.igs', size: 0 }]) assert.equal(prepareCadFileMetadata(input).metadata, null);
  assert.ok(prepareCadFileMetadata(file).metadata);
});
test('all router errors map to closed recovery; malformed and success responses never grant admission', () => {
  const router = fs.readFileSync('server/cadUserUploadRouter.js', 'utf8');
  const admission = fs.readFileSync('server/cadUserUploadAdmission.js', 'utf8');
  const codes = [...(router + admission).matchAll(/^  ([A-Z_]+): \[/gm)].map(m => m[1]);
  for (const code of codes) {
    const result = mapCadImportError({ schemaVersion: 1, status: 'error', code, message: 'SECRET' });
    assert.equal(result.code, code); assert.equal(result.canSubmit, false); assert.ok(!result.message.includes('SECRET'));
  }
  for (const response of [null, {}, { schemaVersion: 1, status: 'success' }, { schemaVersion: 2, status: 'error', code: 'USER_SESSION_REQUIRED' }, { schemaVersion: 1, status: 'error', code: '__proto__' }]) {
    assert.equal(mapCadImportError(response).code, 'UNKNOWN');
    assert.equal(mapCadImportError(response).canSubmit, false);
  }
});
