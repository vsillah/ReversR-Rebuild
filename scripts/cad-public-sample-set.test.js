const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const manifestPath = path.join('public', 'cad-fixtures', 'public-sample-set', 'manifest.json');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assetPath(downloadUrl) {
  assert.ok(downloadUrl.startsWith('/cad-fixtures/'));
  return path.join('public', ...downloadUrl.split('/').filter(Boolean));
}

test('public sample manifest exposes at least five authorized IGES downloads', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.status, 'public-static-samples');
  assert.equal(manifest.publicMaterialOnly, true);
  assert.equal(manifest.sourceOnly, true);
  assert.equal(manifest.liveUploadActivated, false);
  assert.equal(manifest.productionConversionActivated, false);
  assert.equal(manifest.sandboxDispatchAllowed, false);
  assert.equal(manifest.privateCadIncluded, false);

  assert.ok(Array.isArray(manifest.files));
  assert.ok(manifest.files.length >= 5);
  const ids = new Set(manifest.files.map(file => file.id));
  assert.equal(ids.size, manifest.files.length);

  for (const file of manifest.files) {
    assert.match(file.fileName, /\.(igs|iges)$/i);
    assert.equal(file.format, 'IGES');
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
    const servedPath = assetPath(file.downloadUrl);
    assert.equal(fs.statSync(servedPath).size, file.bytes, file.id);
    assert.equal(sha256(servedPath), file.sha256, file.id);
    assert.ok(file.license || file.authorizationManifest, file.id);
  }
});

test('vendored sample licenses are served beside the static CAD files', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const file of manifest.files.filter(item => item.licenseFile)) {
    const licensePath = assetPath(file.licenseFile);
    const license = fs.readFileSync(licensePath, 'utf8');
    assert.match(license, /Permission is hereby granted|Redistribution and use/);
    if (file.licenseSha256) assert.equal(sha256(licensePath), file.licenseSha256);
  }
});

test('tap-friendly index links every manifest download', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const index = fs.readFileSync(path.join('public', 'cad-fixtures', 'public-sample-set', 'index.html'), 'utf8');
  for (const file of manifest.files) {
    assert.match(index, new RegExp(`href="${file.downloadUrl.replaceAll('.', '\\.')}"`), file.id);
  }
  assert.match(index, /does not upload CAD, run conversion, or send files to a backend/);
});

test('sample set documentation preserves the closed production boundary', () => {
  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  const docsText = fs.readFileSync(path.join('docs', 'cad-public-sample-set.md'), 'utf8');
  const indexText = fs.readFileSync(path.join('public', 'cad-fixtures', 'public-sample-set', 'index.html'), 'utf8');
  for (const text of [manifestText, docsText, indexText]) {
    assert.doesNotMatch(text, /liveUploadActivated": true|productionConversionActivated": true|sandboxDispatchAllowed": true/);
    assert.match(text, /No production upload activation|does not activate production\s+upload|does not upload CAD/);
    assert.match(text, /No production conversion|production conversion|run conversion/);
    assert.match(text, /No private CAD|private CAD|public static files/);
  }
});
